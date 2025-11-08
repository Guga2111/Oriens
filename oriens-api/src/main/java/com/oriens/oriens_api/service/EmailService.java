package com.oriens.oriens_api.service;

import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendPasswordResetEmail(String toEmail, String token) {

        String resetUrl = "https://oriens.luisgosampaio.com/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("luisgosampaiowork@gmail.com");
        message.setTo(toEmail);
        message.setSubject("Instruções para Redefinir sua Senha");
        message.setText("Para redefinir sua senha, clique no link abaixo:\n\n"
                + resetUrl + "\n\n"
                + "Este link expira em 15 minutos.");

        mailSender.send(message);
    }

    public void sendSupportTicketConfirmation(String userEmail, String ticketId, String subject) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("luisgosampaiowork@gmail.com");
        message.setTo(userEmail);
        message.setSubject("Ticket de Suporte Recebido - #" + ticketId);
        message.setText("Olá,\n\n"
                + "Recebemos seu ticket de suporte com o assunto: \"" + subject + "\"\n\n"
                + "ID do Ticket: " + ticketId + "\n"
                + "Status: ABERTO\n\n"
                + "Nossa equipe entrará em contato em breve. Você pode acompanhar o status do seu ticket na página de Ajuda & Suporte.\n\n"
                + "Obrigado por nos contatar!\n\n"
                + "Equipe Oriens");

        mailSender.send(message);
    }

    public void sendSupportTicketStatusUpdate(String userEmail, String ticketId, String newStatus) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("luisgosampaiowork@gmail.com");
        message.setTo(userEmail);
        message.setSubject("Atualização do Ticket de Suporte - #" + ticketId);
        message.setText("Olá,\n\n"
                + "Seu ticket de suporte foi atualizado.\n\n"
                + "ID do Ticket: " + ticketId + "\n"
                + "Novo Status: " + newStatus + "\n\n"
                + "Você pode acompanhar o status completo na página de Ajuda & Suporte.\n\n"
                + "Obrigado por sua paciência!\n\n"
                + "Equipe Oriens");

        mailSender.send(message);
    }
}