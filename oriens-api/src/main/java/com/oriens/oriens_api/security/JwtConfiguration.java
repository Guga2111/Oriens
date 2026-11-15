package com.oriens.oriens_api.security;

import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** One externally provisioned key for both issuance and verification. No fallback. */
@Configuration
public class JwtConfiguration {
    @Bean
    public Algorithm jwtAlgorithm(@Value("${JWT_SECRET}") String secret) {
        if (secret.isBlank() || secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 64) {
            throw new IllegalArgumentException("JWT_SECRET must contain at least 64 bytes");
        }
        return Algorithm.HMAC512(secret);
    }
}
