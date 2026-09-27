package com.makemytrip.makemytrip.exceptions;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RefundExceptionHandler {

    @ExceptionHandler(CancellationNotAllowedException.class)
    public ResponseEntity<ApiErrorResponse> handleCancellationNotAllowed(CancellationNotAllowedException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Cancellation Request Failed",
                ex.getMessage(),
                "/refund/cancel-and-request"
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RefundNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleRefundNotFound(RefundNotFoundException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Refund Request Not Found",
                ex.getMessage(),
                "/refund/status"
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }
}
