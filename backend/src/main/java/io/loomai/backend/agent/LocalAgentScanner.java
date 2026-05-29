package io.loomai.backend.agent;

import io.loomai.backend.shared.shell.UserShellResolver;
import io.loomai.backend.shared.time.UtcClock;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

@Component
public class LocalAgentScanner {

    private static final List<AgentDefinition> KNOWN_AGENTS = List.of(
            new AgentDefinition("Claude Code", "claude", "Anthropic", List.of(".claude"), List.of("--version", "version")),
            new AgentDefinition("Gemini CLI", "gemini", "Google", List.of(".gemini"), List.of("--version", "version")),
            new AgentDefinition("Codex CLI", "codex", "OpenAI", List.of(".codex"), List.of("--version", "version")),
            new AgentDefinition("Copilot CLI", "copilot", "GitHub", List.of(".copilot"), List.of("--version")),
            new AgentDefinition("OpenCode", "opencode", "Community", List.of(".opencode"), List.of("--version", "version")),
            new AgentDefinition("Antigravity CLI", "antigravity", "Community", List.of(".antigravitycli"), List.of("--version", "version")),
            new AgentDefinition("Aider", "aider", "Community", List.of(".aider"), List.of("--version", "--help"))
    );

    private final UtcClock utcClock;

    public LocalAgentScanner(UtcClock utcClock) {
        this.utcClock = utcClock;
    }

    public List<Agent> scanInstalledAgents() {
        Instant now = utcClock.now();
        List<Agent> agents = new ArrayList<>();

        for (AgentDefinition definition : KNOWN_AGENTS) {
            Optional<String> directoryPath = findConfigDirectory(definition.configDirectories());
            Optional<String> executablePath = findExecutable(definition.command());

            if (directoryPath.isEmpty() && executablePath.isEmpty()) {
                continue;
            }

            String detectedPath = executablePath.orElseGet(() -> directoryPath.orElse(""));
            String status = executablePath.isPresent() ? "active" : "idle";
            String version = executablePath
                    .map(path -> resolveVersion(definition, path))
                    .orElse("detected");
            String adapterType = resolveAdapterType(definition.command());

            Map<String, Object> adapterConfig = new java.util.LinkedHashMap<>();
            adapterConfig.put("command", definition.command());
            adapterConfig.put("binaryPath", executablePath.orElse(""));
            if (directoryPath.isPresent()) {
                adapterConfig.put("configPath", directoryPath.get());
            }
            adapterConfig.put("detectedVersion", version);
            adapterConfig.put("model", defaultModelFor(adapterType));

            agents.add(new Agent(
                    deterministicId(definition.command(), detectedPath),
                    definition.name(),
                    adapterType,
                    adapterConfig,
                    status,
                    now
            ));
        }

        agents.sort(Comparator.comparing(Agent::name, String.CASE_INSENSITIVE_ORDER));
        return agents;
    }

    private Optional<String> findConfigDirectory(List<String> directoryNames) {
        String home = System.getProperty("user.home");
        if (home == null || home.isBlank()) {
            return Optional.empty();
        }

        Path homePath = Path.of(home);
        for (String directoryName : directoryNames) {
            Path candidate = homePath.resolve(directoryName);
            if (Files.isDirectory(candidate)) {
                return Optional.of(candidate.toAbsolutePath().normalize().toString());
            }
        }

        return Optional.empty();
    }

    private Optional<String> findExecutable(String command) {
        Optional<String> fromShell = findExecutableViaShell(command);
        if (fromShell.isPresent()) return fromShell;

        return findExecutableViaPath(command);
    }

