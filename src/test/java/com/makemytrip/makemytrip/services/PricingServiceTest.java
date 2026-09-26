package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.InvalidCouponException;
import com.makemytrip.makemytrip.exceptions.PriceFreezeExpiredException;
import com.makemytrip.makemytrip.models.DynamicPrice;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.OfferCoupon;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.OfferCouponRepository;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private OfferCouponRepository offerCouponRepository;

    @Mock
    private PriceFreezeRepository priceFreezeRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PricingService pricingService;

    private Flight mockFlight;
    private Hotel mockHotel;
    private OfferCoupon mockCoupon;

    @BeforeEach
    void setUp() {
        mockFlight = new Flight();
        mockFlight.setId("FL-101");
        mockFlight.setPrice(6000.0);

        mockHotel = new Hotel();
        mockHotel.setId("HT-201");
        mockHotel.setPricePerNight(4000.0);

        mockCoupon = new OfferCoupon();
        mockCoupon.setId("CP-001");
        mockCoupon.setCode("WELCOME100");
        mockCoupon.setTitle("Welcome Offer");
        mockCoupon.setActive(true);
        mockCoupon.setDiscountPercentage(15.0);
        mockCoupon.setMinBookingAmount(2000.0);
        mockCoupon.setMaxDiscountAmount(1000.0);
        mockCoupon.setBadgeText("BESTSELLER");
    }

    @Test
    @DisplayName("Calculate Dynamic Price for Flight with High Demand and Holiday Peak")
    void testCalculateDynamicPrice_Flight_HighDemand_HolidayPeak() {
        when(flightRepository.findById("FL-101")).thenReturn(Optional.of(mockFlight));

        DynamicPrice result = pricingService.calculateDynamicPrice("FL-101", "FLIGHT", 0, "HIGH", "HOLIDAY_PEAK");

        assertNotNull(result);
        assertEquals("FL-101", result.getItemId());
        assertEquals("FLIGHT", result.getItemType());
        assertEquals(6000.0, result.getBasePrice());
        assertEquals("HIGH", result.getDemandLevel());
        assertEquals("HOLIDAY_PEAK", result.getSeasonType());
        assertEquals(8100.0, result.getFinalPrice());
        assertFalse(result.getPriceHistory().isEmpty());
    }

    @Test
    @DisplayName("Calculate Dynamic Price with Null/Empty ItemId Fallback Base Price")
    void testCalculateDynamicPrice_FallbackBasePrice() {
        DynamicPrice result = pricingService.calculateDynamicPrice(null, "FLIGHT", -500, null, null);

        assertNotNull(result);
        assertEquals(5000.0, result.getBasePrice());
        assertEquals("NORMAL", result.getDemandLevel());
        assertEquals("REGULAR", result.getSeasonType());
        assertEquals(5000.0, result.getFinalPrice());
    }

    @Test
    @DisplayName("Freeze Price successfully creates PriceFreeze token")
    void testFreezePrice_Success() {
        when(priceFreezeRepository.save(any(PriceFreeze.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PriceFreeze freeze = pricingService.freezePrice("FL-101", "IndiGo 6E-202", 5000.0, 24,null);

        assertNotNull(freeze);
        assertTrue(freeze.getFreezeId().startsWith("FRZ-"));
        assertEquals("FL-101", freeze.getItemId());
        assertEquals(5000.0, freeze.getFrozenPrice());
        assertEquals(5750.0, freeze.getOriginalPrice());
        assertTrue(freeze.isActive());
        verify(notificationService, never()).createNotification(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Get Freeze Status - Active Freeze")
    void testGetFreezeStatus_Active() {
        PriceFreeze freeze = new PriceFreeze("FRZ-12345678", "FL-101", "Test Flight", 5000.0, 5750.0,
                LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(23), 24, true);

        when(priceFreezeRepository.findById("FRZ-12345678")).thenReturn(Optional.of(freeze));

        PriceFreeze result = pricingService.getFreezeStatus("FRZ-12345678");
        assertNotNull(result);
        assertTrue(result.isActive());
    }

    @Test
    @DisplayName("Get Freeze Status - Expired Freeze throws PriceFreezeExpiredException")
    void testGetFreezeStatus_Expired() {
        PriceFreeze freeze = new PriceFreeze("FRZ-EXPIRED", "FL-101", "Test Flight", 5000.0, 5750.0,
                LocalDateTime.now().minusHours(25), LocalDateTime.now().minusHours(1), 24, true);

        when(priceFreezeRepository.findById("FRZ-EXPIRED")).thenReturn(Optional.of(freeze));

        PriceFreezeExpiredException exception = assertThrows(
                PriceFreezeExpiredException.class,
                () -> pricingService.getFreezeStatus("FRZ-EXPIRED")
        );

        assertTrue(exception.getMessage().contains("expired"));
        assertFalse(freeze.isActive());
        verify(priceFreezeRepository).save(freeze);
    }

    @Test
    @DisplayName("Apply Coupon - Successful Discount Calculation with Max Cap")
    void testApplyCoupon_Success_Capped() {
        when(offerCouponRepository.findByCode("WELCOME100")).thenReturn(Optional.of(mockCoupon));

        Map<String, Object> result = pricingService.applyCoupon("WELCOME100", 10000.0);

        assertEquals(true, result.get("success"));
        assertEquals("WELCOME100", result.get("code"));
        assertEquals(1000.0, result.get("discountAmount"));
        assertEquals(9000.0, result.get("finalAmount"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException on Inactive Coupon")
    void testApplyCoupon_InactiveCoupon() {
        mockCoupon.setActive(false);
        when(offerCouponRepository.findByCode("INACTIVE")).thenReturn(Optional.of(mockCoupon));

        InvalidCouponException ex = assertThrows(
                InvalidCouponException.class,
                () -> pricingService.applyCoupon("INACTIVE", 5000.0)
        );
        assertTrue(ex.getMessage().contains("no longer active"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException when Amount is Below Minimum")
    void testApplyCoupon_BelowMinAmount() {
        when(offerCouponRepository.findByCode("WELCOME100")).thenReturn(Optional.of(mockCoupon));

        InvalidCouponException ex = assertThrows(
                InvalidCouponException.class,
                () -> pricingService.applyCoupon("WELCOME100", 1000.0)
        );
        assertTrue(ex.getMessage().contains("Minimum booking amount"));
    }

    @Test
    @DisplayName("Apply Coupon - Throws InvalidCouponException on Null or Blank Code")
    void testApplyCoupon_BlankCode() {
        assertThrows(InvalidCouponException.class, () -> pricingService.applyCoupon("   ", 5000.0));
    }
}
