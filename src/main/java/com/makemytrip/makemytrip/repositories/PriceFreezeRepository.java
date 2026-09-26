package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.PriceFreeze;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceFreezeRepository extends MongoRepository<PriceFreeze, String> {
    List<PriceFreeze> findByUserId(String userId);
}

