package com.oriens.oriens_api.repository;

import com.oriens.oriens_api.entity.PhoneVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    Optional<PhoneVerification> findByUserIdAndPhoneNumberAndVerifiedFalseAndExpiresAtAfter(
            Long userId,
            String phoneNumber,
            LocalDateTime now
    );

    Optional<PhoneVerification> findByUserIdAndVerifiedFalseOrderByCreatedAtDesc(Long userId);

    List<PhoneVerification> findByExpiresAtBeforeAndVerifiedFalse(LocalDateTime now);

    void deleteByUserId(Long userId);
}
