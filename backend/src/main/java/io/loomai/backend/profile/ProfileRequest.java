package io.loomai.backend.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        @NotBlank(message = "username e obrigatorio")
        @Size(max = 60, message = "username deve ter no maximo 60 caracteres")
        String username,
        @NotBlank(message = "color e obrigatoria")
        @Pattern(
                regexp = "^(var\\(--[a-z-]+\\)|#[0-9a-fA-F]{6})$",
                message = "color deve ser var(--token) ou #RRGGBB"
        )
        String color
) {
}
