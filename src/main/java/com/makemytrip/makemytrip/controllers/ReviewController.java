package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.ReviewSummaryDTO;
import com.makemytrip.makemytrip.services.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @GetMapping
    public ResponseEntity<ReviewSummaryDTO> getReviews(
            @RequestParam String targetId,
            @RequestParam(required = false, defaultValue = "HOTEL") String targetType,
            @RequestParam(required = false, defaultValue = "helpful") String sort,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false, defaultValue = "false") Boolean withPhotosOnly) {
        ReviewSummaryDTO summary = reviewService.getReviewsForTarget(targetId, targetType, sort, minRating, withPhotosOnly);
        return ResponseEntity.ok(summary);
    }

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody Review review) {
        Review saved = reviewService.addReview(review);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<Review> addReply(
            @PathVariable String id,
            @RequestBody Review.ReviewReply reply) {
        Review updated = reviewService.addReply(id, reply);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/helpful")
    public ResponseEntity<Review> toggleHelpful(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "") String userId) {
        Review updated = reviewService.toggleHelpful(id, userId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/flag")
    public ResponseEntity<Review> flagReview(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "") String userId,
            @RequestParam(required = false, defaultValue = "Inappropriate content") String reason) {
        Review updated = reviewService.flagReview(id, userId, reason);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/moderation/flagged")
    public ResponseEntity<List<Review>> getFlaggedReviews() {
        List<Review> flagged = reviewService.getFlaggedReviews();
        return ResponseEntity.ok(flagged);
    }

    @PostMapping("/moderation/{id}/action")
    public ResponseEntity<Map<String, Object>> moderateReview(
            @PathVariable String id,
            @RequestParam String action) {
        Map<String, Object> result = reviewService.moderateReview(id, action);
        return ResponseEntity.ok(result);
    }
}
