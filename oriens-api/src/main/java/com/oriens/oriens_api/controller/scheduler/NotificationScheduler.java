package com.oriens.oriens_api.controller.scheduler;

import com.oriens.oriens_api.configuration.ProductClockConfiguration;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.service.TaskReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.*;

@Component
@RequiredArgsConstructor
public class NotificationScheduler {
    private final TaskRepository taskRepository;
    private final TaskReminderService reminders;
    private final Clock clock;

    @Scheduled(fixedRate = 300000)
    public void createUpComingTaskReminders() {
        LocalDateTime now = LocalDateTime.now(clock.withZone(ProductClockConfiguration.ZONE));
        for (Long id : taskRepository.findReminderCandidates(now.toLocalDate(), now.plusMinutes(15).toLocalDate()))
            reminders.emit(id, false);
    }
    @Scheduled(cron = "0 0 8 * * ?", zone = "America/Recife")
    public void createOverdueTaskReminders() {
        for (Long id : taskRepository.findOverdueCandidates(LocalDate.now(clock.withZone(ProductClockConfiguration.ZONE))))
            reminders.emit(id, true);
    }
}
