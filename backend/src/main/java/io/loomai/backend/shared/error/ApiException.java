package io.loomai.backend.shared.error;

import java.util.List;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus httpStatus;
    private final List<FieldViolation> fieldViolations;

    public ApiException(ErrorCode errorCode, HttpStatus httpStatus, String message) {
        this(errorCode, httpStatus, message, List.of());
    }

    public ApiException(
            ErrorCode errorCode,
            HttpStatus httpStatus,
            String message,
            List<FieldViolation> fieldViolations
    ) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        this.fieldViolations = List.copyOf(fieldViolations);
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public HttpStatus httpStatus() {
        return httpStatus;
    }

    public List<FieldViolation> fieldViolations() {
        return fieldViolations;
    }
}
