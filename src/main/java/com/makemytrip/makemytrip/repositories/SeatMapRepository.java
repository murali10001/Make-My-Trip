package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.SeatMap;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeatMapRepository extends MongoRepository<SeatMap, String> {
    Optional<SeatMap> findByFlightId(String flightId);
}
