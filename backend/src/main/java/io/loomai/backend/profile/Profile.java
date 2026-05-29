package io.loomai.backend.profile;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record Profile(
        String id,
        String username,
        String color,
        @JsonProperty("created_at")
        Instant createdAt,
        @JsonProperty("updated_at")
        Instant updatedAt
) {
}
