package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.services.PricingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class PricingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PricingService pricingService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/pricing/calculate - Returns Dynamic Price Calculation")
    void testCalculateDynamicPriceEndpoint() throws Exception {
        DynamicPrice mockResponse = new DynamicPrice(
                "FL-101", "FLIGHT", 5500.0, 7425.0, "HIGH", "HOLIDAY_PEAK",
                35.0, 1.20, "Dynamic Market Pricing", null
        );

        when(pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 5500.0, "HIGH", "HOLIDAY_PEAK"))
                .thenReturn(mockResponse);

        mockMvc.perform(get("/api/pricing/calculate")
                        .param("itemId", "FL-101")
                        .param("itemType", "FLIGHT")
                        .param("basePrice", "5500.0")
                        .param("demand", "HIGH")
                        .param("season", "HOLIDAY_PEAK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemId").value("FL-101"))
                .andExpect(jsonPath("$.finalPrice").value(7425.0))
                .andExpect(jsonPath("$.demandLevel").value("HIGH"));
    }

    @Test
    @DisplayName("POST /api/pricing/freeze - Creates Price Freeze Lock")
    void testFreezePriceEndpoint() throws Exception {
        PriceFreeze mockFreeze = new PriceFreeze(
                "FRZ-99999999", "FL-101", "Air India AI-101", 5500.0, 6325.0,
                LocalDateTime.now(), LocalDateTime.now().plusHours(24), 24, true
        );

        when(pricingService.freezePrice(any(), any(), anyDouble(), anyLong(), any()))
                .thenReturn(mockFreeze);

        Map<String, Object> req = new HashMap<>();
        req.put("itemId", "FL-101");
        req.put("itemTitle", "Air India AI-101");
        req.put("currentPrice", 5500.0);
        req.put("hours", 24);

        mockMvc.perform(post("/api/pricing/freeze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.freezeId").value("FRZ-99999999"))
                .andExpect(jsonPath("$.frozenPrice").value(5500.0))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("GET /api/pricing/freeze/{freezeId} - Negative Test with Expired Freeze Token (410 GONE)")
    void testGetFreezeStatus_Expired_ReturnsErrorResponse() throws Exception {
        when(pricingService.getFreezeStatus("FRZ-EXPIRED"))
                .thenThrow(new PriceFreezeExpiredException("Price freeze has expired. Current market dynamic price applies."));

        mockMvc.perform(get("/api/pricing/freeze/FRZ-EXPIRED"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.message").value("Price freeze has expired. Current market dynamic price applies."))
                .andExpect(jsonPath("$.status").value(410));
    }

    @Test
    @DisplayName("POST /api/pricing/apply-coupon - Negative Test with Invalid Coupon (400 BAD REQUEST)")
    void testApplyCoupon_Invalid_ReturnsErrorResponse() throws Exception {
        when(pricingService.applyCoupon("INVALID_CODE", 5000.0))
                .thenThrow(new InvalidCouponException("Invalid promo coupon code: INVALID_CODE"));

        Map<String, Object> req = new HashMap<>();
        req.put("code", "INVALID_CODE");
        req.put("amount", 5000.0);

        mockMvc.perform(post("/api/pricing/apply-coupon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid promo coupon code: INVALID_CODE"))
                .andExpect(jsonPath("$.status").value(400));
    }
}
