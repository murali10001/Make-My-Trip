package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.services.EmailService;
import com.makemytrip.makemytrip.services.FlightStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/flight-status")
@CrossOrigin(origins = "*")
public class FlightStatusController {

    @Autowired
    private FlightStatusService flightStatusService;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public ResponseEntity<List<FlightStatus>> getAllFlights(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status) {
        List<FlightStatus> flights = flightStatusService.getAllFlights(query, status);
        return ResponseEntity.ok(flights);
    }

    @GetMapping("/{flightNumber}")
    public ResponseEntity<FlightStatus> getFlightByNumber(@PathVariable String flightNumber) {
        Optional<FlightStatus> flight = flightStatusService.getFlightByNumber(flightNumber);
        return flight.map(ResponseEntity::ok)
                     .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/tracked")
    public ResponseEntity<List<FlightStatus>> getTrackedFlights(@RequestBody List<String> flightNumbers) {
        List<FlightStatus> tracked = flightStatusService.getTrackedFlights(flightNumbers);
        return ResponseEntity.ok(tracked);
    }

    @PostMapping("/simulate")
    public ResponseEntity<FlightStatus> simulateUpdate(@RequestBody Map<String, Object> payload) {
        String flightNumber = (String) payload.get("flightNumber");
        if (flightNumber == null || flightNumber.trim().isEmpty()) {
            FlightStatus randomUpdate = flightStatusService.triggerRandomSimulation();
            return ResponseEntity.ok(randomUpdate);
        }

        String status = (String) payload.get("status");
        String delayReason = (String) payload.get("delayReason");
        String revisedDeparture = (String) payload.get("revisedDeparture");
        String revisedArrival = (String) payload.get("revisedArrival");
        String gate = (String) payload.get("gate");
        String terminal = (String) payload.get("terminal");
        Integer estMins = payload.get("estimatedArrivalMinutes") != null ? (Integer) payload.get("estimatedArrivalMinutes") : null;

        FlightStatus updated = flightStatusService.updateFlightStatus(
            flightNumber, status, delayReason, revisedDeparture, revisedArrival, gate, terminal, estMins
        );

        // Send email notification automatically if email provided
        String email = (String) payload.get("email");
        if (email != null && !email.isEmpty()) {
            emailService.sendFlightStatusEmail(email, updated);
        }

        return ResponseEntity.ok(updated);
    }

    @GetMapping("/simulate-random")
    public ResponseEntity<FlightStatus> triggerRandom() {
        FlightStatus updated = flightStatusService.triggerRandomSimulation();
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/notify-email")
    public ResponseEntity<Map<String, Object>> sendEmailNotification(@RequestBody Map<String, String> payload) {
        String flightNumber = payload.get("flightNumber");
        String email = payload.get("email");

        if (flightNumber == null || flightNumber.isEmpty()) {
            flightNumber = "AI-101";
        }
        if (email == null || email.isEmpty()) {
            email = "user-test@makemytour.com";
        }

        Optional<FlightStatus> flightOpt = flightStatusService.getFlightByNumber(flightNumber);
        FlightStatus flight = flightOpt.orElseGet(() -> flightStatusService.getAllFlights(null, null).get(0));

        Map<String, Object> result = emailService.sendFlightStatusEmailDetails(email, flight);
        result.put("flightNumber", flight.getFlightNumber());
        result.put("status", flight.getStatus());
        result.put("recipient", email);

        return ResponseEntity.ok(result);
    }

}
