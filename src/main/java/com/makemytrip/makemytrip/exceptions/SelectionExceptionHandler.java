package com.makemytrip.makemytrip.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SelectionExceptionHandler {

    @ExceptionHandler(SeatUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleSeatUnavailable(SeatUnavailableException ex, HttpServletRequest request) {
        String path = (request != null && request.getRequestURI() != null) ? request.getRequestURI() : "/api/selection/reserve-seat";
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.CONFLICT.value(),
                "Seat Unavailable",
                ex.getMessage(),
                path
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(RoomOptionNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleRoomOptionNotFound(RoomOptionNotFoundException ex, HttpServletRequest request) {
        String path = (request != null && request.getRequestURI() != null) ? request.getRequestURI() : "/api/selection/hotel-rooms";
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Room Option Not Found",
                ex.getMessage(),
                path
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        String path = (request != null && request.getRequestURI() != null) ? request.getRequestURI() : "/api/selection";
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Invalid Selection Request",
                ex.getMessage(),
                path
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}
