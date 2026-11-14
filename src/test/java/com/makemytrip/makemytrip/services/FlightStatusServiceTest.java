package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.Users;
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

import static org.junit.jupiter.api.Assertions.*;

class FlightStatusServiceTest {

    private FlightStatusService flightStatusService;
    private TestFlightStatusRepository testRepo;
    private TestUserRepository testUserRepo;

    private FlightStatus flight1;
    private FlightStatus flight2;
    private FlightStatus overnightFlight;

    @BeforeEach
    void setUp() {
        flightStatusService = new FlightStatusService();
        testRepo = new TestFlightStatusRepository();
        testUserRepo = new TestUserRepository();

        ReflectionTestUtils.setField(flightStatusService, "flightStatusRepository", testRepo);
        ReflectionTestUtils.setField(flightStatusService, "userRepository", testUserRepo);

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
    @DisplayName("TriggerRandomSimulation - Transitions flight status to BOARDING or DELAYED")
    void testTriggerRandomSimulation() {
        FlightStatus result = flightStatusService.triggerRandomSimulation();

        assertNotNull(result);
        assertNotNull(result.getStatus());
        assertTrue(Arrays.asList("ON_TIME", "DELAYED", "BOARDING", "IN_FLIGHT", "LANDED").contains(result.getStatus()));
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

        @Override public <S extends FlightStatus> List<S> saveAll(Iterable<S> entities) { return null; }
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
}

