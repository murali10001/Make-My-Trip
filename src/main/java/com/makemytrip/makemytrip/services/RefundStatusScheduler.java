package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RefundStatusScheduler {

    @Autowired
    private RefundRepository refundRepository;

    @Autowired
    private NotificationService notificationService;

    // Time intervals for banking workflow simulation:
    // PENDING -> PROCESSED: 5 seconds delay
    // PROCESSED -> COMPLETED: 10 seconds delay
    private static final long STEP_1_TO_2_DELAY_MS = 5_000L;
    private static final long STEP_2_TO_3_DELAY_MS = 10_000L;

    @Scheduled(fixedRate = 2000)
    public void monitorRefundStatuses() {
        long nowMs = System.currentTimeMillis();
        List<RefundRequest> refunds = refundRepository.findAll();

        for (RefundRequest refund : refunds) {
            if (refund == null || refund.getStatus() == null) continue;

            String status = refund.getStatus().toUpperCase();

            // Initialize lastUpdatedEpochMs for legacy records if 0
            if (refund.getLastUpdatedEpochMs() <= 0) {
                refund.setLastUpdatedEpochMs(nowMs);
                refundRepository.save(refund);
                continue;
            }

            long elapsedMs = nowMs - refund.getLastUpdatedEpochMs();

            if ("PENDING".equals(status)) {
                if (elapsedMs >= STEP_1_TO_2_DELAY_MS) {
                    String bankRef = "REF-BANK-" + (100000 + (int)(Math.random() * 900000));
                    refund.setStatus("PROCESSED");
                    refund.setCurrentStep(2);
                    refund.setTransactionRef(bankRef);
                    refund.setEstimatedCompletionDate("Processing with Bank / Payment Gateway (" + bankRef + ")");
                    refund.setLastUpdatedEpochMs(nowMs);
                    refundRepository.save(refund);

                    System.out.println("[REAL-TIME REFUND SCHEDULER] Refund " + refund.getRefundId() + " passed 5s verification. Status updated to PROCESSED (" + bankRef + ")");

                    // Notify User in MongoDB
                    if (notificationService != null) {
                        String targetUser = refund.getUserId() != null && !refund.getUserId().trim().isEmpty() ? refund.getUserId() : "ALL";
                        notificationService.createNotification(
                            targetUser,
                            "Refund Status Update: PROCESSED",
                            "Refund " + refund.getRefundId() + " for Booking " + refund.getBookingId() + " is now PROCESSED by bank (" + bankRef + ").",
                            "refund"
                        );
                        if (!"ALL".equals(targetUser)) {
                            notificationService.createNotification(
                                "ALL",
                                "Refund Status Update: PROCESSED (" + refund.getRefundId() + ")",
                                "Refund " + refund.getRefundId() + " for Booking " + refund.getBookingId() + " is now PROCESSED by bank (" + bankRef + ").",
                                "refund"
                            );
                        }
                    }
                }
            } else if ("PROCESSED".equals(status)) {
                if (elapsedMs >= STEP_2_TO_3_DELAY_MS) {
                    String utrRef = "UTR" + (1000000000L + (long)(Math.random() * 9000000000L));
                    refund.setStatus("COMPLETED");
                    refund.setCurrentStep(3);
                    refund.setTransactionRef(utrRef);
                    refund.setEstimatedCompletionDate("Completed & Credited to Source Account (Ref No: " + utrRef + ")");
                    refund.setLastUpdatedEpochMs(nowMs);
                    refundRepository.save(refund);

                    System.out.println("[REAL-TIME REFUND SCHEDULER] Refund " + refund.getRefundId() + " passed 10s clearance. Status updated to COMPLETED (UTR: " + utrRef + ")");

                    // Notify User in MongoDB
                    if (notificationService != null) {
                        String targetUser = refund.getUserId() != null && !refund.getUserId().trim().isEmpty() ? refund.getUserId() : "ALL";
                        notificationService.createNotification(
                            targetUser,
                            "Refund Completed & Credited",
                            "Refund " + refund.getRefundId() + " (INR " + refund.getRefundAmount() + ") has been COMPLETED and credited (UTR: " + utrRef + ").",
                            "refund"
                        );
                        if (!"ALL".equals(targetUser)) {
                            notificationService.createNotification(
                                "ALL",
                                "Refund Completed & Credited (" + refund.getRefundId() + ")",
                                "Refund " + refund.getRefundId() + " (INR " + refund.getRefundAmount() + ") has been COMPLETED and credited (UTR: " + utrRef + ").",
                                "refund"
                            );
                        }
                    }
                }
            }
        }
    }

}
