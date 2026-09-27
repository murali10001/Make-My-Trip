package com.makemytrip.makemytrip.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.logging.Logger;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = Logger.getLogger(DataSeeder.class.getName());

    @Override
    public void run(String... args) {
        logger.info("Database connection active. Flights, hotels, and status records are managed directly via Database and Admin Panel.");
    }
}
