package com.oriens.oriens_api.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.server.authorization.authentication.*;
import org.springframework.security.oauth2.server.authorization.web.authentication.OAuth2AuthorizationCodeRequestAuthenticationConverter;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

/** Browser proof uses only an opaque HttpOnly cookie plus the existing explicit JWT header.
 * The cookie is correlation, never authentication, and cannot approve or retrieve a code by itself. */
public class McpFlows {
    public static final String COOKIE="oriens_mcp_browser";
    private final JdbcTemplate db;private final McpProperties props;private final McpAuthorizations auth;
    private final McpStore grants;private final McpRateLimiter limits;private final Clock clock;
    private final OAuth2AuthorizationCodeRequestAuthenticationProvider provider;
    private final ObjectMapper json=new ObjectMapper();
    public McpFlows(JdbcTemplate db,McpProperties props,McpAuthorizations auth,McpStore grants,McpRateLimiter limits,Clock clock,
            OAuth2AuthorizationCodeRequestAuthenticationProvider provider) {
        this.db=db;this.props=props;this.auth=auth;this.grants=grants;this.limits=limits;this.clock=clock;this.provider=provider;
    }
    record Request(String client,String redirect,String state,Set<String> scopes,Map<String,Object> additional) {}
    public record Decision(Long version,Boolean approve,String name,Set<String> scopes,Set<Long> allowedProjectIds,Boolean allowStandaloneTasks) {}
    public record Summary(UUID id,long version,String clientId,String clientName,Set<String> requestedScopes,Instant expiresAt) {}
    private static String cookie(HttpServletRequest request,UUID id) {
        if(request.getCookies()!=null) for(var c:request.getCookies()) if(c.getName().equals(COOKIE+"_"+id))return c.getValue();
        throw McpStore.denied();
    }
    @Transactional(timeout=10)
    public UUID begin(HttpServletRequest request,HttpServletResponse response) {
        var input=(OAuth2AuthorizationCodeRequestAuthenticationToken)new OAuth2AuthorizationCodeRequestAuthenticationConverter().convert(request);
        if(input==null)throw McpStore.invalid("Solicitação OAuth inválida.");
        // The same provider validates both the unauthenticated request and its authenticated continuation.
        provider.authenticate(input);
        if(!limits.acquire(Map.of("authorize:"+McpAuthorizations.hash(request.getRemoteAddr()+":"+input.getClientId()),10)))
            throw new com.oriens.oriens_api.exception.WorkDomainException("RATE_LIMITED",null,"Aguarde antes de tentar novamente.");
        UUID id=UUID.randomUUID();
        String browser=new org.springframework.security.crypto.keygen.Base64StringKeyGenerator(Base64.getUrlEncoder().withoutPadding(),32).generateKey();
        var c=org.springframework.http.ResponseCookie.from(COOKIE+"_"+id,browser).httpOnly(true).secure("https".equals(props.issuer().getScheme()))
            .sameSite("Lax").path("/integrations/mcp/authorization-requests/"+id).maxAge(Duration.ofMinutes(10)).build();
        response.addHeader("Set-Cookie",c.toString());
        Request flow=new Request(input.getClientId(),input.getRedirectUri(),input.getState(),input.getScopes(),input.getAdditionalParameters());
        String value;
        try{value=auth.protect(json.writeValueAsString(flow));}catch(Exception e){throw new IllegalStateException("Cannot persist OAuth flow",e);}
        db.update("insert into mcp_authorization_flows(id,browser_hash,encrypted_request,expires_at) values(?,?,?,?)",id,McpAuthorizations.hash(browser),value,Timestamp.from(clock.instant().plusSeconds(600)));
        return id;
    }
    private Map<String,Object> locked(long owner,UUID id,HttpServletRequest request) {
        var rows=db.queryForList("select * from mcp_authorization_flows where id=? for update",id);
        if(rows.isEmpty())throw McpStore.missing();var row=rows.get(0);
        if(!McpAuthorizations.hash(cookie(request,id)).equals(row.get("browser_hash")) || row.get("completed_at")!=null
                || !clock.instant().isBefore(((Timestamp)row.get("expires_at")).toInstant()))throw McpStore.missing();
        if(row.get("user_id")!=null && ((Number)row.get("user_id")).longValue()!=owner)throw McpStore.missing();
        db.update("update mcp_authorization_flows set user_id=? where id=?",owner,id);return row;
    }
    private Request data(Map<String,Object> row) {
        try{return json.readValue(auth.reveal((String)row.get("encrypted_request")),Request.class);}
        catch(Exception e){throw new IllegalStateException("Cannot load OAuth flow",e);}
    }
    @Transactional(timeout=10)
    public Summary summary(long owner,UUID id,HttpServletRequest request) {
        var row=locked(owner,id,request);var r=data(row);
        return new Summary(id,((Number)row.get("version")).longValue(),r.client,r.client.equals("oriens-codex")?"Codex":"Claude Code",r.scopes,((Timestamp)row.get("expires_at")).toInstant());
    }
    @Transactional(timeout=10)
    public Map<String,String> decide(long owner,UUID id,Decision decision,HttpServletRequest request) {
        // Authorization is a header, not a cookie. Require the known frontend Origin as an additional CSRF boundary.
        if(!props.frontend().toString().replaceAll("/$", "").equals(request.getHeader("Origin")))throw McpStore.denied();
        var row=locked(owner,id,request);var r=data(row);
        if(decision.version==null)throw new com.oriens.oriens_api.exception.WorkDomainException("PRECONDITION_REQUIRED","version","Informe a versão do fluxo.");
        if(decision.version<0||decision.version!=((Number)row.get("version")).longValue())throw new com.oriens.oriens_api.exception.WorkDomainException("VERSION_CONFLICT","version","A solicitação mudou.");
        if(decision.approve==null)throw McpStore.invalid("Informe sua decisão.");
        var redirect=UriComponentsBuilder.fromUriString(r.redirect);
        if(Boolean.TRUE.equals(decision.approve)) {
            if(decision.scopes==null||decision.allowedProjectIds==null||decision.allowStandaloneTasks==null||!r.scopes.containsAll(decision.scopes))
                throw McpStore.invalid("Selecione somente permissões solicitadas pelo cliente.");
            var c=grants.create(owner,r.client,decision.name,decision.scopes,decision.allowedProjectIds,decision.allowStandaloneTasks);
            var principal=UsernamePasswordAuthenticationToken.authenticated(c.id().toString(),null,List.of());
            var input=new OAuth2AuthorizationCodeRequestAuthenticationToken(props.base()+"/oauth2/authorize",r.client,principal,r.redirect,r.state,decision.scopes,r.additional);
            var previous=org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder.getContext();
            OAuth2AuthorizationCodeRequestAuthenticationToken output;
            try {
                org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder.setContext(
                    new org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContext() {
                        public String getIssuer(){return props.base();}
                        public org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings getAuthorizationServerSettings(){
                            return org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings.builder().issuer(props.base()).build();
                        }
                    });
                output=(OAuth2AuthorizationCodeRequestAuthenticationToken)provider.authenticate(input);
            } finally {
                if(previous==null) org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder.resetContext();
                else org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder.setContext(previous);
            }
            redirect.queryParam("code",output.getAuthorizationCode().getTokenValue());
        } else {redirect.queryParam("error","access_denied");grants.audit(owner,null,"authorization_declined","DENIED");}
        if(r.state!=null)redirect.queryParam("state",r.state);
        redirect.queryParam("iss",props.base());
        db.update("update mcp_authorization_flows set completed_at=?,version=version+1 where id=?",Timestamp.from(clock.instant()),id);
        return Map.of("redirectUrl",redirect.build().encode().toUriString());
    }
}
