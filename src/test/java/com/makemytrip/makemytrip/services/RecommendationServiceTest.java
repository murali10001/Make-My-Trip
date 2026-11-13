package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.*;
import com.makemytrip.makemytrip.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

public class RecommendationServiceTest {

    private RecommendationService recommendationService;
    private StubRecommendationRepository recommendationRepository;
    private StubRecommendationFeedbackRepository feedbackRepository;
    private StubUserRepository userRepository;
    private StubUserPreferencesRepository preferencesRepository;
    private StubHotelRepository hotelRepository;
    private StubFlightRepository flightRepository;

    private Recommendation heritageRec;
    private Recommendation beachRec;

    @BeforeEach
    void setUp() {
        recommendationService = new RecommendationService();
        recommendationRepository = new StubRecommendationRepository();
        feedbackRepository = new StubRecommendationFeedbackRepository();
        userRepository = new StubUserRepository();
        preferencesRepository = new StubUserPreferencesRepository();
        hotelRepository = new StubHotelRepository();
        flightRepository = new StubFlightRepository();

        ReflectionTestUtils.setField(recommendationService, "recommendationRepository", recommendationRepository);
        ReflectionTestUtils.setField(recommendationService, "feedbackRepository", feedbackRepository);
        ReflectionTestUtils.setField(recommendationService, "userRepository", userRepository);
        ReflectionTestUtils.setField(recommendationService, "preferencesRepository", preferencesRepository);
        ReflectionTestUtils.setField(recommendationService, "hotelRepository", hotelRepository);
        ReflectionTestUtils.setField(recommendationService, "flightRepository", flightRepository);

        heritageRec = new Recommendation();
        heritageRec.setId("REC-1");
        heritageRec.setCategory("HERITAGE");
        heritageRec.setDestination("Jaipur");
        heritageRec.setTargetType("HOTEL");
        heritageRec.setPopularityScore(80);
        heritageRec.setActive(true);
        heritageRec.setTitle("The Grand Heritage Palace");
        recommendationRepository.save(heritageRec);

        beachRec = new Recommendation();
        beachRec.setId("REC-2");
        beachRec.setCategory("BEACH");
        beachRec.setDestination("Goa");
        beachRec.setTargetType("FLIGHT");
        beachRec.setPopularityScore(85);
        beachRec.setActive(true);
        beachRec.setTitle("Goa Sun & Surf Flight");
        recommendationRepository.save(beachRec);
    }

    @Test
    @DisplayName("Cold Start User - Transparent Trending Reason without Fabricated History")
    void testGetRecommendations_ColdStart_TransparentAndHonest() {
        // Cold start user with no bookings
        Users newUser = new Users();
        newUser.setId("USR-NEW");
        newUser.setBookings(new ArrayList<>());
        userRepository.save(newUser);

        List<Recommendation> recs = recommendationService.getRecommendations("USR-NEW", "ALL");

        assertNotNull(recs);
        assertFalse(recs.isEmpty());
        Recommendation first = recs.get(0);
        // Honest cold-start explanation must be present
        assertTrue(first.getReasonTitle().contains("Trending") || first.getReasonTitle().contains("Popular"));
        assertTrue(first.getReasonExplanation().toLowerCase().contains("trending") || first.getReasonExplanation().toLowerCase().contains("popular"));
    }

    @Test
    @DisplayName("History Matching - Resolves Past Hotel Booking Entity to Heritage Recommendation")
    void testGetRecommendations_ResolvesHotelEntityFromTargetId() {
        String hotelMongoId = "65a123f987bcda1";
        Users user = new Users();
        user.setId("USR-555");
        Users.Booking booking = new Users.Booking();
        booking.setBookingId("BK-1");
        booking.setType("Hotel");
        booking.setTargetId(hotelMongoId);
        booking.setTotalPrice(5000);
        user.setBookings(List.of(booking));
        userRepository.save(user);

        Hotel mockHotel = new Hotel();
        mockHotel.setId(hotelMongoId);
        mockHotel.setHotelName("Heritage Haveli");
        mockHotel.setLocation("Jaipur, Rajasthan");
        hotelRepository.save(mockHotel);

        List<Recommendation> recs = recommendationService.getRecommendations("USR-555", "HERITAGE");

        assertNotNull(recs);
        assertEquals(1, recs.size());
        Recommendation rec = recs.get(0);
        assertTrue(rec.getReasonTitle().toLowerCase().contains("heritage"));
        assertTrue(rec.getReasonBreakdown().stream().anyMatch(b -> b.contains("Jaipur")));
    }

