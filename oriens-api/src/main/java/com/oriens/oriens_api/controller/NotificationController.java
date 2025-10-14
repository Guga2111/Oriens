package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.dto.NotificationDTO;
import com.oriens.oriens_api.entity.dto.NotificationDeleteCountDTO;
import com.oriens.oriens_api.entity.dto.NotificationUpdateCountDTO;
import com.oriens.oriens_api.service.NotificationServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationServiceImpl notificationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotifications (@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.getNotificationsByUser(userId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/last-notifications")
    public ResponseEntity<List<NotificationDTO>> getLast5Notifications (@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.getLastNotificationsByUser(userId), HttpStatus.OK);
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead (@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<NotificationUpdateCountDTO> markAllNotificationAsRead (@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.markAllAsRead(userId), HttpStatus.OK);
   }

   @DeleteMapping("/user/{userId}")
    public ResponseEntity<NotificationDeleteCountDTO> clearAll (@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.clearAll(userId), HttpStatus.NO_CONTENT);
   }
}
