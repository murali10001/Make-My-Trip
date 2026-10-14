package com.makemytrip.makemytrip.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.logging.Logger;

@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
public class GlobalExceptionHandler {

    private static final Logger logger = Logger.getLogger(GlobalExceptionHandler.class.getName());

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        ApiErrorResponse response = new ApiErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Bad Request",
            ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided",
            request.getRequestURI()
        );
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleSecurityException(SecurityException ex, HttpServletRequest request) {
        ApiErrorResponse response = new ApiErrorResponse(
            HttpStatus.FORBIDDEN.value(),
            "Access Denied",
            ex.getMessage() != null ? ex.getMessage() : "Security validation failed",
            request.getRequestURI()
        );
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        logger.severe("Unhandled Exception on " + request.getRequestURI() + ": " + ex.getMessage());
        
        ApiErrorResponse response = new ApiErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "Internal Server Error",
            ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred",
            request.getRequestURI()
        );
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
