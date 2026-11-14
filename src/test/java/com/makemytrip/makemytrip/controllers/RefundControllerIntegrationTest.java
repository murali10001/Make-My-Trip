package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.CancellationNotAllowedException;
import com.makemytrip.makemytrip.exceptions.RefundExceptionHandler;
import com.makemytrip.makemytrip.exceptions.RefundNotFoundException;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.services.RefundService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RefundControllerIntegrationTest {

    private MockMvc mockMvc;
    private StubRefundService refundService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        RefundController controller = new RefundController();
        refundService = new StubRefundService();
        ReflectionTestUtils.setField(controller, "refundService", refundService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new RefundExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /refund/calculate - Returns 200 with refund preview")
    void testCalculateRefundPreviewEndpoint() throws Exception {
        mockMvc.perform(get("/refund/calculate")
                        .param("userId", "USR-1")
                        .param("bookingId", "BK-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingId").value("BK-101"))
                .andExpect(jsonPath("$.refundPercentage").value(50.0))
                .andExpect(jsonPath("$.refundAmount").value(5000.0));
    }

    @Test
    @DisplayName("POST /refund/cancel-and-request - Returns 201 Created with RefundRequest")
    void testCancelBookingAndRequestRefundEndpoint() throws Exception {
        mockMvc.perform(post("/refund/cancel-and-request")
                        .param("userId", "USR-1")
                        .param("bookingId", "BK-101")
                        .param("reason", "Change of travel plans")
                        .param("comment", "Schedule clash"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.refundId").value("RF-12345"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("GET /refund/status/{refundId} - Returns Refund Status Details")
    void testGetRefundStatusEndpoint() throws Exception {
        mockMvc.perform(get("/refund/status/RF-999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refundId").value("RF-999"))
                .andExpect(jsonPath("$.status").value("PROCESSED"))
                .andExpect(jsonPath("$.currentStep").value(2));
    }

    @Test
    @DisplayName("POST /refund/cancel-and-request - When Already Cancelled Returns 400 Bad Request via ExceptionHandler")
    void testCancelBooking_AlreadyCancelled_Returns400() throws Exception {
        mockMvc.perform(post("/refund/cancel-and-request")
                        .param("userId", "USR-ALREADY-CANCELLED")
                        .param("bookingId", "BK-CANCELLED")
                        .param("reason", "Change of travel plans")
                        .param("comment", "Clash"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Booking 'BK-CANCELLED' has already been cancelled."));
    }

    static class StubRefundService extends RefundService {
        @Override
        public Map<String, Object> calculateRefundPreview(String userId, String bookingId) {
            Map<String, Object> preview = new HashMap<>();
            preview.put("bookingId", bookingId);
            preview.put("originalAmount", 10000.0);
            preview.put("refundPercentage", 50.0);
            preview.put("refundAmount", 5000.0);
            preview.put("policyApplied", "24-Hour Reservation Policy (50% Refund)");
            return preview;
        }

        @Override
        public RefundRequest processCancellationAndRequestRefund(String userId, String bookingId, String reason, String comment) {
            if ("BK-CANCELLED".equalsIgnoreCase(bookingId)) {
                throw new CancellationNotAllowedException("Booking 'BK-CANCELLED' has already been cancelled.");
            }
            RefundRequest mockRefund = new RefundRequest();
            mockRefund.setRefundId("RF-12345");
            mockRefund.setBookingId(bookingId);
            mockRefund.setStatus("PENDING");
            mockRefund.setRefundAmount(5000.0);
            return mockRefund;
        }

        @Override
        public RefundRequest getRefundByRefundId(String refundId) {
            if ("RF-INVALID".equalsIgnoreCase(refundId)) {
                throw new RefundNotFoundException("Refund request with ID 'RF-INVALID' not found");
            }
            RefundRequest mockRefund = new RefundRequest();
            mockRefund.setRefundId(refundId);
            mockRefund.setStatus("PROCESSED");
            mockRefund.setCurrentStep(2);
            return mockRefund;
        }
    }
}

