package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrUserId(String userId, String global);
}
