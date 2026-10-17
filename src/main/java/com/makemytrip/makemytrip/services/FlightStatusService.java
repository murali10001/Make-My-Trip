package com.makemytrip.makemytrip.services;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;

@Service
public class FlightStatusService {

    public static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final Pattern TIME_12_PATTERN = Pattern.compile("^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TIME_24_PATTERN = Pattern.compile("^(\\d{1,2}):(\\d{2})$");

    @Autowired
    private FlightStatusRepository flightStatusRepository;

    private final Random random = new Random();

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            System.out.println("[REAL-TIME RADAR] Application ready. Performing initial flight status database validation & alignment...");
            validateAndSyncAllFlights();
        } catch (Exception e) {
            System.err.println("[REAL-TIME RADAR] Initial flight status validation error: " + e.getMessage());
        }
    }

    public Integer parseTimeToMinutes(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return null;
        }
        String clean = timeStr.trim().toUpperCase();

        if (clean.contains("T")) {
            int tIdx = clean.indexOf('T');
            if (clean.length() >= tIdx + 6) {
                clean = clean.substring(tIdx + 1, tIdx + 6);
            }
        }

        Matcher m12 = TIME_12_PATTERN.matcher(clean);
        if (m12.matches()) {
            try {
                int h = Integer.parseInt(m12.group(1));
                int m = Integer.parseInt(m12.group(2));
                String ampm = m12.group(3).toUpperCase();
                if ("PM".equals(ampm) && h < 12) h += 12;
                if ("AM".equals(ampm) && h == 12) h = 0;
                return h * 60 + m;
            } catch (Exception ignored) {}
        }

        Matcher m24 = TIME_24_PATTERN.matcher(clean);
        if (m24.matches()) {
            try {
                int h = Integer.parseInt(m24.group(1));
                int m = Integer.parseInt(m24.group(2));
                return h * 60 + m;
            } catch (Exception ignored) {}
        }

        return null;
    }

    public boolean alignFlightWithRealTime(FlightStatus f, LocalTime nowTime) {
        if (f == null) return false;

        String depStr = (f.getRevisedDeparture() != null && !f.getRevisedDeparture().trim().isEmpty())
                ? f.getRevisedDeparture()
                : f.getScheduledDeparture();

        String arrStr = (f.getRevisedArrival() != null && !f.getRevisedArrival().trim().isEmpty())
                ? f.getRevisedArrival()
                : f.getScheduledArrival();

        Integer depMins = parseTimeToMinutes(depStr);
        Integer arrMins = parseTimeToMinutes(arrStr);

        if (depMins == null || arrMins == null) {
            return false;
        }

        int currentMinutes = nowTime.getHour() * 60 + nowTime.getMinute();
        String currentStatus = f.getStatus() != null ? f.getStatus().toUpperCase() : "ON_TIME";

        if ("CANCELLED".equals(currentStatus)) {
            return false;
        }

        boolean changed = false;
        String newStatus;
        String newReason;
        int newEstMins;

        if (currentMinutes >= arrMins) {
            newStatus = "LANDED";
            newReason = "Landed safely at " + arrStr + " - Taxiing to gate";
            newEstMins = 0;
        } else if (currentMinutes >= depMins) {
            newStatus = "IN_FLIGHT";
            newReason = "En route at cruising altitude";
            newEstMins = Math.max(1, arrMins - currentMinutes);
        } else if (currentMinutes >= depMins - 45) {
            newStatus = "BOARDING";
            String gate = (f.getGate() != null && !f.getGate().isEmpty()) ? f.getGate() : "Gate";
            newReason = "Boarding underway at " + gate;
            newEstMins = Math.max(1, arrMins - currentMinutes);
        } else {
            if ("DELAYED".equals(currentStatus)) {
                newStatus = "DELAYED";
                newReason = (f.getDelayReason() != null && !f.getDelayReason().isEmpty()) ? f.getDelayReason() : "Delayed departure";
            } else {
                newStatus = "ON_TIME";
                newReason = "Operating on schedule - Check-in open";
            }
            newEstMins = Math.max(1, arrMins - currentMinutes);
        }

        if (!newStatus.equals(f.getStatus())) {
            f.setStatus(newStatus);
            changed = true;
        }
        if (f.getEstimatedArrivalMinutes() != newEstMins) {
            f.setEstimatedArrivalMinutes(newEstMins);
            changed = true;
        }
        if (newReason != null && !newReason.equals(f.getDelayReason())) {
            f.setDelayReason(newReason);
            changed = true;
        }

        return changed;
    }

    public List<FlightStatus> validateAndSyncAllFlights() {
        List<FlightStatus> all = flightStatusRepository.findAll();
        LocalTime now = LocalTime.now(IST_ZONE);
        String updatedTimestamp = now.format(DateTimeFormatter.ofPattern("HH:mm:ss"));

        List<FlightStatus> saved = new ArrayList<>();
        for (FlightStatus f : all) {
            if (f == null) continue;
            boolean modified = alignFlightWithRealTime(f, now);
            if (modified) {
                f.setLastUpdated(updatedTimestamp);
                saved.add(flightStatusRepository.save(f));
            } else {
                saved.add(f);
            }
        }
        return saved;
    }

    public List<FlightStatus> validateAndSyncChangedFlights() {
        List<FlightStatus> all = flightStatusRepository.findAll();
        LocalTime now = LocalTime.now(IST_ZONE);
        String updatedTimestamp = now.format(DateTimeFormatter.ofPattern("HH:mm:ss"));

        List<FlightStatus> changedList = new ArrayList<>();
        for (FlightStatus f : all) {
            if (f == null) continue;
            boolean modified = alignFlightWithRealTime(f, now);
            if (modified) {
                f.setLastUpdated(updatedTimestamp);
                changedList.add(flightStatusRepository.save(f));
            }
        }
        return changedList;
    }

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

        List<FlightStatus> activeFlights = flights.stream()
            .filter(f -> f != null && ("BOARDING".equalsIgnoreCase(f.getStatus()) || "IN_FLIGHT".equalsIgnoreCase(f.getStatus())))
            .collect(Collectors.toList());

        FlightStatus f;
        if (!activeFlights.isEmpty() && random.nextDouble() < 0.75) {
            f = activeFlights.get(random.nextInt(activeFlights.size()));
        } else {
            f = flights.get(random.nextInt(flights.size()));
        }

        f.setLastUpdated(LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        String currentStatus = f.getStatus() != null ? f.getStatus().toUpperCase() : "ON_TIME";
        if ("ON_TIME".equals(currentStatus)) {
            f.setStatus("BOARDING");
            f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate"));
        } else if ("BOARDING".equals(currentStatus)) {
            f.setStatus("IN_FLIGHT");
            f.setDelayReason("En route at cruising altitude");
            f.setEstimatedArrivalMinutes(15);
        } else if ("IN_FLIGHT".equals(currentStatus)) {
            f.setStatus("LANDED");
            String nowTime = LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("hh:mm a"));
            f.setRevisedArrival(nowTime);
            f.setDelayReason("Landed safely at " + nowTime + " - Taxiing to gate");
            f.setEstimatedArrivalMinutes(0);
        } else {
            f.setStatus("ON_TIME");
            f.setDelayReason("Operating on schedule - Check-in open");
            f.setRevisedDeparture(f.getScheduledDeparture());
            f.setRevisedArrival(f.getScheduledArrival());
            f.setEstimatedArrivalMinutes(120);
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

    public List<FlightStatus> triggerAllFlightsSimulation() {
        List<FlightStatus> flights = flightStatusRepository.findAll();
        List<FlightStatus> updatedList = new ArrayList<>();
        LocalTime now = LocalTime.now(IST_ZONE);
        for (FlightStatus f : flights) {
            if (f == null) continue;
            f.setLastUpdated(now.format(DateTimeFormatter.ofPattern("HH:mm:ss")));
            String currentStatus = f.getStatus() != null ? f.getStatus().toUpperCase() : "ON_TIME";
            if ("ON_TIME".equals(currentStatus)) {
                f.setStatus("BOARDING");
                f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate"));
            } else if ("BOARDING".equals(currentStatus)) {
                f.setStatus("IN_FLIGHT");
                f.setDelayReason("En route at cruising altitude");
                f.setEstimatedArrivalMinutes(15);
            } else if ("IN_FLIGHT".equals(currentStatus)) {
                f.setStatus("LANDED");
                String nowTime = now.format(DateTimeFormatter.ofPattern("hh:mm a"));
                f.setRevisedArrival(nowTime);
                f.setDelayReason("Landed safely at " + nowTime + " - Taxiing to gate");
                f.setEstimatedArrivalMinutes(0);
            } else {
                f.setStatus("ON_TIME");
                f.setDelayReason("Operating on schedule - Check-in open");
                f.setRevisedDeparture(f.getScheduledDeparture());
                f.setRevisedArrival(f.getScheduledArrival());
                f.setEstimatedArrivalMinutes(120);
            }
            updatedList.add(flightStatusRepository.save(f));
        }
        return updatedList;
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
            String newStatus = status.trim().toUpperCase();
            flight.setStatus(newStatus);
            if ("LANDED".equals(newStatus)) {
                if (revisedArrival == null) {
                    String nowTime = LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("hh:mm a"));
                    flight.setRevisedArrival(nowTime);
                }
                if (estMins == null) {
                    flight.setEstimatedArrivalMinutes(0);
                }
                if (delayReason == null) {
                    flight.setDelayReason("Landed safely at " + (flight.getRevisedArrival() != null ? flight.getRevisedArrival() : "destination") + " - Taxiing to gate");
                }
            } else if ("IN_FLIGHT".equals(newStatus)) {
                if (delayReason == null) {
                    flight.setDelayReason("En route at cruising altitude");
                }
                if (estMins == null) {
                    flight.setEstimatedArrivalMinutes(15);
                }
            } else if ("BOARDING".equals(newStatus)) {
                if (delayReason == null) {
                    flight.setDelayReason("Boarding underway at " + (flight.getGate() != null ? flight.getGate() : "Gate"));
                }
            } else if ("ON_TIME".equals(newStatus)) {
                if (delayReason == null) {
                    flight.setDelayReason("Operating on schedule - Check-in open");
                }
                if (revisedDeparture == null) {
                    flight.setRevisedDeparture(flight.getScheduledDeparture());
                }
                if (revisedArrival == null) {
                    flight.setRevisedArrival(flight.getScheduledArrival());
                }
                if (estMins == null) {
                    flight.setEstimatedArrivalMinutes(120);
                }
            }
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
        flight.setLastUpdated(LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        return flightStatusRepository.save(flight);
    }
}


