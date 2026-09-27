package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.RefundRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends MongoRepository<RefundRequest, String> {
    List<RefundRequest> findByUserId(String userId);
    Optional<RefundRequest> findByRefundId(String refundId);
    Optional<RefundRequest> findByBookingId(String bookingId);
}
