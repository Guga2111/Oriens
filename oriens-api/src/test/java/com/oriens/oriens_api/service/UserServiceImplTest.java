package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    void whenSaveUser_withNewEmail_thenShouldReturnSavedUser() {
        // Arrange
        User userToSave = new User();
        userToSave.setEmail("test@example.com");
        userToSave.setPassword("password123");

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(bCryptPasswordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(userToSave);

        // Act
        User savedUser = userService.saveUser(userToSave);

        // Assert
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getPassword()).isEqualTo("encodedPassword");
        assertThat(savedUser.getEmail()).isEqualTo("test@example.com"); // Email is lowercased

        verify(userRepository, times(1)).findByEmail("test@example.com");
        verify(bCryptPasswordEncoder, times(1)).encode("password123");
        verify(userRepository, times(1)).save(userToSave);
    }

    @Test
    void whenSaveUser_withExistingEmail_thenShouldThrowIllegalStateException() {
        // Arrange
        User existingUser = new User();
        existingUser.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existingUser));

        // Act & Assert
        assertThrows(IllegalStateException.class, () -> {
            userService.saveUser(existingUser);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    // === Tests for getUser(Long id) ===
    @Test
    void whenGetUserById_withValidId_thenShouldReturnUser() {
        // Arrange
        Long userId = 1L;
        User mockUser = new User();
        mockUser.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        // Act
        User foundUser = userService.getUser(userId);

        // Assert
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getId()).isEqualTo(userId);
    }

    @Test
    void whenGetUserById_withInvalidId_thenShouldThrowUserNotFoundException() {
        // Arrange
        Long invalidId = 99L;
        when(userRepository.findById(invalidId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUser(invalidId);
        });
    }

    // === Testes para getUser(String email) ===
    @Test
    void whenGetUserByEmail_withValidEmail_thenShouldReturnUser() {
        // Arrange
        String email = "found@example.com";
        User mockUser = new User();
        mockUser.setEmail(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(mockUser));

        // Act
        User foundUser = userService.getUser(email);

        // Assert
        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getEmail()).isEqualTo(email);
        verify(userRepository, times(1)).findByEmail(email); // Verifies the optimized method is called only once
    }

    @Test
    void whenGetUserByEmail_withInvalidEmail_thenShouldThrowUserNotFoundException() {
        // Arrange
        String invalidEmail = "notfound@example.com";
        when(userRepository.findByEmail(invalidEmail)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUser(invalidEmail);
        });
    }


    // === Tests for getUsers() ===
    @Test
    void whenGetUsers_thenShouldReturnListOfUsers() {
        // Arrange
        when(userRepository.findAll()).thenReturn(Arrays.asList(new User(), new User()));

        // Act
        List<User> users = userService.getUsers();

        // Assert
        assertThat(users).isNotNull().hasSize(2);
    }

    // === Tests for updateUser() ===
    @Test
    void whenUpdateProfileImageUrl_withValidId_thenShouldUpdateUrl() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        String newImageUrl = "http://example.com/new-image.png";

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        userService.updateProfileImageUrl(userId, newImageUrl);

        // Assert
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getProfileImageUrl()).isEqualTo(newImageUrl);
    }


    // === Tests for deleteUser() ===
    @Test
    void whenDeleteUser_withValidId_thenShouldCallDelete() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        doNothing().when(userRepository).delete(user);

        // Act
        userService.deleteUser(userId);

        // Assert
        verify(userRepository, times(1)).delete(user);
    }
}