package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.exceptions.EmailAlreadyExistsException;
import com.makemytrip.makemytrip.exceptions.InvalidCredentialsException;
import com.makemytrip.makemytrip.exceptions.UserNotFoundException;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServicesTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private UserServices userServices;

    private Users testUser;

    @BeforeEach
    void setUp() {
        testUser = new Users();
        testUser.setId("USR-001");
        testUser.setEmail("john.doe@example.com");
        testUser.setPassword("encodedPassword123");
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setPhoneNumber("+1234567890");
        testUser.setRole("USER");
    }

    @Test
    @DisplayName("Login - Successful with Valid Credentials")
    void testLogin_Success() {
        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(testUser);
        when(passwordEncoder.matches("rawPassword123", "encodedPassword123")).thenReturn(true);

        Users loggedIn = userServices.login("john.doe@example.com", "rawPassword123");

        assertNotNull(loggedIn);
        assertEquals("john.doe@example.com", loggedIn.getEmail());
    }

    @Test
    @DisplayName("Login - Throws InvalidCredentialsException for Invalid Password")
    void testLogin_InvalidPassword() {
        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(testUser);
        when(passwordEncoder.matches("wrongPass", "encodedPassword123")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () ->
                userServices.login("john.doe@example.com", "wrongPass")
        );
    }

    @Test
    @DisplayName("Login - Throws InvalidCredentialsException for Non-existent Email")
    void testLogin_UserNotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(null);

        assertThrows(InvalidCredentialsException.class, () ->
                userServices.login("unknown@example.com", "rawPassword123")
        );
    }

    @Test
    @DisplayName("Signup - Successfully registers new user and sends welcome notification")
    void testSignup_Success() {
        Users newUser = new Users();
        newUser.setEmail("newuser@example.com");
        newUser.setPassword("plainPass");
        newUser.setFirstName("Alice");

        when(userRepository.findByEmail("newuser@example.com")).thenReturn(null);
        when(passwordEncoder.encode("plainPass")).thenReturn("hashedPass");
        when(userRepository.save(any(Users.class))).thenAnswer(invocation -> {
            Users u = invocation.getArgument(0);
            u.setId("USR-999");
            return u;
        });

        Users registered = userServices.signup(newUser);

        assertNotNull(registered);
        assertEquals("USR-999", registered.getId());
        assertEquals("USER", registered.getRole());
        assertEquals("hashedPass", registered.getPassword());
        verify(notificationService).createNotification(eq("USR-999"), anyString(), anyString(), eq("welcome"));
    }

    @Test
    @DisplayName("Signup - Throws EmailAlreadyExistsException if email already registered")
    void testSignup_DuplicateEmail() {
        Users duplicateUser = new Users();
        duplicateUser.setEmail("john.doe@example.com");

        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(testUser);

        assertThrows(EmailAlreadyExistsException.class, () ->
                userServices.signup(duplicateUser)
        );
    }

    @Test
    @DisplayName("GetUserByEmail - Success")
    void testGetUserByEmail_Success() {
        when(userRepository.findByEmail("john.doe@example.com")).thenReturn(testUser);

        Users found = userServices.getUserByEmail("john.doe@example.com");
        assertEquals("john.doe@example.com", found.getEmail());
    }

    @Test
    @DisplayName("GetUserByEmail - Throws UserNotFoundException when missing")
    void testGetUserByEmail_NotFound() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(null);

        assertThrows(UserNotFoundException.class, () ->
                userServices.getUserByEmail("missing@example.com")
        );
    }

    @Test
    @DisplayName("Edit Profile - Success")
    void testEditProfile_Success() {
        Users update = new Users();
        update.setFirstName("Johnny");
        update.setLastName("Smith");
        update.setPhoneNumber("+9999999999");

        when(userRepository.findById("USR-001")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Users result = userServices.editprofile("USR-001", update);

        assertEquals("Johnny", result.getFirstName());
        assertEquals("Smith", result.getLastName());
        assertEquals("+9999999999", result.getPhoneNumber());
    }
}
