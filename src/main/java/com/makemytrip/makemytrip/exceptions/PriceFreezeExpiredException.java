package com.makemytrip.makemytrip.exceptions;

public class PriceFreezeExpiredException extends RuntimeException {
    public PriceFreezeExpiredException(String message) {
        super(message);
    }
}
