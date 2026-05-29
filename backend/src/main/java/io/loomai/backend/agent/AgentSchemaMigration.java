package io.loomai.backend.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AgentSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AgentSchemaMigration(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        Set<String> columns = loadColumns();
        if (columns.isEmpty()) {
            return;
        }

        if (!columns.contains("adapter_type")) {
            jdbcTemplate.execute("ALTER TABLE agents ADD COLUMN adapter_type TEXT");
        }
        if (!columns.contains("adapter_config_json")) {
            jdbcTemplate.execute("ALTER TABLE agents ADD COLUMN adapter_config_json TEXT");
        }

        migrateLegacyAgents(columns);
    }

    private Set<String> loadColumns() {
        List<String> rows = jdbcTemplate.query(
                "PRAGMA table_info(agents)",
                (resultSet, rowNum) -> resultSet.getString("name")
        );
        return new HashSet<>(rows);
    }

    private void migrateLegacyAgents(Set<String> legacyColumns) {
        boolean hasCli = legacyColumns.contains("cli");
        boolean hasPath = legacyColumns.contains("path");
        boolean hasVersion = legacyColumns.contains("version");
        if (!hasCli && !hasPath && !hasVersion) {
            return;
        }

        List<Map<String, Object>> legacyAgents = jdbcTemplate.queryForList("SELECT * FROM agents");
        for (Map<String, Object> row : legacyAgents) {
            String adapterType = asString(row.get("adapter_type"));
            String adapterConfigJson = asString(row.get("adapter_config_json"));
            if (adapterType != null && !adapterType.isBlank() && adapterConfigJson != null && !adapterConfigJson.isBlank()) {
                continue;
            }

            String id = asString(row.get("id"));
            String name = asString(row.get("name"));
            String cli = hasCli ? asString(row.get("cli")) : null;
            String path = hasPath ? asString(row.get("path")) : null;
            String version = hasVersion ? asString(row.get("version")) : null;

            String resolvedAdapterType = resolveAdapterType(name, cli);
            String resolvedConfig = writeConfig(resolvedAdapterType, cli, path, version);
            jdbcTemplate.update(
                    "UPDATE agents SET adapter_type = ?, adapter_config_json = ? WHERE id = ?",
                    resolvedAdapterType,
                    resolvedConfig,
                    id
            );
        }
    }

    private String resolveAdapterType(String name, String cli) {
        String token = ((cli == null || cli.isBlank()) ? name : cli).toLowerCase();
        if (token.contains("claude")) return "claude_local";
        if (token.contains("codex")) return "codex_local";
        if (token.contains("gemini")) return "gemini_local";
        if (token.contains("opencode")) return "opencode_local";
        if (token.contains("aider")) return "aider_local";
        if (token.contains("copilot") || token.equals("gh")) return "copilot_local";
        if (token.contains("antigravity")) return "antigravity_local";
        return "custom_local";
    }

    private String writeConfig(String adapterType, String cli, String path, String version) {
        Map<String, Object> config = new LinkedHashMap<>();
        if (cli != null && !cli.isBlank()) {
            config.put("command", cli);
        }
        if (path != null && !path.isBlank()) {
            config.put("binaryPath", path);
        }
        if (version != null && !version.isBlank()) {
            config.put("detectedVersion", version);
        }
        config.put("model", defaultModelFor(adapterType));
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Nao foi possivel migrar adapter_config_json.", exception);
        }
    }

    private String defaultModelFor(String adapterType) {
        return switch (adapterType) {
            case "claude_local" -> "claude-sonnet-4-6";
            case "codex_local" -> "gpt-5.3-codex";
            case "gemini_local" -> "gemini-2.5-pro";
            case "opencode_local" -> "anthropic/claude-sonnet-4";
            case "aider_local" -> "sonnet";
            case "copilot_local" -> "gpt-4.1";
            case "antigravity_local" -> "local-instruct-8b";
            default -> "default";
        };
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
