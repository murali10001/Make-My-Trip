package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.ReviewSummaryDTO;
import com.makemytrip.makemytrip.services.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/reviews", "/api/review"})
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
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping({"/{id}/reply", "/{id}/replies"})
    public ResponseEntity<Review> addReply(
            @PathVariable String id,
            @RequestBody Review.ReviewReply reply) {
        Review updated = reviewService.addReply(id, reply);
        return ResponseEntity.status(HttpStatus.CREATED).body(updated);
    }

    @PostMapping("/{id}/helpful")
    public ResponseEntity<Review> toggleHelpful(
            @PathVariable String id,
            @RequestParam String userId) {
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

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadPhoto(@RequestParam("file") MultipartFile file) {
        String photoUrl = reviewService.saveReviewPhoto(file);
        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("url", photoUrl);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/photos/{fileName:.+}")
    public ResponseEntity<Resource> getPhoto(@PathVariable String fileName) {
        Resource resource = reviewService.loadReviewPhoto(fileName);
        MediaType mediaType = MediaTypeFactory.getMediaType(resource)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTargetReviews(
            @RequestParam String targetId,
            @RequestParam(required = false, defaultValue = "HOTEL") String targetType) {
        return reviewService.subscribeToTarget(targetId, targetType);
    }

    @GetMapping(value = "/moderation/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamModerationQueue() {
        return reviewService.subscribeToModeration();
    }
}

