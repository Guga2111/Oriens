package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.exception.TaskNotFoundException;
import com.oriens.oriens_api.exception.UserNotFoundException;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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
    @Transactional
    public List<Task> getTasksForUserByDueDate(Long userId, LocalDate dueDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return taskRepository.findByUserAndDueDate(user, dueDate);
    }

    @Override
    @Transactional
    public List<Task> getTasksForUserByDateRange(Long userId, LocalDate startDate, LocalDate endDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return taskRepository.findByUserAndDueDateBetweenOrderByDueDateAscStartTimeAsc(user, startDate, endDate);
    }

    @Override
    @Transactional
    public Task createTask(Task task, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        task.setUser(user);
        task.setStatus(Status.PENDING);

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
        existingTask.setStatus(taskDetails.getStatus());

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
