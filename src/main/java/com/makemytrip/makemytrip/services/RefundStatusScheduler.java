package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import com.makemytrip.makemytrip.repositories.RefundRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class RefundStatusScheduler {

    @Autowired(required = false)
    private RefundRequestRepository refundRequestRepository;

    @Autowired(required = false)
    private RefundRepository refundRepository;

    private RefundRepository getRefundRepository() {
        return refundRequestRepository != null ? refundRequestRepository : refundRepository;
    }

    @Autowired(required = false)
    private NotificationService notificationService;

    @Autowired(required = false)
    private RefundService refundService;

    private static final long STEP_REQUESTED_TO_APPROVED_DELAY_MS = 3_000L;
    private static final long STEP_APPROVED_TO_PROCESSING_DELAY_MS = 4_000L;
    private static final long STEP_PROCESSING_TO_COMPLETED_DELAY_MS = 5_000L;

    @Scheduled(fixedRate = 2000)
    public void monitorRefundStatuses() {
        RefundRepository repo = getRefundRepository();
        if (repo == null) return;

        long nowMs = System.currentTimeMillis();

        List<RefundRequest> refunds = repo.findByStatusIn(
                List.of("REQUESTED", "PENDING", "APPROVED", "PROCESSING", "PROCESSED")
        );

        for (RefundRequest refund : refunds) {
            if (refund == null || refund.getStatus() == null) continue;

            String status = refund.getStatus().toUpperCase();

            if (refund.getLastUpdatedEpochMs() <= 0) {
                refund.setLastUpdatedEpochMs(nowMs);
                repo.save(refund);
                continue;
            }

            long elapsedMs = nowMs - refund.getLastUpdatedEpochMs();

            if ("REQUESTED".equals(status) || "PENDING".equals(status)) {
                if (elapsedMs >= STEP_REQUESTED_TO_APPROVED_DELAY_MS) {
                    refund.setStatus("APPROVED");
                    refund.setCurrentStep(2);
                    refund.setEstimatedCompletionDate("Approved - Forwarding to Payment Gateway");
                    refund.setLastUpdatedEpochMs(nowMs);
                    repo.save(refund);

                    if (notificationService != null) {
                        String targetUser = refund.getUserId() != null && !refund.getUserId().trim().isEmpty() ? refund.getUserId() : "ALL";
                        notificationService.createNotification(
                                targetUser,
                                "Refund Status Update: APPROVED",
                                "Refund " + refund.getRefundId() + " for Booking " + refund.getBookingId() + " has been APPROVED and forwarded to bank gateway.",
                                "refund"
                        );
                    }

                    if (refundService != null) {
                        Map<String, Object> broadcast = new HashMap<>();
                        broadcast.put("type", "REFUND_STATUS_UPDATE");
                        broadcast.put("refundId", refund.getRefundId());
                        broadcast.put("bookingId", refund.getBookingId());
                        broadcast.put("userId", refund.getUserId());
                        broadcast.put("status", "APPROVED");
                        broadcast.put("currentStep", 2);
                        broadcast.put("transactionRef", refund.getTransactionRef());
                        broadcast.put("estimatedCompletionDate", refund.getEstimatedCompletionDate());
                        broadcast.put("timestamp", LocalDateTime.now().toString());
                        refundService.broadcastRefundUpdate(broadcast);
                    }
                }
            } else if ("APPROVED".equals(status)) {
                if (elapsedMs >= STEP_APPROVED_TO_PROCESSING_DELAY_MS) {
                    if (refundService != null) {
                        refundService.updateRefundStatus(refund.getRefundId(), "PROCESSING");
                    } else {
                        refund.setStatus("PROCESSING");
                        refund.setCurrentStep(2);
                        refund.setTransactionRef("ARN-700109283912");
                        refund.setEstimatedCompletionDate("Processing with Bank / Payment Gateway (" + refund.getTransactionRef() + ")");
                        refund.setLastUpdatedEpochMs(nowMs);
                        repo.save(refund);
                    }
                }
            } else if ("PROCESSING".equals(status) || "PROCESSED".equals(status)) {
                if (elapsedMs >= STEP_PROCESSING_TO_COMPLETED_DELAY_MS) {
                    if (refundService != null) {
                        refundService.updateRefundStatus(refund.getRefundId(), "COMPLETED");
                    } else {
                        refund.setStatus("COMPLETED");
                        refund.setCurrentStep(3);
                        refund.setTransactionRef("ARN-700109283912");
                        refund.setEstimatedCompletionDate("Completed & Credited to Source Account (Ref No: " + refund.getTransactionRef() + ")");
                        refund.setLastUpdatedEpochMs(nowMs);
                        repo.save(refund);
                    }
                }
            }
        }
    }
}
