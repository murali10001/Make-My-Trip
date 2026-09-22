package com.makemytrip.makemytrip.exceptions;

public class BookingFailedException extends RuntimeException {
    public BookingFailedException(String message) {
        super(message);
    }
}
