package com.makemytrip.makemytrip.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;

import java.util.List;

@RestController
@RequestMapping({"/booking", "/api/booking", "/api/bookings"})
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping("/flight")
    public ResponseEntity<Users.Booking> bookFlight(@RequestParam String userId,
                                                    @RequestParam String flightId,
                                                    @RequestParam int seats,
                                                    @RequestParam double price,
                                                    @RequestParam(required = false) String freezeId) {
        Users.Booking booking;
        if (freezeId != null && !freezeId.trim().isEmpty()) {
            booking = bookingService.bookFlight(userId, flightId, seats, price, freezeId);
        } else {
            booking = bookingService.bookFlight(userId, flightId, seats, price);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    @PostMapping("/hotel")
    public ResponseEntity<Users.Booking> bookhotel(@RequestParam String userId,
                                                   @RequestParam String hotelId,
                                                   @RequestParam int rooms,
                                                   @RequestParam double price,
                                                   @RequestParam(required = false) String freezeId) {
        Users.Booking booking;
        if (freezeId != null && !freezeId.trim().isEmpty()) {
            booking = bookingService.bookhotel(userId, hotelId, rooms, price, freezeId);
        } else {
            booking = bookingService.bookhotel(userId, hotelId, rooms, price);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    @GetMapping({"/user/{userId}", "/{userId}"})
    public ResponseEntity<List<Users.Booking>> getUserBookings(@PathVariable String userId) {
        List<Users.Booking> bookings = bookingService.getUserBookings(userId);
        return ResponseEntity.ok(bookings);
    }
}
