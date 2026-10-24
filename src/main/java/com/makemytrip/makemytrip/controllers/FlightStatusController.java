package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightStatus;
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
    private NotificationService notificationService;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFlightUpdates() {
        SseEmitter emitter = new SseEmitter(1800000L);
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

        // Routine radar telemetry is broadcast via SSE to connected flight tracker clients.
        // We do NOT persist spam notifications into MongoDB on every tick, which previously
        // flooded user accounts with hundreds of telemetry rows.
        try {
            if (notificationService != null && status.getStatus() != null) {
                String st = status.getStatus().toUpperCase();
                if ("DELAYED".equals(st) || "CANCELLED".equals(st)) {
                    String title = "Flight " + status.getFlightNumber() + " " + st;
                    String reason = status.getDelayReason() != null && !status.getDelayReason().isEmpty()
                                    ? status.getDelayReason()
                                    : "Flight has been " + st.toLowerCase();
                    String message = status.getAirline() + " (" + status.getOrigin() + " to " + status.getDestination() + "): " + reason;
                    com.makemytrip.makemytrip.models.Notification alert = new com.makemytrip.makemytrip.models.Notification(
                        "FLIGHT-ALERT-" + status.getFlightNumber(),
                        "ALL",
                        title,
                        message,
                        "Just now",
                        "flight"
                    );
                    notificationService.broadcastRealTimeNotification(alert);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to broadcast real-time flight alert: " + e.getMessage());
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

    @RequestMapping(value = "/validate-db", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> validateAndSyncDatabase() {
        List<FlightStatus> validated = flightStatusService.validateAndSyncAllFlights();
        for (FlightStatus f : validated) {
            broadcastUpdate(f);
        }
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Flight statuses validated and synchronized with real-time Indian Standard Time.",
            "totalFlights", validated.size(),
            "flights", validated
        ));
    }

    @GetMapping
    public ResponseEntity<List<FlightStatus>> getAllFlights(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "false") boolean validate) {
        if (validate) {
            flightStatusService.validateAndSyncAllFlights();
        }
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
}