    @Test
    @DisplayName("History Matching - Resolves Past Flight Booking Entity to Beach Recommendation")
    void testGetRecommendations_ResolvesFlightEntityFromTargetId() {
        String flightMongoId = "65b999faabbcc";
        Users user = new Users();
        user.setId("USR-666");
        Users.Booking booking = new Users.Booking();
        booking.setBookingId("BK-2");
        booking.setType("Flight");
        booking.setTargetId(flightMongoId);
        booking.setTotalPrice(4000);
        user.setBookings(List.of(booking));
        userRepository.save(user);

        Flight mockFlight = new Flight();
        mockFlight.setId(flightMongoId);
        mockFlight.setFlightName("Air India Express");
        mockFlight.setFrom("Delhi");
        mockFlight.setTo("Goa");
        flightRepository.save(mockFlight);

        List<Recommendation> recs = recommendationService.getRecommendations("USR-666", "BEACH");

        assertNotNull(recs);
        assertEquals(1, recs.size());
        Recommendation rec = recs.get(0);
        assertTrue(rec.getReasonTitle().toLowerCase().contains("beach") || rec.getReasonTitle().toLowerCase().contains("beaches"));
        assertTrue(rec.getReasonBreakdown().stream().anyMatch(b -> b.contains("Goa")));
    }

    @Test
    @DisplayName("Dynamic Collaborative Filtering - Calculates Peer Booking Patterns")
    void testCollaborativeFiltering_CalculatesPeerBookingOverlap() {
        Flight flightGoa = new Flight();
        flightGoa.setId("FL-GOA-1");
        flightGoa.setTo("Goa");
        flightRepository.save(flightGoa);

        // Create 2 peer users who booked Goa
        Users peer1 = new Users();
        peer1.setId("PEER-1");
        Users.Booking b1 = new Users.Booking();
        b1.setBookingId("PB-1");
        b1.setType("Flight");
        b1.setTargetId("FL-GOA-1");
        peer1.setBookings(List.of(b1));
        userRepository.save(peer1);

        Users peer2 = new Users();
        peer2.setId("PEER-2");
        Users.Booking b2 = new Users.Booking();
        b2.setBookingId("PB-2");
        b2.setType("Flight");
        b2.setTargetId("FL-GOA-1");
        peer2.setBookings(List.of(b2));
        userRepository.save(peer2);

        List<Recommendation> recs = recommendationService.getRecommendations(null, "ALL");
        Recommendation goaRec = recs.stream().filter(r -> "Goa".equalsIgnoreCase(r.getDestination())).findFirst().orElse(null);

        assertNotNull(goaRec);
        assertNotNull(goaRec.getCollaborativeFactor());
        assertTrue(goaRec.getCollaborativeFactor().contains("% of travelers with similar"));
    }

    @Test
    @DisplayName("Feedback Loop Refinement - Updates Category Affinities and Dismisses Irrelevant Recs")
    void testRecordFeedback_UpdatesAffinitiesAndDismissals() {
        // Submit helpful feedback
        Map<String, Object> respHelpful = recommendationService.recordFeedback("REC-1", "USR-FEEDBACK", "HELPFUL", "Great pick");
        assertEquals("SUCCESS", respHelpful.get("status"));
        assertEquals(1, respHelpful.get("helpfulCount"));

        UserPreferences prefs = preferencesRepository.findByUserId("USR-FEEDBACK").orElse(null);
        assertNotNull(prefs);
        assertEquals(1, prefs.getCategoryAffinities().get("HERITAGE"));
        assertTrue(prefs.getFavoredRecommendationIds().contains("REC-1"));

        // Submit irrelevant feedback for REC-2
        Map<String, Object> respIrrelevant = recommendationService.recordFeedback("REC-2", "USR-FEEDBACK", "IRRELEVANT", "Not interested");
        assertEquals("SUCCESS", respIrrelevant.get("status"));
        assertEquals(1, respIrrelevant.get("irrelevantCount"));

        UserPreferences updatedPrefs = preferencesRepository.findByUserId("USR-FEEDBACK").orElse(null);
        assertNotNull(updatedPrefs);
        assertEquals(-2, updatedPrefs.getCategoryAffinities().get("BEACH"));
        assertTrue(updatedPrefs.getDismissedRecommendationIds().contains("REC-2"));

        // When retrieving recs, dismissed REC-2 must be excluded
        List<Recommendation> activeRecs = recommendationService.getRecommendations("USR-FEEDBACK", "ALL");
        assertFalse(activeRecs.stream().anyMatch(r -> "REC-2".equals(r.getId())));
    }

