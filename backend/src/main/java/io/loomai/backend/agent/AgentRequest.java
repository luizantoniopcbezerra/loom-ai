package io.loomai.backend.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record AgentRequest(
        @NotBlank(message = "name e obrigatorio")
        @Size(max = 80, message = "name deve ter no maximo 80 caracteres")
        String name,
        @NotBlank(message = "adapterType e obrigatorio")
        @Pattern(
                regexp = "^(claude_local|codex_local|gemini_local|opencode_local|aider_local|copilot_local|antigravity_local|custom_local)$",
                message = "adapterType invalido"
        )
        String adapterType,
        Map<String, Object> adapterConfig,
        @NotBlank(message = "status e obrigatorio")
        @Pattern(regexp = "^(active|idle|disabled)$", message = "status deve ser active, idle ou disabled")
        String status
) {
}
