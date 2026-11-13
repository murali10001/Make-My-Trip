package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.FlightNotFoundException;
import com.makemytrip.makemytrip.exceptions.HotelNotFoundException;
import com.makemytrip.makemytrip.exceptions.InsufficientCapacityException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class BookingService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired(required = false)
    private PriceFreezeRepository priceFreezeRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired(required = false)
    private SelectionService selectionService;

    public Booking bookFlight(String userId, String flightId, int seats, double price) {
        return bookFlight(userId, flightId, seats, price, null, null, null, 0.0);
    }

    public Booking bookFlight(String userId, String flightId, int seats, double price, String freezeId) {
        return bookFlight(userId, flightId, seats, price, freezeId, null, null, 0.0);
    }

    public Booking bookFlight(String userId, String flightId, int seats, double price, String freezeId,
                              String seatNo, String seatTier, double seatAddon) {
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

        // If seat requested, reserve it through selectionService
        if (seatNo != null && !seatNo.trim().isEmpty() && selectionService != null) {
            selectionService.reserveSeat(flightId, seatNo.trim(), userId);
        }

        double unitPrice = flight.getPrice();
        if (freezeId != null && !freezeId.trim().isEmpty() && priceFreezeRepository != null) {
            Optional<PriceFreeze> freezeOpt = priceFreezeRepository.findById(freezeId.trim());
            if (freezeOpt.isPresent()) {
                PriceFreeze freeze = freezeOpt.get();
                if (freeze.isActive() && LocalDateTime.now().isBefore(freeze.getExpiresAt()) && flightId.equals(freeze.getItemId())) {
                    unitPrice = freeze.getFrozenPrice();
                    freeze.setActive(false);
                    priceFreezeRepository.save(freeze);
                }
            }
        }

        double authoritativeTotal = (unitPrice * seats) + (seatAddon * seats);

        if (price <= 0 || price < (authoritativeTotal * 0.5)) {
            price = authoritativeTotal;
        }

        flight.setAvailableSeats(flight.getAvailableSeats() - seats);
        flightRepository.save(flight);

        String uniqueBookingId = "BK-FL-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = new Booking();
        booking.setType("Flight");
        booking.setBookingId(uniqueBookingId);
        booking.setDate(LocalDate.now().toString());
        booking.setBookingTimestamp(LocalDateTime.now().toString());
        booking.setQuantity(seats);
        booking.setTotalPrice(price);
        booking.setTargetId(flightId);
        booking.setStatus("CONFIRMED");

        if (seatNo != null && !seatNo.trim().isEmpty()) {
            booking.setSeatNo(seatNo.trim());
            booking.setSeatTier(seatTier != null && !seatTier.trim().isEmpty() ? seatTier.trim() : "STANDARD");
            booking.setSeatAddon(seatAddon);
        }

        user.getBookings().add(booking);
        userRepository.save(user);

        String seatMsg = booking.getSeatNo() != null ? " (Seat: " + booking.getSeatNo() + ")" : "";
        notificationService.createNotification(
            userId,
            "Flight Booking Confirmed!",
            "Confirmed " + seats + " seat(s)" + seatMsg + " on " + flight.getFlightName() + " (" + flight.getFrom() + " to " + flight.getTo() + "). Total: ₹" + price,
            "flight"
        );

        return booking;
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, double price) {
        return bookhotel(userId, hotelId, rooms, price, null, null, 0.0);
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, double price, String freezeId) {
        return bookhotel(userId, hotelId, rooms, price, freezeId, null, 0.0);
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, double price, String freezeId,
                             String roomTypeName, double roomUpgradeAddon) {
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

        // If specific room type requested, reserve it in selectionService
        if (roomTypeName != null && !roomTypeName.trim().isEmpty() && selectionService != null) {
            selectionService.reserveRoomOption(hotelId, roomTypeName.trim(), rooms);
        }

        double unitPrice = hotel.getPricePerNight();
        if (freezeId != null && !freezeId.trim().isEmpty() && priceFreezeRepository != null) {
            Optional<PriceFreeze> freezeOpt = priceFreezeRepository.findById(freezeId.trim());
            if (freezeOpt.isPresent()) {
                PriceFreeze freeze = freezeOpt.get();
                if (freeze.isActive() && LocalDateTime.now().isBefore(freeze.getExpiresAt()) && hotelId.equals(freeze.getItemId())) {
                    unitPrice = freeze.getFrozenPrice();
                    freeze.setActive(false);
                    priceFreezeRepository.save(freeze);
                }
            }
        }

        double authoritativeTotal = (unitPrice * rooms) + (roomUpgradeAddon * rooms);
        if (price <= 0 || price < (authoritativeTotal * 0.5)) {
            price = authoritativeTotal;
        }

        hotel.setAvailableRooms(hotel.getAvailableRooms() - rooms);
        hotelRepository.save(hotel);

        String uniqueBookingId = "BK-HT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = new Booking();
        booking.setType("Hotel");
        booking.setBookingId(uniqueBookingId);
        booking.setDate(LocalDate.now().toString());
        booking.setBookingTimestamp(LocalDateTime.now().toString());
        booking.setQuantity(rooms);
        booking.setTotalPrice(price);
        booking.setTargetId(hotelId);
        booking.setStatus("CONFIRMED");

        if (roomTypeName != null && !roomTypeName.trim().isEmpty()) {
            booking.setRoomTypeName(roomTypeName.trim());
            booking.setRoomUpgradeAddon(roomUpgradeAddon);
        }

        user.getBookings().add(booking);
        userRepository.save(user);

        String roomMsg = booking.getRoomTypeName() != null ? " (" + booking.getRoomTypeName() + ")" : "";
        notificationService.createNotification(
            userId,
            "Hotel Booking Confirmed!",
            "Confirmed " + rooms + " room(s)" + roomMsg + " at " + hotel.getHotelName() + " (" + hotel.getLocation() + "). Total: ₹" + price,
            "hotel"
        );

        return booking;
    }

    public java.util.List<Booking> getUserBookings(String userId) {
        Users user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));
        return user.getBookings() != null ? user.getBookings() : java.util.Collections.emptyList();
    }
}
