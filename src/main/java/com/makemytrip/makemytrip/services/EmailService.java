package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class EmailService {

    private static final Logger logger = Logger.getLogger(EmailService.class.getName());

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public Map<String, Object> sendFlightStatusEmailDetails(String recipientEmail, FlightStatus flightStatus) {
        Map<String, Object> result = new HashMap<>();

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            recipientEmail = "passenger-test@makemytour.com";
        }

        String subject = "✈️ Live Flight Notification: " + flightStatus.getFlightNumber() + " [" + flightStatus.getStatus() + "]";
        String body = String.format(
            "Hello Traveler,\n\n" +
            "Here is the latest live update for your tracked flight %s (%s):\n\n" +
            "• Airline: %s\n" +
            "• Route: %s ➔ %s\n" +
            "• Status: %s\n" +
            "• Context / Delay Reason: %s\n" +
            "• Scheduled Departure: %s (Revised: %s)\n" +
            "• Scheduled Arrival: %s (Revised: %s)\n" +
            "• Terminal & Gate: %s / %s\n" +
            "• Dynamic ETA: %d minutes remaining\n\n" +
            "Thank you for using MakeMyTour Flight Status Radar!",
            flightStatus.getFlightNumber(),
            flightStatus.getAirline(),
            flightStatus.getAirline(),
            flightStatus.getOrigin(),
            flightStatus.getDestination(),
            flightStatus.getStatus(),
            flightStatus.getDelayReason(),
            flightStatus.getScheduledDeparture(),
            flightStatus.getRevisedDeparture(),
            flightStatus.getScheduledArrival(),
            flightStatus.getRevisedArrival(),
            flightStatus.getTerminal(),
            flightStatus.getGate(),
            flightStatus.getEstimatedArrivalMinutes()
        );

        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                logger.info("Real SMTP Email successfully sent to: " + recipientEmail);

                result.put("success", true);
                result.put("available", true);
                result.put("mode", "SMTP_LIVE");
                result.put("message", "Flight alert email successfully sent to " + recipientEmail);
                return result;
            } catch (Exception e) {
                logger.warning("SMTP Mail sending failed: " + e.getMessage());

                result.put("success", false);
                result.put("available", false);
                result.put("mode", "SMTP_FAILED");
                result.put("message", "Email notifications are currently unavailable. Please try again later.");
                result.put("errorDetails", e.getMessage());
                return result;
            }
        }

        // MailSender bean is null
        logger.info("Email service unconfigured (JavaMailSender bean not available).");
        result.put("success", false);
        result.put("available", false);
        result.put("mode", "SMTP_UNCONFIGURED");
        result.put("message", "Email notifications are currently unavailable. Please try again later.");
        return result;
    }

    public boolean sendFlightStatusEmail(String recipientEmail, FlightStatus flightStatus) {
        Map<String, Object> res = sendFlightStatusEmailDetails(recipientEmail, flightStatus);
        return (boolean) res.getOrDefault("success", false);
    }
}
