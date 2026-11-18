package com.makemytrip.makemytrip.models;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReviewSummaryDTO {
    private List<Review> reviews;
    private int totalCount;
    private double averageRating;
    private Map<Integer, Integer> ratingDistribution;
    private int photoCount;
    private Map<String, Double> aspectBreakdown = new LinkedHashMap<>();
    private Double averageSentimentScore;
    private String overallSentiment;
    private Map<String, Integer> sentimentCounts = new LinkedHashMap<>();

    public ReviewSummaryDTO() {
    }

    public ReviewSummaryDTO(List<Review> reviews, int totalCount, double averageRating, Map<Integer, Integer> ratingDistribution, int photoCount) {
        this.reviews = reviews;
        this.totalCount = totalCount;
        this.averageRating = averageRating;
        this.ratingDistribution = ratingDistribution;
        this.photoCount = photoCount;
    }

    public ReviewSummaryDTO(List<Review> reviews, int totalCount, double averageRating,
                            Map<Integer, Integer> ratingDistribution, int photoCount,
                            Map<String, Double> aspectBreakdown, Double averageSentimentScore,
                            String overallSentiment, Map<String, Integer> sentimentCounts) {
        this.reviews = reviews;
        this.totalCount = totalCount;
        this.averageRating = averageRating;
        this.ratingDistribution = ratingDistribution;
        this.photoCount = photoCount;
        this.aspectBreakdown = aspectBreakdown;
        this.averageSentimentScore = averageSentimentScore;
        this.overallSentiment = overallSentiment;
        this.sentimentCounts = sentimentCounts;
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

    public Map<String, Double> getAspectBreakdown() {
        return aspectBreakdown;
    }

    public void setAspectBreakdown(Map<String, Double> aspectBreakdown) {
        this.aspectBreakdown = aspectBreakdown;
    }

    public Double getAverageSentimentScore() {
        return averageSentimentScore;
    }

    public void setAverageSentimentScore(Double averageSentimentScore) {
        this.averageSentimentScore = averageSentimentScore;
    }

    public String getOverallSentiment() {
        return overallSentiment;
    }

    public void setOverallSentiment(String overallSentiment) {
        this.overallSentiment = overallSentiment;
    }

    public Map<String, Integer> getSentimentCounts() {
        return sentimentCounts;
    }

    public void setSentimentCounts(Map<String, Integer> sentimentCounts) {
        this.sentimentCounts = sentimentCounts;
    }
}
