package io.loomai.backend.conversation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConversationRequest(
        @NotBlank(message = "title e obrigatorio")
        @Size(max = 120, message = "title deve ter no maximo 120 caracteres")
        String title
) {
}
