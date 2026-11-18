package com.makemytrip.makemytrip.services;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class ReviewSentimentAnalyzer {

    private static final Map<String, Double> LEXICON = new HashMap<>();
    private static final Set<String> INTENSIFIERS = new HashSet<>();
    private static final Set<String> NEGATORS = new HashSet<>();
    private static final Map<String, Set<String>> ASPECT_KEYWORDS = new LinkedHashMap<>();

    static {
        // High positive (+2.0)
        for (String w : List.of("exceptional", "superb", "outstanding", "marvelous", "phenomenal",
                "spotless", "pristine", "flawless", "magnificent", "incredible", "breathtaking", "immaculate")) {
            LEXICON.put(w, 2.0);
        }
        // Medium positive (+1.5)
        for (String w : List.of("excellent", "fantastic", "wonderful", "amazing", "beautiful",
                "luxury", "luxurious", "perfect", "loved", "love", "delicious", "delightful", "heavenly", "stellar")) {
            LEXICON.put(w, 1.5);
        }
        // Moderate positive (+1.0)
        for (String w : List.of("great", "good", "clean", "comfortable", "friendly", "helpful",
                "pleasant", "spacious", "prompt", "peaceful", "recommend", "recommended", "best",
                "smooth", "polite", "attentive", "cozy", "nice", "enjoyable", "liked", "generous",
                "courteous", "hospitable", "charming", "safe", "warm", "worth")) {
            LEXICON.put(w, 1.0);
        }

        // High negative (-2.0)
        for (String w : List.of("terrible", "horrible", "awful", "worst", "disaster", "nightmare",
                "filthy", "unhygienic", "hostile", "disgusting", "pathetic", "unbearable")) {
            LEXICON.put(w, -2.0);
        }
        // Medium negative (-1.5)
        for (String w : List.of("dirty", "rude", "delayed", "noisy", "broken", "foul", "cramped",
                "hate", "hated", "scam", "damaged", "uncomfortable", "unacceptable")) {
            LEXICON.put(w, -1.5);
        }
        // Moderate negative (-1.0)
        for (String w : List.of("bad", "poor", "smelly", "overpriced", "bug", "bugs", "cockroach",
                "stain", "stains", "disappointed", "disappointing", "waste", "cold", "late",
                "issue", "issues", "problem", "problems", "regret", "regretful", "chaotic",
                "slow", "loud", "smell")) {
            LEXICON.put(w, -1.0);
        }

        // Intensifiers
        INTENSIFIERS.addAll(List.of("very", "extremely", "highly", "absolutely", "really", "so",
                "super", "extraordinarily", "immensely", "truly", "completely", "totally", "especially", "deeply", "thoroughly"));

        // Negators
        NEGATORS.addAll(List.of("not", "no", "never", "hardly", "didn't", "wasn't", "isn't", "cannot",
                "won't", "don't", "haven't", "hasn't", "aren't", "lack", "lacking", "barely", "without", "neither", "nor"));

        // Aspect Keywords
        ASPECT_KEYWORDS.put("cleanliness", new HashSet<>(List.of(
                "clean", "cleanliness", "spotless", "hygiene", "hygienic", "dirty", "unhygienic",
                "dusty", "smell", "smelly", "stain", "stains", "bathroom", "toilet", "sheet",
                "sheets", "bed", "linen", "room", "tidy", "washroom", "shower", "towel", "towels"
        )));

        ASPECT_KEYWORDS.put("service", new HashSet<>(List.of(
                "staff", "host", "reception", "receptionist", "manager", "service", "check-in",
                "checkout", "polite", "courteous", "rude", "prompt", "helpful", "assist",
                "assistance", "attentive", "crew", "hospitality", "waitstaff", "concierge", "housekeeping"
        )));

        ASPECT_KEYWORDS.put("location", new HashSet<>(List.of(
                "location", "near", "close", "central", "convenient", "view", "metro", "distance",
                "beach", "airport", "noisy", "quiet", "surroundings", "accessible", "walk",
                "walking", "station", "transport", "downtown", "city", "neighborhood"
        )));

        ASPECT_KEYWORDS.put("value", new HashSet<>(List.of(
                "price", "cost", "expensive", "cheap", "worth", "affordable", "value", "money",
                "deal", "overpriced", "rate", "rates", "economical", "budget", "fee", "paid",
                "charges", "fare"
        )));
    }

    public static class SentimentAnalysisResult {
        private final double score;
        private final String category;
        private final Map<String, Double> aspectRatings;

        public SentimentAnalysisResult(double score, String category, Map<String, Double> aspectRatings) {
            this.score = score;
            this.category = category;
            this.aspectRatings = aspectRatings;
        }

        public double getScore() {
            return score;
        }

        public String getCategory() {
            return category;
        }

        public Map<String, Double> getAspectRatings() {
            return aspectRatings;
        }
    }

    public SentimentAnalysisResult analyze(String title, String comment, int rating) {
        String fullText = ((title != null ? title : "") + " " + (comment != null ? comment : "")).trim();
        String[] sentences = fullText.split("[.!?\\r\\n]+");

        double totalTextValence = 0.0;
        int sentimentTokenCount = 0;

        Map<String, Double> aspectSentenceSums = new HashMap<>();
        Map<String, Integer> aspectSentenceCounts = new HashMap<>();
        for (String aspect : ASPECT_KEYWORDS.keySet()) {
            aspectSentenceSums.put(aspect, 0.0);
            aspectSentenceCounts.put(aspect, 0);
        }

        for (String sentence : sentences) {
            String trimmedSentence = sentence.trim();
            if (trimmedSentence.isEmpty()) continue;

            String[] tokens = trimmedSentence.toLowerCase().split("[^a-zA-Z0-9_']+");
            double sentenceValence = 0.0;
            double modifier = 1.0;

            Set<String> sentenceAspects = new HashSet<>();

            for (String rawToken : tokens) {
                String token = rawToken.trim();
                if (token.isEmpty()) continue;

                // Check aspect keywords
                for (Map.Entry<String, Set<String>> entry : ASPECT_KEYWORDS.entrySet()) {
                    if (entry.getValue().contains(token)) {
                        sentenceAspects.add(entry.getKey());
                    }
                }

                if (NEGATORS.contains(token)) {
                    modifier *= -0.8;
                    continue;
                }

                if (INTENSIFIERS.contains(token)) {
                    modifier *= 1.5;
                    continue;
                }

                if (LEXICON.containsKey(token)) {
                    double valence = LEXICON.get(token) * modifier;
                    sentenceValence += valence;
                    sentimentTokenCount++;
                    modifier = 1.0;
                }
            }

            totalTextValence += sentenceValence;

            if (!sentenceAspects.isEmpty()) {
                double sentenceNorm = 0.5 + (sentenceValence / (6.0 + Math.abs(sentenceValence))) * 0.5;
                double aspectSentenceRating = 1.0 + (sentenceNorm * 4.0);
                for (String aspect : sentenceAspects) {
                    aspectSentenceSums.put(aspect, aspectSentenceSums.get(aspect) + aspectSentenceRating);
                    aspectSentenceCounts.put(aspect, aspectSentenceCounts.get(aspect) + 1);
                }
            }
        }

        // Compute normalized text valence
        double textNorm;
        if (sentimentTokenCount > 0) {
            textNorm = 0.5 + (totalTextValence / (10.0 + Math.abs(totalTextValence))) * 0.5;
        } else {
            textNorm = 0.5;
        }
        textNorm = Math.max(0.0, Math.min(1.0, textNorm));

        // Rating valence [0.0, 1.0]
        double ratingNorm = Math.max(0.0, Math.min(1.0, (rating - 1.0) / 4.0));

        // Blended score
        double blended;
        if (sentimentTokenCount > 0) {
            blended = 0.65 * textNorm + 0.35 * ratingNorm;
        } else {
            blended = ratingNorm;
        }
        double sentimentScore = Math.max(0.00, Math.min(1.00, Math.round(blended * 100.0) / 100.0));

        // Sentiment Category
        String sentimentCategory;
        if (sentimentScore >= 0.65) {
            sentimentCategory = "POSITIVE";
        } else if (sentimentScore <= 0.40) {
            sentimentCategory = "NEGATIVE";
        } else {
            sentimentCategory = "NEUTRAL";
        }

        // Calculate aspect ratings
        Map<String, Double> aspectRatings = new LinkedHashMap<>();
        for (String aspect : ASPECT_KEYWORDS.keySet()) {
            double finalAspectRating;
            int count = aspectSentenceCounts.getOrDefault(aspect, 0);
            if (count > 0) {
                double sentenceAvg = aspectSentenceSums.get(aspect) / count;
                double blendedAspect = sentenceAvg * 0.6 + (rating * 1.0) * 0.4;
                finalAspectRating = Math.max(1.0, Math.min(5.0, Math.round(blendedAspect * 10.0) / 10.0));
            } else {
                double extrapolated = (rating * 0.7) + (sentimentScore * 5.0 * 0.3);
                finalAspectRating = Math.max(1.0, Math.min(5.0, Math.round(extrapolated * 10.0) / 10.0));
            }
            aspectRatings.put(aspect, finalAspectRating);
        }

        return new SentimentAnalysisResult(sentimentScore, sentimentCategory, aspectRatings);
    }
}
