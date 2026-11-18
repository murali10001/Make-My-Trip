package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "dynamic_prices")
public class DynamicPrice {

    @Id
    private String id;
    private String itemId;
    private String itemType;
    private double basePrice;
    private double finalPrice;
    private double calculatedPrice;
    private String demandLevel;
    private String seasonType;
    private double demandSurgePercentage;
    private double seasonalMultiplier;
    private String surgeReason;
    private List<Map<String, Object>> priceHistory;

    private double timeToDepartureMultiplier = 1.0;
    private Double hoursToDeparture;
    private Map<String, Double> competitorPrices;
    private String calculatedAt;

    public DynamicPrice() {
        this.calculatedAt = LocalDateTime.now().toString();
    }

    public DynamicPrice(String itemId, String itemType, double basePrice, double finalPrice,
                        String demandLevel, String seasonType, double demandSurgePercentage,
                        double seasonalMultiplier, String surgeReason, List<Map<String, Object>> priceHistory) {
        this.itemId = itemId;
        this.itemType = itemType;
        this.basePrice = basePrice;
        this.finalPrice = finalPrice;
        this.calculatedPrice = finalPrice;
        this.demandLevel = demandLevel;
        this.seasonType = seasonType;
        this.demandSurgePercentage = demandSurgePercentage;
        this.seasonalMultiplier = seasonalMultiplier;
        this.surgeReason = surgeReason;
        this.priceHistory = priceHistory;
        this.calculatedAt = LocalDateTime.now().toString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public double getBasePrice() { return basePrice; }
    public void setBasePrice(double basePrice) { this.basePrice = basePrice; }

    public double getFinalPrice() { return finalPrice; }
    public void setFinalPrice(double finalPrice) {
        this.finalPrice = finalPrice;
        this.calculatedPrice = finalPrice;
    }

    public double getCalculatedPrice() {
        return calculatedPrice > 0 ? calculatedPrice : finalPrice;
    }
    public void setCalculatedPrice(double calculatedPrice) {
        this.calculatedPrice = calculatedPrice;
        if (this.finalPrice <= 0) {
            this.finalPrice = calculatedPrice;
        }
    }

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

    public double getTimeToDepartureMultiplier() { return timeToDepartureMultiplier; }
    public void setTimeToDepartureMultiplier(double timeToDepartureMultiplier) { this.timeToDepartureMultiplier = timeToDepartureMultiplier; }

    public Double getHoursToDeparture() { return hoursToDeparture; }
    public void setHoursToDeparture(Double hoursToDeparture) { this.hoursToDeparture = hoursToDeparture; }

    public Map<String, Double> getCompetitorPrices() { return competitorPrices; }
    public void setCompetitorPrices(Map<String, Double> competitorPrices) { this.competitorPrices = competitorPrices; }

    public String getCalculatedAt() { return calculatedAt; }
    public void setCalculatedAt(String calculatedAt) { this.calculatedAt = calculatedAt; }
}
