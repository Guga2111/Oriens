package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.PhoneVerification;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.repository.PhoneVerificationRepository;
import com.oriens.oriens_api.repository.UserRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private final PhoneVerificationRepository verificationRepository;
    private final UserRepository userRepository;

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.phone.from}")
    private String fromPhoneNumber;

    @Value("${twilio.sms.enabled:false}")
    private boolean smsEnabled;

    private static final int CODE_LENGTH = 6;
    private static final int EXPIRATION_MINUTES = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    @PostConstruct
    public void init() {
        if (smsEnabled) {
            Twilio.init(accountSid, authToken);
            log.info("Twilio SMS service initialized successfully");
        } else {
            log.info("SMS verification is disabled");
        }
    }

    /**
     * Envia código de verificação via SMS
     */
    @Transactional
    public String sendVerificationCode(Long userId, String phoneNumber) {
        // Valida formato do número
        if (!isValidPhoneNumber(phoneNumber)) {
            throw new IllegalArgumentException("Invalid phone number format. Use +5511999999999");
        }

        // Verifica se já existe uma verificação pendente
        Optional<PhoneVerification> existingVerification = verificationRepository
                .findByUserIdAndPhoneNumberAndVerifiedFalseAndExpiresAtAfter(
                        userId, phoneNumber, LocalDateTime.now()
                );

        if (existingVerification.isPresent()) {
            PhoneVerification verification = existingVerification.get();
            // Se foi criado há menos de 1 minuto, não envia novamente
            if (verification.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now())) {
                throw new IllegalStateException("Please wait 1 minute before requesting a new code");
            }
        }

        // Gera código aleatório de 6 dígitos
        String code = generateVerificationCode();

        // Cria registro de verificação
        PhoneVerification verification = PhoneVerification.builder()
                .userId(userId)
                .phoneNumber(phoneNumber)
                .verificationCode(code)
                .verified(false)
                .expiresAt(LocalDateTime.now().plusMinutes(EXPIRATION_MINUTES))
                .attempts(0)
                .build();

        verificationRepository.save(verification);

        // Envia SMS
        if (smsEnabled) {
            try {
                sendSMS(phoneNumber, code);
                log.info("Verification code sent to {} for user {}", maskPhoneNumber(phoneNumber), userId);
                return "SMS sent successfully";
            } catch (Exception e) {
                log.error("Failed to send SMS to {}: {}", maskPhoneNumber(phoneNumber), e.getMessage());
                throw new RuntimeException("Failed to send SMS: " + e.getMessage());
            }
        } else {
            // Modo de desenvolvimento: retorna o código
            log.warn("SMS disabled. Verification code for user {}: {}", userId, code);
            return "SMS disabled. Code: " + code; // APENAS PARA DEV!
        }
    }

    /**
     * Verifica o código informado pelo usuário
     */
    @Transactional
    public boolean verifyCode(Long userId, String phoneNumber, String code) {
        Optional<PhoneVerification> verificationOpt = verificationRepository
                .findByUserIdAndPhoneNumberAndVerifiedFalseAndExpiresAtAfter(
                        userId, phoneNumber, LocalDateTime.now()
                );

        if (verificationOpt.isEmpty()) {
            throw new IllegalStateException("No pending verification found or code expired");
        }

        PhoneVerification verification = verificationOpt.get();

        // Verifica tentativas
        if (!verification.canRetry()) {
            throw new IllegalStateException("Maximum verification attempts reached. Request a new code.");
        }

        verification.incrementAttempts();

        // Verifica código
        if (!verification.getVerificationCode().equals(code)) {
            verificationRepository.save(verification);
            throw new IllegalArgumentException("Invalid verification code");
        }

        // Marca como verificado
        verification.setVerified(true);
        verificationRepository.save(verification);

        // Atualiza usuário com o número verificado
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        user.setPhoneNumber(phoneNumber);
        userRepository.save(user);

        log.info("Phone number {} verified successfully for user {}", maskPhoneNumber(phoneNumber), userId);

        return true;
    }

    /**
     * Remove número de telefone do usuário
     */
    @Transactional
    public void removePhoneNumber(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        user.setPhoneNumber(null);
        userRepository.save(user);

        // Limpa verificações pendentes
        verificationRepository.deleteByUserId(userId);

        log.info("Phone number removed for user {}", userId);
    }

    /**
     * Envia SMS via Twilio
     */
    private void sendSMS(String toPhoneNumber, String code) {
        String messageBody = String.format(
                "Seu código de verificação Oriens é: %s\n\nEste código expira em %d minutos.\n\nSe você não solicitou este código, ignore esta mensagem.",
                code, EXPIRATION_MINUTES
        );

        Message message = Message.creator(
                new PhoneNumber(toPhoneNumber),
                new PhoneNumber(fromPhoneNumber),
                messageBody
        ).create();

        log.debug("SMS sent successfully. SID: {}", message.getSid());
    }

    /**
     * Gera código de verificação aleatório
     */
    private String generateVerificationCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(RANDOM.nextInt(10));
        }
        return code.toString();
    }

    /**
     * Valida formato do número de telefone
     */
    private boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return false;
        }
        // Formato esperado: +5511999999999 (mínimo 10 dígitos após o +)
        return phoneNumber.matches("^\\+\\d{10,15}$");
    }

    /**
     * Mascara número para logs
     */
    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, phoneNumber.length() - 4) + "****";
    }

    /**
     * Limpa códigos expirados (executa a cada hora)
     */
    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void cleanupExpiredVerifications() {
        List<PhoneVerification> expired = verificationRepository
                .findByExpiresAtBeforeAndVerifiedFalse(LocalDateTime.now());

        if (!expired.isEmpty()) {
            verificationRepository.deleteAll(expired);
            log.info("Cleaned up {} expired verification codes", expired.size());
        }
    }
}
