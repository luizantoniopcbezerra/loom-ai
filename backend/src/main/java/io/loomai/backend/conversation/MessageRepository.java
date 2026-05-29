package io.loomai.backend.conversation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MessageRepository {

    private final JdbcTemplate jdbcTemplate;

    public MessageRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Message> findByConversationId(String conversationId) {
        String sql = """
                SELECT id, conversation_id, role, content, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                """;
        return jdbcTemplate.query(sql, this::mapMessage, conversationId);
    }

    public void deleteByConversationId(String conversationId) {
        jdbcTemplate.update("DELETE FROM messages WHERE conversation_id = ?", conversationId);
    }

    public Message save(Message message) {
        String sql = """
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                """;
        jdbcTemplate.update(
                sql,
                message.id(),
                message.conversationId(),
                message.role(),
                message.content(),
                message.createdAt().toString()
        );
        return message;
    }

    private Message mapMessage(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Message(
                resultSet.getString("id"),
                resultSet.getString("conversation_id"),
                resultSet.getString("role"),
                resultSet.getString("content"),
                Instant.parse(resultSet.getString("created_at"))
        );
    }
}
