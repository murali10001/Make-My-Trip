package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeNotFoundException;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.OfferCoupon;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.models.PriceHistory;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.OfferCouponRepository;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import com.makemytrip.makemytrip.repositories.PriceHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class PricingService {

    @Autowired(required = false)
    private FlightRepository flightRepository;

    @Autowired(required = false)
    private HotelRepository hotelRepository;

    @Autowired(required = false)
    private PriceHistoryRepository priceHistoryRepository;

    @Autowired
    private OfferCouponRepository offerCouponRepository;

    @Autowired
    private PriceFreezeRepository priceFreezeRepository;

    @Autowired(required = false)
    private NotificationService notificationService;

    private final CopyOnWriteArrayList<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public DynamicPrice calculateDynamicPrice(String itemId, String itemType, double basePrice, String demandLevel, String seasonType) {
        Flight resolvedFlight = null;
        Hotel resolvedHotel = null;

        if (itemId != null && !itemId.trim().isEmpty()) {
            if ("FLIGHT".equalsIgnoreCase(itemType) && flightRepository != null) {
                Optional<Flight> f = flightRepository.findById(itemId);
                if (f.isPresent()) {
                    resolvedFlight = f.get();
                    if (resolvedFlight.getPrice() > 0) {
                        basePrice = resolvedFlight.getPrice();
                    }
                }
            } else if ("HOTEL".equalsIgnoreCase(itemType) && hotelRepository != null) {
                Optional<Hotel> h = hotelRepository.findById(itemId);
                if (h.isPresent()) {
                    resolvedHotel = h.get();
                    if (resolvedHotel.getPricePerNight() > 0) {
                        basePrice = resolvedHotel.getPricePerNight();
                    }
                }
            }
        }

        if (basePrice <= 0) {
            basePrice = 5000.0;
        }

        if (demandLevel == null || demandLevel.trim().isEmpty() || "AUTO".equalsIgnoreCase(demandLevel)) {
            demandLevel = determineAutomaticDemand(resolvedFlight, resolvedHotel);
        } else {
            demandLevel = demandLevel.trim().toUpperCase();
        }

        if (seasonType == null || seasonType.trim().isEmpty() || "AUTO".equalsIgnoreCase(seasonType)) {
            seasonType = determineAutomaticSeason(resolvedFlight, resolvedHotel);
        } else {
            seasonType = seasonType.trim().toUpperCase();
        }

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
        String reason = String.format("Dynamic Market Pricing: %s & %s Demand (+%.0f%% Adjustment)",
                seasonType.replace("_", " "), demandLevel, demandPercentage);

        List<Map<String, Object>> history = getOrInitializePriceHistory(itemId, basePrice, finalPrice);

        return new DynamicPrice(
                itemId,
                itemType,
                basePrice,
                finalPrice,
                demandLevel,
                seasonType,
                demandPercentage,
                seasonalMultiplier,
                reason,
                history
        );
    }

    private String determineAutomaticDemand(Flight flight, Hotel hotel) {
        if (flight != null) {
            int seats = flight.getAvailableSeats();
            if (seats <= 25) return "HIGH";
            if (seats <= 70) return "MEDIUM";
            return "NORMAL";
        }
        if (hotel != null) {
            int rooms = hotel.getAvailableRooms();
            if (rooms <= 5) return "HIGH";
            if (rooms <= 15) return "MEDIUM";
            return "NORMAL";
        }
        return "NORMAL";
    }

    private String determineAutomaticSeason(Flight flight, Hotel hotel) {
        LocalDate travelDate = LocalDate.now();
        DayOfWeek dow = travelDate.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return "WEEKEND";
        }

        Month m = travelDate.getMonth();
        int day = travelDate.getDayOfMonth();

        if (m == Month.OCTOBER || m == Month.NOVEMBER) {
            return "HOLIDAY_PEAK";
        }
        if (m == Month.DECEMBER && day >= 20) {
            return "HOLIDAY_PEAK";
        }
        if (m == Month.JANUARY && day <= 5) {
            return "HOLIDAY_PEAK";
        }
        if (m == Month.MAY || m == Month.JUNE) {
            return "HOLIDAY_PEAK";
        }

        return "REGULAR";
    }

    public List<Map<String, Object>> getPriceHistory(String itemId, double basePrice) {
        if (basePrice <= 0) basePrice = 5500.0;
        return getOrInitializePriceHistory(itemId, basePrice, basePrice * 1.20);
    }

    private List<Map<String, Object>> getOrInitializePriceHistory(String itemId, double basePrice, double currentPrice) {
        String resolvedId = (itemId != null && !itemId.trim().isEmpty()) ? itemId.trim() : "FL-101";

        List<PriceHistory> existing = (priceHistoryRepository != null)
                ? priceHistoryRepository.findByItemIdOrderByRecordedAtDesc(resolvedId)
                : Collections.emptyList();

        if (existing.size() < 7 && priceHistoryRepository != null) {
            LocalDate today = LocalDate.now();
            double[] varianceRatios = {-0.10, -0.05, -0.02, 0.0, 0.03, 0.08, (currentPrice - basePrice) / (basePrice > 0 ? basePrice : 1.0)};

            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                double price = Math.round(basePrice * (1.0 + varianceRatios[6 - i]));
                String dayLabel = date.getDayOfWeek().name().substring(0, 3);
                LocalDateTime recordedAt = date.atTime(12, 0);
                boolean isCurrent = (i == 0);

                String recordId = "PRH-" + resolvedId + "-" + date.toString();
                PriceHistory ph = new PriceHistory(
                        recordId,
                        resolvedId,
                        resolvedId.startsWith("HT") ? "HOTEL" : "FLIGHT",
                        price,
                        i <= 1 ? "HIGH" : (i <= 3 ? "MEDIUM" : "NORMAL"),
                        (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) ? "WEEKEND" : "REGULAR",
                        recordedAt,
                        dayLabel,
                        isCurrent
                );
                priceHistoryRepository.save(ph);
            }
            existing = priceHistoryRepository.findByItemIdOrderByRecordedAtDesc(resolvedId);
        }

        List<PriceHistory> chronological = new ArrayList<>(existing);
        chronological.sort(Comparator.comparing(PriceHistory::getRecordedAt));

        List<Map<String, Object>> result = new ArrayList<>();
        int startIndex = Math.max(0, chronological.size() - 7);
        for (int i = startIndex; i < chronological.size(); i++) {
            PriceHistory ph = chronological.get(i);
            Map<String, Object> point = new HashMap<>();
            point.put("date", ph.getRecordedAt().toLocalDate().toString());
            point.put("dayLabel", ph.getDayLabel());
            point.put("price", ph.getPrice());
            point.put("isCurrent", (i == chronological.size() - 1));
            result.add(point);
        }
        return result;
    }

    public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours) {
        return freezePrice(itemId, itemTitle, currentPrice, durationHours, null);
    }

    public PriceFreeze freezePrice(String itemId, String itemTitle, double currentPrice, long durationHours, String userId) {
        if (durationHours <= 0) durationHours = 24;
        if (durationHours > 48) durationHours = 48;

        double authoritativePrice = currentPrice;
        if (itemId != null && !itemId.trim().isEmpty()) {
            String type = itemId.startsWith("HT") ? "HOTEL" : "FLIGHT";
            DynamicPrice dynamic = calculateDynamicPrice(itemId, type, currentPrice, null, null);
            authoritativePrice = dynamic.getFinalPrice();
        }
        if (authoritativePrice <= 0) {
            authoritativePrice = (currentPrice > 0) ? currentPrice : 5500.0;
        }

        String freezeId = "FRZ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(durationHours);

        PriceFreeze freeze = new PriceFreeze(
                freezeId,
                itemId,
                itemTitle,
                authoritativePrice,
                Math.round(authoritativePrice * 1.15),
                now,
                expiresAt,
                durationHours,
                true,
                userId
        );

        PriceFreeze saved = priceFreezeRepository.save(freeze);

        if (userId != null && !userId.trim().isEmpty() && !"null".equalsIgnoreCase(userId) && notificationService != null) {
            try {
                notificationService.createNotification(
                        userId,
                        "Price Freeze Locked!",
                        "Locked rate of ₹" + authoritativePrice + " for " + itemTitle + " valid for " + durationHours + " hours.",
                        "flight"
                );
            } catch (Exception ignored) {}
        }

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

    public SseEmitter registerSseClient() {
        SseEmitter emitter = new SseEmitter(180_000L);
        sseEmitters.add(emitter);

        emitter.onCompletion(() -> sseEmitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            sseEmitters.remove(emitter);
        });
        emitter.onError((e) -> {
            emitter.complete();
            sseEmitters.remove(emitter);
        });

        try {
            Map<String, Object> welcome = new HashMap<>();
            welcome.put("type", "CONNECTED");
            welcome.put("message", "Connected to Real-Time Dynamic Pricing Engine stream.");
            welcome.put("timestamp", LocalDateTime.now().toString());
            emitter.send(SseEmitter.event().name("connection").data(welcome));
        } catch (IOException e) {
            sseEmitters.remove(emitter);
        }

        return emitter;
    }

    public void broadcastPriceUpdate(Map<String, Object> updateData) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("price-update").data(updateData));
            } catch (Exception ex) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

    @Scheduled(fixedRate = 10000)
    public void autoAdjustAndBroadcastLiveRates() {
        if (sseEmitters.isEmpty()) return;

        try {
            if (flightRepository != null) {
                List<Flight> flights = flightRepository.findAll();
                if (!flights.isEmpty()) {
                    Flight target = flights.get(new Random().nextInt(flights.size()));
                    DynamicPrice price = calculateDynamicPrice(target.getId(), "FLIGHT", target.getPrice(), null, null);

                    Map<String, Object> event = new HashMap<>();
                    event.put("type", "PRICE_UPDATE");
                    event.put("itemId", target.getId());
                    event.put("itemType", "FLIGHT");
                    event.put("title", target.getFlightName() + " (" + target.getFrom() + " to " + target.getTo() + ")");
                    event.put("basePrice", price.getBasePrice());
                    event.put("finalPrice", price.getFinalPrice());
                    event.put("demandLevel", price.getDemandLevel());
                    event.put("seasonType", price.getSeasonType());
                    event.put("surgePercentage", price.getDemandSurgePercentage());
                    event.put("surgeReason", price.getSurgeReason());
                    event.put("timestamp", LocalDateTime.now().toString());

                    broadcastPriceUpdate(event);
                }
            }
        } catch (Exception ignored) {}
    }

    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (sseEmitters.isEmpty()) return;
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("ping").data("heartbeat"));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }
}

