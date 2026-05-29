package io.loomai.backend.settings;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record Settings(
        String id,
        String accentColor,
        Boolean sidebarExpanded,
        String theme,
        @JsonProperty("updated_at")
        Instant updatedAt
) {
}
