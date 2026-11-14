package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.CancellationNotAllowedException;
import com.makemytrip.makemytrip.exceptions.RefundNotFoundException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.RefundRequest;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.RefundRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class RefundServiceTest {

    private RefundService refundService;
    private StubUserRepository userRepository;
    private StubRefundRepository refundRepository;
    private StubFlightRepository flightRepository;
    private StubHotelRepository hotelRepository;

    private Users testUser;
    private Booking flightBooking;
    private Booking hotelBooking;
    private Flight testFlight;
    private Hotel testHotel;

    @BeforeEach
    void setUp() {
        refundService = new RefundService();

        userRepository = new StubUserRepository();
        refundRepository = new StubRefundRepository();
        flightRepository = new StubFlightRepository();
        hotelRepository = new StubHotelRepository();

        ReflectionTestUtils.setField(refundService, "userRepository", userRepository);
        ReflectionTestUtils.setField(refundService, "refundRepository", refundRepository);
        ReflectionTestUtils.setField(refundService, "flightRepository", flightRepository);
        ReflectionTestUtils.setField(refundService, "hotelRepository", hotelRepository);

        testUser = new Users();
        testUser.setId("USR-001");
        testUser.setEmail("tester@makemytrip.com");
        testUser.setBookings(new ArrayList<>());

        flightBooking = new Booking();
        flightBooking.setBookingId("BK-FL-12345");
        flightBooking.setType("Flight");
        flightBooking.setDate(LocalDate.now().toString());
        flightBooking.setBookingTimestamp(LocalDateTime.now().minusHours(2).toString());
        flightBooking.setQuantity(2);
        flightBooking.setTotalPrice(10000.0);
        flightBooking.setTargetId("FL-101");
        flightBooking.setStatus("CONFIRMED");

        hotelBooking = new Booking();
        hotelBooking.setBookingId("BK-HT-67890");
        hotelBooking.setType("Hotel");
        hotelBooking.setDate(LocalDate.now().minusDays(5).toString());
        hotelBooking.setBookingTimestamp(LocalDateTime.now().minusHours(72).toString());
        hotelBooking.setQuantity(1);
        hotelBooking.setTotalPrice(6000.0);
        hotelBooking.setTargetId("HT-202");
        hotelBooking.setStatus("CONFIRMED");

        testUser.getBookings().add(flightBooking);
        testUser.getBookings().add(hotelBooking);
        userRepository.save(testUser);

        testFlight = new Flight();
        testFlight.setId("FL-101");
        testFlight.setFlightName("Air India");
        testFlight.setAvailableSeats(50);
        flightRepository.save(testFlight);

        testHotel = new Hotel();
        testHotel.setId("HT-202");
        testHotel.setHotelName("Grand Palace");
        testHotel.setAvailableRooms(10);
        hotelRepository.save(testHotel);
    }

    @Test
    @DisplayName("Calculate Refund Preview - Within 24 Hours applies 50% Refund Policy")
    void testCalculateRefundPreview_Within24Hours_Applies50Percent() {
        Map<String, Object> preview = refundService.calculateRefundPreview("USR-001", "BK-FL-12345");

        assertNotNull(preview);
        assertEquals("BK-FL-12345", preview.get("bookingId"));
        assertEquals(50.0, preview.get("refundPercentage"));
        assertEquals(5000.0, preview.get("refundAmount"));
        assertEquals(5000.0, preview.get("deductionAmount"));
        assertTrue(preview.get("policyApplied").toString().contains("50% Refund"));
    }

    @Test
    @DisplayName("Calculate Refund Preview - After 24 Hours applies 80% Standard Policy")
    void testCalculateRefundPreview_After24Hours_Applies80Percent() {
        Map<String, Object> preview = refundService.calculateRefundPreview("USR-001", "BK-HT-67890");

        assertNotNull(preview);
        assertEquals("BK-HT-67890", preview.get("bookingId"));
        assertEquals(80.0, preview.get("refundPercentage"));
        assertEquals(4800.0, preview.get("refundAmount"));
        assertEquals(1200.0, preview.get("deductionAmount"));
        assertTrue(preview.get("policyApplied").toString().contains("80% Refund"));
    }

    @Test
    @DisplayName("Calculate Refund Preview - Already Cancelled Booking Throws Exception")
    void testCalculateRefundPreview_AlreadyCancelled_ThrowsException() {
        flightBooking.setStatus("CANCELLED");
        userRepository.save(testUser);

        assertThrows(CancellationNotAllowedException.class, () ->
                refundService.calculateRefundPreview("USR-001", "BK-FL-12345")
        );
    }

    @Test
    @DisplayName("Calculate Refund Preview - User Not Found Throws Exception")
    void testCalculateRefundPreview_UserNotFound_ThrowsException() {
        assertThrows(UserNotFoundException.class, () ->
                refundService.calculateRefundPreview("NON_EXISTENT", "BK-FL-12345")
        );
    }

    @Test
    @DisplayName("Process Cancellation - Success restores Flight inventory and creates RefundRequest")
    void testProcessCancellation_Success_Flight() {
        RefundRequest refund = refundService.processCancellationAndRequestRefund(
                "USR-001", "BK-FL-12345", "Change of travel plans", "Trip rescheduled"
        );

        assertNotNull(refund);
        assertTrue(refund.getRefundId().startsWith("RF-"));
        assertEquals("BK-FL-12345", refund.getBookingId());
        assertEquals("PENDING", refund.getStatus());
        assertEquals(5000.0, refund.getRefundAmount());
        assertEquals("CANCELLED", flightBooking.getStatus());
        assertEquals(52, testFlight.getAvailableSeats());

        assertTrue(refundRepository.findByRefundId(refund.getRefundId()).isPresent());
    }

    @Test
    @DisplayName("Process Cancellation - Success restores Hotel inventory")
    void testProcessCancellation_Success_Hotel() {
        RefundRequest refund = refundService.processCancellationAndRequestRefund(
                "USR-001", "BK-HT-67890", "Found cheaper rate elsewhere", null
        );

        assertNotNull(refund);
        assertEquals(11, testHotel.getAvailableRooms());
    }

    @Test
    @DisplayName("Process Cancellation - Blank Reason Throws IllegalArgumentException")
    void testProcessCancellation_BlankReason_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
                refundService.processCancellationAndRequestRefund("USR-001", "BK-FL-12345", "   ", "")
        );
    }

    @Test
    @DisplayName("Get Refund By RefundId - Found")
    void testGetRefundByRefundId_Found() {
        RefundRequest mockRequest = new RefundRequest();
        mockRequest.setRefundId("RF-112233");
        refundRepository.save(mockRequest);

        RefundRequest found = refundService.getRefundByRefundId("RF-112233");
        assertNotNull(found);
        assertEquals("RF-112233", found.getRefundId());
    }

    @Test
    @DisplayName("Get Refund By RefundId - Not Found Throws RefundNotFoundException")
    void testGetRefundByRefundId_NotFound() {
        assertThrows(RefundNotFoundException.class, () ->
                refundService.getRefundByRefundId("RF-INVALID")
        );
    }

    @Test
    @DisplayName("Update Refund Status - Transitions to PROCESSED and COMPLETED")
    void testUpdateRefundStatus_Transitions() {
        RefundRequest mockRequest = new RefundRequest();
        mockRequest.setRefundId("RF-999");
        mockRequest.setUserId("USR-001");
        mockRequest.setBookingId("BK-FL-12345");
        mockRequest.setStatus("PENDING");
        mockRequest.setRefundAmount(5000.0);
        refundRepository.save(mockRequest);

        RefundRequest processed = refundService.updateRefundStatus("RF-999", "PROCESSED");
        assertEquals("PROCESSED", processed.getStatus());
        assertEquals(2, processed.getCurrentStep());

        RefundRequest completed = refundService.updateRefundStatus("RF-999", "COMPLETED");
        assertEquals("COMPLETED", completed.getStatus());
        assertEquals(3, completed.getCurrentStep());
    }

    @Test
    @DisplayName("Get User Refunds - Returns List")
    void testGetUserRefunds() {
        RefundRequest r1 = new RefundRequest();
        r1.setRefundId("RF-1");
        r1.setUserId("USR-001");
        refundRepository.save(r1);

        List<RefundRequest> list = refundService.getUserRefunds("USR-001");
        assertEquals(1, list.size());
        assertEquals("RF-1", list.get(0).getRefundId());
    }

    static class StubUserRepository implements UserRepository {
        Map<String, Users> db = new HashMap<>();

        @Override public Users findByEmail(String email) {
            return db.values().stream().filter(u -> email != null && email.equalsIgnoreCase(u.getEmail())).findFirst().orElse(null);
        }
        @Override public <S extends Users> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Users> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<Users> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(Users entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends Users> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Users> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends Users> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends Users> S insert(S entity) { return save(entity); }
        @Override public <S extends Users> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Users> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Users> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Users> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Users> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Users> long count(Example<S> example) { return 0; }
        @Override public <S extends Users> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Users, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Users> findAll(Sort sort) { return findAll(); }
        @Override public Page<Users> findAll(Pageable pageable) { return null; }
    }

    static class StubRefundRepository implements RefundRepository {
        Map<String, RefundRequest> db = new HashMap<>();

        @Override public List<RefundRequest> findByUserId(String userId) {
            List<RefundRequest> res = new ArrayList<>();
            for (RefundRequest r : db.values()) {
                if (userId != null && userId.equalsIgnoreCase(r.getUserId())) res.add(r);
            }
            return res;
        }

        @Override public Optional<RefundRequest> findByRefundId(String refundId) {
            return db.values().stream().filter(r -> refundId != null && refundId.equalsIgnoreCase(r.getRefundId())).findFirst();
        }

        @Override public Optional<RefundRequest> findByBookingId(String bookingId) {
            return db.values().stream().filter(r -> bookingId != null && bookingId.equalsIgnoreCase(r.getBookingId())).findFirst();
        }

        @Override public List<RefundRequest> findByStatusIn(List<String> statuses) {
            List<RefundRequest> res = new ArrayList<>();
            for (RefundRequest r : db.values()) {
                if (r.getStatus() != null && statuses.contains(r.getStatus().toUpperCase())) res.add(r);
            }
            return res;
        }

        @Override public <S extends RefundRequest> S save(S entity) {
            String key = entity.getRefundId() != null ? entity.getRefundId() : UUID.randomUUID().toString();
            entity.setId(key);
            db.put(key, entity);
            return entity;
        }

        @Override public Optional<RefundRequest> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<RefundRequest> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(RefundRequest entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends RefundRequest> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<RefundRequest> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends RefundRequest> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends RefundRequest> S insert(S entity) { return save(entity); }
        @Override public <S extends RefundRequest> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends RefundRequest> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends RefundRequest> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends RefundRequest> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends RefundRequest> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends RefundRequest> long count(Example<S> example) { return 0; }
        @Override public <S extends RefundRequest> boolean exists(Example<S> example) { return false; }
        @Override public <S extends RefundRequest, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<RefundRequest> findAll(Sort sort) { return findAll(); }
        @Override public Page<RefundRequest> findAll(Pageable pageable) { return null; }
    }

    static class StubFlightRepository implements FlightRepository {
        Map<String, Flight> db = new HashMap<>();

        @Override public List<Flight> findByFromContainingIgnoreCaseAndToContainingIgnoreCase(String from, String to) { return Collections.emptyList(); }
        @Override public List<Flight> findByFromContainingIgnoreCase(String from) { return Collections.emptyList(); }
        @Override public List<Flight> findByToContainingIgnoreCase(String to) { return Collections.emptyList(); }

        @Override public <S extends Flight> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Flight> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<Flight> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(Flight entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends Flight> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Flight> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends Flight> S insert(S entity) { return save(entity); }
        @Override public <S extends Flight> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Flight> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Flight> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Flight> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Flight> long count(Example<S> example) { return 0; }
        @Override public <S extends Flight> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Flight, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Flight> findAll(Sort sort) { return findAll(); }
        @Override public Page<Flight> findAll(Pageable pageable) { return null; }
    }

    static class StubHotelRepository implements HotelRepository {
        Map<String, Hotel> db = new HashMap<>();

        @Override public List<Hotel> findByLocationContainingIgnoreCase(String location) { return Collections.emptyList(); }
        @Override public List<Hotel> findByHotelNameContainingIgnoreCase(String hotelName) { return Collections.emptyList(); }

        @Override public <S extends Hotel> S save(S entity) { db.put(entity.getId(), entity); return entity; }
        @Override public Optional<Hotel> findById(String s) { return Optional.ofNullable(db.get(s)); }
        @Override public List<Hotel> findAll() { return new ArrayList<>(db.values()); }
        @Override public boolean existsById(String s) { return db.containsKey(s); }
        @Override public long count() { return db.size(); }
        @Override public void deleteById(String s) { db.remove(s); }
        @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(db::remove); }
        @Override public void delete(Hotel entity) { db.remove(entity.getId()); }
        @Override public void deleteAll(Iterable<? extends Hotel> entities) { entities.forEach(e -> db.remove(e.getId())); }
        @Override public void deleteAll() { db.clear(); }
        @Override public List<Hotel> findAllById(Iterable<String> strings) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> saveAll(Iterable<S> entities) { List<S> r = new ArrayList<>(); entities.forEach(e -> { save(e); r.add(e); }); return r; }
        @Override public <S extends Hotel> S insert(S entity) { return save(entity); }
        @Override public <S extends Hotel> List<S> insert(Iterable<S> entities) { return saveAll(entities); }
        @Override public <S extends Hotel> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override public <S extends Hotel> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override public <S extends Hotel> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override public <S extends Hotel> long count(Example<S> example) { return 0; }
        @Override public <S extends Hotel> boolean exists(Example<S> example) { return false; }
        @Override public <S extends Hotel, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override public List<Hotel> findAll(Sort sort) { return findAll(); }
        @Override public Page<Hotel> findAll(Pageable pageable) { return null; }
    }
}

