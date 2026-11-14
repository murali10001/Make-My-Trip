package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.ReviewExceptionHandler;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.services.ReviewService;
import com.makemytrip.makemytrip.services.ReviewServiceTest.StubFlightRepository;
import com.makemytrip.makemytrip.services.ReviewServiceTest.StubHotelRepository;
import com.makemytrip.makemytrip.services.ReviewServiceTest.StubReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ReviewControllerIntegrationTest {

    private MockMvc mockMvc;
    private ReviewService reviewService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        reviewService = new ReviewService();
        StubReviewRepository reviewRepo = new StubReviewRepository();
        StubHotelRepository hotelRepo = new StubHotelRepository();
        StubFlightRepository flightRepo = new StubFlightRepository();

        ReflectionTestUtils.setField(reviewService, "reviewRepository", reviewRepo);
        ReflectionTestUtils.setField(reviewService, "hotelRepository", hotelRepo);
        ReflectionTestUtils.setField(reviewService, "flightRepository", flightRepo);

        ReviewController controller = new ReviewController();
        ReflectionTestUtils.setField(controller, "reviewService", reviewService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ReviewExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/reviews - Returns 200 OK with ReviewSummaryDTO")
    void testGetReviewsEndpoint() throws Exception {
        mockMvc.perform(get("/api/reviews")
                        .param("targetId", "HT-101")
                        .param("targetType", "HOTEL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews").isArray())
                .andExpect(jsonPath("$.totalCount").isNumber())
                .andExpect(jsonPath("$.averageRating").isNumber());
    }

    @Test
    @DisplayName("POST /api/reviews - Valid Review returns 201 Created")
    void testCreateReviewSuccess() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setTargetType("HOTEL");
        r.setRating(5);
        r.setTitle("Seamless Luxury");
        r.setComment("Unbelievable hospitality and attention to detail.");
        r.setUserName("Rohit Sen");
        r.setPhotoUrls(Collections.singletonList("https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"));

        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(r)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.title").value("Seamless Luxury"));
    }

    @Test
    @DisplayName("POST /api/reviews - Invalid Rating (6) returns 400 Bad Request")
    void testCreateReviewInvalidRatingBadRequest() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(6);
        r.setTitle("Invalid");
        r.setComment("Invalid rating score");

        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(r)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rating must be between 1 and 5 stars."));
    }

    @Test
    @DisplayName("POST /api/reviews/{id}/reply - Returns 201 Created")
    void testAddReplyEndpoint() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(4);
        r.setTitle("Great Room");
        r.setComment("Comfortable bed.");
        Review created = reviewService.addReview(r);

        Review.ReviewReply reply = new Review.ReviewReply();
        reply.setUserId("mgr-1");
        reply.setUserName("General Manager");
        reply.setComment("Thank you Rohit, pleased to host you!");

        mockMvc.perform(post("/api/reviews/" + created.getId() + "/reply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.replies").isArray())
                .andExpect(jsonPath("$.replies[0].comment").value("Thank you Rohit, pleased to host you!"));
    }

    @Test
    @DisplayName("POST /api/reviews/{id}/helpful - Toggles Vote and Returns 200 OK")
    void testToggleHelpfulEndpoint() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(5);
        r.setTitle("Top Class");
        r.setComment("Worth every rupee.");
        Review created = reviewService.addReview(r);

        mockMvc.perform(post("/api/reviews/" + created.getId() + "/helpful")
                        .param("userId", "voter-abc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.helpfulCount").value(1));
    }

    @Test
    @DisplayName("POST /api/reviews/{id}/flag - Flags Review and Returns 200 OK")
    void testFlagReviewEndpoint() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(1);
        r.setTitle("Inappropriate Post");
        r.setComment("Abusive text");
        Review created = reviewService.addReview(r);

        mockMvc.perform(post("/api/reviews/" + created.getId() + "/flag")
                        .param("userId", "user-reporter")
                        .param("reason", "Harassment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flagged").value(true))
                .andExpect(jsonPath("$.flagReason").value("Harassment"));
    }

    @Test
    @DisplayName("GET /api/reviews/moderation/flagged and POST action - Workflow Verification")
    void testModerationEndpoints() throws Exception {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(1);
        r.setTitle("Bad Conduct");
        r.setComment("Misleading info");
        Review created = reviewService.addReview(r);
        reviewService.flagReview(created.getId(), "rep-1", "Misleading");

        mockMvc.perform(get("/api/reviews/moderation/flagged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(created.getId()));

        mockMvc.perform(post("/api/reviews/moderation/" + created.getId() + "/action")
                        .param("action", "DISMISS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.action").value("DISMISSED"));

        reviewService.flagReview(created.getId(), "rep-2", "Spam");
        mockMvc.perform(post("/api/reviews/moderation/" + created.getId() + "/action")
                        .param("action", "REMOVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("REMOVED"));
    }

    @Test
    @DisplayName("POST /api/reviews/upload - Multipart File Upload Returns 201 Created with URL")
    void testUploadPhotoEndpoint() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "file", "room.png", "image/png", "fake image binary data".getBytes()
        );

        mockMvc.perform(multipart("/api/reviews/upload").file(image))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.url").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/reviews/stream - SSE Stream Initiates with 200 OK")
    void testRealTimeSseStreamEndpoint() throws Exception {
        mockMvc.perform(get("/api/reviews/stream")
                        .param("targetId", "HT-101")
                        .param("targetType", "HOTEL"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.TEXT_EVENT_STREAM_VALUE));
    }
}

