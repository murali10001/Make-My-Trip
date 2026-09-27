package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.services.RefundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/refund")
@CrossOrigin(origins = "*")
public class RefundController {

    @Autowired
    private RefundService refundService;

    @GetMapping("/all")
    public ResponseEntity<List<RefundRequest>> getAllRefunds() {
        List<RefundRequest> refunds = refundService.getAllRefunds();
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateRefundPreview(
            @RequestParam String userId,
            @RequestParam String bookingId) {
        Map<String, Object> preview = refundService.calculateRefundPreview(userId, bookingId);
        return ResponseEntity.ok(preview);
    }

    @PostMapping("/cancel-and-request")
    public ResponseEntity<RefundRequest> cancelBookingAndRequestRefund(
            @RequestParam String userId,
            @RequestParam String bookingId,
            @RequestParam String reason,
            @RequestParam(required = false, defaultValue = "") String comment) {
        RefundRequest refund = refundService.processCancellationAndRequestRefund(userId, bookingId, reason, comment);
        return ResponseEntity.ok(refund);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RefundRequest>> getUserRefunds(@PathVariable String userId) {
        List<RefundRequest> refunds = refundService.getUserRefunds(userId);
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/status/{refundId}")
    public ResponseEntity<RefundRequest> getRefundStatus(@PathVariable String refundId) {
        RefundRequest refund = refundService.getRefundByRefundId(refundId);
        return ResponseEntity.ok(refund);
    }

    @PutMapping("/admin/update-status")
    public ResponseEntity<RefundRequest> updateRefundStatus(
            @RequestParam String refundId,
            @RequestParam String status) {
        RefundRequest updated = refundService.updateRefundStatus(refundId, status);
        return ResponseEntity.ok(updated);
    }
}

