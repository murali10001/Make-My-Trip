package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Recommendation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecommendationRepository extends MongoRepository<Recommendation, String> {
    List<Recommendation> findByActiveTrue();
    List<Recommendation> findByCategoryAndActiveTrue(String category);
    List<Recommendation> findByTargetTypeAndActiveTrue(String targetType);
}
