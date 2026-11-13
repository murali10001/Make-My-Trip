package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.RecommendationExceptionHandler;
import com.makemytrip.makemytrip.models.Recommendation;
import com.makemytrip.makemytrip.services.RecommendationService;
import com.makemytrip.makemytrip.services.RecommendationServiceTest.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class RecommendationControllerIntegrationTest {

    private MockMvc mockMvc;
    private RecommendationService recommendationService;
    private StubRecommendationRepository recommendationRepo;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        recommendationService = new RecommendationService();
        recommendationRepo = new StubRecommendationRepository();
        StubRecommendationFeedbackRepository feedbackRepo = new StubRecommendationFeedbackRepository();
        StubUserRepository userRepo = new StubUserRepository();
        StubUserPreferencesRepository preferencesRepo = new StubUserPreferencesRepository();
        StubHotelRepository hotelRepo = new StubHotelRepository();
        StubFlightRepository flightRepo = new StubFlightRepository();

        ReflectionTestUtils.setField(recommendationService, "recommendationRepository", recommendationRepo);
        ReflectionTestUtils.setField(recommendationService, "feedbackRepository", feedbackRepo);
        ReflectionTestUtils.setField(recommendationService, "userRepository", userRepo);
        ReflectionTestUtils.setField(recommendationService, "preferencesRepository", preferencesRepo);
        ReflectionTestUtils.setField(recommendationService, "hotelRepository", hotelRepo);
        ReflectionTestUtils.setField(recommendationService, "flightRepository", flightRepo);

        // Prepopulate sample recommendation
        Recommendation rec = new Recommendation();
        rec.setId("REC-100");
        rec.setTitle("Taj Lake Palace Experience");
        rec.setDestination("Udaipur");
        rec.setCategory("LUXURY");
        rec.setTargetType("HOTEL");
        rec.setPriceEstimate(12000.0);
        rec.setPopularityScore(90);
        rec.setActive(true);
        recommendationRepo.save(rec);

        RecommendationController controller = new RecommendationController();
        ReflectionTestUtils.setField(controller, "recommendationService", recommendationService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new RecommendationExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/recommendations - Returns 200 OK with List of Recommendations")
    void testGetRecommendationsEndpoint() throws Exception {
        mockMvc.perform(get("/api/recommendations")
                        .param("category", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("REC-100"))
                .andExpect(jsonPath("$[0].title").value("Taj Lake Palace Experience"));
    }

    @Test
    @DisplayName("GET /api/recommendations/{id} - Existing ID Returns 200 OK")
    void testGetRecommendationByIdSuccess() throws Exception {
        mockMvc.perform(get("/api/recommendations/REC-100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("REC-100"))
                .andExpect(jsonPath("$.destination").value("Udaipur"));
    }

    @Test
    @DisplayName("GET /api/recommendations/{id} - Non-existent ID Returns 404 Not Found")
    void testGetRecommendationByIdNotFound() throws Exception {
        mockMvc.perform(get("/api/recommendations/REC-NONEXISTENT"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/recommendations/{id}/feedback - Records Feedback and Returns 200 OK")
    void testSubmitFeedbackSuccess() throws Exception {
        Map<String, String> payload = Map.of(
                "userId", "user-test-1",
                "feedbackType", "HELPFUL",
                "notes", "Loved this recommendation"
        );

        mockMvc.perform(post("/api/recommendations/REC-100/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.helpfulCount").value(1));
    }

    @Test
    @DisplayName("POST /api/recommendations/seed - Syncs Catalog and Returns 200 OK")
    void testSeedCatalogEndpoint() throws Exception {
        mockMvc.perform(post("/api/recommendations/seed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("GET /api/recommendations/stream - Returns Real-Time SSE Stream with 200 OK")
    void testStreamRecommendations() throws Exception {
        mockMvc.perform(get("/api/recommendations/stream")
                        .param("userId", "user-test-sse"))
                .andExpect(status().isOk());
    }
}

