package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.DynamicPrice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicPriceRepository extends MongoRepository<DynamicPrice, String> {
    List<DynamicPrice> findByItemId(String itemId);
    Optional<DynamicPrice> findTopByItemIdOrderByCalculatedAtDesc(String itemId);
}
