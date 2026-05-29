package io.loomai.backend.conversation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MessageRequest(
        @NotBlank(message = "role e obrigatorio")
        @Pattern(regexp = "^(user|assistant|system)$", message = "role deve ser user, assistant ou system")
        String role,
        @NotBlank(message = "content e obrigatorio")
        @Size(max = 20000, message = "content deve ter no maximo 20000 caracteres")
        String content
) {
}
