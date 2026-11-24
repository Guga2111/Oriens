package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.entity.enums.ObjectiveStatus;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.FileStorageProjectService;
import com.oriens.oriens_api.service.FileStorageService;
import com.oriens.oriens_api.service.TaskServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = WorkApiPostgresTest.App.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "JWT_SECRET=synthetic-objectives-only-not-a-production-secret-0123456789-abcdefghijklmnop",
    "spring.datasource.url=${P2_JDBC_URL}", "spring.datasource.username=postgres", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false", "spring.jpa.show-sql=false",
    "spring.task.scheduling.enabled=false"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "P2_JDBC_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p2|mcp)_proof")
class ObjectiveDetailsPostgresTest {
    @MockitoBean FileStorageService profileFiles;
    @MockitoBean FileStorageProjectService projectFiles;
    @MockitoBean TaskServiceImpl legacy;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired Algorithm algorithm;
    String token, other;
    long projectId;

    @BeforeEach void fixture() throws Exception {
        User owner = user(); token = token(owner); other = token(user());
        projectId = request(post("/project/user/" + owner.getId()), "{\"title\":\"Entrega\",\"mode\":\"DEVELOPMENT\"}", 201).path("id").asLong();
    }
    User user() {
        User user = new User(); user.setName("Pessoa"); user.setEmail(UUID.randomUUID() + "@example.invalid"); user.setPassword("synthetic");
        return users.save(user);
    }
    String token(User user) {
        return "Bearer " + JWT.create().withSubject(user.getEmail()).withClaim("role", "ADMIN")
            .withExpiresAt(new Date(System.currentTimeMillis() + 120000)).sign(algorithm);
    }
    JsonNode request(MockHttpServletRequestBuilder builder, String body, int expected) throws Exception {
        return json.readTree(mvc.perform(builder.header("Authorization", token).header("Idempotency-Key", UUID.randomUUID().toString())
            .contentType("application/json").content(body)).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString());
    }
    JsonNode project() throws Exception { return request(get("/project/" + projectId), "", 200); }
    JsonNode create(String fields) throws Exception {
        return request(post("/project/" + projectId + "/objectives"), "{\"projectVersion\":" + project().path("version").asLong() + ",\"title\":\"Resultado\"" + fields + "}", 201).path("objective");
    }
    String url(JsonNode objective) { return "/project/" + projectId + "/objectives/" + objective.path("id").asLong(); }
    String patchBody(JsonNode objective, String fields) { return "{\"version\":" + objective.path("version").asLong() + fields + "}"; }

