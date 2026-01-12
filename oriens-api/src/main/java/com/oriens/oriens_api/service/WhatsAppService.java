package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.Task;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class WhatsAppService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.whatsapp.from}")
    private String fromWhatsAppNumber;

    @Value("${twilio.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @PostConstruct
    public void init() {
        if (whatsappEnabled) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio WhatsApp service initialized successfully");
        } else {
            log.info("WhatsApp notifications are disabled");
        }
    }

    /**
     * Envia notificação de lembrete de tarefa via WhatsApp
     *
     * @param task A tarefa para enviar o lembrete
     * @param userPhoneNumber Número do usuário no formato: +5511999999999
     * @return true se enviado com sucesso, false caso contrário
     */
    public boolean sendTaskReminder(Task task, String userPhoneNumber) {
        if (!whatsappEnabled) {
            log.info("WhatsApp disabled. Skipping notification for task: {}", task.getTitle());
            return false;
        }

        try {
            String messageBody = buildReminderMessage(task);

            Message message = Message.creator(
                    new PhoneNumber("whatsapp:" + userPhoneNumber),
                    new PhoneNumber("whatsapp:" + fromWhatsAppNumber),
                    messageBody
            ).create();

            log.info("WhatsApp reminder sent successfully. SID: {}, Task: {}",
                    message.getSid(), task.getTitle());
            return true;

        } catch (Exception e) {
            log.error("Failed to send WhatsApp reminder for task: {}. Error: {}",
                    task.getTitle(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Constrói a mensagem de lembrete formatada
     */
    private String buildReminderMessage(Task task) {
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        StringBuilder message = new StringBuilder();
        message.append("🔔 *Lembrete de Tarefa*\n\n");
        message.append("📝 *").append(task.getTitle()).append("*\n");

        if (task.getDescription() != null && !task.getDescription().isEmpty()) {
            message.append("📄 ").append(task.getDescription()).append("\n");
        }

        message.append("⏰ Horário: ").append(task.getStartTime().format(timeFormatter)).append("\n");

        if (task.getDueDate() != null) {
            message.append("📅 Data: ").append(task.getDueDate().format(dateFormatter)).append("\n");
        }

        if (task.getPriority() != null) {
            String priorityEmoji = getPriorityEmoji(task.getPriority().name());
            message.append(priorityEmoji).append(" Prioridade: ").append(task.getPriority()).append("\n");
        }

        message.append("\n⏳ *Sua tarefa começará em 15 minutos!*");

        return message.toString();
    }

    /**
     * Retorna emoji baseado na prioridade
     */
    private String getPriorityEmoji(String priority) {
        return switch (priority) {
            case "HIGH" -> "🔴";
            case "MEDIUM" -> "🟡";
            case "LOW" -> "🟢";
            default -> "⚪";
        };
    }

    /**
     * Envia mensagem de teste para verificar a configuração
     */
    public boolean sendTestMessage(String userPhoneNumber) {
        if (!whatsappEnabled) {
            log.warn("WhatsApp is disabled. Cannot send test message.");
            return false;
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber("whatsapp:" + userPhoneNumber),
                    new PhoneNumber("whatsapp:" + fromWhatsAppNumber),
                    "✅ Teste de configuração do Oriens WhatsApp Bot!\n\nVocê receberá lembretes das suas tarefas 15 minutos antes do horário programado."
            ).create();

            log.info("Test message sent successfully. SID: {}", message.getSid());
            return true;

        } catch (Exception e) {
            log.error("Failed to send test message. Error: {}", e.getMessage(), e);
            return false;
        }
    }
}
