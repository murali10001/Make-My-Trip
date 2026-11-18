package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class FlightStatusServiceTest {

    private FlightStatusService flightStatusService;
    private TestFlightStatusRepository testRepo;
    private TestUserRepository testUserRepo;
    private StubFlightRepository testFlightRepo;
    private TestNotificationService testNotificationService;

    private FlightStatus flight1;
    private FlightStatus flight2;
    private FlightStatus overnightFlight;

    @BeforeEach
    void setUp() {
        flightStatusService = new FlightStatusService();
        testRepo = new TestFlightStatusRepository();
        testUserRepo = new TestUserRepository();
        testFlightRepo = new StubFlightRepository();
        testNotificationService = new TestNotificationService();

        ReflectionTestUtils.setField(flightStatusService, "flightStatusRepository", testRepo);
        ReflectionTestUtils.setField(flightStatusService, "userRepository", testUserRepo);
        ReflectionTestUtils.setField(flightStatusService, "flightRepository", testFlightRepo);
        ReflectionTestUtils.setField(flightStatusService, "notificationService", testNotificationService);

        flight1 = new FlightStatus("1", "AI-101", "Air India", "DEL", "BOM",
                "10:00", "12:00", "10:00", "12:00", "ON_TIME",
                "Operating on schedule", "Gate 4", "T3", 120);

        flight2 = new FlightStatus("2", "6E-202", "IndiGo", "BOM", "BLR",
                "14:00", "15:30", "14:30", "16:00", "DELAYED",
                "Weather delay", "Gate 12", "T1", 90);

        overnightFlight = new FlightStatus("3", "AI-999", "Air India", "DEL", "SIN",
                "11:00 PM", "01:30 AM", "11:00 PM", "01:30 AM", "ON_TIME",
                "Operating on schedule", "Gate 7", "T3", 150);

        testRepo.savedFlights.add(flight1);
        testRepo.savedFlights.add(flight2);
        testRepo.savedFlights.add(overnightFlight);
    }

    @Test
    @DisplayName("GetAllFlights - Returns filtered flight list by query and status")
    void testGetAllFlights_Filtered() {
        List<FlightStatus> results = flightStatusService.getAllFlights("Air India", "ON_TIME");

        assertEquals(2, results.size());
        assertTrue(results.stream().anyMatch(f -> "AI-101".equals(f.getFlightNumber())));
    }

    @Test
    @DisplayName("GetFlightByNumber - Returns Optional of FlightStatus when found")
    void testGetFlightByNumber_Found() {
        Optional<FlightStatus> result = flightStatusService.getFlightByNumber("AI-101");

        assertTrue(result.isPresent());
        assertEquals("Air India", result.get().getAirline());
    }

    @Test
    @DisplayName("GetFlightByNumber - Returns empty Optional for null/blank flight number")
    void testGetFlightByNumber_Blank() {
        Optional<FlightStatus> result = flightStatusService.getFlightByNumber("  ");
        assertFalse(result.isPresent());
    }

    @Test
    @DisplayName("GetTrackedFlights - Returns list of tracked flights")
    void testGetTrackedFlights_Success() {
        List<FlightStatus> tracked = flightStatusService.getTrackedFlights(Arrays.asList("AI-101", "6E-202"));

        assertEquals(2, tracked.size());
    }

    @Test
    @DisplayName("UpdateFlightStatus - Successfully updates status and fields")
    void testUpdateFlightStatus_Success() {
        FlightStatus updated = flightStatusService.updateFlightStatus(
                "AI-101", "DELAYED", "Foggy conditions", "11:00", "13:00", "Gate 9", "T3", 150
        );

        assertNotNull(updated);
        assertEquals("DELAYED", updated.getStatus());
        assertEquals("Foggy conditions", updated.getDelayReason());
        assertEquals("Gate 9", updated.getGate());
        assertEquals(150, updated.getEstimatedArrivalMinutes());
    }

    @Test
    @DisplayName("TriggerRandomSimulation - Transitions flight status to BOARDING or DELAYED or CANCELLED")
    void testTriggerRandomSimulation() {
        FlightStatus result = flightStatusService.triggerRandomSimulation();

        assertNotNull(result);
        assertNotNull(result.getStatus());
        assertTrue(Arrays.asList("ON_TIME", "DELAYED", "BOARDING", "IN_FLIGHT", "LANDED", "CANCELLED").contains(result.getStatus()));
    }

    @Test
    @DisplayName("ColdStartSeeding - Auto-seeds from FlightRepository when FlightStatusRepository is empty")
    void testColdStartSeeding_WhenCatalogEmpty() {
        testRepo.savedFlights.clear();
        assertEquals(0, testRepo.count());

        Flight catFlight1 = new Flight();
        catFlight1.setId("CAT-1");
        catFlight1.setFlightNo("6E-555");
        catFlight1.setAirline("IndiGo");
        catFlight1.setFrom("DEL");
        catFlight1.setTo("BLR");
        catFlight1.setDepartureTime("08:00 AM");
        catFlight1.setArrivalTime("10:45 AM");
        testFlightRepo.save(catFlight1);

        Flight catFlight2 = new Flight();
        catFlight2.setId("CAT-2");
        catFlight2.setFlightNo("AI-777");
        catFlight2.setAirline("Air India");
        catFlight2.setFrom("BOM");
        catFlight2.setTo("GOI");
        catFlight2.setDepartureTime("11:30 AM");
        catFlight2.setArrivalTime("01:00 PM");
        testFlightRepo.save(catFlight2);

        List<FlightStatus> all = flightStatusService.getAllFlights(null, null);

        assertEquals(2, all.size());
        assertTrue(all.stream().anyMatch(f -> "6E-555".equals(f.getFlightNumber())));
        assertTrue(all.stream().anyMatch(f -> "AI-777".equals(f.getFlightNumber())));
        assertEquals("ON_TIME", all.get(0).getStatus());
    }

    @Test
    @DisplayName("ColdStartSeeding - Does not duplicate records when catalog already populated")
    void testColdStartSeeding_WhenAlreadyPopulated() {
        assertEquals(3, testRepo.count());

        Flight catFlight = new Flight();
        catFlight.setId("CAT-NEW");
        catFlight.setFlightNo("UK-888");
        testFlightRepo.save(catFlight);

        flightStatusService.seedFromFlightCatalog();

        assertEquals(3, testRepo.count(), "Should not reseed when status collection has entries");
    }

    @Test
    @DisplayName("TriggerRandomSimulation - Realistic CANCELLED status simulation")
    void testTriggerRandomSimulation_CancellationSimulation() {
        boolean cancelledGenerated = false;
        for (int i = 0; i < 200; i++) {
            FlightStatus res = flightStatusService.triggerRandomSimulation();
            if ("CANCELLED".equals(res.getStatus())) {
                cancelledGenerated = true;
                assertEquals(0, res.getEstimatedArrivalMinutes());
                assertNotNull(res.getDelayReason());
                assertTrue(res.getDelayReason().length() > 5);
                break;
            }
        }
        assertTrue(cancelledGenerated, "CANCELLED status should be probabilistically reachable in simulation");
    }

    @Test
    @DisplayName("UpdateFlightStatus - Explicit CANCELLED status update sets 0 arrival minutes and reason")
    void testUpdateFlightStatus_ExplicitCancellation() {
        FlightStatus updated = flightStatusService.updateFlightStatus(
                "AI-101", "CANCELLED", "Technical maintenance inspection required", null, null, null, null, null
        );

        assertNotNull(updated);
        assertEquals("CANCELLED", updated.getStatus());
        assertEquals(0, updated.getEstimatedArrivalMinutes());
        assertEquals("Technical maintenance inspection required", updated.getDelayReason());
    }

    @Test
    @DisplayName("NotifyInterestedUsers - Sends cancellation notification to tracked users")
    void testNotifyInterestedUsers_OnCancellation() {
        Users user = new Users();
        user.setId("USR-NOTIF");
        user.setTrackedFlights(new ArrayList<>(List.of("AI-101")));
        testUserRepo.savedUsers.put("USR-NOTIF", user);

        flightStatusService.updateFlightStatus(
                "AI-101", "CANCELLED", "Adverse weather conditions & runway closure", null, null, null, null, null
        );

        assertFalse(testNotificationService.createdNotifications.isEmpty());
        assertTrue(testNotificationService.createdNotifications.stream().anyMatch(n -> n.contains("USR-NOTIF") && n.contains("Cancellation Alert")));
    }

    @Test
    @DisplayName("AlignFlightWithRealTime - Correctly handles overnight cross-midnight flight without premature LANDED")
    void testAlignFlightWithRealTime_OvernightFlight() {

        LocalTime testTime = LocalTime.of(23, 15);
        boolean changed = flightStatusService.alignFlightWithRealTime(overnightFlight, testTime);

        assertTrue(changed);
        assertEquals("IN_FLIGHT", overnightFlight.getStatus());
        assertTrue(overnightFlight.getEstimatedArrivalMinutes() > 0, "ETA should be positive");
        assertEquals(135, overnightFlight.getEstimatedArrivalMinutes(), "15 minutes elapsed into 150m flight = 135m remaining");
    }

    @Test
    @DisplayName("MinutesToTimeString - Formats correctly across 12-hour boundary")
    void testMinutesToTimeString() {
        assertEquals("10:30 AM", flightStatusService.minutesToTimeString(630));
        assertEquals("12:00 PM", flightStatusService.minutesToTimeString(720));
        assertEquals("01:15 PM", flightStatusService.minutesToTimeString(795));
        assertEquals("11:45 PM", flightStatusService.minutesToTimeString(1425));
        assertEquals("12:00 AM", flightStatusService.minutesToTimeString(0));
    }

    @Test
    @DisplayName("UserTrackedFlights - Toggles flight in user document")
    void testToggleUserTrackFlight() {
        Users user = new Users();
        user.setId("USR-101");
        user.setTrackedFlights(new ArrayList<>(List.of("AI-101")));
        testUserRepo.savedUsers.put("USR-101", user);

        List<String> updated = flightStatusService.toggleUserTrackFlight("USR-101", "6E-202");
        assertTrue(updated.contains("6E-202"));
        assertTrue(updated.contains("AI-101"));

        List<String> removed = flightStatusService.toggleUserTrackFlight("USR-101", "AI-101");
        assertFalse(removed.contains("AI-101"));
        assertTrue(removed.contains("6E-202"));
    }

    static class TestFlightStatusRepository implements FlightStatusRepository {
        List<FlightStatus> savedFlights = new ArrayList<>();

        @Override
        public Optional<FlightStatus> findByFlightNumberIgnoreCase(String flightNumber) {
            return savedFlights.stream().filter(f -> f.getFlightNumber().equalsIgnoreCase(flightNumber)).findFirst();
        }

        @Override
        public List<FlightStatus> findByFlightNumberIn(List<String> flightNumbers) {
            List<FlightStatus> res = new ArrayList<>();
            for (FlightStatus f : savedFlights) {
                if (flightNumbers.contains(f.getFlightNumber())) res.add(f);
            }
            return res;
        }

        @Override
        public List<FlightStatus> findByStatusIn(List<String> statuses) {
            return Collections.emptyList();
        }

        @Override
        public <S extends FlightStatus> S save(S entity) {
            savedFlights.removeIf(f -> f.getFlightNumber().equalsIgnoreCase(entity.getFlightNumber()));
            savedFlights.add(entity);
            return entity;
        }

        @Override
        public List<FlightStatus> findAll() {
            return new ArrayList<>(savedFlights);
        }

        @Override
        public <S extends FlightStatus> List<S> saveAll(Iterable<S> entities) {
            List<S> result = new ArrayList<>();
            for (S entity : entities) {
                save(entity);
                result.add(entity);
            }
            return result;
        }
        @Override public Optional<FlightStatus> findById(String s) { return Optional.empty(); }
        @Override public boolean existsById(String s) { return false; }
        @Override public List<FlightStatus> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return savedFlights.size(); }
        @Override public void deleteById(String s) {}
        @Override public void delete(FlightStatus entity) {}
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends FlightStatus> entities) {}
        @Override public void deleteAll() {}
        @Override public List<FlightStatus> findAll(Sort sort) { return null; }
        @Override public Page<FlightStatus> findAll(Pageable pageable) { return null; }
        @Override public <S extends FlightStatus> S insert(S entity) { return null; }
        @Override public <S extends FlightStatus> List<S> insert(Iterable<S> entities) { return null; }
        @Override public <S extends FlightStatus> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends FlightStatus> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends FlightStatus> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends FlightStatus> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends FlightStatus> long count(Example<S> example) { return 0; }
        @Override public <S extends FlightStatus> boolean exists(Example<S> example) { return false; }
        @Override public <S extends FlightStatus, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    static class TestUserRepository implements UserRepository {
        Map<String, Users> savedUsers = new HashMap<>();

        @Override
        public Users findByEmail(String email) {
            return savedUsers.values().stream().filter(u -> email.equalsIgnoreCase(u.getEmail())).findFirst().orElse(null);
        }

        @Override
        public Optional<Users> findById(String s) {
            return Optional.ofNullable(savedUsers.get(s));
        }

        @Override
        public <S extends Users> S save(S entity) {
            savedUsers.put(entity.getId(), entity);
            return entity;
        }

        @Override public <S extends Users> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(String s) { return false; }
        @Override public List<Users> findAll() { return new ArrayList<>(savedUsers.values()); }
        @Override public List<Users> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return 0; }
        @Override public void deleteById(String s) {}
        @Override public void delete(Users entity) {}
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Users> entities) {}
        @Override public void deleteAll() {}
        @Override public List<Users> findAll(Sort sort) { return null; }
        @Override public Page<Users> findAll(Pageable pageable) { return null; }
        @Override public <S extends Users> S insert(S entity) { return null; }
        @Override public <S extends Users> List<S> insert(Iterable<S> entities) { return null; }
        @Override public <S extends Users> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Users> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends Users> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends Users> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Users> long count(Example<S> example) { return 0; }
        @Override public <S extends Users> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Users, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    static class StubFlightRepository implements FlightRepository {
        Map<String, Flight> flightMap = new HashMap<>();

        @Override
        public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) {
            return flightMap.values().stream()
                    .filter(f -> f.getFrom() != null && f.getFrom().toLowerCase().contains(from.toLowerCase())
                            && f.getTo() != null && f.getTo().toLowerCase().contains(to.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Flight> findByFromContainingIgnoreCase(String from) {
            return flightMap.values().stream()
                    .filter(f -> f.getFrom() != null && f.getFrom().toLowerCase().contains(from.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public List<Flight> findByToContainingIgnoreCase(String to) {
            return flightMap.values().stream()
                    .filter(f -> f.getTo() != null && f.getTo().toLowerCase().contains(to.toLowerCase()))
                    .collect(Collectors.toList());
        }

        @Override
        public <S extends Flight> S save(S entity) {
            String id = entity.getId() != null ? entity.getId() : UUID.randomUUID().toString();
            entity.setId(id);
            flightMap.put(id, entity);
            return entity;
        }

        @Override
        public List<Flight> findAll() {
            return new ArrayList<>(flightMap.values());
        }

        @Override
        public Optional<Flight> findById(String s) {
            return Optional.ofNullable(flightMap.get(s));
        }

        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { return null; }
        @Override public boolean existsById(String s) { return flightMap.containsKey(s); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return null; }
        @Override public long count() { return flightMap.size(); }
        @Override public void deleteById(String s) { flightMap.remove(s); }
        @Override public void delete(Flight entity) {}
        @Override public void deleteAllById(Iterable<? extends String> strings) {}
        @Override public void deleteAll(Iterable<? extends Flight> entities) {}
        @Override public void deleteAll() { flightMap.clear(); }
        @Override public List<Flight> findAll(Sort sort) { return null; }
        @Override public Page<Flight> findAll(Pageable pageable) { return null; }
        @Override public <S extends Flight> S insert(S entity) { return null; }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return null; }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return null; }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return null; }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
    }

    static class TestNotificationService extends NotificationService {
        List<String> createdNotifications = new ArrayList<>();

        @Override
        public Notification createNotification(String userId, String title, String desc, String type) {
            createdNotifications.add(userId + "::" + title + "::" + desc);
            return new Notification("N-TEST", userId, title, desc, "now", type);
        }
    }
}

