package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.statistics.TasksCompletedByTimeRangeDTO;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserAndDueDate(User user, LocalDate dueDate);
    List<Task> findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(User user, LocalDate startDate, LocalDate endDate);

    // Search tasks from today, that not received a reminder and are pendent
    @Query("SELECT t FROM Task t JOIN FETCH t.user WHERE t.dueDate = :dueDate AND t.startTime BETWEEN :startTime AND :endTime AND t.status = :status AND t.reminderSent = false")
    List<Task> findByDueDateAndStartTimeBetweenAndStatusAndReminderSentIsFalse(
            @Param("dueDate") LocalDate dueDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("status") Status status
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

    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.status = 'PENDING' AND t.dueDate BETWEEN :startDate AND :endDate")
    long countOverdueTasksInDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query(
            "SELECT t.completedAt, COUNT(t) " +
                    "FROM Task t " +
                    "WHERE t.user.id = :userId " +
                    "  AND t.status = 'CONCLUDED' " +
                    "  AND t.completedAt >= :startDate " +
                    "GROUP BY t.completedAt " +
                    "ORDER BY t.completedAt ASC"
    )
    List<Object[]> findTasksCompletedByDay(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate
    );

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
            "AND (CAST(:status AS string) IS NULL OR t.status = :status) " +
            "AND (CAST(:priority AS string) IS NULL OR t.priority = :priority) " +
            "AND (:search IS NULL OR :search = '' OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (CAST(:startDate AS date) IS NULL OR t.dueDate >= :startDate) " +
            "AND (CAST(:endDate AS date) IS NULL OR t.dueDate <= :endDate)")
    Page<Task> findAllFiltered(
            @Param("userId") Long userId,
            @Param("status") Status status,
            @Param("priority") Priority priority,
            @Param("search") String search,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable
    );
}
