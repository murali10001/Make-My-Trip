package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidReviewException;
import com.makemytrip.makemytrip.exceptions.ReviewNotFoundException;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.ReviewSummaryDTO;
import com.makemytrip.makemytrip.repositories.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    /**
     * Retrieve reviews for targetId (Flight or Hotel) dynamically from MongoDB.
     */
    public ReviewSummaryDTO getReviewsForTarget(String targetId, String targetType, String sort, Integer minRating, Boolean withPhotosOnly) {
        if (targetId == null || targetId.trim().isEmpty()) {
            throw new InvalidReviewException("Target ID cannot be empty");
        }

        List<Review> allReviews = reviewRepository.findByTargetId(targetId);

        // Calculate summary metrics across all active/non-removed reviews
        int totalCount = allReviews.size();
        double sumRating = 0;
        Map<Integer, Integer> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0);
        }

        int photoCount = 0;
        for (Review r : allReviews) {
            sumRating += r.getRating();
            int current = distribution.getOrDefault(r.getRating(), 0);
            distribution.put(r.getRating(), current + 1);
            if (r.getPhotoUrls() != null) {
                photoCount += r.getPhotoUrls().size();
            }
        }

        double averageRating = totalCount > 0 ? Math.round((sumRating / totalCount) * 10.0) / 10.0 : 0.0;

        // Apply filters
        List<Review> filtered = allReviews.stream()
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

        // Apply sorting
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

    /**
     * Submit a new traveler review and save it directly to MongoDB.
     */
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
        if (review.getComment() == null || review.getComment().trim().isEmpty()) {
            throw new InvalidReviewException("Detailed review feedback cannot be empty.");
        }

        review.setId(null); // Ensure MongoDB generates a new ID
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
        if (review.getPhotoUrls() == null) {
            review.setPhotoUrls(new ArrayList<>());
        }
        review.setReplies(new ArrayList<>());

        return reviewRepository.save(review);
    }

    /**
     * Add a conversational reply to an existing review.
     */
    public Review addReply(String reviewId, Review.ReviewReply reply) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        if (reply.getComment() == null || reply.getComment().trim().isEmpty()) {
            throw new InvalidReviewException("Reply comment cannot be empty.");
        }

        reply.setReplyId("rep-" + UUID.randomUUID().toString().substring(0, 8));
        reply.setCreatedAt(LocalDateTime.now().format(DATE_FORMATTER));
        reply.setCreatedAtEpochMs(System.currentTimeMillis());
        if (reply.getUserName() == null || reply.getUserName().trim().isEmpty()) {
            reply.setUserName("Community Member");
        }

        review.getReplies().add(reply);
        return reviewRepository.save(review);
    }

    /**
     * Toggle or vote 'helpful' on a review.
     */
    public Review toggleHelpful(String reviewId, String userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        if (userId == null || userId.trim().isEmpty()) {
            userId = "guest-" + UUID.randomUUID().toString().substring(0, 6);
        }

        List<String> voters = review.getHelpfulUserIds();
        if (voters.contains(userId)) {
            voters.remove(userId);
            review.setHelpfulCount(Math.max(0, review.getHelpfulCount() - 1));
        } else {
            voters.add(userId);
            review.setHelpfulCount(review.getHelpfulCount() + 1);
        }

        return reviewRepository.save(review);
    }

    /**
     * Flag a review as inappropriate for moderator review.
     */
    public Review flagReview(String reviewId, String userId, String reason) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        review.setFlagged(true);
        review.setFlagReason(reason != null && !reason.trim().isEmpty() ? reason : "Inappropriate content");
        review.setFlaggedByUserId(userId);

        return reviewRepository.save(review);
    }

    /**
     * Retrieve all flagged reviews for moderator inspection.
     */
    public List<Review> getFlaggedReviews() {
        return reviewRepository.findByFlagged(true);
    }

    /**
     * Moderator action on flagged review: DISMISS or REMOVE.
     */
    public Map<String, Object> moderateReview(String reviewId, String action) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Review not found with ID: " + reviewId));

        Map<String, Object> result = new HashMap<>();

        if ("DISMISS".equalsIgnoreCase(action)) {
            review.setFlagged(false);
            review.setFlagReason(null);
            review.setFlaggedByUserId(null);
            Review saved = reviewRepository.save(review);
            result.put("status", "SUCCESS");
            result.put("action", "DISMISSED");
            result.put("message", "Flag dismissed. The review remains published.");
            result.put("review", saved);
        } else if ("REMOVE".equalsIgnoreCase(action)) {
            reviewRepository.delete(review);
            result.put("status", "SUCCESS");
            result.put("action", "REMOVED");
            result.put("message", "Review has been permanently removed by moderator.");
        } else {
            throw new InvalidReviewException("Unknown moderation action: " + action + ". Supported actions: DISMISS, REMOVE");
        }

        return result;
    }
}
