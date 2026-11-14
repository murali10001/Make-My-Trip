package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Recommendation;
import com.makemytrip.makemytrip.services.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/recommendations", "/api/recommendation"})
@CrossOrigin(origins = "*")
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<List<Recommendation>> getRecommendations(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false, defaultValue = "ALL") String category) {
        try {
            List<Recommendation> recommendations = recommendationService.getRecommendations(userId, category);
            if (recommendations == null || recommendations.isEmpty()) {
                recommendations = recommendationService.createCuratedBaseCatalog();
            }
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            System.err.println("[RECOMMENDATION CONTROLLER] Notice returning curated catalog: " + e.getMessage());
            return ResponseEntity.ok(recommendationService.createCuratedBaseCatalog());
        }
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRecommendations(@RequestParam(required = false) String userId) {
        return recommendationService.subscribe(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Recommendation> getRecommendationById(@PathVariable String id) {
        return recommendationService.getRecommendationById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/feedback")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        String feedbackType = body.get("feedbackType");
        String notes = body.get("notes");
        Map<String, Object> response = recommendationService.recordFeedback(id, userId, feedbackType, notes);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, String>> seedCatalog() {
        recommendationService.seedInitialRecommendations();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Recommendations catalog synced dynamically from database entities"));
    }
}

