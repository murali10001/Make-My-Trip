package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.HomeContent;
import com.makemytrip.makemytrip.services.HomeContentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/home-content")
@CrossOrigin(origins = "*")
public class HomeContentController {

    @Autowired
    private HomeContentService homeContentService;

    @GetMapping
    public ResponseEntity<HomeContent> getHomeContent() {
        HomeContent content = homeContentService.getHomeContent();
        return ResponseEntity.ok(content);
    }

    @PostMapping
    public ResponseEntity<HomeContent> updateHomeContent(@RequestBody HomeContent content) {
        HomeContent saved = homeContentService.saveHomeContent(content);
        return ResponseEntity.ok(saved);
    }
}
