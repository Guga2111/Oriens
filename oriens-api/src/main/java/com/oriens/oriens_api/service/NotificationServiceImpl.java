package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.exception.NotificationNotFoundException;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.NotificationRepository;
import com.oriens.oriens_api.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

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
    @Transactional
    public void markAsRead(Long notificationId) {

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        notification.setRead(true);

        notificationRepository.save(notification);
    }
}
