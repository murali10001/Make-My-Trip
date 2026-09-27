package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.controllers.FlightStatusController;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.List;
import java.util.Locale;

@Component
public class FlightStatusScheduler {

    @Autowired
    private FlightStatusRepository flightStatusRepository;

    @Autowired
    private FlightStatusController flightStatusController;

    private static final DateTimeFormatter TIME_FORMATTER_12 = new DateTimeFormatterBuilder()
            .parseCaseInsensitive()
            .appendPattern("h:mm a")
            .toFormatter(Locale.ENGLISH);

    private static final DateTimeFormatter TIME_FORMATTER_24 = DateTimeFormatter.ofPattern("HH:mm");

    @Scheduled(fixedRate = 5000)
    public void monitorFlightTimes() {
        LocalTime now = LocalTime.now();
        int currentMinutes = now.getHour() * 60 + now.getMinute();
        String formattedNow12 = now.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH));

        List<FlightStatus> flights = flightStatusRepository.findAll();
        for (FlightStatus flight : flights) {
            if (flight == null || flight.getStatus() == null) continue;

            String status = flight.getStatus().toUpperCase();

            if ("IN_FLIGHT".equals(status)) {
                String arrivalTimeStr = flight.getRevisedArrival() != null && !flight.getRevisedArrival().trim().isEmpty()
                        ? flight.getRevisedArrival().trim()
                        : flight.getScheduledArrival();

                if (arrivalTimeStr == null || arrivalTimeStr.trim().isEmpty()) continue;

                Integer arrivalMinutes = parseTimeToMinutes(arrivalTimeStr);
                if (arrivalMinutes == null) continue;

                boolean timeHasArrived = currentMinutes >= arrivalMinutes;

                if (timeHasArrived) {
                    flight.setStatus("LANDED");
                    flight.setRevisedArrival(formattedNow12);
                    flight.setEstimatedArrivalMinutes(0);
                    flight.setDelayReason("Landed safely at " + formattedNow12 + " - Taxiing to gate");
                    flight.setLastUpdated(now.format(DateTimeFormatter.ofPattern("HH:mm:ss")));
                    FlightStatus saved = flightStatusRepository.save(flight);
                    System.out.println("[SCHEDULER] Flight " + saved.getFlightNumber() + " reached arrival time (" + arrivalTimeStr + "). Status updated to LANDED!");
                    if (flightStatusController != null) {
                        flightStatusController.broadcastUpdate(saved);
                    }
                }
            } else if ("BOARDING".equals(status)) {
                String departureTimeStr = flight.getRevisedDeparture() != null && !flight.getRevisedDeparture().trim().isEmpty()
                        ? flight.getRevisedDeparture().trim()
                        : flight.getScheduledDeparture();

                if (departureTimeStr == null || departureTimeStr.trim().isEmpty()) continue;

                Integer departureMinutes = parseTimeToMinutes(departureTimeStr);
                if (departureMinutes == null) continue;

                boolean timeHasDeparted = currentMinutes >= departureMinutes;

                if (timeHasDeparted) {
                    flight.setStatus("IN_FLIGHT");
                    flight.setEstimatedArrivalMinutes(15);
                    flight.setDelayReason("En route at cruising altitude");
                    flight.setLastUpdated(now.format(DateTimeFormatter.ofPattern("HH:mm:ss")));
                    FlightStatus saved = flightStatusRepository.save(flight);
                    System.out.println("[SCHEDULER] Flight " + saved.getFlightNumber() + " reached departure time (" + departureTimeStr + "). Status updated to IN_FLIGHT!");
                    if (flightStatusController != null) {
                        flightStatusController.broadcastUpdate(saved);
                    }
                }
            }
        }
    }

    private Integer parseTimeToMinutes(String timeStr) {
        if (timeStr == null) return null;
        String clean = timeStr.trim();
        try {
            if (clean.toUpperCase().contains("AM") || clean.toUpperCase().contains("PM")) {
                LocalTime time = LocalTime.parse(clean, TIME_FORMATTER_12);
                return time.getHour() * 60 + time.getMinute();
            } else if (clean.contains(":")) {
                LocalTime time = LocalTime.parse(clean, TIME_FORMATTER_24);
                return time.getHour() * 60 + time.getMinute();
            }
        } catch (Exception ignored) {}
        return null;
    }
}

