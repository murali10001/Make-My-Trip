package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidReviewException;
import com.makemytrip.makemytrip.exceptions.ReviewNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.ReviewSummaryDTO;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

public class ReviewServiceTest {

    private ReviewService reviewService;
    private StubReviewRepository reviewRepository;
    private StubHotelRepository hotelRepository;
    private StubFlightRepository flightRepository;

    @BeforeEach
    void setUp() {
        reviewService = new ReviewService();
        reviewRepository = new StubReviewRepository();
        hotelRepository = new StubHotelRepository();
        flightRepository = new StubFlightRepository();

        ReflectionTestUtils.setField(reviewService, "reviewRepository", reviewRepository);
        ReflectionTestUtils.setField(reviewService, "hotelRepository", hotelRepository);
        ReflectionTestUtils.setField(reviewService, "flightRepository", flightRepository);

        // Prepopulate a sample Hotel
        Hotel hotel = new Hotel();
        hotel.setId("HT-101");
        hotel.setHotelName("The Grand Palace Hotel");
        hotel.setRating(4.0);
        hotel.setReviewsCount(0);
        hotelRepository.save(hotel);

        // Prepopulate a sample Flight
        Flight flight = new Flight();
        flight.setId("FL-202");
        flight.setFlightName("IndiGo 6E-202");
        flight.setRating(4.0);
        flight.setReviewsCount(0);
        flightRepository.save(flight);
    }

    @Test
    @DisplayName("addReview - Valid Review Persists and Syncs Hotel Aggregate Metrics")
    void testAddReviewSuccess() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setTargetType("HOTEL");
        r.setRating(5);
        r.setTitle("Magnificent experience");
        r.setComment("Exquisite rooms, exceptional breakfast, and world-class service.");
        r.setUserName("Aarav Mehta");
        r.setPhotoUrls(Arrays.asList("https://images.unsplash.com/photo-1566073771259-6a8506099945"));

        Review saved = reviewService.addReview(r);

        assertNotNull(saved.getId());
        assertEquals("HT-101", saved.getTargetId());
        assertEquals(5, saved.getRating());
        assertEquals(0, saved.getHelpfulCount());
        assertFalse(saved.isFlagged());
        assertEquals(1, saved.getPhotoUrls().size());

