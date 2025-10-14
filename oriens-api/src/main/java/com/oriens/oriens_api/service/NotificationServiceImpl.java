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
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Notification createNotification(String message, User user) {

        if (user == null) {
            throw new IllegalStateException("User cannot be null!");
        }
        Notification notification = new Notification(message, user);

        return notificationRepository.save(notification);
    }

    @Override
    public List<Notification> getNotificationsByUser(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public List<NotificationDTO> getLastNotificationsByUser(Long userId) {
        List<Notification>  notifications = notificationRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        notification.setRead(true);

        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public NotificationUpdateCountDTO markAllAsRead(Long userId) {
        int updatedCount = notificationRepository.markAllAsReadByUserId(userId);
        return new NotificationUpdateCountDTO(updatedCount);
    }

    @Override
    @Transactional
    public NotificationDeleteCountDTO clearAll(Long userId) {
        int deletedCount = notificationRepository.deleteByUserId(userId);
        return new NotificationDeleteCountDTO(deletedCount);
    }

    private NotificationDTO convertToDto(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setMessage(notification.getMessage());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}
