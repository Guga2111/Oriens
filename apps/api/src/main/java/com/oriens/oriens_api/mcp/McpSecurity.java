package com.oriens.oriens_api.mcp;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.authorization.authentication.*;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.*;
import java.time.Clock;
import java.util.*;

@Configuration(proxyBeanMethods=false)
public class McpSecurity {
    private static final String[] RESERVED={"/mcp","/mcp/**","/oauth2/**","/integrations/mcp/**","/.well-known/oauth-authorization-server","/.well-known/oauth-protected-resource","/.well-known/oauth-protected-resource/**"};
    @Bean @Order(0) @ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="false",matchIfMissing=true)
    SecurityFilterChain mcpDisabled(HttpSecurity http) throws Exception {
        return http.securityMatcher(RESERVED).cors(Customizer.withDefaults()).csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Do not error-dispatch to /error: that would enter the general JWT chain
            // and turn this reserved endpoint's 404 into a 401 on a real servlet server.
            .authorizeHttpRequests(a->a.anyRequest().denyAll()).exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->s.setStatus(404))).build();
    }
    @Bean @ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
    McpFlows mcpFlows(org.springframework.jdbc.core.JdbcTemplate db,McpProperties p,McpAuthorizations auth,McpStore store,McpRateLimiter limits,Clock clock,
            OAuth2AuthorizationCodeRequestAuthenticationProvider provider,RegisteredClientRepository clients) {
        return new McpFlows(db,p,auth,store,limits,clock,provider,clients);
    }
    @Bean @Order(0) @ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
    SecurityFilterChain mcpOAuth(HttpSecurity http,McpProperties props,McpFlows flows,RegisteredClientRepository clients,
            McpAuthorizations auth,McpStore store,PlatformTransactionManager transactions,OAuth2AuthorizationCodeRequestAuthenticationProvider requests) throws Exception {
        http.securityMatcher("/oauth2/**","/.well-known/oauth-authorization-server").cors(Customizer.withDefaults())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(c->c.ignoringRequestMatchers("/oauth2/token","/oauth2/revoke"))
            .requestCache(c->c.disable())
            .authorizeHttpRequests(a->a.requestMatchers("/oauth2/token","/oauth2/revoke","/.well-known/oauth-authorization-server").permitAll().requestMatchers("/oauth2/authorize").authenticated().anyRequest().denyAll())
            .oauth2AuthorizationServer(c->c.authorizationEndpoint(a->a
                .authorizationCodeRequestAuthenticationValidator(ctx->McpConfiguration.validateCodeRequest(ctx,props))
                .authenticationProviders(ps->{
                    ps.removeIf(p->p instanceof OAuth2AuthorizationCodeRequestAuthenticationProvider);ps.add(0,requests);
                }))
                .authorizationServerMetadataEndpoint(m->m.authorizationServerMetadataCustomizer(b->b
                    .claim("authorization_response_iss_parameter_supported",true)
                    .claims(claims->{
                        claims.remove("device_authorization_endpoint");claims.remove("introspection_endpoint");claims.remove("pushed_authorization_request_endpoint");
                        claims.put("grant_types_supported",List.of("authorization_code","refresh_token"));
                        claims.put("code_challenge_methods_supported",List.of("S256"));
                    })
                    .tokenEndpointAuthenticationMethods(methods->{methods.clear();methods.add("none");})
                    .tokenRevocationEndpointAuthenticationMethods(methods->{methods.clear();methods.add("none");})))
                .clientAuthentication(a->a.authenticationConverters(converters->converters.add(0,request->{
                    boolean refresh=request.getRequestURI().equals("/oauth2/token")&&"refresh_token".equals(request.getParameter("grant_type"));
                    boolean revoke=request.getRequestURI().equals("/oauth2/revoke");
                    if(!refresh&&!revoke)return null;
                    String id=request.getParameter("client_id");
                    if(!"POST".equals(request.getMethod())||id==null||request.getParameterValues("client_id").length!=1
                            ||request.getHeader("Authorization")!=null||request.getParameter("client_secret")!=null)throw new OAuth2AuthenticationException("invalid_client");
                    return new OAuth2ClientAuthenticationToken(id,ClientAuthenticationMethod.NONE,null,Map.of("oriens_public",true));
                })).authenticationProviders(providers->providers.add(0,new AuthenticationProvider(){
                    public boolean supports(Class<?> type){return OAuth2ClientAuthenticationToken.class.isAssignableFrom(type);}
                    public Authentication authenticate(Authentication input){
                        var token=(OAuth2ClientAuthenticationToken)input;
                        if(!Boolean.TRUE.equals(token.getAdditionalParameters().get("oriens_public")))return null;
                        var client=clients.findByClientId(token.getPrincipal().toString());
                        if(client==null||!client.getClientAuthenticationMethods().contains(ClientAuthenticationMethod.NONE))throw new OAuth2AuthenticationException("invalid_client");
                        return new OAuth2ClientAuthenticationToken(client,ClientAuthenticationMethod.NONE,null);
                    }
                })))
                .tokenEndpoint(t->t.authenticationProviders(providers->providers.replaceAll(p->McpConfiguration.transactional(p,transactions,auth,store,props))))
                .tokenRevocationEndpoint(t->t.authenticationProviders(providers->providers.replaceAll(p->McpConfiguration.transactional(p,transactions,auth,store,props)))))
            .exceptionHandling(e->e.authenticationEntryPoint((request,response,failure)->{
                if(!"/oauth2/authorize".equals(request.getRequestURI())){response.sendError(401);return;}
                try {
                    UUID id=flows.begin(request,response);
                    response.setHeader("Cache-Control","no-store");response.setHeader("Referrer-Policy","no-referrer");
                    response.sendRedirect(props.frontend().toString().replaceAll("/$", "")+"/config?mcpFlow="+id);
                }catch(com.oriens.oriens_api.exception.WorkDomainException ex){response.setStatus(ex.getCode().equals("RATE_LIMITED")?429:400);}
            }));
        // Resource indicators must match the single configured MCP audience. No untrusted Host-derived URLs.
        http.addFilterBefore(new OncePerRequestFilter(){
            protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
                if(request.getRequestURI().equals("/oauth2/token")) {
                    var resources=request.getParameterValues("resource");
                    if(resources==null||resources.length!=1||!props.resource().equals(resources[0])) {
                        response.setStatus(400);response.setContentType("application/json");response.getWriter().write("{\"error\":\"invalid_target\"}");return;
                    }
                }
                if(request.getQueryString()!=null&&request.getQueryString().length()>8192||request.getContentLengthLong()>262144){response.sendError(413);return;}
                chain.doFilter(request,response);
            }
        },org.springframework.security.web.context.SecurityContextHolderFilter.class);
        return http.build();
    }
    @Bean @Order(1) @ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
    SecurityFilterChain mcpResource(HttpSecurity http,McpProperties props,McpAuthorizations auth,McpRateLimiter limits) throws Exception {
        return http.securityMatcher("/mcp","/mcp/**","/.well-known/oauth-protected-resource","/.well-known/oauth-protected-resource/**")
            .csrf(c->c.disable()).cors(Customizer.withDefaults()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(new OncePerRequestFilter(){
                protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException {
                    if(request.getRequestURI().startsWith("/.well-known/")){chain.doFilter(request,response);return;}
                    String origin=request.getHeader("Origin");
                    if(origin!=null&&!origin.equals(props.frontend().toString().replaceAll("/$", ""))){response.sendError(403);return;}
                    try {
                        String bearer=new org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver().resolve(request);
                        if(bearer==null||Collections.list(request.getHeaders("Authorization")).size()!=1)throw McpStore.denied();
                        var principal=auth.authenticate(bearer,props);
                        // Transport extracts this immutable value before any SDK executor switch.
                        if(!limits.acquire(Map.of("protocol:connection:"+principal.connectionId(),600,"protocol:account:"+principal.userId(),1000))) {
                            response.setStatus(429);response.setHeader("Retry-After",String.valueOf(60-java.time.Instant.now().getEpochSecond()%60));return;
                        }
                        request.setAttribute("oriens.mcp.principal",principal);
                        var authentication=UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of());
                        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(authentication);
                    }catch(com.oriens.oriens_api.exception.WorkDomainException | OAuth2AuthenticationException denied){
                        response.setStatus(401);response.setHeader("WWW-Authenticate","Bearer resource_metadata=\""+props.base()+"/.well-known/oauth-protected-resource/mcp\"");return;
                    }catch(RuntimeException unavailable){
                        response.setStatus(503);response.setHeader("X-Request-Id",UUID.randomUUID().toString());return;
                    }
                    if(request.getContentLengthLong()>262144){response.sendError(413);return;}
                    byte[] body=request.getInputStream().readNBytes(262145);
                    if(body.length>262144){response.sendError(413);return;}
                    var wrapped=new HttpServletRequestWrapper(request){
                        public ServletInputStream getInputStream(){
                            var input=new ByteArrayInputStream(body);
                            return new ServletInputStream(){public int read(){return input.read();}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener listener){throw new UnsupportedOperationException();}};
                        }
                        public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),java.nio.charset.StandardCharsets.UTF_8));}
                    };
                    chain.doFilter(wrapped,response);
                }
            },AnonymousAuthenticationFilter.class)
            .authorizeHttpRequests(a->a.requestMatchers("/.well-known/oauth-protected-resource","/.well-known/oauth-protected-resource/**").permitAll().anyRequest().authenticated()).build();
    }
}
