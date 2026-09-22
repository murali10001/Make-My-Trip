package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.HomeContent;
import com.makemytrip.makemytrip.repositories.HomeContentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HomeContentService {

    @Autowired
    private HomeContentRepository homeContentRepository;

    public HomeContent getHomeContent() {
        List<HomeContent> list = homeContentRepository.findAll();
        if (list != null && !list.isEmpty()) {
            return list.get(0);
        }
        return new HomeContent();
    }

    public HomeContent saveHomeContent(HomeContent homeContent) {
        return homeContentRepository.save(homeContent);
    }
}
