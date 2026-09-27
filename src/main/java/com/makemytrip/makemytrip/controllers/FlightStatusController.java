package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.services.EmailService;
import com.makemytrip.makemytrip.services.FlightStatusService;
import com.makemytrip.makemytrip.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/flight-status")
@CrossOrigin(origins = "*")
public class FlightStatusController {

    @Autowired
    private FlightStatusService flightStatusService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationService notificationService;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFlightUpdates() {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 mins
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event().name("connect").data("Connected to live flight status stream"));
        } catch (IOException ignored) {}
        return emitter;
    }

    public void broadcastUpdate(FlightStatus status) {
        if (status == null) return;

        // Persist notification in MongoDB for Navbar bell
        try {
            if (notificationService != null) {
                String title = "Flight " + status.getFlightNumber() + " is " + (status.getStatus() != null ? status.getStatus() : "UPDATED");
                String reason = status.getDelayReason() != null && !status.getDelayReason().isEmpty()
                                ? status.getDelayReason()
                                : "Status updated to " + status.getStatus();
                String message = status.getAirline() + " (" + status.getOrigin() + " to " + status.getDestination() + "): " + reason;
                notificationService.createNotification(
                    "ALL",
                    title,
                    message,
                    "flight"
                );
            }
        } catch (Exception e) {
            System.err.println("Failed to persist notification in MongoDB: " + e.getMessage());
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("flight-update").data(status));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        emitters.removeAll(deadEmitters);
    }


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
    public ResponseEntity<FlightStatus> simulateUpdate(@RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            payload = new java.util.HashMap<>();
        }
        String flightNumber = (String) payload.get("flightNumber");

        if (flightNumber == null || flightNumber.trim().isEmpty()) {
            FlightStatus randomUpdate = flightStatusService.triggerRandomSimulation();
            broadcastUpdate(randomUpdate);
            return ResponseEntity.ok(randomUpdate);
        }

        String status = (String) payload.get("status");
        String delayReason = (String) payload.get("delayReason");
        String revisedDeparture = (String) payload.get("revisedDeparture");
        String revisedArrival = (String) payload.get("revisedArrival");
        String gate = (String) payload.get("gate");
        String terminal = (String) payload.get("terminal");
        Object rawEst = payload.get("estimatedArrivalMinutes");
        Integer estMins = null;
        if(rawEst instanceof Number) {
            estMins = ((Number) rawEst).intValue();
        } else if (rawEst instanceof String) {
            try {
                estMins = Integer.parseInt((String) rawEst);
            } catch (Exception e) {}
        }

        FlightStatus updated = flightStatusService.updateFlightStatus(
            flightNumber, status, delayReason, revisedDeparture, revisedArrival, gate, terminal, estMins
        );

        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        broadcastUpdate(updated);

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
        broadcastUpdate(updated);
        return ResponseEntity.ok(updated);
    }

    @RequestMapping(value = "/simulate-all", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<List<FlightStatus>> simulateAll() {
        List<FlightStatus> updatedFlights = flightStatusService.triggerAllFlightsSimulation();
        for (FlightStatus flight : updatedFlights) {
            broadcastUpdate(flight);
        }
        return ResponseEntity.ok(updatedFlights);
    }

    @PostMapping("/notify-email")

    public ResponseEntity<Map<String, Object>> sendEmailNotification(@RequestBody Map<String, String> payload) {
        String flightNumber = payload.get("flightNumber");
        String email = payload.get("email");

        if (flightNumber == null || flightNumber.trim().isEmpty() || email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "flightNumber and email are required."));
        }

        Optional<FlightStatus> flightOpt = flightStatusService.getFlightByNumber(flightNumber);
        if (!flightOpt.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Flight status not found for flight number: " + flightNumber));
        }

        FlightStatus flight = flightOpt.get();
        Map<String, Object> result = emailService.sendFlightStatusEmailDetails(email, flight);
        result.put("flightNumber", flight.getFlightNumber());
        result.put("status", flight.getStatus());
        result.put("recipient", email);

        return ResponseEntity.ok(result);
    }

}

