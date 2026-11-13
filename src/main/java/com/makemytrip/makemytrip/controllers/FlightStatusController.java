package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.services.FlightStatusService;
import com.makemytrip.makemytrip.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping({"/api/flight-status", "/api/flights/status"})
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

        // Broadcast real-time telemetry over SSE for flight radar listeners
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
        List<FlightStatus> changed = flightStatusService.validateAndSyncChangedFlights();
        List<FlightStatus> all = flightStatusService.getAllFlights(null, null);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Flight statuses validated and synchronized with real-time Indian Standard Time.",
            "totalFlights", all.size(),
            "changedFlights", changed.size(),
            "flights", all
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

    @GetMapping("/user-tracked/{userId}")
    public ResponseEntity<List<String>> getUserTrackedFlights(@PathVariable String userId) {
        List<String> list = flightStatusService.getUserTrackedFlightNumbers(userId);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/user-tracked/{userId}")
    public ResponseEntity<Map<String, Object>> toggleUserTrackedFlight(
            @PathVariable String userId,
            @RequestBody Map<String, String> payload) {
        String flightNumber = payload.get("flightNumber");
        if (flightNumber == null || flightNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "flightNumber is required"));
        }
        List<String> updated = flightStatusService.toggleUserTrackFlight(userId, flightNumber);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "userId", userId,
            "flightNumber", flightNumber,
            "trackedFlights", updated
        ));
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
        if (rawEst instanceof Number) {
            estMins = ((Number) rawEst).intValue();
        } else if (rawEst instanceof String) {
            try {
                estMins = Integer.parseInt((String) rawEst);
            } catch (Exception ignored) {}
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
