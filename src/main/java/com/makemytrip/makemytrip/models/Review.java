package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "reviews")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Review {

    @Id
    private String id;
    private String targetId;      // e.g., flightId or hotelId
    private String targetType;    // "FLIGHT" or "HOTEL"
    private String targetTitle;   // e.g., "Air India AI-101" or "The Oberoi Palace"
    private String userId;
    private String userName;
    private String userEmail;
    private int rating;           // 1 to 5 stars
    private String title;         // Review title / summary
    private String comment;       // Detailed review text
    private List<String> photoUrls = new ArrayList<>();
    private int helpfulCount = 0;
    private List<String> helpfulUserIds = new ArrayList<>();
    private boolean flagged = false;
    private String flagReason;
    private String flaggedByUserId;
    private String createdAt;
    private long createdAtEpochMs;
    private List<ReviewReply> replies = new ArrayList<>();

    public Review() {
        this.createdAtEpochMs = System.currentTimeMillis();
    }

    public static class ReviewReply {
        private String replyId;
        private String userId;
        private String userName;
        private String comment;
        private String createdAt;
        private long createdAtEpochMs;

        public ReviewReply() {
            this.createdAtEpochMs = System.currentTimeMillis();
        }

        public ReviewReply(String replyId, String userId, String userName, String comment, String createdAt) {
            this.replyId = replyId;
            this.userId = userId;
            this.userName = userName;
            this.comment = comment;
            this.createdAt = createdAt;
            this.createdAtEpochMs = System.currentTimeMillis();
        }

        public String getReplyId() {
            return replyId;
        }

        public void setReplyId(String replyId) {
            this.replyId = replyId;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getUserName() {
            return userName;
        }

        public void setUserName(String userName) {
            this.userName = userName;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }

        public long getCreatedAtEpochMs() {
            return createdAtEpochMs;
        }

        public void setCreatedAtEpochMs(long createdAtEpochMs) {
            this.createdAtEpochMs = createdAtEpochMs;
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public String getTargetTitle() {
        return targetTitle;
    }

    public void setTargetTitle(String targetTitle) {
        this.targetTitle = targetTitle;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public List<String> getPhotoUrls() {
        return photoUrls;
    }

    public void setPhotoUrls(List<String> photoUrls) {
        this.photoUrls = photoUrls != null ? photoUrls : new ArrayList<>();
    }

    public int getHelpfulCount() {
        return helpfulCount;
    }

    public void setHelpfulCount(int helpfulCount) {
        this.helpfulCount = helpfulCount;
    }

    public List<String> getHelpfulUserIds() {
        return helpfulUserIds;
    }

    public void setHelpfulUserIds(List<String> helpfulUserIds) {
        this.helpfulUserIds = helpfulUserIds != null ? helpfulUserIds : new ArrayList<>();
    }

    public boolean isFlagged() {
        return flagged;
    }

    public void setFlagged(boolean flagged) {
        this.flagged = flagged;
    }

    public String getFlagReason() {
        return flagReason;
    }

    public void setFlagReason(String flagReason) {
        this.flagReason = flagReason;
    }

    public String getFlaggedByUserId() {
        return flaggedByUserId;
    }

    public void setFlaggedByUserId(String flaggedByUserId) {
        this.flaggedByUserId = flaggedByUserId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public long getCreatedAtEpochMs() {
        return createdAtEpochMs;
    }

    public void setCreatedAtEpochMs(long createdAtEpochMs) {
        this.createdAtEpochMs = createdAtEpochMs;
    }

    public List<ReviewReply> getReplies() {
        return replies;
    }

    public void setReplies(List<ReviewReply> replies) {
        this.replies = replies != null ? replies : new ArrayList<>();
    }
}
