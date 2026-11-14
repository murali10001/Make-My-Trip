package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.SeatUnavailableException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Room3dConfig;
import com.makemytrip.makemytrip.models.Room3dConfig.CameraPreset;
import com.makemytrip.makemytrip.models.Room3dConfig.Room3dFurniture;
import com.makemytrip.makemytrip.models.Room3dConfig.Room3dHotspot;
import com.makemytrip.makemytrip.models.Room3dConfig.RoomDimensions;
import com.makemytrip.makemytrip.models.Room3dConfig.RoomLightingProfile;
import com.makemytrip.makemytrip.models.RoomTypeOption;
import com.makemytrip.makemytrip.models.SeatMap;
import com.makemytrip.makemytrip.models.SeatMap.SeatItem;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RoomTypeOptionRepository;
import com.makemytrip.makemytrip.repositories.SeatMapRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

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

    private final CopyOnWriteArrayList<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerSseClient() {
        SseEmitter emitter = new SseEmitter(180_000L);
        this.sseEmitters.add(emitter);

        emitter.onCompletion(() -> this.sseEmitters.remove(emitter));
        emitter.onTimeout(() -> this.sseEmitters.remove(emitter));
        emitter.onError(e -> this.sseEmitters.remove(emitter));

        try {
            Map<String, Object> welcome = new HashMap<>();
            welcome.put("type", "CONNECTED");
            welcome.put("message", "Real-time Seat & Room Selection stream connected");
            emitter.send(SseEmitter.event().name("connection").data(welcome));
        } catch (IOException e) {
            this.sseEmitters.remove(emitter);
        }
        return emitter;
    }

    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("ping").data("heartbeat"));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

    public void broadcastSeatUpdate(String flightId, String seatNo, String status) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "SEAT_MAP_UPDATE");
        payload.put("flightId", flightId);
        payload.put("seatNo", seatNo);
        payload.put("status", status);

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("seat-update").data(payload));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

    public void broadcastRoomUpdate(String hotelId, String roomTypeName, int availableRooms) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ROOM_AVAILABILITY_UPDATE");
        payload.put("hotelId", hotelId);
        payload.put("roomTypeName", roomTypeName);
        payload.put("availableRooms", availableRooms);

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("room-update").data(payload));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

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
                    } else if (r == 6) {
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
                    } else {
                        if (isWindow) {
                            tier = "WINDOW_STANDARD";
                            addon = 350.0;
                            desc = "Standard Window Seat (+₹350 Window Charge)";
                        } else if (isAisle) {
                            tier = "AISLE_STANDARD";
                            addon = 200.0;
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

    public synchronized SeatMap reserveSeat(String flightId, String seatNo, String userId) {
        if (flightId == null || flightId.trim().isEmpty()) {
            throw new IllegalArgumentException("Flight ID is required to reserve seat.");
        }
        if (seatNo == null || seatNo.trim().isEmpty()) {
            throw new IllegalArgumentException("Seat number is required to reserve seat.");
        }

        SeatMap map = getSeatMapForFlight(flightId.trim());

        SeatItem targetSeat = null;
        for (SeatItem item : map.getSeats()) {
            if (item.getSeatNo().equalsIgnoreCase(seatNo.trim())) {
                targetSeat = item;
                break;
            }
        }

        if (targetSeat == null) {
            throw new IllegalArgumentException("Seat '" + seatNo + "' does not exist on flight " + flightId);
        }

        if ("OCCUPIED".equalsIgnoreCase(targetSeat.getStatus())) {
            throw new SeatUnavailableException("Seat '" + seatNo + "' is already occupied. Please select an available seat.");
        }

        targetSeat.setStatus("OCCUPIED");
        SeatMap saved = seatMapRepository.save(map);
        broadcastSeatUpdate(flightId.trim(), targetSeat.getSeatNo(), "OCCUPIED");
        return saved;
    }

    public synchronized SeatMap releaseSeat(String flightId, String seatNo) {
        if (flightId == null || seatNo == null) return null;

        Optional<SeatMap> mapOpt = seatMapRepository.findByFlightId(flightId.trim());
        if (!mapOpt.isPresent()) return null;

        SeatMap map = mapOpt.get();
        boolean found = false;
        for (SeatItem item : map.getSeats()) {
            if (item.getSeatNo().equalsIgnoreCase(seatNo.trim())) {
                item.setStatus("AVAILABLE");
                found = true;
                break;
            }
        }

        if (found) {
            SeatMap saved = seatMapRepository.save(map);
            broadcastSeatUpdate(flightId.trim(), seatNo.trim(), "AVAILABLE");
            return saved;
        }
        return map;
    }

    public List<RoomTypeOption> getRoomOptionsForHotel(String hotelId) {
        if (hotelId == null || hotelId.trim().isEmpty()) {
            return Collections.emptyList();
        }

        List<RoomTypeOption> options = roomTypeOptionRepository.findByHotelId(hotelId.trim());
        if (options != null && !options.isEmpty()) {
            boolean backfilled = false;
            for (RoomTypeOption opt : options) {
                if (opt.getRoom3dConfig() == null) {
                    opt.setRoom3dConfig(build3dConfigForRoom(opt.getRoomTypeName(), opt.getBedType(), opt.getRoomSize(), opt.getViewType(), opt.getAmenities()));
                    backfilled = true;
                }
            }
            if (backfilled) {
                roomTypeOptionRepository.saveAll(options);
            }
            return options;
        }

        Hotel hotel = null;
        if (hotelRepository != null) {
            hotel = hotelRepository.findById(hotelId.trim()).orElse(null);
        }

        List<String> baseImages = new ArrayList<>();
        if (hotel != null) {
            if (hotel.getImageUrls() != null && !hotel.getImageUrls().isEmpty()) {
                baseImages.addAll(hotel.getImageUrls());
            } else if (hotel.getImageUrl() != null && !hotel.getImageUrl().trim().isEmpty()) {
                baseImages.add(hotel.getImageUrl().trim());
            }
        }
        if (baseImages.isEmpty()) {
            baseImages.add("https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80");
            baseImages.add("https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80");
            baseImages.add("https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80");
        }

        String hotelName = hotel != null && hotel.getHotelName() != null ? hotel.getHotelName() : "Luxury Hotel";

        List<RoomTypeOption> generated = new ArrayList<>();

        RoomTypeOption opt1 = new RoomTypeOption();
        opt1.setHotelId(hotelId.trim());
        opt1.setRoomTypeName(hotel != null && hotel.getRoomType() != null && !hotel.getRoomType().trim().isEmpty() ? hotel.getRoomType() : "Standard Classic Room");
        opt1.setPriceUpgradeAddon(0.0);
        opt1.setAvailableRooms(hotel != null && hotel.getAvailableRooms() > 0 ? Math.min(hotel.getAvailableRooms(), 5) : 5);
        opt1.setBedType("Comfort Queen Bed");
        opt1.setRoomSize("320 sq.ft");
        opt1.setViewType("Courtyard / City View");
        opt1.setAmenities(Arrays.asList("High-Speed Wi-Fi", "Air Conditioning", "En-suite Bathroom", "Smart LED TV", "Daily Housekeeping"));
        opt1.setImageUrls(baseImages);
        opt1.setPreview3dModelUrl("room_standard_3d");
        opt1.setRoom3dConfig(build3dConfigForRoom(opt1.getRoomTypeName(), opt1.getBedType(), opt1.getRoomSize(), opt1.getViewType(), opt1.getAmenities()));
        opt1.setDescription(hotelName + " classic room featuring modern comforts, cozy queen bedding, and essential travel amenities.");
        opt1.setPopularUpsell(false);
        generated.add(opt1);

        RoomTypeOption opt2 = new RoomTypeOption();
        opt2.setHotelId(hotelId.trim());
        opt2.setRoomTypeName("Deluxe Balcony Room");
        opt2.setPriceUpgradeAddon(1200.0);
        opt2.setAvailableRooms(4);
        opt2.setBedType("King Size Bed");
        opt2.setRoomSize("450 sq.ft");
        opt2.setViewType("Private Balcony Skyline View");
        opt2.setAmenities(Arrays.asList("Private Balcony", "Plush King Bed", "Complimentary Gourmet Breakfast", "Espresso Machine", "Mini Refrigerator", "Bathrobes & Slippers"));
        List<String> opt2Images = new ArrayList<>(baseImages);
        Collections.rotate(opt2Images, 1);
        opt2.setImageUrls(opt2Images);
        opt2.setPreview3dModelUrl("room_deluxe_3d");
        opt2.setRoom3dConfig(build3dConfigForRoom(opt2.getRoomTypeName(), opt2.getBedType(), opt2.getRoomSize(), opt2.getViewType(), opt2.getAmenities()));
        opt2.setDescription("Spacious upgraded retreat featuring a private furnished balcony, premium king bedding, and complimentary breakfast.");
        opt2.setPopularUpsell(true);
        generated.add(opt2);

        RoomTypeOption opt3 = new RoomTypeOption();
        opt3.setHotelId(hotelId.trim());
        opt3.setRoomTypeName("Executive Panoramic Suite");
        opt3.setPriceUpgradeAddon(2800.0);
        opt3.setAvailableRooms(3);
        opt3.setBedType("California King Bed");
        opt3.setRoomSize("680 sq.ft");
        opt3.setViewType("High-Floor Ocean / Skyline View");
        opt3.setAmenities(Arrays.asList("Panoramic Floor-to-Ceiling Windows", "Separate Living Lounge", "Soaking Jacuzzi Bath", "Executive Lounge Access", "Evening Cocktails", "Priority Check-in"));
        List<String> opt3Images = new ArrayList<>(baseImages);
        Collections.rotate(opt3Images, 2);
        opt3.setImageUrls(opt3Images);
        opt3.setPreview3dModelUrl("room_executive_3d");
        opt3.setRoom3dConfig(build3dConfigForRoom(opt3.getRoomTypeName(), opt3.getBedType(), opt3.getRoomSize(), opt3.getViewType(), opt3.getAmenities()));
        opt3.setDescription("Elevated luxury on high floors with separate living lounge, deep soaking jacuzzi tub, and exclusive executive club privileges.");
        opt3.setPopularUpsell(false);
        generated.add(opt3);

        RoomTypeOption opt4 = new RoomTypeOption();
        opt4.setHotelId(hotelId.trim());
        opt4.setRoomTypeName("Presidential Royal Suite");
        opt4.setPriceUpgradeAddon(5500.0);
        opt4.setAvailableRooms(2);
        opt4.setBedType("Master King Bed + Daybed");
        opt4.setRoomSize("1050 sq.ft");
        opt4.setViewType("360-Degree Penthouse Panoramic View");
        opt4.setAmenities(Arrays.asList("Dedicated 24/7 Butler", "Private Sun Terrace", "In-Suite Dining Setup", "Marble Jacuzzi & Rain Shower", "Limousine Airport Transfer", "Complimentary Premium Bar"));
        opt4.setImageUrls(baseImages);
        opt4.setPreview3dModelUrl("room_presidential_3d");
        opt4.setRoom3dConfig(build3dConfigForRoom(opt4.getRoomTypeName(), opt4.getBedType(), opt4.getRoomSize(), opt4.getViewType(), opt4.getAmenities()));
        opt4.setDescription("The ultimate in world-class hospitality. Grand penthouse suite with expansive private terrace, private bar, and dedicated personal butler.");
        opt4.setPopularUpsell(false);
        generated.add(opt4);

        return roomTypeOptionRepository.saveAll(generated);
    }

    public List<RoomTypeOption> getFeaturedShowcaseRooms() {
        List<RoomTypeOption> showcase = new ArrayList<>();

        RoomTypeOption r1 = new RoomTypeOption();
        r1.setId("SHOWCASE-CLASSIC");
        r1.setHotelId("HT-SHOWCASE-1");
        r1.setRoomTypeName("Grand Hyatt Classic Queen");
        r1.setPriceUpgradeAddon(0.0);
        r1.setAvailableRooms(6);
        r1.setBedType("Comfort Queen Bed");
        r1.setRoomSize("340 sq.ft");
        r1.setViewType("Courtyard & City View");
        r1.setAmenities(Arrays.asList("High-Speed Wi-Fi", "Air Conditioning", "En-suite Bathroom", "Smart 43\" LED TV", "Work Desk"));
        r1.setImageUrls(Arrays.asList(
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"
        ));
        r1.setPreview3dModelUrl("room_standard_3d");
        r1.setDescription("Contemporary classic elegance featuring warm oak textures, ergonomic queen bedding, dedicated work vanity, and high-speed Wi-Fi.");
        r1.setRoom3dConfig(build3dConfigForRoom(r1.getRoomTypeName(), r1.getBedType(), r1.getRoomSize(), r1.getViewType(), r1.getAmenities()));
        showcase.add(r1);

        RoomTypeOption r2 = new RoomTypeOption();
        r2.setId("SHOWCASE-DELUXE");
        r2.setHotelId("HT-SHOWCASE-2");
        r2.setRoomTypeName("The Oberoi Balcony Retreat");
        r2.setPriceUpgradeAddon(1200.0);
        r2.setAvailableRooms(4);
        r2.setBedType("King Size Bed");
        r2.setRoomSize("480 sq.ft");
        r2.setViewType("Private Balcony Ocean View");
        r2.setAmenities(Arrays.asList("Private Balcony", "Plush King Bed", "Teal Velvet Lounge", "Nespresso Machine", "Gourmet Breakfast"));
        r2.setImageUrls(Arrays.asList(
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
        ));
        r2.setPreview3dModelUrl("room_deluxe_3d");
        r2.setDescription("Upscale luxury suite with furnished outdoor private balcony, tufted velvet king bed, designer loveseat, and espresso bar.");
        r2.setPopularUpsell(true);
        r2.setRoom3dConfig(build3dConfigForRoom(r2.getRoomTypeName(), r2.getBedType(), r2.getRoomSize(), r2.getViewType(), r2.getAmenities()));
        showcase.add(r2);

        RoomTypeOption r3 = new RoomTypeOption();
        r3.setId("SHOWCASE-EXECUTIVE");
        r3.setHotelId("HT-SHOWCASE-3");
        r3.setRoomTypeName("Taj Palace Panoramic Suite");
        r3.setPriceUpgradeAddon(2800.0);
        r3.setAvailableRooms(3);
        r3.setBedType("California King Bed");
        r3.setRoomSize("720 sq.ft");
        r3.setViewType("High-Floor Panoramic Skyline");
        r3.setAmenities(Arrays.asList("Panoramic Wrap Windows", "Separate Living Lounge", "Soaking Jacuzzi Bath", "Executive Lounge Access", "Evening Cocktails"));
        r3.setImageUrls(Arrays.asList(
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
        ));
        r3.setPreview3dModelUrl("room_executive_3d");
        r3.setDescription("Bespoke multi-zone penthouse suite with wrap-around corner glass, California king bedroom, Italian leather sectional lounge, and freestanding soaking jacuzzi.");
        r3.setRoom3dConfig(build3dConfigForRoom(r3.getRoomTypeName(), r3.getBedType(), r3.getRoomSize(), r3.getViewType(), r3.getAmenities()));
        showcase.add(r3);

        RoomTypeOption r4 = new RoomTypeOption();
        r4.setId("SHOWCASE-PRESIDENTIAL");
        r4.setHotelId("HT-SHOWCASE-4");
        r4.setRoomTypeName("The Leela Presidential Penthouse");
        r4.setPriceUpgradeAddon(5500.0);
        r4.setAvailableRooms(2);
        r4.setBedType("Master King Bed + Daybed");
        r4.setRoomSize("1150 sq.ft");
        r4.setViewType("360-Degree Penthouse Panoramic View");
        r4.setAmenities(Arrays.asList("Dedicated 24/7 Butler", "Private Sun Terrace", "Chesterfield Parlor", "Dining Suite", "Carrara Marble Jacuzzi", "Limousine Transfer"));
        r4.setImageUrls(Arrays.asList(
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80"
        ));
        r4.setPreview3dModelUrl("room_presidential_3d");
        r4.setDescription("The pinnacle of luxury hospitality. Opulent Carrara marble flooring, four-poster master canopy bed, private cocktail bar, 4-seater dining salon, and terrace.");
        r4.setRoom3dConfig(build3dConfigForRoom(r4.getRoomTypeName(), r4.getBedType(), r4.getRoomSize(), r4.getViewType(), r4.getAmenities()));
        showcase.add(r4);

        return showcase;
    }

    public Room3dConfig build3dConfigForRoom(String roomTypeName, String bedType, String roomSize, String viewType, List<String> amenities) {
        Room3dConfig config = new Room3dConfig();
        String nameLower = roomTypeName != null ? roomTypeName.toLowerCase() : "";

        boolean isPresidential = nameLower.contains("presidential") || nameLower.contains("royal") || nameLower.contains("penthouse");
        boolean isExecutive = !isPresidential && (nameLower.contains("executive") || nameLower.contains("suite") || nameLower.contains("panoramic"));
        boolean isDeluxe = !isPresidential && !isExecutive && (nameLower.contains("deluxe") || nameLower.contains("balcony") || nameLower.contains("premium"));

        List<Room3dFurniture> furniture = new ArrayList<>();
        List<Room3dHotspot> hotspots = new ArrayList<>();
        Map<String, CameraPreset> presets = new HashMap<>();

        if (isPresidential) {
            config.setRoomModelType("PRESIDENTIAL_ROYAL");
            config.setDimensions(new RoomDimensions(9.5, 7.0, 3.2, roomSize != null ? roomSize : "1050 sq.ft"));
            config.setFloorMaterial("ITALIAN_CARRARA_MARBLE");
            config.setWallMaterial("ACOUSTIC_GOLD_SLATS");
            config.setCeilingHeight(3.2);
            config.setViewScene("PENTHOUSE_360");

            RoomLightingProfile lighting = new RoomLightingProfile();
            lighting.setAmbientColor("#FFFDF5");
            lighting.setPrimaryLightColor("#FFE6A3");
            lighting.setDayIntensity(1.0);
            lighting.setNightIntensity(0.55);
            lighting.setCeilingSpotlights(8);
            lighting.setBedsideWarmth("2700K");
            config.setLightingProfile(lighting);

            furniture.add(new Room3dFurniture("pres_bed_frame", "Master Four-Poster Canopy Bed", "BED", -60, 0, -85, 210, 52, 225, 0, "#1A1512", "#D4AF37", "POLISHED_WOOD", "Solid dark walnut canopy frame with brushed brass capitals", "Master King Bed"));
            furniture.add(new Room3dFurniture("pres_mattress", "Royal Plush Master Mattress", "BED", -60, 48, -83, 202, 32, 218, 0, "#FFFFFF", "#F1F5F9", "FABRIC_VELVET", "Custom 14-inch silk-tufted pillowtop mattress", "Master King Bed"));
            furniture.add(new Room3dFurniture("pres_headboard", "Carved Gold-Leaf Headboard", "BED", -60, 60, -192, 230, 130, 16, 0, "#D4AF37", "#451A03", "BRUSHED_BRASS", "Hand-gilded fluted panel headboard", "Master King Bed"));
            furniture.add(new Room3dFurniture("pres_pillows", "Grand Pillow Array (6x)", "BED", -60, 68, -165, 185, 26, 48, 0, "#FFFFFF", "#FEF3C7", "FABRIC_VELVET", "6-pillow assortment with silk and velvet shams", "Master King Bed"));
            furniture.add(new Room3dFurniture("pres_throw", "Gold Silk Damask Duvet Throw", "BED", -60, 60, -25, 204, 16, 95, 0, "#B45309", "#D97706", "FABRIC_VELVET", "Artisan woven gold damask runner", "Master King Bed"));

            furniture.add(new Room3dFurniture("pres_night_l", "Carrara Marble Nightstand (Left)", "NIGHTSTAND", -185, 0, -170, 52, 54, 46, 0, "#F8FAFC", "#D4AF37", "ITALIAN_MARBLE", "Dual-drawer Italian marble bedside table", "Bedside Charging"));
            furniture.add(new Room3dFurniture("pres_night_r", "Carrara Marble Nightstand (Right)", "NIGHTSTAND", 65, 0, -170, 52, 54, 46, 0, "#F8FAFC", "#D4AF37", "ITALIAN_MARBLE", "Dual-drawer Italian marble bedside table", "Bedside Charging"));
            furniture.add(new Room3dFurniture("pres_lamp_l", "Crystal Chandelier Sconce (Left)", "LIGHTING", -185, 54, -170, 22, 50, 22, 0, "#FEF08A", "#D4AF37", "BRUSHED_BRASS", "Crystalline bedside lamp with warm radiance", "Lighting"));
            furniture.add(new Room3dFurniture("pres_lamp_r", "Crystal Chandelier Sconce (Right)", "LIGHTING", 65, 54, -170, 22, 50, 22, 0, "#FEF08A", "#D4AF37", "BRUSHED_BRASS", "Crystalline bedside lamp with warm radiance", "Lighting"));

            furniture.add(new Room3dFurniture("pres_sofa", "Chesterfield Leather Grand Sofa", "SEATING", 100, 0, 30, 180, 85, 82, -40, "#3B1E08", "#1C0D02", "LEATHER", "Deep button-tufted cognac leather Chesterfield sofa", "Chesterfield Parlor"));
            furniture.add(new Room3dFurniture("pres_coffee", "Gold-Rimmed Marble Salon Table", "SEATING", 70, 0, 95, 85, 44, 85, 0, "#F8FAFC", "#D4AF37", "ITALIAN_MARBLE", "Circular marble table with brass sculptural base", "Chesterfield Parlor"));
            furniture.add(new Room3dFurniture("pres_rug", "Persian Silk Embroidered Rug", "DECOR", 85, 1, 60, 210, 3, 170, -20, "#78350F", "#D4AF37", "FABRIC_VELVET", "Hand-knotted silk area rug", "Chesterfield Parlor"));

            furniture.add(new Room3dFurniture("pres_dining", "Executive 4-Seater Dining Salon", "SEATING", -170, 0, 60, 130, 76, 85, 45, "#1E293B", "#D4AF37", "ITALIAN_MARBLE", "Private formal dining table for in-suite hospitality", "In-Suite Dining"));

            furniture.add(new Room3dFurniture("pres_bar", "Private Wet Bar & Wine Vault", "STORAGE", -185, 0, -30, 65, 115, 95, 90, "#1E293B", "#D4AF37", "POLISHED_WOOD", "Illuminated glass wet bar with temperature-controlled wine cellar", "Cocktail Wet Bar"));

            furniture.add(new Room3dFurniture("pres_jacuzzi", "Carrara Marble Hydro Jacuzzi Tub", "BATH", 155, 0, -110, 145, 70, 95, -45, "#FFFFFF", "#D4AF37", "ITALIAN_MARBLE", "Freestanding oval hydrotherapy jacuzzi bath with 24k gold fixtures", "Marble Jacuzzi"));

            furniture.add(new Room3dFurniture("pres_terrace", "Penthouse Sun Terrace Portals", "WINDOW_BALCONY", 195, 0, 10, 18, 250, 200, -90, "#0F172A", "#38BDF8", "CLEAR_GLASS", "Floor-to-ceiling multi-panel folding glass terrace portal", "Private Sun Terrace"));

            furniture.add(new Room3dFurniture("pres_tv", "75\" Cinema OLED Display", "MEDIA", -60, 115, 190, 170, 96, 12, 180, "#0A0A0A", "#38BDF8", "ELECTRONICS", "Ultra-wide 75-inch 4K Cinema OLED with Bowers & Wilkins audio", "Cinema Display"));

            hotspots.add(new Room3dHotspot("hs_p_bed", "Four-Poster Canopy Bed", "Grand master king canopy bed with silk damask linens.", -60, 50, -85, "Bed", new CameraPreset(15, -10, 1.3, "Canopy Bed Focus")));
            hotspots.add(new Room3dHotspot("hs_p_jacuzzi", "Carrara Marble Jacuzzi", "Hydrotherapy soaking bath overlooking the penthouse horizon.", 155, 55, -110, "Bath", new CameraPreset(65, -12, 1.35, "Jacuzzi Spa Focus")));
            hotspots.add(new Room3dHotspot("hs_p_sofa", "Chesterfield Parlor", "Cognac leather parlor seating with gold-rimmed marble table.", 100, 55, 30, "Sofa", new CameraPreset(-35, -12, 1.3, "Parlor Focus")));
            hotspots.add(new Room3dHotspot("hs_p_terrace", "Private Sun Terrace", "Panoramic terrace portals leading to outdoor skyline loungers.", 195, 80, 10, "Eye", new CameraPreset(-85, -6, 1.4, "Terrace Panorama")));

            presets.put("OVERVIEW", new CameraPreset(32, -16, 1.0, "Grand Penthouse Overview"));
            presets.put("BED", new CameraPreset(15, -10, 1.3, "Master Canopy Bed"));
            presets.put("LOUNGE", new CameraPreset(-35, -12, 1.3, "Chesterfield Parlor"));
            presets.put("BATH", new CameraPreset(65, -12, 1.35, "Marble Jacuzzi Spa"));
            presets.put("TERRACE", new CameraPreset(-85, -6, 1.4, "Sun Terrace Portal"));

        } else if (isExecutive) {
            config.setRoomModelType("EXECUTIVE_PANORAMIC");
            config.setDimensions(new RoomDimensions(7.5, 5.5, 3.0, roomSize != null ? roomSize : "680 sq.ft"));
            config.setFloorMaterial("HERRINGBONE_WALNUT");
            config.setWallMaterial("EMERALD_VELVET_DAMASK");
            config.setCeilingHeight(3.0);
            config.setViewScene("HIGH_FLOOR_SKYLINE");

            RoomLightingProfile lighting = new RoomLightingProfile();
            lighting.setAmbientColor("#F8F9FA");
            lighting.setPrimaryLightColor("#FFECC7");
            lighting.setDayIntensity(0.98);
            lighting.setNightIntensity(0.5);
            lighting.setCeilingSpotlights(6);
            lighting.setBedsideWarmth("2900K");
            config.setLightingProfile(lighting);

            furniture.add(new Room3dFurniture("exec_bed_frame", "California King Bed Frame", "BED", -50, 0, -80, 200, 46, 220, 0, "#1E293B", "#B45309", "POLISHED_WOOD", "Low-profile upholstered platform bed in espresso walnut", "California King Bed"));
            furniture.add(new Room3dFurniture("exec_mattress", "California King Mattress", "BED", -50, 42, -78, 194, 28, 212, 0, "#FFFFFF", "#E2E8F0", "FABRIC_VELVET", "Ergonomic pocket spring California king mattress", "California King Bed"));
            furniture.add(new Room3dFurniture("exec_headboard", "Bronze-Trimmed Velvet Headboard", "BED", -50, 52, -185, 218, 105, 14, 0, "#064E3B", "#D4AF37", "FABRIC_VELVET", "Vertical ribbed emerald velvet headboard with bronze framing", "California King Bed"));
            furniture.add(new Room3dFurniture("exec_pillows", "Plush Pillow Set (4x)", "BED", -50, 58, -158, 170, 22, 44, 0, "#FFFFFF", "#D1FAE5", "FABRIC_VELVET", "4 high-loft goose feather pillows", "California King Bed"));
            furniture.add(new Room3dFurniture("exec_runner", "Charcoal & Gold Runner", "BED", -50, 54, -20, 196, 14, 85, 0, "#1F2937", "#F59E0B", "FABRIC_VELVET", "Textured contrast bed scarf", "California King Bed"));

            furniture.add(new Room3dFurniture("exec_night_l", "Walnut Floating Nightstand (Left)", "NIGHTSTAND", -160, 18, -165, 46, 36, 42, 0, "#292524", "#D4AF37", "POLISHED_WOOD", "Wall-mounted nightstand with wireless phone charging", "Charging"));
            furniture.add(new Room3dFurniture("exec_night_r", "Walnut Floating Nightstand (Right)", "NIGHTSTAND", 60, 18, -165, 46, 36, 42, 0, "#292524", "#D4AF37", "POLISHED_WOOD", "Wall-mounted nightstand with wireless phone charging", "Charging"));
            furniture.add(new Room3dFurniture("exec_sconce_l", "Pendant Sconce (Left)", "LIGHTING", -160, 65, -165, 16, 46, 16, 0, "#FDE68A", "#D4AF37", "BRUSHED_BRASS", "Hanging brass bedside lamp", "Lighting"));
            furniture.add(new Room3dFurniture("exec_sconce_r", "Pendant Sconce (Right)", "LIGHTING", 60, 65, -165, 16, 46, 16, 0, "#FDE68A", "#D4AF37", "BRUSHED_BRASS", "Hanging brass bedside lamp", "Lighting"));

            furniture.add(new Room3dFurniture("exec_sofa", "Modern L-Sectional Leather Sofa", "SEATING", 100, 0, 25, 170, 78, 130, -35, "#1E293B", "#334155", "LEATHER", "Deep seating Italian leather sectional lounge", "Living Lounge"));
            furniture.add(new Room3dFurniture("exec_coffee", "Calacatta Oval Coffee Table", "SEATING", 75, 0, 85, 75, 40, 75, 0, "#F8FAFC", "#D4AF37", "ITALIAN_MARBLE", "Oval marble coffee table with brushed bronze legs", "Living Lounge"));
            furniture.add(new Room3dFurniture("exec_rug", "Wool Blend Graphic Area Rug", "DECOR", 85, 1, 55, 190, 3, 150, -15, "#E2E8F0", "#064E3B", "FABRIC_VELVET", "Plush luxury area rug", "Living Lounge"));

            furniture.add(new Room3dFurniture("exec_jacuzzi", "Freestanding Soaking Jacuzzi Bath", "BATH", -165, 0, 85, 130, 64, 85, 45, "#FFFFFF", "#D4AF37", "ITALIAN_MARBLE", "Deep soaking acrylic-core jacuzzi bath with gold pillar taps", "Soaking Jacuzzi"));
            furniture.add(new Room3dFurniture("exec_partition", "Acoustic Fluted Glass Partition", "WINDOW_BALCONY", -110, 0, 75, 8, 230, 110, 0, "#E2E8F0", "#38BDF8", "CLEAR_GLASS", "Translucent fluted acoustic glass architectural divider", "Glass Partition"));

            furniture.add(new Room3dFurniture("exec_windows", "Wrap-Around Panoramic Skyline Windows", "WINDOW_BALCONY", 185, 0, -20, 15, 235, 220, -90, "#1E293B", "#38BDF8", "CLEAR_GLASS", "Floor-to-ceiling double-glazed panoramic corner glass walls", "Panoramic Skyline"));

            furniture.add(new Room3dFurniture("exec_tv", "65\" Ultra HD OLED TV", "MEDIA", -50, 105, 182, 145, 82, 10, 180, "#0F172A", "#38BDF8", "ELECTRONICS", "65-inch OLED smart television on floating credenza", "65\" Smart TV"));

            hotspots.add(new Room3dHotspot("hs_e_bed", "California King Bed", "Expansive California king bed with custom emerald headboard.", -50, 50, -80, "Bed", new CameraPreset(18, -8, 1.25, "King Suite Focus")));
            hotspots.add(new Room3dHotspot("hs_e_jacuzzi", "Soaking Jacuzzi Bath", "Deep freestanding hydrotherapy bath behind fluted glass.", -165, 50, 85, "Bath", new CameraPreset(60, -10, 1.3, "Jacuzzi Focus")));
            hotspots.add(new Room3dHotspot("hs_e_lounge", "L-Sectional Lounge", "Italian leather sectional sofa for relaxing and entertaining.", 100, 50, 25, "Sofa", new CameraPreset(-30, -10, 1.25, "Lounge Focus")));
            hotspots.add(new Room3dHotspot("hs_e_view", "Corner Skyline Panorama", "Floor-to-ceiling corner glazing with expansive skyline views.", 185, 75, -20, "Eye", new CameraPreset(-80, -5, 1.35, "Skyline View")));

            presets.put("OVERVIEW", new CameraPreset(28, -15, 1.0, "Executive Suite Overview"));
            presets.put("BED", new CameraPreset(18, -8, 1.25, "California King Bed"));
            presets.put("LOUNGE", new CameraPreset(-30, -10, 1.25, "L-Sectional Lounge"));
            presets.put("BATH", new CameraPreset(60, -10, 1.3, "Soaking Jacuzzi"));
            presets.put("VIEW", new CameraPreset(-80, -5, 1.35, "Panoramic Skyline"));

        } else if (isDeluxe) {
            config.setRoomModelType("DELUXE_BALCONY");
            config.setDimensions(new RoomDimensions(5.8, 4.8, 2.8, roomSize != null ? roomSize : "450 sq.ft"));
            config.setFloorMaterial("HERRINGBONE_WALNUT");
            config.setWallMaterial("TEAL_ACCENT_PANELING");
            config.setCeilingHeight(2.8);
            config.setViewScene("OCEAN_BALCONY");

            RoomLightingProfile lighting = new RoomLightingProfile();
            lighting.setAmbientColor("#F1F5F9");
            lighting.setPrimaryLightColor("#FEF3C7");
            lighting.setDayIntensity(0.95);
            lighting.setNightIntensity(0.48);
            lighting.setCeilingSpotlights(5);
            lighting.setBedsideWarmth("3000K");
            config.setLightingProfile(lighting);

            furniture.add(new Room3dFurniture("deluxe_bed_frame", "Platform King Bed Frame", "BED", -30, 0, -80, 190, 42, 215, 0, "#1E293B", "#0F766E", "POLISHED_WOOD", "Dark walnut platform bed frame with hidden support legs", "Plush King Bed"));
            furniture.add(new Room3dFurniture("deluxe_mattress", "King Pocket-Spring Mattress", "BED", -30, 38, -78, 184, 28, 208, 0, "#FFFFFF", "#E2E8F0", "FABRIC_VELVET", "Plush comfort king size mattress", "Plush King Bed"));
            furniture.add(new Room3dFurniture("deluxe_headboard", "Teal Tufted Velvet Headboard", "BED", -30, 48, -182, 210, 95, 14, 0, "#0F766E", "#115E59", "FABRIC_VELVET", "Tufted geometric teal velvet headboard", "Plush King Bed"));
            furniture.add(new Room3dFurniture("deluxe_pillows", "4x King Pillows", "BED", -30, 54, -155, 160, 20, 42, 0, "#F8FAFC", "#E0F2FE", "FABRIC_VELVET", "Plush hypoallergenic king pillow assortment", "Plush King Bed"));
            furniture.add(new Room3dFurniture("deluxe_runner", "Amber Velvet Bed Scarf", "BED", -30, 50, -20, 186, 14, 80, 0, "#D97706", "#B45309", "FABRIC_VELVET", "Warm amber gold velvet bed runner", "Plush King Bed"));

            furniture.add(new Room3dFurniture("deluxe_night_l", "Floating Walnut Nightstand (Left)", "NIGHTSTAND", -140, 20, -160, 42, 32, 38, 0, "#292524", "#D4AF37", "POLISHED_WOOD", "Floating bedside drawer unit", "Bedside Table"));
            furniture.add(new Room3dFurniture("deluxe_night_r", "Floating Walnut Nightstand (Right)", "NIGHTSTAND", 80, 20, -160, 42, 32, 38, 0, "#292524", "#D4AF37", "POLISHED_WOOD", "Floating bedside drawer unit", "Bedside Table"));
            furniture.add(new Room3dFurniture("deluxe_lamp_l", "Brass Sconce (Left)", "LIGHTING", -140, 65, -160, 16, 45, 16, 0, "#FBBF24", "#D4AF37", "BRUSHED_BRASS", "Modern brushed brass sconce light", "Lighting"));
            furniture.add(new Room3dFurniture("deluxe_lamp_r", "Brass Sconce (Right)", "LIGHTING", 80, 65, -160, 16, 45, 16, 0, "#FBBF24", "#D4AF37", "BRUSHED_BRASS", "Modern brushed brass sconce light", "Lighting"));

            furniture.add(new Room3dFurniture("deluxe_loveseat", "Velvet 2-Seater Loveseat", "SEATING", 95, 0, 20, 125, 72, 68, -35, "#0D9488", "#134E4A", "FABRIC_VELVET", "Contemporary teal velvet upholstered loveseat", "Lounge Loveseat"));
            furniture.add(new Room3dFurniture("deluxe_coffee", "Round Marble Coffee Table", "SEATING", 60, 0, 75, 60, 38, 60, 0, "#F8FAFC", "#D4AF37", "ITALIAN_MARBLE", "Round Italian marble coffee table with brass rim", "Lounge Loveseat"));
            furniture.add(new Room3dFurniture("deluxe_rug", "Geometric Area Rug", "DECOR", 60, 1, 45, 160, 3, 130, 0, "#CBD5E1", "#0F766E", "FABRIC_VELVET", "Luxury textured area rug", "Lounge Loveseat"));

            furniture.add(new Room3dFurniture("deluxe_balcony_doors", "Sliding Balcony Glass Doors", "WINDOW_BALCONY", 175, 0, -60, 12, 215, 155, -90, "#334155", "#38BDF8", "CLEAR_GLASS", "Acoustic sliding glass doors opening to private balcony", "Private Balcony"));
            furniture.add(new Room3dFurniture("deluxe_balcony_terrace", "Private Furnished Balcony", "WINDOW_BALCONY", 230, 0, -60, 85, 105, 155, 0, "#475569", "#0284C7", "BRUSHED_BRASS", "Furnished outdoor balcony terrace overlooking azure waters", "Private Balcony"));

            furniture.add(new Room3dFurniture("deluxe_espresso", "Gourmet Espresso & Minibar", "STORAGE", -150, 0, 40, 50, 88, 70, 90, "#1E293B", "#F59E0B", "POLISHED_WOOD", "Nespresso capsule machine and stocked beverage refrigerator", "Espresso Machine"));

            furniture.add(new Room3dFurniture("deluxe_tv", "55\" Ultra HD Smart TV", "MEDIA", -30, 95, 178, 125, 72, 8, 180, "#0F172A", "#38BDF8", "ELECTRONICS", "55-inch Ultra HD 4K Smart TV with premium streaming", "Smart TV"));

            hotspots.add(new Room3dHotspot("hs_d_balcony", "Private Balcony Terrace", "Step outside onto your private balcony with ocean views.", 175, 60, -60, "Eye", new CameraPreset(-82, -5, 1.35, "Balcony Ocean View")));
            hotspots.add(new Room3dHotspot("hs_d_bed", "Plush King Bed", "King size bed with custom teal tufted headboard.", -30, 50, -80, "Bed", new CameraPreset(18, -8, 1.25, "King Bed Focus")));
            hotspots.add(new Room3dHotspot("hs_d_loveseat", "Velvet Lounge Area", "Teal velvet seating area with Italian marble table.", 95, 45, 20, "Sofa", new CameraPreset(-30, -10, 1.25, "Velvet Lounge Focus")));
            hotspots.add(new Room3dHotspot("hs_d_espresso", "Espresso Bar Station", "Complimentary gourmet coffee and stocked minibar.", -150, 50, 40, "Coffee", new CameraPreset(45, -10, 1.25, "Espresso Bar Focus")));

            presets.put("OVERVIEW", new CameraPreset(30, -15, 1.0, "Deluxe Room Overview"));
            presets.put("BED", new CameraPreset(18, -8, 1.25, "King Bed Suite"));
            presets.put("BALCONY", new CameraPreset(-82, -5, 1.35, "Balcony View"));
            presets.put("LOUNGE", new CameraPreset(-30, -10, 1.25, "Velvet Loveseat"));

        } else {

            config.setRoomModelType("STANDARD_CLASSIC");
            config.setDimensions(new RoomDimensions(4.5, 4.0, 2.7, roomSize != null ? roomSize : "320 sq.ft"));
            config.setFloorMaterial("OAK_HARDWOOD");
            config.setWallMaterial("WARM_LINEN_PLASTER");
            config.setCeilingHeight(2.7);
            config.setViewScene("CITY_SKYLINE");

            RoomLightingProfile lighting = new RoomLightingProfile();
            lighting.setAmbientColor("#F8FAFC");
            lighting.setPrimaryLightColor("#FFE8BD");
            lighting.setDayIntensity(0.92);
            lighting.setNightIntensity(0.45);
            lighting.setCeilingSpotlights(4);
            lighting.setBedsideWarmth("2800K");
            config.setLightingProfile(lighting);

            furniture.add(new Room3dFurniture("std_bed_frame", "Oak Platform Bed Frame", "BED", 0, 0, -80, 160, 40, 200, 0, "#4A3525", "#2C1E14", "POLISHED_WOOD", "Solid oak platform bed frame with study legs", "Comfort Queen Bed"));
            furniture.add(new Room3dFurniture("std_mattress", "Queen Pocket-Spring Mattress", "BED", 0, 36, -78, 154, 26, 194, 0, "#FFFFFF", "#E2E8F0", "FABRIC_VELVET", "Plush 10-inch pocket-spring queen mattress", "Comfort Queen Bed"));
            furniture.add(new Room3dFurniture("std_headboard", "Vertical Oak Slatted Headboard", "BED", 0, 45, -178, 172, 80, 10, 0, "#3E2723", "#271613", "POLISHED_WOOD", "Natural oak vertical slatted designer headboard", "Comfort Queen Bed"));
            furniture.add(new Room3dFurniture("std_pillows", "Dual Feather Pillows", "BED", 0, 52, -152, 130, 18, 38, 0, "#F8FAFC", "#E2E8F0", "FABRIC_VELVET", "Hypoallergenic feather-down pillow pair", "Comfort Queen Bed"));
            furniture.add(new Room3dFurniture("std_runner", "Navy Velvet Bed Runner", "BED", 0, 46, -25, 156, 12, 75, 0, "#1E3A8A", "#172554", "FABRIC_VELVET", "Warm navy blue velvet accent bed scarf", "Comfort Queen Bed"));

            furniture.add(new Room3dFurniture("std_night_l", "Oak Nightstand (Left)", "NIGHTSTAND", -110, 0, -155, 42, 48, 40, 0, "#4A3525", "#D4AF37", "POLISHED_WOOD", "Oak single-drawer bedside nightstand", "Bedside Table"));
            furniture.add(new Room3dFurniture("std_night_r", "Oak Nightstand (Right)", "NIGHTSTAND", 110, 0, -155, 42, 48, 40, 0, "#4A3525", "#D4AF37", "POLISHED_WOOD", "Oak single-drawer bedside nightstand", "Bedside Table"));
            furniture.add(new Room3dFurniture("std_lamp_l", "Warm Reading Lamp (Left)", "LIGHTING", -110, 48, -155, 18, 36, 18, 0, "#FDE68A", "#B45309", "BRUSHED_BRASS", "Bedside table lamp with warm radiance", "Reading Lights"));
            furniture.add(new Room3dFurniture("std_lamp_r", "Warm Reading Lamp (Right)", "LIGHTING", 110, 48, -155, 18, 36, 18, 0, "#FDE68A", "#B45309", "BRUSHED_BRASS", "Bedside table lamp with warm radiance", "Reading Lights"));

            furniture.add(new Room3dFurniture("std_desk", "Compact Oak Writing Desk", "DESK", 135, 0, 20, 48, 74, 90, -90, "#5D4037", "#3E2723", "POLISHED_WOOD", "Solid oak writing desk with power strip outlets", "Work Desk"));
            furniture.add(new Room3dFurniture("std_chair", "Ergonomic Task Chair", "DESK", 100, 0, 20, 42, 80, 42, 90, "#334155", "#64748B", "LEATHER", "Contoured ergonomic task chair", "Work Desk"));

            furniture.add(new Room3dFurniture("std_tv", "43\" Smart LED TV", "MEDIA", 0, 95, 175, 100, 58, 8, 180, "#0F172A", "#3B82F6", "ELECTRONICS", "Wall mounted 43-inch Smart LED TV", "Smart LED TV"));

            furniture.add(new Room3dFurniture("std_wardrobe", "Built-in Double Wardrobe", "STORAGE", -140, 0, 50, 50, 190, 90, 90, "#3E2723", "#D4AF37", "POLISHED_WOOD", "Double wardrobe with luggage shelf and safe", "Wardrobe"));

            furniture.add(new Room3dFurniture("std_window", "Acoustic City Window", "WINDOW_BALCONY", 155, 55, -80, 12, 130, 100, -90, "#E2E8F0", "#38BDF8", "CLEAR_GLASS", "Double-glazed acoustic city view window", "City View"));

            hotspots.add(new Room3dHotspot("hs_s_bed", "Comfort Queen Bed", "Ergonomic queen pocket spring mattress with oak headboard.", 0, 45, -80, "Bed", new CameraPreset(12, -8, 1.25, "Queen Bed Focus")));
            hotspots.add(new Room3dHotspot("hs_s_desk", "Dedicated Workspace", "Compact oak writing desk with charging points and ergonomic chair.", 135, 45, 20, "Desk", new CameraPreset(-65, -10, 1.25, "Work Desk Focus")));
            hotspots.add(new Room3dHotspot("hs_s_window", "City View Window", "Acoustically insulated window overlooking the city skyline.", 155, 75, -80, "Eye", new CameraPreset(-85, -6, 1.3, "Skyline Window Focus")));
            hotspots.add(new Room3dHotspot("hs_s_tv", "43\" Smart Television", "High definition wall-mounted entertainment television.", 0, 95, 175, "Tv", new CameraPreset(180, -6, 1.2, "Smart TV Focus")));

            presets.put("OVERVIEW", new CameraPreset(25, -14, 1.0, "Classic Room Overview"));
            presets.put("BED", new CameraPreset(12, -8, 1.25, "Queen Bed Focus"));
            presets.put("WORKSPACE", new CameraPreset(-65, -10, 1.25, "Writing Desk"));
            presets.put("WINDOW", new CameraPreset(-85, -6, 1.3, "City View Window"));
        }

        config.setFurniture(furniture);
        config.setHotspots(hotspots);
        config.setCameraPresets(presets);

        return config;
    }

    public synchronized RoomTypeOption reserveRoomOption(String hotelId, String roomTypeName, int count) {
        if (hotelId == null || roomTypeName == null) return null;

        List<RoomTypeOption> options = getRoomOptionsForHotel(hotelId.trim());
        for (RoomTypeOption opt : options) {
            if (opt.getRoomTypeName().equalsIgnoreCase(roomTypeName.trim())) {
                int newCount = Math.max(0, opt.getAvailableRooms() - Math.max(1, count));
                opt.setAvailableRooms(newCount);
                RoomTypeOption saved = roomTypeOptionRepository.save(opt);
                broadcastRoomUpdate(hotelId.trim(), opt.getRoomTypeName(), newCount);
                return saved;
            }
        }
        return null;
    }

    public synchronized RoomTypeOption releaseRoomOption(String hotelId, String roomTypeName, int count) {
        if (hotelId == null || roomTypeName == null) return null;

        List<RoomTypeOption> options = roomTypeOptionRepository.findByHotelId(hotelId.trim());
        for (RoomTypeOption opt : options) {
            if (opt.getRoomTypeName().equalsIgnoreCase(roomTypeName.trim())) {
                int newCount = opt.getAvailableRooms() + Math.max(1, count);
                opt.setAvailableRooms(newCount);
                RoomTypeOption saved = roomTypeOptionRepository.save(opt);
                broadcastRoomUpdate(hotelId.trim(), opt.getRoomTypeName(), newCount);
                return saved;
            }
        }
        return null;
    }

    public UserPreferences saveUserPreferences(UserPreferences prefs) {
        if (prefs.getUserId() == null || prefs.getUserId().trim().isEmpty()) {
            throw new IllegalArgumentException("User ID is required to save preferences.");
        }

        UserPreferences existing = userPreferencesRepository.findByUserId(prefs.getUserId().trim()).orElse(new UserPreferences());
        existing.setUserId(prefs.getUserId().trim());
        if (prefs.getUserEmail() != null) existing.setUserEmail(prefs.getUserEmail());
        if (prefs.getPreferredSeatType() != null) existing.setPreferredSeatType(prefs.getPreferredSeatType());
        if (prefs.getPreferredSeatNo() != null) existing.setPreferredSeatNo(prefs.getPreferredSeatNo());
        if (prefs.getPreferredRoomType() != null) existing.setPreferredRoomType(prefs.getPreferredRoomType());
        if (prefs.getPreferredBedType() != null) existing.setPreferredBedType(prefs.getPreferredBedType());
        if (prefs.getPreferredFloorView() != null) existing.setPreferredFloorView(prefs.getPreferredFloorView());

        existing.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return userPreferencesRepository.save(existing);
    }

    public UserPreferences getUserPreferences(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return new UserPreferences();
        }
        return userPreferencesRepository.findByUserId(userId.trim()).orElseGet(() -> {
            UserPreferences cleanPrefs = new UserPreferences();
            cleanPrefs.setUserId(userId.trim());
            return cleanPrefs;
        });
    }
}

