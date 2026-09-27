package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.EmailAlreadyExistsException;
import com.makemytrip.makemytrip.exceptions.InvalidCredentialsException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserServices {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    public Users login(String email, String password) {
        Users user = userRepository.findByEmail(email);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        throw new InvalidCredentialsException("Invalid email or password");
    }

    public Users signup(Users user) {
        if (userRepository.findByEmail(user.getEmail()) != null) {
            throw new EmailAlreadyExistsException("Email '" + user.getEmail() + "' is already registered");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) {
            user.setRole("USER");
        }
        Users savedUser = userRepository.save(user);

        // Dynamically create welcome notification in DB for new user
        notificationService.createNotification(
            savedUser.getId(),
            "Welcome to MakeMyTour!",
            "Welcome " + savedUser.getFirstName() + "! Explore flights, hotels, and exclusive travel deals.",
            "welcome"
        );

        return savedUser;
    }

    public Users getUserByEmail(String email) {
        Users user = userRepository.findByEmail(email);
        if (user == null) {
            throw new UserNotFoundException("User with email '" + email + "' not found");
        }
        return user;
    }

    public Users getUserById(String id) {
        if (id == null || id.trim().isEmpty()) return null;
        return userRepository.findById(id.trim()).orElse(null);
    }


    public Users editprofile(String id, Users updatedUser) {
        Optional<Users> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            Users user = userOptional.get();
            user.setFirstName(updatedUser.getFirstName());
            user.setLastName(updatedUser.getLastName());
            user.setPhoneNumber(updatedUser.getPhoneNumber());
            if (updatedUser.getEmail() != null && !updatedUser.getEmail().trim().isEmpty()) {
                user.setEmail(updatedUser.getEmail().trim());
            }
            return userRepository.save(user);
        }
        throw new UserNotFoundException("User with ID '" + id + "' not found");
    }
}