package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlightStatusServiceTest {

    @Mock
    private FlightStatusRepository flightStatusRepository;

    @InjectMocks
    private FlightStatusService flightStatusService;

    private FlightStatus flight1;
    private FlightStatus flight2;

    @BeforeEach
    void setUp() {
        flight1 = new FlightStatus("1", "AI-101", "Air India", "DEL", "BOM",
                "10:00", "12:00", "10:00", "12:00", "ON_TIME",
                "Operating on schedule", "Gate 4", "T3", 120);

        flight2 = new FlightStatus("2", "6E-202", "IndiGo", "BOM", "BLR",
                "14:00", "15:30", "14:30", "16:00", "DELAYED",
                "Weather delay", "Gate 12", "T1", 90);
    }

    @Test
    @DisplayName("GetAllFlights - Returns filtered flight list by query and status")
    void testGetAllFlights_Filtered() {
        when(flightStatusRepository.findAll()).thenReturn(Arrays.asList(flight1, flight2));

        List<FlightStatus> results = flightStatusService.getAllFlights("Air India", "ON_TIME");

        assertEquals(1, results.size());
        assertEquals("AI-101", results.get(0).getFlightNumber());
    }

    @Test
    @DisplayName("GetFlightByNumber - Returns Optional of FlightStatus when found")
    void testGetFlightByNumber_Found() {
        when(flightStatusRepository.findByFlightNumberIgnoreCase("AI-101")).thenReturn(Optional.of(flight1));

        Optional<FlightStatus> result = flightStatusService.getFlightByNumber("AI-101");

        assertTrue(result.isPresent());
        assertEquals("Air India", result.get().getAirline());
    }

    @Test
    @DisplayName("GetFlightByNumber - Returns empty Optional for null/blank flight number")
    void testGetFlightByNumber_Blank() {
        Optional<FlightStatus> result = flightStatusService.getFlightByNumber("  ");
        assertFalse(result.isPresent());
    }

    @Test
    @DisplayName("GetTrackedFlights - Returns list of tracked flights")
    void testGetTrackedFlights_Success() {
        when(flightStatusRepository.findByFlightNumberIn(Arrays.asList("AI-101", "6E-202")))
                .thenReturn(Arrays.asList(flight1, flight2));

        List<FlightStatus> tracked = flightStatusService.getTrackedFlights(Arrays.asList("AI-101", "6E-202"));

        assertEquals(2, tracked.size());
    }

    @Test
    @DisplayName("UpdateFlightStatus - Successfully updates status and fields")
    void testUpdateFlightStatus_Success() {
        when(flightStatusRepository.findByFlightNumberIgnoreCase("AI-101")).thenReturn(Optional.of(flight1));
        when(flightStatusRepository.save(any(FlightStatus.class))).thenAnswer(i -> i.getArgument(0));

        FlightStatus updated = flightStatusService.updateFlightStatus(
                "AI-101", "DELAYED", "Foggy conditions", "11:00", "13:00", "Gate 9", "T3", 150
        );

        assertNotNull(updated);
        assertEquals("DELAYED", updated.getStatus());
        assertEquals("Foggy conditions", updated.getDelayReason());
        assertEquals("Gate 9", updated.getGate());
        assertEquals(150, updated.getEstimatedArrivalMinutes());
    }

    @Test
    @DisplayName("TriggerRandomSimulation - Advances flight status state")
    void testTriggerRandomSimulation() {
        when(flightStatusRepository.findAll()).thenReturn(Collections.singletonList(flight1));
        when(flightStatusRepository.save(any(FlightStatus.class))).thenAnswer(i -> i.getArgument(0));

        FlightStatus result = flightStatusService.triggerRandomSimulation();

        assertNotNull(result);
        assertEquals("BOARDING", result.getStatus());
    }
}
