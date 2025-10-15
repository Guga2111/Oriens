package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.dto.TaskDTO;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceImplTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskServiceImpl taskService;

    // === Tests for createTask(Task task, Long userId) ===

    @Test
    void createTask_Success_ShouldReturnSavedTask() {
        Long userId = 1L;
        User user = new User();
        user.setId(userId);

        TaskDTO taskDTO = new TaskDTO();
        taskDTO.setTitle("Testar a aplicação");
        taskDTO.setDueDate(LocalDate.of(2025, 10, 6));

        Task task = Task.builder()
                .title(taskDTO.getTitle())
                .dueDate(taskDTO.getDueDate())
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        Task savedTask = taskService.createTask(taskDTO, userId);

        assertThat(savedTask).isNotNull();
        assertThat(savedTask.getUser()).isEqualTo(user);
        assertThat(savedTask.getStatus()).isEqualTo(com.oriens.oriens_api.entity.enums.Status.PENDING);
    }

    @Test
    void createTask_ThrowsException_WhenUserNotFound() {
        Long userId = 99L;
        TaskDTO task = new TaskDTO();
        task.setTitle("Testar com usuário inválido");

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> {
            taskService.createTask(task, userId);
        });
    }

    // === Tests for getTask(Long id) ===
    @Test
    void getTaskById_Success_ShouldReturnTask() {
        Long taskId = 1L;
        Task task = new Task();
        task.setId(taskId);
        task.setTitle("Test Task");
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

        Task foundTask = taskService.getTask(taskId);

        assertThat(foundTask).isNotNull();
        assertThat(foundTask.getId()).isEqualTo(taskId);
    }

    @Test
    void getTaskById_ThrowsException_WhenTaskNotFound() {
        Long taskId = 99L;
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> { // TaskNotFoundException here
            taskService.getTask(taskId);
        });
    }

    // === Tests for getTasksForUserByDueDate() ===
    @Test
    void getTasksForUserByDueDate_Success_ShouldReturnTaskList() {
        Long userId = 1L;
        LocalDate date = LocalDate.of(2025, 10, 6);
        User user = new User();
        user.setId(userId);

        Task task1 = new Task();
        task1.setId(10L);
        Task task2 = new Task();
        task2.setId(11L);
        List<Task> tasks = Arrays.asList(task1, task2);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskRepository.findByUserAndDueDate(user, date)).thenReturn(tasks);

        List<Task> foundTasks = taskService.getTasksForUserByDueDate(userId, date);

        assertThat(foundTasks).isNotNull();
        assertThat(foundTasks.size()).isEqualTo(2);
    }

    @Test
    void getTasksForUserByDueDate_ThrowsException_WhenUserNotFound() {
        Long userId = 99L;
        LocalDate date = LocalDate.of(2025, 10, 6);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> { // Custom exception
            taskService.getTasksForUserByDueDate(userId, date);
        });
    }

    // === Tests for updateTask() ===
    @Test
    void updateTask_Success_ShouldReturnUpdatedTask() {
        Long taskId = 1L;
        Task existingTask = new Task();
        existingTask.setId(taskId);
        existingTask.setTitle("Old Title");

        Task taskDetails = new Task();
        taskDetails.setTitle("New Title");
        taskDetails.setDescription("New Description");

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existingTask));
        when(taskRepository.save(any(Task.class))).thenReturn(existingTask);

        Task updatedTask = taskService.updateTask(taskId, taskDetails);

        assertThat(updatedTask).isNotNull();
        assertThat(updatedTask.getTitle()).isEqualTo("New Title");
        assertThat(updatedTask.getDescription()).isEqualTo("New Description");
        verify(taskRepository, times(1)).save(existingTask);
    }

    // === Tests for deleteTask() ===
    @Test
    void deleteTask_Success_ShouldCallDelete() {
        Long taskId = 1L;
        Task task = new Task();
        task.setId(taskId);
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        doNothing().when(taskRepository).delete(any(Task.class));

        taskService.deleteTask(taskId);

        verify(taskRepository, times(1)).delete(task);
    }
}