package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.services.FlightStatusService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class FlightStatusControllerIntegrationTest {

    private MockMvc mockMvc;
    private FlightStatusController controller;
    private StubFlightStatusService flightStatusService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        controller = new FlightStatusController();
        flightStatusService = new StubFlightStatusService();
        ReflectionTestUtils.setField(controller, "flightStatusService", flightStatusService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/flight-status - Returns 200 OK with list of all flight statuses")
    void testGetAllFlights_Endpoint() throws Exception {
        mockMvc.perform(get("/api/flight-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].flightNumber").value("AI-101"))
                .andExpect(jsonPath("$[1].flightNumber").value("6E-202"));
    }

    @Test
    @DisplayName("GET /api/flight-status with query & status filters")
    void testGetAllFlights_WithFilters() throws Exception {
        mockMvc.perform(get("/api/flight-status")
                        .param("query", "IndiGo")
                        .param("status", "DELAYED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].airline").value("IndiGo"))
                .andExpect(jsonPath("$[0].status").value("DELAYED"));
    }

    @Test
    @DisplayName("GET /api/flight-status/{flightNumber} - Found returns 200 OK")
    void testGetFlightByNumber_Found() throws Exception {
        mockMvc.perform(get("/api/flight-status/AI-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightNumber").value("AI-101"))
                .andExpect(jsonPath("$.airline").value("Air India"))
                .andExpect(jsonPath("$.status").value("ON_TIME"));
    }

    @Test
    @DisplayName("GET /api/flight-status/{flightNumber} - Non-existent returns 404 NOT FOUND")
    void testGetFlightByNumber_NotFound() throws Exception {
        mockMvc.perform(get("/api/flight-status/NON-EXISTENT-999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/flight-status/tracked - Returns tracked flights list")
    void testGetTrackedFlights_Success() throws Exception {
        List<String> flightNumbers = List.of("AI-101", "6E-202");

        mockMvc.perform(post("/api/flight-status/tracked")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flightNumbers)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("POST /api/flight-status/watchlist - Alias endpoint returns tracked flights list")
    void testGetWatchlistFlights_AliasEndpoint() throws Exception {
        List<String> flightNumbers = List.of("AI-101");

        mockMvc.perform(post("/api/flight-status/watchlist")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flightNumbers)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("GET /api/flight-status/user-tracked/{userId} - Returns user tracked flight numbers")
    void testGetUserTrackedFlights_Success() throws Exception {
        mockMvc.perform(get("/api/flight-status/user-tracked/USR-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("AI-101"));
    }

    @Test
    @DisplayName("GET /api/flight-status/watchlist/{userId} - Alias returns user tracked numbers")
    void testGetUserWatchlist_AliasEndpoint() throws Exception {
        mockMvc.perform(get("/api/flight-status/watchlist/USR-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("AI-101"));
    }

    @Test
    @DisplayName("POST /api/flight-status/user-tracked/{userId} - Successfully toggles tracked flight")
    void testToggleUserTrackedFlight_Success() throws Exception {
        Map<String, String> payload = Map.of("flightNumber", "6E-202");

        mockMvc.perform(post("/api/flight-status/user-tracked/USR-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.flightNumber").value("6E-202"));
    }

    @Test
    @DisplayName("POST /api/flight-status/user-tracked/{userId} - Empty payload returns 400 BAD REQUEST")
    void testToggleUserTrackedFlight_BadRequest() throws Exception {
        mockMvc.perform(post("/api/flight-status/user-tracked/USR-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("flightNumber is required"));
    }

    @Test
    @DisplayName("POST /api/flight-status/simulate - Specific flight update with CANCELLED status")
    void testSimulateUpdate_SpecificFlightCancellation() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("flightNumber", "AI-101");
        payload.put("status", "CANCELLED");
        payload.put("delayReason", "Air traffic congestion at departure runway");
        payload.put("estimatedArrivalMinutes", 0);

        mockMvc.perform(post("/api/flight-status/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightNumber").value("AI-101"))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.delayReason").value("Air traffic congestion at departure runway"))
                .andExpect(jsonPath("$.estimatedArrivalMinutes").value(0));
    }

    @Test
    @DisplayName("POST /api/flight-status/simulate - Random flight simulation when body is empty")
    void testSimulateUpdate_RandomFlight() throws Exception {
        mockMvc.perform(post("/api/flight-status/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/flight-status/simulate-random - Triggers random simulation")
    void testSimulateRandom_Endpoint() throws Exception {
        mockMvc.perform(get("/api/flight-status/simulate-random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/flight-status/validate-db - Returns synchronization summary")
    void testValidateAndSyncDatabase_Endpoint() throws Exception {
        mockMvc.perform(get("/api/flight-status/validate-db"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.totalFlights").value(2));
    }

    @Test
    @DisplayName("GET /api/flight-status/stream - SSE Emitter connects successfully")
    void testStreamFlightUpdates_SSE() throws Exception {
        mockMvc.perform(get("/api/flight-status/stream"))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted());
    }

    @Test
    @DisplayName("Keep-Alive Heartbeat - scheduled method runs without exception")
    void testKeepAliveHeartbeat_ScheduledExecution() {
        assertDoesNotThrow(() -> controller.sendHeartbeat());
    }

    static class StubFlightStatusService extends FlightStatusService {
        private final List<FlightStatus> flights = new ArrayList<>();

        public StubFlightStatusService() {
            flights.add(new FlightStatus("1", "AI-101", "Air India", "DEL", "BOM",
                    "10:00 AM", "12:00 PM", "10:00 AM", "12:00 PM", "ON_TIME",
                    "Operating on schedule", "Gate 4", "T3", 120));
            flights.add(new FlightStatus("2", "6E-202", "IndiGo", "BOM", "BLR",
                    "02:00 PM", "03:30 PM", "02:30 PM", "04:00 PM", "DELAYED",
                    "Weather delay", "Gate 12", "T1", 90));
        }

        @Override
        public List<FlightStatus> getAllFlights(String query, String status) {
            List<FlightStatus> result = new ArrayList<>();
            for (FlightStatus f : flights) {
                if (query != null && !f.getAirline().toLowerCase().contains(query.toLowerCase())
                        && !f.getFlightNumber().toLowerCase().contains(query.toLowerCase())) {
                    continue;
                }
                if (status != null && !f.getStatus().equalsIgnoreCase(status)) {
                    continue;
                }
                result.add(f);
            }
            return result;
        }

        @Override
        public Optional<FlightStatus> getFlightByNumber(String flightNumber) {
            return flights.stream().filter(f -> f.getFlightNumber().equalsIgnoreCase(flightNumber)).findFirst();
        }

        @Override
        public List<FlightStatus> getTrackedFlights(List<String> flightNumbers) {
            List<FlightStatus> result = new ArrayList<>();
            for (FlightStatus f : flights) {
                if (flightNumbers.contains(f.getFlightNumber())) result.add(f);
            }
            return result;
        }

        @Override
        public List<String> getUserTrackedFlightNumbers(String userId) {
            return List.of("AI-101");
        }

        @Override
        public List<String> toggleUserTrackFlight(String userId, String flightNumber) {
            return List.of("AI-101", flightNumber);
        }

        @Override
        public FlightStatus updateFlightStatus(String flightNumber, String status, String delayReason,
                                               String revisedDeparture, String revisedArrival,
                                               String gate, String terminal, Integer estMins) {
            Optional<FlightStatus> fOpt = getFlightByNumber(flightNumber);
            if (!fOpt.isPresent()) return null;
            FlightStatus f = fOpt.get();
            if (status != null) f.setStatus(status);
            if (delayReason != null) f.setDelayReason(delayReason);
            if (estMins != null) f.setEstimatedArrivalMinutes(estMins);
            return f;
        }

        @Override
        public FlightStatus triggerRandomSimulation() {
            FlightStatus f = flights.get(0);
            f.setStatus("DELAYED");
            f.setDelayReason("Air traffic delay");
            return f;
        }

        @Override
        public List<FlightStatus> validateAndSyncChangedFlights() {
            return flights;
        }
    }
}
