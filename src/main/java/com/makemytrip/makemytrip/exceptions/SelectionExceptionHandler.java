package com.makemytrip.makemytrip.exceptions;

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
    public ResponseEntity<ApiErrorResponse> handleSeatUnavailable(SeatUnavailableException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.CONFLICT.value(),
                "Seat Unavailable",
                ex.getMessage(),
                "/api/selection/reserve-seat"
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(RoomOptionNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleRoomOptionNotFound(RoomOptionNotFoundException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Room Option Not Found",
                ex.getMessage(),
                "/api/selection/hotel-rooms"
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }
}
