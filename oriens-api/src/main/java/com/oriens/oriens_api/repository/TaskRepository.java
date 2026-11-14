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
    @Query("select t from Task t where t.user.id = :owner and t.status <> 'CANCELLED' and (t.plannedDate = :date or (:recovery = true and t.status in ('PENDING','ON_DOING') and (t.plannedDate < :date or t.dueDate <= :date)))")
    List<Task> findDay(@Param("owner") Long owner, @Param("date") LocalDate date, @Param("recovery") boolean recovery);
    @Query("select t from Task t where t.user.id = :owner and t.status <> 'CANCELLED' and t.plannedDate between :start and :end")
    List<Task> findPlannedRange(@Param("owner") Long owner, @Param("start") LocalDate start, @Param("end") LocalDate end);
    List<Task> findByUserIdAndProjectIdIn(Long owner, java.util.Collection<Long> ids);
    @Query("select t.id from Task t where t.status in ('PENDING','ON_DOING') and t.reminderSent = false and t.plannedDate between :start and :end and t.startTime is not null")
    List<Long> findReminderCandidates(@Param("start") LocalDate start, @Param("end") LocalDate end);
    @Query("select t.id from Task t where t.status in ('PENDING','ON_DOING') and t.overdueNotificationSent = false and t.dueDate < :today")
    List<Long> findOverdueCandidates(@Param("today") LocalDate today);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Task t join fetch t.user where t.id = :id")
    java.util.Optional<Task> lockReminder(@Param("id") Long id);
    @Query("select count(t) from Task t where t.user.id = :userId and t.status = 'CONCLUDED' and t.plannedDate between :startDate and :endDate")
    long countCompletedPlanned(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("select t from Task t where t.user.id = :owner and (:projectId is null or t.projectId = :projectId) " +
        "and (cast(:status as string) is null or t.status = :status) and (cast(:priority as string) is null or t.priority = :priority) " +
        "and (cast(:search as string) is null or lower(t.title) like lower(concat('%',cast(:search as string),'%'))) " +
        "and (cast(:start as date) is null or (case when :dateField = 'plannedDate' then t.plannedDate else t.dueDate end) >= :start) " +
        "and (cast(:end as date) is null or (case when :dateField = 'plannedDate' then t.plannedDate else t.dueDate end) <= :end)")
    Page<Task> findWorkFiltered(@Param("owner") Long owner, @Param("projectId") Long projectId,
        @Param("status") Status status, @Param("priority") Priority priority, @Param("search") String search,
        @Param("dateField") String dateField, @Param("start") LocalDate start, @Param("end") LocalDate end, Pageable pageable);
    long countByProjectIdAndColumnId(Long projectId, Long columnId);
    long countByObjectiveId(Long objectiveId);
    long countByProjectId(Long projectId);
    java.util.Optional<Task> findByIdAndUserId(Long id, Long ownerId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Task t where t.id = :id and t.user.id = :ownerId")
    java.util.Optional<Task> lockOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);
    List<Task> findByProjectIdOrderByPositionAscIdAsc(Long projectId);
    List<Task> findByProjectIdAndColumnIdOrderByPositionAscIdAsc(Long projectId, Long columnId);
    List<Task> findByObjectiveId(Long objectiveId);

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
    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.status = 'CONCLUDED' AND t.completedAt BETWEEN :startDate AND :endDate")
    long countCompletedTasksInDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // For retrieving all tasks between a date range
    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.status <> 'CANCELLED' AND t.plannedDate BETWEEN :startDate AND :endDate")
    long countTotalTasksInDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :userId AND t.status IN ('PENDING','ON_DOING') AND t.dueDate BETWEEN :startDate AND :endDate")
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