    private Optional<String> findExecutableViaShell(String command) {
        try {
            Process process = new ProcessBuilder(UserShellResolver.command("command -v " + command))
                    .redirectErrorStream(true)
                    .start();
            boolean finished = process.waitFor(3, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return Optional.empty();
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    process.getInputStream(), StandardCharsets.UTF_8
            ))) {
                return reader.lines()
                        .map(String::trim)
                        .filter(line -> !line.isBlank() && !line.startsWith("which:") && !line.startsWith("no "))
                        .findFirst()
                        .filter(path -> {
                            Path p = Path.of(path);
                            return Files.isRegularFile(p) && Files.isExecutable(p);
                        });
            }
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<String> findExecutableViaPath(String command) {
        String home = System.getProperty("user.home", "");
        List<String> searchDirs = new ArrayList<>();

        String rawPath = System.getenv("PATH");
        if (rawPath != null && !rawPath.isBlank()) {
            searchDirs.addAll(List.of(rawPath.split(java.io.File.pathSeparator)));
        }

        searchDirs.addAll(List.of(
                home + "/.local/bin",
                home + "/.npm/bin",
                home + "/.yarn/bin",
                home + "/.cargo/bin",
                home + "/go/bin",
                "/usr/local/bin",
                "/usr/bin",
                "/opt/homebrew/bin",
                "/opt/homebrew/sbin"
        ));

        boolean isWindows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
        Set<String> candidateNames = new LinkedHashSet<>();
        candidateNames.add(command);

        if (isWindows) {
            String pathExt = System.getenv("PATHEXT");
            List<String> extensions = pathExt == null || pathExt.isBlank()
                    ? List.of(".exe", ".cmd", ".bat")
                    : List.of(pathExt.split(";"));
            for (String extension : extensions) {
                String normalizedExtension = extension.trim().toLowerCase(Locale.ROOT);
                if (!normalizedExtension.isBlank()) {
                    candidateNames.add(command + normalizedExtension);
                }
            }
        }

        for (String entry : searchDirs) {
            if (entry == null || entry.isBlank()) continue;
            Path directory = Path.of(entry);
            for (String candidateName : candidateNames) {
                Path candidate = directory.resolve(candidateName);
                if (Files.isRegularFile(candidate) && Files.isExecutable(candidate)) {
                    return Optional.of(candidate.toAbsolutePath().normalize().toString());
                }
            }
        }

        return Optional.empty();
    }

    private String resolveVersion(AgentDefinition definition, String executablePath) {
        for (String flag : definition.versionArgs()) {
            Optional<String> output = runVersionCommand(executablePath, flag);
            if (output.isPresent()) {
                return sanitizeVersion(output.get());
            }
        }
        return "installed";
    }

    private Optional<String> runVersionCommand(String executablePath, String arg) {
        try {
            Process process = new ProcessBuilder(executablePath, arg)
                    .redirectErrorStream(true)
                    .start();

            boolean finished = process.waitFor(2, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return Optional.empty();
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    process.getInputStream(),
                    StandardCharsets.UTF_8
            ))) {
                return reader.lines()
                        .map(String::trim)
                        .filter(line -> !line.isBlank())
                        .findFirst();
            }
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private String sanitizeVersion(String raw) {
        String compact = raw.replace('\n', ' ').replace('\r', ' ').trim();
        if (compact.length() <= 30) {
            return compact;
        }
        return compact.substring(0, 30).trim();
    }

    private String deterministicId(String command, String executablePath) {
        String seed = command + "::" + executablePath;
        return UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private String resolveAdapterType(String command) {
        return switch (command) {
            case "claude" -> "claude_local";
            case "codex" -> "codex_local";
            case "gemini" -> "gemini_local";
            case "opencode" -> "opencode_local";
            case "aider" -> "aider_local";
            case "copilot" -> "copilot_local";
            case "antigravity" -> "antigravity_local";
            default -> "custom_local";
        };
    }

    private String defaultModelFor(String adapterType) {
        return switch (adapterType) {
            case "claude_local" -> "claude-sonnet-4-6";
            case "codex_local" -> "gpt-5.3-codex";
            case "gemini_local" -> "gemini-2.5-pro";
            case "opencode_local" -> "opencode/big-pickle";
            case "aider_local" -> "sonnet";
            case "copilot_local" -> "gpt-4.1";
            case "antigravity_local" -> "local-instruct-8b";
            default -> "default";
        };
    }

    private record AgentDefinition(
            String name,
            String command,
            String vendor,
            List<String> configDirectories,
            List<String> versionArgs
    ) {
    }
}
