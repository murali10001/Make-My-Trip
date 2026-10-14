package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.CancellationNotAllowedException;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.services.RefundService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class RefundControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RefundService refundService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /refund/calculate - Returns 200 with refund preview")
    void testCalculateRefundPreviewEndpoint() throws Exception {
        Map<String, Object> preview = new HashMap<>();
        preview.put("bookingId", "BK-101");
        preview.put("originalAmount", 10000.0);
        preview.put("refundPercentage", 50.0);
        preview.put("refundAmount", 5000.0);
        preview.put("policyApplied", "24-Hour Reservation Policy (50% Refund)");

        when(refundService.calculateRefundPreview("USR-1", "BK-101")).thenReturn(preview);

        mockMvc.perform(get("/refund/calculate")
                        .param("userId", "USR-1")
                        .param("bookingId", "BK-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingId").value("BK-101"))
                .andExpect(jsonPath("$.refundPercentage").value(50.0))
                .andExpect(jsonPath("$.refundAmount").value(5000.0));
    }

    @Test
    @DisplayName("POST /refund/cancel-and-request - Returns 200 with RefundRequest")
    void testCancelBookingAndRequestRefundEndpoint() throws Exception {
        RefundRequest mockRefund = new RefundRequest();
        mockRefund.setRefundId("RF-12345");
        mockRefund.setBookingId("BK-101");
        mockRefund.setStatus("PENDING");
        mockRefund.setRefundAmount(5000.0);

        when(refundService.processCancellationAndRequestRefund("USR-1", "BK-101", "Change of travel plans", "Schedule clash"))
                .thenReturn(mockRefund);

        mockMvc.perform(post("/refund/cancel-and-request")
                        .param("userId", "USR-1")
                        .param("bookingId", "BK-101")
                        .param("reason", "Change of travel plans")
                        .param("comment", "Schedule clash"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refundId").value("RF-12345"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("GET /refund/status/{refundId} - Returns Refund Status Details")
    void testGetRefundStatusEndpoint() throws Exception {
        RefundRequest mockRefund = new RefundRequest();
        mockRefund.setRefundId("RF-999");
        mockRefund.setStatus("PROCESSED");
        mockRefund.setCurrentStep(2);

        when(refundService.getRefundByRefundId("RF-999")).thenReturn(mockRefund);

        mockMvc.perform(get("/refund/status/RF-999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refundId").value("RF-999"))
                .andExpect(jsonPath("$.status").value("PROCESSED"))
                .andExpect(jsonPath("$.currentStep").value(2));
    }

    @Test
    @DisplayName("POST /refund/cancel-and-request - When Already Cancelled Returns 400 Bad Request via ExceptionHandler")
    void testCancelBooking_AlreadyCancelled_Returns400() throws Exception {
        when(refundService.processCancellationAndRequestRefund(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new CancellationNotAllowedException("Booking is already cancelled."));

        mockMvc.perform(post("/refund/cancel-and-request")
                        .param("userId", "USR-1")
                        .param("bookingId", "BK-ALREADY-CANCELLED")
                        .param("reason", "Change of travel plans"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Booking is already cancelled."));
    }
}
