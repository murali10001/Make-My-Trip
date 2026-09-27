package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.RoomTypeOption;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomTypeOptionRepository extends MongoRepository<RoomTypeOption, String> {
    List<RoomTypeOption> findByHotelId(String hotelId);
}
