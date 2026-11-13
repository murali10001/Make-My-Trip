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
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;

@Service
public class FlightStatusService {

    public static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final Pattern TIME_12_PATTERN = Pattern.compile("^(\\d{1,2}):(\\d{2})\\s*(AM|PM)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern TIME_24_PATTERN = Pattern.compile("^(\\d{1,2}):(\\d{2})$");

    @Autowired
    private FlightStatusRepository flightStatusRepository;

    @Autowired(required = false)
    private UserRepository userRepository;

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

    public String minutesToTimeString(int totalMinutes) {
        int m = (totalMinutes % 1440 + 1440) % 1440;
        int hours = m / 60;
        int mins = m % 60;
        String ampm = hours >= 12 ? "PM" : "AM";
        int displayHour = hours % 12;
        if (displayHour == 0) displayHour = 12;
        return String.format("%02d:%02d %s", displayHour, mins, ampm);
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

        // Handle overnight (cross-midnight) flight schedules accurately
        int effectiveArr;
        int effectiveCurrent;

        if (arrMins < depMins) {
            // Overnight flight: arrives next calendar day
            effectiveArr = arrMins + 1440;
            if (currentMinutes < arrMins + 120) {
                // Currently in the post-midnight arrival window
                effectiveCurrent = currentMinutes + 1440;
            } else {
                effectiveCurrent = currentMinutes;
            }
        } else {
            // Same-day flight
            effectiveArr = arrMins;
            effectiveCurrent = currentMinutes;
        }

        boolean changed = false;
        String newStatus;
        String newReason;
        int newEstMins;

        if (effectiveCurrent >= effectiveArr) {
            newStatus = "LANDED";
            newReason = "Landed safely at " + arrStr + " - Taxiing to gate";
            newEstMins = 0;
        } else if (effectiveCurrent >= depMins) {
            newStatus = "IN_FLIGHT";
            newReason = (f.getDelayReason() != null && !f.getDelayReason().isEmpty() && !f.getDelayReason().contains("Check-in"))
                    ? f.getDelayReason()
                    : "En route at cruising altitude";
            newEstMins = Math.max(1, effectiveArr - effectiveCurrent);
        } else if (effectiveCurrent >= depMins - 45) {
            newStatus = "BOARDING";
            String gate = (f.getGate() != null && !f.getGate().isEmpty()) ? f.getGate() : "Gate";
            newReason = "Boarding underway at " + gate;
            newEstMins = Math.max(1, effectiveArr - effectiveCurrent);
        } else {
            if ("DELAYED".equals(currentStatus)) {
                newStatus = "DELAYED";
                newReason = (f.getDelayReason() != null && !f.getDelayReason().isEmpty()) ? f.getDelayReason() : "Delayed departure";
            } else {
                newStatus = "ON_TIME";
                newReason = "Operating on schedule - Check-in open";
            }
            int diff = effectiveArr - effectiveCurrent;
            if (diff < 0) diff += 1440;
            newEstMins = Math.max(1, diff);
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
            .filter(f -> f != null && ("BOARDING".equalsIgnoreCase(f.getStatus()) || "IN_FLIGHT".equalsIgnoreCase(f.getStatus()) || "DELAYED".equalsIgnoreCase(f.getStatus())))
            .collect(Collectors.toList());

        FlightStatus f;
        if (!activeFlights.isEmpty() && random.nextDouble() < 0.70) {
            f = activeFlights.get(random.nextInt(activeFlights.size()));
        } else {
            f = flights.get(random.nextInt(flights.size()));
        }

        f.setLastUpdated(LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        String currentStatus = f.getStatus() != null ? f.getStatus().toUpperCase() : "ON_TIME";
        double roll = random.nextDouble();

        if ("ON_TIME".equals(currentStatus)) {
            if (roll < 0.40) {
                // Realistic transition to DELAYED ("Delayed by 1h", "Delayed by 45m", etc.)
                int delayMinutes = random.nextBoolean() ? 60 : (random.nextBoolean() ? 45 : 30);
                String delayLabel = delayMinutes >= 60 ? "Delayed by " + (delayMinutes / 60) + "h" : "Delayed by " + delayMinutes + "m";
                f.setStatus("DELAYED");

                Integer dep = parseTimeToMinutes(f.getScheduledDeparture());
                Integer arr = parseTimeToMinutes(f.getScheduledArrival());
                if (dep != null) f.setRevisedDeparture(minutesToTimeString(dep + delayMinutes));
                if (arr != null) f.setRevisedArrival(minutesToTimeString(arr + delayMinutes));

                String[] reasons = new String[] {
                    delayLabel + " - Adverse weather & thunderstorm warning",
                    delayLabel + " - Air traffic congestion at departure runway",
                    delayLabel + " - Late inbound aircraft turnaround",
                    delayLabel + " - Aircraft technical inspection & clearance hold"
                };
                f.setDelayReason(reasons[random.nextInt(reasons.length)]);
                int flightDuration = (arr != null && dep != null) ? (arr >= dep ? arr - dep : arr + 1440 - dep) : 120;
                f.setEstimatedArrivalMinutes(Math.max(20, flightDuration + delayMinutes));
            } else {
                f.setStatus("BOARDING");
                f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate"));
            }
        } else if ("DELAYED".equals(currentStatus)) {
            // Delayed flight advances to BOARDING
            f.setStatus("BOARDING");
            f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate") + " (Revised departure)");
        } else if ("BOARDING".equals(currentStatus)) {
            f.setStatus("IN_FLIGHT");
            f.setDelayReason("En route at cruising altitude");
            f.setEstimatedArrivalMinutes(45);
        } else if ("IN_FLIGHT".equals(currentStatus)) {
            f.setStatus("LANDED");
            String nowTime = LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("hh:mm a"));
            f.setRevisedArrival(nowTime);
            f.setDelayReason("Landed safely at " + nowTime + " - Taxiing to gate");
            f.setEstimatedArrivalMinutes(0);
        } else {
            // Reset LANDED/CANCELLED back to ON_TIME
            f.setStatus("ON_TIME");
            f.setDelayReason("Operating on schedule - Check-in open");
            f.setRevisedDeparture(f.getScheduledDeparture());
            f.setRevisedArrival(f.getScheduledArrival());
            Integer dep = parseTimeToMinutes(f.getScheduledDeparture());
            Integer arr = parseTimeToMinutes(f.getScheduledArrival());
            int flightDuration = (arr != null && dep != null) ? (arr >= dep ? arr - dep : arr + 1440 - dep) : 120;
            f.setEstimatedArrivalMinutes(flightDuration);
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

    public List<String> getUserTrackedFlightNumbers(String userId) {
        if (userId == null || userId.trim().isEmpty() || userRepository == null) {
            return Collections.emptyList();
        }
        try {
            Optional<Users> userOpt = userRepository.findById(userId.trim());
            if (userOpt.isPresent()) {
                return userOpt.get().getTrackedFlights();
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch user tracked flights: " + e.getMessage());
        }
        return Collections.emptyList();
    }

    public List<String> toggleUserTrackFlight(String userId, String flightNumber) {
        if (userId == null || userId.trim().isEmpty() || flightNumber == null || flightNumber.trim().isEmpty() || userRepository == null) {
            return Collections.emptyList();
        }
        try {
            Optional<Users> userOpt = userRepository.findById(userId.trim());
            if (!userOpt.isPresent()) {
                return Collections.emptyList();
            }
            Users user = userOpt.get();
            List<String> tracked = user.getTrackedFlights();
            String clean = flightNumber.trim().toUpperCase();
            if (tracked.contains(clean)) {
                tracked.remove(clean);
            } else {
                tracked.add(clean);
            }
            user.setTrackedFlights(tracked);
            userRepository.save(user);
            return tracked;
        } catch (Exception e) {
            System.err.println("Failed to toggle tracked flight in database: " + e.getMessage());
            return Collections.emptyList();
        }
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
                if (random.nextDouble() < 0.35) {
                    int delayMinutes = 60;
                    f.setStatus("DELAYED");
                    Integer dep = parseTimeToMinutes(f.getScheduledDeparture());
                    Integer arr = parseTimeToMinutes(f.getScheduledArrival());
                    if (dep != null) f.setRevisedDeparture(minutesToTimeString(dep + delayMinutes));
                    if (arr != null) f.setRevisedArrival(minutesToTimeString(arr + delayMinutes));
                    f.setDelayReason("Delayed by 1h - Adverse weather & runway flow control");
                    f.setEstimatedArrivalMinutes(110);
                } else {
                    f.setStatus("BOARDING");
                    f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate"));
                }
            } else if ("DELAYED".equals(currentStatus)) {
                f.setStatus("BOARDING");
                f.setDelayReason("Boarding underway at " + (f.getGate() != null ? f.getGate() : "Gate") + " (Revised departure)");
            } else if ("BOARDING".equals(currentStatus)) {
                f.setStatus("IN_FLIGHT");
                f.setDelayReason("En route at cruising altitude");
                f.setEstimatedArrivalMinutes(45);
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
                    flight.setEstimatedArrivalMinutes(45);
                }
            } else if ("BOARDING".equals(newStatus)) {
                if (delayReason == null) {
                    flight.setDelayReason("Boarding underway at " + (flight.getGate() != null ? flight.getGate() : "Gate"));
                }
            } else if ("DELAYED".equals(newStatus)) {
                if (revisedDeparture == null && flight.getScheduledDeparture() != null) {
                    Integer dep = parseTimeToMinutes(flight.getScheduledDeparture());
                    if (dep != null) flight.setRevisedDeparture(minutesToTimeString(dep + 60));
                }
                if (revisedArrival == null && flight.getScheduledArrival() != null) {
                    Integer arr = parseTimeToMinutes(flight.getScheduledArrival());
                    if (arr != null) flight.setRevisedArrival(minutesToTimeString(arr + 60));
                }
                if (delayReason == null) {
                    flight.setDelayReason("Delayed by 1h - Adverse weather & runway flow control");
                }
                if (estMins == null) {
                    flight.setEstimatedArrivalMinutes(110);
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
            flight.setEstimatedArrivalMinutes(Math.max(0, estMins));
        }
        flight.setLastUpdated(LocalTime.now(IST_ZONE).format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        return flightStatusRepository.save(flight);
    }
}
