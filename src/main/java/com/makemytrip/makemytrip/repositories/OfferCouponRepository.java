package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.OfferCoupon;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OfferCouponRepository extends MongoRepository<OfferCoupon, String> {
    Optional<OfferCoupon> findByCode(String code);
}
