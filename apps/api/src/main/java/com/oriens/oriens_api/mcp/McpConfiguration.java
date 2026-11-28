package com.oriens.oriens_api.mcp;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.encrypt.*;
import org.springframework.security.crypto.keygen.Base64StringKeyGenerator;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.authorization.*;
import org.springframework.security.oauth2.server.authorization.authentication.*;
import org.springframework.security.oauth2.server.authorization.client.*;
import org.springframework.security.oauth2.server.authorization.settings.*;
import org.springframework.security.oauth2.server.authorization.token.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;

@Configuration(proxyBeanMethods=false)
@EnableConfigurationProperties(McpProperties.class)
@ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
public class McpConfiguration {
    private static final String OPENBOT_CLIENT_ID = "oriens-openbot";
    private static final String OPENBOT_CALLBACK = "http://127.0.0.1:28417/mcp-auth";

    @Bean McpStore mcpStore(JdbcTemplate db,Clock clock) {return new McpStore(db,clock);}
    @Bean McpRateLimiter mcpRateLimiter(JdbcTemplate db) {return new McpRateLimiter(db);}
    @Bean TextEncryptor mcpEncryptor(McpProperties p) {return Encryptors.delux(p.encryptionPassword(),p.encryptionSalt());}
    @Bean RegisteredClientRepository mcpClients(McpProperties p) {
        var clients = new ArrayList<>(List.of(
            client("oriens-codex", "Codex", p.codexRedirects()),
            client("oriens-claude-code", "Claude Code", p.claudeRedirects())));
        if (p.openbotEnabled()) clients.add(client(OPENBOT_CLIENT_ID, "OpenBot", List.of(OPENBOT_CALLBACK)));
        return new InMemoryRegisteredClientRepository(clients);
    }
    private RegisteredClient client(String id,String name,List<String> redirects) {
        return RegisteredClient.withId(id).clientId(id).clientName(name).clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE).authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUris(r->r.addAll(redirects)).scopes(s->s.addAll(McpScopes.ALL))
            .clientSettings(ClientSettings.builder().requireProofKey(true).requireAuthorizationConsent(false).build())
            .tokenSettings(TokenSettings.builder().accessTokenFormat(OAuth2TokenFormat.REFERENCE).accessTokenTimeToLive(Duration.ofMinutes(15))
                .authorizationCodeTimeToLive(Duration.ofSeconds(60)).refreshTokenTimeToLive(Duration.ofDays(30)).reuseRefreshTokens(false).build()).build();
    }
    @Bean McpAuthorizations mcpAuthorizations(JdbcTemplate db,McpStore store,RegisteredClientRepository clients,TextEncryptor encryptor,Clock clock) {
        return new McpAuthorizations(db,store,clients,encryptor,clock);
    }
    @Bean AuthorizationServerSettings mcpAuthorizationSettings(McpProperties p) {return AuthorizationServerSettings.builder().issuer(p.base()).build();}
    @Bean OAuth2TokenGenerator<?> mcpTokenGenerator(McpProperties p,McpStore store,Clock clock) {
        var access=new OAuth2AccessTokenGenerator();
        access.setAccessTokenCustomizer(ctx->ctx.getClaims().audience(new ArrayList<>(List.of(p.resource()))));
        var keys=new Base64StringKeyGenerator(Base64.getUrlEncoder().withoutPadding(),96);
        OAuth2TokenGenerator<OAuth2RefreshToken> refresh=ctx->{
            if (!OAuth2TokenType.REFRESH_TOKEN.equals(ctx.getTokenType())) return null;
            var c=store.find(UUID.fromString(ctx.getPrincipal().getName()),true);store.active(c);
            if (!c.scopes().contains("offline_access")) return null;
            Instant now=clock.instant();return new OAuth2RefreshToken(keys.generateKey(),now,c.expiresAt());
        };
        return new DelegatingOAuth2TokenGenerator(access,refresh);
    }
    @Bean OAuth2AuthorizationCodeRequestAuthenticationProvider mcpCodeRequests(RegisteredClientRepository clients,McpAuthorizations authorizations,McpProperties properties) {
        var provider=new OAuth2AuthorizationCodeRequestAuthenticationProvider(clients,authorizations,new InMemoryOAuth2AuthorizationConsentService());
        provider.setAuthenticationValidator(ctx->validateCodeRequest(ctx,properties));
        return provider;
    }
    static void validateCodeRequest(OAuth2AuthorizationCodeRequestAuthenticationContext context, McpProperties properties) {
        OAuth2AuthorizationCodeRequestAuthenticationToken request=context.getAuthentication();
        var client = context.getRegisteredClient();
        // OpenBot listens on a fixed port. Spring otherwise permits any port for an IP loopback URI.
        if (OPENBOT_CLIENT_ID.equals(client.getClientId()) && !OPENBOT_CALLBACK.equals(request.getRedirectUri()))
            throw new OAuth2AuthorizationCodeRequestAuthenticationException(new OAuth2Error("invalid_request"), null);
        OAuth2AuthorizationCodeRequestAuthenticationValidator.DEFAULT_REDIRECT_URI_VALIDATOR.accept(context);
        OAuth2AuthorizationCodeRequestAuthenticationValidator.DEFAULT_SCOPE_VALIDATOR.accept(context);
        if(request.getRedirectUri()==null || !request.getScopes().contains("mcp:context")
                || !"S256".equals(request.getAdditionalParameters().get("code_challenge_method"))
                || !properties.resource().equals(request.getAdditionalParameters().get("resource")))
            throw new OAuth2AuthorizationCodeRequestAuthenticationException(new OAuth2Error("invalid_request"),request);
    }
    /** Keep token validation, rotation, replay detection and revocation under the same DB transaction.
     * OAuth failures commit deliberate invalidations, then propagate; unrelated failures roll back. */
    static AuthenticationProvider transactional(AuthenticationProvider delegate,PlatformTransactionManager manager,McpAuthorizations authorizations,McpStore store,McpProperties properties) {
        TransactionTemplate tx=new TransactionTemplate(manager);tx.setTimeout(10);
        return new AuthenticationProvider() {
            public boolean supports(Class<?> type) {return delegate.supports(type);}
            public Authentication authenticate(Authentication input) {
                Object result=tx.execute(status->{
                    try {
                        if (input instanceof OAuth2RefreshTokenAuthenticationToken refresh) {
                            var a=authorizations.findByToken(refresh.getRefreshToken(),OAuth2TokenType.REFRESH_TOKEN);
                            if(a==null||!a.getAuthorizedScopes().contains("offline_access")) throw new OAuth2AuthenticationException("invalid_grant");
                        }
                        Authentication output=delegate.authenticate(input);
                        if(input instanceof OAuth2TokenRevocationAuthenticationToken revoke) {
                            var a=authorizations.findByToken(revoke.getToken(),null);
                            if(a!=null) authorizations.remove(a);
                        }
                        return output;
                    } catch(OAuth2AuthenticationException failure) {
                        OAuth2Authorization authorization=null;
                        if(input instanceof OAuth2RefreshTokenAuthenticationToken refresh)authorization=authorizations.findByToken(refresh.getRefreshToken(),OAuth2TokenType.REFRESH_TOKEN);
                        if(input instanceof OAuth2AuthorizationCodeAuthenticationToken code)authorization=authorizations.findByToken(code.getCode(),new OAuth2TokenType("code"));
                        if(authorization!=null){var c=store.find(UUID.fromString(authorization.getPrincipalName()),true);store.audit(c.userId(),c.id(),"oauth_exchange","DENIED");}
                        return failure;
                    }
                });
                if(result instanceof OAuth2AuthenticationException failure)throw failure;
                return (Authentication)result;
            }
        };
    }
}
