package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.FlightNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlightServiceTest {

    @Mock
    private FlightRepository flightRepository;

    @InjectMocks
    private FlightService flightService;

    private Flight flight;

    @BeforeEach
    void setUp() {
        flight = new Flight();
        flight.setId("FL-001");
        flight.setFlightName("Indigo 6E");
        flight.setFrom("BLR");
        flight.setTo("DEL");
        flight.setAvailableSeats(50);
        flight.setPrice(4500.0);
    }

    @Test
    @DisplayName("Get All Flights")
    void testGetAllFlights() {
        when(flightRepository.findAll()).thenReturn(Arrays.asList(flight));

        List<Flight> flights = flightService.getAllFlights();

        assertEquals(1, flights.size());
        assertEquals("FL-001", flights.get(0).getId());
    }

    @Test
    @DisplayName("Get Flight By ID - Existing")
    void testGetFlightById_Success() {
        when(flightRepository.findById("FL-001")).thenReturn(Optional.of(flight));

        Flight result = flightService.getFlightById("FL-001");

        assertNotNull(result);
        assertEquals("Indigo 6E", result.getFlightName());
    }

    @Test
    @DisplayName("Get Flight By ID - Throws FlightNotFoundException")
    void testGetFlightById_NotFound() {
        when(flightRepository.findById("FL-999")).thenReturn(Optional.empty());

        assertThrows(FlightNotFoundException.class, () -> flightService.getFlightById("FL-999"));
    }

    @Test
    @DisplayName("Add Flight")
    void testAddFlight() {
        when(flightRepository.save(any(Flight.class))).thenReturn(flight);

        Flight created = flightService.addFlight(flight);

        assertNotNull(created);
        assertEquals("FL-001", created.getId());
    }
}
