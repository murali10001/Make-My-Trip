package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "price_freezes")
public class PriceFreeze {

    @Id
    private String freezeId;
    private String itemId;
    private String itemTitle;
    private double frozenPrice;
    private double originalPrice;
    private LocalDateTime frozenAt;
    private LocalDateTime expiresAt;
    private long durationHours;
    private boolean active;
    private String userId;

    public PriceFreeze() {}

    public PriceFreeze(String freezeId, String itemId, String itemTitle, double frozenPrice, double originalPrice,
                       LocalDateTime frozenAt, LocalDateTime expiresAt, long durationHours, boolean active) {
        this(freezeId, itemId, itemTitle, frozenPrice, originalPrice, frozenAt, expiresAt, durationHours, active, null);
    }

    public PriceFreeze(String freezeId, String itemId, String itemTitle, double frozenPrice, double originalPrice,
                       LocalDateTime frozenAt, LocalDateTime expiresAt, long durationHours, boolean active, String userId) {
        this.freezeId = freezeId;
        this.itemId = itemId;
        this.itemTitle = itemTitle;
        this.frozenPrice = frozenPrice;
        this.originalPrice = originalPrice;
        this.frozenAt = frozenAt;
        this.expiresAt = expiresAt;
        this.durationHours = durationHours;
        this.active = active;
        this.userId = userId;
    }

    public String getFreezeId() { return freezeId; }
    public void setFreezeId(String freezeId) { this.freezeId = freezeId; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getItemTitle() { return itemTitle; }
    public void setItemTitle(String itemTitle) { this.itemTitle = itemTitle; }

    public double getFrozenPrice() { return frozenPrice; }
    public void setFrozenPrice(double frozenPrice) { this.frozenPrice = frozenPrice; }

    public double getOriginalPrice() { return originalPrice; }
    public void setOriginalPrice(double originalPrice) { this.originalPrice = originalPrice; }

    public LocalDateTime getFrozenAt() { return frozenAt; }
    public void setFrozenAt(LocalDateTime frozenAt) { this.frozenAt = frozenAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public long getDurationHours() { return durationHours; }
    public void setDurationHours(long durationHours) { this.durationHours = durationHours; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
}

