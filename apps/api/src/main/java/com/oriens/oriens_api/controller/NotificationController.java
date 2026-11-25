package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.dto.NotificationDTO;
import com.oriens.oriens_api.entity.dto.NotificationDeleteCountDTO;
import com.oriens.oriens_api.entity.dto.NotificationUpdateCountDTO;
import com.oriens.oriens_api.security.WorkOwner;
import com.oriens.oriens_api.service.NotificationServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationServiceImpl notificationService;
    private final WorkOwner owner;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotifications (Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        return new ResponseEntity<>(notificationService.getNotificationsByUser(ownerId), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/last-notifications")
    public ResponseEntity<List<NotificationDTO>> getLast5Notifications (Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        return new ResponseEntity<>(notificationService.getLastNotificationsByUser(ownerId), HttpStatus.OK);
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead (Authentication auth, @PathVariable Long notificationId) {
        notificationService.markAsRead(owner.id(auth), notificationId);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @PatchMapping("/user/{userId}/read-all")
    public ResponseEntity<NotificationUpdateCountDTO> markAllNotificationAsRead (Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        return new ResponseEntity<>(notificationService.markAllAsRead(ownerId), HttpStatus.OK);
   }

   @DeleteMapping("/user/{userId}")
    public ResponseEntity<NotificationDeleteCountDTO> clearAll (Authentication auth, @PathVariable Long userId) {
        Long ownerId = owner.matching(auth, userId);
        return new ResponseEntity<>(notificationService.clearAll(ownerId), HttpStatus.NO_CONTENT);
   }
}
