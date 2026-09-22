package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.HotelNotFoundException;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class HotelService {

    private final HotelRepository hotelRepository;

    HotelService(HotelRepository hotelRepository) {
        this.hotelRepository = hotelRepository;
    }

    public List<Hotel> getAllHotels() {
        return hotelRepository.findAll();
    }

    public Hotel getHotelById(String id) {
        return hotelRepository.findById(id)
            .orElseThrow(() -> new HotelNotFoundException("Hotel with ID " + id + " not found"));
    }

    public Hotel addHotel(Hotel hotel) {
        return hotelRepository.save(hotel);
    }

    public Hotel updateHotel(String id, Hotel updatedHotel) {
        Optional<Hotel> optionalHotel = hotelRepository.findById(id);
        if (optionalHotel.isPresent()) {
            Hotel hotel = optionalHotel.get();
            hotel.setHotelName(updatedHotel.getHotelName());
            hotel.setLocation(updatedHotel.getLocation());
            hotel.setAvailableRooms(updatedHotel.getAvailableRooms());
            hotel.setPricePerNight(updatedHotel.getPricePerNight());
            hotel.setAmenities(updatedHotel.getAmenities());
            if (updatedHotel.getImageUrl() != null) hotel.setImageUrl(updatedHotel.getImageUrl());
            if (updatedHotel.getImageUrls() != null) hotel.setImageUrls(updatedHotel.getImageUrls());
            if (updatedHotel.getDescription() != null) hotel.setDescription(updatedHotel.getDescription());
            if (updatedHotel.getRating() > 0) hotel.setRating(updatedHotel.getRating());
            if (updatedHotel.getTaxes() >= 0) hotel.setTaxes(updatedHotel.getTaxes());
            if (updatedHotel.getDiscountedPrice() >= 0) hotel.setDiscountedPrice(updatedHotel.getDiscountedPrice());
            if (updatedHotel.getRoomType() != null) hotel.setRoomType(updatedHotel.getRoomType());
            if (updatedHotel.getRoomFeatures() != null) hotel.setRoomFeatures(updatedHotel.getRoomFeatures());
            if (updatedHotel.getPropertyPhotos() > 0) hotel.setPropertyPhotos(updatedHotel.getPropertyPhotos());
            if (updatedHotel.getGuestPhotos() > 0) hotel.setGuestPhotos(updatedHotel.getGuestPhotos());
            if (updatedHotel.getReviewsCount() > 0) hotel.setReviewsCount(updatedHotel.getReviewsCount());
            if (updatedHotel.getReviewsRating() > 0) hotel.setReviewsRating(updatedHotel.getReviewsRating());
            if (updatedHotel.getReviewsText() != null) hotel.setReviewsText(updatedHotel.getReviewsText());
            if (updatedHotel.getDistance() != null) hotel.setDistance(updatedHotel.getDistance());
            return hotelRepository.save(hotel);
        }
        throw new HotelNotFoundException("Cannot update: Hotel with ID " + id + " not found");
    }
}
