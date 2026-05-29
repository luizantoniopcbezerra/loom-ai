package io.loomai.backend.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WorkflowRequest(
        @NotBlank(message = "name e obrigatorio")
        @Size(max = 120, message = "name deve ter no maximo 120 caracteres")
        String name,
        @NotNull(message = "definition e obrigatoria")
        JsonNode definition
) {
}
