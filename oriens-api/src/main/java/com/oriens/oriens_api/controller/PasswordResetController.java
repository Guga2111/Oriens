package com.oriens.oriens_api.controller;

import com.oriens.oriens_api.entity.dto.forgotpassword.ForgotPasswordRequestDTO;
import com.oriens.oriens_api.entity.dto.forgotpassword.ResetPasswordRequestDTO;
import com.oriens.oriens_api.service.PasswordResetService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@AllArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequestDTO request) {

        System.out.println(request.getEmail());
        passwordResetService.handleForgotPassword(request.getEmail());

        return ResponseEntity.ok("Se seu e-mail estiver em nosso sistema, você receberá um link de redefinição.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequestDTO request) {
        try {
            passwordResetService.resetPassword(request);
            return ResponseEntity.ok("Senha redefinida com sucesso!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}