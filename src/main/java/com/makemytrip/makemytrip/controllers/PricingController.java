package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.OfferCoupon;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.services.PricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pricing")
@CrossOrigin(origins = "*")
public class PricingController {

    @Autowired
    private PricingService pricingService;

    @GetMapping("/calculate")
    public ResponseEntity<DynamicPrice> calculateDynamicPrice(
            @RequestParam(required = false, defaultValue = "FL-101") String itemId,
            @RequestParam(required = false, defaultValue = "FLIGHT") String itemType,
            @RequestParam(required = false, defaultValue = "5500.0") double basePrice,
            @RequestParam(required = false, defaultValue = "HIGH") String demand,
            @RequestParam(required = false, defaultValue = "HOLIDAY_PEAK") String season) {
        DynamicPrice price = pricingService.calculateDynamicPrice(itemId, itemType, basePrice, demand, season);
        return ResponseEntity.ok(price);
    }

    @PostMapping("/freeze")
    public ResponseEntity<PriceFreeze> freezePrice(@RequestBody Map<String, Object> request) {
        String itemId = (String) request.getOrDefault("itemId", "FL-101");
        String itemTitle = (String) request.getOrDefault("itemTitle", "Air India Flight AI-101");
        double currentPrice = Double.parseDouble(request.getOrDefault("currentPrice", 5500.0).toString());
        long hours = Long.parseLong(request.getOrDefault("hours", 24).toString());
        String userId = (String) request.get("userId");

        PriceFreeze freeze = pricingService.freezePrice(itemId, itemTitle, currentPrice, hours, userId);
        return ResponseEntity.ok(freeze);
    }

    @GetMapping("/freeze/{freezeId}")
    public ResponseEntity<PriceFreeze> getFreezeStatus(@PathVariable String freezeId) {
        PriceFreeze freeze = pricingService.getFreezeStatus(freezeId);
        return ResponseEntity.ok(freeze);
    }

    @DeleteMapping("/freeze/{freezeId}")
    public ResponseEntity<Map<String, String>> deleteFreeze(@PathVariable String freezeId) {
        pricingService.deleteFreeze(freezeId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Price freeze lock deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user-freezes")
    public ResponseEntity<List<PriceFreeze>> getUserFreezes(@RequestParam(required = false) String userId) {
        List<PriceFreeze> list = pricingService.getUserFreezes(userId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/offers")
    public ResponseEntity<List<OfferCoupon>> getAvailableOffers() {
        List<OfferCoupon> offers = pricingService.getAvailableOffers();
        return ResponseEntity.ok(offers);
    }

    @PostMapping("/apply-coupon")
    public ResponseEntity<Map<String, Object>> applyCoupon(@RequestBody Map<String, Object> request) {
        String code = (String) request.get("code");
        double amount = Double.parseDouble(request.getOrDefault("amount", 5500.0).toString());

        Map<String, Object> response = pricingService.applyCoupon(code, amount);
        return ResponseEntity.ok(response);
    }
}
