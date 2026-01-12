package com.oriens.oriens_api.controller.scheduler;

import com.oriens.oriens_api.entity.Task;
import com.oriens.oriens_api.entity.enums.Status;
import com.oriens.oriens_api.repository.TaskRepository;
import com.oriens.oriens_api.service.WhatsAppService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
public class WhatsAppReminderScheduler {

    private final TaskRepository taskRepository;
    private final WhatsAppService whatsAppService;

    @Value("${twilio.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    public WhatsAppReminderScheduler(TaskRepository taskRepository, WhatsAppService whatsAppService) {
        this.taskRepository = taskRepository;
        this.whatsAppService = whatsAppService;
    }

    // Execute every 1 minute verifying tasks that will start in 15 minutes
    @Scheduled(cron = "0 * * * * ?")
    public void sendWhatsAppReminders() {
        if (!whatsappEnabled) {
            return;
        }

        LocalTime now = LocalTime.now();
        LocalTime in15Minutes = now.plusMinutes(15);
        LocalTime in16Minutes = now.plusMinutes(16); // 1 minute gap
        LocalDate today = LocalDate.now();

        log.debug("Checking for tasks between {} and {}", in15Minutes, in16Minutes);

        List<Task> upcomingTasks = taskRepository
                .findByDueDateAndStartTimeBetweenAndStatusAndReminderSentIsFalse(
                        today, in15Minutes, in16Minutes, Status.PENDING
                );

        if (!upcomingTasks.isEmpty()) {
            log.info("Found {} tasks requiring WhatsApp reminder", upcomingTasks.size());
        }

        for (Task task : upcomingTasks) {
            try {
                String userPhoneNumber = getUserPhoneNumber(task);

                if (userPhoneNumber != null && !userPhoneNumber.isEmpty()) {
                    boolean sent = whatsAppService.sendTaskReminder(task, userPhoneNumber);

                    if (sent) {
                        task.setReminderSent(true);
                        taskRepository.save(task);
                        log.info("WhatsApp reminder sent for task: {} to {}",
                                task.getTitle(), maskPhoneNumber(userPhoneNumber));
                    }
                } else {
                    log.warn("Task {} has no phone number configured for user {}",
                            task.getTitle(), task.getUser().getName());
                }

            } catch (Exception e) {
                log.error("Error sending WhatsApp reminder for task: {}. Error: {}",
                        task.getTitle(), e.getMessage(), e);
            }
        }
    }

    private String getUserPhoneNumber(Task task) {
        return task.getUser().getPhoneNumber();
    }

    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, phoneNumber.length() - 4) + "****";
    }
}
