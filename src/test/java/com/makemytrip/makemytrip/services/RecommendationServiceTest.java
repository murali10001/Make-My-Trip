package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Recommendation;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RecommendationFeedbackRepository;
import com.makemytrip.makemytrip.repositories.RecommendationRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RecommendationServiceTest {

    @Mock
    private RecommendationRepository recommendationRepository;

    @Mock
    private RecommendationFeedbackRepository feedbackRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserPreferencesRepository preferencesRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private FlightRepository flightRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    private Recommendation heritageRec;
    private Recommendation beachRec;

    @BeforeEach
    void setUp() {
        heritageRec = new Recommendation();
        heritageRec.setId("REC-1");
        heritageRec.setCategory("HERITAGE");
        heritageRec.setDestination("Jaipur");
        heritageRec.setTargetType("HOTEL");
        heritageRec.setPopularityScore(80);

        beachRec = new Recommendation();
        beachRec.setId("REC-2");
        beachRec.setCategory("BEACH");
        beachRec.setDestination("Goa");
        beachRec.setTargetType("FLIGHT");
        beachRec.setPopularityScore(80);
    }

    @Test
    void testGetRecommendations_ResolvesHotelEntityFromTargetId() {
        String hotelMongoId = "65a123f987bcda1";
        Users user = new Users();
        user.setId("USR-555");
        Users.Booking booking = new Users.Booking();
        booking.setBookingId("BK-1");
        booking.setType("Hotel");
        booking.setTargetId(hotelMongoId);
        booking.setTotalPrice(5000);
        user.setBookings(List.of(booking));

        Hotel mockHotel = new Hotel();
        mockHotel.setId(hotelMongoId);
        mockHotel.setHotelName("Heritage Haveli");
        mockHotel.setLocation("Jaipur, Rajasthan");
        when(hotelRepository.findById(hotelMongoId)).thenReturn(Optional.of(mockHotel));

        when(userRepository.findById("USR-555")).thenReturn(Optional.of(user));
        when(preferencesRepository.findByUserId("USR-555")).thenReturn(Optional.empty());
        when(feedbackRepository.findByUserId("USR-555")).thenReturn(new ArrayList<>());
        when(recommendationRepository.findByActiveTrue()).thenReturn(List.of(heritageRec));

        List<Recommendation> recs = recommendationService.getRecommendations("USR-555", "HERITAGE");

        assertNotNull(recs);
        assertEquals(1, recs.size());
        Recommendation rec = recs.get(0);
        assertTrue(rec.getReasonTitle().contains("heritage"));
        assertTrue(rec.getReasonBreakdown().stream().anyMatch(b -> b.contains("Jaipur")));
    }

    @Test
    void testGetRecommendations_ResolvesFlightEntityFromTargetId() {
        String flightMongoId = "65b999faabbcc";
        Users user = new Users();
        user.setId("USR-666");
        Users.Booking booking = new Users.Booking();
        booking.setBookingId("BK-2");
        booking.setType("Flight");
        booking.setTargetId(flightMongoId);
        booking.setTotalPrice(4000);
        user.setBookings(List.of(booking));

        Flight mockFlight = new Flight();
        mockFlight.setId(flightMongoId);
        mockFlight.setFlightName("Air India Express");
        mockFlight.setFrom("Delhi");
        mockFlight.setTo("Goa");
        when(flightRepository.findById(flightMongoId)).thenReturn(Optional.of(mockFlight));

        when(userRepository.findById("USR-666")).thenReturn(Optional.of(user));
        when(preferencesRepository.findByUserId("USR-666")).thenReturn(Optional.empty());
        when(feedbackRepository.findByUserId("USR-666")).thenReturn(new ArrayList<>());
        when(recommendationRepository.findByActiveTrue()).thenReturn(List.of(beachRec));

        List<Recommendation> recs = recommendationService.getRecommendations("USR-666", "BEACH");

        assertNotNull(recs);
        assertEquals(1, recs.size());
        Recommendation rec = recs.get(0);
        assertTrue(rec.getReasonTitle().contains("beaches"));
        assertTrue(rec.getReasonBreakdown().stream().anyMatch(b -> b.contains("Goa")));
    }
}
