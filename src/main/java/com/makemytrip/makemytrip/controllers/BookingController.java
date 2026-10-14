package com.makemytrip.makemytrip.controllers;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;

@RestController
@RequestMapping("/booking")
public class BookingController {
    @Autowired
    private BookingService bookingService;

    @PostMapping("/flight")
    public Users.Booking bookFlight(@RequestParam String userId,
                                   @RequestParam String flightId,
                                   @RequestParam int seats,
                                   @RequestParam double price,
                                   @RequestParam(required = false) String freezeId) {
        if (freezeId != null && !freezeId.trim().isEmpty()) {
            return bookingService.bookFlight(userId, flightId, seats, price, freezeId);
        }
        return bookingService.bookFlight(userId, flightId, seats, price);
    }

    @PostMapping("/hotel")
    public Users.Booking bookhotel(@RequestParam String userId,
                                  @RequestParam String hotelId,
                                  @RequestParam int rooms,
                                  @RequestParam double price,
                                  @RequestParam(required = false) String freezeId) {
        if (freezeId != null && !freezeId.trim().isEmpty()) {
            return bookingService.bookhotel(userId, hotelId, rooms, price, freezeId);
        }
        return bookingService.bookhotel(userId, hotelId, rooms, price);
    }
}
