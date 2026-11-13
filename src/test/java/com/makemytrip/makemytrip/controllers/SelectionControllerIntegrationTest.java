package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.services.SelectionService;
import com.makemytrip.makemytrip.services.SelectionServiceTest.StubFlightRepository;
import com.makemytrip.makemytrip.services.SelectionServiceTest.StubHotelRepository;
import com.makemytrip.makemytrip.services.SelectionServiceTest.StubRoomTypeOptionRepository;
import com.makemytrip.makemytrip.services.SelectionServiceTest.StubSeatMapRepository;
import com.makemytrip.makemytrip.services.SelectionServiceTest.StubUserPreferencesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SelectionControllerIntegrationTest {

    private MockMvc mockMvc;
    private SelectionService selectionService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        selectionService = new SelectionService();
        StubSeatMapRepository seatRepo = new StubSeatMapRepository();
        StubRoomTypeOptionRepository roomRepo = new StubRoomTypeOptionRepository();
        StubUserPreferencesRepository prefRepo = new StubUserPreferencesRepository();
        StubFlightRepository flightRepo = new StubFlightRepository();
        StubHotelRepository hotelRepo = new StubHotelRepository();

        ReflectionTestUtils.setField(selectionService, "seatMapRepository", seatRepo);
        ReflectionTestUtils.setField(selectionService, "roomTypeOptionRepository", roomRepo);
        ReflectionTestUtils.setField(selectionService, "userPreferencesRepository", prefRepo);
        ReflectionTestUtils.setField(selectionService, "flightRepository", flightRepo);
        ReflectionTestUtils.setField(selectionService, "hotelRepository", hotelRepo);

        SelectionController controller = new SelectionController();
        ReflectionTestUtils.setField(controller, "selectionService", selectionService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/selection/seatmap/{flightId} - Returns 200 with SeatMap")
    void testGetSeatMapEndpoint() throws Exception {
        mockMvc.perform(get("/api/selection/seatmap/FL-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightId").value("FL-101"))
                .andExpect(jsonPath("$.seats").isArray());
    }

    @Test
    @DisplayName("POST /api/selection/reserve-seat - Returns 200 with updated seat status")
    void testReserveSeatEndpoint() throws Exception {
        mockMvc.perform(post("/api/selection/reserve-seat")
                        .param("flightId", "FL-101")
                        .param("seatNo", "1A")
                        .param("userId", "USR-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightId").value("FL-101"));
    }

    @Test
    @DisplayName("POST /api/selection/release-seat - Returns 200 with released seat")
    void testReleaseSeatEndpoint() throws Exception {
        selectionService.reserveSeat("FL-101", "2C", "USR-1");

        mockMvc.perform(post("/api/selection/release-seat")
                        .param("flightId", "FL-101")
                        .param("seatNo", "2C"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flightId").value("FL-101"));
    }

    @Test
    @DisplayName("GET /api/selection/hotel-rooms/{hotelId} - Returns 200 with RoomTypeOptions")
    void testGetHotelRoomOptionsEndpoint() throws Exception {
        mockMvc.perform(get("/api/selection/hotel-rooms/HT-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(4));
    }

    @Test
    @DisplayName("POST /api/selection/preferences - Returns 201 Created")
    void testSaveUserPreferencesEndpoint() throws Exception {
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId("USR-888");
        prefs.setPreferredSeatNo("4F");
        prefs.setPreferredRoomType("Deluxe Balcony Room");

        mockMvc.perform(post("/api/selection/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prefs)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value("USR-888"))
                .andExpect(jsonPath("$.preferredSeatNo").value("4F"));
    }

    @Test
    @DisplayName("GET /api/selection/preferences/{userId} - Returns 200 with clean unconfigured preferences")
    void testGetUserPreferencesEndpoint() throws Exception {
        mockMvc.perform(get("/api/selection/preferences/USR-999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("USR-999"));
    }

    @Test
    @DisplayName("GET /api/selection/featured-rooms - Returns 200 with 4 showcase rooms containing 3D configs")
    void testGetFeaturedShowcaseRoomsEndpoint() throws Exception {
        mockMvc.perform(get("/api/selection/featured-rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].room3dConfig").exists())
                .andExpect(jsonPath("$[0].room3dConfig.furniture").isArray())
                .andExpect(jsonPath("$[0].room3dConfig.hotspots").isArray());
    }

    @Test
    @DisplayName("GET /api/selection/stream - Returns 200 text/event-stream")
    void testStreamSelectionUpdatesEndpoint() throws Exception {
        mockMvc.perform(get("/api/selection/stream"))
                .andExpect(status().isOk());
    }
}
