package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.FlightNotFoundException;
import com.makemytrip.makemytrip.exceptions.HotelNotFoundException;
import com.makemytrip.makemytrip.exceptions.InsufficientCapacityException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class BookingService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private NotificationService notificationService;

    public Booking bookFlight(String userId, String flightId, int seats, double price) {
        if (seats <= 0) {
            throw new IllegalArgumentException("Invalid ticket quantity requested: " + seats + ". Must be at least 1.");
        }

        Users user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Flight flight = flightRepository.findById(flightId)
            .orElseThrow(() -> new FlightNotFoundException("Flight with ID '" + flightId + "' not found"));

        if (flight.getAvailableSeats() < seats) {
            throw new InsufficientCapacityException("Not enough seats available. Requested: " + seats + ", Available: " + flight.getAvailableSeats());
        }

        // Validate price to prevent client tampering
        if (price <= 0) {
            price = flight.getPrice() * seats;
        }

        flight.setAvailableSeats(flight.getAvailableSeats() - seats);
        flightRepository.save(flight);

        String uniqueBookingId = "BK-FL-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = new Booking();
        booking.setType("Flight");
        booking.setBookingId(uniqueBookingId);
        booking.setDate(LocalDate.now().toString());
        booking.setQuantity(seats);
        booking.setTotalPrice(price);
        booking.setTargetId(flightId);
        booking.setStatus("CONFIRMED");

        user.getBookings().add(booking);
        userRepository.save(user);

        // Dynamically create notification in DB for user
        notificationService.createNotification(
            userId,
            "Flight Booking Confirmed!",
            "Confirmed " + seats + " seat(s) on " + flight.getFlightName() + " (" + flight.getFrom() + " to " + flight.getTo() + "). Total: ₹" + price,
            "flight"
        );

        return booking;
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, double price) {
        if (rooms <= 0) {
            throw new IllegalArgumentException("Invalid room quantity requested: " + rooms + ". Must be at least 1.");
        }

        Users user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Hotel hotel = hotelRepository.findById(hotelId)
            .orElseThrow(() -> new HotelNotFoundException("Hotel with ID '" + hotelId + "' not found"));

        if (hotel.getAvailableRooms() < rooms) {
            throw new InsufficientCapacityException("Not enough rooms available. Requested: " + rooms + ", Available: " + hotel.getAvailableRooms());
        }

        // Validate price to prevent client tampering
        if (price <= 0) {
            price = hotel.getPricePerNight() * rooms;
        }

        hotel.setAvailableRooms(hotel.getAvailableRooms() - rooms);
        hotelRepository.save(hotel);

        String uniqueBookingId = "BK-HT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = new Booking();
        booking.setType("Hotel");
        booking.setBookingId(uniqueBookingId);
        booking.setDate(LocalDate.now().toString());
        booking.setQuantity(rooms);
        booking.setTotalPrice(price);
        booking.setTargetId(hotelId);
        booking.setStatus("CONFIRMED");

        user.getBookings().add(booking);
        userRepository.save(user);

        // Dynamically create notification in DB for user
        notificationService.createNotification(
            userId,
            "Hotel Booking Confirmed!",
            "Confirmed " + rooms + " room(s) at " + hotel.getHotelName() + " (" + hotel.getLocation() + "). Total: ₹" + price,
            "hotel"
        );

        return booking;
    }
}