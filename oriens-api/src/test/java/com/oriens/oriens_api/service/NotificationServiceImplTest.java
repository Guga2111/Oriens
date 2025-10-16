package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.NotificationDTO;
import com.oriens.oriens_api.entity.dto.NotificationDeleteCountDTO;
import com.oriens.oriens_api.entity.dto.NotificationUpdateCountDTO;
import com.oriens.oriens_api.exception.NotificationNotFoundException;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.NotificationRepository;
import com.oriens.oriens_api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    // =================================================================
    // Tests for createNotification()
    // =================================================================

    @Test
    void whenCreateNotification_withValidUser_thenShouldSaveAndReturnNotification() {
        // Arrange
        User user = new User();
        user.setId(1L);
        String message = "Your task is due soon.";

        // We use thenAnswer to simulate the repository setting an ID on save
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(100L); // Simulate ID generation
            return notification;
        });

        // Act
        Notification createdNotification = notificationService.createNotification(message, user);

        // Assert
        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());

        Notification capturedNotification = notificationCaptor.getValue();
        assertThat(capturedNotification.getMessage()).isEqualTo(message);
        assertThat(capturedNotification.getUser()).isEqualTo(user);
        assertThat(capturedNotification.isRead()).isFalse(); // Should be false by default

        assertThat(createdNotification).isNotNull();
        assertThat(createdNotification.getId()).isEqualTo(100L);
    }

    @Test
    void whenCreateNotification_withNullUser_thenShouldThrowIllegalStateException() {
        // Arrange
        String message = "This should fail.";

        // Act & Assert
        assertThrows(IllegalStateException.class, () -> {
            notificationService.createNotification(message, null);
        });

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    // =================================================================
    // Tests for getNotificationsByUser()
    // =================================================================

    @Test
    void whenGetNotificationsByUser_withValidUserId_thenShouldReturnNotificationList() {
        // Arrange
        Long userId = 1L;
        User mockUser = new User();
        mockUser.setId(userId);

        List<Notification> mockNotifications = Arrays.asList(new Notification("Msg 1", mockUser), new Notification("Msg 2", mockUser));

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(notificationRepository.findByUserOrderByCreatedAtDesc(mockUser)).thenReturn(mockNotifications);

        // Act
        List<Notification> result = notificationService.getNotificationsByUser(userId);

        // Assert
        assertThat(result).isNotNull().hasSize(2);
        assertThat(result.get(0).getMessage()).isEqualTo("Msg 1");
    }

    @Test
    void whenGetNotificationsByUser_withInvalidUserId_thenShouldThrowUserNotFoundException() {
        // Arrange
        Long invalidUserId = 99L;
        when(userRepository.findById(invalidUserId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            notificationService.getNotificationsByUser(invalidUserId);
        });
    }

    // =================================================================
    // Tests for getLastNotificationsByUser()
    // =================================================================

    @Test
    void whenGetLastNotificationsByUser_thenShouldReturnListOfDTOs() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);

        Notification n1 = new Notification("Test Msg 1", user);
        n1.setId(101L);
        n1.setCreatedAt(LocalDateTime.now());
        Notification n2 = new Notification("Test Msg 2", user);
        n2.setId(102L);
        n2.setCreatedAt(LocalDateTime.now().minusHours(1));

        when(notificationRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId)).thenReturn(Arrays.asList(n1, n2));

        // Act
        List<NotificationDTO> result = notificationService.getLastNotificationsByUser(userId);

        // Assert
        assertThat(result).isNotNull().hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(101L);
        assertThat(result.get(0).getMessage()).isEqualTo("Test Msg 1");
        assertThat(result.get(1).isRead()).isFalse();
    }

    @Test
    void whenGetLastNotificationsByUser_withNoNotifications_thenShouldReturnEmptyList() {
        // Arrange
        Long userId = 1L;
        when(notificationRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId)).thenReturn(Collections.emptyList());

        // Act
        List<NotificationDTO> result = notificationService.getLastNotificationsByUser(userId);

        // Assert
        assertThat(result).isNotNull().isEmpty();
    }

    // =================================================================
    // Tests for markAsRead()
    // =================================================================

    @Test
    void whenMarkAsRead_withValidId_thenShouldUpdateAndSaveChanges() {
        // Arrange
        Long notificationId = 1L;
        Notification notification = new Notification("Unread message", new User());
        notification.setRead(false); // Explicitly set initial state

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        // Act
        notificationService.markAsRead(notificationId);

        // Assert
        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());

        Notification savedNotification = notificationCaptor.getValue();
        assertThat(savedNotification.isRead()).isTrue();
    }

    @Test
    void whenMarkAsRead_withInvalidId_thenShouldThrowNotificationNotFoundException() {
        // Arrange
        Long invalidId = 99L;
        when(notificationRepository.findById(invalidId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotificationNotFoundException.class, () -> {
            notificationService.markAsRead(invalidId);
        });
    }

    // =================================================================
    // Tests for markAllAsRead()
    // =================================================================

    @Test
    void whenMarkAllAsRead_thenShouldReturnCorrectUpdateCountDTO() {
        // Arrange
        Long userId = 1L;
        int updatedCount = 5;
        when(notificationRepository.markAllAsReadByUserId(userId)).thenReturn(updatedCount);

        // Act
        NotificationUpdateCountDTO result = notificationService.markAllAsRead(userId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getUpdatedCount()).isEqualTo(updatedCount);
        verify(notificationRepository, times(1)).markAllAsReadByUserId(userId);
    }

    // =================================================================
    // Tests for clearAll()
    // =================================================================

    @Test
    void whenClearAll_thenShouldReturnCorrectDeleteCountDTO() {
        // Arrange
        Long userId = 1L;
        int deletedCount = 10;
        when(notificationRepository.deleteByUserId(userId)).thenReturn(deletedCount);

        // Act
        NotificationDeleteCountDTO result = notificationService.clearAll(userId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getDeletedCount()).isEqualTo(deletedCount);
        verify(notificationRepository, times(1)).deleteByUserId(userId);
    }
}