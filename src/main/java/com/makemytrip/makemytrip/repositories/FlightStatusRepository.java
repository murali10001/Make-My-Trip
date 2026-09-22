package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.FlightStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightStatusRepository extends MongoRepository<FlightStatus, String> {

    Optional<FlightStatus> findByFlightNumberIgnoreCase(String flightNumber);

    List<FlightStatus> findByFlightNumberIn(List<String> flightNumbers);
}
