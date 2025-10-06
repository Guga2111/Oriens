package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.Status;
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
        return unwrapTask(taskRepository.findById(id));
    }

    @Override
    @Transactional
    public List<Task> getTasksForUserByDueDate(Long userId, LocalDate dueDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException()); // custom exception here 'UserNotFound'

        return taskRepository.findByUserAndDueDate(user, dueDate);
    }

    @Override
    @Transactional
    public Task createTask(Task task, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException()); // custom exception here 'UserNotFound'

        task.setUser(user);
        task.setStatus(Status.PENDING);

        return taskRepository.save(task);
    }

    @Override
    @Transactional
    public Task updateTask(Long taskId, Task taskDetails) {

        Task existingTask = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException()); // custom exception here for 'TaskNotFound'

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
        Task task = unwrapTask(taskRepository.findById(id));
        taskRepository.delete(task);
    }

    static Task unwrapTask (Optional<Task> taskOptional) {
        if (taskOptional.isEmpty()) throw new RuntimeException(); // custom exception 'TaskNotFound'
        return taskOptional.get();
    }
}
