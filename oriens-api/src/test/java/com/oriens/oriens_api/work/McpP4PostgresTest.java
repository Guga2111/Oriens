package com.oriens.oriens_api.work;

import com.oriens.oriens_api.mcp.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** P4 inherits all previous MCP, OAuth and finance invariants, on disposable PostgreSQL. */
class McpP4PostgresTest extends McpP3PostgresTest {
    @Test void isolatedReleaseFlagRollbackPreservesGrantsSchemaAndNormalLogin()throws Exception {
        var tokens=grant(Set.of("mcp:context","offline_access"));String token=tokens.path("access_token").asText();
        var delegated=authorizations.authenticate(token,properties);var connection=store.find(delegated.connectionId(),false);
        Map<String,Object> settings=new HashMap<>();
        for(String key:List.of("JWT_SECRET","spring.datasource.url","spring.datasource.username","spring.datasource.password"))settings.put(key,environment.getRequiredProperty(key));
        settings.put("server.port",0);settings.put("management.server.port",0);settings.put("spring.jpa.hibernate.ddl-auto","validate");settings.put("spring.jpa.open-in-view",false);settings.put("spring.main.banner-mode","off");
        settings.put("oriens.mcp.enabled",false);
        var http=java.net.http.HttpClient.newHttpClient();
        try(var disabled=new org.springframework.boot.builder.SpringApplicationBuilder(App.class).properties(settings).run()) {
            int port=((org.springframework.boot.web.server.servlet.context.ServletWebServerApplicationContext)disabled).getWebServer().getPort();
            String base="http://127.0.0.1:"+port;
            for(String path:List.of("/mcp","/.well-known/oauth-authorization-server","/integrations/mcp/connections")) {
                var response=http.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+path)).header("Authorization",jwt).GET().build(),java.net.http.HttpResponse.BodyHandlers.ofString());
                assertThat(response.statusCode()).isEqualTo(404);
            }
            var login=http.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+"/authenticate")).header("Content-Type","application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(str(Map.of("email",users.findById(owner).orElseThrow().getEmail(),"password","synthetic-password")))).build(),java.net.http.HttpResponse.BodyHandlers.ofString());
            assertThat(login.statusCode()).isEqualTo(200);assertThat(login.headers().firstValue("Authorization")).isPresent();
        }
        assertThat(store.find(connection.id(),false)).isEqualTo(connection);
        for(String key:List.of("oriens.mcp.issuer","oriens.mcp.frontend","oriens.mcp.encryption-password","oriens.mcp.encryption-salt","oriens.mcp.codex-redirects","oriens.mcp.claude-redirects"))settings.put(key,environment.getRequiredProperty(key));
        settings.put("oriens.mcp.enabled",true);
        try(var enabled=new org.springframework.boot.builder.SpringApplicationBuilder(App.class).properties(settings).run()) {
            assertThat(enabled.getBean(McpAuthorizations.class).authenticate(token,properties).connectionId()).isEqualTo(connection.id());
        }
    }

    @Test void managementNamesOnlyOwnedSelectedProjectsAndOtherClientsNeedRegistration()throws Exception {
        var p=project("Planejamento P4");var hidden=project("Fora da seleção P4");
        db.update("update project set archived=true where id=?",p.getId());
        var c=store.create(owner,"oriens-codex","Revisão semanal",Set.of("mcp:context","projects:read"),Set.of(p.getId()),false);
        var detail=body(mvc.perform(get("/integrations/mcp/connections/"+c.id()).header("Authorization",jwt)).andExpect(status().isOk()).andReturn());
        assertThat(detail.path("allowedProjects")).hasSize(1);
        assertThat(detail.path("allowedProjects").get(0).path("title").asText()).isEqualTo(p.getTitle());
        assertThat(detail.path("allowedProjects").get(0).path("archived").asBoolean()).isTrue();
        assertThat(detail.toString()).doesNotContain(hidden.getTitle(),"Descrição sintética");
        mvc.perform(get("/integrations/mcp/connections/"+c.id()).header("Authorization",otherJwt)).andExpect(status().isNotFound());
        var history=body(mvc.perform(get("/integrations/mcp/connections/"+c.id()+"/events").header("Authorization",jwt)).andExpect(status().isOk()).andReturn());
        assertThat(history.path("items")).hasSize(1);assertThat(history.path("items").get(0).path("action").asText()).isEqualTo("authorization");
        var setup=body(mvc.perform(get("/integrations/mcp/setup").param("client","other").header("Authorization",jwt)).andExpect(status().isOk()).andReturn());
        assertThat(setup.path("registrationRequired").asBoolean()).isTrue();assertThat(setup.has("clientId")).isFalse();
        assertThat(setup.path("resource").asText()).isEqualTo(properties.resource());
    }

    @Test @EnabledIfEnvironmentVariable(named="MCP_P4_BROWSER_PROOF",matches="1")
    void productionSettingsConsentManagementAndReleaseSmoke()throws Exception {
        var project=project("Planejamento P4");var archived=project("Arquivo P4");
        db.update("update project set archived=true where id=?",archived.getId());
        var scopes=Set.of("mcp:context","offline_access","projects:read","tasks:read","tasks:create","tasks:update","finance:read","finance:create");
        var c=store.create(owner,"oriens-codex","Revisão semanal",scopes,Set.of(project.getId(),archived.getId()),true);
        for(int i=0;i<7;i++)store.audit(owner,c.id(),"oriens_get_context",i==0?"DENIED":"SUCCESS");
        var expired=store.create(owner,"oriens-claude-code","Autorização expirada",Set.of("mcp:context"),Set.of(),false);
        db.update("update mcp_connections set created_at=now()-interval '31 days',authorized_at=now()-interval '31 days',expires_at=now()-interval '1 second' where id=?",expired.id());
        var revoked=store.create(owner,"oriens-claude-code","Autorização revogada",Set.of("mcp:context"),Set.of(),false);
        store.revoke(owner,revoked.id(),0L);
        var runner=new ProcessBuilder("node","ops/mcp-account/p4_live_proof.mjs").inheritIO();
        runner.environment().put("MCP_PROOF_ISSUER",properties.base());runner.environment().put("MCP_PROOF_FRONTEND",properties.frontend().toString());
        runner.environment().put("MCP_PROOF_JWT",jwt);runner.environment().put("MCP_PROOF_USER",Long.toString(owner));
        runner.environment().put("MCP_PROOF_EMAIL",users.findById(owner).orElseThrow().getEmail());
        runner.environment().put("MCP_PROOF_CONNECTION",c.id().toString());
        var process=runner.start();boolean ended=process.waitFor(240,TimeUnit.SECONDS);
        if(!ended)process.destroyForcibly();assertThat(ended).as("P4 production browser proof completed").isTrue();assertThat(process.exitValue()).isZero();
        assertThat(store.find(c.id(),false).revokedAt()).isNotNull();
    }
}