    @Test void createsDetailsAndPreservesAbsentFieldsWhenEditingStatus() throws Exception {
        JsonNode objective = create(",\"description\":\"Resultado esperado\",\"startDate\":\"2026-11-01\",\"dueDate\":\"2026-11-28\",\"status\":\"BACKLOG\"");
        assertThat(objective.path("description").asText()).isEqualTo("Resultado esperado");
        assertThat(objective.path("startDate").asText()).isEqualTo("2026-11-01");
        for (ObjectiveStatus state : ObjectiveStatus.values()) {
            objective = request(patch(url(objective)), patchBody(objective, ",\"status\":\"" + state + "\""), 200).path("objective");
            assertThat(objective.path("status").asText()).isEqualTo(state.name());
            assertThat(objective.path("description").asText()).isEqualTo("Resultado esperado");
            assertThat(objective.path("dueDate").asText()).isEqualTo("2026-11-28");
        }
        assertThat(project().path("objectives").get(0).path("startDate").asText()).isEqualTo("2026-11-01");
    }
    @Test void validatesMergedPeriodAndAllowsClearingOptionalFields() throws Exception {
        JsonNode objective = create(",\"startDate\":\"2026-11-10\",\"dueDate\":\"2026-11-20\",\"description\":\"Texto\"");
        request(patch(url(objective)), patchBody(objective, ",\"startDate\":\"2026-11-21\""), 422);
        request(patch(url(objective)), patchBody(objective, ",\"dueDate\":\"2026-11-09\""), 422);
        request(patch(url(objective)), patchBody(objective, ",\"startDate\":\"2026-02-30\""), 400);
        request(patch(url(objective)), patchBody(objective, ",\"description\":\"" + "a".repeat(10001) + "\""), 422);
        request(patch(url(objective)), patchBody(objective, ",\"status\":null"), 422);
        JsonNode cleared = request(patch(url(objective)), patchBody(objective, ",\"startDate\":null,\"description\":null"), 200).path("objective");
        assertThat(cleared.path("startDate").isNull()).isTrue();
        assertThat(cleared.path("description").isNull()).isTrue();
        assertThat(cleared.path("dueDate").asText()).isEqualTo("2026-11-20");
        assertThat(cleared.path("status").asText()).isEqualTo("PENDING");
    }
    @Test void rejectsInvalidCreationAndAcceptsEqualOrPartialDates() throws Exception {
        request(post("/project/" + projectId + "/objectives"), "{\"projectVersion\":" + project().path("version").asLong() + ",\"title\":\"Inválido\",\"startDate\":\"2026-11-20\",\"dueDate\":\"2026-11-10\"}", 422);
        create(",\"startDate\":\"2026-11-20\",\"dueDate\":\"2026-11-20\"");
        create(",\"startDate\":\"2026-11-20\"");
        create(",\"dueDate\":\"2026-11-20\"");
        assertThat(project().path("objectives")).hasSize(3);
    }
    @Test void enforcesOwnerAndVersionForNewFields() throws Exception {
        JsonNode objective = create(",\"description\":\"Original\"");
        String owner = token; token = other;
        request(patch(url(objective)), patchBody(objective, ",\"description\":\"Intrusão\",\"status\":\"PAUSED\""), 404);
        request(post("/project/" + projectId + "/objectives"), "{\"projectVersion\":0,\"title\":\"Intrusão\",\"description\":\"Texto\"}", 404);
        mvc.perform(delete(url(objective)).header("Authorization", token).header("If-Match", "\"0\"").header("X-Project-Version", "0"))
            .andExpect(status().isNotFound());
        token = owner;
        request(patch(url(objective)), patchBody(objective, ",\"description\":\"Atualizada\""), 200);
        request(patch(url(objective)), patchBody(objective, ",\"startDate\":\"2026-11-20\""), 409);
        JsonNode stored = project().path("objectives").get(0);
        assertThat(stored.path("description").asText()).isEqualTo("Atualizada");
        assertThat(stored.path("startDate").isNull()).isTrue();
    }
    @Test void pinsObjectiveForOwnerOnlyWithVersion() throws Exception {
        JsonNode objective = create("");
        assertThat(objective.path("favorite").asBoolean()).isFalse();
        String owner = token; token = other;
        request(patch(url(objective)), patchBody(objective, ",\"favorite\":true"), 404);
        token = owner;
        request(patch(url(objective)), patchBody(objective, ",\"favorite\":null"), 422);
        JsonNode pinned = request(patch(url(objective)), patchBody(objective, ",\"favorite\":true"), 200).path("objective");
        assertThat(pinned.path("favorite").asBoolean()).isTrue();
        assertThat(pinned.path("position").asInt()).isEqualTo(objective.path("position").asInt());
        request(patch(url(objective)), patchBody(objective, ",\"favorite\":false"), 409);
        assertThat(project().path("objectives").get(0).path("favorite").asBoolean()).isTrue();
    }
    @Test void summariesConsiderAllActiveStatesButExcludeTerminalStates() throws Exception {
        for (ObjectiveStatus state : ObjectiveStatus.values()) create(",\"dueDate\":\"2026-11-01\",\"status\":\"" + state + "\"");
        JsonNode summary = project().path("summary");
        assertThat(summary.path("overdueObjectiveCount").asInt()).isEqualTo(4);
        assertThat(summary.path("completedObjectives").asInt()).isEqualTo(1);
        assertThat(summary.path("nextObjective").path("status").asText()).isEqualTo("BACKLOG");
        // Cancelled objectives leave the denominator, as cancelled tasks do.
        assertThat(summary.path("totalObjectives").asInt()).isEqualTo(ObjectiveStatus.values().length - 1);
    }
    @Test void projectWithOnlyConcludedAndCancelledObjectivesIsComplete() throws Exception {
        create(",\"status\":\"CONCLUDED\"");
        create(",\"status\":\"CANCELLED\"");
        JsonNode summary = project().path("summary");
        assertThat(summary.path("totalObjectives").asInt()).isEqualTo(1);
        assertThat(summary.path("completedObjectives").asInt()).isEqualTo(1);
    }
    @Test void creationReplaysAndDetectsChangesToNewFields() throws Exception {
        String key = UUID.randomUUID().toString();
        String body = "{\"projectVersion\":" + project().path("version").asLong() + ",\"title\":\"Entrega\",\"description\":\"Texto\",\"status\":\"PAUSED\"}";
        var first = mvc.perform(post("/project/" + projectId + "/objectives").header("Authorization", token).header("Idempotency-Key", key).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var replay = mvc.perform(post("/project/" + projectId + "/objectives").header("Authorization", token).header("Idempotency-Key", key).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(replay)).isEqualTo(json.readTree(first));
        mvc.perform(post("/project/" + projectId + "/objectives").header("Authorization", token).header("Idempotency-Key", key).contentType("application/json").content(body.replace("Texto", "Outro")))
            .andExpect(status().isConflict());
    }
}
