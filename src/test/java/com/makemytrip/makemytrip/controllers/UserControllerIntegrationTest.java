package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.EmailAlreadyExistsException;
import com.makemytrip.makemytrip.exceptions.InvalidCredentialsException;
import com.makemytrip.makemytrip.exceptions.UserExceptionHandler;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.UserServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserControllerIntegrationTest {

    private MockMvc mockMvc;
    private StubUserServices userServices;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController();
        userServices = new StubUserServices();
        ReflectionTestUtils.setField(controller, "userServices", userServices);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new UserExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /user/login - Successful Authentication")
    void testLogin_Success() throws Exception {
        Users mockUser = new Users();
        mockUser.setId("USR-001");
        mockUser.setEmail("test@example.com");
        mockUser.setFirstName("Test");
        userServices.setUserToReturn(mockUser);

        mockMvc.perform(post("/user/login")
                        .param("email", "test@example.com")
                        .param("password", "password123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("USR-001"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    @DisplayName("POST /user/login - Negative Test with Invalid Credentials (401 Unauthorized)")
    void testLogin_Failure_Returns401() throws Exception {
        userServices.setExceptionToThrow(new InvalidCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/user/login")
                        .param("email", "test@example.com")
                        .param("password", "wrongpass"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("POST /user/signup - Negative Test with Existing Email (409 Conflict)")
    void testSignup_DuplicateEmail_Returns409() throws Exception {
        Users duplicateReq = new Users();
        duplicateReq.setEmail("existing@example.com");
        duplicateReq.setPassword("Password123");
        userServices.setExceptionToThrow(new EmailAlreadyExistsException("Email 'existing@example.com' is already registered"));

        mockMvc.perform(post("/user/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email 'existing@example.com' is already registered"))
                .andExpect(jsonPath("$.status").value(409));
    }

    static class StubUserServices extends UserServices {
        private Users userToReturn;
        private RuntimeException exceptionToThrow;

        public void setUserToReturn(Users u) { this.userToReturn = u; this.exceptionToThrow = null; }
        public void setExceptionToThrow(RuntimeException e) { this.exceptionToThrow = e; }

        @Override
        public Users login(String email, String password) {
            if (exceptionToThrow != null) throw exceptionToThrow;
            return userToReturn;
        }

        @Override
        public Users signup(Users user) {
            if (exceptionToThrow != null) throw exceptionToThrow;
            return userToReturn != null ? userToReturn : user;
        }
    }
}
