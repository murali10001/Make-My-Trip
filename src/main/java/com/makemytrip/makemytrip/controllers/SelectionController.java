package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.RoomTypeOption;
import com.makemytrip.makemytrip.models.SeatMap;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.services.SelectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/selection")
public class SelectionController {

    @Autowired
    private SelectionService selectionService;

    @GetMapping("/seatmap/{flightId}")
    public ResponseEntity<SeatMap> getSeatMap(@PathVariable String flightId) {
        SeatMap map = selectionService.getSeatMapForFlight(flightId);
        return ResponseEntity.ok(map);
    }

    @PostMapping("/reserve-seat")
    public ResponseEntity<SeatMap> reserveSeat(
            @RequestParam String flightId,
            @RequestParam String seatNo,
            @RequestParam(required = false, defaultValue = "") String userId) {
        SeatMap updatedMap = selectionService.reserveSeat(flightId, seatNo, userId);
        return ResponseEntity.ok(updatedMap);
    }

    @GetMapping("/hotel-rooms/{hotelId}")
    public ResponseEntity<List<RoomTypeOption>> getHotelRoomOptions(@PathVariable String hotelId) {
        List<RoomTypeOption> options = selectionService.getRoomOptionsForHotel(hotelId);
        return ResponseEntity.ok(options);
    }

    @PostMapping("/preferences")
    public ResponseEntity<UserPreferences> saveUserPreferences(@RequestBody UserPreferences preferences) {
        UserPreferences saved = selectionService.saveUserPreferences(preferences);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/preferences/{userId}")
    public ResponseEntity<UserPreferences> getUserPreferences(@PathVariable String userId) {
        UserPreferences prefs = selectionService.getUserPreferences(userId);
        return ResponseEntity.ok(prefs);
    }
}
