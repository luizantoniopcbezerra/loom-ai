package io.loomai.backend.shared.shell;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public final class UserShellResolver {

    private static final String FALLBACK_SHELL = "/bin/sh";
    private static final Path PASSWD_FILE = Path.of("/etc/passwd");

    private UserShellResolver() {
    }

    public static String resolve() {
        return resolve(System.getenv(), System.getProperty("user.name"), PASSWD_FILE);
    }

    static String resolve(Map<String, String> environment, String userName, Path passwdFile) {
        Optional<String> shellFromEnv = normalizeShell(environment.get("SHELL"));
        if (shellFromEnv.isPresent()) {
            return shellFromEnv.get();
        }

        if (userName != null && !userName.isBlank() && Files.isReadable(passwdFile)) {
            try (var lines = Files.lines(passwdFile)) {
                Optional<String> shellFromPasswd = lines
                        .map(String::trim)
                        .filter(line -> !line.isBlank() && !line.startsWith("#"))
                        .map(line -> line.split(":"))
                        .filter(parts -> parts.length >= 7)
                        .filter(parts -> userName.equals(parts[0]))
                        .map(parts -> parts[6])
                        .map(String::trim)
                        .map(UserShellResolver::normalizeShell)
                        .flatMap(Optional::stream)
                        .findFirst();
                if (shellFromPasswd.isPresent()) {
                    return shellFromPasswd.get();
                }
            } catch (Exception ignored) {
            }
        }

        return FALLBACK_SHELL;
    }

    public static List<String> command(String commandLine) {
        return command(resolve(), commandLine);
    }

    static List<String> command(String shellPath, String commandLine) {
        String normalizedShell = normalizeShell(shellPath).orElse(FALLBACK_SHELL);
        String shellName = Path.of(normalizedShell).getFileName().toString().toLowerCase(Locale.ROOT);
        if ("fish".equals(shellName)) {
            return List.of(normalizedShell, "-l", "-c", commandLine);
        }
        return List.of(normalizedShell, "-lc", commandLine);
    }

    public static List<String> interactiveShell() {
        return List.of(resolve());
    }

    private static Optional<String> normalizeShell(String shellPath) {
        if (shellPath == null || shellPath.isBlank()) {
            return Optional.empty();
        }

        try {
            Path path = Path.of(shellPath.trim());
            if (!path.isAbsolute()) {
                return Optional.empty();
            }
            if (!Files.isRegularFile(path) || !Files.isExecutable(path)) {
                return Optional.empty();
            }
            return Optional.of(path.toAbsolutePath().normalize().toString());
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }
}
