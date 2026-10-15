package com.makemytrip.makemytrip.models;

import java.util.List;
import java.util.Map;

public class DynamicPrice {

    private String itemId;
    private String itemType;
    private double basePrice;
    private double finalPrice;
    private String demandLevel;
    private String seasonType;
    private double demandSurgePercentage;
    private double seasonalMultiplier;
    private String surgeReason;
    private List<Map<String, Object>> priceHistory;

    public DynamicPrice() {}

    public DynamicPrice(String itemId, String itemType, double basePrice, double finalPrice,
                        String demandLevel, String seasonType, double demandSurgePercentage,
                        double seasonalMultiplier, String surgeReason, List<Map<String, Object>> priceHistory) {
        this.itemId = itemId;
        this.itemType = itemType;
        this.basePrice = basePrice;
        this.finalPrice = finalPrice;
        this.demandLevel = demandLevel;
        this.seasonType = seasonType;
        this.demandSurgePercentage = demandSurgePercentage;
        this.seasonalMultiplier = seasonalMultiplier;
        this.surgeReason = surgeReason;
        this.priceHistory = priceHistory;
    }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public double getBasePrice() { return basePrice; }
    public void setBasePrice(double basePrice) { this.basePrice = basePrice; }

    public double getFinalPrice() { return finalPrice; }
    public void setFinalPrice(double finalPrice) { this.finalPrice = finalPrice; }

    public String getDemandLevel() { return demandLevel; }
    public void setDemandLevel(String demandLevel) { this.demandLevel = demandLevel; }

    public String getSeasonType() { return seasonType; }
    public void setSeasonType(String seasonType) { this.seasonType = seasonType; }

    public double getDemandSurgePercentage() { return demandSurgePercentage; }
    public void setDemandSurgePercentage(double demandSurgePercentage) { this.demandSurgePercentage = demandSurgePercentage; }

    public double getSeasonalMultiplier() { return seasonalMultiplier; }
    public void setSeasonalMultiplier(double seasonalMultiplier) { this.seasonalMultiplier = seasonalMultiplier; }

    public String getSurgeReason() { return surgeReason; }
    public void setSurgeReason(String surgeReason) { this.surgeReason = surgeReason; }

    public List<Map<String, Object>> getPriceHistory() { return priceHistory; }
    public void setPriceHistory(List<Map<String, Object>> priceHistory) { this.priceHistory = priceHistory; }
}
