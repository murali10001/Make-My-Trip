package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "push_subscriptions")
public class PushSubscription {

    @Id
    private String id;
    private String userId;
    private String endpoint;
    private String p256dhKey;
    private String authKey;
    private String userAgent;
    private LocalDateTime createdAt;
    private LocalDateTime lastNotifiedAt;
    private boolean active;

    public PushSubscription() {
        this.createdAt = LocalDateTime.now();
        this.active = true;
    }

    public PushSubscription(String id, String userId, String endpoint, String p256dhKey, String authKey, String userAgent) {
        this.id = id;
        this.userId = userId;
        this.endpoint = endpoint;
        this.p256dhKey = p256dhKey;
        this.authKey = authKey;
        this.userAgent = userAgent;
        this.createdAt = LocalDateTime.now();
        this.active = true;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getP256dhKey() { return p256dhKey; }
    public void setP256dhKey(String p256dhKey) { this.p256dhKey = p256dhKey; }

    public String getAuthKey() { return authKey; }
    public void setAuthKey(String authKey) { this.authKey = authKey; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastNotifiedAt() { return lastNotifiedAt; }
    public void setLastNotifiedAt(LocalDateTime lastNotifiedAt) { this.lastNotifiedAt = lastNotifiedAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
