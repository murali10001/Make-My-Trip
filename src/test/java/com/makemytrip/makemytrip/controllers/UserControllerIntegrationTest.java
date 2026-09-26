package com.makemytrip.makemytrip.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makemytrip.makemytrip.exceptions.EmailAlreadyExistsException;
import com.makemytrip.makemytrip.exceptions.InvalidCredentialsException;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.UserServices;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserServices userServices;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /user/login - Successful Authentication")
    void testLogin_Success() throws Exception {
        Users mockUser = new Users();
        mockUser.setId("USR-001");
        mockUser.setEmail("test@example.com");
        mockUser.setFirstName("Test");

        when(userServices.login("test@example.com", "password123")).thenReturn(mockUser);

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
        when(userServices.login("test@example.com", "wrongpass"))
                .thenThrow(new InvalidCredentialsException("Invalid email or password"));

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

        when(userServices.signup(any(Users.class)))
                .thenThrow(new EmailAlreadyExistsException("Email 'existing@example.com' is already registered"));

        mockMvc.perform(post("/user/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email 'existing@example.com' is already registered"))
                .andExpect(jsonPath("$.status").value(409));
    }
}
