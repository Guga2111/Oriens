package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class TaskRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

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

    // =================================================================
    // FIX: Overloaded helper methods to ensure startTime is never null
    // =================================================================

    private Task createTask(String title, User user, LocalDate dueDate, LocalTime startTime, Status status) {
        Task task = new Task();
        task.setTitle(title);
        task.setUser(user);
        task.setDueDate(dueDate);
        task.setStartTime(startTime);
        task.setStatus(status);
        return entityManager.persist(task);
    }

    private Task createTask(String title, User user, LocalDate dueDate, Status status) {
        return createTask(title, user, dueDate, LocalTime.of(9, 0), status);
    }


    @Test
    void whenFindByUserAndDueDate_thenShouldReturnTasksForThatDayOnly() {
        LocalDate today = LocalDate.of(2025, 10, 16);
        LocalDate tomorrow = today.plusDays(1);
        createTask("Task 1 Today", user1, today, Status.PENDING);
        createTask("Task 2 Today", user1, today, Status.PENDING);
        createTask("Task 3 Tomorrow", user1, tomorrow, Status.PENDING);

        List<Task> tasks = taskRepository.findByUserAndDueDate(user1, today);

        assertThat(tasks).hasSize(2);
        assertThat(tasks).extracting(Task::getTitle).containsExactlyInAnyOrder("Task 1 Today", "Task 2 Today");
    }

    @Test
    void whenFindByUserAndDueDateBetween_thenShouldReturnOrderedTasksInRange() {
        LocalDate startDate = LocalDate.of(2025, 10, 13);
        LocalDate midDate = LocalDate.of(2025, 10, 15);
        LocalDate endDate = LocalDate.of(2025, 10, 17);

        createTask("Task C - Mid Day 2PM", user1, midDate, LocalTime.of(14, 0), Status.PENDING);
        createTask("Task D - End Day", user1, endDate, LocalTime.of(18, 0), Status.PENDING);
        createTask("Task A - Start Day", user1, startDate, LocalTime.of(8, 0), Status.PENDING);
        createTask("Task B - Mid Day 10AM", user1, midDate, LocalTime.of(10, 0), Status.PENDING);
        createTask("Task for different user", user2, midDate, Status.PENDING);

        List<Task> tasks = taskRepository.findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(user1, startDate, endDate);

        assertThat(tasks).hasSize(4);
        assertThat(tasks).extracting(Task::getTitle)
                .containsExactly("Task A - Start Day", "Task B - Mid Day 10AM", "Task C - Mid Day 2PM", "Task D - End Day");
    }

    @Test
    void whenFindByCriteriaForReminder_thenShouldReturnOnlyPendingTasksNotSent() {
        LocalDate today = LocalDate.now();
        LocalTime morning = LocalTime.of(9, 0);
        LocalTime noon = LocalTime.of(12, 0);

        createTask("Pending task, reminder not sent", user1, today, LocalTime.of(10, 0), Status.PENDING);
        createTask("Task outside time range", user1, today, LocalTime.of(13, 0), Status.PENDING);
        Task reminderSentTask = createTask("Pending task, reminder sent", user1, today, LocalTime.of(11, 0), Status.PENDING);
        reminderSentTask.setReminderSent(true);
        createTask("Concluded task", user1, today, LocalTime.of(11, 30), Status.CONCLUDED);
        createTask("Task for tomorrow", user1, today.plusDays(1), morning, Status.PENDING);

        List<Task> tasks = taskRepository.findByDueDateAndStartTimeBetweenAndStatusAndReminderSentIsFalse(
                today, morning, noon, Status.PENDING
        );

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getTitle()).isEqualTo("Pending task, reminder not sent");
    }

    @Test
    void whenFindByCriteriaForOverdue_thenShouldReturnOnlyPendingTasksFromPastNotSent() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        createTask("Pending task from yesterday", user1, yesterday, Status.PENDING);
        Task overdueSentTask = createTask("Overdue notification sent", user1, yesterday, Status.PENDING);
        overdueSentTask.setOverdueNotificationSent(true);
        createTask("Concluded task from yesterday", user1, yesterday, Status.CONCLUDED);
        createTask("Pending task for today", user1, today, Status.PENDING);

        List<Task> tasks = taskRepository.findByDueDateBeforeAndStatusAndOverdueNotificationSentIsFalse(
                today, Status.PENDING
        );

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getTitle()).isEqualTo("Pending task from yesterday");
    }

    @Test
    void whenCountCompletedTasksInDateRange_thenShouldReturnCorrectCount() {
        LocalDate startDate = LocalDate.of(2025, 10, 13);
        LocalDate endDate = LocalDate.of(2025, 10, 17);

        createTask("User1 Concluded 1", user1, startDate, Status.CONCLUDED);
        createTask("User1 Concluded 2", user1, endDate, Status.CONCLUDED);
        createTask("User1 Pending", user1, startDate.plusDays(1), Status.PENDING);
        createTask("User2 Concluded", user2, startDate, Status.CONCLUDED);

        long count = taskRepository.countCompletedTasksInDateRange(user1.getId(), startDate, endDate);

        assertThat(count).isEqualTo(2);
    }

    @Test
    void whenCountTotalTasksInDateRange_thenShouldReturnCorrectCount() {
        LocalDate startDate = LocalDate.of(2025, 10, 13);
        LocalDate endDate = LocalDate.of(2025, 10, 17);

        createTask("User1 Concluded", user1, startDate, Status.CONCLUDED);
        createTask("User1 Pending", user1, endDate, Status.PENDING);
        createTask("User1 Out of Range", user1, endDate.plusDays(1), Status.PENDING);
        createTask("User2 In Range", user2, startDate, Status.CONCLUDED);

        long count = taskRepository.countTotalTasksInDateRange(user1.getId(), startDate, endDate);

        assertThat(count).isEqualTo(2);
    }
}