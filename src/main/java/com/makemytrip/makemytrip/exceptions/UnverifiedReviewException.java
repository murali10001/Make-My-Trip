package com.makemytrip.makemytrip.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnverifiedReviewException extends RuntimeException {
    public UnverifiedReviewException(String message) {
        super(message);
    }
}
