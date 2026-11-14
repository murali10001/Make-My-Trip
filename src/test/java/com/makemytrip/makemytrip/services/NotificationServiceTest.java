package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

public class NotificationServiceTest {

    private NotificationService notificationService;
    private TestNotificationRepository notificationRepository;

    private Notification broadcastNotif;
    private Notification userNotif;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService();
        notificationRepository = new TestNotificationRepository();
        ReflectionTestUtils.setField(notificationService, "notificationRepository", notificationRepository);

        broadcastNotif = new Notification("N-1", "ALL", "Flight AI-202 Delayed", "Delayed by 30 mins", "15 Oct, 07:30 PM", "flight");
        userNotif = new Notification("N-2", "USR-101", "Booking Confirmed", "Your seat is confirmed", "15 Oct, 07:35 PM", "flight");

        notificationRepository.save(broadcastNotif);
        notificationRepository.save(userNotif);
    }

    @Test
    void testGetNotificationsForUser_UsesTargetedLookup() {
        List<Notification> result = notificationService.getNotificationsForUser("USR-101");

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    void testDismissBroadcastNotification_DoesNotDeleteFromDatabaseForOthers() {
        notificationService.deleteNotification("N-1", "USR-101");

        assertTrue(notificationRepository.findById("N-1").isPresent());

        assertTrue(broadcastNotif.getDismissedUserIds().contains("USR-101"));
    }

    @Test
    void testGetNotificationsForUser_FiltersOutDismissedBroadcast() {
        broadcastNotif.getDismissedUserIds().add("USR-101");

        List<Notification> result = notificationService.getNotificationsForUser("USR-101");

        assertEquals(1, result.size());
        assertEquals("N-2", result.get(0).getId());
    }

    @Test
    void testDeleteUserSpecificNotification_DeletesFromDatabase() {
        notificationService.deleteNotification("N-2", "USR-101");

        assertFalse(notificationRepository.findById("N-2").isPresent());
    }

    @Test
    void testClearAllForUser_DeletesUserSpecificAndDismissesBroadcast() {
        notificationService.clearAllForUser("USR-101");

        assertFalse(notificationRepository.findById("N-2").isPresent());
        assertTrue(broadcastNotif.getDismissedUserIds().contains("USR-101"));
    }

    @Test
    void testMarkAllAsReadForUser_MarksUserSpecificRead() {
        notificationService.markAllAsReadForUser("USR-101");

        assertTrue(userNotif.isRead());
    }

    static class TestNotificationRepository implements NotificationRepository {
        Map<String, Notification> db = new HashMap<>();

        @Override
        public List<Notification> findByUserIdOrUserId(String userId, String global) {
            List<Notification> res = new ArrayList<>();
            for (Notification n : db.values()) {
                if ((userId != null && userId.equalsIgnoreCase(n.getUserId())) ||
                    (global != null && global.equalsIgnoreCase(n.getUserId()))) {
                    res.add(n);
                }
            }
            return res;
        }

        @Override
        public List<Notification> findByUserId(String userId) {
            List<Notification> res = new ArrayList<>();
            for (Notification n : db.values()) {
                if (userId != null && userId.equalsIgnoreCase(n.getUserId())) {
                    res.add(n);
                }
            }
            return res;
        }

        @Override
        public List<Notification> findByUserIdIn(List<String> userIds) {
            List<Notification> res = new ArrayList<>();
            for (Notification n : db.values()) {
                if (userIds.stream().anyMatch(uid -> uid.equalsIgnoreCase(n.getUserId()))) {
                    res.add(n);
                }
            }
            return res;
        }

        @Override
        public <S extends Notification> S save(S entity) {
            db.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<Notification> findById(String s) {
            return Optional.ofNullable(db.get(s));
        }

        @Override
        public void deleteById(String s) {
            db.remove(s);
        }

        @Override public <S extends Notification> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public List<Notification> findAll() { return new ArrayList<>(db.values()); }
        @Override public List<Notification> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return db.size(); }
        @Override public void delete(Notification entity) { db.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Notification> entities) {}
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Notification> findAll(Sort sort) { return null; }
        @Override public Page<Notification> findAll(Pageable pageable) { return null; }
        @Override public <S extends Notification> S insert(S entity) { return save(entity); }
        @Override public <S extends Notification> List<S> insert(Iterable<S> entities) { return null; }
        @Override public <S extends Notification> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Notification> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends Notification> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends Notification> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Notification> long count(Example<S> example) { return 0; }
        @Override public <S extends Notification> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Notification, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }
}

