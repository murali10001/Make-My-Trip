package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.services.FlightService;
import com.makemytrip.makemytrip.services.HotelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserRepository userRepository;

    private final HotelService hotelService;

    private final FlightService flightService;

    AdminController(UserRepository userRepository, HotelService hotelService, FlightService flightService) {
        this.userRepository = userRepository;
        this.hotelService = hotelService;
        this.flightService = flightService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Users>> getallusers() {
        List<Users> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/flight")
    public ResponseEntity<Flight> addflight(@RequestBody Flight flight) {
        Flight saved = flightService.addFlight(flight);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/hotel")
    public ResponseEntity<Hotel> addhotel(@RequestBody Hotel hotel) {
        Hotel saved = hotelService.addHotel(hotel);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("flight/{id}")
    public ResponseEntity<Flight> editflight(@PathVariable String id, @RequestBody Flight updatedFlight) {
        Flight flight = flightService.updateFlight(id, updatedFlight);
        return ResponseEntity.ok(flight);
    }

    @PutMapping("hotel/{id}")
    public ResponseEntity<Hotel> editHotel(@PathVariable String id, @RequestBody Hotel updatedHotel) {
        Hotel hotel = hotelService.updateHotel(id, updatedHotel);
        return ResponseEntity.ok(hotel);
    }
}