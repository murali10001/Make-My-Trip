package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "offer_coupons")
public class OfferCoupon {

    @Id
    private String id;
    private String code;
    private String title;
    private String description;
    private String bankName; // "HDFC Bank", "ICICI Bank", "SBI Card", "MakeMyTour Special"
    private String bankLogo;
    private double discountPercentage;
    private double maxDiscountAmount;
    private double minBookingAmount;
    private String badgeText; // "10% Instant Discount", "Flat ₹1500 Cashback", "20% OFF"
    private boolean active;

    public OfferCoupon() {}

    public OfferCoupon(String id, String code, String title, String description, String bankName,
                       String bankLogo, double discountPercentage, double maxDiscountAmount,
                       double minBookingAmount, String badgeText, boolean active) {
        this.id = id;
        this.code = code;
        this.title = title;
        this.description = description;
        this.bankName = bankName;
        this.bankLogo = bankLogo;
        this.discountPercentage = discountPercentage;
        this.maxDiscountAmount = maxDiscountAmount;
        this.minBookingAmount = minBookingAmount;
        this.badgeText = badgeText;
        this.active = active;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getBankLogo() { return bankLogo; }
    public void setBankLogo(String bankLogo) { this.bankLogo = bankLogo; }

    public double getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(double discountPercentage) { this.discountPercentage = discountPercentage; }

    public double getMaxDiscountAmount() { return maxDiscountAmount; }
    public void setMaxDiscountAmount(double maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }

    public double getMinBookingAmount() { return minBookingAmount; }
    public void setMinBookingAmount(double minBookingAmount) { this.minBookingAmount = minBookingAmount; }

    public String getBadgeText() { return badgeText; }
    public void setBadgeText(String badgeText) { this.badgeText = badgeText; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
