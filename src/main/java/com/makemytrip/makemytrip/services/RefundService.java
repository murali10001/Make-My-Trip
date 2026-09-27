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
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RefundService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefundRepository refundRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Preview refund calculation based on 24-hour reservation policy rules.
     */
    public Map<String, Object> calculateRefundPreview(String userId, String bookingId) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Booking booking = findBookingInUser(user, bookingId);
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new CancellationNotAllowedException("Booking '" + bookingId + "' has already been cancelled.");
        }

        double originalAmount = booking.getTotalPrice();
        double refundPercentage = 80.0;
        String policyApplied = "Standard Cancellation Policy (80% Refund)";

        // Policy Rule: 50% refund if cancelled within 24 hours of reservation date
        if (booking.getDate() != null) {
            try {
                LocalDate bookingDate = LocalDate.parse(booking.getDate());
                LocalDate today = LocalDate.now();
                if (bookingDate.isEqual(today) || bookingDate.plusDays(1).isEqual(today)) {
                    refundPercentage = 50.0;
                    policyApplied = "24-Hour Reservation Policy (50% Refund)";
                }
            } catch (Exception e) {
                // Default to 50% refund policy if date parsing fails
                refundPercentage = 50.0;
                policyApplied = "24-Hour Reservation Policy (50% Refund)";
            }
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

    /**
     * Process booking cancellation, restore inventory, and create refund request.
     */
    public RefundRequest processCancellationAndRequestRefund(String userId, String bookingId, String reason, String comment) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("A cancellation reason must be selected from the predefined list.");
        }

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with ID '" + userId + "' not found"));

        Booking booking = findBookingInUser(user, bookingId);
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new CancellationNotAllowedException("Booking '" + bookingId + "' is already cancelled.");
        }

        // Calculate refund breakdown
        Map<String, Object> preview = calculateRefundPreview(userId, bookingId);
        double originalAmount = (double) preview.get("originalAmount");
        double refundAmount = (double) preview.get("refundAmount");
        double refundPercentage = (double) preview.get("refundPercentage");
        String policyApplied = (String) preview.get("policyApplied");

        // Generate Refund ID
        String refundId = "RF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Update booking state in User object
        booking.setStatus("CANCELLED");
        booking.setCancellationReason(reason);
        booking.setRefundId(refundId);
        userRepository.save(user);

        // Restore flight / hotel capacity inventory
        restoreInventory(booking);

        // Build RefundRequest Document
        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setRefundId(refundId);
        refundRequest.setBookingId(bookingId);
        refundRequest.setUserId(userId);
        refundRequest.setUserEmail(user.getEmail());
        refundRequest.setBookingType(booking.getType());
        refundRequest.setOriginalAmount(originalAmount);
        refundRequest.setRefundAmount(refundAmount);
        refundRequest.setRefundPercentage(refundPercentage);
        refundRequest.setCancellationReason(reason);
        refundRequest.setComment(comment != null ? comment : "");
        refundRequest.setRequestDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        refundRequest.setStatus("PENDING");
        refundRequest.setCurrentStep(1); // 1: Requested, 2: Processing, 3: Completed
        refundRequest.setPolicyApplied(policyApplied);

        String estDate = LocalDate.now().plusDays(2).format(DateTimeFormatter.ofPattern("MMM dd, yyyy"));
        refundRequest.setEstimatedCompletionDate("Expected by " + estDate + " (2-3 business days)");

        RefundRequest savedRequest = refundRepository.save(refundRequest);

        // Create live notification for user in MongoDB
        notificationService.createNotification(
                userId,
                "Booking Cancelled & Refund Initiated",
                "Booking " + bookingId + " cancelled. Refund ID " + refundId + " for ₹" + refundAmount + " is currently PENDING.",
                "cancellation"
        );

        return savedRequest;
    }

    /**
     * Get all refund requests in the database.
     */
    public List<RefundRequest> getAllRefunds() {
        return refundRepository.findAll();
    }

    /**
     * Get all refund requests for a specific user.
     */
    public List<RefundRequest> getUserRefunds(String userId) {
        return refundRepository.findByUserId(userId);
    }


    /**
     * Get a refund request by refund ID.
     */
    public RefundRequest getRefundByRefundId(String refundId) {
        return refundRepository.findByRefundId(refundId)
                .orElseThrow(() -> new RefundNotFoundException("Refund request with ID '" + refundId + "' not found"));
    }

    /**
     * Admin/System update for refund status: PENDING -> PROCESSED -> COMPLETED.
     */
    public RefundRequest updateRefundStatus(String refundId, String newStatus) {
        RefundRequest refund = getRefundByRefundId(refundId);
        String upperStatus = newStatus.toUpperCase();

        refund.setStatus(upperStatus);
        if ("PROCESSED".equals(upperStatus)) {
            refund.setCurrentStep(2);
        } else if ("COMPLETED".equals(upperStatus)) {
            refund.setCurrentStep(3);
            refund.setEstimatedCompletionDate("Completed & Credited to Source Account");
        } else if ("REJECTED".equals(upperStatus)) {
            refund.setEstimatedCompletionDate("Cancellation Rejected");
        }

        RefundRequest updated = refundRepository.save(refund);

        // Notify user about status change
        notificationService.createNotification(
                refund.getUserId(),
                "Refund Status Update (" + refundId + ")",
                "Your refund for booking " + refund.getBookingId() + " is now " + upperStatus + ". Amount: ₹" + refund.getRefundAmount(),
                "refund"
        );

        return updated;
    }

    private Booking findBookingInUser(Users user, String bookingId) {
        if (user.getBookings() == null) {
            throw new CancellationNotAllowedException("No bookings found for user.");
        }

        return user.getBookings().stream()
                .filter(b -> bookingId.equals(b.getBookingId()))
                .findFirst()
                .orElseThrow(() -> new CancellationNotAllowedException("Booking with ID '" + bookingId + "' not found in user record."));
    }

    private void restoreInventory(Booking booking) {
        if (booking.getTargetId() == null || booking.getTargetId().trim().isEmpty()) {
            return;
        }

        try {
            if ("Flight".equalsIgnoreCase(booking.getType())) {
                Flight flight = flightRepository.findById(booking.getTargetId()).orElse(null);
                if (flight != null) {
                    flight.setAvailableSeats(flight.getAvailableSeats() + booking.getQuantity());
                    flightRepository.save(flight);
                }
            } else if ("Hotel".equalsIgnoreCase(booking.getType())) {
                Hotel hotel = hotelRepository.findById(booking.getTargetId()).orElse(null);
                if (hotel != null) {
                    hotel.setAvailableRooms(hotel.getAvailableRooms() + booking.getQuantity());
                    hotelRepository.save(hotel);
                }
            }
        } catch (Exception e) {
            // Inventory restore exception logged silently to avoid breaking cancellation flow
            System.err.println("Failed to restore inventory for booking target " + booking.getTargetId() + ": " + e.getMessage());
        }
    }
}
