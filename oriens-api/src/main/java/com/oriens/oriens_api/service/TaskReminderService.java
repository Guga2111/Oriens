package com.oriens.oriens_api.service;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.DateTimeFormatter;

/** Notification and reference flag commit together; locked recheck serializes with task edits. */
@Service
@RequiredArgsConstructor
public class TaskReminderService {
    private final TaskRepository tasks;
    private final NotificationServiceImpl notifications;
    private final Clock clock;

    @Transactional
    public void emit(Long id, boolean deadline) {
        Task t = tasks.lockReminder(id).orElse(null);
        if (t == null || (t.getStatus() != Status.PENDING && t.getStatus() != Status.ON_DOING)) return;
        LocalDateTime now = LocalDateTime.now(clock.withZone(ProductClockConfiguration.ZONE));
        if (deadline) {
            if (t.isOverdueNotificationSent() || t.getDueDate() == null || !t.getDueDate().isBefore(now.toLocalDate())) return;
            notifications.createNotification("O prazo da tarefa '" + t.getTitle() + "' foi ultrapassado.", t.getUser());
            t.setOverdueNotificationSent(true);
        } else {
            if (t.isReminderSent() || t.getPlannedDate() == null || t.getStartTime() == null) return;
            LocalDateTime scheduled = t.getPlannedDate().atTime(t.getStartTime());
            if (scheduled.isBefore(now) || scheduled.isAfter(now.plusMinutes(15))) return;
            notifications.createNotification("Sua tarefa '" + t.getTitle() + "' começa às " +
                t.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")) + ".", t.getUser());
            t.setReminderSent(true);
        }
    }
}
