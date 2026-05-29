package io.loomai.backend.agent;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.Map;

public record Agent(
        String id,
        String name,
        @JsonProperty("adapter_type")
        String adapterType,
        @JsonProperty("adapter_config")
        Map<String, Object> adapterConfig,
        String status,
        @JsonProperty("updated_at")
        Instant updatedAt
) {
}
