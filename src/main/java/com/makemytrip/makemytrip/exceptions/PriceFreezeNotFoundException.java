package com.makemytrip.makemytrip.exceptions;

public class PriceFreezeNotFoundException extends RuntimeException {
    public PriceFreezeNotFoundException(String message) {
        super(message);
    }
}
