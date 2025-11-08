package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.PasswordResetToken;
import com.oriens.oriens_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    Optional<PasswordResetToken> findByUser(User user);
}