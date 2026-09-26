package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FlightStatusService {

    @Autowired
    private FlightStatusRepository flightStatusRepository;

    private final Random random = new Random();

    public List<FlightStatus> getAllFlights(String query, String status) {
        List<FlightStatus> allFlights = flightStatusRepository.findAll();
        return allFlights.stream()
            .filter(f -> {
                if (query != null && !query.trim().isEmpty()) {
                    String q = query.trim().toLowerCase();
                    boolean matchNum = f.getFlightNumber() != null && f.getFlightNumber().toLowerCase().contains(q);
                    boolean matchAirline = f.getAirline() != null && f.getAirline().toLowerCase().contains(q);
                    boolean matchOrigin = f.getOrigin() != null && f.getOrigin().toLowerCase().contains(q);
                    boolean matchDest = f.getDestination() != null && f.getDestination().toLowerCase().contains(q);
                    if (!matchNum && !matchAirline && !matchOrigin && !matchDest) {
                        return false;
                    }
                }
                if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                    if (f.getStatus() == null || !f.getStatus().equalsIgnoreCase(status.trim())) {
                        return false;
                    }
                }
                return true;
            })
            .collect(Collectors.toList());
    }

    public FlightStatus triggerRandomSimulation() {
        List<FlightStatus> flights = flightStatusRepository.findAll();
        if (flights.isEmpty()) return null;

        FlightStatus f = flights.get(random.nextInt(flights.size()));
        f.setLastUpdated(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        String currentStatus = f.getStatus() != null ? f.getStatus().toUpperCase() : "ON_TIME";
        if ("ON_TIME".equals(currentStatus)) {
            f.setStatus("BOARDING");
            f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate"));
        } else if ("BOARDING".equals(currentStatus)) {
            f.setStatus("IN_FLIGHT");
            f.setDelayReason("En route at cruising altitude");
            f.setEstimatedArrivalMinutes(Math.max(15, f.getEstimatedArrivalMinutes() - 20));
        } else if ("IN_FLIGHT".equals(currentStatus)) {
            f.setStatus("LANDED");
            f.setDelayReason("Landed safely - Taxiing to gate");
            f.setEstimatedArrivalMinutes(0);
        } else {
            f.setStatus("ON_TIME");
            f.setDelayReason("Operating on schedule");
            f.setRevisedDeparture(f.getScheduledDeparture());
            f.setRevisedArrival(f.getScheduledArrival());
        }

        return flightStatusRepository.save(f);
    }

    public Optional<FlightStatus> getFlightByNumber(String flightNumber) {
        if (flightNumber == null || flightNumber.trim().isEmpty()) {
            return Optional.empty();
        }
        return flightStatusRepository.findByFlightNumberIgnoreCase(flightNumber.trim());
    }

    public List<FlightStatus> getTrackedFlights(List<String> flightNumbers) {
        if (flightNumbers == null || flightNumbers.isEmpty()) {
            return Collections.emptyList();
        }
        return flightStatusRepository.findByFlightNumberIn(flightNumbers);
    }

    public FlightStatus updateFlightStatus(String flightNumber, String status, String delayReason,
                                           String revisedDeparture, String revisedArrival,
                                           String gate, String terminal, Integer estMins) {
        Optional<FlightStatus> flightOpt = getFlightByNumber(flightNumber);
        if (!flightOpt.isPresent()) {
            return null;
        }

        FlightStatus flight = flightOpt.get();
        if (status != null && !status.trim().isEmpty()) {
            flight.setStatus(status.trim());
        }
        if (delayReason != null) {
            flight.setDelayReason(delayReason);
        }
        if (revisedDeparture != null) {
            flight.setRevisedDeparture(revisedDeparture);
        }
        if (revisedArrival != null) {
            flight.setRevisedArrival(revisedArrival);
        }
        if (gate != null) {
            flight.setGate(gate);
        }
        if (terminal != null) {
            flight.setTerminal(terminal);
        }
        if (estMins != null) {
            flight.setEstimatedArrivalMinutes(estMins);
        }
        flight.setLastUpdated(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        return flightStatusRepository.save(flight);
    }
}
