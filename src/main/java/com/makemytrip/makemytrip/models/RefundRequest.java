package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "refund_requests")
public class RefundRequest {
    @Id
    private String id;
    private String refundId;
    private String bookingId;
    private String userId;
    private String userEmail;
    private String bookingType; // "Flight" or "Hotel"
    private double originalAmount;
    private double refundAmount;
    private double refundPercentage; // e.g. 50.0 or 80.0
    private String cancellationReason;
    private String comment;
    private String requestDate;
    private String status; // "PENDING", "PROCESSED", "COMPLETED", "REJECTED"
    private String estimatedCompletionDate;
    private int currentStep; // 1: Requested, 2: Processing, 3: Completed
    private String policyApplied;
    private long lastUpdatedEpochMs;
    private String transactionRef;

    public RefundRequest() {
        this.lastUpdatedEpochMs = System.currentTimeMillis();
    }


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public double getOriginalAmount() {
        return originalAmount;
    }

    public void setOriginalAmount(double originalAmount) {
        this.originalAmount = originalAmount;
    }

    public double getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(double refundAmount) {
        this.refundAmount = refundAmount;
    }

    public double getRefundPercentage() {
        return refundPercentage;
    }

    public void setRefundPercentage(double refundPercentage) {
        this.refundPercentage = refundPercentage;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(String requestDate) {
        this.requestDate = requestDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getEstimatedCompletionDate() {
        return estimatedCompletionDate;
    }

    public void setEstimatedCompletionDate(String estimatedCompletionDate) {
        this.estimatedCompletionDate = estimatedCompletionDate;
    }

    public int getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(int currentStep) {
        this.currentStep = currentStep;
    }

    public String getPolicyApplied() {
        return policyApplied;
    }

    public void setPolicyApplied(String policyApplied) {
        this.policyApplied = policyApplied;
    }

    public long getLastUpdatedEpochMs() {
        return lastUpdatedEpochMs;
    }

    public void setLastUpdatedEpochMs(long lastUpdatedEpochMs) {
        this.lastUpdatedEpochMs = lastUpdatedEpochMs;
    }

    public String getTransactionRef() {
        return transactionRef;
    }

    public void setTransactionRef(String transactionRef) {
        this.transactionRef = transactionRef;
    }
}

