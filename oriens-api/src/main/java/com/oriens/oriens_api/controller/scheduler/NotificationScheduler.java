package com.oriens.oriens_api.controller.scheduler;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.service.NotificationServiceImpl;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@AllArgsConstructor
public class NotificationScheduler {

    private final TaskRepository taskRepository;
    private final NotificationServiceImpl notificationService;

    @Scheduled(fixedRate = 300000)
    public void createUpComingTaskReminders () {
        LocalTime now = LocalTime.now();
        LocalTime in15Minutes = now.plusMinutes(15);
        LocalDate today = LocalDate.now();

        System.out.println("Scheduler: Searching for tasks between " + now + " e " + in15Minutes);

        List<Task> upcomingTasks = taskRepository.findByDueDateAndStartTimeBetweenAndStatusAndReminderSentIsFalse(
                today, now, in15Minutes, Status.PENDING
        );

        for (Task task : upcomingTasks) {
            String formattedTime = task.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm"));
            String message = "Reminder: your task '" + task.getTitle() + "' stars soon, at " + formattedTime + ".";

            notificationService.createNotification(message, task.getUser());

            task.setReminderSent(true);
            taskRepository.save(task);
        }
    }

    @Scheduled(cron = "0 0 8 * * ?")
    public void createOverdueTaskReminders () {
        LocalDate today = LocalDate.now();

        System.out.println("Scheduler: Searching for tasks that are late.");

        List<Task> overdueTasks = taskRepository.findByDueDateBeforeAndStatusAndOverdueNotificationSentIsFalse(
                today, Status.PENDING
        );

        for (Task task : overdueTasks) {
            String message = "Reminder: your task '" + task.getTitle() + "' is late.";

            notificationService.createNotification(message, task.getUser());

            task.setOverdueNotificationSent(true);
            taskRepository.save(task);
        }
    }
}
