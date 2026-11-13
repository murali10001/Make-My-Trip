package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.SeatUnavailableException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.RoomTypeOption;
import com.makemytrip.makemytrip.models.SeatMap;
import com.makemytrip.makemytrip.models.SeatMap.SeatItem;
import com.makemytrip.makemytrip.models.UserPreferences;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RoomTypeOptionRepository;
import com.makemytrip.makemytrip.repositories.SeatMapRepository;
import com.makemytrip.makemytrip.repositories.UserPreferencesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

public class SelectionServiceTest {

    private SelectionService selectionService;
    private StubSeatMapRepository seatMapRepository;
    private StubRoomTypeOptionRepository roomTypeOptionRepository;
    private StubUserPreferencesRepository userPreferencesRepository;
    private StubFlightRepository flightRepository;
    private StubHotelRepository hotelRepository;

    @BeforeEach
    void setUp() {
        selectionService = new SelectionService();

        seatMapRepository = new StubSeatMapRepository();
        roomTypeOptionRepository = new StubRoomTypeOptionRepository();
        userPreferencesRepository = new StubUserPreferencesRepository();
        flightRepository = new StubFlightRepository();
        hotelRepository = new StubHotelRepository();

        ReflectionTestUtils.setField(selectionService, "seatMapRepository", seatMapRepository);
        ReflectionTestUtils.setField(selectionService, "roomTypeOptionRepository", roomTypeOptionRepository);
        ReflectionTestUtils.setField(selectionService, "userPreferencesRepository", userPreferencesRepository);
        ReflectionTestUtils.setField(selectionService, "flightRepository", flightRepository);
        ReflectionTestUtils.setField(selectionService, "hotelRepository", hotelRepository);

        Flight f = new Flight();
        f.setId("FL-TEST-1");
        f.setFlightName("IndiGo 6E-202");
        f.setAircraft("Boeing 737-800");
        f.setAvailableSeats(50);
        flightRepository.save(f);

        Hotel h = new Hotel();
        h.setId("HT-TEST-1");
        h.setHotelName("Grand Hyatt Resort");
        h.setAvailableRooms(10);
        h.setRoomType("Standard Luxury");
        hotelRepository.save(h);
    }

    @Test
    @DisplayName("Generate Dynamic Seat Map - 12 Rows x 6 Cols = 72 Available Seats with Correct Tiers")
    void testGetSeatMapForFlight_GeneratesAllSeatsAvailable() {
        SeatMap map = selectionService.getSeatMapForFlight("FL-TEST-1");

        assertNotNull(map);
        assertEquals("FL-TEST-1", map.getFlightId());
        assertEquals("Boeing 737-800", map.getAircraftType());
        assertEquals(72, map.getSeats().size());

        // Verify Row 1 Window seat has extra legroom
        SeatItem seat1A = map.getSeats().stream().filter(s -> "1A".equals(s.getSeatNo())).findFirst().orElse(null);
        assertNotNull(seat1A);
        assertEquals("AVAILABLE", seat1A.getStatus());
        assertEquals("WINDOW_EXTRA_LEGROOM", seat1A.getTier());
        assertEquals(850.0, seat1A.getPriceAddon());

        // Verify Row 6 Window Exit row seat
        SeatItem seat6A = map.getSeats().stream().filter(s -> "6A".equals(s.getSeatNo())).findFirst().orElse(null);
        assertNotNull(seat6A);
        assertEquals("AVAILABLE", seat6A.getStatus());
        assertEquals("WINDOW_EXIT_ROW", seat6A.getTier());
        assertEquals(650.0, seat6A.getPriceAddon());
    }

    @Test
    @DisplayName("Reserve Seat - Successfully sets status to OCCUPIED")
    void testReserveSeat_Success() {
        SeatMap updated = selectionService.reserveSeat("FL-TEST-1", "1A", "USR-101");

        assertNotNull(updated);
        SeatItem seat1A = updated.getSeats().stream().filter(s -> "1A".equals(s.getSeatNo())).findFirst().orElse(null);
        assertNotNull(seat1A);
        assertEquals("OCCUPIED", seat1A.getStatus());
    }

