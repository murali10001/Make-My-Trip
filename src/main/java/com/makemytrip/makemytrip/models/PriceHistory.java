package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "price_history")
public class PriceHistory {

    @Id
    private String id;
    private String itemId;
    private String itemType;
    private double price;
    private String demandLevel;
    private String seasonType;
    private LocalDateTime recordedAt;
    private String dayLabel;
    private boolean isCurrent;

    public PriceHistory() {}

    public PriceHistory(String id, String itemId, String itemType, double price,
                        String demandLevel, String seasonType, LocalDateTime recordedAt,
                        String dayLabel, boolean isCurrent) {
        this.id = id;
        this.itemId = itemId;
        this.itemType = itemType;
        this.price = price;
        this.demandLevel = demandLevel;
        this.seasonType = seasonType;
        this.recordedAt = recordedAt;
        this.dayLabel = dayLabel;
        this.isCurrent = isCurrent;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public String getDemandLevel() { return demandLevel; }
    public void setDemandLevel(String demandLevel) { this.demandLevel = demandLevel; }

    public String getSeasonType() { return seasonType; }
    public void setSeasonType(String seasonType) { this.seasonType = seasonType; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public String getDayLabel() { return dayLabel; }
    public void setDayLabel(String dayLabel) { this.dayLabel = dayLabel; }

    public boolean isCurrent() { return isCurrent; }
    public void setCurrent(boolean current) { isCurrent = current; }
}

