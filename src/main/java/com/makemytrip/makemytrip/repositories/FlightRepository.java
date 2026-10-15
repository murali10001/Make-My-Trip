package com.makemytrip.makemytrip.repositories;
import com.makemytrip.makemytrip.models.Flight;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FlightRepository extends MongoRepository<Flight,String> {
    List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to);
    List<Flight> findByFromContainingIgnoreCase(String from);
    List<Flight> findByToContainingIgnoreCase(String to);
}
