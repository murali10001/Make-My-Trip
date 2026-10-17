package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.controllers.FlightStatusController;
import com.makemytrip.makemytrip.models.FlightStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class FlightStatusScheduler {

    @Autowired
    private FlightStatusService flightStatusService;

    @Autowired
    private FlightStatusController flightStatusController;

    @Scheduled(fixedRate = 5000)
    public void monitorFlightTimes() {
        try {
            List<FlightStatus> changedFlights = flightStatusService.validateAndSyncChangedFlights();
            for (FlightStatus flight : changedFlights) {
                System.out.println("[REAL-TIME RADAR] Flight " + flight.getFlightNumber() +
                        " status transitioned to " + flight.getStatus() +
                        " (" + flight.getDelayReason() + ")");
                if (flightStatusController != null) {
                    flightStatusController.broadcastUpdate(flight);
                }
            }
        } catch (Exception e) {
            System.err.println("[REAL-TIME RADAR] Error during flight monitoring cycle: " + e.getMessage());
        }
    }
}


