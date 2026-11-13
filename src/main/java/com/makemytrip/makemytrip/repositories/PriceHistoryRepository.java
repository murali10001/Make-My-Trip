package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.PriceHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceHistoryRepository extends MongoRepository<PriceHistory, String> {
    List<PriceHistory> findByItemIdOrderByRecordedAtDesc(String itemId);
    List<PriceHistory> findByItemIdAndItemTypeOrderByRecordedAtDesc(String itemId, String itemType);
    void deleteByItemId(String itemId);
}

