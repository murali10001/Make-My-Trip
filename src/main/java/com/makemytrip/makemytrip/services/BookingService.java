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

    public Booking bookFlight(String userId, String flightId, int seats, double price) {
        Users user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Flight flight = flightRepository.findById(flightId)
            .orElseThrow(() -> new FlightNotFoundException("Flight with ID '" + flightId + "' not found"));

        if (flight.getAvailableSeats() < seats) {
            throw new InsufficientCapacityException("Not enough seats available. Requested: " + seats + ", Available: " + flight.getAvailableSeats());
        }

        flight.setAvailableSeats(flight.getAvailableSeats() - seats);
        flightRepository.save(flight);

        Booking booking = new Booking();
        booking.setType("Flight");
        booking.setBookingId(flightId);
        booking.setDate(LocalDate.now().toString());
        booking.setQuantity(seats);
        booking.setTotalPrice(price);

        user.getBookings().add(booking);
        userRepository.save(user);

        return booking;
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, double price) {
        Users user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Hotel hotel = hotelRepository.findById(hotelId)
            .orElseThrow(() -> new HotelNotFoundException("Hotel with ID '" + hotelId + "' not found"));

        if (hotel.getAvailableRooms() < rooms) {
            throw new InsufficientCapacityException("Not enough rooms available. Requested: " + rooms + ", Available: " + hotel.getAvailableRooms());
        }

        hotel.setAvailableRooms(hotel.getAvailableRooms() - rooms);
        hotelRepository.save(hotel);

        Booking booking = new Booking();
        booking.setType("Hotel");
        booking.setBookingId(hotelId);
        booking.setDate(LocalDate.now().toString());
        booking.setQuantity(rooms);
        booking.setTotalPrice(price);

        user.getBookings().add(booking);
        userRepository.save(user);

        return booking;
    }
}