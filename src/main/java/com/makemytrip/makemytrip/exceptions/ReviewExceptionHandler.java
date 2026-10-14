package com.makemytrip.makemytrip.exceptions;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ReviewExceptionHandler {

    @ExceptionHandler(ReviewNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleReviewNotFound(ReviewNotFoundException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Review Not Found",
                ex.getMessage(),
                "/api/reviews"
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidReviewException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidReview(InvalidReviewException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Invalid Review Request",
                ex.getMessage(),
                "/api/reviews"
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}
