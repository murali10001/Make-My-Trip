package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Document(collection = "flight_status")
public class FlightStatus {
    @Id
    private String id;
    private String flightNumber;
    private String airline;
    private String origin;
    private String destination;
    private String scheduledDeparture;
    private String scheduledArrival;
    private String revisedDeparture;
    private String revisedArrival;
    private String status; // ON_TIME, DELAYED, BOARDING, IN_FLIGHT, LANDED, CANCELLED
    private String delayReason;
    private String gate;
    private String terminal;
    private int estimatedArrivalMinutes;
    private String lastUpdated;

    public FlightStatus() {
        this.lastUpdated = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }

    public FlightStatus(String id, String flightNumber, String airline, String origin, String destination,
                        String scheduledDeparture, String scheduledArrival, String revisedDeparture,
                        String revisedArrival, String status, String delayReason, String gate,
                        String terminal, int estimatedArrivalMinutes) {
        this.id = id;
        this.flightNumber = flightNumber;
        this.airline = airline;
        this.origin = origin;
        this.destination = destination;
        this.scheduledDeparture = scheduledDeparture;
        this.scheduledArrival = scheduledArrival;
        this.revisedDeparture = revisedDeparture;
        this.revisedArrival = revisedArrival;
        this.status = status;
        this.delayReason = delayReason;
        this.gate = gate;
        this.terminal = terminal;
        this.estimatedArrivalMinutes = estimatedArrivalMinutes;
        this.lastUpdated = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFlightNumber() {
        return flightNumber;
    }

    public void setFlightNumber(String flightNumber) {
        this.flightNumber = flightNumber;
    }

    public String getAirline() {
        return airline;
    }

    public void setAirline(String airline) {
        this.airline = airline;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getScheduledDeparture() {
        return scheduledDeparture;
    }

    public void setScheduledDeparture(String scheduledDeparture) {
        this.scheduledDeparture = scheduledDeparture;
    }

    public String getScheduledArrival() {
        return scheduledArrival;
    }

    public void setScheduledArrival(String scheduledArrival) {
        this.scheduledArrival = scheduledArrival;
    }

    public String getRevisedDeparture() {
        return revisedDeparture;
    }

    public void setRevisedDeparture(String revisedDeparture) {
        this.revisedDeparture = revisedDeparture;
    }

    public String getRevisedArrival() {
        return revisedArrival;
    }

    public void setRevisedArrival(String revisedArrival) {
        this.revisedArrival = revisedArrival;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDelayReason() {
        return delayReason;
    }

    public void setDelayReason(String delayReason) {
        this.delayReason = delayReason;
    }

    public String getGate() {
        return gate;
    }

    public void setGate(String gate) {
        this.gate = gate;
    }

    public String getTerminal() {
        return terminal;
    }

    public void setTerminal(String terminal) {
        this.terminal = terminal;
    }

    public int getEstimatedArrivalMinutes() {
        return estimatedArrivalMinutes;
    }

    public void setEstimatedArrivalMinutes(int estimatedArrivalMinutes) {
        this.estimatedArrivalMinutes = estimatedArrivalMinutes;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
