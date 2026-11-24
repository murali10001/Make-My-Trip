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
@RequestMapping({"/api/notifications", "/notifications"})
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(@RequestParam(name = "userId", required = false) String userId) {
        SseEmitter emitter = new SseEmitter(1800000L);
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

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {
        Map<String, String> res = new HashMap<>();
        res.put("publicKey", com.makemytrip.makemytrip.services.NotificationService.VAPID_PUBLIC_KEY);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/push-subscribe")
    public ResponseEntity<com.makemytrip.makemytrip.models.PushSubscription> subscribePush(@RequestBody Map<String, Object> payload) {
        String userId = (String) payload.getOrDefault("userId", "ALL");
        String endpoint = (String) payload.get("endpoint");
        String p256dh = null;
        String auth = null;
        if (payload.get("keys") instanceof Map) {
            Map<?, ?> keys = (Map<?, ?>) payload.get("keys");
            p256dh = (String) keys.get("p256dh");
            auth = (String) keys.get("auth");
        } else {
            p256dh = (String) payload.get("p256dh");
            auth = (String) payload.get("auth");
        }
        String userAgent = (String) payload.getOrDefault("userAgent", "Web Browser");
        com.makemytrip.makemytrip.models.PushSubscription sub = notificationService.savePushSubscription(userId, endpoint, p256dh, auth, userAgent);
        return ResponseEntity.ok(sub);
    }

    @PostMapping("/push-unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribePush(@RequestBody Map<String, String> payload) {
        String endpoint = payload.get("endpoint");
        notificationService.removePushSubscription(endpoint);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Push subscription removed successfully");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/push-subscriptions")
    public ResponseEntity<List<com.makemytrip.makemytrip.models.PushSubscription>> getPushSubscriptions(
            @RequestParam(required = false) String userId) {
        return ResponseEntity.ok(notificationService.getPushSubscriptions(userId));
    }

    @PostMapping("/send-push")
    public ResponseEntity<Map<String, Object>> sendPush(@RequestBody Map<String, String> payload) {
        String userId = payload.getOrDefault("userId", "ALL");
        String title = payload.getOrDefault("title", "Flight Radar Alert");
        String desc = payload.getOrDefault("desc", "Live flight radar notification update.");
        String type = payload.getOrDefault("type", "flight");

        Notification notif = notificationService.createNotification(userId, title, desc, type);
        int sentCount = notificationService.dispatchWebPushToSubscribers(notif);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("notification", notif);
        res.put("subscribersNotified", sentCount);
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

