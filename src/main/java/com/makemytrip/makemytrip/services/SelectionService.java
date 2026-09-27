package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.SeatUnavailableException;

import com.makemytrip.makemytrip.models.RoomTypeOption;
import com.makemytrip.makemytrip.models.SeatMap;
import com.makemytrip.makemytrip.models.SeatMap.SeatItem;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.repositories.RoomTypeOptionRepository;
import com.makemytrip.makemytrip.repositories.SeatMapRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class SelectionService {

    @Autowired
    private SeatMapRepository seatMapRepository;

    @Autowired
    private RoomTypeOptionRepository roomTypeOptionRepository;

    @Autowired
    private UserPreferencesRepository userPreferencesRepository;

    /**
     * Get or dynamically generate standard flight seat map with premium options.
     */
    public SeatMap getSeatMapForFlight(String flightId) {
        return seatMapRepository.findByFlightId(flightId).orElseGet(() -> {
            SeatMap map = new SeatMap();
            map.setFlightId(flightId);
            map.setAircraftType("Airbus A320-200");
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
     * Get or dynamically generate hotel room-type grid options with 3D previews & upselling tiers.
     */
    public List<RoomTypeOption> getRoomOptionsForHotel(String hotelId) {
        List<RoomTypeOption> options = roomTypeOptionRepository.findByHotelId(hotelId);
        if (options != null && !options.isEmpty()) {
            return options;
        }

        List<RoomTypeOption> generated = new ArrayList<>();

        // Option 1: Standard Comfort
        RoomTypeOption opt1 = new RoomTypeOption();
        opt1.setHotelId(hotelId);
        opt1.setRoomTypeName("Standard Comfort Room");
        opt1.setPriceUpgradeAddon(0.0);
        opt1.setAvailableRooms(8);
        opt1.setBedType("Queen Size Bed");
        opt1.setRoomSize("320 sq.ft");
        opt1.setViewType("Garden View");
        opt1.setAmenities(Arrays.asList("High Speed Wi-Fi", "HD Smart TV", "Air Conditioning", "Ensuite Bathroom", "Coffee Maker"));
        opt1.setImageUrls(Arrays.asList(
                "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
        ));
        opt1.setPreview3dModelUrl("https://my.matterport.com/show/?m=sample3dstandard");
        opt1.setDescription("Cozy and comfortable standard room equipped with modern amenities for a relaxing stay.");
        opt1.setPopularUpsell(false);
        generated.add(opt1);

        // Option 2: Executive Deluxe Room
        RoomTypeOption opt2 = new RoomTypeOption();
        opt2.setHotelId(hotelId);
        opt2.setRoomTypeName("Executive Deluxe Room");
        opt2.setPriceUpgradeAddon(1800.0);
        opt2.setAvailableRooms(5);
        opt2.setBedType("King Size Bed");
        opt2.setRoomSize("480 sq.ft");
        opt2.setViewType("High Floor City Skyline View");
        opt2.setAmenities(Arrays.asList("Buffet Breakfast Included", "Executive Work Desk", "Rain Shower", "Mini Bar", "Soundproof Windows", "Complimentary Lounge Pass"));
        opt2.setImageUrls(Arrays.asList(
                "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"
        ));
        opt2.setPreview3dModelUrl("https://my.matterport.com/show/?m=sample3dexec");
        opt2.setDescription("Spacious executive room with city views, plush king bed, and complimentary breakfast.");
        opt2.setPopularUpsell(true);
        generated.add(opt2);

        // Option 3: Ocean View Premium Suite
        RoomTypeOption opt3 = new RoomTypeOption();
        opt3.setHotelId(hotelId);
        opt3.setRoomTypeName("Ocean View Premium Suite");
        opt3.setPriceUpgradeAddon(3500.0);
        opt3.setAvailableRooms(3);
        opt3.setBedType("Super King Suite Bed");
        opt3.setRoomSize("680 sq.ft");
        opt3.setViewType("Panoramic Ocean View Balcony");
        opt3.setAmenities(Arrays.asList("Private Balcony & Jacuzzi", "Separate Living Room Lounge", "Luxury Spa Amenities", "Nespresso Bar", "Free Airport Transfer", "3D Interactive Preview"));
        opt3.setImageUrls(Arrays.asList(
                "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80"
        ));
        opt3.setPreview3dModelUrl("https://my.matterport.com/show/?m=sample3docean");
        opt3.setDescription("Luxury suite featuring a private balcony with panoramic sea views, living room, and private Jacuzzi.");
        opt3.setPopularUpsell(false);
        generated.add(opt3);

        // Option 4: Presidential Luxury Suite
        RoomTypeOption opt4 = new RoomTypeOption();
        opt4.setHotelId(hotelId);
        opt4.setRoomTypeName("Presidential Luxury Suite");
        opt4.setPriceUpgradeAddon(7200.0);
        opt4.setAvailableRooms(1);
        opt4.setBedType("Master King Bed + Twin Room");
        opt4.setRoomSize("1,250 sq.ft");
        opt4.setViewType("360 Panoramic Penthouse View");
        opt4.setAmenities(Arrays.asList("Private Plunge Pool & Sun Deck", "24/7 Personal Butler Service", "Private Dining & Kitchenette", "VIP Airport Limousine", "Exclusive Lounge Access"));
        opt4.setImageUrls(Arrays.asList(
                "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80"
        ));
        opt4.setPreview3dModelUrl("https://my.matterport.com/show/?m=sample3dpresidential");
        opt4.setDescription("The pinnacle of luxury: penthouse suite with private plunge pool, personal butler, and VIP privileges.");
        opt4.setPopularUpsell(false);
        generated.add(opt4);

        return roomTypeOptionRepository.saveAll(generated);
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
