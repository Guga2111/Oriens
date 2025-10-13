package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.NotificationDTO;

import java.util.List;

public interface NotificationService {

    Notification createNotification (String message, User user);
    List<Notification> getNotificationsByUser (Long userId);
    List<NotificationDTO> getLastNotificationsByUser (Long userId);
    void markAsRead (Long notificationId);

}
