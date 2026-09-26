package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.HotelNotFoundException;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HotelServiceTest {

    @Mock
    private HotelRepository hotelRepository;

    @InjectMocks
    private HotelService hotelService;

    private Hotel hotel;

    @BeforeEach
    void setUp() {
        hotel = new Hotel();
        hotel.setId("HT-001");
        hotel.setHotelName("Marriott Resort");
        hotel.setLocation("Goa");
        hotel.setAvailableRooms(15);
        hotel.setPricePerNight(8500.0);
    }

    @Test
    @DisplayName("Get All Hotels")
    void testGetAllHotels() {
        when(hotelRepository.findAll()).thenReturn(Arrays.asList(hotel));

        List<Hotel> result = hotelService.getAllHotels();

        assertEquals(1, result.size());
        assertEquals("Marriott Resort", result.get(0).getHotelName());
    }

    @Test
    @DisplayName("Get Hotel By ID - Success")
    void testGetHotelById_Success() {
        when(hotelRepository.findById("HT-001")).thenReturn(Optional.of(hotel));

        Hotel found = hotelService.getHotelById("HT-001");

        assertNotNull(found);
        assertEquals("Goa", found.getLocation());
    }

    @Test
    @DisplayName("Get Hotel By ID - Throws HotelNotFoundException")
    void testGetHotelById_NotFound() {
        when(hotelRepository.findById("HT-INVALID")).thenReturn(Optional.empty());

        assertThrows(HotelNotFoundException.class, () -> hotelService.getHotelById("HT-INVALID"));
    }
}
