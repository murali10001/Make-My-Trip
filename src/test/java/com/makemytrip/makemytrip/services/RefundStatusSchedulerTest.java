package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.services.RefundServiceTest.StubRefundRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RefundStatusSchedulerTest {

    private RefundStatusScheduler scheduler;
    private StubRefundRepository refundRepository;
    private TestNotificationService notificationService;
    private TestRefundService refundService;

    @BeforeEach
    void setUp() {
        scheduler = new RefundStatusScheduler();
        refundRepository = new StubRefundRepository();
        notificationService = new TestNotificationService();
        refundService = new TestRefundService();

        ReflectionTestUtils.setField(scheduler, "refundRepository", refundRepository);
        ReflectionTestUtils.setField(scheduler, "refundRequestRepository", refundRepository);
        ReflectionTestUtils.setField(scheduler, "notificationService", notificationService);
        ReflectionTestUtils.setField(scheduler, "refundService", refundService);
        ReflectionTestUtils.setField(refundService, "refundRepository", refundRepository);
        ReflectionTestUtils.setField(refundService, "refundRequestRepository", refundRepository);
    }

    @Test
    @DisplayName("Scheduler initializes lastUpdatedEpochMs when missing")
    void testMonitorRefundStatuses_InitializesTimestamp() {
        RefundRequest request = new RefundRequest();
        request.setRefundId("RF-INIT-1");
        request.setStatus("REQUESTED");
        request.setLastUpdatedEpochMs(0);
        refundRepository.save(request);

        scheduler.monitorRefundStatuses();

        RefundRequest updated = refundRepository.findByRefundId("RF-INIT-1").orElse(null);
        assertNotNull(updated);
        assertTrue(updated.getLastUpdatedEpochMs() > 0);
        assertEquals("REQUESTED", updated.getStatus());
    }

    @Test
    @DisplayName("Scheduler transitions REQUESTED to APPROVED after delay")
    void testMonitorRefundStatuses_TransitionsRequestedToApproved() {
        RefundRequest request = new RefundRequest();
        request.setRefundId("RF-REQ-1");
        request.setBookingId("BK-1");
        request.setUserId("USR-1");
        request.setStatus("REQUESTED");
        request.setCurrentStep(1);
        request.setLastUpdatedEpochMs(System.currentTimeMillis() - 4000L);
        refundRepository.save(request);

        scheduler.monitorRefundStatuses();

        RefundRequest updated = refundRepository.findByRefundId("RF-REQ-1").orElse(null);
        assertNotNull(updated);
        assertEquals("APPROVED", updated.getStatus());
        assertEquals(2, updated.getCurrentStep());
        assertTrue(updated.getEstimatedCompletionDate().contains("Approved"));
        assertFalse(notificationService.notifications.isEmpty());
        assertFalse(refundService.broadcasts.isEmpty());
    }

    @Test
    @DisplayName("Scheduler transitions APPROVED to PROCESSING after delay and assigns bank reference")
    void testMonitorRefundStatuses_TransitionsApprovedToProcessing() {
        RefundRequest request = new RefundRequest();
        request.setRefundId("RF-APP-1");
        request.setBookingId("BK-2");
        request.setUserId("USR-2");
        request.setStatus("APPROVED");
        request.setCurrentStep(2);
        request.setLastUpdatedEpochMs(System.currentTimeMillis() - 5000L);
        refundRepository.save(request);

        scheduler.monitorRefundStatuses();

        RefundRequest updated = refundRepository.findByRefundId("RF-APP-1").orElse(null);
        assertNotNull(updated);
        assertEquals("PROCESSING", updated.getStatus());
        assertEquals(2, updated.getCurrentStep());
        assertNotNull(updated.getTransactionRef());
        assertTrue(updated.getTransactionRef().startsWith("REF-BANK-") || updated.getTransactionRef().startsWith("ARN-"));
    }

    @Test
    @DisplayName("Scheduler transitions PROCESSING to COMPLETED after delay and assigns UTR reference")
    void testMonitorRefundStatuses_TransitionsProcessingToCompleted() {
        RefundRequest request = new RefundRequest();
        request.setRefundId("RF-PRC-1");
        request.setBookingId("BK-3");
        request.setUserId("USR-3");
        request.setStatus("PROCESSING");
        request.setCurrentStep(2);
        request.setTransactionRef("REF-BANK-123456");
        request.setLastUpdatedEpochMs(System.currentTimeMillis() - 6000L);
        refundRepository.save(request);

        scheduler.monitorRefundStatuses();

        RefundRequest updated = refundRepository.findByRefundId("RF-PRC-1").orElse(null);
        assertNotNull(updated);
        assertEquals("COMPLETED", updated.getStatus());
        assertEquals(3, updated.getCurrentStep());
        assertNotNull(updated.getTransactionRef());
        assertTrue(updated.getTransactionRef().startsWith("UTR") || updated.getTransactionRef().startsWith("ARN-"));
    }

    @Test
    @DisplayName("Scheduler handles legacy PENDING and PROCESSED statuses gracefully")
    void testMonitorRefundStatuses_HandlesLegacyStatuses() {
        RefundRequest pending = new RefundRequest();
        pending.setRefundId("RF-LEG-PEND");
        pending.setStatus("PENDING");
        pending.setLastUpdatedEpochMs(System.currentTimeMillis() - 4000L);
        refundRepository.save(pending);

        RefundRequest processed = new RefundRequest();
        processed.setRefundId("RF-LEG-PROC");
        processed.setStatus("PROCESSED");
        processed.setLastUpdatedEpochMs(System.currentTimeMillis() - 6000L);
        refundRepository.save(processed);

        scheduler.monitorRefundStatuses();

        RefundRequest updatedPending = refundRepository.findByRefundId("RF-LEG-PEND").orElse(null);
        assertNotNull(updatedPending);
        assertEquals("APPROVED", updatedPending.getStatus());

        RefundRequest updatedProcessed = refundRepository.findByRefundId("RF-LEG-PROC").orElse(null);
        assertNotNull(updatedProcessed);
        assertEquals("COMPLETED", updatedProcessed.getStatus());
    }

    static class TestNotificationService extends NotificationService {
        List<String> notifications = new ArrayList<>();
        @Override
        public Notification createNotification(String userId, String title, String desc, String type) {
            notifications.add(title + ": " + desc);
            return new Notification("N-1", userId, title, desc, "now", type);
        }
    }

    static class TestRefundService extends RefundService {
        List<Map<String, Object>> broadcasts = new ArrayList<>();
        @Override
        public void broadcastRefundUpdate(Map<String, Object> updateData) {
            broadcasts.add(updateData);
        }
    }
}
