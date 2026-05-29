package io.loomai.backend.conversation;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record Message(
        String id,
        @JsonProperty("conversation_id")
        String conversationId,
        String role,
        String content,
        @JsonProperty("created_at")
        Instant createdAt
) {
}
