package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.CancellationNotAllowedException;
import com.makemytrip.makemytrip.exceptions.RefundNotFoundException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefundRepository refundRepository;

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RefundService refundService;

    private Users testUser;
    private Booking flightBooking;
    private Booking hotelBooking;
    private Flight testFlight;
    private Hotel testHotel;

    @BeforeEach
    void setUp() {
        testUser = new Users();
        testUser.setId("USR-001");
        testUser.setEmail("tester@makemytrip.com");
        testUser.setBookings(new ArrayList<>());

        flightBooking = new Booking();
        flightBooking.setBookingId("BK-FL-12345");
        flightBooking.setType("Flight");
        flightBooking.setDate(LocalDate.now().toString());
        flightBooking.setBookingTimestamp(LocalDateTime.now().minusHours(2).toString());
        flightBooking.setQuantity(2);
        flightBooking.setTotalPrice(10000.0);
        flightBooking.setTargetId("FL-101");
        flightBooking.setStatus("CONFIRMED");

        hotelBooking = new Booking();
        hotelBooking.setBookingId("BK-HT-67890");
        hotelBooking.setType("Hotel");
        hotelBooking.setDate(LocalDate.now().minusDays(5).toString());
        hotelBooking.setBookingTimestamp(LocalDateTime.now().minusHours(72).toString());
        hotelBooking.setQuantity(1);
        hotelBooking.setTotalPrice(6000.0);
        hotelBooking.setTargetId("HT-202");
        hotelBooking.setStatus("CONFIRMED");

        testUser.getBookings().add(flightBooking);
        testUser.getBookings().add(hotelBooking);

        testFlight = new Flight();
        testFlight.setId("FL-101");
        testFlight.setFlightName("Air India");
        testFlight.setAvailableSeats(50);

        testHotel = new Hotel();
        testHotel.setId("HT-202");
        testHotel.setHotelName("Grand Palace");
        testHotel.setAvailableRooms(10);
    }

    @Test
    @DisplayName("Calculate Refund Preview - Within 24 Hours applies 50% Refund Policy")
    void testCalculateRefundPreview_Within24Hours_Applies50Percent() {
        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));

        Map<String, Object> preview = refundService.calculateRefundPreview("USR-001", "BK-FL-12345");

        assertNotNull(preview);
        assertEquals("BK-FL-12345", preview.get("bookingId"));
        assertEquals(50.0, preview.get("refundPercentage"));
        assertEquals(5000.0, preview.get("refundAmount"));
        assertEquals(5000.0, preview.get("deductionAmount"));
        assertTrue(preview.get("policyApplied").toString().contains("50% Refund"));
    }

    @Test
    @DisplayName("Calculate Refund Preview - After 24 Hours applies 80% Standard Policy")
    void testCalculateRefundPreview_After24Hours_Applies80Percent() {
        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));

        Map<String, Object> preview = refundService.calculateRefundPreview("USR-001", "BK-HT-67890");

        assertNotNull(preview);
        assertEquals("BK-HT-67890", preview.get("bookingId"));
        assertEquals(80.0, preview.get("refundPercentage"));
        assertEquals(4800.0, preview.get("refundAmount"));
        assertEquals(1200.0, preview.get("deductionAmount"));
        assertTrue(preview.get("policyApplied").toString().contains("80% Refund"));
    }

    @Test
    @DisplayName("Calculate Refund Preview - Already Cancelled Booking Throws Exception")
    void testCalculateRefundPreview_AlreadyCancelled_ThrowsException() {
        flightBooking.setStatus("CANCELLED");
        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));

        assertThrows(CancellationNotAllowedException.class, () ->
                refundService.calculateRefundPreview("USR-001", "BK-FL-12345")
        );
    }

    @Test
    @DisplayName("Calculate Refund Preview - User Not Found Throws Exception")
    void testCalculateRefundPreview_UserNotFound_ThrowsException() {
        when(userRepository.findById("NON_EXISTENT")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () ->
                refundService.calculateRefundPreview("NON_EXISTENT", "BK-FL-12345")
        );
    }

    @Test
    @DisplayName("Process Cancellation - Success restores Flight inventory and creates RefundRequest")
    void testProcessCancellation_Success_Flight() {
        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));
        when(flightRepository.findById("FL-101")).thenReturn(Optional.of(testFlight));
        when(refundRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequest refund = refundService.processCancellationAndRequestRefund(
                "USR-001", "BK-FL-12345", "Change of travel plans", "Trip rescheduled"
        );

        assertNotNull(refund);
        assertTrue(refund.getRefundId().startsWith("RF-"));
        assertEquals("BK-FL-12345", refund.getBookingId());
        assertEquals("PENDING", refund.getStatus());
        assertEquals(5000.0, refund.getRefundAmount());
        assertEquals("CANCELLED", flightBooking.getStatus());
        assertEquals(52, testFlight.getAvailableSeats());

        verify(flightRepository).save(testFlight);
        verify(userRepository).save(testUser);
        verify(refundRepository).save(any(RefundRequest.class));
        verify(notificationService).createNotification(eq("USR-001"), anyString(), anyString(), eq("cancellation"));
    }

    @Test
    @DisplayName("Process Cancellation - Success restores Hotel inventory")
    void testProcessCancellation_Success_Hotel() {
        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));
        when(hotelRepository.findById("HT-202")).thenReturn(Optional.of(testHotel));
        when(refundRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequest refund = refundService.processCancellationAndRequestRefund(
                "USR-001", "BK-HT-67890", "Found a better deal / price drop", null
        );

        assertNotNull(refund);
        assertEquals(11, testHotel.getAvailableRooms());
        verify(hotelRepository).save(testHotel);
    }

    @Test
    @DisplayName("Process Cancellation - Blank Reason Throws IllegalArgumentException")
    void testProcessCancellation_BlankReason_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
                refundService.processCancellationAndRequestRefund("USR-001", "BK-FL-12345", "   ", "")
        );
    }

    @Test
    @DisplayName("Get Refund By RefundId - Found")
    void testGetRefundByRefundId_Found() {
        RefundRequest mockRequest = new RefundRequest();
        mockRequest.setRefundId("RF-112233");
        when(refundRepository.findByRefundId("RF-112233")).thenReturn(Optional.of(mockRequest));

        RefundRequest found = refundService.getRefundByRefundId("RF-112233");
        assertNotNull(found);
        assertEquals("RF-112233", found.getRefundId());
    }

    @Test
    @DisplayName("Get Refund By RefundId - Not Found Throws RefundNotFoundException")
    void testGetRefundByRefundId_NotFound() {
        when(refundRepository.findByRefundId("RF-INVALID")).thenReturn(Optional.empty());

        assertThrows(RefundNotFoundException.class, () ->
                refundService.getRefundByRefundId("RF-INVALID")
        );
    }

    @Test
    @DisplayName("Update Refund Status - Transitions to PROCESSED and COMPLETED")
    void testUpdateRefundStatus_Transitions() {
        RefundRequest mockRequest = new RefundRequest();
        mockRequest.setRefundId("RF-999");
        mockRequest.setUserId("USR-001");
        mockRequest.setBookingId("BK-FL-12345");
        mockRequest.setStatus("PENDING");
        mockRequest.setRefundAmount(5000.0);

        when(refundRepository.findByRefundId("RF-999")).thenReturn(Optional.of(mockRequest));
        when(refundRepository.save(any(RefundRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RefundRequest processed = refundService.updateRefundStatus("RF-999", "PROCESSED");
        assertEquals("PROCESSED", processed.getStatus());
        assertEquals(2, processed.getCurrentStep());

        RefundRequest completed = refundService.updateRefundStatus("RF-999", "COMPLETED");
        assertEquals("COMPLETED", completed.getStatus());
        assertEquals(3, completed.getCurrentStep());

        verify(notificationService, atLeastOnce()).createNotification(eq("USR-001"), anyString(), anyString(), eq("refund"));
    }

    @Test
    @DisplayName("Get User Refunds - Returns List")
    void testGetUserRefunds() {
        RefundRequest r1 = new RefundRequest();
        r1.setRefundId("RF-1");
        when(refundRepository.findByUserId("USR-001")).thenReturn(Arrays.asList(r1));

        List<RefundRequest> list = refundService.getUserRefunds("USR-001");
        assertEquals(1, list.size());
        assertEquals("RF-1", list.get(0).getRefundId());
    }
}
