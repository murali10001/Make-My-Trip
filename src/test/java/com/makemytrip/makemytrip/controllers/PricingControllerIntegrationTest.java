package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.exceptions.PricingExceptionHandler;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.services.PricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PricingControllerIntegrationTest {

    private MockMvc mockMvc;
    private StubPricingService pricingService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        PricingController controller = new PricingController();
        pricingService = new StubPricingService();
        ReflectionTestUtils.setField(controller, "pricingService", pricingService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new PricingExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/pricing/calculate - Returns Dynamic Price Calculation")
    void testCalculateDynamicPriceEndpoint() throws Exception {
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
    @DisplayName("POST /api/pricing/freeze - Creates Price Freeze Lock with 201 Created")
    void testFreezePriceEndpoint() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("itemId", "FL-101");
        req.put("itemTitle", "Air India AI-101");
        req.put("currentPrice", 5500.0);
        req.put("hours", 24);

        mockMvc.perform(post("/api/pricing/freeze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.freezeId").value("FRZ-99999999"))
                .andExpect(jsonPath("$.frozenPrice").value(5500.0))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("GET /api/pricing/freeze/{freezeId} - Negative Test with Expired Freeze Token (410 GONE)")
    void testGetFreezeStatus_Expired_ReturnsErrorResponse() throws Exception {
        mockMvc.perform(get("/api/pricing/freeze/FRZ-EXPIRED"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.message").value("Price freeze has expired. Current market dynamic price applies."))
                .andExpect(jsonPath("$.status").value(410));
    }

    @Test
    @DisplayName("POST /api/pricing/apply-coupon - Negative Test with Invalid Coupon (400 BAD REQUEST)")
    void testApplyCoupon_Invalid_ReturnsErrorResponse() throws Exception {
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

    static class StubPricingService extends PricingService {
        @Override
        public DynamicPrice calculateDynamicPrice(String itemId, String itemType, double basePrice, String demandLevel, String seasonType) {
            return new DynamicPrice(
                    "FL-101", "FLIGHT", 5500.0, 7425.0, "HIGH", "HOLIDAY_PEAK",
                    35.0, 1.20, "Dynamic Market Pricing", null
            );
        }

        @Override
        public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours, String userId) {
            return new PriceFreeze(
                    "FRZ-99999999", "FL-101", "Air India AI-101", 5500.0, 6325.0,
                    LocalDateTime.now(), LocalDateTime.now().plusHours(24), 24, true, userId
            );
        }

        @Override
        public PriceFreeze getFreezeStatus(String freezeId) {
            if ("FRZ-EXPIRED".equalsIgnoreCase(freezeId)) {
                throw new PriceFreezeExpiredException("Price freeze has expired. Current market dynamic price applies.");
            }
            return new PriceFreeze("FRZ-1", "FL-101", "Test", 5000.0, 5750.0, LocalDateTime.now(), LocalDateTime.now().plusHours(24), 24, true);
        }

        @Override
        public Map<String, Object> applyCoupon(String code, double bookingAmount) {
            if ("INVALID_CODE".equalsIgnoreCase(code)) {
                throw new InvalidCouponException("Invalid promo coupon code: INVALID_CODE");
            }
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            return res;
        }
    }
}

