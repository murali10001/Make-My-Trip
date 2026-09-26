package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    public Notification createNotification(String userId, String title, String desc, String type) {
        if (userId == null || userId.trim().isEmpty()) {
            userId = "ALL";
        }
        String id = "NOTIF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String timeStr = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM, hh:mm a"));
        Notification notif = new Notification(id, userId, title, desc, timeStr, type);
        return notificationRepository.save(notif);
    }

    public List<Notification> getNotificationsForUser(String userId) {
        if (userId == null || userId.trim().isEmpty() || "null".equalsIgnoreCase(userId) || "undefined".equalsIgnoreCase(userId)) {
            return java.util.Collections.emptyList();
        }
        List<Notification> list = notificationRepository.findByUserIdOrUserId(userId, "ALL");
        return list.stream()
                .filter(n -> n != null && !"freeze".equalsIgnoreCase(n.getType()) && (n.getTitle() == null || !n.getTitle().contains("Fare Locked")))
                .collect(Collectors.toList());
    }

    public void deleteNotification(String id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
        }
    }
}
