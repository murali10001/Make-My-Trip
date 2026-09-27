package com.makemytrip.makemytrip.exceptions;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PricingExceptionHandler {

    @ExceptionHandler(PriceFreezeNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlePriceFreezeNotFound(PriceFreezeNotFoundException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Price Freeze Not Found",
                ex.getMessage(),
                "/api/pricing/freeze"
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(PriceFreezeExpiredException.class)
    public ResponseEntity<ApiErrorResponse> handlePriceFreezeExpired(PriceFreezeExpiredException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.GONE.value(),
                "Price Freeze Expired",
                ex.getMessage(),
                "/api/pricing/freeze"
        );
        return new ResponseEntity<>(error, HttpStatus.GONE);
    }

    @ExceptionHandler(InvalidCouponException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCoupon(InvalidCouponException ex) {
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Invalid Coupon Code",
                ex.getMessage(),
                "/api/pricing/apply-coupon"
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}

