package com.oriens.oriens_api.mcp;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class McpAuthorizationsCompatibilityTest {
    @Test
    void readsAuthorizationPersistedByBoot3AndJackson2WithoutLosingClaimsOrScopes() throws Exception {
        String legacy;
        try (var input = getClass().getResourceAsStream("/mcp/oauth-authorization-boot3.json")) {
            legacy = new String(java.util.Objects.requireNonNull(input).readAllBytes(), StandardCharsets.UTF_8);
        }

        var restored = authorizationsFor(legacy).findById("legacy-authorization");

        assertThat(restored.getPrincipalName()).isEqualTo("00000000-0000-0000-0000-000000000001");
        assertThat(restored.getAuthorizedScopes()).containsExactly("tasks:read");
        Authentication principal = restored.getAttribute(Principal.class.getName());
        assertThat(principal.isAuthenticated()).isTrue();
        assertThat(principal.getName()).isEqualTo("legacy-user");
        assertThat(principal.getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
        OAuth2AuthorizationRequest request = restored.getAttribute(OAuth2AuthorizationRequest.class.getName());
        assertThat(request.getClientId()).isEqualTo("legacy-client");
        assertThat(request.getAdditionalParameters()).containsEntry("code_challenge_method", "S256");
        assertThat(restored.getAccessToken().getToken().getIssuedAt()).isEqualTo(Instant.parse("2026-11-22T00:00:00Z"));
        assertThat(restored.getAccessToken().getClaims()).containsEntry("iss", "https://oriens.example.invalid")
            .containsEntry("aud", List.of("https://oriens.example.invalid/mcp"));
        assertThat(restored.getAccessToken().isActive()).isTrue();
    }

    @Test
    void legacyCompatibilityDoesNotAllowArbitraryPolymorphicTypes() throws Exception {
        String legacy;
        try (var input = getClass().getResourceAsStream("/mcp/oauth-authorization-boot3.json")) {
            legacy = new String(java.util.Objects.requireNonNull(input).readAllBytes(), StandardCharsets.UTF_8);
        }
        var unsafe = legacy.replace("java.util.ImmutableCollections$MapN", "java.util.PriorityQueue");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authorizationsFor(unsafe).findById("legacy-authorization"))
            .hasRootCauseInstanceOf(tools.jackson.databind.exc.InvalidTypeIdException.class);
    }

    private McpAuthorizations authorizationsFor(String legacy) {
        var db = mock(JdbcTemplate.class);
        var store = mock(McpStore.class);
        var clients = mock(RegisteredClientRepository.class);
        var encryption = mock(TextEncryptor.class);
        var connection = mock(McpStore.Connection.class);
        var connectionId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        var now = Instant.parse("2026-11-22T12:00:00Z");
        var client = RegisteredClient.withId("legacy-client").clientId("legacy-client")
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("http://127.0.0.1/callback").scope("tasks:read").build();
        when(db.queryForList(anyString(), eq(String.class), eq("legacy-authorization")))
            .thenReturn(List.of("encrypted-fixture"));
        when(encryption.decrypt("encrypted-fixture")).thenReturn(legacy);
        when(store.find(connectionId, true)).thenReturn(connection);
        when(connection.expiresAt()).thenReturn(now.plusSeconds(86400));
        when(connection.scopes()).thenReturn(Set.of("tasks:read"));
        when(clients.findById("legacy-client")).thenReturn(client);
        return new McpAuthorizations(db, store, clients, encryption, Clock.fixed(now, ZoneOffset.UTC));

    }
}
