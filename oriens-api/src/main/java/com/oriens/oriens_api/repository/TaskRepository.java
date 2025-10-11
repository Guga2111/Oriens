package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.Status;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public interface TaskRepository extends CrudRepository<Task, Long> {
    List<Task> findByUserAndDueDate(User user, LocalDate dueDate);
    List<Task> findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(User user, LocalDate startDate, LocalDate endDate);

    // Search tasks from today, that not received a reminder and are pendent
    List<Task> findByDueDateAndStartTimeBetweenAndStatusAndReminderSentIsFalse(
            LocalDate dueDate, LocalTime startTime, LocalTime endTime, Status status
    );

    // Search tasks from yesterday. that not received a late reminder not sent
    List<Task> findByDueDateBeforeAndStatusAndOverdueNotificationSentIsFalse(
            LocalDate date, Status status
    );

    // For retrieving all task done between a date range
    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.status = 'CONCLUDED' AND t.dueDate BETWEEN :startDate AND :endDate")
    long countCompletedTasksInDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // For retrieving all tasks between a date range
    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.dueDate BETWEEN :startDate AND :endDate")
    long countTotalTasksInDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
