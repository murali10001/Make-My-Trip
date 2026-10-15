package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "recommendation_feedback")
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecommendationFeedback {

    @Id
    @JsonProperty("id")
    private String _id;

    private String userId;
    private String recommendationId;
    private String targetId;
    private String feedbackType;
    private String timestamp;
    private String notes;

    public RecommendationFeedback() {}

    public RecommendationFeedback(String userId, String recommendationId, String targetId, String feedbackType, String timestamp) {
        this.userId = userId;
        this.recommendationId = recommendationId;
        this.targetId = targetId;
        this.feedbackType = feedbackType;
        this.timestamp = timestamp;
    }

    public String getId() {
        return _id;
    }

    public void setId(String id) {
        this._id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRecommendationId() {
        return recommendationId;
    }

    public void setRecommendationId(String recommendationId) {
        this.recommendationId = recommendationId;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getFeedbackType() {
        return feedbackType;
    }

    public void setFeedbackType(String feedbackType) {
        this.feedbackType = feedbackType;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
