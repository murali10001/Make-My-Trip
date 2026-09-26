package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.exceptions.InsufficientCapacityException;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class BookingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingService bookingService;

    @Test
    @DisplayName("POST /booking/flight - Successful Flight Seat Reservation")
    void testBookFlight_Success() throws Exception {
        Users.Booking mockBooking = new Users.Booking();
        mockBooking.setType("Flight");
        mockBooking.setBookingId("FL-101");
        mockBooking.setQuantity(2);
        mockBooking.setTotalPrice(11000.0);

        when(bookingService.bookFlight("USR-001", "FL-101", 2, 11000.0)).thenReturn(mockBooking);

        mockMvc.perform(post("/booking/flight")
                        .param("userId", "USR-001")
                        .param("flightId", "FL-101")
                        .param("seats", "2")
                        .param("price", "11000.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("Flight"))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.totalPrice").value(11000.0));
    }

    @Test
    @DisplayName("POST /booking/flight - Negative Test: Insufficient Seats (400 Bad Request)")
    void testBookFlight_InsufficientSeats_Returns400() throws Exception {
        when(bookingService.bookFlight("USR-001", "FL-101", 50, 275000.0))
                .thenThrow(new InsufficientCapacityException("Not enough seats available. Requested: 50, Available: 5"));

        mockMvc.perform(post("/booking/flight")
                        .param("userId", "USR-001")
                        .param("flightId", "FL-101")
                        .param("seats", "50")
                        .param("price", "275000.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Not enough seats available. Requested: 50, Available: 5"))
                .andExpect(jsonPath("$.status").value(400));
    }
}
