package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.service.PhoneVerificationService;
import com.oriens.oriens_api.service.WhatsAppService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@AllArgsConstructor
@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppTestController {

    private final WhatsAppService whatsAppService;
    private final PhoneVerificationService verificationService;

    /**
     * Endpoint para testar o envio de mensagem WhatsApp
     *
     * Exemplo de uso:
     * POST /api/whatsapp/test
     * Body: { "phoneNumber": "+5511999999999" }
     *
     * IMPORTANTE: O número precisa ter feito "join" no Twilio Sandbox primeiro!
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> sendTestMessage(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");

        Map<String, Object> response = new HashMap<>();

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            response.put("success", false);
            response.put("message", "Phone number is required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        // Valida formato básico do número
        if (!phoneNumber.startsWith("+")) {
            response.put("success", false);
            response.put("message", "Phone number must start with + and country code (e.g., +5511999999999)");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        try {
            boolean sent = whatsAppService.sendTestMessage(phoneNumber);

            if (sent) {
                response.put("success", true);
                response.put("message", "WhatsApp test message sent successfully!");
                response.put("phoneNumber", maskPhoneNumber(phoneNumber));
                return new ResponseEntity<>(response, HttpStatus.OK);
            } else {
                response.put("success", false);
                response.put("message", "WhatsApp is disabled or failed to send. Check logs for details.");
                return new ResponseEntity<>(response, HttpStatus.SERVICE_UNAVAILABLE);
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error sending WhatsApp message: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Endpoint para verificar status da configuração do WhatsApp
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getWhatsAppStatus() {
        Map<String, Object> status = new HashMap<>();

        // Adicione aqui verificações de configuração se necessário
        status.put("service", "WhatsApp Notification Service");
        status.put("provider", "Twilio");
        status.put("documentation", "/WHATSAPP_SETUP.md");

        return new ResponseEntity<>(status, HttpStatus.OK);
    }

    /**
     * Endpoint para solicitar código de verificação
     * POST /api/whatsapp/send-verification
     * Body: { "userId": 1, "phoneNumber": "+5511999999999" }
     */
    @PostMapping("/send-verification")
    public ResponseEntity<Map<String, Object>> sendVerificationCode(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            String phoneNumber = request.get("phoneNumber").toString();

            String result = verificationService.sendVerificationCode(userId, phoneNumber);

            response.put("success", true);
            response.put("message", result);
            response.put("expiresInMinutes", 10);
            return new ResponseEntity<>(response, HttpStatus.OK);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);

        } catch (IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.TOO_MANY_REQUESTS);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to send verification code: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Endpoint para verificar código
     * POST /api/whatsapp/verify-code
     * Body: { "userId": 1, "phoneNumber": "+5511999999999", "code": "123456" }
     */
    @PostMapping("/verify-code")
    public ResponseEntity<Map<String, Object>> verifyCode(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            Long userId = Long.valueOf(request.get("userId"));
            String phoneNumber = request.get("phoneNumber");
            String code = request.get("code");

            boolean verified = verificationService.verifyCode(userId, phoneNumber, code);

            if (verified) {
                response.put("success", true);
                response.put("message", "Phone number verified successfully!");
                response.put("phoneNumber", maskPhoneNumber(phoneNumber));
                return new ResponseEntity<>(response, HttpStatus.OK);
            } else {
                response.put("success", false);
                response.put("message", "Verification failed");
                return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
            }

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);

        } catch (IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Verification error: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Endpoint para remover número de telefone
     * DELETE /api/whatsapp/phone/{userId}
     */
    @DeleteMapping("/phone/{userId}")
    public ResponseEntity<Map<String, Object>> removePhoneNumber(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            verificationService.removePhoneNumber(userId);

            response.put("success", true);
            response.put("message", "Phone number removed successfully");
            return new ResponseEntity<>(response, HttpStatus.OK);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to remove phone number: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Mascara número de telefone para segurança
     */
    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, phoneNumber.length() - 4) + "****";
    }
}
