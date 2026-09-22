package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.FlightNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class FlightService {

    private static final Logger logger = Logger.getLogger(FlightService.class.getName());

    @Autowired
    private FlightRepository flightRepository;

    public List<Flight> getAllFlights() {
        return flightRepository.findAll();
    }

    public Flight getFlightById(String id) {
        return flightRepository.findById(id)
            .orElseThrow(() -> new FlightNotFoundException("Flight with ID " + id + " not found"));
    }

    public Flight addFlight(Flight flight) {
        return flightRepository.save(flight);
    }

    public Flight updateFlight(String id, Flight updatedFlight) {
        Optional<Flight> optionalFlight = flightRepository.findById(id);
        if (optionalFlight.isPresent()) {
            Flight flight = optionalFlight.get();
            flight.setFlightName(updatedFlight.getFlightName());
            flight.setFrom(updatedFlight.getFrom());
            flight.setTo(updatedFlight.getTo());
            flight.setDepartureTime(updatedFlight.getDepartureTime());
            flight.setArrivalTime(updatedFlight.getArrivalTime());
            flight.setPrice(updatedFlight.getPrice());
            flight.setAvailableSeats(updatedFlight.getAvailableSeats());
            if (updatedFlight.getFlightNo() != null) flight.setFlightNo(updatedFlight.getFlightNo());
            if (updatedFlight.getAircraft() != null) flight.setAircraft(updatedFlight.getAircraft());
            if (updatedFlight.getAirline() != null) flight.setAirline(updatedFlight.getAirline());
            if (updatedFlight.getDuration() != null) flight.setDuration(updatedFlight.getDuration());
            if (updatedFlight.getDepartureTerminal() != null) flight.setDepartureTerminal(updatedFlight.getDepartureTerminal());
            if (updatedFlight.getArrivalTerminal() != null) flight.setArrivalTerminal(updatedFlight.getArrivalTerminal());
            if (updatedFlight.getCabinBaggage() != null) flight.setCabinBaggage(updatedFlight.getCabinBaggage());
            if (updatedFlight.getCheckInBaggage() != null) flight.setCheckInBaggage(updatedFlight.getCheckInBaggage());
            if (updatedFlight.getTaxes() >= 0) flight.setTaxes(updatedFlight.getTaxes());
            if (updatedFlight.getOtherServices() >= 0) flight.setOtherServices(updatedFlight.getOtherServices());
            if (updatedFlight.getDiscounts() >= 0) flight.setDiscounts(updatedFlight.getDiscounts());
            return flightRepository.save(flight);
        }
        throw new FlightNotFoundException("Cannot update: Flight with ID " + id + " not found");
    }
}
