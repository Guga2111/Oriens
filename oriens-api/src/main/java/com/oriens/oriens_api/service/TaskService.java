package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;

import java.time.LocalDate;
import java.util.List;

public interface TaskService {
    Task createTask(Task task, Long userId);
    Task getTask (Long id);
    List<Task> getTasksForUserByDueDate(Long userId, LocalDate dueDate);
    List<Task> getTasksForUserByDateRange(Long userId, LocalDate startDate, LocalDate endDate);
    Task updateTask(Long taskId, Task task);
    void deleteTask(Long taskId);
}
