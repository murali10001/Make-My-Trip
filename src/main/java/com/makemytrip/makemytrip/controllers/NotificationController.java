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

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(required = false) String userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<java.util.Map<String, String>> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        java.util.Map<String, String> res = new java.util.HashMap<>();
        res.put("message", "Notification deleted successfully");
        return ResponseEntity.ok(res);
    }
}
