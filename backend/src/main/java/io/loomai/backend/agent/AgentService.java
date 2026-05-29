package io.loomai.backend.agent;

import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.time.UtcClock;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AgentService {

    private static final Map<String, List<String>> ADAPTER_MODELS = Map.of(
            "claude_local", List.of(
                    "claude-opus-4-7",
                    "claude-opus-4-6",
                    "claude-sonnet-4-6",
                    "claude-haiku-4-6",
                    "claude-sonnet-4-5-20250929",
                    "claude-haiku-4-5-20251001"
            ),
            "codex_local", List.of(
                    "gpt-5.4",
                    "gpt-5.3-codex",
                    "gpt-5.3-codex-spark",
                    "gpt-5",
                    "o3",
                    "o4-mini",
                    "gpt-5-mini",
                    "gpt-5-nano",
                    "o3-mini",
                    "codex-mini-latest"
            ),
            "gemini_local", List.of(
                    "gemini-3.1-pro",
                    "gemini-3-flash",
                    "gemini-2.5-pro",
                    "gemini-2.5-flash",
                    "gemini-2.5-flash-lite"
            ),
            "opencode_local", List.of(
                    "opencode/big-pickle",
                    "opencode/deepseek-v4-flash-free",
                    "opencode/nemotron-3-super-free",
                    "anthropic/claude-sonnet-4-6",
                    "anthropic/claude-sonnet-4-5",
                    "anthropic/claude-opus-4",
                    "openai/gpt-4.1",
                    "google/gemini-2.5-pro",
                    "qwen/qwen3-coder"
            ),
            "aider_local", List.of("sonnet", "o3-mini", "r1", "deepseek/deepseek-chat", "gpt-4o"),
            "copilot_local", List.of("claude-sonnet-4.6", "gpt-5.4", "gpt-5.3-codex", "gpt-4.1"),
            "antigravity_local", List.of("local-instruct-8b", "qwen2.5-coder-14b"),
            "custom_local", List.of("default")
    );

    private final AgentRepository agentRepository;
    private final LocalAgentScanner localAgentScanner;
    private final UtcClock utcClock;

    public AgentService(AgentRepository agentRepository, LocalAgentScanner localAgentScanner, UtcClock utcClock) {
        this.agentRepository = agentRepository;
        this.localAgentScanner = localAgentScanner;
        this.utcClock = utcClock;
    }

    public List<Agent> getAgents() {
        return agentRepository.findAll();
    }

    public List<Agent> scanAgents() {
        List<Agent> detected = localAgentScanner.scanInstalledAgents();
        reconcileScannedAgents(detected);
        agentRepository.saveAll(detected);
        removeMissingScannedAgents(detected);
        return agentRepository.findAll();
    }

    public Agent createAgent(AgentRequest request) {
        assertUniqueName(request.name().trim(), null);
        Instant now = utcClock.now();
        Agent agent = new Agent(
                UUID.randomUUID().toString(),
                request.name().trim(),
                request.adapterType(),
                normalizeAdapterConfig(request.adapterType(), request.adapterConfig()),
                request.status(),
                now
        );
        return agentRepository.save(agent);
    }

    public Agent saveAgent(String agentId, AgentRequest request) {
        if (!isUuid(agentId)) {
            throw notFound();
        }

        Agent existing = agentRepository.findById(agentId)
                .orElseThrow(this::notFound);

        assertUniqueName(request.name().trim(), existing.id());
        Agent agent = new Agent(
                existing.id(),
                request.name().trim(),
                request.adapterType(),
                normalizeAdapterConfig(request.adapterType(), request.adapterConfig()),
                request.status(),
                utcClock.now()
        );
        return agentRepository.save(agent);
    }

    public List<AdapterModel> getAdapterModels(String adapterType) {
        List<String> models = ADAPTER_MODELS.get(adapterType);
        if (models == null) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    HttpStatus.NOT_FOUND,
                    "Adapter local nao encontrado."
            );
        }
        return models.stream()
                .map(model -> new AdapterModel(model, model))
                .toList();
    }

    private Map<String, Object> normalizeAdapterConfig(String adapterType, Map<String, Object> rawConfig) {
        Map<String, Object> config = rawConfig == null ? Map.of() : rawConfig;
        if (config.containsKey("model")) {
            return config;
        }

        List<String> models = ADAPTER_MODELS.getOrDefault(adapterType, List.of("default"));
        LinkedHashMap<String, Object> normalized = new LinkedHashMap<>(config);
        normalized.put("model", models.getFirst());
        return normalized;
    }

    private void assertUniqueName(String name, String currentId) {
        agentRepository.findByName(name)
                .filter(agent -> !agent.id().equals(currentId))
                .ifPresent(agent -> {
                    throw new ApiException(
                            ErrorCode.INVALID_INPUT,
                            HttpStatus.UNPROCESSABLE_ENTITY,
                            "Ja existe um agente com esse nome."
                    );
                });
    }

    private ApiException notFound() {
        return new ApiException(
                ErrorCode.NOT_FOUND,
                HttpStatus.NOT_FOUND,
                "Recurso nao encontrado."
        );
    }

    private boolean isUuid(String agentId) {
        try {
            UUID.fromString(agentId);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private void reconcileScannedAgents(List<Agent> detected) {
        List<Agent> existingAgents = agentRepository.findAll();

        for (Agent detectedAgent : detected) {
            existingAgents.stream()
                    .filter(this::isAutoDetected)
                    .filter(existingAgent -> !existingAgent.id().equals(detectedAgent.id()))
                    .filter(existingAgent -> existingAgent.adapterType().equals(detectedAgent.adapterType()))
                    .filter(existingAgent -> existingAgent.name().equalsIgnoreCase(detectedAgent.name()))
                    .findFirst()
                    .ifPresent(staleAgent -> agentRepository.deleteAllByIds(List.of(staleAgent.id())));
        }
    }

    private void removeMissingScannedAgents(List<Agent> detected) {
        Set<String> detectedIds = detected.stream()
                .map(Agent::id)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));

        List<String> staleIds = agentRepository.findAll().stream()
                .filter(this::isAutoDetected)
                .map(Agent::id)
                .filter(existingId -> !detectedIds.contains(existingId))
                .toList();

        agentRepository.deleteAllByIds(staleIds);
    }

    private boolean isAutoDetected(Agent agent) {
        Map<String, Object> config = agent.adapterConfig();
        if (config == null || config.isEmpty()) {
            return false;
        }
        return config.containsKey("binaryPath") || config.containsKey("detectedVersion");
    }
}
