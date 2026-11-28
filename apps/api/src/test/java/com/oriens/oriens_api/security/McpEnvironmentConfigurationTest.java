package com.oriens.oriens_api.security;

import com.oriens.oriens_api.mcp.McpProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class McpEnvironmentConfigurationTest {
    @Configuration(proxyBeanMethods=false)
    @EnableConfigurationProperties(McpProperties.class)
    static class Properties {}

    private ApplicationContextRunner context(Map<String,Object> variables) {
        return new ApplicationContextRunner().withUserConfiguration(Properties.class).withInitializer(c -> {
            var sources=c.getEnvironment().getPropertySources();
            sources.remove("systemProperties");
            sources.replace("systemEnvironment",new SystemEnvironmentPropertySource("systemEnvironment",variables));
        });
    }

    @Test void composeEnvironmentBindsPublicOriginsSecretsAndBothCallbackLists() {
        context(Map.of(
            "ORIENS_MCP_ENABLED","true",
            "ORIENS_MCP_ISSUER","http://127.0.0.1:8080",
            "ORIENS_MCP_FRONTEND","http://127.0.0.1:5173",
            "ORIENS_MCP_ENCRYPTIONPASSWORD","synthetic-local-configuration-secret-1234567890",
            "ORIENS_MCP_ENCRYPTIONSALT","0123456789abcdef0123456789abcdef",
            "ORIENS_MCP_CODEXREDIRECTS","http://127.0.0.1/callback",
            "ORIENS_MCP_CLAUDEREDIRECTS","http://localhost:8765/callback"
        )).run(c -> {
            assertThat(c).hasNotFailed();
            var p=c.getBean(McpProperties.class);
            assertThat(p.enabled()).isTrue();
            assertThat(p.openbotEnabled()).isFalse();
            assertThat(p.resource()).isEqualTo("http://127.0.0.1:8080/mcp");
            assertThat(p.frontend().toString()).isEqualTo("http://127.0.0.1:5173");
            assertThat(p.encryptionPassword()).isEqualTo("synthetic-local-configuration-secret-1234567890");
            assertThat(p.encryptionSalt()).isEqualTo("0123456789abcdef0123456789abcdef");
            assertThat(p.codexRedirects()).containsExactly("http://127.0.0.1/callback");
            assertThat(p.claudeRedirects()).containsExactly("http://localhost:8765/callback");
        });
    }

    @Test void productionEnvironmentBindsHttpsSiteRootAsIssuerAndFrontend() {
        context(Map.of(
            "ORIENS_MCP_ENABLED","true",
            "ORIENS_MCP_OPENBOTENABLED","true",
            "ORIENS_MCP_ISSUER","https://oriens.luisgosampaio.com",
            "ORIENS_MCP_FRONTEND","https://oriens.luisgosampaio.com",
            "ORIENS_MCP_ENCRYPTIONPASSWORD","c3ludGhldGljK3Byb2R1Y3Rpb24vY29uZmlndXJhdGlvbi1zZWNyZXQ9PT0rLzEy",
            "ORIENS_MCP_ENCRYPTIONSALT","fedcba9876543210fedcba9876543210",
            "ORIENS_MCP_CODEXREDIRECTS","http://127.0.0.1/callback",
            "ORIENS_MCP_CLAUDEREDIRECTS","http://localhost:8765/callback"
        )).run(c -> {
            assertThat(c).hasNotFailed();
            var p=c.getBean(McpProperties.class);
            assertThat(p.openbotEnabled()).isTrue();
            assertThat(p.base()).isEqualTo("https://oriens.luisgosampaio.com");
            assertThat(p.resource()).isEqualTo("https://oriens.luisgosampaio.com/mcp");
        });
    }

    @Test void absentConfigurationKeepsMcpDisabledWithoutRequiringSecrets() {
        context(Map.of()).run(c -> {
            assertThat(c).hasNotFailed();
            assertThat(c.getBean(McpProperties.class).enabled()).isFalse();
        });
    }
}
