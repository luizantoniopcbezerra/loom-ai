package io.loomai.backend.settings;

import jakarta.validation.constraints.Pattern;

public record SettingsRequest(
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "accentColor deve ser #RRGGBB")
        String accentColor,
        Boolean sidebarExpanded,
        @Pattern(regexp = "^(dark|light)$", message = "theme deve ser dark ou light")
        String theme
) {
}
