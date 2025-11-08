package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.LocationDTO;
import com.oriens.oriens_api.entity.dto.TaskDTO;
import com.oriens.oriens_api.entity.dto.WeeklySummaryDTO;
import com.oriens.oriens_api.entity.embeddable.Location;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.exception.TaskNotFoundException;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Override
    public Task getTask(Long id) {
        return unwrapTask(taskRepository.findById(id), id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> getTasksForUserByDueDate(Long userId, LocalDate dueDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return taskRepository.findByUserAndDueDate(user, dueDate);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> getTasksForUserByDateRange(Long userId, LocalDate startDate, LocalDate endDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return taskRepository.findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(user, startDate, endDate);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklySummaryDTO retrieveDoneTasksAndTasksNumbersByDateRange(Long userId) {

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long completedCount = taskRepository.countCompletedTasksInDateRange(userId, weekStart, weekEnd);
        long totalCount = taskRepository.countTotalTasksInDateRange(userId, weekStart, weekEnd);

        int completedCountNumber = Math.toIntExact(completedCount);
        int totalCountNumber = Math.toIntExact(totalCount);

        return new WeeklySummaryDTO(completedCountNumber, totalCountNumber);
    }

    @Override
    @Transactional
    public Task createTask(TaskDTO taskDTO, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        Task task = Task.builder()
                        .title(taskDTO.getTitle())
                        .description(taskDTO.getDescription())
                        .dueDate(taskDTO.getDueDate())
                        .startTime(taskDTO.getStartTime())
                        .priority(taskDTO.getPriority())
                        .user(user)
                        .status(Status.PENDING)
                .build();

        LocationDTO locationDTO = taskDTO.getLocation();

        if (locationDTO != null && locationDTO.getAddress() != null) {
            Location location = Location.builder()
                    .address(locationDTO.getAddress())
                    .latitude(locationDTO.getLatitude())
                    .longitude(locationDTO.getLongitude())
                    .build();

            task.setLocation(location);
        }

        return taskRepository.save(task);
    }

    @Override
    @Transactional
    public Task updateTask(Long taskId, Task taskDetails) {

        Task existingTask = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));

        existingTask.setTitle(taskDetails.getTitle());
        existingTask.setDescription(taskDetails.getDescription());
        existingTask.setDueDate(taskDetails.getDueDate());
        existingTask.setStartTime(taskDetails.getStartTime());
        existingTask.setPriority(taskDetails.getPriority());

        Status oldStatus = existingTask.getStatus();
        Status newStatus = taskDetails.getStatus();

        if (!oldStatus.equals(newStatus) && newStatus.equals(Status.CONCLUDED)) {
            existingTask.setCompletedAt(LocalDate.now());
        } else if (newStatus.equals(Status.PENDING) && oldStatus.equals(Status.CONCLUDED)) {
            existingTask.setCompletedAt(null);
        }

        existingTask.setStatus(newStatus);

        return taskRepository.save(existingTask);
    }

    @Override
    @Transactional
    public void deleteTask(Long id) {
        Task task = unwrapTask(taskRepository.findById(id), id);
        taskRepository.delete(task);
    }

    static Task unwrapTask (Optional<Task> taskOptional, Long taskId) {
        if (taskOptional.isEmpty()) throw new TaskNotFoundException(taskId);
        return taskOptional.get();
    }
}
