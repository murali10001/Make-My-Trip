package com.makemytrip.makemytrip.repositories;
import com.makemytrip.makemytrip.models.Hotel;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface HotelRepository extends MongoRepository<Hotel,String> {
    List<Hotel> findByLocationContainingIgnoreCase(String location);
    List<Hotel> findByHotelNameContainingIgnoreCase(String hotelName);
}