        // Verify Hotel metrics synchronized
        Hotel hotel = hotelRepository.findById("HT-101").orElse(null);
        assertNotNull(hotel);
        assertEquals(1, hotel.getReviewsCount());
        assertEquals(5.0, hotel.getReviewsRating());
        assertEquals("Excellent", hotel.getReviewsText());
    }

    @Test
    @DisplayName("addReview - Invalid Ratings (0 or 6) Throw InvalidReviewException")
    void testAddReviewInvalidRatings() {
        Review rLow = new Review();
        rLow.setTargetId("HT-101");
        rLow.setRating(0);
        rLow.setTitle("Too low");
        rLow.setComment("Testing 0 rating");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(rLow));

        Review rHigh = new Review();
        rHigh.setTargetId("HT-101");
        rHigh.setRating(6);
        rHigh.setTitle("Too high");
        rHigh.setComment("Testing 6 rating");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(rHigh));
    }

    @Test
    @DisplayName("addReview - Blank or Overlong Title Throws InvalidReviewException")
    void testAddReviewTitleValidations() {
        Review emptyTitle = new Review();
        emptyTitle.setTargetId("HT-101");
        emptyTitle.setRating(4);
        emptyTitle.setTitle("   ");
        emptyTitle.setComment("Valid comment");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(emptyTitle));

        Review longTitle = new Review();
        longTitle.setTargetId("HT-101");
        longTitle.setRating(4);
        longTitle.setTitle("A".repeat(151));
        longTitle.setComment("Valid comment");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(longTitle));
    }

    @Test
    @DisplayName("addReview - Blank or Overlong Comment Throws InvalidReviewException")
    void testAddReviewCommentValidations() {
        Review emptyComment = new Review();
        emptyComment.setTargetId("HT-101");
        emptyComment.setRating(4);
        emptyComment.setTitle("Valid Title");
        emptyComment.setComment("");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(emptyComment));

        Review longComment = new Review();
        longComment.setTargetId("HT-101");
        longComment.setRating(4);
        longComment.setTitle("Valid Title");
        longComment.setComment("C".repeat(3001));

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(longComment));
    }

    @Test
    @DisplayName("addReview - Missing Target ID Throws InvalidReviewException")
    void testAddReviewMissingTargetId() {
        Review r = new Review();
        r.setTargetId("");
        r.setRating(4);
        r.setTitle("Good");
        r.setComment("Nice experience");

        assertThrows(InvalidReviewException.class, () -> reviewService.addReview(r));
    }

    @Test
    @DisplayName("addReview - Unsafe Photo URL Schemes are Filtered Out")
    void testAddReviewSanitizesPhotoUrls() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(4);
        r.setTitle("Great Place");
        r.setComment("Loved the ambiance");
        r.setPhotoUrls(Arrays.asList(
                "javascript:alert('xss')",
                "https://trusted.com/image.jpg",
                "ftp://bad.com/test.png",
                "/api/reviews/photos/safe-uuid.jpg"
        ));

        Review saved = reviewService.addReview(r);
        assertEquals(2, saved.getPhotoUrls().size());
        assertTrue(saved.getPhotoUrls().contains("https://trusted.com/image.jpg"));
        assertTrue(saved.getPhotoUrls().contains("/api/reviews/photos/safe-uuid.jpg"));
    }

    @Test
    @DisplayName("addReply - Adds Reply to Existing Review")
    void testAddReplySuccess() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(5);
        r.setTitle("Amazing View");
        r.setComment("Loved every minute.");
        Review saved = reviewService.addReview(r);

        Review.ReviewReply reply = new Review.ReviewReply();
        reply.setUserId("user-owner");
        reply.setUserName("Hotel Manager");
        reply.setComment("Thank you so much for your generous review!");

        Review updated = reviewService.addReply(saved.getId(), reply);
        assertEquals(1, updated.getReplies().size());
        assertEquals("Hotel Manager", updated.getReplies().get(0).getUserName());
        assertNotNull(updated.getReplies().get(0).getReplyId());
    }

    @Test
    @DisplayName("addReply - Empty Comment or Non-Existent Review Throws Exception")
    void testAddReplyErrorScenarios() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(5);
        r.setTitle("Clean Room");
        r.setComment("Comfortable bed.");
        Review saved = reviewService.addReview(r);

        Review.ReviewReply blankReply = new Review.ReviewReply();
        blankReply.setComment("   ");
        assertThrows(InvalidReviewException.class, () -> reviewService.addReply(saved.getId(), blankReply));

        Review.ReviewReply validReply = new Review.ReviewReply();
        validReply.setComment("Thanks!");
        assertThrows(ReviewNotFoundException.class, () -> reviewService.addReply("non-existent-id", validReply));
    }

    @Test
    @DisplayName("toggleHelpful - Toggles Vote Correctly and Prevents Blank UserId")
    void testToggleHelpful() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setRating(4);
        r.setTitle("Solid Stay");
        r.setComment("Convenient location.");
        Review saved = reviewService.addReview(r);

        // Blank userId must throw
        assertThrows(InvalidReviewException.class, () -> reviewService.toggleHelpful(saved.getId(), ""));

        // First vote -> increments helpfulCount to 1
        Review afterVote1 = reviewService.toggleHelpful(saved.getId(), "user-123");
        assertEquals(1, afterVote1.getHelpfulCount());
        assertTrue(afterVote1.getHelpfulUserIds().contains("user-123"));

        // Second vote from same user -> toggles off (decrements to 0)
        Review afterVote2 = reviewService.toggleHelpful(saved.getId(), "user-123");
        assertEquals(0, afterVote2.getHelpfulCount());
        assertFalse(afterVote2.getHelpfulUserIds().contains("user-123"));
    }

    @Test
    @DisplayName("flagReview and moderateReview - Dismiss and Remove Actions")
    void testFlagAndModerationFlow() {
        Review r = new Review();
        r.setTargetId("HT-101");
        r.setTargetType("HOTEL");
        r.setRating(1);
        r.setTitle("Dispute");
        r.setComment("Inappropriate language test");
        Review saved = reviewService.addReview(r);

        // Flag the review
        Review flagged = reviewService.flagReview(saved.getId(), "reporter-1", "Offensive language");
        assertTrue(flagged.isFlagged());
        assertEquals("Offensive language", flagged.getFlagReason());

        List<Review> queue = reviewService.getFlaggedReviews();
        assertEquals(1, queue.size());

        // Test DISMISS
        Map<String, Object> dismissRes = reviewService.moderateReview(saved.getId(), "DISMISS");
        assertEquals("DISMISSED", dismissRes.get("action"));
        Review dismissedReview = reviewRepository.findById(saved.getId()).orElse(null);
        assertNotNull(dismissedReview);
        assertFalse(dismissedReview.isFlagged());

        // Re-flag and test REMOVE
        reviewService.flagReview(saved.getId(), "reporter-2", "Spam");
        Map<String, Object> removeRes = reviewService.moderateReview(saved.getId(), "REMOVE");
        assertEquals("REMOVED", removeRes.get("action"));
        assertFalse(reviewRepository.findById(saved.getId()).isPresent());

        // Unknown action throws
        Review r2 = reviewService.addReview(r);
        assertThrows(InvalidReviewException.class, () -> reviewService.moderateReview(r2.getId(), "UNKNOWN_ACTION"));
    }

    @Test
    @DisplayName("getReviewsForTarget - Filtering by Rating, Photos, and Sorting")
    void testGetReviewsFiltersAndSorts() {
        Review r1 = new Review();
        r1.setTargetId("HT-TEST");
        r1.setTargetType("HOTEL");
        r1.setRating(5);
        r1.setTitle("5 Star with Photo");
        r1.setComment("Loved it");
        r1.setPhotoUrls(Collections.singletonList("https://photos.com/p1.jpg"));
        Review saved1 = reviewService.addReview(r1);
        reviewService.toggleHelpful(saved1.getId(), "u1");
        reviewService.toggleHelpful(saved1.getId(), "u2");

        Review r2 = new Review();
        r2.setTargetId("HT-TEST");
        r2.setTargetType("HOTEL");
        r2.setRating(3);
        r2.setTitle("3 Star No Photo");
        r2.setComment("Average");
        reviewService.addReview(r2);

        // Filter minRating = 4
        ReviewSummaryDTO summaryMin4 = reviewService.getReviewsForTarget("HT-TEST", "HOTEL", "helpful", 4, false);
        assertEquals(1, summaryMin4.getReviews().size());
        assertEquals(5, summaryMin4.getReviews().get(0).getRating());

        // Filter withPhotosOnly = true
        ReviewSummaryDTO summaryPhotosOnly = reviewService.getReviewsForTarget("HT-TEST", "HOTEL", "helpful", null, true);
        assertEquals(1, summaryPhotosOnly.getReviews().size());

        // Sort by helpful
        ReviewSummaryDTO summaryHelpful = reviewService.getReviewsForTarget("HT-TEST", "HOTEL", "helpful", null, false);
        assertEquals(2, summaryHelpful.getReviews().size());
        assertEquals(2, summaryHelpful.getReviews().get(0).getHelpfulCount());
    }

    @Test
    @DisplayName("saveReviewPhoto - Validates File Format, Size, and Stores Successfully")
    void testSaveReviewPhoto() {
        MockMultipartFile validImage = new MockMultipartFile(
                "file", "travel.jpg", "image/jpeg", "fake image content".getBytes()
        );
        String url = reviewService.saveReviewPhoto(validImage);
        assertNotNull(url);
        assertTrue(url.startsWith("/api/reviews/photos/"));

        // Invalid content type
        MockMultipartFile textFile = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "malicious text".getBytes()
        );
        assertThrows(InvalidReviewException.class, () -> reviewService.saveReviewPhoto(textFile));

        // Path traversal in loadReviewPhoto throws
        assertThrows(InvalidReviewException.class, () -> reviewService.loadReviewPhoto("../secret.txt"));
    }

    @Test
    @DisplayName("Real-Time SSE Streams - Emitters Register and Close Cleanly")
    void testSseSubscriptions() {
        SseEmitter targetEmitter = reviewService.subscribeToTarget("HT-101", "HOTEL");
        assertNotNull(targetEmitter);

        SseEmitter modEmitter = reviewService.subscribeToModeration();
        assertNotNull(modEmitter);
    }

    // =========================================================================
    // IN-MEMORY STUB REPOSITORIES
    // =========================================================================
    public static class StubReviewRepository implements ReviewRepository {
        private final Map<String, Review> storage = new LinkedHashMap<>();

        @Override
        public List<Review> findByTargetId(String targetId) {
            return storage.values().stream()
                    .filter(r -> targetId.equals(r.getTargetId()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Review> findByTargetIdAndTargetType(String targetId, String targetType) {
            return storage.values().stream()
                    .filter(r -> targetId.equals(r.getTargetId()) && targetType.equalsIgnoreCase(r.getTargetType()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Review> findByTargetIdAndTargetTypeAndFlagged(String targetId, String targetType, boolean flagged) {
            return storage.values().stream()
                    .filter(r -> targetId.equals(r.getTargetId()) && targetType.equalsIgnoreCase(r.getTargetType()) && r.isFlagged() == flagged)
                    .collect(Collectors.toList());
        }

        @Override
        public List<Review> findByTargetIdAndFlagged(String targetId, boolean flagged) {
            return storage.values().stream()
                    .filter(r -> targetId.equals(r.getTargetId()) && r.isFlagged() == flagged)
                    .collect(Collectors.toList());
        }

        @Override
        public List<Review> findByFlagged(boolean flagged) {
            return storage.values().stream()
                    .filter(r -> r.isFlagged() == flagged)
                    .collect(Collectors.toList());
        }

        @Override
        public List<Review> findByUserId(String userId) {
            return storage.values().stream()
                    .filter(r -> userId.equals(r.getUserId()))
                    .collect(Collectors.toList());
        }

        @Override
        public <S extends Review> S save(S entity) {
            if (entity.getId() == null || entity.getId().trim().isEmpty()) {
                entity.setId("REV-" + UUID.randomUUID().toString().substring(0, 8));
            }
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<Review> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override
        public boolean existsById(String id) {
            return storage.containsKey(id);
        }

        @Override
        public void deleteById(String id) {
            storage.remove(id);
        }

        @Override
        public void delete(Review entity) {
            if (entity != null && entity.getId() != null) {
                storage.remove(entity.getId());
            }
        }

        @Override public <S extends Review> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Review> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Review> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Review> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Review> findAll(Sort sort) { return findAll(); }
        @Override public Page<Review> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends Review> S insert(S entity) { return save(entity); }
        @Override public <S extends Review> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Review> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Review> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Review> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Review> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends Review> long count(Example<S> example) { return 0; }
        @Override public <S extends Review> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Review, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubHotelRepository implements HotelRepository {
        private final Map<String, Hotel> storage = new LinkedHashMap<>();

        @Override
        public List<Hotel> findByLocationContainingIgnoreCase(String location) { return Collections.emptyList(); }
        @Override
        public List<Hotel> findByHotelNameContainingIgnoreCase(String hotelName) { return Collections.emptyList(); }

        @Override
        public <S extends Hotel> S save(S entity) {
            if (entity.getId() == null) entity.setId("HT-" + UUID.randomUUID().toString().substring(0, 8));
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<Hotel> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override public boolean existsById(String id) { return storage.containsKey(id); }
        @Override public <S extends Hotel> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Hotel> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Hotel> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String id) { storage.remove(id); }
        @Override public void delete(Hotel entity) { if (entity != null) storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Hotel> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Hotel> findAll(Sort sort) { return findAll(); }
        @Override public Page<Hotel> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends Hotel> S insert(S entity) { return save(entity); }
        @Override public <S extends Hotel> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends Hotel> long count(Example<S> example) { return 0; }
        @Override public <S extends Hotel> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Hotel, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubFlightRepository implements FlightRepository {
        private final Map<String, Flight> storage = new LinkedHashMap<>();

        @Override
        public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) { return Collections.emptyList(); }
        @Override
        public List<Flight> findByFromContainingIgnoreCase(String from) { return Collections.emptyList(); }
        @Override
        public List<Flight> findByToContainingIgnoreCase(String to) { return Collections.emptyList(); }

        @Override
        public <S extends Flight> S save(S entity) {
            if (entity.getId() == null) entity.setId("FL-" + UUID.randomUUID().toString().substring(0, 8));
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<Flight> findById(String id) {
            return Optional.ofNullable(storage.get(id));
        }

        @Override public boolean existsById(String id) { return storage.containsKey(id); }
        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public List<Flight> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String id) { storage.remove(id); }
        @Override public void delete(Flight entity) { if (entity != null) storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Flight> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Flight> findAll(Sort sort) { return findAll(); }
        @Override public Page<Flight> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends Flight> S insert(S entity) { return save(entity); }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return Collections.emptyList(); }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }
}

