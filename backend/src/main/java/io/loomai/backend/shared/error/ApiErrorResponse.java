package io.loomai.backend.shared.error;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        String code,
        String message,
        List<FieldViolation> fieldViolations
) {
}
