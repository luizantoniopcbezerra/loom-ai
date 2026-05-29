package io.loomai.backend.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AgentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AgentRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Agent> findAll() {
        String sql = """
                SELECT id, name, adapter_type, adapter_config_json, status, updated_at
                FROM agents
                ORDER BY name ASC
                """;
        return jdbcTemplate.query(sql, this::mapAgent);
    }

    public Optional<Agent> findById(String id) {
        String sql = """
                SELECT id, name, adapter_type, adapter_config_json, status, updated_at
                FROM agents
                WHERE id = ?
                """;
        return jdbcTemplate.query(sql, this::mapAgent, id).stream().findFirst();
    }

    public Optional<Agent> findByName(String name) {
        String sql = """
                SELECT id, name, adapter_type, adapter_config_json, status, updated_at
                FROM agents
                WHERE lower(name) = lower(?)
                """;
        return jdbcTemplate.query(sql, this::mapAgent, name).stream().findFirst();
    }

    public Agent save(Agent agent) {
        if (findById(agent.id()).isPresent()) {
            update(agent);
            return agent;
        }

        insert(agent);
        return agent;
    }

    public void saveAll(List<Agent> agents) {
        for (Agent agent : agents) {
            save(agent);
        }
    }

    public void deleteAllByIds(Collection<String> agentIds) {
        if (agentIds == null || agentIds.isEmpty()) {
            return;
        }

        String placeholders = String.join(", ", java.util.Collections.nCopies(agentIds.size(), "?"));
        String sql = "DELETE FROM agents WHERE id IN (" + placeholders + ")";
        jdbcTemplate.update(sql, agentIds.toArray());
    }

    private void insert(Agent agent) {
        String sql = """
                INSERT INTO agents (id, name, adapter_type, adapter_config_json, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                agent.id(),
                agent.name(),
                agent.adapterType(),
                writeConfig(agent.adapterConfig()),
                agent.status(),
                agent.updatedAt().toString()
        );
    }

    private void update(Agent agent) {
        String sql = """
                UPDATE agents
                SET name = ?, adapter_type = ?, adapter_config_json = ?, status = ?, updated_at = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(
                sql,
                agent.name(),
                agent.adapterType(),
                writeConfig(agent.adapterConfig()),
                agent.status(),
                agent.updatedAt().toString(),
                agent.id()
        );
    }

    private Agent mapAgent(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Agent(
                resultSet.getString("id"),
                resultSet.getString("name"),
                resultSet.getString("adapter_type"),
                readConfig(resultSet.getString("adapter_config_json")),
                resultSet.getString("status"),
                Instant.parse(resultSet.getString("updated_at"))
        );
    }

    private String writeConfig(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config == null ? Map.of() : config);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Nao foi possivel serializar adapter_config.", exception);
        }
    }

    private Map<String, Object> readConfig(String raw) {
        if (raw == null || raw.isBlank()) {
            return Map.of();
        }

        try {
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Nao foi possivel ler adapter_config_json.", exception);
        }
    }
}
