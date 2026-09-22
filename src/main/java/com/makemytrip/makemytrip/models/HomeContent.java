package com.makemytrip.makemytrip.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "home_content")
public class HomeContent {

    @Id
    private String id;
    private String heroBgUrl;
    private String appStoreBadgeUrl;
    private String playStoreBadgeUrl;

    private List<OfferItem> offers = new ArrayList<>();
    private List<CollectionItem> collections = new ArrayList<>();
    private List<WonderItem> wonders = new ArrayList<>();

    public HomeContent() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getHeroBgUrl() {
        return heroBgUrl;
    }

    public void setHeroBgUrl(String heroBgUrl) {
        this.heroBgUrl = heroBgUrl;
    }

    public String getAppStoreBadgeUrl() {
        return appStoreBadgeUrl;
    }

    public void setAppStoreBadgeUrl(String appStoreBadgeUrl) {
        this.appStoreBadgeUrl = appStoreBadgeUrl;
    }

    public String getPlayStoreBadgeUrl() {
        return playStoreBadgeUrl;
    }

    public void setPlayStoreBadgeUrl(String playStoreBadgeUrl) {
        this.playStoreBadgeUrl = playStoreBadgeUrl;
    }

    public List<OfferItem> getOffers() {
        return offers;
    }

    public void setOffers(List<OfferItem> offers) {
        this.offers = offers;
    }

    public List<CollectionItem> getCollections() {
        return collections;
    }

    public void setCollections(List<CollectionItem> collections) {
        this.collections = collections;
    }

    public List<WonderItem> getWonders() {
        return wonders;
    }

    public void setWonders(List<WonderItem> wonders) {
        this.wonders = wonders;
    }

    public static class OfferItem {
        private String title;
        private String description;
        private String imageUrl;

        public OfferItem() {}

        public OfferItem(String title, String description, String imageUrl) {
            this.title = title;
            this.description = description;
            this.imageUrl = imageUrl;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }
    }

    public static class CollectionItem {
        private String title;
        private String imageUrl;
        private String tag;

        public CollectionItem() {}

        public CollectionItem(String title, String imageUrl, String tag) {
            this.title = title;
            this.imageUrl = imageUrl;
            this.tag = tag;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }

        public String getTag() {
            return tag;
        }

        public void setTag(String tag) {
            this.tag = tag;
        }
    }

    public static class WonderItem {
        private String title;
        private String imageUrl;

        public WonderItem() {}

        public WonderItem(String title, String imageUrl) {
            this.title = title;
            this.imageUrl = imageUrl;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getImageUrl() {
            return imageUrl;
        }

        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }
    }
}
