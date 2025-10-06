package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder bCryptPasswordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    // === Tests for saveUser(User user) ===

    @Test
    void saveUser_Success_ShouldReturnSavedUser () {
        User user = new User();
        user.setEmail("test@example.com");
        user.setPassword("password123");

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(bCryptPasswordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User savedUser = userService.saveUser(user);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getPassword()).isEqualTo("encodedPassword");
        assertThat(savedUser.getEmail()).isEqualTo("test@example.com");

        verify(userRepository, times(1)).findByEmail("test@example.com");
        verify(bCryptPasswordEncoder, times(1)).encode("password123");
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void saveUser_ThrowsException_WhenEmailAlreadyExists() {
        User existingUser = new User();
        existingUser.setEmail("test@example.com");
        existingUser.setPassword("password123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existingUser));

        assertThrows(IllegalStateException.class, () -> {
            userService.saveUser(existingUser);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    // === Tests for getUser(Long id) ===
    @Test
    void getUserById_Success_ShouldReturnUser() {
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        user.setEmail("found@example.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User foundUser = userService.getUser(userId);

        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getId()).isEqualTo(userId);
    }

    @Test
    void getUserById_ThrowsException_WhenUserNotFound() {
        Long userId = 99L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> { // change for custom Exception
            userService.getUser(userId);
        });
    }

    // === Testes para getUser(String email) ===
    @Test
    void getUserByEmail_Success_ShouldReturnUser() {
        String email = "found@example.com";
        User user = new User();
        user.setId(1L);
        user.setEmail(email);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        User foundUser = userService.getUser(email);

        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getEmail()).isEqualTo(email);
    }

    // === Testes para getUsers() ===
    @Test
    void getUsers_ShouldReturnListOfUsers() {
        User user1 = new User();
        user1.setId(1L);
        User user2 = new User();
        user2.setId(2L);
        when(userRepository.findAll()).thenReturn(Arrays.asList(user1, user2));

        List<User> users = userService.getUsers();

        assertThat(users).isNotNull();
        assertThat(users.size()).isEqualTo(2);
    }

    // === Tests for updateUser() ===
    @Test
    void updateUser_Success_ShouldReturnUpdatedUser() { // NOTE: NOT FINISHED THIS ONE HEREEE!!!!!!!!
        Long userId = 1L;
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setName("Old Name");

        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenReturn(existingUser);

        existingUser.setName("New Name");
        User updatedUser = userService.updateUser(userId);

        assertThat(updatedUser).isNotNull();
        assertThat(updatedUser.getName()).isEqualTo("New Name");
        verify(userRepository, times(1)).save(existingUser);
    }

    // === Tests for deleteUser() ===
    @Test
    void deleteUser_Success_ShouldCallDelete() {
        // Given
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        doNothing().when(userRepository).delete(any(User.class));

        userService.deleteUser(userId);

        verify(userRepository, times(1)).delete(user);
    }
}