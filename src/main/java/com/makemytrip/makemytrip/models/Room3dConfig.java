package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Room3dConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    private String roomModelType;
    private RoomDimensions dimensions;
    private String floorMaterial;
    private String wallMaterial;
    private double ceilingHeight = 2.8;
    private String viewScene;
    private RoomLightingProfile lightingProfile;
    private List<Room3dFurniture> furniture = new ArrayList<>();
    private List<Room3dHotspot> hotspots = new ArrayList<>();
    private Map<String, CameraPreset> cameraPresets = new HashMap<>();

    public Room3dConfig() {}

    public String getRoomModelType() {
        return roomModelType;
    }

    public void setRoomModelType(String roomModelType) {
        this.roomModelType = roomModelType;
    }

    public RoomDimensions getDimensions() {
        return dimensions;
    }

    public void setDimensions(RoomDimensions dimensions) {
        this.dimensions = dimensions;
    }

    public String getFloorMaterial() {
        return floorMaterial;
    }

    public void setFloorMaterial(String floorMaterial) {
        this.floorMaterial = floorMaterial;
    }

    public String getWallMaterial() {
        return wallMaterial;
    }

    public void setWallMaterial(String wallMaterial) {
        this.wallMaterial = wallMaterial;
    }

    public double getCeilingHeight() {
        return ceilingHeight;
    }

    public void setCeilingHeight(double ceilingHeight) {
        this.ceilingHeight = ceilingHeight;
    }

    public String getViewScene() {
        return viewScene;
    }

    public void setViewScene(String viewScene) {
        this.viewScene = viewScene;
    }

    public RoomLightingProfile getLightingProfile() {
        return lightingProfile;
    }

    public void setLightingProfile(RoomLightingProfile lightingProfile) {
        this.lightingProfile = lightingProfile;
    }

    public List<Room3dFurniture> getFurniture() {
        return furniture;
    }

    public void setFurniture(List<Room3dFurniture> furniture) {
        this.furniture = furniture;
    }

    public List<Room3dHotspot> getHotspots() {
        return hotspots;
    }

    public void setHotspots(List<Room3dHotspot> hotspots) {
        this.hotspots = hotspots;
    }

    public Map<String, CameraPreset> getCameraPresets() {
        return cameraPresets;
    }

    public void setCameraPresets(Map<String, CameraPreset> cameraPresets) {
        this.cameraPresets = cameraPresets;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoomDimensions implements Serializable {
        private double width;
        private double length;
        private double height;
        private String formattedSize;

        public RoomDimensions() {}

        public RoomDimensions(double width, double length, double height, String formattedSize) {
            this.width = width;
            this.length = length;
            this.height = height;
            this.formattedSize = formattedSize;
        }

        public double getWidth() { return width; }
        public void setWidth(double width) { this.width = width; }
        public double getLength() { return length; }
        public void setLength(double length) { this.length = length; }
        public double getHeight() { return height; }
        public void setHeight(double height) { this.height = height; }
        public String getFormattedSize() { return formattedSize; }
        public void setFormattedSize(String formattedSize) { this.formattedSize = formattedSize; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoomLightingProfile implements Serializable {
        private String ambientColor = "#FFFFFF";
        private String primaryLightColor = "#FFF8E7";
        private double dayIntensity = 1.0;
        private double nightIntensity = 0.45;
        private boolean supportsNightMode = true;
        private int ceilingSpotlights = 4;
        private String bedsideWarmth = "3000K";

        public RoomLightingProfile() {}

        public String getAmbientColor() { return ambientColor; }
        public void setAmbientColor(String ambientColor) { this.ambientColor = ambientColor; }
        public String getPrimaryLightColor() { return primaryLightColor; }
        public void setPrimaryLightColor(String primaryLightColor) { this.primaryLightColor = primaryLightColor; }
        public double getDayIntensity() { return dayIntensity; }
        public void setDayIntensity(double dayIntensity) { this.dayIntensity = dayIntensity; }
        public double getNightIntensity() { return nightIntensity; }
        public void setNightIntensity(double nightIntensity) { this.nightIntensity = nightIntensity; }
        public boolean isSupportsNightMode() { return supportsNightMode; }
        public void setSupportsNightMode(boolean supportsNightMode) { this.supportsNightMode = supportsNightMode; }
        public int getCeilingSpotlights() { return ceilingSpotlights; }
        public void setCeilingSpotlights(int ceilingSpotlights) { this.ceilingSpotlights = ceilingSpotlights; }
        public String getBedsideWarmth() { return bedsideWarmth; }
        public void setBedsideWarmth(String bedsideWarmth) { this.bedsideWarmth = bedsideWarmth; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Room3dFurniture implements Serializable {
        private String id;
        private String name;
        private String category;
        private double x;
        private double y;
        private double z;
        private double width;
        private double height;
        private double depth;
        private double rotationY;
        private String color;
        private String secondaryColor;
        private String material;
        private String details;
        private String amenityLinked;

        public Room3dFurniture() {}

        public Room3dFurniture(String id, String name, String category, double x, double y, double z,
                               double width, double height, double depth, double rotationY,
                               String color, String secondaryColor, String material,
                               String details, String amenityLinked) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.x = x;
            this.y = y;
            this.z = z;
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.rotationY = rotationY;
            this.color = color;
            this.secondaryColor = secondaryColor;
            this.material = material;
            this.details = details;
            this.amenityLinked = amenityLinked;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
        public double getZ() { return z; }
        public void setZ(double z) { this.z = z; }
        public double getWidth() { return width; }
        public void setWidth(double width) { this.width = width; }
        public double getHeight() { return height; }
        public void setHeight(double height) { this.height = height; }
        public double getDepth() { return depth; }
        public void setDepth(double depth) { this.depth = depth; }
        public double getRotationY() { return rotationY; }
        public void setRotationY(double rotationY) { this.rotationY = rotationY; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public String getSecondaryColor() { return secondaryColor; }
        public void setSecondaryColor(String secondaryColor) { this.secondaryColor = secondaryColor; }
        public String getMaterial() { return material; }
        public void setMaterial(String material) { this.material = material; }
        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }
        public String getAmenityLinked() { return amenityLinked; }
        public void setAmenityLinked(String amenityLinked) { this.amenityLinked = amenityLinked; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Room3dHotspot implements Serializable {
        private String id;
        private String title;
        private String description;
        private double x;
        private double y;
        private double z;
        private String icon;
        private CameraPreset cameraTarget;

        public Room3dHotspot() {}

        public Room3dHotspot(String id, String title, String description, double x, double y, double z, String icon, CameraPreset cameraTarget) {
            this.id = id;
            this.title = title;
            this.description = description;
            this.x = x;
            this.y = y;
            this.z = z;
            this.icon = icon;
            this.cameraTarget = cameraTarget;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
        public double getZ() { return z; }
        public void setZ(double z) { this.z = z; }
        public String getIcon() { return icon; }
        public void setIcon(String icon) { this.icon = icon; }
        public CameraPreset getCameraTarget() { return cameraTarget; }
        public void setCameraTarget(CameraPreset cameraTarget) { this.cameraTarget = cameraTarget; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CameraPreset implements Serializable {
        private double yaw;
        private double pitch;
        private double zoom;
        private String label;

        public CameraPreset() {}

        public CameraPreset(double yaw, double pitch, double zoom, String label) {
            this.yaw = yaw;
            this.pitch = pitch;
            this.zoom = zoom;
            this.label = label;
        }

        public double getYaw() { return yaw; }
        public void setYaw(double yaw) { this.yaw = yaw; }
        public double getPitch() { return pitch; }
        public void setPitch(double pitch) { this.pitch = pitch; }
        public double getZoom() { return zoom; }
        public void setZoom(double zoom) { this.zoom = zoom; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
    }
}

