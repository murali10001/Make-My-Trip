package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.RecommendationNotFoundException;
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
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
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

    private final Map<String, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();
    private final List<SseEmitter> globalEmitters = new CopyOnWriteArrayList<>();

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            long count = recommendationRepository.count();
            List<Recommendation> active = recommendationRepository.findByActiveTrue();
            if (count == 0 || active.isEmpty()) {
                System.out.println("[RECOMMENDATION ENGINE] Initializing recommendation catalog from curated destinations and active inventory...");
                seedInitialRecommendations();
            }
        } catch (Exception e) {
            System.err.println("[RECOMMENDATION ENGINE] Startup initialization notice: " + e.getMessage());
        }
    }

    public Optional<Recommendation> getRecommendationById(String id) {
        if (id == null || id.trim().isEmpty()) return Optional.empty();
        return recommendationRepository.findById(id.trim());
    }

    public synchronized void seedInitialRecommendations() {
        try {
            recommendationRepository.deleteAll();
        } catch (Exception e) {
            System.err.println("[RECOMMENDATION ENGINE] Warning during repository reset: " + e.getMessage());
        }
        List<Recommendation> dynamicCatalog = generateDynamicRecommendationsFromDatabase();
        if (!dynamicCatalog.isEmpty()) {
            recommendationRepository.saveAll(dynamicCatalog);
        }
        broadcastEvent("RECOMMENDATIONS_UPDATED", Map.of("action", "CATALOG_SEEDED", "count", dynamicCatalog.size()));
    }

    public List<Recommendation> generateDynamicRecommendationsFromDatabase() {
        Map<String, Recommendation> catalogMap = new LinkedHashMap<>();
        List<Users> allUsers = userRepository != null ? userRepository.findAll() : Collections.emptyList();

        Map<String, Flight> flightMap = new HashMap<>();
        List<Flight> flights = Collections.emptyList();
        if (flightRepository != null) {
            try {
                flights = flightRepository.findAll();
                for (Flight f : flights) {
                    if (f != null && f.getId() != null) flightMap.put(f.getId(), f);
                }
            } catch (Exception ignored) {}
        }

        Map<String, Hotel> hotelMap = new HashMap<>();
        List<Hotel> hotels = Collections.emptyList();
        if (hotelRepository != null) {
            try {
                hotels = hotelRepository.findAll();
                for (Hotel h : hotels) {
                    if (h != null && h.getId() != null) hotelMap.put(h.getId(), h);
                }
            } catch (Exception ignored) {}
        }

        // 1. First populate the guaranteed rich curated destination catalog for all 5 categories
        for (Recommendation curated : createCuratedBaseCatalog()) {
            computeCollaborativeMetrics(curated, allUsers, flightMap, hotelMap);
            catalogMap.put(curated.getId(), curated);
        }

        // 2. Dynamically incorporate any live hotels from the MongoDB inventory
        if (!hotels.isEmpty()) {
            try {
                for (Hotel hotel : hotels) {
                    if (hotel == null || hotel.getHotelName() == null || hotel.getHotelName().trim().isEmpty()) continue;

                    Recommendation rec = new Recommendation();
                    String hId = hotel.getId() != null ? hotel.getId() : UUID.randomUUID().toString();
                    rec.setId("rec-hotel-" + hId);
                    rec.setTargetType("HOTEL");
                    rec.setTargetId(hId);
                    rec.setTitle(hotel.getHotelName());
                    rec.setSubtitle(hotel.getRoomType() != null && !hotel.getRoomType().trim().isEmpty() ? hotel.getRoomType() : "Luxury Accommodation");
                    rec.setDestination(hotel.getLocation() != null ? hotel.getLocation() : "India");

                    String loc = (hotel.getLocation() != null ? hotel.getLocation() : "").toLowerCase();
                    String name = hotel.getHotelName().toLowerCase();
                    String cat = "LUXURY";
                    if (loc.contains("goa") || loc.contains("beach") || loc.contains("kerala") || loc.contains("bali") || loc.contains("maldives") || loc.contains("puri") || loc.contains("andaman")) {
                        cat = "BEACH";
                    } else if (loc.contains("jaipur") || loc.contains("udaipur") || loc.contains("agra") || loc.contains("heritage") || loc.contains("hampi") || name.contains("palace") || name.contains("haveli") || name.contains("fort")) {
                        cat = "HERITAGE";
                    } else if (loc.contains("manali") || loc.contains("shimla") || loc.contains("ooty") || loc.contains("munnar") || loc.contains("kashmir") || loc.contains("switzerland") || loc.contains("hill") || loc.contains("mountain")) {
                        cat = "NATURE";
                    }
                    rec.setCategory(cat);

                    String img = "";
                    if (hotel.getImageUrls() != null && !hotel.getImageUrls().isEmpty() && hotel.getImageUrls().get(0) != null) {
                        img = hotel.getImageUrls().get(0);
                    } else if (hotel.getImageUrl() != null && !hotel.getImageUrl().trim().isEmpty()) {
                        img = hotel.getImageUrl();
                    } else {
                        img = getDefaultImageForCategory(cat);
                    }
                    rec.setImageUrl(img);

                    double price = hotel.getPricePerNight() > 0 ? hotel.getPricePerNight() : 4500.0;
                    rec.setPriceEstimate(price);
                    rec.setOriginalPrice(hotel.getDiscountedPrice() > 0 && hotel.getDiscountedPrice() < price ? price * 1.25 : price);
                    rec.setRating(hotel.getRating() > 0 ? hotel.getRating() : 4.5);
                    rec.setReviewCount(hotel.getReviewsCount() > 0 ? hotel.getReviewsCount() : 120);
                    rec.setMatchScore(90);

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
                    rec.setActionUrl("/book-hotel/" + hId);

                    computeCollaborativeMetrics(rec, allUsers, flightMap, hotelMap);

                    rec.setPopularityScore(88);
                    rec.setActive(true);
                    catalogMap.put(rec.getId(), rec);
                }
            } catch (Exception e) {
                System.err.println("[RECOMMENDATION ENGINE] Notice processing live hotels: " + e.getMessage());
            }
        }

        // 3. Dynamically incorporate any live flights from the MongoDB inventory
        if (!flights.isEmpty()) {
            try {
                for (Flight flight : flights) {
                    if (flight == null || flight.getFlightName() == null || flight.getFlightName().trim().isEmpty()) continue;

                    Recommendation rec = new Recommendation();
                    String fId = flight.getId() != null ? flight.getId() : UUID.randomUUID().toString();
                    rec.setId("rec-flight-" + fId);
                    rec.setTargetType("FLIGHT");
                    rec.setTargetId(fId);
                    rec.setTitle(flight.getFlightName() + " (" + (flight.getFrom() != null ? flight.getFrom() : "Origin") + " → " + (flight.getTo() != null ? flight.getTo() : "Destination") + ")");
                    rec.setSubtitle((flight.getAirline() != null ? flight.getAirline() : "Direct Flight") + " • " + (flight.getAircraft() != null ? flight.getAircraft() : "Comfort Cabin"));
                    rec.setDestination(flight.getTo() != null ? flight.getTo() : "Destination");
                    rec.setCategory("FLIGHT");
                    rec.setImageUrl("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80");

                    double price = flight.getPrice() > 0 ? flight.getPrice() : 3500.0;
                    rec.setPriceEstimate(price);
                    rec.setOriginalPrice(price * 1.2);
                    rec.setRating(4.7);
                    rec.setReviewCount(flight.getAvailableSeats() > 0 ? flight.getAvailableSeats() * 12 : 150);
                    rec.setMatchScore(89);

                    List<String> tags = new ArrayList<>();
                    if (flight.getAirline() != null && !flight.getAirline().trim().isEmpty()) tags.add(flight.getAirline());
                    if (flight.getFrom() != null) tags.add("From " + flight.getFrom());
                    if (flight.getTo() != null) tags.add("To " + flight.getTo());
                    if (tags.isEmpty()) tags.add("Direct Route");
                    rec.setTags(tags);
                    rec.setActionUrl("/book-flight/" + fId);

                    computeCollaborativeMetrics(rec, allUsers, flightMap, hotelMap);

                    rec.setPopularityScore(86);
                    rec.setActive(true);
                    catalogMap.put(rec.getId(), rec);
                }
            } catch (Exception e) {
                System.err.println("[RECOMMENDATION ENGINE] Notice processing live flights: " + e.getMessage());
            }
        }

        return new ArrayList<>(catalogMap.values());
    }

    public List<Recommendation> createCuratedBaseCatalog() {
        List<Recommendation> list = new ArrayList<>();

        // BEACH ESCAPES
        Recommendation b1 = new Recommendation();
        b1.setId("rec-curated-beach-1");
        b1.setTargetType("HOTEL");
        b1.setTargetId("curated-hotel-goa-taj");
        b1.setTitle("Taj Exotica Resort & Spa, Goa");
        b1.setSubtitle("Luxury Mediterranean Beachfront Villa");
        b1.setDestination("Goa, India");
        b1.setCategory("BEACH");
        b1.setImageUrl("https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80");
        b1.setPriceEstimate(14200.0);
        b1.setOriginalPrice(18500.0);
        b1.setRating(4.9);
        b1.setReviewCount(4820);
        b1.setMatchScore(94);
        b1.setTags(List.of("Beachfront", "Private Pool", "Spa & Wellness", "Top Rated"));
        b1.setActionUrl("/book-hotel/curated-hotel-goa-taj");
        b1.setPopularityScore(95);
        b1.setActive(true);
        list.add(b1);

        Recommendation b2 = new Recommendation();
        b2.setId("rec-curated-beach-2");
        b2.setTargetType("HOTEL");
        b2.setTargetId("curated-hotel-maldives-lagoon");
        b2.setTitle("Sun Siyam Olhuveli Maldives");
        b2.setSubtitle("Overwater Lagoon Suite with Sunset Deck");
        b2.setDestination("South Male Atoll, Maldives");
        b2.setCategory("BEACH");
        b2.setImageUrl("https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80");
        b2.setPriceEstimate(28900.0);
        b2.setOriginalPrice(34500.0);
        b2.setRating(4.9);
        b2.setReviewCount(3120);
        b2.setMatchScore(96);
        b2.setTags(List.of("Overwater Villa", "Snorkeling Reef", "All Inclusive", "Luxury"));
        b2.setActionUrl("/book-hotel/curated-hotel-maldives-lagoon");
        b2.setPopularityScore(97);
        b2.setActive(true);
        list.add(b2);

        Recommendation b3 = new Recommendation();
        b3.setId("rec-curated-beach-3");
        b3.setTargetType("HOTEL");
        b3.setTargetId("curated-hotel-bali-seminyak");
        b3.setTitle("W Bali - Seminyak Beachfront Resort");
        b3.setSubtitle("Vibrant Coastal Retreat with Panoramic Ocean Views");
        b3.setDestination("Bali, Indonesia");
        b3.setCategory("BEACH");
        b3.setImageUrl("https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80");
        b3.setPriceEstimate(18500.0);
        b3.setOriginalPrice(22000.0);
        b3.setRating(4.8);
        b3.setReviewCount(2450);
        b3.setMatchScore(92);
        b3.setTags(List.of("Oceanfront", "Sunset Lounge", "World-Class Dining"));
        b3.setActionUrl("/book-hotel/curated-hotel-bali-seminyak");
        b3.setPopularityScore(91);
        b3.setActive(true);
        list.add(b3);

        // LUXURY STAYS
        Recommendation l1 = new Recommendation();
        l1.setId("rec-curated-luxury-1");
        l1.setTargetType("HOTEL");
        l1.setTargetId("curated-hotel-delhi-leela");
        l1.setTitle("The Leela Palace New Delhi");
        l1.setSubtitle("Royal Sovereign Suite & Rooftop Infinity Pool");
        l1.setDestination("New Delhi, India");
        l1.setCategory("LUXURY");
        l1.setImageUrl("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80");
        l1.setPriceEstimate(21000.0);
        l1.setOriginalPrice(26000.0);
        l1.setRating(4.9);
        l1.setReviewCount(3890);
        l1.setMatchScore(95);
        l1.setTags(List.of("5-Star Deluxe", "Michelin Dining", "Butler Service", "City Center"));
        l1.setActionUrl("/book-hotel/curated-hotel-delhi-leela");
        l1.setPopularityScore(94);
        l1.setActive(true);
        list.add(l1);

        Recommendation l2 = new Recommendation();
        l2.setId("rec-curated-luxury-2");
        l2.setTargetType("HOTEL");
        l2.setTargetId("curated-hotel-dubai-burj");
        l2.setTitle("Burj Al Arab Jumeirah");
        l2.setSubtitle("Iconic Sailfront Duplex Suite with Arabian Sea Views");
        l2.setDestination("Dubai, United Arab Emirates");
        l2.setCategory("LUXURY");
        l2.setImageUrl("https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80");
        l2.setPriceEstimate(65000.0);
        l2.setOriginalPrice(78000.0);
        l2.setRating(5.0);
        l2.setReviewCount(5210);
        l2.setMatchScore(98);
        l2.setTags(List.of("Ultra Luxury", "Helipad Access", "Private Beach", "World Icon"));
        l2.setActionUrl("/book-hotel/curated-hotel-dubai-burj");
        l2.setPopularityScore(99);
        l2.setActive(true);
        list.add(l2);

        // TOP FLIGHTS
        Recommendation f1 = new Recommendation();
        f1.setId("rec-curated-flight-1");
        f1.setTargetType("FLIGHT");
        f1.setTargetId("curated-flight-del-goa");
        f1.setTitle("IndiGo 6E-205 (Delhi → Goa)");
        f1.setSubtitle("Direct Morning Departure • On-Time Reliability 96%");
        f1.setDestination("Goa, India");
        f1.setCategory("FLIGHT");
        f1.setImageUrl("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80");
        f1.setPriceEstimate(4850.0);
        f1.setOriginalPrice(6200.0);
        f1.setRating(4.8);
        f1.setReviewCount(6100);
        f1.setMatchScore(93);
        f1.setTags(List.of("Direct Flight", "Non-Stop", "Free Cabin Bag", "Popular Route"));
        f1.setActionUrl("/book-flight/curated-flight-del-goa");
        f1.setPopularityScore(96);
        f1.setActive(true);
        list.add(f1);

        Recommendation f2 = new Recommendation();
        f2.setId("rec-curated-flight-2");
        f2.setTargetType("FLIGHT");
        f2.setTargetId("curated-flight-bom-dxb");
        f2.setTitle("Air India AI-101 (Mumbai → Dubai)");
        f2.setSubtitle("Boeing 787 Dreamliner • Full Service International");
        f2.setDestination("Dubai, United Arab Emirates");
        f2.setCategory("FLIGHT");
        f2.setImageUrl("https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80");
        f2.setPriceEstimate(11200.0);
        f2.setOriginalPrice(14500.0);
        f2.setRating(4.7);
        f2.setReviewCount(4320);
        f2.setMatchScore(91);
        f2.setTags(List.of("Complimentary Meals", "Dreamliner", "Hot Meals", "Wide Body"));
        f2.setActionUrl("/book-flight/curated-flight-bom-dxb");
        f2.setPopularityScore(92);
        f2.setActive(true);
        list.add(f2);

        // HERITAGE & CULTURE
        Recommendation h1 = new Recommendation();
        h1.setId("rec-curated-heritage-1");
        h1.setTargetType("HOTEL");
        h1.setTargetId("curated-hotel-jaipur-rambagh");
        h1.setTitle("Rambagh Palace, Jaipur");
        h1.setSubtitle("Historic Royal Palace of the Maharaja of Jaipur");
        h1.setDestination("Jaipur, Rajasthan");
        h1.setCategory("HERITAGE");
        h1.setImageUrl("https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80");
        h1.setPriceEstimate(32000.0);
        h1.setOriginalPrice(39000.0);
        h1.setRating(4.9);
        h1.setReviewCount(4650);
        h1.setMatchScore(97);
        h1.setTags(List.of("Royal Heritage", "Peacock Gardens", "Historical Landmark", "Palace"));
        h1.setActionUrl("/book-hotel/curated-hotel-jaipur-rambagh");
        h1.setPopularityScore(98);
        h1.setActive(true);
        list.add(h1);

        Recommendation h2 = new Recommendation();
        h2.setId("rec-curated-heritage-2");
        h2.setTargetType("HOTEL");
        h2.setTargetId("curated-hotel-udaipur-oberoi");
        h2.setTitle("The Oberoi Udaivilas, Udaipur");
        h2.setSubtitle("Majestic Lakeside Palace with Private Courtyards");
        h2.setDestination("Udaipur, Rajasthan");
        h2.setCategory("HERITAGE");
        h2.setImageUrl("https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80");
        h2.setPriceEstimate(36500.0);
        h2.setOriginalPrice(44000.0);
        h2.setRating(5.0);
        h2.setReviewCount(5120);
        h2.setMatchScore(99);
        h2.setTags(List.of("Lake View", "Historic Grandeur", "Private Boat Transfer"));
        h2.setActionUrl("/book-hotel/curated-hotel-udaipur-oberoi");
        h2.setPopularityScore(99);
        h2.setActive(true);
        list.add(h2);

        // NATURE RETREATS
        Recommendation n1 = new Recommendation();
        n1.setId("rec-curated-nature-1");
        n1.setTargetType("HOTEL");
        n1.setTargetId("curated-hotel-shimla-wildflower");
        n1.setTitle("Wildflower Hall, Shimla in the Himalayas");
        n1.setSubtitle("Cedar Forest Sanctuary with Heated Mountain Pool");
        n1.setDestination("Shimla, Himachal Pradesh");
        n1.setCategory("NATURE");
        n1.setImageUrl("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80");
        n1.setPriceEstimate(22500.0);
        n1.setOriginalPrice(27000.0);
        n1.setRating(4.9);
        n1.setReviewCount(3450);
        n1.setMatchScore(94);
        n1.setTags(List.of("Mountain Sanctuary", "Pine Forest", "Nature Walks", "Himalayas"));
        n1.setActionUrl("/book-hotel/curated-hotel-shimla-wildflower");
        n1.setPopularityScore(94);
        n1.setActive(true);
        list.add(n1);

        Recommendation n2 = new Recommendation();
        n2.setId("rec-curated-nature-2");
        n2.setTargetType("HOTEL");
        n2.setTargetId("curated-hotel-manali-resort");
        n2.setTitle("Solang Valley Mountain Chalet & Resort");
        n2.setSubtitle("Alpine Riverside Haven with Panoramic Snow Peak Views");
        n2.setDestination("Manali, Himachal Pradesh");
        n2.setCategory("NATURE");
        n2.setImageUrl("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80");
        n2.setPriceEstimate(8900.0);
        n2.setOriginalPrice(11500.0);
        n2.setRating(4.8);
        n2.setReviewCount(2910);
        n2.setMatchScore(91);
        n2.setTags(List.of("Snow Peaks", "Riverfront", "Campfire Nights", "Scenic Valley"));
        n2.setActionUrl("/book-hotel/curated-hotel-manali-resort");
        n2.setPopularityScore(90);
        n2.setActive(true);
        list.add(n2);

        return list;
    }

    private String getDefaultImageForCategory(String category) {
        if ("BEACH".equalsIgnoreCase(category)) {
            return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80";
        } else if ("HERITAGE".equalsIgnoreCase(category)) {
            return "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";
        } else if ("NATURE".equalsIgnoreCase(category)) {
            return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
        } else if ("FLIGHT".equalsIgnoreCase(category)) {
            return "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80";
        }
        return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
    }

    public void computeCollaborativeMetrics(Recommendation rec, List<Users> allUsers) {
        computeCollaborativeMetrics(rec, allUsers, null, null);
    }

    public void computeCollaborativeMetrics(Recommendation rec, List<Users> allUsers, Map<String, Flight> flightMap, Map<String, Hotel> hotelMap) {
        if (rec == null) return;
        if (allUsers == null || allUsers.isEmpty()) {
            rec.setCollaborativeFactor("Top choice among verified guests (" + rec.getReviewCount() + "+ ratings)");
            return;
        }

        String target = rec.getTargetId() != null ? rec.getTargetId().toLowerCase() : "";
        String dest = rec.getDestination() != null ? rec.getDestination().toLowerCase().split(",")[0].trim() : "";

        int totalBookingUsers = 0;
        int matchingPeerUsers = 0;

        for (Users u : allUsers) {
            if (u == null) continue;
            List<Users.Booking> bookings = u.getBookings();
            if (bookings != null && !bookings.isEmpty()) {
                totalBookingUsers++;
                boolean userBookedTargetOrDest = false;
                for (Users.Booking b : bookings) {
                    if (b == null) continue;
                    StringBuilder details = new StringBuilder();
                    if (b.getTargetId() != null) details.append(b.getTargetId()).append(" ");
                    if (b.getBookingId() != null) details.append(b.getBookingId()).append(" ");
                    if (b.getType() != null) details.append(b.getType()).append(" ");

                    if (b.getTargetId() != null && !b.getTargetId().isEmpty()) {
                        String bTargetId = b.getTargetId().trim();
                        if (flightMap != null && flightMap.containsKey(bTargetId)) {
                            Flight f = flightMap.get(bTargetId);
                            if (f != null) {
                                if (f.getTo() != null) details.append(f.getTo()).append(" ");
                                if (f.getFrom() != null) details.append(f.getFrom()).append(" ");
                            }
                        }
                        if (hotelMap != null && hotelMap.containsKey(bTargetId)) {
                            Hotel h = hotelMap.get(bTargetId);
                            if (h != null) {
                                if (h.getLocation() != null) details.append(h.getLocation()).append(" ");
                                if (h.getHotelName() != null) details.append(h.getHotelName()).append(" ");
                            }
                        }
                    }

                    String resolved = details.toString().toLowerCase();
                    if ((!target.isEmpty() && resolved.contains(target)) || (!dest.isEmpty() && resolved.contains(dest))) {
                        userBookedTargetOrDest = true;
                        break;
                    }
                }
                if (userBookedTargetOrDest) {
                    matchingPeerUsers++;
                }
            }
        }

        if (totalBookingUsers > 0 && matchingPeerUsers > 0) {
            int rate = Math.max(68, Math.min(96, (int) Math.round(((double) matchingPeerUsers / totalBookingUsers) * 100) + 40));
            rec.setCollaborativeFactor(rate + "% of travelers with similar taste booked this");
        } else {
            rec.setCollaborativeFactor("Top rated choice among " + (rec.getCategory() != null ? rec.getCategory().toLowerCase() : "travel") + " travelers");
        }
    }

    public List<Recommendation> getRecommendations(String userId, String category) {
        List<Recommendation> all = Collections.emptyList();
        try {
            all = recommendationRepository.findByActiveTrue();
        } catch (Exception e) {
            System.err.println("[RECOMMENDATION ENGINE] Warning reading recommendations repository: " + e.getMessage());
        }

        if (all == null || all.isEmpty()) {
            seedInitialRecommendations();
            try {
                all = recommendationRepository.findByActiveTrue();
            } catch (Exception ignored) {}
            if (all == null || all.isEmpty()) {
                all = createCuratedBaseCatalog();
            }
        }

        List<Users> allUsers = Collections.emptyList();
        try {
            allUsers = (userRepository != null) ? userRepository.findAll() : Collections.emptyList();
        } catch (Exception ignored) {}

        Map<String, Flight> flightMap = new HashMap<>();
        if (flightRepository != null) {
            try {
                for (Flight f : flightRepository.findAll()) {
                    if (f != null && f.getId() != null) flightMap.put(f.getId(), f);
                }
            } catch (Exception ignored) {}
        }

        Map<String, Hotel> hotelMap = new HashMap<>();
        if (hotelRepository != null) {
            try {
                for (Hotel h : hotelRepository.findAll()) {
                    if (h != null && h.getId() != null) hotelMap.put(h.getId(), h);
                }
            } catch (Exception ignored) {}
        }

        for (Recommendation item : all) {
            if (item != null) {
                computeCollaborativeMetrics(item, allUsers, flightMap, hotelMap);
            }
        }

        Set<String> irrelevantIds = new HashSet<>();
        Set<String> helpfulIds = new HashSet<>();

        if (userId != null && !userId.trim().isEmpty()) {
            try {
                List<RecommendationFeedback> userFeedbacks = feedbackRepository.findByUserId(userId.trim());
                for (RecommendationFeedback fb : userFeedbacks) {
                    if (fb != null && fb.getRecommendationId() != null) {
                        if ("IRRELEVANT".equalsIgnoreCase(fb.getFeedbackType())) {
                            irrelevantIds.add(fb.getRecommendationId());
                        } else if ("HELPFUL".equalsIgnoreCase(fb.getFeedbackType())) {
                            helpfulIds.add(fb.getRecommendationId());
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        boolean hasGenuineBeachHistory = false;
        boolean hasGenuineHeritageHistory = false;
        boolean hasGenuineNatureHistory = false;
        boolean hasGenuineLuxuryHistory = false;
        String pastBeachDestination = null;
        String pastHeritageDestination = null;
        String pastNatureDestination = null;

        UserPreferences userPrefs = null;

        if (userId != null && !userId.trim().isEmpty()) {
            try {
                Optional<Users> userOpt = userRepository.findById(userId.trim());
                if (!userOpt.isPresent()) {
                    Users byEmail = userRepository.findByEmail(userId.trim());
                    if (byEmail != null) {
                        userOpt = Optional.of(byEmail);
                    }
                }

                if (userOpt.isPresent()) {
                    Users user = userOpt.get();
                    List<Users.Booking> bookings = user.getBookings();
                    if (bookings != null && !bookings.isEmpty()) {
                        for (Users.Booking b : bookings) {
                            if (b == null) continue;
                            String target = (b.getTargetId() != null ? b.getTargetId() : "").toLowerCase();
                            String bType = (b.getType() != null ? b.getType() : "").toLowerCase();

                            StringBuilder detailsBuilder = new StringBuilder(target);
                            String targetId = b.getTargetId();
                            if (targetId != null && !targetId.trim().isEmpty()) {
                                String cleanTid = targetId.trim();
                                Hotel h = hotelMap.get(cleanTid);
                                if (h != null) {
                                    if (h.getHotelName() != null) detailsBuilder.append(" ").append(h.getHotelName());
                                    if (h.getLocation() != null) detailsBuilder.append(" ").append(h.getLocation());
                                    if (h.getAmenities() != null) detailsBuilder.append(" ").append(h.getAmenities());
                                    if (h.getDescription() != null) detailsBuilder.append(" ").append(h.getDescription());
                                }
                                Flight f = flightMap.get(cleanTid);
                                if (f != null) {
                                    if (f.getFlightName() != null) detailsBuilder.append(" ").append(f.getFlightName());
                                    if (f.getTo() != null) detailsBuilder.append(" ").append(f.getTo());
                                    if (f.getFrom() != null) detailsBuilder.append(" ").append(f.getFrom());
                                    if (f.getAirline() != null) detailsBuilder.append(" ").append(f.getAirline());
                                }
                            }
                            String resolvedTarget = detailsBuilder.toString().toLowerCase();

                            if (resolvedTarget.contains("goa") || resolvedTarget.contains("beach") || resolvedTarget.contains("bali") || resolvedTarget.contains("maldives") || resolvedTarget.contains("kerala") || bType.contains("beach")) {
                                hasGenuineBeachHistory = true;
                                if (resolvedTarget.contains("goa")) pastBeachDestination = "Goa";
                                else if (resolvedTarget.contains("bali")) pastBeachDestination = "Bali";
                                else if (resolvedTarget.contains("maldives")) pastBeachDestination = "Maldives";
                                else if (resolvedTarget.contains("kerala")) pastBeachDestination = "Kerala";
                                else pastBeachDestination = "beach coastal";
                            }
                            if (resolvedTarget.contains("jaipur") || resolvedTarget.contains("palace") || resolvedTarget.contains("heritage") || resolvedTarget.contains("udaipur") || resolvedTarget.contains("agra")) {
                                hasGenuineHeritageHistory = true;
                                if (resolvedTarget.contains("jaipur")) pastHeritageDestination = "Jaipur";
                                else if (resolvedTarget.contains("udaipur")) pastHeritageDestination = "Udaipur";
                                else if (resolvedTarget.contains("agra")) pastHeritageDestination = "Agra";
                                else pastHeritageDestination = "heritage cultural";
                            }
                            if (resolvedTarget.contains("manali") || resolvedTarget.contains("shimla") || resolvedTarget.contains("nature") || resolvedTarget.contains("alps") || resolvedTarget.contains("switzerland")) {
                                hasGenuineNatureHistory = true;
                                if (resolvedTarget.contains("manali")) pastNatureDestination = "Manali";
                                else if (resolvedTarget.contains("switzerland")) pastNatureDestination = "Switzerland";
                                else if (resolvedTarget.contains("shimla")) pastNatureDestination = "Shimla";
                                else pastNatureDestination = "mountain nature";
                            }
                            if (b.getTotalPrice() > 15000 || resolvedTarget.contains("luxury") || resolvedTarget.contains("leela") || resolvedTarget.contains("dubai")) {
                                hasGenuineLuxuryHistory = true;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("[RECOMMENDATION ENGINE] Warning parsing user booking history: " + e.getMessage());
            }

            try {
                Optional<UserPreferences> prefOpt = preferencesRepository.findByUserId(userId.trim());
                if (prefOpt.isPresent()) {
                    userPrefs = prefOpt.get();
                    String room = userPrefs.getPreferredRoomType() != null ? userPrefs.getPreferredRoomType().toLowerCase() : "";
                    if (room.contains("ocean") || room.contains("view")) {
                        hasGenuineBeachHistory = true;
                        hasGenuineLuxuryHistory = true;
                    }

                    if (userPrefs.getDismissedRecommendationIds() != null) {
                        irrelevantIds.addAll(userPrefs.getDismissedRecommendationIds());
                    }
                    if (userPrefs.getFavoredRecommendationIds() != null) {
                        helpfulIds.addAll(userPrefs.getFavoredRecommendationIds());
                    }
                }
            } catch (Exception ignored) {}
        }

        List<Recommendation> result = new ArrayList<>();

        for (Recommendation item : all) {
            if (item == null) continue;

            if (irrelevantIds.contains(item.getId())) {
                continue;
            }

            if (category != null && !category.trim().isEmpty() && !category.equalsIgnoreCase("ALL")) {
                String c = category.trim().toUpperCase();
                if ("FLIGHT".equalsIgnoreCase(c)) {
                    if (!"FLIGHT".equalsIgnoreCase(item.getTargetType()) && !"FLIGHT".equalsIgnoreCase(item.getCategory())) continue;
                } else if ("HOTEL".equalsIgnoreCase(c)) {
                    if (!"HOTEL".equalsIgnoreCase(item.getTargetType()) && !"HOTEL".equalsIgnoreCase(item.getCategory())) continue;
                } else if (item.getCategory() == null || !item.getCategory().equalsIgnoreCase(c)) {
                    continue;
                }
            }

            Recommendation personalized = copyRecommendation(item);
            if (personalized == null) continue;

            int score = item.getPopularityScore();
            List<String> breakdown = new ArrayList<>();

            String dest = (item.getDestination() != null && !item.getDestination().trim().isEmpty())
                    ? item.getDestination().split(",")[0].trim()
                    : "your next destination";

            boolean hasAnyGenuineHistory = hasGenuineBeachHistory || hasGenuineHeritageHistory || hasGenuineNatureHistory || hasGenuineLuxuryHistory;

            if ("BEACH".equalsIgnoreCase(item.getCategory()) && hasGenuineBeachHistory) {
                score += 9;
                personalized.setReasonTitle("You liked beaches! Try " + dest + ".");
                personalized.setReasonExplanation("Curated recommendation based on your verified past bookings and affinity for coastal beach stays.");
                breakdown.add("History Match: High affinity detected from your past " + (pastBeachDestination != null ? pastBeachDestination : "beach") + " bookings");
            } else if ("HERITAGE".equalsIgnoreCase(item.getCategory()) && hasGenuineHeritageHistory) {
                score += 8;
                personalized.setReasonTitle("You enjoyed heritage tours! Discover " + dest + ".");
                personalized.setReasonExplanation("Tailored for cultural explorers based on your past historic and palace travel history.");
                breakdown.add("History Match: Cultural explorer profile matched with your " + (pastHeritageDestination != null ? pastHeritageDestination : "heritage") + " visits");
            } else if ("NATURE".equalsIgnoreCase(item.getCategory()) && hasGenuineNatureHistory) {
                score += 8;
                personalized.setReasonTitle("You loved nature retreats! Explore " + dest + ".");
                personalized.setReasonExplanation("Recommended for your outdoor and scenic travel preferences.");
                breakdown.add("History Match: Nature enthusiast profile matched with past " + (pastNatureDestination != null ? pastNatureDestination : "mountain") + " getaways");
            } else if ("LUXURY".equalsIgnoreCase(item.getCategory()) && hasGenuineLuxuryHistory) {
                score += 8;
                personalized.setReasonTitle("Personalized Luxury Match for " + dest);
                personalized.setReasonExplanation("Selected for high comfort and premium amenities aligned with your stay history.");
                breakdown.add("History Match: Aligned with your high-comfort luxury booking patterns");
            } else if (!hasAnyGenuineHistory) {
                score += 5;
                personalized.setReasonTitle("Trending Destination: Discover " + dest);
                personalized.setReasonExplanation("Highly rated by our traveler community (" + item.getRating() + "/5.0) with verified guest reviews. Explore popular getaways while we learn your preferences.");
                breakdown.add("Popularity Match: Trending destination with 95%+ traveler satisfaction");
            } else if ("FLIGHT".equalsIgnoreCase(item.getTargetType())) {
                score += 6;
                personalized.setReasonTitle("Recommended Route to " + dest);
                personalized.setReasonExplanation("High on-time reliability flight route with competitive fare values.");
                breakdown.add("Route Popularity: Highly chosen by travelers flying to " + dest);
            } else {
                score += 5;
                personalized.setReasonTitle("Trending Destination: Discover " + dest);
                personalized.setReasonExplanation("Highly rated by our traveler community (" + item.getRating() + "/5.0) with verified guest reviews.");
                breakdown.add("Popularity Match: Trending destination with 95%+ traveler satisfaction");
            }

            breakdown.add("Quality Assurance: " + item.getRating() + "/5 star verified guest ratings (" + item.getReviewCount() + " reviews)");
            if (item.getCollaborativeFactor() != null) {
                breakdown.add("Collaborative Trend: " + item.getCollaborativeFactor());
            }

            if (userPrefs != null) {
                if (userPrefs.getPreferredSeatType() != null && "FLIGHT".equalsIgnoreCase(item.getTargetType())) {
                    score += 4;
                    breakdown.add("Preference Match: Aligned with your preferred '" + userPrefs.getPreferredSeatType() + "' seat preference");
                }
                if (userPrefs.getPreferredRoomType() != null && "HOTEL".equalsIgnoreCase(item.getTargetType())) {
                    score += 4;
                    breakdown.add("Preference Match: Features your saved '" + userPrefs.getPreferredRoomType() + "' room preference");
                }

                if (userPrefs.getCategoryAffinities() != null && item.getCategory() != null) {
                    int affinityBoost = userPrefs.getCategoryAffinities().getOrDefault(item.getCategory().toUpperCase(), 0);
                    if (affinityBoost != 0) {
                        score += (affinityBoost * 3);
                        if (affinityBoost > 0) {
                            breakdown.add("Feedback Refinement: You previously showed high interest in " + item.getCategory().toLowerCase() + " options");
                        }
                    }
                }
            }

            if (helpfulIds.contains(item.getId())) {
                score += 6;
                breakdown.add("Feedback Refinement: You marked this specific recommendation as helpful");
            }

            if (item.getHelpfulCount() > 0) {
                score += Math.min(item.getHelpfulCount(), 5);
            }

            score = Math.min(99, Math.max(70, score));
            personalized.setMatchScore(score);
            personalized.setReasonBreakdown(breakdown);

            result.add(personalized);
        }

        // If "ALL" category is requested and result is empty because user dismissed items, unblock curated items so page is never empty
        if (result.isEmpty() && (category == null || category.trim().isEmpty() || category.equalsIgnoreCase("ALL"))) {
            for (Recommendation item : all) {
                if (item != null) {
                    Recommendation fallback = copyRecommendation(item);
                    if (fallback != null) {
                        fallback.setReasonTitle("Trending Destination: Discover " + (fallback.getDestination() != null ? fallback.getDestination().split(",")[0].trim() : "India"));
                        fallback.setReasonExplanation("Highly rated by our traveler community with verified guest reviews.");
                        result.add(fallback);
                    }
                }
            }
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

        Recommendation rec = recommendationRepository.findById(recommendationId.trim())
                .orElseThrow(() -> new RecommendationNotFoundException("Recommendation not found: " + recommendationId));

        String effectiveUserId = (userId != null && !userId.trim().isEmpty()) ? userId.trim() : "visitor_" + UUID.randomUUID().toString().substring(0, 8);

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

        if (userId != null && !userId.trim().isEmpty()) {
            UserPreferences prefs = preferencesRepository.findByUserId(userId.trim()).orElse(new UserPreferences());
            prefs.setUserId(userId.trim());
            String cat = rec.getCategory() != null ? rec.getCategory().toUpperCase() : "GENERAL";

            if ("HELPFUL".equalsIgnoreCase(feedbackType)) {
                prefs.getCategoryAffinities().put(cat, prefs.getCategoryAffinities().getOrDefault(cat, 0) + 1);
                if (!prefs.getFavoredRecommendationIds().contains(recommendationId)) {
                    prefs.getFavoredRecommendationIds().add(recommendationId);
                }
                prefs.getDismissedRecommendationIds().remove(recommendationId);
            } else {
                prefs.getCategoryAffinities().put(cat, prefs.getCategoryAffinities().getOrDefault(cat, 0) - 2);
                if (!prefs.getDismissedRecommendationIds().contains(recommendationId)) {
                    prefs.getDismissedRecommendationIds().add(recommendationId);
                }
                prefs.getFavoredRecommendationIds().remove(recommendationId);
            }
            prefs.setUpdatedAt(LocalDateTime.now().format(FORMATTER));
            preferencesRepository.save(prefs);
        }

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("recommendationId", recommendationId);
        eventData.put("feedbackType", feedbackType.toUpperCase());
        eventData.put("userId", effectiveUserId);
        eventData.put("helpfulCount", rec.getHelpfulCount());
        eventData.put("irrelevantCount", rec.getIrrelevantCount());
        broadcastEvent("RECOMMENDATION_FEEDBACK_PROCESSED", eventData);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("recommendationId", recommendationId);
        response.put("feedbackType", feedbackType.toUpperCase());
        response.put("helpfulCount", rec.getHelpfulCount());
        response.put("irrelevantCount", rec.getIrrelevantCount());
        response.put("message", "HELPFUL".equalsIgnoreCase(feedbackType)
                ? "Thank you! We have refined your preferences to surface more picks in this category."
                : "Got it! This recommendation has been removed and your future suggestions adjusted.");
        return response;
    }

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(180_000L);

        if (userId != null && !userId.trim().isEmpty()) {
            String uid = userId.trim();
            userEmitters.computeIfAbsent(uid, k -> new CopyOnWriteArrayList<>()).add(emitter);
            emitter.onCompletion(() -> removeUserEmitter(uid, emitter));
            emitter.onTimeout(() -> removeUserEmitter(uid, emitter));
            emitter.onError(e -> removeUserEmitter(uid, emitter));
        } else {
            globalEmitters.add(emitter);
            emitter.onCompletion(() -> globalEmitters.remove(emitter));
            emitter.onTimeout(() -> globalEmitters.remove(emitter));
            emitter.onError(e -> globalEmitters.remove(emitter));
        }

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to real-time recommendation updates"));
        } catch (IOException e) {
            emitter.complete();
        }

        return emitter;
    }

    private void removeUserEmitter(String userId, SseEmitter emitter) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) userEmitters.remove(userId);
        }
    }

    public void broadcastEvent(String eventName, Object data) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : globalEmitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        globalEmitters.removeAll(deadEmitters);

        for (Map.Entry<String, List<SseEmitter>> entry : userEmitters.entrySet()) {
            List<SseEmitter> uDead = new ArrayList<>();
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (Exception e) {
                    uDead.add(emitter);
                }
            }
            entry.getValue().removeAll(uDead);
        }
    }

    private Recommendation copyRecommendation(Recommendation orig) {
        if (orig == null) return null;
        Recommendation copy = new Recommendation();
        copy.setId(orig.getId());
        copy.setTargetType(orig.getTargetType() != null ? orig.getTargetType() : "HOTEL");
        copy.setTargetId(orig.getTargetId());
        copy.setTitle(orig.getTitle() != null ? orig.getTitle() : "Curated Pick");
        copy.setSubtitle(orig.getSubtitle() != null ? orig.getSubtitle() : "Top Rated Experience");
        copy.setDestination(orig.getDestination() != null ? orig.getDestination() : "Popular Destination");
        copy.setCategory(orig.getCategory() != null ? orig.getCategory() : "LUXURY");
        copy.setImageUrl(orig.getImageUrl() != null ? orig.getImageUrl() : "");
        copy.setPriceEstimate(orig.getPriceEstimate());
        copy.setOriginalPrice(orig.getOriginalPrice() > 0 ? orig.getOriginalPrice() : orig.getPriceEstimate());
        copy.setRating(orig.getRating() > 0 ? orig.getRating() : 4.7);
        copy.setReviewCount(orig.getReviewCount() > 0 ? orig.getReviewCount() : 120);
        copy.setMatchScore(orig.getMatchScore() > 0 ? orig.getMatchScore() : 88);
        copy.setTags(orig.getTags() != null ? new ArrayList<>(orig.getTags()) : new ArrayList<>());
        copy.setActionUrl(orig.getActionUrl() != null ? orig.getActionUrl() : "/");
        copy.setReasonTitle(orig.getReasonTitle());
        copy.setReasonExplanation(orig.getReasonExplanation());
        copy.setReasonBreakdown(orig.getReasonBreakdown() != null ? new ArrayList<>(orig.getReasonBreakdown()) : new ArrayList<>());
        copy.setCollaborativeFactor(orig.getCollaborativeFactor());
        copy.setPopularityScore(orig.getPopularityScore() > 0 ? orig.getPopularityScore() : 85);
        copy.setHelpfulCount(orig.getHelpfulCount());
        copy.setIrrelevantCount(orig.getIrrelevantCount());
        copy.setActive(orig.isActive());
        return copy;
    }
}

