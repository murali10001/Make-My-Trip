package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "user_preferences")
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserPreferences {

    @Id
    @JsonProperty("id")
    private String _id;
    private String userId;
    private String userEmail;

    private String preferredSeatType;
    private String preferredSeatNo;

    private String preferredRoomType;
    private String preferredBedType;
    private String preferredFloorView;
    private String updatedAt;

    private Map<String, Integer> categoryAffinities = new HashMap<>();
    private List<String> dismissedRecommendationIds = new ArrayList<>();
    private List<String> favoredRecommendationIds = new ArrayList<>();

    public UserPreferences() {}

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

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getPreferredSeatType() {
        return preferredSeatType;
    }

    public void setPreferredSeatType(String preferredSeatType) {
        this.preferredSeatType = preferredSeatType;
    }

    public String getPreferredSeatNo() {
        return preferredSeatNo;
    }

    public void setPreferredSeatNo(String preferredSeatNo) {
        this.preferredSeatNo = preferredSeatNo;
    }

    public String getPreferredRoomType() {
        return preferredRoomType;
    }

    public void setPreferredRoomType(String preferredRoomType) {
        this.preferredRoomType = preferredRoomType;
    }

    public String getPreferredBedType() {
        return preferredBedType;
    }

    public void setPreferredBedType(String preferredBedType) {
        this.preferredBedType = preferredBedType;
    }

    public String getPreferredFloorView() {
        return preferredFloorView;
    }

    public void setPreferredFloorView(String preferredFloorView) {
        this.preferredFloorView = preferredFloorView;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Map<String, Integer> getCategoryAffinities() {
        if (categoryAffinities == null) categoryAffinities = new HashMap<>();
        return categoryAffinities;
    }

    public void setCategoryAffinities(Map<String, Integer> categoryAffinities) {
        this.categoryAffinities = categoryAffinities != null ? categoryAffinities : new HashMap<>();
    }

    public List<String> getDismissedRecommendationIds() {
        if (dismissedRecommendationIds == null) dismissedRecommendationIds = new ArrayList<>();
        return dismissedRecommendationIds;
    }

    public void setDismissedRecommendationIds(List<String> dismissedRecommendationIds) {
        this.dismissedRecommendationIds = dismissedRecommendationIds != null ? dismissedRecommendationIds : new ArrayList<>();
    }

    public List<String> getFavoredRecommendationIds() {
        if (favoredRecommendationIds == null) favoredRecommendationIds = new ArrayList<>();
        return favoredRecommendationIds;
    }

    public void setFavoredRecommendationIds(List<String> favoredRecommendationIds) {
        this.favoredRecommendationIds = favoredRecommendationIds != null ? favoredRecommendationIds : new ArrayList<>();
    }
}
