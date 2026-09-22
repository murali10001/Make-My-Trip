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
        if (allFlights.isEmpty()) {
            allFlights = seedInitialData();
        }
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

    private List<FlightStatus> seedInitialData() {
        List<FlightStatus> seeds = new ArrayList<>();
        seeds.add(new FlightStatus(null, "AI-101", "Air India", "New Delhi (DEL)", "Mumbai (BOM)", "10:30 AM", "12:45 PM", "10:30 AM", "12:45 PM", "ON_TIME", "Operating on schedule", "Gate 04", "Terminal 3", 45));
        seeds.add(new FlightStatus(null, "6E-204", "IndiGo", "Bengaluru (BLR)", "New Delhi (DEL)", "02:15 PM", "05:00 PM", "Delayed by 45m", "Estimated + 45m shift", "DELAYED", "Delayed by 45m - Air traffic congestion & runway queue", "Gate 18", "Terminal 1", 120));
        seeds.add(new FlightStatus(null, "UK-812", "Vistara", "Mumbai (BOM)", "Goa (GOI)", "04:00 PM", "05:15 PM", "04:00 PM", "05:15 PM", "BOARDING", "Boarding underway at Gate 14", "Gate 14", "Terminal 2", 30));
        seeds.add(new FlightStatus(null, "SG-405", "SpiceJet", "Kolkata (CCU)", "Hyderabad (HYD)", "06:30 PM", "08:45 PM", "06:30 PM", "08:45 PM", "IN_FLIGHT", "En route at cruising altitude", "Gate 09", "Terminal 1", 75));
        seeds.add(new FlightStatus(null, "QP-1102", "Akasa Air", "Ahmedabad (AMD)", "Bengaluru (BLR)", "08:00 PM", "10:15 PM", "08:00 PM", "10:15 PM", "ON_TIME", "Operating on schedule", "Gate 22", "Terminal 1", 135));
        return flightStatusRepository.saveAll(seeds);
    }

    public Optional<FlightStatus> getFlightByNumber(String flightNumber) {
        if (flightNumber == null) return Optional.empty();
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
                                            String gate, String terminal, Integer estArrivalMins) {
        Optional<FlightStatus> optional = flightStatusRepository.findByFlightNumberIgnoreCase(flightNumber.trim());
        if (!optional.isPresent()) {
            throw new RuntimeException("Flight " + flightNumber + " not found");
        }

        FlightStatus f = optional.get();
        if (status != null && !status.isEmpty()) f.setStatus(status.toUpperCase());
        if (delayReason != null) f.setDelayReason(delayReason);
        if (revisedDeparture != null && !revisedDeparture.isEmpty()) f.setRevisedDeparture(revisedDeparture);
        if (revisedArrival != null && !revisedArrival.isEmpty()) f.setRevisedArrival(revisedArrival);
        if (gate != null && !gate.isEmpty()) f.setGate(gate);
        if (terminal != null && !terminal.isEmpty()) f.setTerminal(terminal);
        if (estArrivalMins != null) f.setEstimatedArrivalMinutes(estArrivalMins);

        f.setLastUpdated(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        return flightStatusRepository.save(f);
    }

    public FlightStatus triggerRandomSimulation() {
        List<FlightStatus> flights = flightStatusRepository.findAll();
        if (flights.isEmpty()) {
            flights = seedInitialData();
        }
        if (flights.isEmpty()) return null;

        FlightStatus f = flights.get(random.nextInt(flights.size()));

        String[] possibleStatuses = {"ON_TIME", "DELAYED", "BOARDING", "IN_FLIGHT", "LANDED"};
        String nextStatus = possibleStatuses[random.nextInt(possibleStatuses.length)];

        String[] delayReasons = {
            "Air traffic congestion & runway queue",
            "Late inbound aircraft arrival from previous sector",
            "Adverse weather & poor visibility at hub",
            "Routine pre-flight technical inspection",
            "Minor baggage loading delay"
        };

        String[] gates = {"Gate 04", "Gate 09", "Gate 14", "Gate 18", "Gate 22", "Gate 31"};

        f.setStatus(nextStatus);
        f.setLastUpdated(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        if ("DELAYED".equalsIgnoreCase(nextStatus)) {
            int delayMins = 30 + random.nextInt(90);
            f.setDelayReason("Delayed by " + delayMins + "m - " + delayReasons[random.nextInt(delayReasons.length)]);
            f.setRevisedDeparture("Delayed by " + (delayMins / 60 > 0 ? (delayMins / 60) + "h " : "") + (delayMins % 60) + "m");
            f.setRevisedArrival("Estimated + " + delayMins + "m shift");
            f.setEstimatedArrivalMinutes(f.getEstimatedArrivalMinutes() + delayMins);
        } else if ("BOARDING".equalsIgnoreCase(nextStatus)) {
            f.setDelayReason("Boarding underway at " + f.getGate());
            f.setGate(gates[random.nextInt(gates.length)]);
        } else if ("IN_FLIGHT".equalsIgnoreCase(nextStatus)) {
            f.setDelayReason("En route at cruising altitude");
            f.setEstimatedArrivalMinutes(Math.max(15, f.getEstimatedArrivalMinutes() - 20));
        } else if ("LANDED".equalsIgnoreCase(nextStatus)) {
            f.setDelayReason("Landed safely - Taxiing to gate");
            f.setEstimatedArrivalMinutes(0);
        } else {
            f.setDelayReason("Operating on schedule");
            f.setRevisedDeparture(f.getScheduledDeparture());
            f.setRevisedArrival(f.getScheduledArrival());
        }

        return flightStatusRepository.save(f);
    }
}
