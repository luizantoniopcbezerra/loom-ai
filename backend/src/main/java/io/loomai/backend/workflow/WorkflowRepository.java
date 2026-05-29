package io.loomai.backend.workflow;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WorkflowRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public WorkflowRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Workflow> findAll() {
        String sql = """
                SELECT id, name, definition_json, created_at, updated_at
                FROM workflows
                ORDER BY updated_at DESC
                """;
        return jdbcTemplate.query(sql, this::mapWorkflow);
    }

    public Optional<Workflow> findById(String workflowId) {
        String sql = """
                SELECT id, name, definition_json, created_at, updated_at
                FROM workflows
                WHERE id = ?
                """;
        return jdbcTemplate.query(sql, this::mapWorkflow, workflowId).stream().findFirst();
    }

    public Workflow save(Workflow workflow) {
        String sql = """
                INSERT INTO workflows (id, name, definition_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                workflow.id(),
                workflow.name(),
                toJson(workflow.definition()),
                workflow.createdAt().toString(),
                workflow.updatedAt().toString()
        );
        return workflow;
    }

    public void deleteById(String workflowId) {
        jdbcTemplate.update("DELETE FROM workflows WHERE id = ?", workflowId);
    }

    public Workflow update(Workflow workflow) {
        String sql = """
                UPDATE workflows
                SET name = ?, definition_json = ?, updated_at = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(
                sql,
                workflow.name(),
                toJson(workflow.definition()),
                workflow.updatedAt().toString(),
                workflow.id()
        );
        return workflow;
    }

    private Workflow mapWorkflow(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Workflow(
                resultSet.getString("id"),
                resultSet.getString("name"),
                toJsonNode(resultSet.getString("definition_json")),
                Instant.parse(resultSet.getString("created_at")),
                Instant.parse(resultSet.getString("updated_at"))
        );
    }

    private JsonNode toJsonNode(String definitionJson) {
        try {
            return objectMapper.readTree(definitionJson);
        } catch (JsonProcessingException exception) {
            throw new ApiException(
                    ErrorCode.INTERNAL_ERROR,
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "O backend local nao conseguiu concluir a operacao."
            );
        }
    }

    private String toJson(JsonNode definition) {
        try {
            return objectMapper.writeValueAsString(definition);
        } catch (JsonProcessingException exception) {
            throw new ApiException(
                    ErrorCode.INVALID_JSON,
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "O corpo da requisicao nao contem JSON valido."
            );
        }
    }
}
