package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {

    List<Review> findByTargetId(String targetId);

    List<Review> findByTargetIdAndTargetType(String targetId, String targetType);

    List<Review> findByFlagged(boolean flagged);

    List<Review> findByUserId(String userId);
}
