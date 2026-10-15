package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.services.FlightService;
import com.makemytrip.makemytrip.services.HotelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
public class RootController {

    @Autowired
    private HotelService hotelService;

    @Autowired
    private FlightService flightService;

    @GetMapping("/")
    public String home() {
        return "MakeMyTrip Backend Server is running on port 8081!";
    }

    @GetMapping("/hotel")
    public ResponseEntity<List<Hotel>> getallhotel(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String query) {
        List<Hotel> hotels = hotelService.getHotels(location, query);
        return ResponseEntity.ok(hotels);
    }

    @GetMapping("/hotel/{id}")
    public ResponseEntity<Hotel> getHotelById(@PathVariable String id) {
        Hotel hotel = hotelService.getHotelById(id);
        return ResponseEntity.ok(hotel);
    }

    @GetMapping("/flight")
    public ResponseEntity<List<Flight>> getallflights(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        List<Flight> flights = flightService.getFlights(from, to);
        return ResponseEntity.ok(flights);
    }

    @GetMapping("/flight/{id}")
    public ResponseEntity<Flight> getFlightById(@PathVariable String id) {
        Flight flight = flightService.getFlightById(id);
        return ResponseEntity.ok(flight);
    }
}
