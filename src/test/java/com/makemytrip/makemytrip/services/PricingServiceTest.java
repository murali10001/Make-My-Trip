package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.OfferCoupon;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.models.PriceHistory;
import com.makemytrip.makemytrip.repositories.DynamicPriceRepository;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.OfferCouponRepository;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import com.makemytrip.makemytrip.repositories.PriceHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class PricingServiceTest {

    private PricingService pricingService;
    private StubFlightRepository flightRepository;
    private StubHotelRepository hotelRepository;
    private StubPriceHistoryRepository priceHistoryRepository;
    private StubPriceFreezeRepository priceFreezeRepository;
    private StubOfferCouponRepository offerCouponRepository;
    private StubDynamicPriceRepository dynamicPriceRepository;

    private Flight testFlight;
    private Hotel testHotel;
    private OfferCoupon testCoupon;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService();

        flightRepository = new StubFlightRepository();
        hotelRepository = new StubHotelRepository();
        priceHistoryRepository = new StubPriceHistoryRepository();
        priceFreezeRepository = new StubPriceFreezeRepository();
        offerCouponRepository = new StubOfferCouponRepository();
        dynamicPriceRepository = new StubDynamicPriceRepository();

        ReflectionTestUtils.setField(pricingService, "flightRepository", flightRepository);
        ReflectionTestUtils.setField(pricingService, "hotelRepository", hotelRepository);
        ReflectionTestUtils.setField(pricingService, "priceHistoryRepository", priceHistoryRepository);
        ReflectionTestUtils.setField(pricingService, "priceFreezeRepository", priceFreezeRepository);
        ReflectionTestUtils.setField(pricingService, "offerCouponRepository", offerCouponRepository);
        ReflectionTestUtils.setField(pricingService, "dynamicPriceRepository", dynamicPriceRepository);

        testFlight = new Flight();
        testFlight.setId("FL-101");
        testFlight.setFlightName("Air India Express");
        testFlight.setFrom("Delhi");
        testFlight.setTo("Mumbai");
        testFlight.setPrice(6000.0);
        testFlight.setAvailableSeats(20);
        flightRepository.save(testFlight);

        testHotel = new Hotel();
        testHotel.setId("HT-201");
        testHotel.setHotelName("Taj Mahal Palace");
        testHotel.setLocation("Mumbai");
        testHotel.setPricePerNight(4000.0);
        testHotel.setAvailableRooms(4);
        hotelRepository.save(testHotel);

        testCoupon = new OfferCoupon();
        testCoupon.setId("CP-001");
        testCoupon.setCode("WELCOME100");
        testCoupon.setTitle("Welcome Offer");
        testCoupon.setActive(true);
        testCoupon.setDiscountPercentage(15.0);
        testCoupon.setMinBookingAmount(2000.0);
        testCoupon.setMaxDiscountAmount(1000.0);
        testCoupon.setBadgeText("BESTSELLER");
        offerCouponRepository.save(testCoupon);
    }

    @Test
    @DisplayName("Calculate Dynamic Price for Flight with High Demand and Holiday Peak")
    void testCalculateDynamicPrice_Flight_HighDemand_HolidayPeak() {
        DynamicPrice result = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 0, "HIGH", "HOLIDAY_PEAK");

        assertNotNull(result);
        assertEquals("FL-101", result.getItemId());
        assertEquals("FLIGHT", result.getItemType());
        assertEquals(6000.0, result.getBasePrice());
        assertEquals("HIGH", result.getDemandLevel());
        assertEquals("HOLIDAY_PEAK", result.getSeasonType());

        assertEquals(8100.0, result.getFinalPrice());
        assertNotNull(result.getPriceHistory());
        assertFalse(result.getPriceHistory().isEmpty());
    }

    @Test
    @DisplayName("Automatic Demand and Season calculation from database inventory")
    void testCalculateDynamicPrice_AutomaticDemand() {

        DynamicPrice result = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, null, null);

        assertNotNull(result);
        assertEquals("HIGH", result.getDemandLevel());
        assertTrue(result.getFinalPrice() > 6000.0);
    }

    @Test
    @DisplayName("Calculate Dynamic Price with Null/Empty ItemId Fallback Base Price")
    void testCalculateDynamicPrice_FallbackBasePrice() {
        DynamicPrice result = pricingService.calculateDynamicPrice(null, "FLIGHT", -500, "NORMAL", "REGULAR");

        assertNotNull(result);
        assertEquals(5000.0, result.getBasePrice());
        assertEquals("NORMAL", result.getDemandLevel());
        assertEquals("REGULAR", result.getSeasonType());
        assertEquals(5000.0, result.getFinalPrice());
    }

    @Test
    @DisplayName("Price History is stored and queried from persistent MongoDB repository")
    void testGetPriceHistory_QueriesFromPersistentDatabase() {
        List<Map<String, Object>> history = pricingService.getPriceHistory("FL-101", 6000.0);

        assertNotNull(history);
        assertFalse(history.isEmpty());

        List<PriceHistory> inRepo = priceHistoryRepository.findByItemIdOrderByRecordedAtDesc("FL-101");
        assertFalse(inRepo.isEmpty());
    }

    @Test
    @DisplayName("Freeze Price successfully creates PriceFreeze token with authoritative price")
    void testFreezePrice_Success() {
        PriceFreeze freeze = pricingService.freezePrice("FL-101", "IndiGo 6E-202", 6000.0, 24, "USR-101");

        assertNotNull(freeze);
        assertTrue(freeze.getFreezeId().startsWith("FRZ-"));
        assertEquals("FL-101", freeze.getItemId());
        assertTrue(freeze.getFrozenPrice() >= 6000.0);
        assertTrue(freeze.getOriginalPrice() > freeze.getFrozenPrice());
        assertTrue(freeze.isActive());
        assertEquals(24, freeze.getDurationHours());
        assertEquals("USR-101", freeze.getUserId());
    }

    @Test
    @DisplayName("Freeze Price clamps duration hours to maximum 48 hours")
    void testFreezePrice_ClampsMaxDuration() {
        PriceFreeze freeze = pricingService.freezePrice("FL-101", "Air India", 5000.0, 100, "USR-101");
        assertEquals(48, freeze.getDurationHours());
    }

    @Test
    @DisplayName("Get Freeze Status - Active Freeze")
    void testGetFreezeStatus_Active() {
        PriceFreeze freeze = new PriceFreeze("FRZ-12345678", "FL-101", "Test Flight", 5000.0, 5750.0,
                LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(23), 24, true);
        priceFreezeRepository.save(freeze);

        PriceFreeze result = pricingService.getFreezeStatus("FRZ-12345678");
        assertNotNull(result);
        assertTrue(result.isActive());
    }

    @Test
    @DisplayName("Get Freeze Status - Expired Freeze throws PriceFreezeExpiredException")
    void testGetFreezeStatus_Expired() {
        PriceFreeze freeze = new PriceFreeze("FRZ-EXPIRED", "FL-101", "Test Flight", 5000.0, 5750.0,
                LocalDateTime.now().minusHours(25), LocalDateTime.now().minusHours(1), 24, true);
        priceFreezeRepository.save(freeze);

        PriceFreezeExpiredException exception = assertThrows(
                PriceFreezeExpiredException.class,
                () -> pricingService.getFreezeStatus("FRZ-EXPIRED")
        );

        assertTrue(exception.getMessage().contains("expired"));
        assertFalse(freeze.isActive());
    }

    @Test
    @DisplayName("Apply Coupon - Successful Discount Calculation with Max Cap")
    void testApplyCoupon_Success_Capped() {
        Map<String, Object> result = pricingService.applyCoupon("WELCOME100", 10000.0);

        assertEquals(true, result.get("success"));
        assertEquals("WELCOME100", result.get("code"));
        assertEquals(1000.0, result.get("discountAmount"));
        assertEquals(9000.0, result.get("finalAmount"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException on Inactive Coupon")
    void testApplyCoupon_InactiveCoupon() {
        testCoupon.setActive(false);
        offerCouponRepository.save(testCoupon);

        InvalidCouponException ex = assertThrows(
                InvalidCouponException.class,
                () -> pricingService.applyCoupon("WELCOME100", 5000.0)
        );
        assertTrue(ex.getMessage().contains("no longer active"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException when Amount is Below Minimum")
    void testApplyCoupon_BelowMinAmount() {
        InvalidCouponException ex = assertThrows(
                InvalidCouponException.class,
                () -> pricingService.applyCoupon("WELCOME100", 1000.0)
        );
        assertTrue(ex.getMessage().contains("Minimum booking amount"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException on Null or Blank Code")
    void testApplyCoupon_BlankCode() {
        assertThrows(InvalidCouponException.class, () -> pricingService.applyCoupon("   ", 5000.0));
    }

    @Test
    @DisplayName("TimeToDeparture Multipliers - Verifies surge multipliers across all urgency tiers")
    void testCalculateDynamicPrice_TimeToDepartureMultipliers() {
        // Base 6000, demand NORMAL (0%), season REGULAR (0%)
        // Tier 1: <24h -> 1.25x (6000 * 1.25 = 7500)
        DynamicPrice p24 = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "NORMAL", "REGULAR", 12.0);
        assertEquals(1.25, p24.getTimeToDepartureMultiplier());
        assertEquals(7500.0, p24.getFinalPrice());

        // Tier 2: 24-72h -> 1.15x (6000 * 1.15 = 6900)
        DynamicPrice p72 = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "NORMAL", "REGULAR", 48.0);
        assertEquals(1.15, p72.getTimeToDepartureMultiplier());
        assertEquals(6900.0, p72.getFinalPrice());

        // Tier 3: 3-7d (72-168h) -> 1.05x (6000 * 1.05 = 6300)
        DynamicPrice p168 = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "NORMAL", "REGULAR", 100.0);
        assertEquals(1.05, p168.getTimeToDepartureMultiplier());
        assertEquals(6300.0, p168.getFinalPrice());

        // Tier 4: >7d (>168h) -> 1.0x (6000 * 1.0 = 6000)
        DynamicPrice pFar = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "NORMAL", "REGULAR", 240.0);
        assertEquals(1.0, pFar.getTimeToDepartureMultiplier());
        assertEquals(6000.0, pFar.getFinalPrice());
    }

    @Test
    @DisplayName("Persistence - Verifies dynamic price entity is saved into DynamicPriceRepository")
    void testCalculateDynamicPrice_PersistsToDynamicPriceRepository() {
        int initialCount = dynamicPriceRepository.savedPrices.size();
        DynamicPrice price = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "HIGH", "HOLIDAY_PEAK", 10.0);

        assertNotNull(price);
        assertEquals(initialCount + 1, dynamicPriceRepository.savedPrices.size());

        DynamicPrice saved = dynamicPriceRepository.savedPrices.get(dynamicPriceRepository.savedPrices.size() - 1);
        assertEquals("FL-101", saved.getItemId());
        assertEquals(price.getFinalPrice(), saved.getCalculatedPrice());
        assertEquals(1.25, saved.getTimeToDepartureMultiplier());
        assertEquals(10.0, saved.getHoursToDeparture());
        assertNotNull(saved.getCompetitorPrices());
        assertNotNull(saved.getCalculatedAt());
    }

    @Test
    @DisplayName("Competitor Pricing Simulation - Benchmarks competitors within market bounds")
    void testCalculateDynamicPrice_CompetitorPricingSimulation() {
        DynamicPrice price = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 6000.0, "NORMAL", "REGULAR", null);

        Map<String, Double> comp = price.getCompetitorPrices();
        assertNotNull(comp);
        assertTrue(comp.containsKey("MakeMyTrip"));
        assertTrue(comp.containsKey("EaseMyTrip"));
        assertTrue(comp.containsKey("Yatra"));
        assertTrue(comp.containsKey("ClearTrip"));
        assertTrue(comp.containsKey("Goibibo"));

        assertEquals(price.getFinalPrice(), comp.get("MakeMyTrip"));
        assertTrue(comp.get("EaseMyTrip") > price.getFinalPrice());
        assertTrue(comp.get("Yatra") > price.getFinalPrice());
    }

    @Test
    @DisplayName("Price Freeze Toggles - Correctly supports 24h and 48h freeze duration")
    void testFreezePrice_24h_vs_48h_Toggles() {
        PriceFreeze freeze24 = pricingService.freezePrice("FL-101", "Flight AI-101", 6000.0, 24, "USR-101");
        assertEquals(24, freeze24.getDurationHours());
        assertTrue(freeze24.getExpiresAt().isAfter(LocalDateTime.now().plusHours(23)));

        PriceFreeze freeze48 = pricingService.freezePrice("FL-101", "Flight AI-101", 6000.0, 48, "USR-101");
        assertEquals(48, freeze48.getDurationHours());
        assertTrue(freeze48.getExpiresAt().isAfter(LocalDateTime.now().plusHours(47)));
    }

    @Test
    @DisplayName("Cold-Start Coupon Seeder - Populates active coupons if repository is empty")
    void testColdStartCouponSeeder() {
        offerCouponRepository.deleteAll();
        assertEquals(0, offerCouponRepository.count());

        List<OfferCoupon> seeded = pricingService.getAvailableOffers();

        assertNotNull(seeded);
        assertEquals(7, seeded.size());
        assertTrue(seeded.stream().anyMatch(c -> "NEWUSER".equals(c.getCode())));
        assertTrue(seeded.stream().anyMatch(c -> "MMTFLY".equals(c.getCode())));
        assertTrue(seeded.stream().anyMatch(c -> "HDFC10".equals(c.getCode())));
        assertTrue(seeded.stream().anyMatch(c -> "SBISAVE".equals(c.getCode())));
    }

    @Test
    @DisplayName("Competitor Comparison - Returns structured comparative benchmark")
    void testGetCompetitorComparison_ReturnsBreakdown() {
        Map<String, Object> comp = pricingService.getCompetitorComparison("FL-101", "FLIGHT", 6000.0);

        assertNotNull(comp);
        assertEquals("FL-101", comp.get("itemId"));
        assertEquals("FLIGHT", comp.get("itemType"));
        assertNotNull(comp.get("ourPrice"));
        assertNotNull(comp.get("competitorPrices"));
        assertTrue((Boolean) comp.get("bestPriceGuaranteed"));
    }

    @Test
    @DisplayName("Live Rate Broadcast - Handles both Flight and Hotel without error")
    void testRealTimePriceStream_HotelAndFlightBroadcast() {
        pricingService.registerSseClient();
        assertDoesNotThrow(() -> pricingService.autoAdjustAndBroadcastLiveRates());
    }

    static class StubFlightRepository implements FlightRepository {
        Map<String, Flight> db = new HashMap<>();

        @Override public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) { return Collections.emptyList(); }
        @Override public List<Flight> findByFromContainingIgnoreCase(String from) { return Collections.emptyList(); }
        @Override public List<Flight> findByToContainingIgnoreCase(String to) { return Collections.emptyList(); }

        @Override public <S extends Flight> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Flight> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<Flight> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(Flight entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends Flight> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends Flight> S insert(S entity) { return save(entity); }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Flight> findAll(Sort sort) { return findAll(); }
        @Override public Page<Flight> findAll(Pageable pageable) { return null; }
    }

    static class StubHotelRepository implements HotelRepository {
        Map<String, Hotel> db = new HashMap<>();

        @Override public List<Hotel> findByLocationContainingIgnoreCase(String location) { return Collections.emptyList(); }
        @Override public List<Hotel> findByHotelNameContainingIgnoreCase(String hotelName) { return Collections.emptyList(); }

        @Override public <S extends Hotel> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Hotel> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<Hotel> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(Hotel entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends Hotel> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Hotel> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends Hotel> S insert(S entity) { return save(entity); }
        @Override public <S extends Hotel> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Hotel> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Hotel> long count(Example<S> example) { return 0; }
        @Override public <S extends Hotel> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Hotel, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Hotel> findAll(Sort sort) { return findAll(); }
        @Override public Page<Hotel> findAll(Pageable pageable) { return null; }
    }

    static class StubPriceHistoryRepository implements PriceHistoryRepository {
        Map<String, PriceHistory> db = new HashMap<>();

        @Override public List<PriceHistory> findByItemIdOrderByRecordedAtDesc(String itemId) {
            List<PriceHistory> res = new ArrayList<>();
            for (PriceHistory ph : db.values()) {
                if (itemId != null && itemId.equalsIgnoreCase(ph.getItemId())) {
                    res.add(ph);
                }
            }
            res.sort((a, b) -> b.getRecordedAt().compareTo(a.getRecordedAt()));
            return res;
        }

        @Override public List<PriceHistory> findByItemIdAndItemTypeOrderByRecordedAtDesc(String itemId, String itemType) {
            List<PriceHistory> res = new ArrayList<>();
            for (PriceHistory ph : db.values()) {
                if (itemId != null && itemId.equalsIgnoreCase(ph.getItemId()) && itemType.equalsIgnoreCase(ph.getItemType())) {
                    res.add(ph);
                }
            }
            res.sort((a, b) -> b.getRecordedAt().compareTo(a.getRecordedAt()));
            return res;
        }

        @Override public void deleteByItemId(String itemId) {
            db.values().removeIf(ph -> itemId != null && itemId.equalsIgnoreCase(ph.getItemId()));
        }

        @Override public <S extends PriceHistory> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<PriceHistory> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<PriceHistory> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(PriceHistory entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends PriceHistory> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<PriceHistory> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends PriceHistory> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends PriceHistory> S insert(S entity) { return save(entity); }
        @Override public <S extends PriceHistory> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends PriceHistory> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends PriceHistory> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends PriceHistory> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends PriceHistory> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends PriceHistory> long count(Example<S> example) { return 0; }
        @Override public <S extends PriceHistory> boolean exists(Example<S> example) { return false; }
        @Override public <S extends PriceHistory, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<PriceHistory> findAll(Sort sort) { return findAll(); }
        @Override public Page<PriceHistory> findAll(Pageable pageable) { return null; }
    }

    static class StubPriceFreezeRepository implements PriceFreezeRepository {
        Map<String, PriceFreeze> db = new HashMap<>();

        @Override public List<PriceFreeze> findByUserId(String userId) {
            List<PriceFreeze> res = new ArrayList<>();
            for (PriceFreeze f : db.values()) {
                if (userId != null && userId.equalsIgnoreCase(f.getUserId())) {
                    res.add(f);
                }
            }
            return res;
        }

        @Override public <S extends PriceFreeze> S save(S entity) { db.put(entity.getFreezeId(), entity); return entity; }
        @Override public Optional<PriceFreeze> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<PriceFreeze> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(PriceFreeze entity) { db.remove(entity.getFreezeId()); }
        @Override public void deleteAll(Iterable<? extends PriceFreeze> entities) { entities.forEach(e -> db.remove(e.getFreezeId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<PriceFreeze> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends PriceFreeze> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends PriceFreeze> S insert(S entity) { return save(entity); }
        @Override public <S extends PriceFreeze> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends PriceFreeze> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends PriceFreeze> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends PriceFreeze> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends PriceFreeze> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends PriceFreeze> long count(Example<S> example) { return 0; }
        @Override public <S extends PriceFreeze> boolean exists(Example<S> example) { return false; }
        @Override public <S extends PriceFreeze, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<PriceFreeze> findAll(Sort sort) { return findAll(); }
        @Override public Page<PriceFreeze> findAll(Pageable pageable) { return null; }
    }

    static class StubOfferCouponRepository implements OfferCouponRepository {
        Map<String, OfferCoupon> db = new HashMap<>();

        @Override public Optional<OfferCoupon> findByCode(String code) {
            for (OfferCoupon c : db.values()) {
                if (code != null && code.equalsIgnoreCase(c.getCode())) {
                    return Optional.of(c);
                }
            }
            return Optional.empty();
        }

        @Override public Optional<OfferCoupon> findByCodeIgnoreCase(String code) {
            return findByCode(code);
        }

        @Override public <S extends OfferCoupon> S save(S entity) {
            String id = entity.getId() != null ? entity.getId() : "CP-" + UUID.randomUUID().toString().substring(0, 8);
            entity.setId(id);
            db.put(id, entity);
            return entity;
        }
        @Override public Optional<OfferCoupon> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<OfferCoupon> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(OfferCoupon entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends OfferCoupon> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<OfferCoupon> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends OfferCoupon> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends OfferCoupon> S insert(S entity) { return save(entity); }
        @Override public <S extends OfferCoupon> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends OfferCoupon> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends OfferCoupon> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends OfferCoupon> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends OfferCoupon> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends OfferCoupon> long count(Example<S> example) { return 0; }
        @Override public <S extends OfferCoupon> boolean exists(Example<S> example) { return false; }
        @Override public <S extends OfferCoupon, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<OfferCoupon> findAll(Sort sort) { return findAll(); }
        @Override public Page<OfferCoupon> findAll(Pageable pageable) { return null; }
    }

    static class StubDynamicPriceRepository implements DynamicPriceRepository {
        List<DynamicPrice> savedPrices = new ArrayList<>();

        @Override
        public List<DynamicPrice> findByItemId(String itemId) {
            List<DynamicPrice> res = new ArrayList<>();
            for (DynamicPrice p : savedPrices) {
                if (itemId != null && itemId.equals(p.getItemId())) res.add(p);
            }
            return res;
        }

        @Override
        public Optional<DynamicPrice> findTopByItemIdOrderByCalculatedAtDesc(String itemId) {
            return savedPrices.stream()
                    .filter(p -> itemId != null && itemId.equals(p.getItemId()))
                    .reduce((first, second) -> second);
        }

        @Override public <S extends DynamicPrice> S save(S entity) {
            savedPrices.add(entity);
            return entity;
        }

        @Override public List<DynamicPrice> findAll() { return new ArrayList<>(savedPrices); }
        @Override public Optional<DynamicPrice> findById(String s) { return Optional.empty(); }
        @Override public boolean existsById(String s) { return false; }
        @Override public long count() { return savedPrices.size(); }
        @Override public void deleteById(String s) {}
        @Override public void delete(DynamicPrice entity) { savedPrices.remove(entity); }
        @Override public void deleteAllById(Iterable<? extends String> ids) {}
        @Override public void deleteAll(Iterable<? extends DynamicPrice> entities) {}
        @Override public void deleteAll() { savedPrices.clear(); }
        @Override public <S extends DynamicPrice> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return (List<S>) entities; }
        @Override public List<DynamicPrice> findAllById(Iterable<String> ids) { return Collections.emptyList(); }
        @Override public <S extends DynamicPrice> S insert(S entity) { return save(entity); }
        @Override public <S extends DynamicPrice> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends DynamicPrice> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends DynamicPrice> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends DynamicPrice> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends DynamicPrice> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends DynamicPrice> long count(Example<S> example) { return 0; }
        @Override public <S extends DynamicPrice> boolean exists(Example<S> example) { return false; }
        @Override public <S extends DynamicPrice, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<DynamicPrice> findAll(Sort sort) { return findAll(); }
        @Override public Page<DynamicPrice> findAll(Pageable pageable) { return null; }
    }
}

