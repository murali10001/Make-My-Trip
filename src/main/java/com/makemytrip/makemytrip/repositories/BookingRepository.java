package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Users.Booking;
import java.util.List;

public interface BookingRepository {
    List<Booking> findByUserIdAndTargetIdAndStatusIn(String userId, String targetId, List<String> statuses);
    List<Booking> findByUserId(String userId);
    boolean existsByUserIdAndTargetIdAndStatusIn(String userId, String targetId, List<String> statuses);
}
