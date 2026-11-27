package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import tools.jackson.databind.*;
import com.oriens.oriens_api.controller.*;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.mcp.*;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.security.*;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes=McpPostgresTest.App.class,webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT,properties={
 "JWT_SECRET=synthetic-mcp-only-not-a-production-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
 "spring.datasource.url=${MCP_JDBC_URL}","spring.datasource.username=postgres","spring.datasource.password=",
 "spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false","spring.jpa.show-sql=false",
 "server.port=${MCP_HTTP_PORT:8764}","management.server.port=0","oriens.mcp.enabled=true","oriens.mcp.issuer=http://127.0.0.1:${MCP_HTTP_PORT:8764}","oriens.mcp.frontend=http://127.0.0.1:${MCP_FRONTEND_PORT:5173}",
 "oriens.mcp.encryption-password=synthetic-encryption-password-only-1234567890","oriens.mcp.encryption-salt=0123456789abcdef0123456789abcdef",
 "oriens.mcp.codex-redirects=http://127.0.0.1/callback","oriens.mcp.claude-redirects=http://localhost:8765/callback",
 "spring.task.scheduling.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="MCP_JDBC_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_mcp_proof")
class McpPostgresTest {
 @Configuration(proxyBeanMethods=false) @EnableAutoConfiguration @EntityScan(basePackageClasses=User.class)
 @EnableJpaRepositories(basePackageClasses=UserRepository.class)
 @Import({com.oriens.oriens_api.CorsConfig.class,McpConfiguration.class,McpSecurity.class,McpTransport.class,McpController.class,McpMaintenance.class,
     SecurityConfig.class,JwtConfiguration.class,WorkOwner.class,UserServiceImpl.class,CustomAuthManager.class,
     WorkExceptionHandler.class,WorkRequestBodyAdvice.class,ProjectWorkService.class,ProjectActivityService.class,WorkReadService.class,
     TaskDescriptionCodec.class,TaskAttachmentService.class,TaskAttachmentController.class,
     WorkCreationService.class,TaskLabelService.class,ScopedWorkReadService.class,ProjectController.class,TaskController.class,TagController.class,TagServiceImpl.class,FinancialEntryController.class,FinancialEntryServiceImpl.class,FinancialStatisticsService.class,RecurringFinancialService.class,com.oriens.oriens_api.mapper.FinancialMapper.class})
 static class App {
  @Bean BCryptPasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
  @Bean Clock clock(){return Clock.systemUTC();}
  @Bean FileStorageProjectService projectFiles(){return org.mockito.Mockito.mock(FileStorageProjectService.class);}
 }
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired McpStore store;@Autowired UserRepository users;
 @Autowired JdbcTemplate db;@Autowired Algorithm algorithm;@Autowired PlatformTransactionManager manager;
 @Autowired McpAuthorizations authorizations;@Autowired McpProperties properties;@Autowired McpRateLimiter limits;
 long owner,other;String jwt,otherJwt;
 @BeforeEach void fixture(){
  User a=user(),b=user();owner=a.getId();other=b.getId();jwt=jwt(a);otherJwt=jwt(b);
  db.update("delete from mcp_rate_windows");
 }
 User user(){var u=new User();u.setName("MCP sintético");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setPassword(new BCryptPasswordEncoder().encode("synthetic-password"));return users.save(u);}
 String jwt(User u){return "Bearer "+JWT.create().withSubject(u.getEmail()).withClaim("userId",u.getId()).withClaim("username",u.getName()).withClaim("role","USER").withExpiresAt(Instant.now().plusSeconds(600)).sign(algorithm);}
 JsonNode body(MvcResult r)throws Exception{return json.readTree(r.getResponse().getContentAsString());}
 String str(Object v)throws Exception{return json.writeValueAsString(v);}
 record Flow(UUID id,Cookie cookie,String verifier,String callback,String client){}
 Flow begin(Set<String> scopes,String client)throws Exception{
  String verifier=UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
  String challenge=Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
  String callback=client.equals("oriens-codex")?"http://127.0.0.1:54321/callback":"http://localhost:8765/callback";
  var result=mvc.perform(get("/oauth2/authorize").queryParam("response_type","code").queryParam("client_id",client).queryParam("redirect_uri",callback)
      .queryParam("scope",String.join(" ",scopes)).queryParam("state","synthetic-state").queryParam("resource",properties.resource())
      .queryParam("code_challenge",challenge).queryParam("code_challenge_method","S256")).andExpect(status().is3xxRedirection()).andReturn();
  String location=result.getResponse().getRedirectedUrl();assertThat(location).startsWith(properties.frontend()+"/config?mcpFlow=").doesNotContain(jwt);
  UUID id=UUID.fromString(location.substring(location.indexOf('=')+1));String cookie=result.getResponse().getHeader("Set-Cookie").split(";",2)[0];
  return new Flow(id,new Cookie(cookie.substring(0,cookie.indexOf('=')),cookie.substring(cookie.indexOf('=')+1)),verifier,callback,client);
 }
 String approve(Flow f,Set<String> scopes,Set<Long> projects)throws Exception{
  mvc.perform(get("/integrations/mcp/authorization-requests/"+f.id).header("Authorization",jwt).cookie(f.cookie)).andExpect(status().isOk());
  var decision=Map.of("version",0,"approve",true,"name","Teste MCP","scopes",scopes,"allowedProjectIds",projects,"allowStandaloneTasks",false);
  String redirect=body(mvc.perform(post("/integrations/mcp/authorization-requests/"+f.id+"/decision").cookie(f.cookie).header("Authorization",jwt).header("Origin",properties.frontend().toString())
      .contentType("application/json").content(str(decision))).andExpect(status().isOk()).andReturn()).path("redirectUrl").asText();
  assertThat(redirect).contains("state=synthetic-state","iss=");
  return org.springframework.web.util.UriComponentsBuilder.fromUriString(redirect).build().getQueryParams().getFirst("code");
 }
 JsonNode exchange(Flow f,String code)throws Exception{
  return body(mvc.perform(post("/oauth2/token").contentType("application/x-www-form-urlencoded").param("client_id",f.client).param("grant_type","authorization_code")
      .param("resource",properties.resource()).param("redirect_uri",f.callback).param("code_verifier",f.verifier).param("code",code)).andExpect(status().isOk()).andReturn());
 }
 JsonNode grant(Set<String> scopes)throws Exception{var f=begin(scopes,"oriens-codex");return exchange(f,approve(f,scopes,Set.of()));}
 MvcResult refresh(String token,int expected,String...scopes)throws Exception{
  var request=post("/oauth2/token").contentType("application/x-www-form-urlencoded").param("client_id","oriens-codex").param("grant_type","refresh_token").param("refresh_token",token).param("resource",properties.resource());
  if(scopes.length>0)request.param("scope",String.join(" ",scopes));return mvc.perform(request).andExpect(status().is(expected)).andReturn();
 }
 MvcResult rpc(String token,String method,String params,int status)throws Exception{
  return mvc.perform(post("/mcp").header("Authorization",token).header("Accept","application/json, text/event-stream").contentType("application/json")
      .content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\""+method+"\",\"params\":"+params+"}")).andExpect(status().is(status)).andReturn();
 }
 @Test void publicPkcePersistentRotationAndBoundary()throws Exception{
  var scopes=Set.of("mcp:context","offline_access");var tokens=grant(scopes);
  String access=tokens.path("access_token").asText(),refresh=tokens.path("refresh_token").asText();assertThat(refresh).isNotBlank();
  rpc(jwt,"tools/list","{}",401);
  mvc.perform(get("/integrations/mcp/connections").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
  var init=body(rpc("Bearer "+access,"initialize","{\"protocolVersion\":\"2025-06-18\",\"capabilities\":{},\"clientInfo\":{\"name\":\"synthetic\",\"version\":\"1\"}}",200));
  assertThat(init.path("result").path("serverInfo").path("name").asText()).isEqualTo("oriens");
  assertThat(body(rpc("Bearer "+access,"tools/list","{}",200)).path("result").path("tools")).hasSize(1);
  var context=body(rpc("Bearer "+access,"tools/call","{\"name\":\"oriens_get_context\",\"arguments\":{}}",200)).path("result").path("structuredContent");
  assertThat(context.path("data").path("scopes")).hasSize(2);
  assertThat(db.queryForList("select encrypted_value from mcp_oauth_authorizations",String.class)).allSatisfy(v->assertThat(v).doesNotContain(access,refresh,jwt));
  var next=body(refresh(refresh,200));assertThat(next.path("refresh_token").asText()).isNotEqualTo(refresh);
  refresh(refresh,400);rpc("Bearer "+next.path("access_token").asText(),"tools/list","{}",401);
 }
 @Test void noOfflineAccessNoRefreshAndNoUnknownTool()throws Exception{
  var token=grant(Set.of("mcp:context"));assertThat(token.has("refresh_token")).isFalse();
  assertThat(body(rpc("Bearer "+token.path("access_token").asText(),"tools/call","{\"name\":\"arbitrary_sql\",\"arguments\":{}}",200)).has("error")).isTrue();
 }
 @Test void consentBindingScopeValidationAndOneUse()throws Exception{
  var scopes=Set.of("mcp:context");var f=begin(scopes,"oriens-codex");
  mvc.perform(get("/integrations/mcp/authorization-requests/"+f.id).header("Authorization",jwt)).andExpect(status().is4xxClientError());
  mvc.perform(get("/integrations/mcp/authorization-requests/"+f.id).cookie(f.cookie).header("Authorization",jwt)).andExpect(status().isOk());
  mvc.perform(get("/integrations/mcp/authorization-requests/"+f.id).cookie(f.cookie).header("Authorization",otherJwt)).andExpect(status().isNotFound());
  String code=approve(f,scopes,Set.of());exchange(f,code);
  mvc.perform(get("/integrations/mcp/authorization-requests/"+f.id).cookie(f.cookie).header("Authorization",jwt)).andExpect(status().isNotFound());
  mvc.perform(post("/oauth2/token").contentType("application/x-www-form-urlencoded").param("client_id",f.client).param("grant_type","authorization_code")
      .param("resource",properties.resource()).param("redirect_uri",f.callback).param("code_verifier",f.verifier).param("code",code)).andExpect(status().is4xxClientError());
 }
 @Test void reductionRefreshConflictAndRevocationSurviveRepositoryRecreation()throws Exception{
  var token=grant(Set.of("mcp:context","offline_access","finance:read"));
  var persisted=authorizations.findByToken(token.path("access_token").asText(),org.springframework.security.oauth2.server.authorization.OAuth2TokenType.ACCESS_TOKEN);
  assertThat(String.valueOf(persisted.getAccessToken().getClaims().get("iss"))).isEqualTo(properties.base());
  assertThat(persisted.getAccessToken().getClaims().get("aud")).isEqualTo(List.of(properties.resource()));
  var delegated=authorizations.authenticate(token.path("access_token").asText(),properties);var c=store.find(delegated.connectionId(),false);
  mvc.perform(get("/integrations/mcp/connections/"+c.id()).header("Authorization",otherJwt)).andExpect(status().isNotFound());
  var reduced=store.patch(owner,c.id(),c.version(),null,Set.of("mcp:context","offline_access"),null,null);
  boolean allowed=store.withPolicy(delegated,p->p.scopes().contains("finance:read"));assertThat(allowed).isFalse();
  refresh(token.path("refresh_token").asText(),400,"mcp:context","offline_access","finance:read");
  var next=body(refresh(token.path("refresh_token").asText(),200));assertThat(next.path("scope").asText()).doesNotContain("finance:read");
  assertThatThrownBy(()->store.patch(owner,c.id(),c.version(),"Lost update",null,null,null)).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
  mvc.perform(patch("/integrations/mcp/connections/"+c.id()).header("Authorization",jwt).contentType("application/json").content("{\"version\":"+reduced.version()+",\"scopes\":[\"mcp:context\",\"offline_access\",\"finance:read\"]}"))
      .andExpect(status().isConflict()).andExpect(jsonPath("code").value("REAUTHORIZATION_REQUIRED"));
  store.revoke(owner,c.id(),reduced.version());store.revoke(owner,c.id(),null);
  var another=new McpStore(db,Clock.systemUTC());assertThat(another.find(c.id(),false).revokedAt()).isNotNull();
  rpc("Bearer "+next.path("access_token").asText(),"tools/list","{}",401);
 }
 @Test void defaultDenyOwnerForeignKeysAndPolicyVersions()throws Exception{
  var c=store.create(owner,"oriens-codex","Restricted",Set.of("mcp:context"),Set.of(),false);
  var delegated=new McpStore.Delegated(c.id(),owner,"oriens-codex",Set.of("mcp:context","finance:read"));
  assertThatThrownBy(()->store.withPolicy(delegated,p->{p.require("finance:read");return true;})).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
  Long project=db.queryForObject("insert into project(user_id,title,mode,last_accessed) values(?,'Foreign','SIMPLE',now()) returning id",Long.class,other);
  assertThatThrownBy(()->db.update("insert into mcp_connection_projects values(?,?,?)",c.id(),owner,project)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  assertThatThrownBy(()->db.update("insert into mcp_connection_projects values(?,?,?)",c.id(),other,project)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  assertThatThrownBy(()->store.create(owner,"oriens-codex","Invalid",Set.of("mcp:context","finance:update"),Set.of(),false)).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
  var rename=store.patch(owner,c.id(),c.version(),"Renamed",null,null,null);assertThat(rename.policyRevision()).isEqualTo(c.policyRevision());
 }
 @Test void concurrentManagementAndRefresh()throws Exception{
  var token=grant(Set.of("mcp:context","offline_access"));String refresh=token.path("refresh_token").asText();
  var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
  try{
   Callable<Integer> run=()->{start.await();return mvc.perform(post("/oauth2/token").contentType("application/x-www-form-urlencoded").param("client_id","oriens-codex").param("grant_type","refresh_token").param("refresh_token",refresh).param("resource",properties.resource())).andReturn().getResponse().getStatus();};
   var a=pool.submit(run);var b=pool.submit(run);start.countDown();assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,400);
   rpc("Bearer "+token.path("access_token").asText(),"tools/list","{}",401);
  }finally{pool.shutdownNow();}
 }
 @Test void strictManagementAndSharedLimits()throws Exception{
  var c=store.create(owner,"oriens-codex","Strict",Set.of("mcp:context"),Set.of(),false);
  for(String value:List.of("{\"version\":0,\"name\":null}","{\"version\":0,\"name\":\"A\",\"name\":\"B\"}","{\"version\":0,\"unknown\":true}","{\"version\":\"0\"}"))
   mvc.perform(patch("/integrations/mcp/connections/"+c.id()).header("Authorization",jwt).contentType("application/json").content(value)).andExpect(status().isBadRequest());
  assertThat(limits.acquire(Map.of("synthetic",1))).isTrue();assertThat(limits.acquire(Map.of("synthetic",1))).isFalse();
  assertThat(db.queryForObject("select count(*) from mcp_rate_windows where bucket='synthetic'",Integer.class)).isEqualTo(1);
 }
 @Test void invalidPkceRedirectResourceAndExpiredGrants()throws Exception{
  for(String callback:List.of("https://attacker.invalid/callback","http://127.0.0.2:54321/callback","http://127.0.0.1:54321/other")){
   mvc.perform(get("/oauth2/authorize").queryParam("response_type","code").queryParam("client_id","oriens-codex").queryParam("redirect_uri",callback)
     .queryParam("scope","mcp:context").queryParam("resource",properties.resource()).queryParam("code_challenge","A".repeat(43)).queryParam("code_challenge_method","S256")).andExpect(status().isBadRequest());
  }
  var scopes=Set.of("mcp:context","offline_access");var f=begin(scopes,"oriens-codex");String code=approve(f,scopes,Set.of());
  mvc.perform(post("/oauth2/token").contentType("application/x-www-form-urlencoded").param("client_id",f.client).param("grant_type","authorization_code").param("code",code)
    .param("code_verifier","X".repeat(64)).param("redirect_uri",f.callback).param("resource",properties.resource())).andExpect(status().is4xxClientError());
  var token=exchange(f,code);String bearer=token.path("access_token").asText();
  var a=authorizations.findByToken(bearer,org.springframework.security.oauth2.server.authorization.OAuth2TokenType.ACCESS_TOKEN);
  var expired=new org.springframework.security.oauth2.core.OAuth2AccessToken(org.springframework.security.oauth2.core.OAuth2AccessToken.TokenType.BEARER,bearer,Instant.now().minusSeconds(901),Instant.now().minusSeconds(1),a.getAccessToken().getToken().getScopes());
  authorizations.save(org.springframework.security.oauth2.server.authorization.OAuth2Authorization.from(a).token(expired,m->m.putAll(a.getAccessToken().getMetadata())).build());
  rpc("Bearer "+bearer,"tools/list","{}",401);
  db.update("update mcp_connections set authorized_at=now()-interval '31 days',expires_at=now()-interval '1 second' where id=?",UUID.fromString(a.getPrincipalName()));
  refresh(token.path("refresh_token").asText(),400);
 }
 @Test void revocationSerializesWithAuthorizedOperation()throws Exception{
  var c=store.create(owner,"oriens-codex","Race",Set.of("mcp:context"),Set.of(),false);
  var d=new McpStore.Delegated(c.id(),owner,c.clientId(),c.scopes());var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
  try{
   var operation=pool.submit(()->store.withPolicy(d,p->{entered.countDown();try{if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("timeout");}catch(InterruptedException e){throw new IllegalStateException(e);}store.audit(owner,c.id(),"synthetic_operation","SUCCESS");return true;}));
   assertThat(entered.await(5,TimeUnit.SECONDS)).isTrue();var revocation=pool.submit(()->store.revoke(owner,c.id(),c.version()));
   assertThatThrownBy(()->revocation.get(150,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
   release.countDown();assertThat(operation.get(5,TimeUnit.SECONDS)).isTrue();assertThat(revocation.get(5,TimeUnit.SECONDS).revokedAt()).isNotNull();
   assertThatThrownBy(()->store.withPolicy(d,p->true)).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
  }finally{release.countDown();pool.shutdownNow();}
 }
 @Test void auditIsAtomicAndReadFailureReturnsNoData()throws Exception{
  var tokens=grant(Set.of("mcp:context"));String bearer=tokens.path("access_token").asText();var d=authorizations.authenticate(bearer,properties);
  db.execute("create function mcp_test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'synthetic audit unavailable'; end $$");
  db.execute("create trigger mcp_test_audit_failure before insert on mcp_audit_events for each row execute function mcp_test_audit_failure()");
  try{
   assertThatThrownBy(()->store.withPolicy(d,p->{db.update("update mcp_connections set name='Must rollback' where id=?",d.connectionId());store.audit(owner,d.connectionId(),"synthetic_write","SUCCESS");return true;})).isInstanceOf(org.springframework.dao.DataAccessException.class);
   assertThat(store.find(d.connectionId(),false).name()).isEqualTo("Teste MCP");
   var denied=body(rpc("Bearer "+bearer,"tools/call","{\"name\":\"oriens_get_context\",\"arguments\":{}}",200)).path("result");
   assertThat(denied.path("isError").asBoolean()).isTrue();assertThat(denied.has("structuredContent")).isFalse();
   assertThat(denied.toString()).contains("INTERNAL_ERROR").doesNotContain("synthetic audit unavailable","insert into","Teste MCP");
  }finally{db.execute("drop trigger mcp_test_audit_failure on mcp_audit_events");db.execute("drop function mcp_test_audit_failure()");}
 }
 @Test @EnabledIfEnvironmentVariable(named="MCP_CLIENT_PROOF",matches="1")
 void actualClientsWithoutInference()throws Exception{
  var command=new ProcessBuilder("python3","../../scripts/mcp-account/client_proof.py");
  command.environment().put("MCP_PROOF_JWT",jwt);command.environment().put("MCP_PROOF_ISSUER",properties.base());
  command.environment().put("MCP_PROOF_FRONTEND",properties.frontend().toString());
  var process=command.redirectErrorStream(true).start();
  try {
   assertThat(process.waitFor(150,TimeUnit.SECONDS)).isTrue();
   String output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);
   assertThat(process.exitValue()).withFailMessage("CLI proof failed: %s",output).isZero();
   var evidence=json.readTree(java.nio.file.Path.of("target/mcp-client-proof.json").toFile());
   assertThat(evidence.path("codex").path("toolCall").asBoolean()).isTrue();
   if("1".equals(System.getenv("MCP_P2_PROOF"))) {
    assertThat(evidence.path("codex").path("domainReplay").asBoolean()).isTrue();
    assertThat(evidence.path("claude").path("domainToolCall").asBoolean()).isTrue();
    assertThat(db.queryForObject("select count(*) from tasks where user_id=? and title='Tarefa sintética via cliente P2'",Long.class,owner)).isEqualTo(2);
   }
   assertThat(db.queryForObject("select count(*) from mcp_audit_events a join mcp_connections c on a.connection_id=c.id where c.user_id=? and c.name='CLI sintético' and a.action='oriens_get_context' and a.result='SUCCESS'",Long.class,owner)).isPositive();
  } finally {if(process.isAlive())process.destroyForcibly();}
 }
 @Autowired McpMaintenance maintenance;
 @Test void retentionDoesNotEraseLiveRefreshTombstones()throws Exception{
  var tokens=grant(Set.of("mcp:context","offline_access"));var d=authorizations.authenticate(tokens.path("access_token").asText(),properties);
  refresh(tokens.path("refresh_token").asText(),200);
  db.update("update mcp_audit_events set occurred_at=now()-interval '91 days' where connection_id=?",d.connectionId());
  maintenance.cleanup();assertThat(db.queryForObject("select count(*) from mcp_audit_events where connection_id=?",Long.class,d.connectionId())).isZero();
  assertThat(db.queryForObject("select count(*) from mcp_oauth_token_lookup where token_hash=? and consumed",Long.class,McpAuthorizations.hash(tokens.path("refresh_token").asText()))).isEqualTo(1);
 }
 @Autowired org.springframework.core.env.Environment environment;
 @Test void restartAndSecondInstanceShareAuthorizationAndRevocation()throws Exception{
  var tokens=grant(Set.of("mcp:context","offline_access"));String token=tokens.path("access_token").asText();
  var delegated=authorizations.authenticate(token,properties);
  Map<String,Object> settings=new HashMap<>();
  for(String key:List.of("JWT_SECRET","spring.datasource.url","spring.datasource.username","spring.datasource.password","oriens.mcp.enabled","oriens.mcp.issuer","oriens.mcp.frontend","oriens.mcp.encryption-password","oriens.mcp.encryption-salt","oriens.mcp.codex-redirects","oriens.mcp.claude-redirects"))settings.put(key,environment.getRequiredProperty(key));
  settings.put("server.port",0);settings.put("management.server.port",0);settings.put("spring.jpa.hibernate.ddl-auto","validate");settings.put("spring.jpa.open-in-view",false);settings.put("spring.main.banner-mode","off");
  // Independent full application instances: deterministic client registration and key survive restart.
  try(var second=new org.springframework.boot.builder.SpringApplicationBuilder(App.class).properties(settings).run()){
   var fresh=second.getBean(McpAuthorizations.class);assertThat(fresh.authenticate(token,properties).userId()).isEqualTo(owner);
   var c=store.find(delegated.connectionId(),false);store.revoke(owner,c.id(),c.version());
   assertThatThrownBy(()->fresh.authenticate(token,properties)).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
  }
  try(var restarted=new org.springframework.boot.builder.SpringApplicationBuilder(App.class).properties(settings).run()){
   assertThatThrownBy(()->restarted.getBean(McpAuthorizations.class).authenticate(token,properties)).isInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class);
   refresh(tokens.path("refresh_token").asText(),400);
  }
 }
 @Test void loginMetadataAndRevocationOfRetiredToken()throws Exception{
  var user=users.findById(owner).orElseThrow();
  mvc.perform(post("/authenticate").contentType("application/json").content(str(Map.of("email",user.getEmail(),"password","synthetic-password"))))
    .andExpect(status().isOk()).andExpect(header().exists("Authorization"));
  var metadata=body(mvc.perform(get("/.well-known/oauth-authorization-server")).andExpect(status().isOk()).andReturn());
  assertThat(metadata.path("issuer").asText()).isEqualTo(properties.base());assertThat(metadata.has("registration_endpoint")).isFalse();
  assertThat(metadata.path("grant_types_supported")).hasSize(2);assertThat(metadata.path("code_challenge_methods_supported").toString()).isEqualTo("[\"S256\"]");
  var token=grant(Set.of("mcp:context","offline_access"));var next=body(refresh(token.path("refresh_token").asText(),200));
  mvc.perform(post("/oauth2/revoke").contentType("application/x-www-form-urlencoded").param("client_id","oriens-codex").param("token",token.path("access_token").asText())).andExpect(status().isOk());
  rpc("Bearer "+next.path("access_token").asText(),"tools/list","{}",200);
  mvc.perform(post("/oauth2/revoke").contentType("application/x-www-form-urlencoded").param("client_id","oriens-codex").param("token",next.path("refresh_token").asText())).andExpect(status().isOk());
  rpc("Bearer "+next.path("access_token").asText(),"tools/list","{}",401);
 }
 @Test @EnabledIfEnvironmentVariable(named="MCP_BROWSER_PROOF",matches="1")
 void realBrowserCrossOriginBridge()throws Exception{
  var command=new ProcessBuilder("node","../../scripts/mcp-account/browser_proof.mjs");
  command.environment().put("MCP_PROOF_JWT",jwt);command.environment().put("MCP_PROOF_ISSUER",properties.base());command.environment().put("MCP_PROOF_FRONTEND",properties.frontend().toString());
  var process=command.redirectErrorStream(true).start();
  try{assertThat(process.waitFor(60,TimeUnit.SECONDS)).isTrue();String output=new String(process.getInputStream().readAllBytes(),StandardCharsets.UTF_8);assertThat(process.exitValue()).withFailMessage("Browser proof failed: %s",output).isZero();}
  finally{if(process.isAlive())process.destroyForcibly();}
 }
 @Test void concurrentPermissionEditsHaveExactlyOneWinner()throws Exception{
  var c=store.create(owner,"oriens-codex","Before",Set.of("mcp:context"),Set.of(),false);var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
  try{
   Callable<String> edit=()->{start.await();try{store.patch(owner,c.id(),c.version(),"Edited",null,null,null);return "SUCCESS";}catch(com.oriens.oriens_api.exception.WorkDomainException e){return e.getCode();}};
   var a=pool.submit(edit);var b=pool.submit(edit);start.countDown();assertThat(List.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS))).containsExactlyInAnyOrder("SUCCESS","VERSION_CONFLICT");
   assertThat(store.find(c.id(),false).version()).isEqualTo(1);
  }finally{pool.shutdownNow();}
 }
 @Test void deletionRemovesAllowlistWithoutNewPolicyAndAccountCredentials()throws Exception{
  Long project=db.queryForObject("insert into project(user_id,title,mode) values(?,'Synthetic allowlist','SIMPLE') returning id",Long.class,owner);
  var c=store.create(owner,"oriens-codex","Allowlist",Set.of("mcp:context","projects:read"),Set.of(project),false);
  db.update("delete from project where id=?",project);var after=store.find(c.id(),false);
  assertThat(after.allowedProjectIds()).isEmpty();assertThat(after.policyRevision()).isEqualTo(c.policyRevision());
  var token=grant(Set.of("mcp:context","offline_access"));db.update("delete from users where id=?",owner);
  assertThat(db.queryForObject("select count(*) from mcp_connections where user_id=?",Long.class,owner)).isZero();
  rpc("Bearer "+token.path("access_token").asText(),"tools/list","{}",401);
 }
 @Test void declinedExpiredAndExpandedConsentNeverCreatesGrant()throws Exception{
  var flow=begin(Set.of("mcp:context"),"oriens-codex");
  String endpoint="/integrations/mcp/authorization-requests/"+flow.id;
  mvc.perform(post(endpoint+"/decision").cookie(flow.cookie).header("Authorization",jwt).header("Origin",properties.frontend().toString()).contentType("application/json")
   .content(str(Map.of("version",0,"approve",true,"name","Forbidden expansion","scopes",Set.of("mcp:context","finance:read"),"allowedProjectIds",Set.of(),"allowStandaloneTasks",false)))).andExpect(status().isBadRequest());
  var declined=body(mvc.perform(post(endpoint+"/decision").cookie(flow.cookie).header("Authorization",jwt).header("Origin",properties.frontend().toString()).contentType("application/json")
   .content("{\"version\":0,\"approve\":false}")).andExpect(status().isOk()).andReturn());
  assertThat(declined.path("redirectUrl").asText()).contains("error=access_denied");
  var expired=begin(Set.of("mcp:context"),"oriens-codex");db.update("update mcp_authorization_flows set expires_at=now()-interval '1 second' where id=?",expired.id);
  mvc.perform(get("/integrations/mcp/authorization-requests/"+expired.id).cookie(expired.cookie).header("Authorization",jwt)).andExpect(status().isNotFound());
  assertThat(db.queryForObject("select count(*) from mcp_connections where user_id=?",Long.class,owner)).isZero();
 }
}
