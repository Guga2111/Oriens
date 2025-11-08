package com.oriens.oriens_api.service;

import com.oriens.oriens_api.entity.dto.forgotpassword.ResetPasswordRequestDTO;
import com.oriens.oriens_api.entity.PasswordResetToken;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.repository.PasswordResetTokenRepository;
import com.oriens.oriens_api.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public void handleForgotPassword(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return;
        }

        User user = userOptional.get();

        tokenRepository.findByUser(user).ifPresent(tokenRepository::delete);

        String tokenValue = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(tokenValue, user);
        tokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(user.getEmail(), tokenValue);
    }

    public void resetPassword(ResetPasswordRequestDTO request) {
        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Token de redefinição inválido.")); //custom exception

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("Token expirado. Por favor, solicite um novo."); // custom exception
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        tokenRepository.delete(resetToken);
    }
}