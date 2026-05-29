package io.loomai.backend.shared.error;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException exception) {
        return ResponseEntity.status(exception.httpStatus())
                .body(new ApiErrorResponse(
                        Instant.now(),
                        exception.errorCode().name(),
                        exception.getMessage(),
                        exception.fieldViolations()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException exception) {
        List<FieldViolation> violations = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toViolation)
                .toList();

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ApiErrorResponse(
                        Instant.now(),
                        ErrorCode.INVALID_INPUT.name(),
                        "Os dados enviados sao invalidos.",
                        violations
                ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleJsonException(HttpMessageNotReadableException exception) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ApiErrorResponse(
                        Instant.now(),
                        ErrorCode.INVALID_JSON.name(),
                        "O corpo da requisicao nao contem JSON valido.",
                        List.of()
                ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleDatabaseException(DataAccessException exception) {
        log.error("DataAccessException: {}", exception.getMessage(), exception);
        return internalError();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        log.error("UnexpectedException: {}", exception.getMessage(), exception);
        return internalError();
    }

    private FieldViolation toViolation(FieldError fieldError) {
        String message = fieldError.getDefaultMessage();
        return new FieldViolation(fieldError.getField(), message == null ? "valor invalido" : message);
    }

    private ResponseEntity<ApiErrorResponse> internalError() {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse(
                        Instant.now(),
                        ErrorCode.INTERNAL_ERROR.name(),
                        "O backend local nao conseguiu concluir a operacao.",
                        List.of()
                ));
    }

}
