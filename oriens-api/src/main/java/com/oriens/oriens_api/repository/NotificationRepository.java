package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface NotificationRepository extends CrudRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc (User user);

    List<Notification> findTop5ByUserIdOrderByCreatedAtDesc (Long userId);
}
