package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Notification;
import com.oriens.oriens_api.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class NotificationRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private NotificationRepository notificationRepository;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        user1 = new User();
        user1.setName("User One");
        user1.setEmail("user1@test.com");
        user1.setPassword("pass");
        entityManager.persist(user1);

        user2 = new User();
        user2.setName("User Two");
        user2.setEmail("user2@test.com");
        user2.setPassword("pass");
        entityManager.persist(user2);
    }

    private void createNotification(String message, User user) {
        Notification notification = new Notification(message, user);
        entityManager.persist(notification);
    }

    @Test
    void whenFindByUserOrderByCreatedAtDesc_thenShouldReturnNotificationsInCorrectOrder() {
        createNotification("First message for user1", user1);
        entityManager.flush();
        createNotification("Second message for user1", user1);
        entityManager.flush();
        createNotification("Message for user2", user2);
        entityManager.flush();

        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user1);

        assertThat(notifications).hasSize(2);
        assertThat(notifications.get(0).getMessage()).isEqualTo("Second message for user1");
        assertThat(notifications.get(1).getMessage()).isEqualTo("First message for user1");
    }

    @Test
    void whenFindTop5ByUserIdOrderByCreatedAtDesc_thenShouldReturnMaxFiveNotifications() {
        for (int i = 1; i <= 7; i++) {
            createNotification("Message " + i, user1);
            entityManager.flush();
        }

        List<Notification> notifications = notificationRepository.findTop5ByUserIdOrderByCreatedAtDesc(user1.getId());

        assertThat(notifications).hasSize(5);
        assertThat(notifications.get(0).getMessage()).isEqualTo("Message 7");
    }

    @Test
    void whenMarkAllAsReadByUserId_thenShouldUpdateUnreadNotificationsAndReturnCount() {
        createNotification("Unread 1 for user1", user1);
        createNotification("Unread 2 for user1", user1);
        createNotification("Unread for user2", user2);

        Notification alreadyRead = new Notification("Already read", user1);
        alreadyRead.setRead(true);
        entityManager.persist(alreadyRead);
        entityManager.flush();

        int updatedCount = notificationRepository.markAllAsReadByUserId(user1.getId());

        assertThat(updatedCount).isEqualTo(2);

        entityManager.clear();
        List<Notification> user1Notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user1);
        assertThat(user1Notifications).allMatch(Notification::isRead);
    }

    @Test
    void whenDeleteByUserId_thenShouldDeleteNotificationsAndReturnCount() {
        createNotification("Msg 1 for user1", user1);
        createNotification("Msg 2 for user1", user1);
        createNotification("Msg for user2", user2);
        entityManager.flush();

        int deletedCount = notificationRepository.deleteByUserId(user1.getId());

        assertThat(deletedCount).isEqualTo(2);

        List<Notification> user1Notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user1);
        List<Notification> user2Notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user2);

        assertThat(user1Notifications).isEmpty();
        assertThat(user2Notifications).hasSize(1);
    }
}