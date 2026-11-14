package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.exceptions.BookingExceptionHandler;
import com.makemytrip.makemytrip.exceptions.InsufficientCapacityException;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BookingControllerIntegrationTest {

    private MockMvc mockMvc;
    private StubBookingService bookingService;

    @BeforeEach
    void setUp() {
        BookingController controller = new BookingController();
        bookingService = new StubBookingService();
        ReflectionTestUtils.setField(controller, "bookingService", bookingService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new BookingExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /booking/flight - Successful Flight Seat Reservation")
    void testBookFlight_Success() throws Exception {
        Users.Booking mockBooking = new Users.Booking();
        mockBooking.setType("Flight");
        mockBooking.setBookingId("FL-101");
        mockBooking.setQuantity(2);
        mockBooking.setTotalPrice(11000.0);
        bookingService.setBookingToReturn(mockBooking);

        mockMvc.perform(post("/booking/flight")
                        .param("userId", "USR-001")
                        .param("flightId", "FL-101")
                        .param("seats", "2")
                        .param("price", "11000.0"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("Flight"))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.totalPrice").value(11000.0));
    }

    @Test
    @DisplayName("POST /booking/flight - Negative Test: Insufficient Seats (400 Bad Request)")
    void testBookFlight_InsufficientSeats_Returns400() throws Exception {
        bookingService.setExceptionToThrow(new InsufficientCapacityException("Not enough seats available. Requested: 50, Available: 5"));

        mockMvc.perform(post("/booking/flight")
                        .param("userId", "USR-001")
                        .param("flightId", "FL-101")
                        .param("seats", "50")
                        .param("price", "275000.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Not enough seats available. Requested: 50, Available: 5"))
                .andExpect(jsonPath("$.status").value(400));
    }

    static class StubBookingService extends BookingService {
        private Users.Booking bookingToReturn;
        private RuntimeException exceptionToThrow;

        public void setBookingToReturn(Users.Booking b) { this.bookingToReturn = b; this.exceptionToThrow = null; }
        public void setExceptionToThrow(RuntimeException e) { this.exceptionToThrow = e; }

        @Override
        public Users.Booking bookFlight(String userId, String flightId, int seats, double price, String freezeId, String seatNo, String seatTier, double seatAddon) {
            if (exceptionToThrow != null) throw exceptionToThrow;
            return bookingToReturn;
        }
    }
}
