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
        final String cleanUserId = (userId == null || userId.trim().isEmpty() || "null".equalsIgnoreCase(userId) || "undefined".equalsIgnoreCase(userId))
                ? null
                : userId.trim();

        List<String> targetIds;
        if (cleanUserId == null) {
            targetIds = List.of("ALL", "all");
        } else {
            targetIds = List.of(cleanUserId, "ALL", "all");
        }

        List<Notification> notifications = notificationRepository.findByUserIdIn(targetIds);
        return notifications.stream()
                .filter(n -> n != null)
                .filter(n -> {
                    if (cleanUserId != null && n.getDismissedUserIds() != null && n.getDismissedUserIds().contains(cleanUserId)) {
                        return false;
                    }
                    return true;
                })
                .filter(n -> !"freeze".equalsIgnoreCase(n.getType()) && (n.getTitle() == null || !n.getTitle().contains("Fare Locked")))
                .collect(Collectors.toList());
    }

    public void deleteNotification(String id) {
        deleteNotification(id, null);
    }

    public void deleteNotification(String id, String userId) {
        if (id == null) return;
        java.util.Optional<Notification> opt = notificationRepository.findById(id);
        if (!opt.isPresent()) return;

        Notification notif = opt.get();
        if ("ALL".equalsIgnoreCase(notif.getUserId())) {
            if (userId != null && !userId.trim().isEmpty() && !"ALL".equalsIgnoreCase(userId)) {
                if (notif.getDismissedUserIds() == null) {
                    notif.setDismissedUserIds(new java.util.ArrayList<>());
                }
                if (!notif.getDismissedUserIds().contains(userId.trim())) {
                    notif.getDismissedUserIds().add(userId.trim());
                    notificationRepository.save(notif);
                }
            } else {
                notificationRepository.deleteById(id);
            }
        } else {
            notificationRepository.deleteById(id);
        }
    }
}
