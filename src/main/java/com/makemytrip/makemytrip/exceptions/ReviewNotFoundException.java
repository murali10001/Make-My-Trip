package com.makemytrip.makemytrip.exceptions;

public class ReviewNotFoundException extends RuntimeException {
    public ReviewNotFoundException(String message) {
        super(message);
    }
}