    @Test
    @DisplayName("Reserve Seat - Already occupied throws SeatUnavailableException")
    void testReserveSeat_AlreadyOccupied_ThrowsException() {
        selectionService.reserveSeat("FL-TEST-1", "1A", "USR-101");

        assertThrows(SeatUnavailableException.class, () -> {
            selectionService.reserveSeat("FL-TEST-1", "1A", "USR-202");
        });
    }

    @Test
    @DisplayName("Reserve Seat - Non-existent seat throws IllegalArgumentException")
    void testReserveSeat_NonExistentSeat_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            selectionService.reserveSeat("FL-TEST-1", "99Z", "USR-101");
        });
    }

    @Test
    @DisplayName("Release Seat - Successfully resets status to AVAILABLE")
    void testReleaseSeat_Success() {
        selectionService.reserveSeat("FL-TEST-1", "2B", "USR-101");
        SeatMap released = selectionService.releaseSeat("FL-TEST-1", "2B");

        assertNotNull(released);
        SeatItem seat2B = released.getSeats().stream().filter(s -> "2B".equals(s.getSeatNo())).findFirst().orElse(null);
        assertNotNull(seat2B);
        assertEquals("AVAILABLE", seat2B.getStatus());
    }

    @Test
    @DisplayName("Hotel Room Options - Generates 4 distinct tiers with upselling pricing")
    void testGetRoomOptionsForHotel_GeneratesFourDistinctTiersWithUpselling() {
        List<RoomTypeOption> options = selectionService.getRoomOptionsForHotel("HT-TEST-1");

        assertNotNull(options);
        assertEquals(4, options.size());

        // Option 1: Standard Room (+₹0)
        RoomTypeOption opt1 = options.get(0);
        assertEquals(0.0, opt1.getPriceUpgradeAddon());
        assertFalse(opt1.isPopularUpsell());

        // Option 2: Deluxe Balcony (+₹1,200, popular upsell)
        RoomTypeOption opt2 = options.get(1);
        assertEquals(1200.0, opt2.getPriceUpgradeAddon());
        assertTrue(opt2.isPopularUpsell());
        assertTrue(opt2.getRoomTypeName().contains("Deluxe"));

        // Option 3: Executive Suite (+₹2,800)
        RoomTypeOption opt3 = options.get(2);
        assertEquals(2800.0, opt3.getPriceUpgradeAddon());
        assertTrue(opt3.getRoomTypeName().contains("Executive"));

        // Option 4: Presidential Suite (+₹5,500)
        RoomTypeOption opt4 = options.get(3);
        assertEquals(5500.0, opt4.getPriceUpgradeAddon());
        assertTrue(opt4.getRoomTypeName().contains("Presidential"));

        // Verify each room has distinct 3D configurations and realistic volumetric furniture objects
        for (RoomTypeOption opt : options) {
            assertNotNull(opt.getRoom3dConfig(), "Room " + opt.getRoomTypeName() + " must have 3D config");
            assertNotNull(opt.getRoom3dConfig().getDimensions());
            assertFalse(opt.getRoom3dConfig().getFurniture().isEmpty(), "Must contain 3D furniture objects");
            assertFalse(opt.getRoom3dConfig().getHotspots().isEmpty(), "Must contain 3D inspection hotspots");
        }

        // Standard room has Oak Hardwood & Queen Bed
        assertEquals("STANDARD_CLASSIC", opt1.getRoom3dConfig().getRoomModelType());
        assertEquals("OAK_HARDWOOD", opt1.getRoom3dConfig().getFloorMaterial());

        // Deluxe Balcony has Herringbone Walnut & Balcony Glass Doors
        assertEquals("DELUXE_BALCONY", opt2.getRoom3dConfig().getRoomModelType());
        assertEquals("OCEAN_BALCONY", opt2.getRoom3dConfig().getViewScene());
        assertTrue(opt2.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "Private Balcony".equals(f.getAmenityLinked())));

        // Executive Suite has Soaking Jacuzzi & Skyline corner glass
        assertEquals("EXECUTIVE_PANORAMIC", opt3.getRoom3dConfig().getRoomModelType());
        assertTrue(opt3.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "Soaking Jacuzzi".equals(f.getAmenityLinked())));

        // Presidential Penthouse has Carrara Marble, Canopy Bed, and Dining Salon
        assertEquals("PRESIDENTIAL_ROYAL", opt4.getRoom3dConfig().getRoomModelType());
        assertEquals("ITALIAN_CARRARA_MARBLE", opt4.getRoom3dConfig().getFloorMaterial());
        assertTrue(opt4.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "Chesterfield Parlor".equals(f.getAmenityLinked())));
    }

    @Test
    @DisplayName("Showcase 3D Rooms - Returns 4 curated showcase rooms with authentic distinct 3D furniture models")
    void testGetFeaturedShowcaseRooms_GeneratesDistinct3dArchitectures() {
        List<RoomTypeOption> showcase = selectionService.getFeaturedShowcaseRooms();
        assertNotNull(showcase);
        assertEquals(4, showcase.size());

        RoomTypeOption classic = showcase.get(0);
        RoomTypeOption deluxe = showcase.get(1);
        RoomTypeOption exec = showcase.get(2);
        RoomTypeOption pres = showcase.get(3);

        // Verify distinct floor materials
        assertNotEquals(classic.getRoom3dConfig().getFloorMaterial(), pres.getRoom3dConfig().getFloorMaterial());
        assertNotEquals(deluxe.getRoom3dConfig().getFloorMaterial(), pres.getRoom3dConfig().getFloorMaterial());

        // Verify distinct room dimensions
        assertTrue(pres.getRoom3dConfig().getDimensions().getWidth() > exec.getRoom3dConfig().getDimensions().getWidth());
        assertTrue(exec.getRoom3dConfig().getDimensions().getWidth() > deluxe.getRoom3dConfig().getDimensions().getWidth());
        assertTrue(deluxe.getRoom3dConfig().getDimensions().getWidth() > classic.getRoom3dConfig().getDimensions().getWidth());

        // Verify presence of true 3D furniture objects like bed, table, window, desk
        assertTrue(classic.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "BED".equals(f.getCategory())));
        assertTrue(classic.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "DESK".equals(f.getCategory())));
        assertTrue(classic.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "WINDOW_BALCONY".equals(f.getCategory())));

        assertTrue(deluxe.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "SEATING".equals(f.getCategory())));
        assertTrue(exec.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "BATH".equals(f.getCategory())));
        assertTrue(pres.getRoom3dConfig().getFurniture().stream().anyMatch(f -> "STORAGE".equals(f.getCategory())));
    }

    @Test
    @DisplayName("Reserve & Release Room Option - Decrements and increments room counts")
    void testReserveAndReleaseRoomOption_Success() {
        List<RoomTypeOption> options = selectionService.getRoomOptionsForHotel("HT-TEST-1");
        RoomTypeOption deluxe = options.get(1);
        int initialRooms = deluxe.getAvailableRooms();

        RoomTypeOption reserved = selectionService.reserveRoomOption("HT-TEST-1", deluxe.getRoomTypeName(), 1);
        assertNotNull(reserved);
        assertEquals(initialRooms - 1, reserved.getAvailableRooms());

        RoomTypeOption released = selectionService.releaseRoomOption("HT-TEST-1", deluxe.getRoomTypeName(), 1);
        assertNotNull(released);
        assertEquals(initialRooms, released.getAvailableRooms());
    }

    @Test
    @DisplayName("Preferences - Save and retrieve user preferences")
    void testSaveAndGetUserPreferences_Success() {
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId("USR-777");
        prefs.setUserEmail("traveler@example.com");
        prefs.setPreferredSeatType("Extra Legroom");
        prefs.setPreferredSeatNo("1F");
        prefs.setPreferredRoomType("Executive Panoramic Suite");

        UserPreferences saved = selectionService.saveUserPreferences(prefs);
        assertNotNull(saved);
        assertEquals("1F", saved.getPreferredSeatNo());

        UserPreferences retrieved = selectionService.getUserPreferences("USR-777");
        assertNotNull(retrieved);
        assertEquals("1F", retrieved.getPreferredSeatNo());
        assertEquals("Executive Panoramic Suite", retrieved.getPreferredRoomType());
    }

    @Test
    @DisplayName("Preferences - Unconfigured user gets clean preferences with null values")
    void testGetUserPreferences_CleanUnconfiguredForNewUser() {
        UserPreferences clean = selectionService.getUserPreferences("USR-BRAND-NEW");

        assertNotNull(clean);
        assertEquals("USR-BRAND-NEW", clean.getUserId());
        assertNull(clean.getPreferredSeatNo());
        assertNull(clean.getPreferredRoomType());
    }

    @Test
    @DisplayName("Real-Time SSE Client Registration and Event Broadcast")
    void testSseRegistrationAndBroadcast() {
        SseEmitter emitter = selectionService.registerSseClient();
        assertNotNull(emitter);

        assertDoesNotThrow(() -> {
            selectionService.broadcastSeatUpdate("FL-TEST-1", "3A", "OCCUPIED");
            selectionService.broadcastRoomUpdate("HT-TEST-1", "Deluxe Balcony Room", 3);
            selectionService.sendHeartbeat();
        });
    }

    // ========================================================
    // Stub Repositories for Standalone In-Memory Execution
    // ========================================================

    public static class StubSeatMapRepository implements SeatMapRepository {
        private final Map<String, SeatMap> storage = new HashMap<>();

        @Override
        public Optional<SeatMap> findByFlightId(String flightId) {
            return storage.values().stream().filter(m -> flightId.equalsIgnoreCase(m.getFlightId())).findFirst();
        }

        @Override
        public <S extends SeatMap> S save(S entity) {
            if (entity.getId() == null) entity.setId(UUID.randomUUID().toString());
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public <S extends SeatMap> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return (List<S>) entities; }
        @Override public Optional<SeatMap> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<SeatMap> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<SeatMap> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(SeatMap entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends SeatMap> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<SeatMap> findAll(Sort sort) { return findAll(); }
        @Override public Page<SeatMap> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends SeatMap> S insert(S entity) { return save(entity); }
        @Override public <S extends SeatMap> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends SeatMap> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends SeatMap> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends SeatMap> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends SeatMap> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends SeatMap> long count(Example<S> example) { return 0; }
        @Override public <S extends SeatMap> boolean exists(Example<S> example) { return false; }
        @Override public <S extends SeatMap, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubRoomTypeOptionRepository implements RoomTypeOptionRepository {
        private final Map<String, RoomTypeOption> storage = new HashMap<>();

        @Override
        public List<RoomTypeOption> findByHotelId(String hotelId) {
            List<RoomTypeOption> result = new ArrayList<>();
            for (RoomTypeOption r : storage.values()) {
                if (hotelId.equalsIgnoreCase(r.getHotelId())) result.add(r);
            }
            return result;
        }

        @Override
        public <S extends RoomTypeOption> S save(S entity) {
            if (entity.getId() == null) entity.setId(UUID.randomUUID().toString());
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public <S extends RoomTypeOption> List<S> saveAll(Iterable<S> entities) {
            List<S> list = new ArrayList<>();
            for (S e : entities) list.add(save(e));
            return list;
        }

        @Override public Optional<RoomTypeOption> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<RoomTypeOption> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<RoomTypeOption> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(RoomTypeOption entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends RoomTypeOption> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<RoomTypeOption> findAll(Sort sort) { return findAll(); }
        @Override public Page<RoomTypeOption> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends RoomTypeOption> S insert(S entity) { return save(entity); }
        @Override public <S extends RoomTypeOption> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends RoomTypeOption> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends RoomTypeOption> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends RoomTypeOption> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends RoomTypeOption> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends RoomTypeOption> long count(Example<S> example) { return 0; }
        @Override public <S extends RoomTypeOption> boolean exists(Example<S> example) { return false; }
        @Override public <S extends RoomTypeOption, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubUserPreferencesRepository implements UserPreferencesRepository {
        private final Map<String, UserPreferences> storage = new HashMap<>();

        @Override
        public Optional<UserPreferences> findByUserId(String userId) {
            return storage.values().stream().filter(p -> userId.equalsIgnoreCase(p.getUserId())).findFirst();
        }

        @Override
        public <S extends UserPreferences> S save(S entity) {
            if (entity.getId() == null) entity.setId(UUID.randomUUID().toString());
            storage.put(entity.getId(), entity);
            return entity;
        }

        @Override public <S extends UserPreferences> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return (List<S>) entities; }
        @Override public Optional<UserPreferences> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<UserPreferences> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<UserPreferences> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(UserPreferences entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends UserPreferences> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<UserPreferences> findAll(Sort sort) { return findAll(); }
        @Override public Page<UserPreferences> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends UserPreferences> S insert(S entity) { return save(entity); }
        @Override public <S extends UserPreferences> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends UserPreferences> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends UserPreferences> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends UserPreferences> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends UserPreferences> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends UserPreferences> long count(Example<S> example) { return 0; }
        @Override public <S extends UserPreferences> boolean exists(Example<S> example) { return false; }
        @Override public <S extends UserPreferences, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubFlightRepository implements FlightRepository {
        private final Map<String, Flight> storage = new HashMap<>();

        @Override public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) { return Collections.emptyList(); }
        @Override public List<Flight> findByFromContainingIgnoreCase(String from) { return Collections.emptyList(); }
        @Override public List<Flight> findByToContainingIgnoreCase(String to) { return Collections.emptyList(); }

        @Override public Optional<Flight> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public <S extends Flight> S save(S entity) { storage.put(entity.getId(), entity); return entity; }
        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return (List<S>) entities; }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<Flight> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Flight entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Flight> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Flight> findAll(Sort sort) { return findAll(); }
        @Override public Page<Flight> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends Flight> S insert(S entity) { return save(entity); }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    public static class StubHotelRepository implements HotelRepository {
        private final Map<String, Hotel> storage = new HashMap<>();

        @Override public List<Hotel> findByLocationContainingIgnoreCase(String location) { return Collections.emptyList(); }
        @Override public List<Hotel> findByHotelNameContainingIgnoreCase(String hotelName) { return Collections.emptyList(); }

        @Override public Optional<Hotel> findById(String s) { return Optional.ofNullable(storage.get(s)); }
        @Override public <S extends Hotel> S save(S entity) { storage.put(entity.getId(), entity); return entity; }
        @Override public <S extends Hotel> List<S> saveAll(Iterable<S> entities) { entities.forEach(this::save); return (List<S>) entities; }
        @Override public boolean existsById(String s) { return storage.containsKey(s); }
        @Override public List<Hotel> findAll() { return new ArrayList<>(storage.values()); }
        @Override public List<Hotel> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public long count() { return storage.size(); }
        @Override public void deleteById(String s) { storage.remove(s); }
        @Override public void delete(Hotel entity) { storage.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Hotel> entities) {}
        @Override public void deleteAll() { storage.clear(); }
        @Override public List<Hotel> findAll(Sort sort) { return findAll(); }
        @Override public Page<Hotel> findAll(Pageable pageable) { return Page.empty(); }
        @Override public <S extends Hotel> S insert(S entity) { return save(entity); }
        @Override public <S extends Hotel> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Hotel> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Page<S> findAll(Example<S> example, Pageable pageable) { return Page.empty(); }
        @Override public <S extends Hotel> long count(Example<S> example) { return 0; }
        @Override public <S extends Hotel> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Hotel, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }
}
