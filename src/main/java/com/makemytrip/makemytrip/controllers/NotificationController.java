package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping(value = {"", "/{userId}"})
    public ResponseEntity<List<Notification>> getNotifications(
            @PathVariable(required = false) String userId,
            @RequestParam(required = false) String userIdParam) {
        String targetUserId = userId != null ? userId : userIdParam;
        return ResponseEntity.ok(notificationService.getNotificationsForUser(targetUserId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<java.util.Map<String, String>> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        java.util.Map<String, String> res = new java.util.HashMap<>();
        res.put("message", "Notification deleted successfully");
        return ResponseEntity.ok(res);
    }
}
