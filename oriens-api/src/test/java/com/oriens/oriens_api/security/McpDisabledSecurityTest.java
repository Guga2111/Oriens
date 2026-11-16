package com.oriens.oriens_api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.mcp.McpSecurity;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers=McpDisabledSecurityTest.Probe.class,properties={
 "JWT_SECRET=synthetic-disabled-mcp-test-only-0123456789-abcdefghijklmnopqrstuvwxyz",
 "oriens.mcp.enabled=false"})
@Import({McpDisabledSecurityTest.Probe.class,SecurityConfig.class,JwtConfiguration.class,McpSecurity.class})
class McpDisabledSecurityTest {
 @RestController static class Probe {
  @GetMapping("/ordinary-proof") String ordinary(){return "ok";}
  @GetMapping("/mcp") String reserved(){return "unreachable";}
 }
 @MockBean CustomAuthManager manager;@MockBean UserServiceImpl users;
 @Autowired MockMvc mvc;@Autowired Algorithm algorithm;
 @Test void disabledMcpNeverFallsThroughToJwtRestAndNeedsNoMcpSecret()throws Exception{
  String jwt="Bearer "+JWT.create().withSubject("synthetic@example.invalid").withClaim("role","USER").withExpiresAt(Instant.now().plusSeconds(60)).sign(algorithm);
  mvc.perform(get("/ordinary-proof").header("Authorization",jwt)).andExpect(status().isOk());
  mvc.perform(get("/ordinary-proof")).andExpect(status().isUnauthorized());
  mvc.perform(get("/mcp").header("Authorization",jwt)).andExpect(status().isNotFound());
  mvc.perform(get("/oauth2/authorize").header("Authorization",jwt)).andExpect(status().isNotFound());
 }
}
