package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.dto.LocationDTO;
import com.oriens.oriens_api.entity.dto.TaskDTO;
import com.oriens.oriens_api.entity.dto.TaskResponseDTO;
import com.oriens.oriens_api.entity.dto.WeeklySummaryDTO;
import com.oriens.oriens_api.entity.enums.Priority;
import com.oriens.oriens_api.entity.enums.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface TaskService {
    Task createTask(TaskDTO taskDTO, Long userId);
    Task getTask (Long id);
    List<Task> getTasksForUserByDueDate(Long userId, LocalDate dueDate);
    List<Task> getTasksForUserByDateRange(Long userId, LocalDate startDate, LocalDate endDate);
    Task updateTask(Long taskId, Task task);
    void deleteTask(Long taskId);

    WeeklySummaryDTO retrieveDoneTasksAndTasksNumbersByDateRange (Long userId);

    Page<TaskResponseDTO> getAllTasksPaginated(
            Long userId,
            Status status,
            Priority priority,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable
    );
}