    @Test
    @DisplayName("Real-Time SSE Subscription - Clean Lifecycle")
    void testSseSubscription() {
        SseEmitter emitter = recommendationService.subscribe("USR-SSE-1");
        assertNotNull(emitter);

        // Broadcasting does not throw
        assertDoesNotThrow(() -> recommendationService.recordFeedback("REC-1", "USR-SSE-1", "HELPFUL", ""));
    }

    // =========================================================================
    // IN-MEMORY STUB REPOSITORIES
    // =========================================================================

    public static class StubRecommendationRepository implements RecommendationRepository {
        private final Map<String, Recommendation> storage = new LinkedHashMap<>();

        @Override
        public List<Recommendation> findByActiveTrue() {
            return storage.values().stream().filter(Recommendation::isActive).collect(Collectors.toList());
        }

        @Override
        public List<Recommendation> findByCategoryAndActiveTrue(String category) {
            return storage.values().stream()
                    .filter(r -> r.isActive() && category.equalsIgnoreCase(r.getCategory()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Recommendation> findByTargetTypeAndActiveTrue(String targetType) {
            return storage.values().stream()
                    .filter(r -> r.isActive() && targetType.equalsIgnoreCase(r.getTargetType()))
                    .collect(Collectors.toList());
        }

        @Override
        public Optional<Recommendation> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public <S extends Recommendation> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public <S extends Recommendation> List<S> saveAll(Iterable<S> entities) {
            List<S> list = new ArrayList<>();
            for (S e : entities) {
                list.add(save(e));
            }
            return list;
        }

        @Override
        public List<Recommendation> findAll() {
            return new ArrayList<>(storage.values());
        }

        @Override
        public void deleteAll() {
            storage.clear();
        }

        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Recommendation entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Recommendation> entities) {}
        @Override public List<Recommendation> findAll(Sort sort) { return new ArrayList<>(storage.values()); }
        @Override public Page<Recommendation> findAll(Pageable pageable) { return null; }
        @Override public <S extends Recommendation> S insert(S entity) { return save(entity); }
        @Override public <S extends Recommendation> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Recommendation> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Recommendation> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Recommendation> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Recommendation> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Recommendation> long count(Example<S> example) { return 0; }
        @Override public <S extends Recommendation> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Recommendation, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Recommendation> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
    }

    public static class StubRecommendationFeedbackRepository implements RecommendationFeedbackRepository {
        private final Map<String, RecommendationFeedback> storage = new LinkedHashMap<>();

        @Override
        public List<RecommendationFeedback> findByUserId(String userId) {
            return storage.values().stream().filter(f -> userId.equals(f.getUserId())).collect(Collectors.toList());
        }

        @Override
        public List<RecommendationFeedback> findByRecommendationId(String recommendationId) {
            return storage.values().stream().filter(f -> recommendationId.equals(f.getRecommendationId())).collect(Collectors.toList());
        }

        @Override
        public Optional<RecommendationFeedback> findByUserIdAndRecommendationId(String userId, String recommendationId) {
            return storage.values().stream()
                    .filter(f -> userId.equals(f.getUserId()) && recommendationId.equals(f.getRecommendationId()))
                    .findFirst();
        }

        @Override
        public <S extends RecommendationFeedback> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public Optional<RecommendationFeedback> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<RecommendationFeedback> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<RecommendationFeedback> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(RecommendationFeedback entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends RecommendationFeedback> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public <S extends RecommendationFeedback> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<RecommendationFeedback> findAll(Sort sort) { return Collections.emptyList(); }
        @Override public Page<RecommendationFeedback> findAll(Pageable pageable) { return null; }
        @Override public <S extends RecommendationFeedback> S insert(S entity) { return save(entity); }
        @Override public <S extends RecommendationFeedback> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends RecommendationFeedback> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends RecommendationFeedback> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends RecommendationFeedback> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends RecommendationFeedback> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends RecommendationFeedback> long count(Example<S> example) { return 0; }
        @Override public <S extends RecommendationFeedback> boolean exists(Example<S> example) { return false; }
        @Override public <S extends RecommendationFeedback, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubUserRepository implements UserRepository {
        private final Map<String, Users> storage = new LinkedHashMap<>();

        @Override
        public Optional<Users> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<Users> findAll() {
            return new ArrayList<>(storage.values());
        }

        @Override
        public <S extends Users> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public Users findByEmail(String email) {
            return storage.values().stream().filter(u -> email != null && email.equalsIgnoreCase(u.getEmail())).findFirst().orElse(null);
        }

        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<Users> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Users entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Users> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public <S extends Users> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Users> findAll(Sort sort) { return Collections.emptyList(); }
        @Override public Page<Users> findAll(Pageable pageable) { return null; }
        @Override public <S extends Users> S insert(S entity) { return save(entity); }
        @Override public <S extends Users> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Users> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Users> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Users> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Users> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Users> long count(Example<S> example) { return 0; }
        @Override public <S extends Users> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Users, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubUserPreferencesRepository implements UserPreferencesRepository {
        private final Map<String, UserPreferences> storage = new LinkedHashMap<>();

        @Override
        public Optional<UserPreferences> findByUserId(String userId) {
            return storage.values().stream().filter(p -> userId.equals(p.getUserId())).findFirst();
        }

        @Override
        public <S extends UserPreferences> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public Optional<UserPreferences> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<UserPreferences> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<UserPreferences> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(UserPreferences entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends UserPreferences> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public <S extends UserPreferences> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<UserPreferences> findAll(Sort sort) { return Collections.emptyList(); }
        @Override public Page<UserPreferences> findAll(Pageable pageable) { return null; }
        @Override public <S extends UserPreferences> S insert(S entity) { return save(entity); }
        @Override public <S extends UserPreferences> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends UserPreferences> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends UserPreferences> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends UserPreferences> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends UserPreferences> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends UserPreferences> long count(Example<S> example) { return 0; }
        @Override public <S extends UserPreferences> boolean exists(Example<S> example) { return false; }
        @Override public <S extends UserPreferences, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubHotelRepository implements HotelRepository {
        private final Map<String, Hotel> storage = new LinkedHashMap<>();

        @Override
        public Optional<Hotel> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<Hotel> findByLocationContainingIgnoreCase(String location) {
            return storage.values().stream()
                    .filter(h -> h.getLocation() != null && h.getLocation().toLowerCase().contains(location.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Hotel> findByHotelNameContainingIgnoreCase(String name) {
            return storage.values().stream()
                    .filter(h -> h.getHotelName() != null && h.getHotelName().toLowerCase().contains(name.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public <S extends Hotel> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public List<Hotel> findAll() { return new ArrayList<>(storage.values()); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<Hotel> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Hotel entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Hotel> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public <S extends Hotel> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Hotel> findAll(Sort sort) { return Collections.emptyList(); }
        @Override public Page<Hotel> findAll(Pageable pageable) { return null; }
        @Override public <S extends Hotel> S insert(S entity) { return save(entity); }
        @Override public <S extends Hotel> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Hotel> long count(Example<S> example) { return 0; }
        @Override public <S extends Hotel> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Hotel, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubFlightRepository implements FlightRepository {
        private final Map<String, Flight> storage = new LinkedHashMap<>();

        @Override
        public Optional<Flight> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) {
            return storage.values().stream()
                    .filter(f -> f.getFrom() != null && f.getFrom().toLowerCase().contains(from.toLowerCase())
                            && f.getTo() != null && f.getTo().toLowerCase().contains(to.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Flight> findByFromContainingIgnoreCase(String from) {
            return storage.values().stream()
                    .filter(f -> f.getFrom() != null && f.getFrom().toLowerCase().contains(from.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Flight> findByToContainingIgnoreCase(String to) {
            return storage.values().stream()
                    .filter(f -> f.getTo() != null && f.getTo().toLowerCase().contains(to.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public <S extends Flight> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(UUID.randomUUID().toString());
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public List<Flight> findAll() { return new ArrayList<>(storage.values()); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Flight entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Flight> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Flight> findAll(Sort sort) { return Collections.emptyList(); }
        @Override public Page<Flight> findAll(Pageable pageable) { return null; }
        @Override public <S extends Flight> S insert(S entity) { return save(entity); }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }
}
