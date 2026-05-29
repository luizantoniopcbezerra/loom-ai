package io.loomai.backend.conversation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ConversationRepository {

    private final JdbcTemplate jdbcTemplate;

    public ConversationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Conversation> findAll() {
        String sql = """
                SELECT id, title, created_at, updated_at
                FROM conversations
                ORDER BY updated_at DESC
                """;
        return jdbcTemplate.query(sql, this::mapConversation);
    }

    public Optional<Conversation> findById(String conversationId) {
        String sql = """
                SELECT id, title, created_at, updated_at
                FROM conversations
                WHERE id = ?
                """;
        return jdbcTemplate.query(sql, this::mapConversation, conversationId).stream().findFirst();
    }

    public Conversation save(Conversation conversation) {
        String sql = """
                INSERT INTO conversations (id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                conversation.id(),
                conversation.title(),
                conversation.createdAt().toString(),
                conversation.updatedAt().toString()
        );
        return conversation;
    }

    public void deleteById(String conversationId) {
        jdbcTemplate.update("DELETE FROM conversations WHERE id = ?", conversationId);
    }

    public void touch(String conversationId, Instant updatedAt) {
        String sql = """
                UPDATE conversations
                SET updated_at = ?
                WHERE id = ?
                """;
        jdbcTemplate.update(sql, updatedAt.toString(), conversationId);
    }

    private Conversation mapConversation(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Conversation(
                resultSet.getString("id"),
                resultSet.getString("title"),
                Instant.parse(resultSet.getString("created_at")),
                Instant.parse(resultSet.getString("updated_at"))
        );
    }
}
