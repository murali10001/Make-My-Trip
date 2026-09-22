package com.makemytrip.makemytrip.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Collections;
import java.util.logging.Logger;

@RestControllerAdvice
public class DatabaseExceptionHandler {

    private static final Logger logger = Logger.getLogger(DatabaseExceptionHandler.class.getName());

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> handleDatabaseException(DataAccessException ex, HttpServletRequest request) {
        logger.warning("Database access exception occurred on URI " + request.getRequestURI() + ": " + ex.getMessage());

        // For list endpoints (/hotel, /flight), return empty list instead of crashing with HTTP 500!
        String uri = request.getRequestURI();
        if (uri.endsWith("/hotel") || uri.endsWith("/flight")) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        ApiErrorResponse response = new ApiErrorResponse(
            HttpStatus.SERVICE_UNAVAILABLE.value(),
            "Database Service Unavailable",
            "Database connection could not be established. Please ensure MongoDB is running.",
            request.getRequestURI()
        );
        return new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
