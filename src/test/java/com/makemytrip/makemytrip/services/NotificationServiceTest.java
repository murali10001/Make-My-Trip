package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private Notification broadcastNotif;
    private Notification userNotif;

    @BeforeEach
    void setUp() {
        broadcastNotif = new Notification("N-1", "ALL", "Flight AI-202 Delayed", "Delayed by 30 mins", "15 Oct, 07:30 PM", "flight");
        userNotif = new Notification("N-2", "USR-101", "Booking Confirmed", "Your seat is confirmed", "15 Oct, 07:35 PM", "flight");
    }

    @Test
    void testGetNotificationsForUser_UsesTargetedLookup() {
        when(notificationRepository.findByUserIdIn(anyList()))
                .thenReturn(new ArrayList<>(List.of(broadcastNotif, userNotif)));

        List<Notification> result = notificationService.getNotificationsForUser("USR-101");

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(notificationRepository, never()).findAll();
        verify(notificationRepository).findByUserIdIn(argThat(list -> list.contains("USR-101") && list.contains("ALL")));
    }

    @Test
    void testDismissBroadcastNotification_DoesNotDeleteFromDatabaseForOthers() {
        when(notificationRepository.findById("N-1")).thenReturn(Optional.of(broadcastNotif));

        notificationService.deleteNotification("N-1", "USR-101");

        verify(notificationRepository, never()).deleteById("N-1");

        assertTrue(broadcastNotif.getDismissedUserIds().contains("USR-101"));
        verify(notificationRepository).save(broadcastNotif);
    }

    @Test
    void testGetNotificationsForUser_FiltersOutDismissedBroadcast() {
        broadcastNotif.getDismissedUserIds().add("USR-101");
        when(notificationRepository.findByUserIdIn(anyList()))
                .thenReturn(new ArrayList<>(List.of(broadcastNotif, userNotif)));

        List<Notification> result = notificationService.getNotificationsForUser("USR-101");

        assertEquals(1, result.size());
        assertEquals("N-2", result.get(0).getId());
    }

    @Test
    void testDeleteUserSpecificNotification_DeletesFromDatabase() {
        when(notificationRepository.findById("N-2")).thenReturn(Optional.of(userNotif));

        notificationService.deleteNotification("N-2", "USR-101");

        verify(notificationRepository).deleteById("N-2");
    }

    @Test
    void testClearAllForUser_DeletesUserSpecificAndDismissesBroadcast() {
        when(notificationRepository.findByUserId("USR-101")).thenReturn(List.of(userNotif));
        when(notificationRepository.findByUserIdIn(List.of("ALL", "all"))).thenReturn(List.of(broadcastNotif));

        notificationService.clearAllForUser("USR-101");

        verify(notificationRepository).deleteById("N-2");
        assertTrue(broadcastNotif.getDismissedUserIds().contains("USR-101"));
        verify(notificationRepository).save(broadcastNotif);
    }

    @Test
    void testMarkAllAsReadForUser_MarksUserSpecificRead() {
        when(notificationRepository.findByUserId("USR-101")).thenReturn(List.of(userNotif));

        notificationService.markAllAsReadForUser("USR-101");

        assertTrue(userNotif.isRead());
        verify(notificationRepository).save(userNotif);
    }
}
