package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import org.springframework.data.repository.CrudRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends CrudRepository<Task, Long> {
    List<Task> findByUserAndDueDate(User user, LocalDate dueDate);
    List<Task> findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(User user, LocalDate startDate, LocalDate endDate);
}
