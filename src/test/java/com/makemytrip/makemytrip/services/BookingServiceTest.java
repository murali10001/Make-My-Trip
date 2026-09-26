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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    private Users testUser;
    private Flight testFlight;
    private Hotel testHotel;

    @BeforeEach
    void setUp() {
        testUser = new Users();
        testUser.setId("USR-100");
        testUser.setEmail("user@example.com");
        testUser.setBookings(new ArrayList<>());

        testFlight = new Flight();
        testFlight.setId("FL-555");
        testFlight.setFlightName("Air India");
        testFlight.setFrom("Delhi");
        testFlight.setTo("Mumbai");
        testFlight.setAvailableSeats(10);
        testFlight.setPrice(5000.0);

        testHotel = new Hotel();
        testHotel.setId("HT-777");
        testHotel.setHotelName("Taj Mahal Palace");
        testHotel.setLocation("Mumbai");
        testHotel.setAvailableRooms(5);
        testHotel.setPricePerNight(12000.0);
    }

    @Test
    @DisplayName("Book Flight - Success")
    void testBookFlight_Success() {
        when(userRepository.findById("USR-100")).thenReturn(Optional.of(testUser));
        when(flightRepository.findById("FL-555")).thenReturn(Optional.of(testFlight));

        Booking booking = bookingService.bookFlight("USR-100", "FL-555", 2, 10000.0);

        assertNotNull(booking);
        assertEquals("Flight", booking.getType());
        assertEquals("FL-555", booking.getBookingId());
        assertEquals(2, booking.getQuantity());
        assertEquals(10000.0, booking.getTotalPrice());

        assertEquals(8, testFlight.getAvailableSeats()); // 10 - 2
        verify(flightRepository).save(testFlight);
        verify(userRepository).save(testUser);
        verify(notificationService).createNotification(eq("USR-100"), anyString(), anyString(), eq("flight"));
    }

    @Test
    @DisplayName("Book Flight - Insufficient Capacity Throws Exception")
    void testBookFlight_InsufficientCapacity() {
        when(userRepository.findById("USR-100")).thenReturn(Optional.of(testUser));
        when(flightRepository.findById("FL-555")).thenReturn(Optional.of(testFlight));

        assertThrows(InsufficientCapacityException.class, () ->
                bookingService.bookFlight("USR-100", "FL-555", 15, 75000.0) // requested 15, available 10
        );
    }

    @Test
    @DisplayName("Book Flight - User Not Found Throws Exception")
    void testBookFlight_UserNotFound() {
        when(userRepository.findById("INVALID-USR")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () ->
                bookingService.bookFlight("INVALID-USR", "FL-555", 1, 5000.0)
        );
    }

    @Test
    @DisplayName("Book Hotel - Success")
    void testBookHotel_Success() {
        when(userRepository.findById("USR-100")).thenReturn(Optional.of(testUser));
        when(hotelRepository.findById("HT-777")).thenReturn(Optional.of(testHotel));

        Booking booking = bookingService.bookhotel("USR-100", "HT-777", 3, 36000.0);

        assertNotNull(booking);
        assertEquals("Hotel", booking.getType());
        assertEquals("HT-777", booking.getBookingId());
        assertEquals(3, booking.getQuantity());
        assertEquals(36000.0, booking.getTotalPrice());

        assertEquals(2, testHotel.getAvailableRooms()); // 5 - 3
        verify(hotelRepository).save(testHotel);
        verify(userRepository).save(testUser);
        verify(notificationService).createNotification(eq("USR-100"), anyString(), anyString(), eq("hotel"));
    }

    @Test
    @DisplayName("Book Hotel - Insufficient Rooms Throws Exception")
    void testBookHotel_InsufficientRooms() {
        when(userRepository.findById("USR-100")).thenReturn(Optional.of(testUser));
        when(hotelRepository.findById("HT-777")).thenReturn(Optional.of(testHotel));

        assertThrows(InsufficientCapacityException.class, () ->
                bookingService.bookhotel("USR-100", "HT-777", 10, 120000.0)
        );
    }
}
