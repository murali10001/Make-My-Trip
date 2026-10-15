package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Recommendation;
import com.makemytrip.makemytrip.models.RecommendationFeedback;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RecommendationFeedbackRepository;
import com.makemytrip.makemytrip.repositories.RecommendationRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Autowired
    private RecommendationRepository recommendationRepository;

    @Autowired
    private RecommendationFeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPreferencesRepository preferencesRepository;

    @Autowired(required = false)
    private HotelRepository hotelRepository;

    @Autowired(required = false)
    private FlightRepository flightRepository;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public void seedInitialRecommendations() {
        recommendationRepository.deleteAll();
        List<Recommendation> dynamicCatalog = generateDynamicRecommendationsFromDatabase();
        if (!dynamicCatalog.isEmpty()) {
            recommendationRepository.saveAll(dynamicCatalog);
        }
    }

    public List<Recommendation> generateDynamicRecommendationsFromDatabase() {
        List<Recommendation> generated = new ArrayList<>();

        if (hotelRepository != null) {
            List<Hotel> hotels = hotelRepository.findAll();
            for (Hotel hotel : hotels) {
                if (hotel == null || hotel.getHotelName() == null || hotel.getHotelName().trim().isEmpty()) continue;

                Recommendation rec = new Recommendation();
                rec.setId("rec-hotel-" + (hotel.getId() != null ? hotel.getId() : UUID.randomUUID().toString()));
                rec.setTargetType("HOTEL");
                rec.setTargetId(hotel.getId());
                rec.setTitle(hotel.getHotelName());
                rec.setSubtitle(hotel.getRoomType() != null && !hotel.getRoomType().trim().isEmpty() ? hotel.getRoomType() : "Luxury Accommodation");
                rec.setDestination(hotel.getLocation() != null ? hotel.getLocation() : "India");

                String loc = (hotel.getLocation() != null ? hotel.getLocation() : "").toLowerCase();
                String name = hotel.getHotelName().toLowerCase();
                String cat = "LUXURY";
                if (loc.contains("goa") || loc.contains("beach") || loc.contains("kerala") || loc.contains("bali") || loc.contains("maldives") || loc.contains("puri") || loc.contains("andaman")) {
                    cat = "BEACH";
                } else if (loc.contains("jaipur") || loc.contains("udaipur") || loc.contains("agra") || loc.contains("heritage") || loc.contains("hampi") || name.contains("palace") || name.contains("haveli")) {
                    cat = "HERITAGE";
                } else if (loc.contains("manali") || loc.contains("shimla") || loc.contains("ooty") || loc.contains("munnar") || loc.contains("kashmir") || loc.contains("switzerland") || loc.contains("hill") || loc.contains("mountain")) {
                    cat = "NATURE";
                }
                rec.setCategory(cat);

                String img = "";
                if (hotel.getImageUrls() != null && !hotel.getImageUrls().isEmpty()) {
                    img = hotel.getImageUrls().get(0);
                } else if (hotel.getImageUrl() != null && !hotel.getImageUrl().trim().isEmpty()) {
                    img = hotel.getImageUrl();
                }
                rec.setImageUrl(img);

                double price = hotel.getPricePerNight() > 0 ? hotel.getPricePerNight() : 4500.0;
                rec.setPriceEstimate(price);
                rec.setOriginalPrice(hotel.getDiscountedPrice() > 0 && hotel.getDiscountedPrice() < price ? price * 1.25 : price);
                rec.setRating(hotel.getRating() > 0 ? hotel.getRating() : 4.5);
                rec.setReviewCount(hotel.getReviewsCount() > 0 ? hotel.getReviewsCount() : 120);
                rec.setMatchScore(92);

                List<String> tags = new ArrayList<>();
                if (hotel.getAmenities() != null && !hotel.getAmenities().trim().isEmpty()) {
                    for (String am : hotel.getAmenities().split("[,;|]")) {
                        String t = am.trim();
                        if (!t.isEmpty() && tags.size() < 4) tags.add(t);
                    }
                }
                if (tags.isEmpty()) {
                    tags.add("Top Rated");
                    tags.add("Verified Stay");
                }
                rec.setTags(tags);

                rec.setActionUrl("/book-hotel/" + hotel.getId());
                rec.setReasonTitle("Recommended Stay in " + (hotel.getLocation() != null ? hotel.getLocation() : "Prime Destination"));
                rec.setReasonExplanation("Highly rated by travelers visiting " + (hotel.getLocation() != null ? hotel.getLocation() : "this destination") + ". Matches your lodging comfort preferences.");

                List<String> breakdown = new ArrayList<>();
                breakdown.add("Collaborative Match: Top rated by guests booking trips to " + (hotel.getLocation() != null ? hotel.getLocation() : "this area"));
                breakdown.add("Quality Assurance: " + (hotel.getRating() > 0 ? hotel.getRating() : 4.5) + "/5 star verified guest reviews");
                breakdown.add("Amenities Match: Features verified amenities & flexible booking options");
                rec.setReasonBreakdown(breakdown);

                rec.setCollaborativeFactor("Top choice among verified guests");
                rec.setPopularityScore(88);
                rec.setActive(true);
                generated.add(rec);
            }
        }

        if (flightRepository != null) {
            List<Flight> flights = flightRepository.findAll();
            for (Flight flight : flights) {
                if (flight == null || flight.getFlightName() == null || flight.getFlightName().trim().isEmpty()) continue;

                Recommendation rec = new Recommendation();
                rec.setId("rec-flight-" + (flight.getId() != null ? flight.getId() : UUID.randomUUID().toString()));
                rec.setTargetType("FLIGHT");
                rec.setTargetId(flight.getId());
                rec.setTitle(flight.getFlightName() + " (" + (flight.getFrom() != null ? flight.getFrom() : "Origin") + " → " + (flight.getTo() != null ? flight.getTo() : "Destination") + ")");
                rec.setSubtitle((flight.getAirline() != null ? flight.getAirline() : "Direct Flight") + " • " + (flight.getAircraft() != null ? flight.getAircraft() : "Comfort Cabin"));
                rec.setDestination(flight.getTo() != null ? flight.getTo() : "Destination");
                rec.setCategory("FLIGHT");
                rec.setImageUrl("");

                double price = flight.getPrice() > 0 ? flight.getPrice() : 3500.0;
                rec.setPriceEstimate(price);
                rec.setOriginalPrice(price * 1.2);
                rec.setRating(4.7);
                rec.setReviewCount(flight.getAvailableSeats() > 0 ? flight.getAvailableSeats() * 12 : 150);
                rec.setMatchScore(91);

                List<String> tags = new ArrayList<>();
                if (flight.getAirline() != null && !flight.getAirline().trim().isEmpty()) tags.add(flight.getAirline());
                if (flight.getFrom() != null) tags.add("From " + flight.getFrom());
                if (flight.getTo() != null) tags.add("To " + flight.getTo());
                if (tags.isEmpty()) tags.add("Direct Route");
                rec.setTags(tags);

                rec.setActionUrl("/book-flight/" + flight.getId());
                rec.setReasonTitle("Popular Direct Flight Route to " + (flight.getTo() != null ? flight.getTo() : "Your Destination"));
                rec.setReasonExplanation("Frequent route with high on-time reliability and competitive fare pricing.");

                List<String> breakdown = new ArrayList<>();
                breakdown.add("Route Popularity: Highly chosen by travelers flying to " + (flight.getTo() != null ? flight.getTo() : "this destination"));
                breakdown.add("Schedule: Convenient departure time (" + (flight.getDepartureTime() != null ? flight.getDepartureTime() : "Scheduled") + ")");
                breakdown.add("Fare Value: Best fare lock available for direct travel");
                rec.setReasonBreakdown(breakdown);

                rec.setCollaborativeFactor("89% repeat booking rate for this route");
                rec.setPopularityScore(86);
                rec.setActive(true);
                generated.add(rec);
            }
        }

        return generated;
    }

    public List<Recommendation> getRecommendations(String userId, String category) {
        List<Recommendation> all = recommendationRepository.findByActiveTrue();
        if (all.isEmpty()) {
            all = generateDynamicRecommendationsFromDatabase();
        }

        Set<String> irrelevantIds = new HashSet<>();
        Set<String> helpfulIds = new HashSet<>();

        if (userId != null && !userId.trim().isEmpty()) {
            List<RecommendationFeedback> userFeedbacks = feedbackRepository.findByUserId(userId);
            for (RecommendationFeedback fb : userFeedbacks) {
                if ("IRRELEVANT".equalsIgnoreCase(fb.getFeedbackType())) {
                    irrelevantIds.add(fb.getRecommendationId());
                } else if ("HELPFUL".equalsIgnoreCase(fb.getFeedbackType())) {
                    helpfulIds.add(fb.getRecommendationId());
                }
            }
        }

        boolean beachAffinity = false;
        boolean heritageAffinity = false;
        boolean natureAffinity = false;
        boolean luxuryAffinity = false;
        String pastBeachDestination = "Goa";
        String pastHeritageDestination = "Jaipur";
        String pastNatureDestination = "Manali";

        UserPreferences userPrefs = null;

        if (userId != null && !userId.trim().isEmpty()) {
            Optional<Users> userOpt = userRepository.findById(userId);
            if (!userOpt.isPresent()) {
                Users byEmail = userRepository.findByEmail(userId);
                if (byEmail != null) {
                    userOpt = Optional.of(byEmail);
                }
            }

            if (userOpt.isPresent()) {
                Users user = userOpt.get();
                List<Users.Booking> bookings = user.getBookings();
                if (bookings != null && !bookings.isEmpty()) {
                    for (Users.Booking b : bookings) {
                        String target = (b.getTargetId() != null ? b.getTargetId() : "").toLowerCase();
                        String bType = (b.getType() != null ? b.getType() : "").toLowerCase();

                        StringBuilder detailsBuilder = new StringBuilder(target);
                        String targetId = b.getTargetId();
                        if (targetId != null && !targetId.trim().isEmpty()) {
                            if (hotelRepository != null) {
                                hotelRepository.findById(targetId).ifPresent(h -> {
                                    if (h.getHotelName() != null) detailsBuilder.append(" ").append(h.getHotelName());
                                    if (h.getLocation() != null) detailsBuilder.append(" ").append(h.getLocation());
                                    if (h.getAmenities() != null) detailsBuilder.append(" ").append(h.getAmenities());
                                    if (h.getDescription() != null) detailsBuilder.append(" ").append(h.getDescription());
                                });
                            }
                            if (flightRepository != null) {
                                flightRepository.findById(targetId).ifPresent(f -> {
                                    if (f.getFlightName() != null) detailsBuilder.append(" ").append(f.getFlightName());
                                    if (f.getTo() != null) detailsBuilder.append(" ").append(f.getTo());
                                    if (f.getFrom() != null) detailsBuilder.append(" ").append(f.getFrom());
                                    if (f.getAirline() != null) detailsBuilder.append(" ").append(f.getAirline());
                                });
                            }
                        }
                        String resolvedTarget = detailsBuilder.toString().toLowerCase();

                        if (resolvedTarget.contains("goa") || resolvedTarget.contains("beach") || resolvedTarget.contains("bali") || resolvedTarget.contains("maldives") || resolvedTarget.contains("kerala") || bType.contains("beach")) {
                            beachAffinity = true;
                            if (resolvedTarget.contains("goa")) pastBeachDestination = "Goa";
                            else if (resolvedTarget.contains("bali")) pastBeachDestination = "Bali";
                            else if (resolvedTarget.contains("maldives")) pastBeachDestination = "Maldives";
                        }
                        if (resolvedTarget.contains("jaipur") || resolvedTarget.contains("palace") || resolvedTarget.contains("heritage") || resolvedTarget.contains("udaipur") || resolvedTarget.contains("agra")) {
                            heritageAffinity = true;
                            if (resolvedTarget.contains("jaipur")) pastHeritageDestination = "Jaipur";
                            else if (resolvedTarget.contains("udaipur")) pastHeritageDestination = "Udaipur";
                        }
                        if (resolvedTarget.contains("manali") || resolvedTarget.contains("shimla") || resolvedTarget.contains("nature") || resolvedTarget.contains("alps") || resolvedTarget.contains("switzerland")) {
                            natureAffinity = true;
                            if (resolvedTarget.contains("manali")) pastNatureDestination = "Manali";
                            else if (resolvedTarget.contains("switzerland")) pastNatureDestination = "Switzerland";
                        }
                        if (b.getTotalPrice() > 15000 || resolvedTarget.contains("luxury") || resolvedTarget.contains("leela") || resolvedTarget.contains("dubai")) {
                            luxuryAffinity = true;
                        }
                    }
                }
            }

            Optional<UserPreferences> prefOpt = preferencesRepository.findByUserId(userId);
            if (prefOpt.isPresent()) {
                userPrefs = prefOpt.get();
                String room = userPrefs.getPreferredRoomType() != null ? userPrefs.getPreferredRoomType().toLowerCase() : "";
                if (room.contains("ocean") || room.contains("view")) {
                    beachAffinity = true;
                    luxuryAffinity = true;
                }
            }
        }

        if (!beachAffinity && !heritageAffinity && !natureAffinity && !luxuryAffinity) {
            beachAffinity = true;
        }

        List<Recommendation> result = new ArrayList<>();

        for (Recommendation item : all) {

            if (irrelevantIds.contains(item.getId())) {
                continue;
            }

            if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL")) {
                if ("FLIGHT".equalsIgnoreCase(category)) {
                    if (!"FLIGHT".equalsIgnoreCase(item.getTargetType())) continue;
                } else if ("HOTEL".equalsIgnoreCase(category)) {
                    if (!"HOTEL".equalsIgnoreCase(item.getTargetType())) continue;
                } else if (item.getCategory() == null || !item.getCategory().equalsIgnoreCase(category)) {
                    continue;
                }
            }

            Recommendation personalized = copyRecommendation(item);
            int score = item.getPopularityScore();
            List<String> breakdown = new ArrayList<>(item.getReasonBreakdown());

            String dest = (item.getDestination() != null && !item.getDestination().trim().isEmpty())
                    ? item.getDestination().split(",")[0].trim()
                    : "your destination";

            if ("BEACH".equalsIgnoreCase(item.getCategory()) && beachAffinity) {
                score += 8;
                personalized.setReasonTitle("You liked beaches! Try " + dest + ".");
                breakdown.add(0, "History Match: High affinity detected from past " + pastBeachDestination + " beach bookings");
            } else if ("HERITAGE".equalsIgnoreCase(item.getCategory()) && heritageAffinity) {
                score += 7;
                personalized.setReasonTitle("You enjoyed heritage tours! Discover " + dest + ".");
                breakdown.add(0, "History Match: Cultural explorer profile matched with " + pastHeritageDestination + " history");
            } else if ("NATURE".equalsIgnoreCase(item.getCategory()) && natureAffinity) {
                score += 7;
                personalized.setReasonTitle("You loved mountain nature! Explore " + dest + ".");
                breakdown.add(0, "History Match: Nature enthusiast profile matched with past " + pastNatureDestination + " visits");
            } else if ("LUXURY".equalsIgnoreCase(item.getCategory()) && luxuryAffinity) {
                score += 7;
                personalized.setReasonTitle("Personalized Luxury Match for " + dest);
                breakdown.add(0, "History Match: Aligned with your high-comfort luxury booking patterns");
            }

            if (userPrefs != null) {
                if (userPrefs.getPreferredSeatType() != null && "FLIGHT".equalsIgnoreCase(item.getTargetType())) {
                    score += 4;
                    breakdown.add("Preference Match: Window seat and priority boarding aligned with your preferences");
                }
                if (userPrefs.getPreferredRoomType() != null && "HOTEL".equalsIgnoreCase(item.getTargetType())) {
                    score += 4;
                    breakdown.add("Preference Match: Direct match with your saved '" + userPrefs.getPreferredRoomType() + "' preference");
                }
            }

            if (helpfulIds.contains(item.getId())) {
                score += 5;
                breakdown.add("Feedback Refinement: You marked this recommendation as helpful");
            }

            if (item.getHelpfulCount() > 0) {
                score += Math.min(item.getHelpfulCount(), 5);
            }

            score = Math.min(99, Math.max(75, score));
            personalized.setMatchScore(score);
            personalized.setReasonBreakdown(breakdown);

            result.add(personalized);
        }

        result.sort((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()));

        return result;
    }

    public Map<String, Object> recordFeedback(String recommendationId, String userId, String feedbackType, String notes) {
        if (recommendationId == null || recommendationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Recommendation ID is required");
        }
        if (feedbackType == null || (!"HELPFUL".equalsIgnoreCase(feedbackType) && !"IRRELEVANT".equalsIgnoreCase(feedbackType))) {
            throw new IllegalArgumentException("Feedback type must be HELPFUL or IRRELEVANT");
        }

        Optional<Recommendation> recOpt = recommendationRepository.findById(recommendationId);
        if (!recOpt.isPresent()) {
            throw new NoSuchElementException("Recommendation not found: " + recommendationId);
        }

        Recommendation rec = recOpt.get();
        String effectiveUserId = (userId != null && !userId.trim().isEmpty()) ? userId : "guest_user";

        Optional<RecommendationFeedback> existingOpt = feedbackRepository.findByUserIdAndRecommendationId(effectiveUserId, recommendationId);
        RecommendationFeedback feedback = existingOpt.orElse(new RecommendationFeedback());
        feedback.setUserId(effectiveUserId);
        feedback.setRecommendationId(recommendationId);
        feedback.setTargetId(rec.getTargetId());
        feedback.setFeedbackType(feedbackType.toUpperCase());
        feedback.setTimestamp(LocalDateTime.now().format(FORMATTER));
        feedback.setNotes(notes);
        feedbackRepository.save(feedback);

        if ("HELPFUL".equalsIgnoreCase(feedbackType)) {
            rec.setHelpfulCount(rec.getHelpfulCount() + 1);
        } else if ("IRRELEVANT".equalsIgnoreCase(feedbackType)) {
            rec.setIrrelevantCount(rec.getIrrelevantCount() + 1);
        }
        recommendationRepository.save(rec);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("recommendationId", recommendationId);
        response.put("feedbackType", feedbackType.toUpperCase());
        response.put("helpfulCount", rec.getHelpfulCount());
        response.put("irrelevantCount", rec.getIrrelevantCount());
        response.put("message", "HELPFUL".equalsIgnoreCase(feedbackType)
                ? "Thank you! We will refine future recommendations to include more options like this."
                : "Got it! This recommendation has been removed and won't be shown again.");
        return response;
    }

    private Recommendation copyRecommendation(Recommendation orig) {
        Recommendation copy = new Recommendation();
        copy.setId(orig.getId());
        copy.setTargetType(orig.getTargetType());
        copy.setTargetId(orig.getTargetId());
        copy.setTitle(orig.getTitle());
        copy.setSubtitle(orig.getSubtitle());
        copy.setDestination(orig.getDestination());
        copy.setCategory(orig.getCategory());
        copy.setImageUrl(orig.getImageUrl());
        copy.setPriceEstimate(orig.getPriceEstimate());
        copy.setOriginalPrice(orig.getOriginalPrice());
        copy.setRating(orig.getRating());
        copy.setReviewCount(orig.getReviewCount());
        copy.setMatchScore(orig.getMatchScore());
        copy.setTags(new ArrayList<>(orig.getTags()));
        copy.setActionUrl(orig.getActionUrl());
        copy.setReasonTitle(orig.getReasonTitle());
        copy.setReasonExplanation(orig.getReasonExplanation());
        copy.setReasonBreakdown(new ArrayList<>(orig.getReasonBreakdown()));
        copy.setCollaborativeFactor(orig.getCollaborativeFactor());
        copy.setPopularityScore(orig.getPopularityScore());
        copy.setHelpfulCount(orig.getHelpfulCount());
        copy.setIrrelevantCount(orig.getIrrelevantCount());
        copy.setActive(orig.isActive());
        return copy;
    }
}
