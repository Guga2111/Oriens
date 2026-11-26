package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;
import com.oriens.oriens_api.service.TaskServiceImpl;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = WorkApiPostgresTest.App.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "JWT_SECRET=synthetic-home-only-not-a-production-secret-0123456789-abcdefghijklmnop",
    "spring.datasource.url=${P2_JDBC_URL}", "spring.datasource.username=postgres", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false", "spring.jpa.show-sql=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.task.scheduling.enabled=false"
})
@org.springframework.context.annotation.Import({com.oriens.oriens_api.controller.WorkHomeController.class, com.oriens.oriens_api.service.WorkHomeService.class})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "P2_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p2|mcp)_proof")
class WorkHomePostgresTest {
    @MockitoBean FileStorageService profileFiles;
    @MockitoBean FileStorageProjectService projectFiles;
    @MockitoBean TaskServiceImpl legacy;
    @MockitoBean java.time.Clock clock;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired Algorithm algorithm;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManagerFactory emf;
    String token, other;
    long owner;
    static final String LINKS = "/work/home/quick-links";
    static final String RECENTS = "/work/home/recents";
    static final String INPUT = "{\"name\":\"Projetos\",\"url\":\"/projects\"}";

    @BeforeEach void fixture() {
        var ticks = new java.util.concurrent.atomic.AtomicLong();
        org.mockito.Mockito.when(clock.instant()).thenAnswer(call -> java.time.Instant.parse("2026-11-24T12:00:00Z").plusMillis(ticks.incrementAndGet()));
        org.mockito.Mockito.when(clock.getZone()).thenReturn(java.time.ZoneOffset.UTC);
        org.mockito.Mockito.when(clock.withZone(org.mockito.ArgumentMatchers.any())).thenReturn(clock);
        User user = user(); owner = user.getId(); token = token(user); other = token(user());
    }
    User user() {
        User user = new User(); user.setName("Pessoa"); user.setEmail(UUID.randomUUID() + "@example.invalid"); user.setPassword("synthetic");
        return users.save(user);
    }
    String token(User user) {
        return "Bearer " + JWT.create().withSubject(user.getEmail()).withClaim("role", "ADMIN")
            .withExpiresAt(new Date(System.currentTimeMillis() + 600000)).sign(algorithm);
    }
    JsonNode request(MockHttpServletRequestBuilder builder, String body, int expected) throws Exception {
        String result = mvc.perform(builder.header("Authorization", token).header("Idempotency-Key", UUID.randomUUID().toString())
            .contentType("application/json").content(body)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return result.isBlank() ? json.nullNode() : json.readTree(result);
    }
    long project() throws Exception {
        return request(post("/project/user/" + owner), "{\"title\":\"Projeto recente\",\"mode\":\"SIMPLE\"}", 201).path("id").asLong();
    }
    long task() throws Exception {
        return request(post("/task/user/" + owner), "{\"title\":\"Tarefa recente\"}", 201).path("task").path("id").asLong();
    }
    void visit(String type, long id) throws Exception {
        request(post(RECENTS), "{\"type\":\"" + type + "\",\"resourceId\":" + id + "}", 204);
    }
    @Test void linksPersistEditAndDeleteWithVersionsAndOwnerIsolation() throws Exception {
        JsonNode link = request(post(LINKS), INPUT, 201);
        long id = link.path("id").asLong();
        assertThat(request(get(LINKS), "", 200)).hasSize(1);
        String mine = token; token = other;
        assertThat(request(get(LINKS), "", 200)).isEmpty();
        request(patch(LINKS + "/" + id).header("If-Match", "\"0\""), INPUT, 404);
        request(delete(LINKS + "/" + id).header("If-Match", "\"0\""), "", 404);
        token = mine;
        request(patch(LINKS + "/" + id), INPUT, 428);
        JsonNode changed = request(patch(LINKS + "/" + id).header("If-Match", "\"0\""), INPUT.replace("Projetos", "Meus projetos"), 200);
        assertThat(changed.path("version").asLong()).isEqualTo(1);
        request(patch(LINKS + "/" + id).header("If-Match", "\"0\""), INPUT, 409);
        request(delete(LINKS + "/" + id).header("If-Match", "\"0\""), "", 409);
        request(delete(LINKS + "/" + id).header("If-Match", "\"1\""), "", 204);
        assertThat(request(get(LINKS), "", 200)).isEmpty();
    }
    @Test void rejectsUnsafeMalformedOrUnknownDestinations() throws Exception {
        for (String url : new String[]{"javascript:alert(1)", "data:text/html,x", "//evil.test", "http://example.test", "https://name:pass@example.test", "/unknown", "/home/../auth", "/%2fexample.test"}) {
            request(post(LINKS), json.writeValueAsString(new com.oriens.oriens_api.entity.dto.work.WorkHome.LinkInput("Link", url)), 400);
        }
        request(post(LINKS), "{\"name\":\"\",\"url\":\"/home\"}", 400);
        request(post(LINKS), INPUT.replace("Projetos", "a".repeat(81)), 400);
        request(post(LINKS), INPUT.replace("/projects", "https://example.test/path?q=1"), 201);
        request(post(LINKS), INPUT.replace("/projects", "/tasks/project/12?tab=board"), 201);
        request(post(LINKS), "{\"name\":7,\"url\":\"/home\"}", 400);
        request(post(LINKS), "{\"name\":\"Link\",\"url\":\"/home\",\"owner\":1}", 400);
    }
    @Test void creationReplaysWithoutDuplicatingAndProtectsLimit() throws Exception {
        String key = UUID.randomUUID().toString();
        var builder = post(LINKS).header("Authorization", token).header("Idempotency-Key", key).contentType("application/json").content(INPUT);
        String first = mvc.perform(builder).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String second = mvc.perform(builder).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(first)).isEqualTo(json.readTree(second));
        mvc.perform(post(LINKS).header("Authorization", token).header("Idempotency-Key", key).contentType("application/json").content(INPUT.replace("Projetos", "Outro")))
            .andExpect(status().isConflict());
        for (int i = 1; i < 20; i++) request(post(LINKS), INPUT, 201);
        request(post(LINKS), INPUT, 400);
        assertThat(request(get(LINKS), "", 200)).hasSize(20);
    }
    @Test void recentsTrackActualOpensDeduplicateAndDoNotChangeVersions() throws Exception {
        long project = project(), task = task();
        assertThat(task).isPositive();
        assertThat(request(get(RECENTS), "", 200)).isEmpty();
        visit("PROJECT", project); visit("TASK", task); visit("PROJECT", project);
        JsonNode recent = request(get(RECENTS), "", 200);
        assertThat(recent).hasSize(2);
        assertThat(recent.get(0).path("type").asText()).isEqualTo("PROJECT");
        assertThat(request(get("/project/" + project), "", 200).path("version").asLong()).isZero();
        assertThat(request(get("/task/" + task), "", 200).path("version").asLong()).isZero();
        String mine = token; token = other;
        request(post(RECENTS), "{\"type\":\"PROJECT\",\"resourceId\":" + project + "}", 404);
        request(post(RECENTS), "{\"type\":\"TASK\",\"resourceId\":" + task + "}", 404);
        assertThat(request(get(RECENTS), "", 200)).isEmpty();
        token = mine;
        request(patch("/project/" + project + "/archive"), "{\"version\":0,\"archived\":true}", 200);
        assertThat(request(get(RECENTS), "", 200)).hasSize(1);
        request(delete("/task/" + task).header("If-Match", "\"0\""), "", 200);
        assertThat(request(get(RECENTS), "", 200)).isEmpty();
    }
    @Test void archivedProjectTasksDisappearAndInvalidVisitsAreRejected() throws Exception {
        JsonNode project = request(post("/project/user/" + owner), "{\"title\":\"Projeto\",\"mode\":\"DEVELOPMENT\"}", 201);
        long projectId = project.path("id").asLong();
        JsonNode task = request(post("/task/user/" + owner), "{\"title\":\"Tarefa\",\"projectId\":" + projectId + ",\"projectVersion\":" + project.path("version").asLong() + "}", 201).path("task");
        visit("TASK", task.path("id").asLong());
        JsonNode current = request(get("/project/" + projectId), "", 200);
        request(patch("/project/" + projectId + "/archive"), "{\"version\":" + current.path("version").asLong() + ",\"archived\":true}", 200);
        assertThat(request(get(RECENTS), "", 200)).isEmpty();
        request(post(RECENTS), "{\"type\":\"TASK\",\"resourceId\":" + task.path("id").asLong() + "}", 404);
        request(post(RECENTS), "{\"type\":\"PROJECT\",\"resourceId\":0}", 400);
        request(post(RECENTS), "{\"type\":\"OTHER\",\"resourceId\":1}", 400);
        request(post(RECENTS), "{\"type\":null,\"resourceId\":1}", 400);
        mvc.perform(get(RECENTS)).andExpect(status().isUnauthorized());
    }
    @Test void queriesStayBoundedAndReturnOnlyTenMostRecent() throws Exception {
        long project = project(); visit("PROJECT", project);
        var stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear(); request(get(RECENTS), "", 200); long one = stats.getPrepareStatementCount();
        for (int i = 0; i < 11; i++) visit("PROJECT", project());
        stats.clear(); JsonNode many = request(get(RECENTS), "", 200);
        assertThat(many).hasSize(10);
        assertThat(stats.getPrepareStatementCount()).isEqualTo(one);
        assertThat(one).isLessThanOrEqualTo(2);
    }
    @Test void concurrentVisitsAndLinkCreationsPreserveUniquenessAndLimit() throws Exception {
        long project = project();
        for (int i = 0; i < 19; i++) request(post(LINKS), INPUT, 201);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> create = () -> mvc.perform(post(LINKS).header("Authorization", token).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(INPUT)).andReturn().getResponse().getStatus();
            var creates = pool.invokeAll(java.util.List.of(create, create));
            assertThat(java.util.List.of(creates.get(0).get(), creates.get(1).get())).containsExactlyInAnyOrder(201, 400);
            Callable<Void> open = () -> { visit("PROJECT", project); return null; };
            for (var result : pool.invokeAll(java.util.List.of(open, open))) result.get();
        }
        assertThat(request(get(RECENTS), "", 200)).hasSize(1);
        assertThat(request(get(LINKS), "", 200)).hasSize(20);
    }
}
