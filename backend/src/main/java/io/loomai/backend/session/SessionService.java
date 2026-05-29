package io.loomai.backend.session;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.agent.Agent;
import io.loomai.backend.agent.AgentRepository;
import io.loomai.backend.conversation.ConversationReplyGateway;
import io.loomai.backend.conversation.LocalAgentConversationReplyService;
import io.loomai.backend.conversation.Message;
import io.loomai.backend.workflow.Workflow;
import io.loomai.backend.workflow.WorkflowRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SessionService {
    private static final Pattern FENCED_BLOCK_PATTERN = Pattern.compile("```(yaml|yml|md|markdown|json|txt)?\\s*\\n(.*?)\\n```", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private static final Map<String, String> NODE_TYPE_TO_ADAPTER = Map.of(
        "claude", "claude_local",
        "gemini", "gemini_local",
        "codex", "codex_local",
        "shell", "aider_local",
        "file", "aider_local",
        "memory", "opencode_local",
        "opencode", "opencode_local",
        "copilot", "copilot_local"
    );

    private final WorkflowRepository workflowRepository;
    private final AgentRepository agentRepository;
    private final LocalAgentConversationReplyService localAgentConversationReplyService;
    private final ConversationReplyGateway replyGateway;
    private final ObjectMapper objectMapper;

    public SessionService(
        WorkflowRepository workflowRepository,
        AgentRepository agentRepository,
        LocalAgentConversationReplyService localAgentConversationReplyService,
        ConversationReplyGateway replyGateway,
        ObjectMapper objectMapper
    ) {
        this.workflowRepository = workflowRepository;
        this.agentRepository = agentRepository;
        this.localAgentConversationReplyService = localAgentConversationReplyService;
        this.replyGateway = replyGateway;
        this.objectMapper = objectMapper;
    }

    public SseEmitter execute(SessionRequest request) {
        SseEmitter emitter = new SseEmitter(1_800_000L);
        Thread.ofVirtual().start(() -> {
            try {
                runExecution(emitter, request);
            } catch (Exception e) {
                safeEmitError(emitter, e.getMessage() != null ? e.getMessage() : "Execution failed");
            }
        });
        return emitter;
    }

    private void runExecution(SseEmitter emitter, SessionRequest request) throws Exception {
        String workspacePath = request.workspacePath();
        if (workspacePath == null || workspacePath.isBlank()) {
            safeEmitError(emitter, "Nenhum workspace configurado. Selecione um diretório de trabalho para que os agentes possam acessar os arquivos do projeto.");
            return;
        }

        Workflow workflow = workflowRepository.findById(request.workflowId())
            .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + request.workflowId()));

        List<Agent> selectedAgents = agentRepository.findAll().stream()
            .filter(a -> request.agentIds().contains(a.id()))
            .toList();

        List<JsonNode> orderedNodes = getOrderedNodes(workflow.definition());
        List<JsonNode> executableNodes = orderedNodes.stream()
            .filter(n -> !"input".equals(n.path("type").asText()))
            .toList();

        if (executableNodes.isEmpty()) {
            emitEvent(emitter, "session_started", Map.of("total_steps", 0));
            emitEvent(emitter, "session_done", Map.of("summary", "Workflow has no executable nodes."));
            emitter.complete();
            return;
        }

        String paramsText = buildParamsText(request.params());
        StringBuilder context = new StringBuilder();
        List<Path> generatedArtifacts = new ArrayList<>();
        Path artifactDirectory = prepareArtifactDirectory(request.workflowId(), workspacePath);

        emitEvent(emitter, "session_started", Map.of("total_steps", executableNodes.size()));

        for (int i = 0; i < executableNodes.size(); i++) {
            JsonNode node = executableNodes.get(i);
            String type = node.path("type").asText("claude");
            String nodeId = node.path("id").asText("step-" + i);
            String label = node.path("label").asText("Step " + (i + 1));

            // For nodes created by WorkflowBuilder with type="agent", use the agentType field
            String effectiveAdapterType = node.path("agentType").asText("");
            Agent assignee = pickAgent(type, effectiveAdapterType, selectedAgents, i);
            String agentId = assignee != null ? assignee.id() : "orchestrator";
            String agentName = assignee != null ? assignee.name() : "Loom Weaver";

            emitEvent(emitter, "step_started", Map.of(
                "step_id", nodeId,
                "step_index", i,
                "label", label,
                "agent_id", agentId,
                "agent_name", agentName
            ));

            try {
                String output = generateStepOutput(
                    "session:" + request.workflowId() + ":" + nodeId,
                    node,
                    type,
                    assignee,
                    agentName,
                    label,
                    paramsText,
                    context.toString(),
                    generatedArtifacts,
                    i,
                    workspacePath,
                    message -> safeEmitStepLog(emitter, nodeId, label, agentId, message)
                );
                List<Path> artifactPaths = persistStepArtifacts(artifactDirectory, label, i, output);
                if (!artifactPaths.isEmpty()) {
                    generatedArtifacts.addAll(artifactPaths);
                    safeEmitStepLog(emitter, nodeId, label, agentId, "Saved " + artifactPaths.size() + " artifact(s) for this step.");
                    for (Path artifactPath : artifactPaths) {
                        safeEmitStepLog(emitter, nodeId, label, agentId, "Artifact: " + artifactPath);
                    }
                }
                context.append("\n\n### ").append(label).append("\n").append(output);

                emitEvent(emitter, "step_done", Map.of(
                    "step_id", nodeId,
                    "label", label,
                    "agent_id", agentId,
                    "output", output
                ));
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "Step failed";
                context.append("\n\n### ").append(label).append("\n[Error: ").append(msg).append("]");
                emitEvent(emitter, "step_error", Map.of(
                    "step_id", nodeId,
                    "label", label,
                    "agent_id", agentId,
                    "error", msg
                ));
            }
        }

        emitEvent(emitter, "session_done", Map.of(
            "summary", executableNodes.size() + " steps completed."
        ));
        emitter.complete();
    }

    private String generateStepOutput(String executionKey, JsonNode node, String type, Agent assignee, String agentName, String label,
                                       String paramsText, String context, List<Path> generatedArtifacts, int index, String workspacePath,
                                       java.util.function.Consumer<String> executionLogListener) {
        if ("condition".equals(type)) {
            return "Condition checks passed. Workflow can continue.";
        }
        if ("output".equals(type)) {
            return "Workflow output assembled successfully from " + index + " preceding steps.";
        }

        String nodePrompt = node.path("prompt").asText("").trim();
        String systemPrompt = nodePrompt.isBlank()
            ? "You are " + agentName + ", acting as " + label + ". " +
              "Analyze the input, apply your expertise, and produce clear, structured output. " +
              "Be concise and actionable."
            : nodePrompt;

        StringBuilder userMsg = new StringBuilder();
        if (!paramsText.isBlank()) {
            userMsg.append("## Task Parameters\n").append(paramsText).append("\n\n");
        }
        if (!context.isBlank()) {
            userMsg.append("## Context from previous steps\n").append(context.trim()).append("\n\n");
        }
        if (!generatedArtifacts.isEmpty()) {
            userMsg.append("## Generated artifacts available in workspace\n");
            for (Path artifactPath : generatedArtifacts) {
                userMsg.append("- ").append(artifactPath).append('\n');
            }
            userMsg.append('\n');
        }
        userMsg.append("## Your task\nExecute your role as ").append(label)
               .append(". Produce the expected output for this step.");

        List<Message> messages = List.of(
            new Message(UUID.randomUUID().toString(), "", "system", systemPrompt, Instant.now()),
            new Message(UUID.randomUUID().toString(), "", "user", userMsg.toString(), Instant.now())
        );

        if (assignee != null) {
            return localAgentConversationReplyService.generateReply(
                executionKey,
                assignee,
                messages,
                assignee.adapterConfig() == null ? null : String.valueOf(assignee.adapterConfig().get("model")),
                workspacePath,
                executionLogListener
            );
        }
        return replyGateway.generateReply(messages);
    }

    private Agent pickAgent(String nodeType, String agentType, List<Agent> agents, int index) {
        if (agents.isEmpty()) return null;

        // WorkflowBuilder stores nodes with type="agent" and a separate agentType field.
        // Prefer direct agentType match (e.g. "opencode_local") over legacy type mapping.
        if (!agentType.isBlank()) {
            return agents.stream()
                .filter(a -> agentType.equals(a.adapterType()))
                .findFirst()
                .orElse(agents.get(index % agents.size()));
        }

        String preferredAdapter = NODE_TYPE_TO_ADAPTER.get(nodeType);
        if (preferredAdapter != null) {
            return agents.stream()
                .filter(a -> preferredAdapter.equals(a.adapterType()))
                .findFirst()
                .orElse(agents.get(index % agents.size()));
        }
        return agents.get(index % agents.size());
    }

    private String buildParamsText(Map<String, String> params) {
        if (params == null || params.isEmpty()) return "";
        return params.entrySet().stream()
            .filter(e -> e.getValue() != null && !e.getValue().isBlank())
            .map(e -> e.getKey() + ": " + e.getValue())
            .collect(Collectors.joining("\n"));
    }

    /**
     * Topological sort (Kahn's algorithm). Cycles: remaining nodes appended in original order.
     */
    private List<JsonNode> getOrderedNodes(JsonNode definition) {
        if (definition == null || definition.isNull() || definition.isMissingNode()) return List.of();

        JsonNode nodesArray = definition.path("nodes");
        JsonNode edgesArray = definition.path("edges");
        if (!nodesArray.isArray()) return List.of();

        List<JsonNode> nodeList = new ArrayList<>();
        Map<String, JsonNode> nodeById = new LinkedHashMap<>();
        Map<String, Integer> inDegree = new LinkedHashMap<>();
        Map<String, List<String>> successors = new LinkedHashMap<>();

        for (JsonNode n : nodesArray) {
            String id = n.path("id").asText();
            nodeList.add(n);
            nodeById.put(id, n);
            inDegree.put(id, 0);
            successors.put(id, new ArrayList<>());
        }

        if (edgesArray.isArray()) {
            for (JsonNode e : edgesArray) {
                String from = e.path("from").asText();
                String to = e.path("to").asText();
                if (successors.containsKey(from) && inDegree.containsKey(to)) {
                    successors.get(from).add(to);
                    inDegree.merge(to, 1, Integer::sum);
                }
            }
        }

        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) queue.offer(entry.getKey());
        }

        List<JsonNode> ordered = new ArrayList<>();
        Set<String> processed = new HashSet<>();

        while (!queue.isEmpty()) {
            String id = queue.poll();
            ordered.add(nodeById.get(id));
            processed.add(id);
            for (String succ : successors.getOrDefault(id, List.of())) {
                int deg = inDegree.merge(succ, -1, Integer::sum);
                if (deg == 0) queue.offer(succ);
            }
        }

        // Append any unprocessed nodes (cycle members) in original order
        for (JsonNode n : nodeList) {
            if (!processed.contains(n.path("id").asText())) {
                ordered.add(n);
            }
        }

        return ordered;
    }

    private void emitEvent(SseEmitter emitter, String eventName, Object data) throws IOException {
        emitter.send(SseEmitter.event()
            .name(eventName)
            .data(objectMapper.writeValueAsString(data)));
    }

    private void safeEmitError(SseEmitter emitter, String message) {
        try {
            String safe = message != null ? message.replace("\"", "'") : "Execution failed";
            emitter.send(SseEmitter.event()
                .name("session_error")
                .data("{\"message\":\"" + safe + "\"}"));
            emitter.complete();
        } catch (IOException ignored) {}
    }

    private void safeEmitStepLog(SseEmitter emitter, String stepId, String label, String agentId, String message) {
        try {
            emitEvent(emitter, "step_log", Map.of(
                "step_id", stepId,
                "label", label,
                "agent_id", agentId,
                "message", message
            ));
        } catch (IOException ignored) {}
    }

    private Path prepareArtifactDirectory(String workflowId, String workspacePath) throws IOException {
        String safeWorkflowId = workflowId == null || workflowId.isBlank() ? "session" : workflowId.replaceAll("[^a-zA-Z0-9-_]", "_");
        Path baseDir = Path.of(workspacePath).resolve(".loomai").resolve("artifacts").resolve(safeWorkflowId);
        Files.createDirectories(baseDir);
        return baseDir;
    }

    private List<Path> persistStepArtifacts(Path artifactDirectory, String label, int stepIndex, String output) throws IOException {
        if (artifactDirectory == null || output == null || output.isBlank()) {
            return List.of();
        }

        List<Path> artifacts = new ArrayList<>();
        String slug = slugify(label);
        Path rawOutputPath = artifactDirectory.resolve(String.format("%02d-%s-output.md", stepIndex + 1, slug));
        Files.writeString(rawOutputPath, output, StandardCharsets.UTF_8);
        artifacts.add(rawOutputPath);

        Matcher matcher = FENCED_BLOCK_PATTERN.matcher(output);
        int blockIndex = 0;
        while (matcher.find()) {
            String language = Optional.ofNullable(matcher.group(1)).orElse("txt").trim().toLowerCase(Locale.ROOT);
            String body = matcher.group(2).trim();
            if (body.isBlank()) {
                continue;
            }
            String extension = switch (language) {
                case "yaml", "yml" -> "yaml";
                case "md", "markdown" -> "md";
                case "json" -> "json";
                default -> "txt";
            };
            Path artifactPath = artifactDirectory.resolve(String.format("%02d-%s-block-%d.%s", stepIndex + 1, slug, ++blockIndex, extension));
            Files.writeString(artifactPath, body + System.lineSeparator(), StandardCharsets.UTF_8);
            artifacts.add(artifactPath);
        }

        return artifacts;
    }

    private String slugify(String value) {
        if (value == null || value.isBlank()) {
            return "step";
        }
        String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "step" : slug;
    }
}
