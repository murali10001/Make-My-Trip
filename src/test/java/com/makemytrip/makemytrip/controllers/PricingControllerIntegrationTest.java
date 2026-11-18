package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.exceptions.PricingExceptionHandler;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.services.PricingService;
import com.makemytrip.makemytrip.models.OfferCoupon;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.*;

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

    @Test
    @DisplayName("GET /api/pricing/calculate - Accepts hoursToDeparture and calculates surge")
    void testCalculateDynamicPriceEndpoint_WithHoursToDeparture() throws Exception {
        mockMvc.perform(get("/api/pricing/calculate")
                        .param("itemId", "FL-101")
                        .param("itemType", "FLIGHT")
                        .param("basePrice", "5500.0")
                        .param("demand", "HIGH")
                        .param("season", "HOLIDAY_PEAK")
                        .param("hoursToDeparture", "12.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemId").value("FL-101"))
                .andExpect(jsonPath("$.timeToDepartureMultiplier").value(1.25));
    }

    @Test
    @DisplayName("POST /api/pricing/freeze - Accepts 48 durationHours")
    void testFreezePriceEndpoint_With48HoursDuration() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("itemId", "FL-101");
        req.put("itemTitle", "Air India AI-101");
        req.put("currentPrice", 5500.0);
        req.put("durationHours", 48);

        mockMvc.perform(post("/api/pricing/freeze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.durationHours").value(48));
    }

    @Test
    @DisplayName("GET /api/pricing/competitor-comparison - Returns competitor benchmarks")
    void testCompetitorComparisonEndpoint() throws Exception {
        mockMvc.perform(get("/api/pricing/competitor-comparison")
                        .param("itemId", "FL-101")
                        .param("itemType", "FLIGHT")
                        .param("basePrice", "5500.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemId").value("FL-101"))
                .andExpect(jsonPath("$.competitorPrices").isMap())
                .andExpect(jsonPath("$.bestPriceGuaranteed").value(true));
    }

    @Test
    @DisplayName("GET /api/pricing/history/{itemId} - Returns price history list")
    void testGetPriceHistoryEndpoint() throws Exception {
        mockMvc.perform(get("/api/pricing/history/FL-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("GET /api/pricing/offers - Returns available coupons")
    void testGetAvailableOffersEndpoint() throws Exception {
        mockMvc.perform(get("/api/pricing/offers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("POST /api/pricing/apply-coupon - Successful coupon discount calculation")
    void testApplyCoupon_Success() throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("code", "MMTFLY");
        req.put("amount", 5000.0);

        mockMvc.perform(post("/api/pricing/apply-coupon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value("MMTFLY"))
                .andExpect(jsonPath("$.discountAmount").value(600.0));
    }

    @Test
    @DisplayName("GET /api/pricing/stream - Subscribes to SSE stream")
    void testSubscribeToPriceStream_SSE() throws Exception {
        mockMvc.perform(get("/api/pricing/stream"))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted());
    }

    @Test
    @DisplayName("POST /api/pricing/broadcast-update - Returns success response")
    void testBroadcastPriceUpdateEndpoint() throws Exception {
        Map<String, Object> payload = Map.of("type", "TEST_UPDATE", "price", 6000.0);

        mockMvc.perform(post("/api/pricing/broadcast-update")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    static class StubPricingService extends PricingService {
        @Override
        public DynamicPrice calculateDynamicPrice(String itemId, String itemType, double basePrice, String demandLevel, String seasonType) {
            return calculateDynamicPrice(itemId, itemType, basePrice, demandLevel, seasonType, null);
        }

        @Override
        public DynamicPrice calculateDynamicPrice(String itemId, String itemType, double basePrice, String demandLevel, String seasonType, Double hoursToDeparture) {
            double multiplier = (hoursToDeparture != null && hoursToDeparture < 24.0) ? 1.25 : 1.0;
            DynamicPrice p = new DynamicPrice(
                    "FL-101", "FLIGHT", 5500.0, 7425.0 * multiplier, "HIGH", "HOLIDAY_PEAK",
                    35.0, 1.20, "Dynamic Market Pricing", null
            );
            p.setTimeToDepartureMultiplier(multiplier);
            p.setHoursToDeparture(hoursToDeparture);
            return p;
        }

        @Override
        public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours, String userId) {
            return new PriceFreeze(
                    "FRZ-99999999", "FL-101", "Air India AI-101", 5500.0, 6325.0,
                    LocalDateTime.now(), LocalDateTime.now().plusHours(durationHours), durationHours, true, userId
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
            res.put("code", code);
            res.put("discountAmount", 600.0);
            res.put("finalAmount", bookingAmount - 600.0);
            return res;
        }

        @Override
        public Map<String, Object> getCompetitorComparison(String itemId, String itemType, double basePrice) {
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("itemId", itemId);
            res.put("itemType", itemType);
            res.put("ourPrice", basePrice);
            res.put("competitorPrices", Map.of("MakeMyTrip", basePrice, "EaseMyTrip", basePrice * 1.05));
            res.put("bestPriceGuaranteed", true);
            return res;
        }

        @Override
        public List<Map<String, Object>> getPriceHistory(String itemId, double basePrice) {
            return List.of(Map.of("day", "Mon", "price", basePrice));
        }

        @Override
        public List<OfferCoupon> getAvailableOffers() {
            return List.of(
                    new OfferCoupon("1", "MMTFLY", "MMT Special", "12% off", "MMT", "MMT", 12.0, 1500.0, 3000.0, "POPULAR", true),
                    new OfferCoupon("2", "HDFC10", "HDFC Deal", "10% off", "HDFC", "HDFC", 10.0, 2000.0, 4000.0, "BANK", true)
            );
        }

        @Override
        public SseEmitter registerSseClient() {
            return new SseEmitter(180_000L);
        }

        @Override
        public void broadcastPriceUpdate(Map<String, Object> updateData) {}
    }
}

