package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "room_type_options")
@JsonIgnoreProperties(ignoreUnknown = true)
public class RoomTypeOption {

    @Id
    @JsonProperty("id")
    private String _id;
    private String hotelId;
    private String roomTypeName; // "Standard Comfort", "Deluxe Executive", "Ocean View Suite", "Presidential Suite"
    private double priceUpgradeAddon; // 0.0, 1500.0, 3200.0, 7500.0
    private int availableRooms = 5;
    private String bedType = "King Size Bed";
    private String roomSize = "450 sq.ft";
    private String viewType = "Panoramic City View";
    private List<String> amenities = new ArrayList<>();
    private List<String> imageUrls = new ArrayList<>();
    private String preview3dModelUrl; // 3D Interactive Room Preview Model Link / Embed
    private String description;
    private boolean isPopularUpsell = false;

    public RoomTypeOption() {}

    public String getId() {
        return _id;
    }

    public void setId(String id) {
        this._id = id;
    }

    public String getHotelId() {
        return hotelId;
    }

    public void setHotelId(String hotelId) {
        this.hotelId = hotelId;
    }

    public String getRoomTypeName() {
        return roomTypeName;
    }

    public void setRoomTypeName(String roomTypeName) {
        this.roomTypeName = roomTypeName;
    }

    public double getPriceUpgradeAddon() {
        return priceUpgradeAddon;
    }

    public void setPriceUpgradeAddon(double priceUpgradeAddon) {
        this.priceUpgradeAddon = priceUpgradeAddon;
    }

    public int getAvailableRooms() {
        return availableRooms;
    }

    public void setAvailableRooms(int availableRooms) {
        this.availableRooms = availableRooms;
    }

    public String getBedType() {
        return bedType;
    }

    public void setBedType(String bedType) {
        this.bedType = bedType;
    }

    public String getRoomSize() {
        return roomSize;
    }

    public void setRoomSize(String roomSize) {
        this.roomSize = roomSize;
    }

    public String getViewType() {
        return viewType;
    }

    public void setViewType(String viewType) {
        this.viewType = viewType;
    }

    public List<String> getAmenities() {
        return amenities;
    }

    public void setAmenities(List<String> amenities) {
        this.amenities = amenities;
    }

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls;
    }

    public String getPreview3dModelUrl() {
        return preview3dModelUrl;
    }

    public void setPreview3dModelUrl(String preview3dModelUrl) {
        this.preview3dModelUrl = preview3dModelUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isPopularUpsell() {
        return isPopularUpsell;
    }

    public void setPopularUpsell(boolean popularUpsell) {
        isPopularUpsell = popularUpsell;
    }
}
