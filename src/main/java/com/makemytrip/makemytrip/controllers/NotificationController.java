package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(@RequestParam(name = "userId", required = false) String userId) {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 minutes
        notificationService.addEmitter(userId, emitter);
        try {
            emitter.send(SseEmitter.event().name("connect").data("Connected to live notification stream for user: " + (userId != null ? userId : "ALL")));
        } catch (IOException ignored) {}
        return emitter;
    }

    @GetMapping(value = {"", "/{userId}"})
    public ResponseEntity<List<Notification>> getNotifications(
            @PathVariable(required = false) String userId,
            @RequestParam(name = "userId", required = false) String userIdParam) {
        String targetUserId = (userId != null && !userId.trim().isEmpty()) ? userId : userIdParam;
        return ResponseEntity.ok(notificationService.getNotificationsForUser(targetUserId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(
            @PathVariable String id,
            @RequestParam(name = "userId", required = false) String userId) {
        notificationService.deleteNotification(id, userId);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Notification deleted successfully");
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, String>> clearAllNotifications(
            @RequestParam(name = "userId") String userId) {
        notificationService.clearAllForUser(userId);
        Map<String, String> res = new HashMap<>();
        res.put("message", "All notifications cleared successfully");
        return ResponseEntity.ok(res);
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @RequestParam(name = "userId") String userId) {
        notificationService.markAllAsReadForUser(userId);
        Map<String, String> res = new HashMap<>();
        res.put("message", "All notifications marked as read");
        return ResponseEntity.ok(res);
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Map<String, String> payload) {
        String userId = payload.getOrDefault("userId", "ALL");
        String title = payload.getOrDefault("title", "New Notification");
        String desc = payload.getOrDefault("desc", "");
        String type = payload.getOrDefault("type", "alert");
        Notification notif = notificationService.createNotification(userId, title, desc, type);
        return ResponseEntity.ok(notif);
    }
}

