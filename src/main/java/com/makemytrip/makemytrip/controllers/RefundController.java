package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.services.RefundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/refund", "/api/refunds", "/api/refund"})
@CrossOrigin(origins = "*")
public class RefundController {

    @Autowired
    private RefundService refundService;

    @GetMapping({"/all", ""})
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

    @PostMapping({"/cancel-and-request", "/cancel"})
    public ResponseEntity<RefundRequest> cancelBookingAndRequestRefund(
            @RequestParam String userId,
            @RequestParam String bookingId,
            @RequestParam String reason,
            @RequestParam(required = false, defaultValue = "") String comment) {
        RefundRequest refund = refundService.processCancellationAndRequestRefund(userId, bookingId, reason, comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(refund);
    }

    @GetMapping({"/user/{userId}", "/user"})
    public ResponseEntity<List<RefundRequest>> getUserRefunds(@PathVariable(required = false) String userId,
                                                             @RequestParam(required = false) String userIdParam) {
        String targetUserId = userId != null ? userId : userIdParam;
        List<RefundRequest> refunds = refundService.getUserRefunds(targetUserId);
        return ResponseEntity.ok(refunds);
    }

    @GetMapping({"/status/{refundId}", "/{refundId}"})
    public ResponseEntity<RefundRequest> getRefundStatus(@PathVariable String refundId) {
        RefundRequest refund = refundService.getRefundByRefundId(refundId);
        return ResponseEntity.ok(refund);
    }

    @PutMapping({"/admin/update-status", "/update-status"})
    public ResponseEntity<RefundRequest> updateRefundStatus(
            @RequestParam String refundId,
            @RequestParam String status) {
        RefundRequest updated = refundService.updateRefundStatus(refundId, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToRefundStream() {
        return refundService.registerSseClient();
    }
}

