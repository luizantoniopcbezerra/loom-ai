package io.loomai.backend.conversation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.agent.Agent;
import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.shell.UserShellResolver;
import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class LocalAgentConversationReplyService {
    private static final long HEARTBEAT_INTERVAL_MILLIS = 15_000L;

    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, ActiveExecution> activeExecutions = new ConcurrentHashMap<>();

    public LocalAgentConversationReplyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String generateReply(String conversationId, Agent agent, List<Message> history, String overrideModel) {
        return generateReply(conversationId, agent, history, overrideModel, null, null);
    }

    public String generateReply(String conversationId, Agent agent, List<Message> history, String overrideModel, String cwdOverride) {
        return generateReply(conversationId, agent, history, overrideModel, cwdOverride, null);
    }

    public String generateReply(String conversationId, Agent agent, List<Message> history, String overrideModel, String cwdOverride, Consumer<String> executionLogListener) {
        String adapterType = agent.adapterType();
        Map<String, Object> config = agent.adapterConfig() == null ? Map.of() : agent.adapterConfig();
        String command = resolveCommand(config);
        String model = !blank(overrideModel) ? overrideModel.trim() : asString(config.get("model"));
        String cwd = !blank(cwdOverride) ? cwdOverride.trim() : asString(config.get("cwd"));
        String instructionsFilePath = asString(config.get("instructionsFilePath"));
        String prompt = buildPrompt(history, agent.name(), instructionsFilePath);

        return switch (adapterType) {
            case "claude_local" -> runClaude(conversationId, command, model, cwd, prompt, executionLogListener);
            case "codex_local" -> runCodex(conversationId, command, model, cwd, prompt, executionLogListener);
            case "gemini_local" -> runGemini(conversationId, command, model, cwd, prompt, executionLogListener);
            case "opencode_local" -> runOpenCode(conversationId, command, model, cwd, prompt, executionLogListener);
            case "copilot_local" -> runCopilot(conversationId, command, model, cwd, prompt, executionLogListener);
            default -> throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "O adapter local " + adapterType + " ainda nao esta habilitado no chat."
            );
        };
    }

    public boolean cancelReply(String conversationId) {
        if (blank(conversationId)) {
            return false;
        }
        ActiveExecution activeExecution = activeExecutions.remove(conversationId);
        if (activeExecution == null) {
            return false;
        }
        activeExecution.cancelled = true;
        activeExecution.process.destroyForcibly();
        return true;
    }

    private String resolveCommand(Map<String, Object> config) {
        String binaryPath = asString(config.get("binaryPath"));
        if (!blank(binaryPath)) {
            try {
                Path binary = Path.of(binaryPath.trim());
                if (Files.isRegularFile(binary) && Files.isExecutable(binary)) {
                    return binary.toAbsolutePath().normalize().toString();
                }
            } catch (Exception ignored) {
            }
        }
        return asString(config.get("command"));
    }

    private String runClaude(String conversationId, String command, String model, String cwd, String prompt, Consumer<String> executionLogListener) {
        List<String> args = new ArrayList<>(List.of("--print", "--output-format", "stream-json", "--verbose", "--dangerously-skip-permissions"));
        if (!blank(model)) {
            args.add("--model");
            args.add(model);
        }
        return runLocalCommand(conversationId, command, args, cwd, prompt, true, executionLogListener);
    }

    private String runCodex(String conversationId, String command, String model, String cwd, String prompt, Consumer<String> executionLogListener) {
        List<String> args = new ArrayList<>(List.of("--dangerously-bypass-approvals-and-sandbox", "exec", "--json"));
        if (!blank(model)) {
            args.add("--model");
            args.add(model);
        }
        args.add("-");
        return runLocalCommand(conversationId, command, args, cwd, prompt, true, executionLogListener);
    }

    private String runGemini(String conversationId, String command, String model, String cwd, String prompt, Consumer<String> executionLogListener) {
        List<String> args = new ArrayList<>(List.of("--output-format", "stream-json"));
        if (!blank(model)) {
            args.add("--model");
            args.add(model);
        }
        args.add("--approval-mode");
        args.add("yolo");
        args.add("--sandbox=none");
        args.add("--prompt");
        args.add(prompt);
        return runLocalCommand(conversationId, command, args, cwd, null, true, executionLogListener);
    }

    private String runOpenCode(String conversationId, String command, String model, String cwd, String prompt, Consumer<String> executionLogListener) {
        List<String> args = new ArrayList<>(List.of("run", "--format", "json", "--dangerously-skip-permissions"));
        if (!blank(model)) {
            args.add("--model");
            args.add(model);
        }
        return runLocalCommand(conversationId, command, args, cwd, prompt, true, executionLogListener);
    }

    private String runCopilot(String conversationId, String command, String model, String cwd, String prompt, Consumer<String> executionLogListener) {
        List<String> args = new ArrayList<>(List.of("--output-format", "json", "--allow-all-tools", "-y"));
        if (!blank(model)) {
            args.add("--model");
            args.add(model);
        }
        args.add("-p");
        args.add(prompt);
        return runLocalCommand(conversationId, command, args, cwd, null, true, executionLogListener);
    }

    private String runLocalCommand(String conversationId, String command, List<String> args, String cwd, String stdin, boolean parseJson) {
        return runLocalCommand(conversationId, command, args, cwd, stdin, parseJson, null);
    }

    private String runLocalCommand(String conversationId, String command, List<String> args, String cwd, String stdin, boolean parseJson, Consumer<String> executionLogListener) {
        if (blank(command)) {
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "O agente local nao possui um comando configurado."
            );
        }

        String commandLine = buildCommandLine(command, args);
        Process process = null;
        try {
            emitLog(executionLogListener, "Launching local agent command...");
            emitLog(executionLogListener, summarizeCommand(command, args));
            if (!blank(cwd)) {
                emitLog(executionLogListener, "Workspace: " + cwd.trim());
            }

            ProcessBuilder builder = new ProcessBuilder(UserShellResolver.command(commandLine))
                    .redirectErrorStream(true);
            if (!blank(cwd)) {
                Path cwdPath = Path.of(cwd);
                if (Files.isDirectory(cwdPath)) {
                    builder.directory(cwdPath.toFile());
                }
            }

            process = builder.start();
            ActiveExecution activeExecution = registerExecution(conversationId, process);
            emitLog(executionLogListener, "Process started. Waiting for agent output...");
            if (stdin != null) {
                try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
                    writer.write(stdin);
                    writer.flush();
                }
            } else {
                process.getOutputStream().close();
            }

            // Drain stdout concurrently to prevent pipe-buffer deadlock: if the process
            // writes more than the OS pipe buffer (~64 KB) before exiting, it blocks
            // waiting for a reader — and waitFor() would never return without one.
            Process capturedProcess = process;
            StringBuilder outputBuffer = new StringBuilder();
            AtomicBoolean sawOutput = new AtomicBoolean(false);
            Thread readerThread = Thread.ofVirtual().start(() -> {
                try {
                    streamProcessOutput(capturedProcess.getInputStream(), outputBuffer, executionLogListener, sawOutput);
                } catch (Exception ignored) {
                }
            });
            Thread heartbeatThread = Thread.ofVirtual().start(() -> emitHeartbeat(capturedProcess, executionLogListener));

            process.waitFor();
            readerThread.join();
            heartbeatThread.interrupt();
            heartbeatThread.join();
            String output = outputBuffer.toString().trim();
            if (activeExecution.cancelled) {
                throw new ApiException(
                        ErrorCode.SERVICE_UNAVAILABLE,
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "A execucao do agente foi cancelada."
                );
            }
            if (output.isBlank()) {
                throw new ApiException(
                        ErrorCode.SERVICE_UNAVAILABLE,
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "O agente local retornou uma resposta vazia."
                );
            }
            if (process.exitValue() != 0 && !parseJson) {
                throw buildExecutionFailure(command, output);
            }

            emitLog(executionLogListener, "Process finished with exit code " + process.exitValue() + ".");

            String content = parseJson ? extractText(output) : output;
            if (blank(content)) {
                if (process.exitValue() != 0) {
                    throw buildExecutionFailure(command, output);
                }
                return output;
            }
            return content.trim();
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Falha ao executar o agente local: " + command
            );
        } finally {
            clearExecution(conversationId, process);
        }
    }

    private void streamProcessOutput(InputStream inputStream, StringBuilder outputBuffer, Consumer<String> executionLogListener, AtomicBoolean sawOutput) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            int outputLines = 0;
            while ((line = reader.readLine()) != null) {
                outputBuffer.append(line).append('\n');
                if (!line.isBlank()) {
                    if (sawOutput.compareAndSet(false, true)) {
                        emitLog(executionLogListener, "Receiving agent output...");
                    }
                    outputLines++;
                    if (outputLines % 40 == 0) {
                        emitLog(executionLogListener, "Received " + outputLines + " output lines so far.");
                    }
                    String summarizedLine = summarizeAgentLogLine(line);
                    if (!blank(summarizedLine)) {
                        emitLog(executionLogListener, summarizedLine);
                    }
                }
            }
        }
    }

    private void emitHeartbeat(Process process, Consumer<String> executionLogListener) {
        long startedAt = System.currentTimeMillis();
        try {
            while (process.isAlive()) {
                Thread.sleep(HEARTBEAT_INTERVAL_MILLIS);
                if (!process.isAlive()) {
                    return;
                }
                long elapsedSeconds = Math.max(1L, (System.currentTimeMillis() - startedAt) / 1000L);
                emitLog(executionLogListener, "Still running... " + elapsedSeconds + "s elapsed.");
            }
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private void emitLog(Consumer<String> executionLogListener, String message) {
        if (executionLogListener == null || blank(message)) {
            return;
        }
        executionLogListener.accept(message.trim());
    }

    private String summarizeCommand(String command, List<String> args) {
        StringBuilder summary = new StringBuilder("Command: ").append(command);
        if (args == null || args.isEmpty()) {
            return summary.toString();
        }

        int shown = 0;
        for (String arg : args) {
            if (arg == null || arg.isBlank()) {
                continue;
            }
            if (shown >= 8) {
                summary.append(" ...");
                break;
            }
            summary.append(' ').append(summarize(arg));
            shown++;
        }
        return summary.toString();
    }

    private String summarizeAgentLogLine(String rawLine) {
        String trimmed = rawLine == null ? "" : rawLine.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            return summarize(trimmed);
        }

        try {
            JsonNode root = objectMapper.readTree(trimmed);
            if (!root.isObject()) {
                return null;
            }

            String eventType = root.path("type").asText("");
            if (blank(eventType)) {
                return null;
            }

            if (eventType.endsWith(".started")) {
                return "Agent event: " + eventType;
            }
            if ("turn.completed".equals(eventType) || "thread.completed".equals(eventType) || "step_finish".equals(eventType)) {
                return "Agent event: " + eventType;
            }
            if ("step_start".equals(eventType)) {
                return "Agent event: step_start";
            }
            if ("error".equals(eventType)) {
                String errorMsg = root.path("error").path("data").path("message").asText("");
                if (blank(errorMsg)) {
                    errorMsg = root.path("error").path("name").asText("Agent returned an error");
                }
                return "Agent error: " + summarize(errorMsg);
            }
            if ("text".equals(eventType)) {
                return summarize(root.path("part").path("text").asText(""));
            }
            if ("assistant.message".equals(eventType)) {
                return summarize(root.path("data").path("content").asText(""));
            }
            if ("item.completed".equals(eventType)) {
                JsonNode item = root.path("item");
                if ("agent_message".equals(item.path("type").asText(""))) {
                    return summarize(item.path("text").asText(""));
                }
            }
        } catch (Exception ignored) {
            return summarize(trimmed);
        }

        return null;
    }

    private ActiveExecution registerExecution(String conversationId, Process process) {
        if (blank(conversationId)) {
            return new ActiveExecution(process);
        }
        ActiveExecution execution = new ActiveExecution(process);
        ActiveExecution existing = activeExecutions.putIfAbsent(conversationId, execution);
        if (existing != null) {
            process.destroyForcibly();
            throw new ApiException(
                    ErrorCode.INVALID_INPUT,
                    HttpStatus.CONFLICT,
                    "Ja existe uma execucao em andamento para esta conversa."
            );
        }
        return execution;
    }

    private void clearExecution(String conversationId, Process process) {
        if (blank(conversationId) || process == null) {
            return;
        }
        ActiveExecution activeExecution = activeExecutions.get(conversationId);
        if (activeExecution != null && activeExecution.process == process) {
            activeExecutions.remove(conversationId, activeExecution);
        }
    }

    private ApiException buildExecutionFailure(String command, String output) {
        return new ApiException(
                ErrorCode.SERVICE_UNAVAILABLE,
                HttpStatus.SERVICE_UNAVAILABLE,
                "O agente local falhou ao executar " + command + ": " + summarize(output)
        );
    }

    private String buildPrompt(List<Message> history, String agentName, String instructionsFilePath) {
        StringBuilder prompt = new StringBuilder();
        if (!blank(instructionsFilePath)) {
            try {
                prompt.append(Files.readString(Path.of(instructionsFilePath), StandardCharsets.UTF_8).trim()).append("\n\n");
            } catch (Exception ignored) {
                // Ignore invalid optional file paths in this lightweight local implementation.
            }
        }

        prompt.append("You are ").append(agentName).append(". Reply directly to the latest user message using the prior conversation as context.\n\n");
        for (Message message : history) {
            prompt.append(message.role().toUpperCase(Locale.ROOT)).append(":\n")
                    .append(message.content().trim())
                    .append("\n\n");
        }
        prompt.append("ASSISTANT:\n");
        return prompt.toString();
    }

    private String extractText(String output) {
        String direct = extractFromJsonLines(output);
        if (!blank(direct)) {
            return direct;
        }
        return output;
    }

    private String extractFromJsonLines(String output) {
        StringBuilder collected = new StringBuilder();
        for (String line : output.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
                if (collected.isEmpty()) {
                    collected.append(trimmed);
                } else {
                    collected.append('\n').append(trimmed);
                }
                continue;
            }

            try {
                JsonNode root = objectMapper.readTree(trimmed);
                if (collectStructuredText(root, collected)) {
                    continue;
                }
                collectText(root, collected);
            } catch (RuntimeException rethrow) {
                // Re-throw agent-level errors (e.g. opencode "error" events) so the
                // caller can surface them as step_error instead of silently returning empty output.
                throw rethrow;
            } catch (Exception ignored) {
                if (collected.isEmpty()) {
                    collected.append(trimmed);
                }
            }
        }
        return collected.toString().trim();
    }

    private boolean collectStructuredText(JsonNode root, StringBuilder collected) {
        if (root == null || !root.isObject()) {
            return false;
        }

        String eventType = root.path("type").asText("");
        if (blank(eventType)) {
            return false;
        }

        if (eventType.endsWith(".started") || "turn.completed".equals(eventType) || "thread.completed".equals(eventType)) {
            return true;
        }

        // OpenCode NDJSON format: step_start / step_finish are lifecycle events; text carries the reply in part.text
        if ("step_start".equals(eventType) || "step_finish".equals(eventType)) {
            return true;
        }
        if ("error".equals(eventType)) {
            String errorMsg = root.path("error").path("data").path("message").asText("");
            if (errorMsg.isBlank()) {
                errorMsg = root.path("error").path("name").asText("OpenCode returned an error");
            }
            throw new RuntimeException(errorMsg);
        }
        if ("text".equals(eventType)) {
            String text = root.path("part").path("text").asText("");
            appendCollected(collected, text);
            return true;
        }

        // Copilot CLI JSONL format: ephemeral delta events are skipped; final assistant.message has data.content
        if (root.path("ephemeral").asBoolean(false)) {
            return true;
        }

        if ("assistant.message".equals(eventType)) {
            String content = root.path("data").path("content").asText("");
            appendCollected(collected, content);
            return true;
        }

        // Skip non-message copilot session/result events
        if (eventType.startsWith("session.") || eventType.startsWith("user.") || "result".equals(eventType) || "assistant.turn_start".equals(eventType) || "assistant.turn_end".equals(eventType)) {
            return true;
        }

        if ("item.completed".equals(eventType)) {
            JsonNode item = root.path("item");
            String itemType = item.path("type").asText("");
            if ("agent_message".equals(itemType)) {
                String directText = item.path("text").asText("");
                appendCollected(collected, directText);
                if (!blank(directText)) {
                    return true;
                }

                StringBuilder nested = new StringBuilder();
                if (item.has("content")) {
                    collectText(item.get("content"), nested);
                }
                if (item.has("message")) {
                    collectText(item.get("message"), nested);
                }
                appendCollected(collected, nested.toString());
                return true;
            }
            return true;
        }

        if ("message".equals(eventType) || "agent_message".equals(eventType)) {
            String text = root.path("text").asText("");
            if (!blank(text)) {
                appendCollected(collected, text);
                return true;
            }
        }

        return false;
    }

    private void collectText(JsonNode node, StringBuilder collected) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return;
        }

        if (node.isTextual()) {
            String value = node.asText().trim();
            if (!value.isBlank() && !looksLikeMetadata(value)) {
                if (!collected.isEmpty()) {
                    collected.append('\n');
                }
                collected.append(value);
            }
            return;
        }

        if (node.isArray()) {
            for (JsonNode item : node) {
                collectText(item, collected);
            }
            return;
        }

        if (node.isObject()) {
            if (node.has("content")) collectText(node.get("content"), collected);
            if (node.has("text")) collectText(node.get("text"), collected);
            if (node.has("message")) collectText(node.get("message"), collected);
            if (node.has("result")) collectText(node.get("result"), collected);
            if (node.has("output")) collectText(node.get("output"), collected);
            if (node.has("delta")) collectText(node.get("delta"), collected);
        }
    }

    private void appendCollected(StringBuilder collected, String value) {
        if (blank(value)) {
            return;
        }
        String normalized = value.trim();
        if (normalized.isBlank() || looksLikeMetadata(normalized)) {
            return;
        }
        if (!collected.isEmpty()) {
            collected.append('\n');
        }
        collected.append(normalized);
    }

    private boolean looksLikeMetadata(String value) {
        return value.startsWith("{") || value.startsWith("[") || value.startsWith("event:");
    }

    private String buildCommandLine(String command, List<String> args) {
        StringBuilder builder = new StringBuilder(command);
        for (String arg : args) {
            builder.append(' ').append(shellQuote(arg));
        }
        return builder.toString();
    }

    private String shellQuote(String value) {
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }

    private String readAll(InputStream inputStream) throws Exception {
        return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
    }

    private String summarize(String text) {
        String compact = text.replace('\n', ' ').replace('\r', ' ').trim();
        if (compact.length() <= 220) {
            return compact;
        }
        return compact.substring(0, 220).trim() + "...";
    }

    private String asString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static final class ActiveExecution {
        private final Process process;
        private volatile boolean cancelled;

        private ActiveExecution(Process process) {
            this.process = process;
        }
    }
}
