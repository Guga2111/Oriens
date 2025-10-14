package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends CrudRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc (User user);

    List<Notification> findTop5ByUserIdOrderByCreatedAtDesc (Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}
