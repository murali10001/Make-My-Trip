package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    private final Map<String, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public void addEmitter(String userId, SseEmitter emitter) {
        String key = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "ALL";
        userEmitters.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(key, emitter));
        emitter.onTimeout(() -> removeEmitter(key, emitter));
        emitter.onError((e) -> removeEmitter(key, emitter));
    }

    public void removeEmitter(String userId, SseEmitter emitter) {
        String key = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "ALL";
        List<SseEmitter> list = userEmitters.get(key);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                userEmitters.remove(key);
            }
        }
    }

    public void broadcastRealTimeNotification(Notification notif) {
        if (notif == null) return;

        List<SseEmitter> targets = new ArrayList<>();
        String targetUser = notif.getUserId();

        if (targetUser != null && userEmitters.containsKey(targetUser)) {
            targets.addAll(userEmitters.get(targetUser));
        }
        if (!"ALL".equalsIgnoreCase(targetUser) && userEmitters.containsKey("ALL")) {
            targets.addAll(userEmitters.get("ALL"));
        } else if ("ALL".equalsIgnoreCase(targetUser)) {
            for (List<SseEmitter> list : userEmitters.values()) {
                targets.addAll(list);
            }
        }

        for (SseEmitter emitter : targets) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notif));
            } catch (Exception e) {
                // dead emitter will be cleaned up on error/completion
            }
        }
    }

    public Notification createNotification(String userId, String title, String desc, String type) {
        if (userId == null || userId.trim().isEmpty()) {
            userId = "ALL";
        }
        String id = "NOTIF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String timeStr = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM, hh:mm a"));
        Notification notif = new Notification(id, userId, title, desc, timeStr, type);
        notif.setCreatedAt(System.currentTimeMillis());
        notif.setRead(false);
        Notification saved = notificationRepository.save(notif);
        broadcastRealTimeNotification(saved);
        return saved;
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
                .sorted((a, b) -> {
                    long t1 = a.getCreatedAt() != null ? a.getCreatedAt() : 0L;
                    long t2 = b.getCreatedAt() != null ? b.getCreatedAt() : 0L;
                    return Long.compare(t2, t1);
                })
                .limit(30)
                .collect(Collectors.toList());
    }

    public void clearAllForUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) return;
        String clean = userId.trim();

        List<Notification> userSpecific = notificationRepository.findByUserId(clean);
        for (Notification n : userSpecific) {
            notificationRepository.deleteById(n.getId());
        }

        List<Notification> allNotifs = notificationRepository.findByUserIdIn(List.of("ALL", "all"));
        for (Notification n : allNotifs) {
            if (n.getDismissedUserIds() == null) {
                n.setDismissedUserIds(new ArrayList<>());
            }
            if (!n.getDismissedUserIds().contains(clean)) {
                n.getDismissedUserIds().add(clean);
                notificationRepository.save(n);
            }
        }
    }

    public void markAllAsReadForUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) return;
        String clean = userId.trim();

        List<Notification> userSpecific = notificationRepository.findByUserId(clean);
        for (Notification n : userSpecific) {
            n.setRead(true);
            notificationRepository.save(n);
        }
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

