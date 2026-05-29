package io.loomai.backend.conversation;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record Conversation(
        String id,
        String title,
        @JsonProperty("created_at")
        Instant createdAt,
        @JsonProperty("updated_at")
        Instant updatedAt
) {
}
