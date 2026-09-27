package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "user_preferences")
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserPreferences {

    @Id
    @JsonProperty("id")
    private String _id;
    private String userId;
    private String userEmail;

    // Saved flight seat selection preferences
    private String preferredSeatType = "Window"; // "Window", "Extra Legroom", "Aisle", "Front Row"
    private String preferredSeatNo = "3A";

    // Saved hotel room selection preferences
    private String preferredRoomType = "Executive Ocean View Suite"; // "Standard Comfort", "Deluxe Suite", "Executive Ocean View Suite", "Presidential Suite"
    private String preferredBedType = "King Size Bed";
    private String preferredFloorView = "High Floor Panoramic View";
    private String updatedAt;

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
}
