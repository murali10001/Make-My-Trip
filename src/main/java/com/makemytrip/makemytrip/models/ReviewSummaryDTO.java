package com.makemytrip.makemytrip.models;

import java.util.List;
import java.util.Map;

public class ReviewSummaryDTO {
    private List<Review> reviews;
    private int totalCount;
    private double averageRating;
    private Map<Integer, Integer> ratingDistribution;
    private int photoCount;

    public ReviewSummaryDTO() {
    }

    public ReviewSummaryDTO(List<Review> reviews, int totalCount, double averageRating, Map<Integer, Integer> ratingDistribution, int photoCount) {
        this.reviews = reviews;
        this.totalCount = totalCount;
        this.averageRating = averageRating;
        this.ratingDistribution = ratingDistribution;
        this.photoCount = photoCount;
    }

    public List<Review> getReviews() {
        return reviews;
    }

    public void setReviews(List<Review> reviews) {
        this.reviews = reviews;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(double averageRating) {
        this.averageRating = averageRating;
    }

    public Map<Integer, Integer> getRatingDistribution() {
        return ratingDistribution;
    }

    public void setRatingDistribution(Map<Integer, Integer> ratingDistribution) {
        this.ratingDistribution = ratingDistribution;
    }

    public int getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(int photoCount) {
        this.photoCount = photoCount;
    }
}
