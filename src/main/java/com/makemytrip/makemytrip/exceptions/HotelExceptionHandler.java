package com.makemytrip.makemytrip.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class HotelExceptionHandler {

    @ExceptionHandler(HotelNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleHotelNotFound(HotelNotFoundException ex, HttpServletRequest request) {
        ApiErrorResponse response = new ApiErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            "Hotel Not Found",
            ex.getMessage(),
            request.getRequestURI()
        );
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }
}
