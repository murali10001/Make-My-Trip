package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeNotFoundException;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.OfferCoupon;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.OfferCouponRepository;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PricingService {

    @Autowired(required = false)
    private FlightRepository flightRepository;

    @Autowired(required = false)
    private HotelRepository hotelRepository;

    @Autowired
    private OfferCouponRepository offerCouponRepository;

    @Autowired
    private PriceFreezeRepository priceFreezeRepository;

    @Autowired
    private NotificationService notificationService;



    public DynamicPrice calculateDynamicPrice(String itemId, String itemType, double basePrice, String demandLevel, String seasonType) {
        if (itemId != null && !itemId.trim().isEmpty()) {
            if ("FLIGHT".equalsIgnoreCase(itemType) && flightRepository != null) {
                Optional<Flight> f = flightRepository.findById(itemId);
                if (f.isPresent() && f.get().getPrice() > 0) {
                    basePrice = f.get().getPrice();
                }
            } else if ("HOTEL".equalsIgnoreCase(itemType) && hotelRepository != null) {
                Optional<Hotel> h = hotelRepository.findById(itemId);
                if (h.isPresent() && h.get().getPricePerNight() > 0) {
                    basePrice = h.get().getPricePerNight();
                }
            }
        }
        if (basePrice <= 0) basePrice = 5000.0;
        if (demandLevel == null || demandLevel.trim().isEmpty()) demandLevel = "NORMAL";
        if (seasonType == null || seasonType.trim().isEmpty()) seasonType = "REGULAR";

        double demandPercentage = 0.0;
        if ("HIGH".equalsIgnoreCase(demandLevel)) {
            demandPercentage += 15.0;
        } else if ("MEDIUM".equalsIgnoreCase(demandLevel)) {
            demandPercentage += 5.0;
        }

        double seasonalMultiplier = 1.0;
        if ("HOLIDAY_PEAK".equalsIgnoreCase(seasonType)) {
            demandPercentage += 20.0;
            seasonalMultiplier = 1.20;
        } else if ("WEEKEND".equalsIgnoreCase(seasonType)) {
            demandPercentage += 10.0;
            seasonalMultiplier = 1.10;
        }

        double finalPrice = Math.round(basePrice * (1.0 + (demandPercentage / 100.0)));
        String reason = String.format("Dynamic Market Pricing: %s & %s Demand (+%.0f%% Adjustment)", seasonType.replace("_", " "), demandLevel, demandPercentage);

        List<Map<String, Object>> history = generatePriceHistory(basePrice, finalPrice);

        return new DynamicPrice(
                itemId,
                itemType,
                basePrice,
                finalPrice,
                demandLevel.toUpperCase(),
                seasonType.toUpperCase(),
                demandPercentage,
                seasonalMultiplier,
                reason,
                history
        );
    }

    private List<Map<String, Object>> generatePriceHistory(double basePrice, double currentPrice) {
        List<Map<String, Object>> history = new ArrayList<>();
        LocalDate today = LocalDate.now();

        double[] variance = {-0.10, -0.05, -0.02, 0.0, 0.03, 0.08, (currentPrice - basePrice) / (basePrice > 0 ? basePrice : 1.0)};
        for (int i = 6; i >= 0; i--) {
            Map<String, Object> point = new HashMap<>();
            LocalDate date = today.minusDays(i);
            double price = Math.round(basePrice * (1.0 + variance[6 - i]));
            point.put("date", date.toString());
            point.put("dayLabel", date.getDayOfWeek().name().substring(0, 3));
            point.put("price", price);
            point.put("isCurrent", i == 0);
            history.add(point);
        }
        return history;
    }

    public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours) {
        return freezePrice(itemId, itemTitle, currentPrice, durationHours, null);
    }

    public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours, String userId) {
        if (durationHours <= 0) durationHours = 24;
        String freezeId = "FRZ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(durationHours);

        PriceFreeze freeze = new PriceFreeze(
                freezeId,
                itemId,
                itemTitle,
                currentPrice,
                Math.round(currentPrice * 1.15),
                now,
                expiresAt,
                durationHours,
                true,
                userId
        );

        PriceFreeze saved = priceFreezeRepository.save(freeze);
        return saved;
    }

    public PriceFreeze getFreezeStatus(String freezeId) {
        Optional<PriceFreeze> optionalFreeze = priceFreezeRepository.findById(freezeId);
        if (!optionalFreeze.isPresent()) {
            throw new PriceFreezeNotFoundException("Price freeze session not found in database.");
        }
        PriceFreeze freeze = optionalFreeze.get();
        if (LocalDateTime.now().isAfter(freeze.getExpiresAt())) {
            freeze.setActive(false);
            priceFreezeRepository.save(freeze);
            throw new PriceFreezeExpiredException("Price freeze has expired. Current market dynamic price applies.");
        }
        return freeze;
    }

    public List<PriceFreeze> getUserFreezes(String userId) {
        if (userId == null || userId.trim().isEmpty() || "null".equalsIgnoreCase(userId)) {
            return Collections.emptyList();
        }
        return priceFreezeRepository.findByUserId(userId.trim());
    }

    public void deleteFreeze(String freezeId) {
        if (freezeId != null && !freezeId.trim().isEmpty()) {
            priceFreezeRepository.deleteById(freezeId.trim());
        }
    }

    public List<OfferCoupon> getAvailableOffers() {
        return offerCouponRepository.findAll();
    }


    public Map<String, Object> applyCoupon(String code, double bookingAmount) {
        if (code == null || code.trim().isEmpty()) {
            throw new InvalidCouponException("Coupon code cannot be empty.");
        }

        OfferCoupon coupon = offerCouponRepository.findByCode(code.trim())
                .orElseThrow(() -> new InvalidCouponException("Invalid promo coupon code: " + code));

        if (!coupon.isActive()) {
            throw new InvalidCouponException("This coupon code is no longer active.");
        }

        if (bookingAmount < coupon.getMinBookingAmount()) {
            throw new InvalidCouponException(String.format("Minimum booking amount for code %s is ₹%.0f", coupon.getCode(), coupon.getMinBookingAmount()));
        }

        double discount = (bookingAmount * coupon.getDiscountPercentage()) / 100.0;
        if (discount > coupon.getMaxDiscountAmount()) {
            discount = coupon.getMaxDiscountAmount();
        }
        discount = Math.round(discount);
        double finalAmount = bookingAmount - discount;

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("code", coupon.getCode());
        result.put("title", coupon.getTitle());
        result.put("badgeText", coupon.getBadgeText());
        result.put("originalAmount", bookingAmount);
        result.put("discountAmount", discount);
        result.put("finalAmount", finalAmount);
        result.put("message", String.format("Success! You saved ₹%.0f with coupon %s", discount, coupon.getCode()));
        return result;
    }
}
