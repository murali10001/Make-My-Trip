package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.HomeContent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HomeContentRepository extends MongoRepository<HomeContent, String> {
}
