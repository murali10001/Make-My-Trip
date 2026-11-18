package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class BookingRepositoryImpl implements BookingRepository {

    @Autowired
    private UserRepository userRepository;

    public BookingRepositoryImpl() {
    }

    public BookingRepositoryImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private Optional<Users> findUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return Optional.empty();
        }
        String cleanId = userId.trim();
        if (userRepository == null) {
            return Optional.empty();
        }
        Optional<Users> userOpt = userRepository.findById(cleanId);
        if (userOpt.isPresent()) {
            return userOpt;
        }
        Users userByEmail = userRepository.findByEmail(cleanId);
        return Optional.ofNullable(userByEmail);
    }

    @Override
    public List<Booking> findByUserIdAndTargetIdAndStatusIn(String userId, String targetId, List<String> statuses) {
        Optional<Users> userOpt = findUser(userId);
        if (userOpt.isEmpty()) {
            return Collections.emptyList();
        }
        List<Booking> bookings = userOpt.get().getBookings();
        if (bookings == null || bookings.isEmpty()) {
            return Collections.emptyList();
        }
        String cleanTargetId = targetId != null ? targetId.trim() : "";
        return bookings.stream()
                .filter(b -> b.getTargetId() != null && b.getTargetId().trim().equalsIgnoreCase(cleanTargetId))
                .filter(b -> {
                    if (statuses == null || statuses.isEmpty()) return true;
                    String bookingStatus = b.getStatus() != null ? b.getStatus().trim() : "CONFIRMED";
                    return statuses.stream().anyMatch(s -> s != null && s.trim().equalsIgnoreCase(bookingStatus));
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<Booking> findByUserId(String userId) {
        Optional<Users> userOpt = findUser(userId);
        if (userOpt.isEmpty() || userOpt.get().getBookings() == null) {
            return Collections.emptyList();
        }
        return new ArrayList<>(userOpt.get().getBookings());
    }

    @Override
    public boolean existsByUserIdAndTargetIdAndStatusIn(String userId, String targetId, List<String> statuses) {
        return !findByUserIdAndTargetIdAndStatusIn(userId, targetId, statuses).isEmpty();
    }
}
