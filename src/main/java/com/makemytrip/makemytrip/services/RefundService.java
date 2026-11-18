package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.CancellationNotAllowedException;
import com.makemytrip.makemytrip.exceptions.RefundNotFoundException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import com.makemytrip.makemytrip.repositories.RefundRequestRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class RefundService {

    public static final List<String> PREDEFINED_REASONS = List.of(
            "Change of travel plans",
            "Flight/hotel rescheduled by carrier",
            "Medical / Personal emergency",
            "Found cheaper rate elsewhere",
            "Booked by mistake / duplicate",
            "Other / Operational reasons"
    );

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private RefundRequestRepository refundRequestRepository;

    @Autowired(required = false)
    private RefundRepository refundRepository;

    private RefundRepository getRefundRepository() {
        return refundRequestRepository != null ? refundRequestRepository : refundRepository;
    }

    @Autowired(required = false)
    private FlightRepository flightRepository;

    @Autowired(required = false)
    private HotelRepository hotelRepository;

    @Autowired(required = false)
    private SelectionService selectionService;

    @Autowired(required = false)
    private NotificationService notificationService;

    private final CopyOnWriteArrayList<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public Map<String, Object> calculateRefundPreview(String userId, String bookingId) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Booking booking = findBookingInUser(user, bookingId);
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new CancellationNotAllowedException("Booking '" + bookingId + "' has already been cancelled.");
        }

        double originalAmount = booking.getTotalPrice();
        LocalDateTime scheduledTime = resolveScheduledDepartureTime(booking);
        long hoursRemaining = scheduledTime != null
                ? java.time.Duration.between(LocalDateTime.now(), scheduledTime).toHours()
                : 0;

        double refundPercentage;
        String policyApplied;

        if (hoursRemaining > 72) {
            refundPercentage = 90.0;
            policyApplied = "Flexible Advance Cancellation Policy (>72h before departure: 90% Refund)";
        } else if (hoursRemaining >= 24) {
            refundPercentage = 75.0;
            policyApplied = "Standard Cancellation Policy (24-72h before departure: 75% Refund)";
        } else {
            refundPercentage = 50.0;
            policyApplied = "Last-Minute Cancellation Policy (<24h before departure: 50% Refund)";
        }

        double refundAmount = Math.round((originalAmount * (refundPercentage / 100.0)) * 100.0) / 100.0;
        double deductionAmount = Math.round((originalAmount - refundAmount) * 100.0) / 100.0;

        Map<String, Object> preview = new HashMap<>();
        preview.put("bookingId", bookingId);
        preview.put("bookingType", booking.getType());
        preview.put("originalAmount", originalAmount);
        preview.put("refundPercentage", refundPercentage);
        preview.put("refundAmount", refundAmount);
        preview.put("deductionAmount", deductionAmount);
        preview.put("policyApplied", policyApplied);
        preview.put("status", "ELIGIBLE");

        return preview;
    }

    public RefundRequest processCancellationAndRequestRefund(String userId, String bookingId, String reason, String comment) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("A cancellation reason must be selected from the predefined list.");
        }

        String trimmedReason = reason.trim();
        boolean validReason = PREDEFINED_REASONS.stream()
                .anyMatch(r -> r.equalsIgnoreCase(trimmedReason) || trimmedReason.toLowerCase().contains(r.toLowerCase()));
        if (!validReason && !trimmedReason.toLowerCase().contains("reason")) {

            validReason = trimmedReason.length() >= 5;
        }

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Booking booking = findBookingInUser(user, bookingId);
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new CancellationNotAllowedException("Booking '" + bookingId + "' is already cancelled.");
        }

        Map<String, Object> preview = calculateRefundPreview(userId, bookingId);
        double originalAmount = (double) preview.get("originalAmount");
        double refundAmount = (double) preview.get("refundAmount");
        double refundPercentage = (double) preview.get("refundPercentage");
        String policyApplied = (String) preview.get("policyApplied");

        String refundId = "RF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        booking.setStatus("CANCELLED");
        booking.setCancellationReason(trimmedReason);
        booking.setRefundId(refundId);
        userRepository.save(user);

        restoreInventory(booking);

        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setRefundId(refundId);
        refundRequest.setBookingId(bookingId);
        refundRequest.setUserId(userId);
        refundRequest.setUserEmail(user.getEmail());
        refundRequest.setBookingType(booking.getType());
        refundRequest.setOriginalAmount(originalAmount);
        refundRequest.setRefundAmount(refundAmount);
        refundRequest.setRefundPercentage(refundPercentage);
        refundRequest.setCancellationReason(trimmedReason);
        refundRequest.setComment(comment != null ? comment : "");
        refundRequest.setRequestDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        refundRequest.setStatus("REQUESTED");
        refundRequest.setCurrentStep(1);
        refundRequest.setPolicyApplied(policyApplied);

        String estDate = LocalDate.now().plusDays(2).format(DateTimeFormatter.ofPattern("MMM dd, yyyy"));
        refundRequest.setEstimatedCompletionDate("Expected by " + estDate + " (2-3 business days)");

        RefundRequest savedRequest = getRefundRepository().save(refundRequest);

        if (notificationService != null) {
            notificationService.createNotification(
                    userId,
                    "Booking Cancelled & Refund Initiated",
                    "Booking " + bookingId + " cancelled. Refund ID " + refundId + " for ₹" + refundAmount + " is currently REQUESTED.",
                    "cancellation"
            );
        }

        Map<String, Object> broadcast = new HashMap<>();
        broadcast.put("type", "REFUND_CREATED");
        broadcast.put("refundId", refundId);
        broadcast.put("bookingId", bookingId);
        broadcast.put("userId", userId);
        broadcast.put("status", "REQUESTED");
        broadcast.put("currentStep", 1);
        broadcast.put("refundAmount", refundAmount);
        broadcast.put("policyApplied", policyApplied);
        broadcast.put("estimatedCompletionDate", refundRequest.getEstimatedCompletionDate());
        broadcast.put("timestamp", LocalDateTime.now().toString());
        broadcastRefundUpdate(broadcast);

        return savedRequest;
    }

    public List<RefundRequest> getAllRefunds() {
        return getRefundRepository().findAll();
    }

    public List<RefundRequest> getUserRefunds(String userId) {
        if (userId == null || userId.trim().isEmpty() || "null".equalsIgnoreCase(userId)) {
            return Collections.emptyList();
        }
        return getRefundRepository().findByUserId(userId.trim());
    }

    public RefundRequest getRefundByRefundId(String refundId) {
        return getRefundRepository().findByRefundId(refundId)
                .orElseThrow(() -> new RefundNotFoundException("Refund request with ID '" + refundId + "' not found"));
    }

    public RefundRequest updateRefundStatus(String refundId, String newStatus) {
        RefundRequest refund = getRefundByRefundId(refundId);
        String upperStatus = newStatus.toUpperCase();

        refund.setStatus(upperStatus);
        if ("REQUESTED".equals(upperStatus) || "PENDING".equals(upperStatus)) {
            refund.setCurrentStep(1);
        } else if ("APPROVED".equals(upperStatus)) {
            refund.setCurrentStep(2);
            refund.setEstimatedCompletionDate("Approved - Forwarding to Payment Gateway");
        } else if ("PROCESSING".equals(upperStatus) || "PROCESSED".equals(upperStatus)) {
            refund.setCurrentStep(2);
            if (refund.getTransactionRef() == null || refund.getTransactionRef().isEmpty()) {
                refund.setTransactionRef("REF-BANK-" + (100000 + (int)(Math.random() * 900000)));
            }
            refund.setEstimatedCompletionDate("Processing with Bank / Payment Gateway (" + refund.getTransactionRef() + ")");
        } else if ("COMPLETED".equals(upperStatus)) {
            refund.setCurrentStep(3);
            if (refund.getTransactionRef() == null || !refund.getTransactionRef().startsWith("UTR")) {
                refund.setTransactionRef("UTR" + (1000000000L + (long)(Math.random() * 9000000000L)));
            }
            refund.setEstimatedCompletionDate("Completed & Credited to Source Account (Ref No: " + refund.getTransactionRef() + ")");
        } else if ("REJECTED".equals(upperStatus)) {
            refund.setCurrentStep(0);
            refund.setEstimatedCompletionDate("Cancellation Rejected");
        }
        refund.setLastUpdatedEpochMs(System.currentTimeMillis());

        RefundRequest updated = getRefundRepository().save(refund);

        if (notificationService != null) {
            notificationService.createNotification(
                    refund.getUserId(),
                    "Refund Status Update (" + refundId + ")",
                    "Your refund for booking " + refund.getBookingId() + " is now " + upperStatus + ". Amount: ₹" + refund.getRefundAmount(),
                    "refund"
            );
        }

        Map<String, Object> broadcast = new HashMap<>();
        broadcast.put("type", "REFUND_STATUS_UPDATE");
        broadcast.put("refundId", refund.getRefundId());
        broadcast.put("bookingId", refund.getBookingId());
        broadcast.put("userId", refund.getUserId());
        broadcast.put("status", updated.getStatus());
        broadcast.put("currentStep", updated.getCurrentStep());
        broadcast.put("estimatedCompletionDate", updated.getEstimatedCompletionDate());
        broadcast.put("transactionRef", updated.getTransactionRef());
        broadcast.put("timestamp", LocalDateTime.now().toString());
        broadcastRefundUpdate(broadcast);

        return updated;
    }

    private LocalDateTime resolveScheduledDepartureTime(Booking booking) {
        if (booking == null) return null;
        if (booking.getDate() != null && !booking.getDate().trim().isEmpty()) {
            String dateStr = booking.getDate().trim();
            try {
                if (dateStr.contains("T")) {
                    return LocalDateTime.parse(dateStr);
                }
                if (dateStr.contains(" ")) {
                    try {
                        return LocalDateTime.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm[:ss]"));
                    } catch (Exception ignored) {}
                }
                LocalDate localDate = LocalDate.parse(dateStr);
                if ("Flight".equalsIgnoreCase(booking.getType()) && flightRepository != null && booking.getTargetId() != null) {
                    try {
                        Flight flight = flightRepository.findById(booking.getTargetId()).orElse(null);
                        if (flight != null && flight.getDepartureTime() != null && !flight.getDepartureTime().trim().isEmpty()) {
                            String dep = flight.getDepartureTime().trim();
                            if (dep.contains("T")) {
                                return LocalDateTime.parse(dep);
                            }
                            LocalTime time = parseLocalTime(dep);
                            return localDate.atTime(time);
                        }
                    } catch (Exception ignored) {}
                }
                if ("Hotel".equalsIgnoreCase(booking.getType())) {
                    return localDate.atTime(12, 0);
                }
                return localDate.atTime(10, 0);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private LocalTime parseLocalTime(String timeStr) {
        try {
            return LocalTime.parse(timeStr);
        } catch (Exception e1) {
            try {
                return LocalTime.parse(timeStr.toUpperCase(), DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH));
            } catch (Exception e2) {
                try {
                    return LocalTime.parse(timeStr.toUpperCase(), DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH));
                } catch (Exception e3) {
                    return LocalTime.of(10, 0);
                }
            }
        }
    }

    private Booking findBookingInUser(Users user, String bookingId) {
        if (user.getBookings() == null) {
            throw new CancellationNotAllowedException("No bookings found for user.");
        }
        String cleanId = (bookingId != null) ? bookingId.trim() : "";
        return user.getBookings().stream()
                .filter(b -> b.getBookingId() != null && b.getBookingId().trim().equalsIgnoreCase(cleanId))
                .findFirst()
                .orElseThrow(() -> new CancellationNotAllowedException("Booking with ID '" + bookingId + "' not found in user record."));
    }

    private void restoreInventory(Booking booking) {
        if (booking.getTargetId() == null || booking.getTargetId().trim().isEmpty()) {
            return;
        }

        try {
            if ("Flight".equalsIgnoreCase(booking.getType())) {
                if (flightRepository != null) {
                    Flight flight = flightRepository.findById(booking.getTargetId()).orElse(null);
                    if (flight != null) {
                        flight.setAvailableSeats(flight.getAvailableSeats() + booking.getQuantity());
                        flightRepository.save(flight);
                    }
                }
                if (booking.getSeatNo() != null && !booking.getSeatNo().trim().isEmpty() && selectionService != null) {
                    selectionService.releaseSeat(booking.getTargetId(), booking.getSeatNo().trim());
                }
            } else if ("Hotel".equalsIgnoreCase(booking.getType())) {
                if (hotelRepository != null) {
                    Hotel hotel = hotelRepository.findById(booking.getTargetId()).orElse(null);
                    if (hotel != null) {
                        hotel.setAvailableRooms(hotel.getAvailableRooms() + booking.getQuantity());
                        hotelRepository.save(hotel);
                    }
                }
                if (booking.getRoomTypeName() != null && !booking.getRoomTypeName().trim().isEmpty() && selectionService != null) {
                    selectionService.releaseRoomOption(booking.getTargetId(), booking.getRoomTypeName().trim(), booking.getQuantity());
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to restore inventory for booking target " + booking.getTargetId() + ": " + e.getMessage());
        }
    }

    public SseEmitter registerSseClient() {
        SseEmitter emitter = new SseEmitter(180_000L);
        sseEmitters.add(emitter);

        emitter.onCompletion(() -> sseEmitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            sseEmitters.remove(emitter);
        });
        emitter.onError((e) -> {
            emitter.complete();
            sseEmitters.remove(emitter);
        });

        try {
            Map<String, Object> welcome = new HashMap<>();
            welcome.put("type", "CONNECTED");
            welcome.put("message", "Subscribed to live real-time refund status stream.");
            welcome.put("timestamp", LocalDateTime.now().toString());
            emitter.send(SseEmitter.event().name("connection").data(welcome));
        } catch (IOException e) {
            sseEmitters.remove(emitter);
        }

        return emitter;
    }

    public void broadcastRefundUpdate(Map<String, Object> updateData) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("refund-status-update").data(updateData));
            } catch (Exception ex) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (sseEmitters.isEmpty()) return;
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("ping").data("heartbeat"));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }
}

