package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Recommendation;
import com.makemytrip.makemytrip.services.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*")
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<List<Recommendation>> getRecommendations(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false, defaultValue = "ALL") String category) {
        List<Recommendation> recommendations = recommendationService.getRecommendations(userId, category);
        return ResponseEntity.ok(recommendations);
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
