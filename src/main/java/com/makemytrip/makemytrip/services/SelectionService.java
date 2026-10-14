package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.SeatUnavailableException;

import com.makemytrip.makemytrip.models.RoomTypeOption;
import com.makemytrip.makemytrip.models.SeatMap;
import com.makemytrip.makemytrip.models.SeatMap.SeatItem;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RoomTypeOptionRepository;
import com.makemytrip.makemytrip.repositories.SeatMapRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class SelectionService {

    @Autowired
    private SeatMapRepository seatMapRepository;

    @Autowired
    private RoomTypeOptionRepository roomTypeOptionRepository;

    @Autowired
    private UserPreferencesRepository userPreferencesRepository;

    @Autowired(required = false)
    private HotelRepository hotelRepository;

    @Autowired(required = false)
    private FlightRepository flightRepository;

    /**
     * Get or dynamically generate standard flight seat map with premium options.
     */
    public SeatMap getSeatMapForFlight(String flightId) {
        return seatMapRepository.findByFlightId(flightId).orElseGet(() -> {
            SeatMap map = new SeatMap();
            map.setFlightId(flightId);
            String aircraft = "Airbus A320-200";
            if (flightRepository != null) {
                Optional<Flight> f = flightRepository.findById(flightId);
                if (f.isPresent() && f.get().getAircraft() != null && !f.get().getAircraft().trim().isEmpty()) {
                    aircraft = f.get().getAircraft();
                }
            }
            map.setAircraftType(aircraft);
            map.setTotalRows(12);

            List<SeatItem> seats = new ArrayList<>();
            String[] cols = {"A", "B", "C", "D", "E", "F"};

            for (int r = 1; r <= 12; r++) {
                for (String c : cols) {
                    String seatNo = r + c;
                    boolean isWindow = "A".equals(c) || "F".equals(c);
                    boolean isAisle = "C".equals(c) || "D".equals(c);
                    boolean isMiddle = "B".equals(c) || "E".equals(c);

                    String tier = "STANDARD";
                    double addon = 0.0;
                    String desc = "Standard Seat";
                    String status = "AVAILABLE";

                    // Pre-occupy a few seats for realism
                    if (seatNo.equals("1B") || seatNo.equals("2D") || seatNo.equals("5A") || seatNo.equals("8F") || seatNo.equals("10C")) {
                        status = "OCCUPIED";
                    }

                    if (r == 1) {
                        if (isWindow) {
                            tier = "WINDOW_EXTRA_LEGROOM";
                            addon = 850.0;
                            desc = "Front Row Window Seat (Extra Legroom + View)";
                        } else if (isAisle) {
                            tier = "AISLE_EXTRA_LEGROOM";
                            addon = 750.0;
                            desc = "Front Row Aisle Seat (Extra Legroom)";
                        } else {
                            tier = "MIDDLE_EXTRA_LEGROOM";
                            addon = 500.0;
                            desc = "Front Row Middle Seat (Extra Legroom)";
                        }
                    } else if (r <= 3) {
                        if (isWindow) {
                            tier = "WINDOW_PREMIUM_FRONT";
                            addon = 550.0;
                            desc = "Front Zone Premium Window Seat (Fast Deplane + View)";
                        } else if (isAisle) {
                            tier = "AISLE_PREMIUM_FRONT";
                            addon = 450.0;
                            desc = "Front Zone Premium Aisle Seat (Fast Deplane)";
                        } else {
                            tier = "MIDDLE_PREMIUM_FRONT";
                            addon = 250.0;
                            desc = "Front Zone Premium Middle Seat";
                        }
                    } else if (r == 6) { // Emergency Exit Row
                        if (isWindow) {
                            tier = "WINDOW_EXIT_ROW";
                            addon = 650.0;
                            desc = "Emergency Exit Row Window Seat (Extra Legroom + View)";
                        } else if (isAisle) {
                            tier = "AISLE_EXIT_ROW";
                            addon = 550.0;
                            desc = "Emergency Exit Row Aisle Seat (Extra Legroom)";
                        } else {
                            tier = "MIDDLE_EXIT_ROW";
                            addon = 400.0;
                            desc = "Emergency Exit Row Middle Seat (Extra Legroom)";
                        }
                    } else { // Standard Rows 4-5 & 7-12
                        if (isWindow) {
                            tier = "WINDOW_STANDARD";
                            addon = 350.0; // Window Seat Extra Charge
                            desc = "Standard Window Seat (+₹350 Window Charge)";
                        } else if (isAisle) {
                            tier = "AISLE_STANDARD";
                            addon = 200.0; // Aisle Access Charge
                            desc = "Standard Aisle Seat (+₹200 Aisle Charge)";
                        } else {
                            tier = "MIDDLE_STANDARD";
                            addon = 0.0;
                            desc = "Standard Middle Seat (No Extra Charge)";
                        }
                    }

                    seats.add(new SeatItem(seatNo, r, c, tier, addon, status, desc));
                }
            }

            map.setSeats(seats);
            return seatMapRepository.save(map);
        });
    }

    /**
     * Dynamically reserve a seat in real time.
     */
    public SeatMap reserveSeat(String flightId, String seatNo, String userId) {
        SeatMap map = getSeatMapForFlight(flightId);

        boolean updated = false;
        for (SeatItem item : map.getSeats()) {
            if (item.getSeatNo().equalsIgnoreCase(seatNo)) {
                if ("OCCUPIED".equalsIgnoreCase(item.getStatus())) {
                    throw new SeatUnavailableException("Seat '" + seatNo + "' is already occupied. Please select an available seat.");
                }
                item.setStatus("OCCUPIED");
                updated = true;
                break;
            }
        }

        if (updated) {
            return seatMapRepository.save(map);
        }
        return map;
    }

    /**
     * Get hotel room-type grid options dynamically from database or hotel entity.
     */
    public List<RoomTypeOption> getRoomOptionsForHotel(String hotelId) {
        if (hotelId == null || hotelId.trim().isEmpty()) {
            return Collections.emptyList();
        }

        List<RoomTypeOption> options = roomTypeOptionRepository.findByHotelId(hotelId);
        if (options != null && !options.isEmpty()) {
            return options;
        }

        if (hotelRepository != null) {
            Optional<Hotel> hotelOpt = hotelRepository.findById(hotelId);
            if (hotelOpt.isPresent()) {
                Hotel hotel = hotelOpt.get();
                RoomTypeOption standard = new RoomTypeOption();
                standard.setHotelId(hotelId);
                standard.setRoomTypeName(hotel.getRoomType() != null && !hotel.getRoomType().trim().isEmpty() ? hotel.getRoomType() : "Standard Room");
                standard.setPriceUpgradeAddon(0.0);
                standard.setAvailableRooms(hotel.getAvailableRooms() > 0 ? hotel.getAvailableRooms() : 1);
                standard.setBedType("Comfort Bed");
                standard.setRoomSize(hotel.getRoomFeatures() != null && !hotel.getRoomFeatures().trim().isEmpty() ? hotel.getRoomFeatures() : "Spacious Room");
                standard.setViewType("City / Garden View");
                List<String> amenityList = new ArrayList<>();
                if (hotel.getAmenities() != null && !hotel.getAmenities().trim().isEmpty()) {
                    for (String part : hotel.getAmenities().split("[,;|]")) {
                        String trimmed = part.trim();
                        if (!trimmed.isEmpty()) {
                            amenityList.add(trimmed);
                        }
                    }
                }
                standard.setAmenities(amenityList);

                List<String> images = new ArrayList<>();
                if (hotel.getImageUrls() != null && !hotel.getImageUrls().isEmpty()) {
                    images.addAll(hotel.getImageUrls());
                } else if (hotel.getImageUrl() != null && !hotel.getImageUrl().trim().isEmpty()) {
                    images.add(hotel.getImageUrl());
                }
                standard.setImageUrls(images);
                standard.setPreview3dModelUrl("");
                standard.setDescription(hotel.getDescription() != null && !hotel.getDescription().trim().isEmpty() ? hotel.getDescription() : (hotel.getHotelName() + " comfortable room accommodation."));
                standard.setPopularUpsell(false);

                List<RoomTypeOption> generated = Collections.singletonList(standard);
                return roomTypeOptionRepository.saveAll(generated);
            }
        }

        return Collections.emptyList();
    }

    /**
     * Save or update user seat/room preferences for future bookings.
     */
    public UserPreferences saveUserPreferences(UserPreferences prefs) {
        if (prefs.getUserId() == null || prefs.getUserId().trim().isEmpty()) {
            throw new IllegalArgumentException("User ID is required to save preferences.");
        }

        UserPreferences existing = userPreferencesRepository.findByUserId(prefs.getUserId()).orElse(new UserPreferences());
        existing.setUserId(prefs.getUserId());
        if (prefs.getUserEmail() != null) existing.setUserEmail(prefs.getUserEmail());
        if (prefs.getPreferredSeatType() != null) existing.setPreferredSeatType(prefs.getPreferredSeatType());
        if (prefs.getPreferredSeatNo() != null) existing.setPreferredSeatNo(prefs.getPreferredSeatNo());
        if (prefs.getPreferredRoomType() != null) existing.setPreferredRoomType(prefs.getPreferredRoomType());
        if (prefs.getPreferredBedType() != null) existing.setPreferredBedType(prefs.getPreferredBedType());
        if (prefs.getPreferredFloorView() != null) existing.setPreferredFloorView(prefs.getPreferredFloorView());

        existing.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return userPreferencesRepository.save(existing);
    }

    /**
     * Retrieve user seat/room preferences.
     */
    public UserPreferences getUserPreferences(String userId) {
        return userPreferencesRepository.findByUserId(userId).orElseGet(() -> {
            UserPreferences defaultPrefs = new UserPreferences();
            defaultPrefs.setUserId(userId);
            defaultPrefs.setPreferredSeatType("Extra Legroom");
            defaultPrefs.setPreferredSeatNo("1A");
            defaultPrefs.setPreferredRoomType("Executive Deluxe Room");
            return defaultPrefs;
        });
    }
}
