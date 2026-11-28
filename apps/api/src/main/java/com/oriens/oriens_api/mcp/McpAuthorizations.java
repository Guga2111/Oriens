package com.oriens.oriens_api.mcp;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.security.jackson.SecurityJacksonModules;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.authorization.*;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.jackson.OAuth2AuthorizationServerJacksonModule;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

/** Framework repository: recoverable values encrypted by Spring Security; only SHA-256 lookup keys in clear. */
public class McpAuthorizations implements OAuth2AuthorizationService {
    private final JdbcTemplate db; private final McpStore grants; private final RegisteredClientRepository clients;
    private final TextEncryptor encryptor; private final ObjectMapper json=JsonMapper.builder().findAndAddModules().build();
    private final ObjectMapper attributes;
    private final Clock clock;
    public McpAuthorizations(JdbcTemplate db, McpStore grants, RegisteredClientRepository clients, TextEncryptor encryptor, Clock clock) {
        this.db=db;this.grants=grants;this.clients=clients;this.encryptor=encryptor;this.clock=clock;
        // Jackson 2 persisted these six JDK immutable collection classes in OAuth metadata.
        // Keep the compatibility allowlist narrow; never enable arbitrary persisted type IDs.
        attributes=JsonMapper.builder()
            .addModules(SecurityJacksonModules.getModules(getClass().getClassLoader(),
                BasicPolymorphicTypeValidator.builder()
                    .allowIfSubType(Map.of().getClass()).allowIfSubType(Map.of("key", "value").getClass())
                    .allowIfSubType(List.of().getClass()).allowIfSubType(List.of("value").getClass())
                    .allowIfSubType(Set.of().getClass()).allowIfSubType(Set.of("value").getClass())))
            .addModule(new OAuth2AuthorizationServerJacksonModule()).build();
    }
    public static String hash(String value) {
        try {return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch (NoSuchAlgorithmException e) {throw new IllegalStateException(e);}
    }
    public String protect(String value) {return encryptor.encrypt(value);}
    public String reveal(String value) {return encryptor.decrypt(value);}
    record Token(String type,String value,Instant issuedAt,Instant expiresAt,Set<String> scopes,String metadata) {}
    record Data(String id,String client,String principal,String grant,Set<String> scopes,String attributes,List<Token> tokens) {}
    private String write(Object value) {try{return attributes.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot persist OAuth state",e);}}
    private Map<String,Object> read(String value) {try{return attributes.readValue(value,new TypeReference<Map<String,Object>>(){});}catch(Exception e){throw new IllegalStateException("Cannot load OAuth state",e);}}
    private Token token(String type,OAuth2Authorization.Token<?> value) {
        if(value==null)return null;
        OAuth2Token t=value.getToken();
        return new Token(type,t.getTokenValue(),t.getIssuedAt(),t.getExpiresAt(),t instanceof OAuth2AccessToken a ? a.getScopes():Set.of(),write(value.getMetadata()));
    }
    @Override @Transactional(timeout=10)
    public void save(OAuth2Authorization a) {
        UUID connection=UUID.fromString(a.getPrincipalName());
        var c=grants.find(connection,true); grants.active(c);
        if (!c.clientId().equals(clients.findById(a.getRegisteredClientId()).getClientId())) throw McpStore.denied();
        List<Token> tokens=new ArrayList<>();
        for(Token t:Arrays.asList(token("code",a.getToken(OAuth2AuthorizationCode.class)),token("access_token",a.getAccessToken()),token("refresh_token",a.getRefreshToken()))) if(t!=null)tokens.add(t);
        Data data=new Data(a.getId(),a.getRegisteredClientId(),a.getPrincipalName(),a.getAuthorizationGrantType().getValue(),a.getAuthorizedScopes(),write(a.getAttributes()),tokens);
        String value;
        try{value=protect(json.writeValueAsString(data));}catch(Exception e){throw new IllegalStateException("Cannot protect OAuth state",e);}
        db.update("insert into mcp_oauth_authorizations(id,connection_id,encrypted_value,expires_at) values(?,?,?,?) on conflict(id) do update set encrypted_value=excluded.encrypted_value",
            a.getId(),connection,value,Timestamp.from(c.expiresAt()));
        for(Token t:tokens) {
            String hash=hash(t.value);
            if(t.type.equals("refresh_token")) db.update("update mcp_oauth_token_lookup set consumed=true where authorization_id=? and token_type='refresh_token' and token_hash<>?",a.getId(),hash);
            db.update("insert into mcp_oauth_token_lookup(token_hash,token_type,authorization_id,expires_at) values(?,?,?,?) on conflict(token_hash) do nothing",
                hash,t.type,a.getId(),Timestamp.from(t.expiresAt));
        }
    }
    @Override @Transactional(timeout=10)
    public void remove(OAuth2Authorization authorization) {
        var c=grants.find(UUID.fromString(authorization.getPrincipalName()),true); grants.revokeLocked(c,"oauth_revocation");
    }
    @Override @Transactional(timeout=10)
    public OAuth2Authorization findById(String id) {
        var rows=db.queryForList("select encrypted_value from mcp_oauth_authorizations where id=?",String.class,id);
        if(rows.isEmpty())return null;
        try {
            Data d=json.readValue(reveal(rows.get(0)),Data.class);
            var client = clients.findById(d.client);
            if (client == null) return null;
            var c=grants.find(UUID.fromString(d.principal),true);
            if(c.revokedAt()!=null||!clock.instant().isBefore(c.expiresAt())) return null;
            // A refreshed token can retain or reduce permissions, never restore a reduced scope.
            Set<String> scopes=new HashSet<>(d.scopes);scopes.retainAll(c.scopes());
            var builder=OAuth2Authorization.withRegisteredClient(client).id(d.id).principalName(d.principal)
                .authorizationGrantType(new AuthorizationGrantType(d.grant)).authorizedScopes(scopes).attributes(map->map.putAll(read(d.attributes)));
            for(Token t:d.tokens) {
                OAuth2Token value=switch(t.type) {
                    case "code"->new OAuth2AuthorizationCode(t.value,t.issuedAt,t.expiresAt);
                    case "access_token"->new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER,t.value,t.issuedAt,t.expiresAt,t.scopes);
                    case "refresh_token"->new OAuth2RefreshToken(t.value,t.issuedAt,t.expiresAt);
                    default->throw new IllegalStateException("Unknown persisted OAuth token type");
                };
                builder.token(value,map->map.putAll(read(t.metadata)));
            }
            return builder.build();
        } catch(com.oriens.oriens_api.exception.WorkDomainException e) {return null;}
        catch(Exception e) {throw new IllegalStateException("Cannot load OAuth state",e);}
    }
    @Override @Transactional(timeout=10)
    public OAuth2Authorization findByToken(String token,OAuth2TokenType tokenType) {
        if(token==null||token.length()>4096)return null;
        var rows=db.queryForList("select l.authorization_id,l.token_type,l.consumed,a.connection_id from mcp_oauth_token_lookup l join mcp_oauth_authorizations a on a.id=l.authorization_id where l.token_hash=?",hash(token));
        if(rows.isEmpty())return null;
        var row=rows.get(0);String type=(String)row.get("token_type");
        if(tokenType!=null&&!type.equals(tokenType.getValue()))return null;
        var c=grants.find((UUID)row.get("connection_id"),true);
        if (clients.findByClientId(c.clientId()) == null) return null;
        if(c.revokedAt()!=null||!clock.instant().isBefore(c.expiresAt()))return null;
        // Re-read under the grant lock: a parallel rotation may have consumed this token while we waited.
        boolean consumed=Boolean.TRUE.equals(db.queryForObject("select consumed from mcp_oauth_token_lookup where token_hash=?",Boolean.class,hash(token)));
        if(type.equals("refresh_token")&&consumed) {grants.revokeLocked(c,"refresh_reuse");return null;}
        OAuth2Authorization authorization=findById((String)row.get("authorization_id"));
        // Retired access-token lookups are tombstones, not aliases for the family's new token.
        return authorization!=null && authorization.getToken(token)!=null ? authorization : null;
    }
    @Transactional(timeout=10)
    public McpStore.Delegated authenticate(String bearer, McpProperties properties) {
        OAuth2Authorization a=findByToken(bearer,OAuth2TokenType.ACCESS_TOKEN);
        if(a==null||a.getAccessToken()==null||!a.getAccessToken().isActive()||!a.getAccessToken().getToken().getTokenValue().equals(bearer)) throw McpStore.denied();
        Map<String,Object> claims=a.getAccessToken().getClaims();
        if(claims==null||!properties.base().equals(String.valueOf(claims.get("iss")))||!List.of(properties.resource()).equals(claims.get("aud"))) throw McpStore.denied();
        var c=grants.find(UUID.fromString(a.getPrincipalName()),true);grants.active(c);
        return new McpStore.Delegated(c.id(),c.userId(),c.clientId(),a.getAccessToken().getToken().getScopes());
    }
}
