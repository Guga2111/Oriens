package com.oriens.oriens_api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.*;

class JwtConfigurationTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
        .withUserConfiguration(JwtConfiguration.class)
        .withInitializer(c -> {
            c.getEnvironment().getPropertySources().remove("systemEnvironment");
            c.getEnvironment().getPropertySources().remove("systemProperties");
        });

    @Test void missingBlankAndShortKeysPreventStartup() {
        context.run(c -> assertThat(c).hasFailed());
        context.withPropertyValues("JWT_SECRET= ").run(c -> assertThat(c).hasFailed());
        context.withPropertyValues("JWT_SECRET=short").run(c -> assertThat(c).hasFailed());
    }

    @Test void rotationInvalidatesTokensSignedWithPreviousKey() {
        String previous = "synthetic-previous-key-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789";
        String current = "synthetic-current-key-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789";
        String oldToken = JWT.create().withSubject("fixture@example.invalid").sign(Algorithm.HMAC512(previous));
        context.withPropertyValues("JWT_SECRET="+current).run(c -> {
            assertThat(c).hasNotFailed();
            Algorithm algorithm = c.getBean(Algorithm.class);
            assertThatThrownBy(() -> JWT.require(algorithm).build().verify(oldToken))
                .isInstanceOf(com.auth0.jwt.exceptions.JWTVerificationException.class);
            String token = JWT.create().withSubject("fixture@example.invalid").sign(algorithm);
            assertThat(JWT.require(algorithm).build().verify(token).getSubject()).isEqualTo("fixture@example.invalid");
        });
    }
}
