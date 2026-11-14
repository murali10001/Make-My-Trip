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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private FlightRepository flightRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
    private static final Path UPLOAD_DIR = Paths.get("uploads", "reviews").toAbsolutePath().normalize();

    private final Map<String, List<SseEmitter>> targetEmitters = new ConcurrentHashMap<>();
    private final List<SseEmitter> moderationEmitters = new CopyOnWriteArrayList<>();

    public ReviewService() {
        try {
            Files.createDirectories(UPLOAD_DIR);
        } catch (IOException e) {
            System.err.println("[REVIEW SERVICE] Could not initialize review upload directory: " + e.getMessage());
        }
    }

    public ReviewSummaryDTO getReviewsForTarget(String targetId, String targetType, String sort, Integer minRating, Boolean withPhotosOnly) {
        if (targetId == null || targetId.trim().isEmpty()) {
            throw new InvalidReviewException("Target ID cannot be empty");
        }

        String normalizedType = targetType != null ? targetType.trim().toUpperCase() : null;
        List<Review> allReviews;
        if (normalizedType != null && !normalizedType.isEmpty()) {
            allReviews = reviewRepository.findByTargetIdAndTargetType(targetId, normalizedType);
            if (allReviews.isEmpty()) {
                allReviews = reviewRepository.findByTargetId(targetId);
            }
        } else {
            allReviews = reviewRepository.findByTargetId(targetId);
        }

        List<Review> validReviews = allReviews.stream()
                .filter(r -> !r.isFlagged())
                .collect(Collectors.toList());

        int totalCount = validReviews.size();
        double sumRating = 0;
        Map<Integer, Integer> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0);
        }

        int photoCount = 0;
        for (Review r : validReviews) {
            sumRating += r.getRating();
            int current = distribution.getOrDefault(r.getRating(), 0);
            distribution.put(r.getRating(), current + 1);
            if (r.getPhotoUrls() != null) {
                photoCount += r.getPhotoUrls().size();
            }
        }

        double averageRating = totalCount > 0 ? Math.round((sumRating / totalCount) * 10.0) / 10.0 : 0.0;

        List<Review> filtered = validReviews.stream()
                .filter(r -> {
                    if (minRating != null && minRating > 0 && r.getRating() < minRating) {
                        return false;
                    }
                    if (Boolean.TRUE.equals(withPhotosOnly) && (r.getPhotoUrls() == null || r.getPhotoUrls().isEmpty())) {
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        String sortOption = sort != null ? sort.toLowerCase().trim() : "helpful";
        switch (sortOption) {
            case "newest":
                filtered.sort((a, b) -> Long.compare(b.getCreatedAtEpochMs(), a.getCreatedAtEpochMs()));
                break;
            case "highest":
                filtered.sort((a, b) -> {
                    int c = Integer.compare(b.getRating(), a.getRating());
                    return c != 0 ? c : Long.compare(b.getCreatedAtEpochMs(), a.getCreatedAtEpochMs());
                });
                break;
            case "lowest":
                filtered.sort((a, b) -> {
                    int c = Integer.compare(a.getRating(), b.getRating());
                    return c != 0 ? c : Long.compare(b.getCreatedAtEpochMs(), a.getCreatedAtEpochMs());
                });
                break;
            case "helpful":
            default:
                filtered.sort((a, b) -> {
                    int c = Integer.compare(b.getHelpfulCount(), a.getHelpfulCount());
                    return c != 0 ? c : Long.compare(b.getCreatedAtEpochMs(), a.getCreatedAtEpochMs());
                });
                break;
        }

        return new ReviewSummaryDTO(filtered, totalCount, averageRating, distribution, photoCount);
    }

    public Review addReview(Review review) {
        if (review.getTargetId() == null || review.getTargetId().trim().isEmpty()) {
            throw new InvalidReviewException("Target booking identifier is required.");
        }
        if (review.getRating() < 1 || review.getRating() > 5) {
            throw new InvalidReviewException("Rating must be between 1 and 5 stars.");
        }
        if (review.getTitle() == null || review.getTitle().trim().isEmpty()) {
            throw new InvalidReviewException("Review headline / title cannot be empty.");
        }
        if (review.getTitle().trim().length() > 150) {
            throw new InvalidReviewException("Review title cannot exceed 150 characters.");
        }
        if (review.getComment() == null || review.getComment().trim().isEmpty()) {
            throw new InvalidReviewException("Detailed review feedback cannot be empty.");
        }
        if (review.getComment().trim().length() > 3000) {
            throw new InvalidReviewException("Review feedback cannot exceed 3000 characters.");
        }

        review.setId(null);
        review.setTargetType(review.getTargetType() != null ? review.getTargetType().trim().toUpperCase() : "HOTEL");
        review.setCreatedAt(LocalDateTime.now().format(DATE_FORMATTER));
        review.setCreatedAtEpochMs(System.currentTimeMillis());
        if (review.getUserName() == null || review.getUserName().trim().isEmpty()) {
            review.setUserName("Verified Traveler");
        }
        review.setHelpfulCount(0);
        review.setHelpfulUserIds(new ArrayList<>());
        review.setFlagged(false);
        review.setFlagReason(null);
        review.setFlaggedByUserId(null);

        List<String> sanitizedPhotos = new ArrayList<>();
        if (review.getPhotoUrls() != null) {
            for (String photo : review.getPhotoUrls()) {
                if (photo != null) {
                    String clean = photo.trim();
                    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/api/reviews/photos/")) {
                        sanitizedPhotos.add(clean);
                    }
                }
            }
        }
        review.setPhotoUrls(sanitizedPhotos);
        review.setReplies(new ArrayList<>());

        Review saved = reviewRepository.save(review);

        updateParentAggregateMetrics(saved.getTargetId(), saved.getTargetType());

        broadcastTargetUpdate(saved.getTargetId(), saved.getTargetType(), "REVIEW_ADDED", saved);

        return saved;
    }

    public Review addReply(String reviewId, Review.ReviewReply reply) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        if (reply.getComment() == null || reply.getComment().trim().isEmpty()) {
            throw new InvalidReviewException("Reply comment cannot be empty.");
        }
        if (reply.getComment().trim().length() > 2000) {
            throw new InvalidReviewException("Reply comment cannot exceed 2000 characters.");
        }

        reply.setReplyId("rep-" + UUID.randomUUID().toString().substring(0, 8));
        reply.setCreatedAt(LocalDateTime.now().format(DATE_FORMATTER));
        reply.setCreatedAtEpochMs(System.currentTimeMillis());
        if (reply.getUserName() == null || reply.getUserName().trim().isEmpty()) {
            reply.setUserName("Community Member");
        }

        review.getReplies().add(reply);
        Review saved = reviewRepository.save(review);

        broadcastTargetUpdate(saved.getTargetId(), saved.getTargetType(), "REPLY_ADDED", saved);

        return saved;
    }

    public Review toggleHelpful(String reviewId, String userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        if (userId == null || userId.trim().isEmpty()) {
            throw new InvalidReviewException("User ID is required to cast a helpful vote.");
        }

        String voter = userId.trim();
        List<String> voters = review.getHelpfulUserIds();
        if (voters == null) {
            voters = new ArrayList<>();
            review.setHelpfulUserIds(voters);
        }

        if (voters.contains(voter)) {
            voters.remove(voter);
            review.setHelpfulCount(Math.max(0, review.getHelpfulCount() - 1));
        } else {
            voters.add(voter);
            review.setHelpfulCount(review.getHelpfulCount() + 1);
        }

        Review saved = reviewRepository.save(review);

        broadcastTargetUpdate(saved.getTargetId(), saved.getTargetType(), "HELPFUL_UPDATED", saved);

        return saved;
    }

    public Review flagReview(String reviewId, String userId, String reason) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        review.setFlagged(true);
        review.setFlagReason(reason != null && !reason.trim().isEmpty() ? reason.trim() : "Inappropriate content");
        review.setFlaggedByUserId(userId != null && !userId.trim().isEmpty() ? userId.trim() : "anonymous-traveler");

        Review saved = reviewRepository.save(review);

        updateParentAggregateMetrics(saved.getTargetId(), saved.getTargetType());

        broadcastTargetUpdate(saved.getTargetId(), saved.getTargetType(), "REVIEW_FLAGGED", saved);
        broadcastModerationUpdate("MODERATION_QUEUE_UPDATED", getFlaggedReviews());

        return saved;
    }

    public List<Review> getFlaggedReviews() {
        return reviewRepository.findByFlagged(true);
    }

    public Map<String, Object> moderateReview(String reviewId, String action) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        Map<String, Object> result = new HashMap<>();
        String targetId = review.getTargetId();
        String targetType = review.getTargetType();

        if ("DISMISS".equalsIgnoreCase(action)) {
            review.setFlagged(false);
            review.setFlagReason(null);
            review.setFlaggedByUserId(null);
            Review saved = reviewRepository.save(review);
            result.put("status", "SUCCESS");
            result.put("action", "DISMISSED");
            result.put("message", "Flag dismissed. The review remains published.");
            result.put("review", saved);

            updateParentAggregateMetrics(targetId, targetType);
            broadcastTargetUpdate(targetId, targetType, "MODERATION_ACTION_TAKEN", saved);
        } else if ("REMOVE".equalsIgnoreCase(action)) {
            reviewRepository.delete(review);
            result.put("status", "SUCCESS");
            result.put("action", "REMOVED");
            result.put("message", "Review has been permanently removed by moderator.");

            updateParentAggregateMetrics(targetId, targetType);
            Map<String, String> removalEvent = new HashMap<>();
            removalEvent.put("removedReviewId", reviewId);
            removalEvent.put("targetId", targetId);
            broadcastTargetUpdate(targetId, targetType, "MODERATION_ACTION_TAKEN", removalEvent);
        } else {
            throw new InvalidReviewException("Unknown moderation action: " + action + ". Supported actions: DISMISS, REMOVE");
        }

        broadcastModerationUpdate("MODERATION_QUEUE_UPDATED", getFlaggedReviews());

        return result;
    }

    public String saveReviewPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidReviewException("Photo file cannot be empty.");
        }

        if (file.getSize() > 10 * 1024 * 1024) {
            throw new InvalidReviewException("Photo file exceeds maximum permitted size of 10MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new InvalidReviewException("Only valid image formats (JPEG, PNG, WEBP, GIF) are accepted.");
        }

        try {
            Files.createDirectories(UPLOAD_DIR);

            String originalName = file.getOriginalFilename();
            String extension = ".jpg";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
            }

            String safeFileName = UUID.randomUUID().toString() + extension;
            Path targetLocation = UPLOAD_DIR.resolve(safeFileName).normalize();

            if (!targetLocation.startsWith(UPLOAD_DIR)) {
                throw new InvalidReviewException("Invalid file storage destination.");
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return "/api/reviews/photos/" + safeFileName;
        } catch (IOException e) {
            throw new InvalidReviewException("Failed to store image: " + e.getMessage());
        }
    }

    public Resource loadReviewPhoto(String fileName) {
        try {
            if (fileName == null || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
                throw new InvalidReviewException("Invalid file name.");
            }
            Path filePath = UPLOAD_DIR.resolve(fileName).normalize();
            if (!filePath.startsWith(UPLOAD_DIR) || !Files.exists(filePath)) {
                throw new ReviewNotFoundException("Photo not found: " + fileName);
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ReviewNotFoundException("Could not read photo: " + fileName);
            }
        } catch (MalformedURLException e) {
            throw new ReviewNotFoundException("Photo not found: " + fileName);
        }
    }

    public SseEmitter subscribeToTarget(String targetId, String targetType) {
        String key = (targetType != null ? targetType.trim().toUpperCase() : "HOTEL") + ":" + targetId;
        SseEmitter emitter = new SseEmitter(180_000L);

        targetEmitters.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeTargetEmitter(key, emitter));
        emitter.onTimeout(() -> removeTargetEmitter(key, emitter));
        emitter.onError(e -> removeTargetEmitter(key, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to real-time review stream for " + key));
        } catch (IOException e) {
            removeTargetEmitter(key, emitter);
        }

        return emitter;
    }

    public SseEmitter subscribeToModeration() {
        SseEmitter emitter = new SseEmitter(180_000L);
        moderationEmitters.add(emitter);

        emitter.onCompletion(() -> moderationEmitters.remove(emitter));
        emitter.onTimeout(() -> moderationEmitters.remove(emitter));
        emitter.onError(e -> moderationEmitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to moderation stream"));
        } catch (IOException e) {
            moderationEmitters.remove(emitter);
        }

        return emitter;
    }

    private void removeTargetEmitter(String key, SseEmitter emitter) {
        List<SseEmitter> list = targetEmitters.get(key);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                targetEmitters.remove(key);
            }
        }
    }

    private void broadcastTargetUpdate(String targetId, String targetType, String eventName, Object data) {
        String key = (targetType != null ? targetType.trim().toUpperCase() : "HOTEL") + ":" + targetId;
        List<SseEmitter> emitters = targetEmitters.get(key);
        if (emitters != null && !emitters.isEmpty()) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            emitters.removeAll(deadEmitters);
        }
    }

    private void broadcastModerationUpdate(String eventName, Object data) {
        if (!moderationEmitters.isEmpty()) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : moderationEmitters) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            moderationEmitters.removeAll(deadEmitters);
        }
    }

    public void updateParentAggregateMetrics(String targetId, String targetType) {
        if (targetId == null || targetId.trim().isEmpty()) return;

        String normType = targetType != null ? targetType.trim().toUpperCase() : "HOTEL";
        List<Review> validReviews = reviewRepository.findByTargetIdAndFlagged(targetId, false);
        if (validReviews.isEmpty() && normType != null) {
            validReviews = reviewRepository.findByTargetIdAndTargetTypeAndFlagged(targetId, normType, false);
        }

        int count = validReviews.size();
        double sum = 0;
        for (Review r : validReviews) {
            sum += r.getRating();
        }
        double avg = count > 0 ? Math.round((sum / count) * 10.0) / 10.0 : 4.0;

        String reviewText;
        if (avg >= 4.5) reviewText = "Excellent";
        else if (avg >= 4.0) reviewText = "Very Good";
        else if (avg >= 3.0) reviewText = "Good";
        else if (avg >= 2.0) reviewText = "Fair";
        else reviewText = "Poor";

        if ("HOTEL".equalsIgnoreCase(normType)) {
            Optional<Hotel> hotelOpt = hotelRepository.findById(targetId);
            if (hotelOpt.isPresent()) {
                Hotel hotel = hotelOpt.get();
                hotel.setReviewsCount(count);
                hotel.setReviewsRating(avg);
                hotel.setRating(avg);
                hotel.setReviewsText(reviewText);
                hotelRepository.save(hotel);
            }
        } else if ("FLIGHT".equalsIgnoreCase(normType)) {
            Optional<Flight> flightOpt = flightRepository.findById(targetId);
            if (flightOpt.isPresent()) {
                Flight flight = flightOpt.get();
                flight.setReviewsCount(count);
                flight.setReviewsRating(avg);
                flight.setRating(avg);
                flight.setReviewsText(reviewText);
                flightRepository.save(flight);
            }
        }
    }
}

