package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.dto.TaskDTO;
import com.oriens.oriens_api.entity.dto.WeeklySummaryDTO;
import com.oriens.oriens_api.service.TaskServiceImpl;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/task")
public class TaskController {

    private final TaskServiceImpl taskService;

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById (@PathVariable Long id) {
        return new ResponseEntity<>(taskService.getTask(id), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Task>> getTasksForUserByDueDate (
            @PathVariable Long userId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)LocalDate date
            ) {
        return new ResponseEntity<>(taskService.getTasksForUserByDueDate(userId, date), HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/range")
    public ResponseEntity<List<Task>> getTasksForUserByDateRange(
            @PathVariable Long userId,
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<Task> tasks = taskService.getTasksForUserByDateRange(userId, startDate, endDate);
        return new ResponseEntity<>(tasks, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/summary/weekly-counts")
    public ResponseEntity<WeeklySummaryDTO> getCountTasksWeeklySummary (@PathVariable Long userId) {
        return new ResponseEntity<>(taskService.retrieveDoneTasksAndTasksNumbersByDateRange(userId), HttpStatus.OK);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<Task> createTask (@PathVariable Long userId, @RequestBody TaskDTO taskDTO) {
        return new ResponseEntity<>(taskService.createTask(taskDTO, userId), HttpStatus.CREATED);
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<Task> updateTask (@PathVariable Long taskId, @RequestBody Task taskDetails) {
        return new ResponseEntity<>(taskService.updateTask(taskId, taskDetails), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask (@PathVariable Long id) {
        taskService.deleteTask(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
