package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.*;
import com.oriens.oriens_api.controller.*;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.repository.*;
import com.oriens.oriens_api.security.*;
import com.oriens.oriens_api.security.manager.CustomAuthManager;
import com.oriens.oriens_api.service.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real JWT filter, MVC binding, principal lookup, transaction services and baseline PostgreSQL. */
@SpringBootTest(classes=WorkApiPostgresTest.App.class, properties={
    "spring.datasource.url=${P2_JDBC_URL}", "spring.datasource.username=postgres", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false", "spring.jpa.show-sql=false",
    "spring.jpa.properties.hibernate.jdbc.time_zone=UTC", "spring.task.scheduling.enabled=false"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="P2_JDBC_URL", matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_p2_proof")
class WorkApiPostgresTest {
    @Configuration(proxyBeanMethods=false) @org.springframework.boot.test.context.TestComponent @EnableAutoConfiguration
    @EntityScan(basePackageClasses=Project.class)
    @EnableJpaRepositories(basePackageClasses=ProjectRepository.class)
    @Import({ProjectController.class, TaskController.class, StatisticsController.class, WorkExceptionHandler.class,
        WorkRequestBodyAdvice.class, WorkOwner.class, WorkReadService.class, WorkCreationService.class,
        ProjectWorkService.class, SecurityConfig.class})
    static class App {
        @Bean Clock clock() { return Clock.fixed(Instant.parse("2026-11-14T02:30:00Z"), ZoneOffset.UTC); }
    }
    @MockBean CustomAuthManager authManager;
    @MockBean UserServiceImpl userService;
    @MockBean TaskServiceImpl legacy;
    @MockBean StatisticsService statistics;
    @MockBean FileStorageProjectService files;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired ProjectRepository projects;
    @Autowired TaskRepository tasks;
    @Autowired ProjectColumnRepository columns;
    @Autowired CreationReceiptRepository receipts;
    @Autowired WorkCreationService creation;
    @Autowired PlatformTransactionManager manager;
    @Autowired EntityManager em;
    Long owner, stranger;
    String token, other;
    <T> T tx(Supplier<T> action) { return new TransactionTemplate(manager).execute(status -> action.get()); }
    @BeforeEach void fixtures() {
        User a = user(), b = user(); owner = a.getId(); stranger = b.getId(); token = jwt(a); other = jwt(b);
    }
    User user() {
        User u = new User(); u.setName("Pessoa"); u.setEmail(UUID.randomUUID()+"@example.invalid"); u.setPassword("synthetic");
        return users.save(u);
    }
    String jwt(User u) {
        return "Bearer " + JWT.create().withSubject(u.getEmail()).withClaim("role", "ADMIN")
            .withExpiresAt(new Date(System.currentTimeMillis()+60000)).sign(Algorithm.HMAC512(SecurityConstants.SECRET_KEY));
    }
    JsonNode body(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsString()); }
    MvcResult send(String method, String url, String value, String key, String who, int expected) throws Exception {
        var request = switch(method) { case "POST" -> post(url); case "PATCH" -> patch(url); case "PUT" -> put(url); default -> throw new IllegalArgumentException(); };
        request.header("Authorization", who).contentType("application/json").content(value);
        if (key != null) request.header("Idempotency-Key", key);
        return mvc.perform(request).andExpect(status().is(expected)).andReturn();
    }
    JsonNode project(String mode) throws Exception {
        return body(send("POST", "/project/user/"+owner, "{\"title\":\"Site pessoal\",\"mode\":\""+mode+"\"}", UUID.randomUUID().toString(), token,201));
    }
    JsonNode project(long id) throws Exception {
        return body(mvc.perform(get("/project/"+id).header("Authorization",token)).andExpect(status().isOk()).andReturn());
    }
    JsonNode task(JsonNode p) throws Exception {
        String value = "{\"title\":\"Montar formulário\",\"plannedDate\":\"2026-11-13\",\"dueDate\":\"2026-11-20\"";
        if (p != null) value += ",\"projectId\":"+p.path("id")+",\"projectVersion\":"+project(p.path("id").asLong()).path("version");
        return body(send("POST", "/task/user/"+owner, value+"}", UUID.randomUUID().toString(), token,201)).path("task");
    }
    JsonNode task(long id) throws Exception {
        return body(mvc.perform(get("/task/"+id).header("Authorization",token)).andExpect(status().isOk()).andReturn());
    }
    String version(JsonNode t, JsonNode p) throws Exception {
        return "\"version\":"+t.path("version")+(p==null ? "" : ",\"projectVersion\":"+project(p.path("id").asLong()).path("version"));
    }

    @Test void unauthenticatedExpiredAndCrossOwnerRequestsNeverDisclosePersonalData() throws Exception {
        mvc.perform(get("/project/user/1")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED")).andExpect(jsonPath("$.requestId").isString());
        mvc.perform(get("/task/user/1/all").header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        JsonNode p = project("DEVELOPMENT"), t = task(p);
        for (String url : List.of("/project/"+p.path("id"), "/project/"+p.path("id")+"/deletion-preview", "/task/"+t.path("id"),
                "/project/user/"+owner, "/project/user/"+owner+"/sidebar", "/task/user/"+owner+"/all", "/statistics/user/"+owner+"/dashboard"))
            mvc.perform(get(url).header("Authorization",other)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        send("PATCH", "/task/"+t.path("id"), "{"+version(t,p)+",\"title\":\"Invadida\"}",null,other,404);
        send("POST", "/task/user/"+stranger, "{\"title\":\"Invadida\",\"projectId\":"+p.path("id")+",\"projectVersion\":"+project(p.path("id").asLong()).path("version")+"}",UUID.randomUUID().toString(),other,404);
        mvc.perform(delete("/project/"+p.path("id")).header("Authorization",other).header("If-Match","\"0\"")).andExpect(status().isNotFound());
        mvc.perform(multipart("/project/"+p.path("id")+"/picture").file("projectImage",new byte[]{1}).with(r -> {r.setMethod("PUT");return r;})
            .header("Authorization",other).header("If-Match","\"0\"")).andExpect(status().isNotFound());
        JsonNode objective=body(send("POST","/project/"+p.path("id")+"/objectives",
            "{\"projectVersion\":"+project(p.path("id").asLong()).path("version")+",\"title\":\"Resultado\"}",UUID.randomUUID().toString(),token,201)).path("objective");
        String pv=project(p.path("id").asLong()).path("version").toString();
        for(String suffix:List.of("favorite","archive"))
            send("PATCH","/project/"+p.path("id")+"/"+suffix,"{\"version\":"+pv+",\""+(suffix.equals("favorite") ? "favorite" : "archived")+"\":true}",null,other,404);
        send("PATCH","/project/"+p.path("id"),"{\"version\":"+pv+",\"title\":\"Invadido\"}",null,other,404);
        send("PATCH","/project/"+p.path("id")+"/objectives/"+objective.path("id"),"{\"version\":0,\"title\":\"Invadido\"}",null,other,404);
        send("POST","/project/"+p.path("id")+"/objectives","{\"projectVersion\":"+pv+",\"title\":\"Invadido\"}",UUID.randomUUID().toString(),other,404);
        send("POST","/project/"+p.path("id")+"/columns","{\"projectVersion\":"+pv+",\"name\":\"Invadida\",\"kind\":\"PENDING\"}",UUID.randomUUID().toString(),other,404);
        send("PATCH","/project/"+p.path("id")+"/columns/"+p.path("defaultPendingColumnId"),"{\"projectVersion\":"+pv+",\"version\":0,\"name\":\"Invadida\"}",null,other,404);
        send("PATCH","/project/"+p.path("id")+"/board-defaults","{\"projectVersion\":"+pv+",\"pendingColumnId\":"+p.path("defaultPendingColumnId")+",\"completedColumnId\":"+p.path("defaultCompletedColumnId")+"}",null,other,404);
        send("POST","/project/"+p.path("id")+"/columns/"+p.path("defaultPendingColumnId")+"/remove","{\"projectVersion\":"+pv+"}",null,other,404);
        mvc.perform(delete("/project/"+p.path("id")+"/objectives/"+objective.path("id")).header("Authorization",other).header("If-Match","\"0\"").header("X-Project-Version",pv)).andExpect(status().isNotFound());
        mvc.perform(delete("/task/"+t.path("id")).header("Authorization",other).header("If-Match","\"0\"").header("X-Project-Version",pv)).andExpect(status().isNotFound());
        org.mockito.Mockito.verifyNoInteractions(files);
        assertThat(task(t.path("id").asLong()).path("title").asText()).isEqualTo("Montar formulário");
    }
    @Test void statusPlanningVersionAndSafeProjectionsHaveOneWritePath() throws Exception {
        JsonNode p=project("DEVELOPMENT"), t=task(p); long id=t.path("id").asLong();
        assertThat(t.has("user")).isFalse(); assertThat(t.has("reminderSent")).isFalse();
        mvc.perform(get("/task/"+id).header("Authorization",token)).andExpect(header().string("ETag","\"0\""));
        String patch="{"+version(t,p)+",\"status\":\"CONCLUDED\"}";
        JsonNode done=body(send("PATCH","/task/"+id,patch,null,token,200)).path("task");
        assertThat(done.path("columnId")).isEqualTo(p.path("defaultCompletedColumnId"));
        assertThat(done.path("completedAt").asText()).isEqualTo("2026-11-13");
        JsonNode repeated=body(send("PATCH","/task/"+id,"{"+version(done,p)+",\"status\":\"CONCLUDED\"}",null,token,200)).path("task");
        assertThat(repeated.path("completedAt")).isEqualTo(done.path("completedAt"));
        send("PATCH","/task/"+id,patch,null,token,409);
        send("PATCH","/task/"+id,"{\"version\":"+repeated.path("version")+",\"title\":\"Sem projeção\"}",null,token,428);
        JsonNode reopened=body(send("PATCH","/task/"+id,"{"+version(repeated,p)+",\"status\":\"PENDING\",\"plannedDate\":null}",null,token,200)).path("task");
        assertThat(reopened.path("completedAt").isNull()).isTrue(); assertThat(reopened.path("plannedDate").isNull()).isTrue();
        assertThat(reopened.path("dueDate").asText()).isEqualTo("2026-11-20");
        long doing=columns.findByProjectIdOrderByPositionAscIdAsc(p.path("id").asLong()).get(1).getId();
        JsonNode moved=body(send("PATCH","/task/"+id,"{"+version(reopened,p)+",\"columnId\":"+doing+"}",null,token,200)).path("task");
        assertThat(moved.path("status").asText()).isEqualTo("ON_DOING");
    }
    @Test void creationReplayCanonicalPayloadConflictsExpiredDeletedAndConcurrentKeys() throws Exception {
        String key=UUID.randomUUID().toString(), value="{\"title\":\"Ação\"}";
        MvcResult first=send("POST","/task/user/"+owner,value,key,token,201);
        MvcResult again=send("POST","/task/user/"+owner,"{\"priority\":\"MEDIUM\",\"title\":\" Ação \"}",key,token,201);
        assertThat(body(again)).isEqualTo(body(first)); assertThat(again.getResponse().getHeader("ETag")).isEqualTo(first.getResponse().getHeader("ETag"));
        send("POST","/task/user/"+owner,"{\"title\":\"Outra\"}",key,token,409);
        long id=body(first).path("task").path("id").asLong();
        mvc.perform(delete("/task/"+id).header("Authorization",token).header("If-Match","\"0\"")).andExpect(status().isOk());
        send("POST","/task/user/"+owner,value,key,token,410);
        String expired=UUID.randomUUID().toString(); send("POST","/task/user/"+owner,value,expired,token,201);
        tx(() -> { CreationReceipt r=receipts.findByUserIdAndOperationAndIdempotencyKey(owner,"task:create",UUID.fromString(expired)).orElseThrow();
            r.setCreatedAt(Instant.parse("2026-11-10T00:00:00Z")); r.setExpiresAt(Instant.parse("2026-11-11T00:00:00Z")); receipts.save(r); return null; });
        creation.cleanExpiredBodies(); send("POST","/task/user/"+owner,value,expired,token,410);
        String race=UUID.randomUUID().toString(); ExecutorService pool=Executors.newFixedThreadPool(2);
        try {
            CountDownLatch start=new CountDownLatch(1);
            Callable<JsonNode> action=() -> {start.await(); return body(send("POST","/task/user/"+owner,value,race,token,201));};
            Future<JsonNode> a=pool.submit(action), b=pool.submit(action); start.countDown();
            assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(b.get(10,TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
    }
    @Test void malformedBodiesOldWritersAndVersionHeadersCannotOverwriteNewState() throws Exception {
        JsonNode p=project("SIMPLE"), t=task(null); long id=t.path("id").asLong();
        send("PUT","/task/"+id,"{}",null,token,410); send("PUT","/project/"+p.path("id"),"{}",null,token,410);
        for(String url:List.of("/project/"+p.path("id")+"/objective/0", "/project/"+p.path("id")+"/unarchive"))
            send("PATCH",url,"{}",null,token,410);
        send("PATCH","/task/"+id,"{\"title\":\"Sem versão\"}",null,token,428);
        for(String value:List.of("{\"version\":0,\"userId\":1}", "{\"version\":0.5}", "{\"version\":\"0\"}",
                "{\"version\":0,\"dueDate\":\"2026-02-29\"}", "{\"version\":0,\"status\":4}", "{\"version\":0,\"version\":1}", "{\"version\":0,\"plannedDate\":[2026,11,13]}",
                "{\"version\":0,\"startTime\":\"24:00:00\"}", "{\"version\":0,\"startTime\":\"12:00\"}"))
            send("PATCH","/task/"+id,value,null,token,400);
        send("POST","/task/user/"+owner,"{\"title\":\"Sem chave\"}",null,token,428);
        send("POST","/task/user/"+owner,"{\"title\":\"Chave inválida\"}","bad",token,400);
        mvc.perform(patch("/task/"+id).header("Authorization",token).header("If-Match","\"9\"")
            .contentType("application/json").content("{\"version\":0}")).andExpect(status().isBadRequest());
        mvc.perform(delete("/task/"+id).header("Authorization",token).header("If-Match","*")).andExpect(status().isBadRequest());
        mvc.perform(delete("/task/"+id).header("Authorization",token)).andExpect(status().is(428));
        send("POST","/task/user/"+owner,"{\"title\":\" \",\"startTime\":\"12:00:00\"}",UUID.randomUUID().toString(),token,422);
    }
    @Test void objectivesConversionAndDeletionPreserveTasksAndRejectStalePreview() throws Exception {
        JsonNode p=project("SIMPLE"); long pid=p.path("id").asLong();
        String key=UUID.randomUUID().toString(), command="{\"projectVersion\":0,\"title\":\"Receber contatos\"}";
        JsonNode o=body(send("POST","/project/"+pid+"/objectives",command,key,token,201)).path("objective");
        JsonNode replay=body(send("POST","/project/"+pid+"/objectives",command,key,token,201)).path("objective"); assertThat(replay).isEqualTo(o);
        for(int i=0;i<2;i++) send("PATCH","/project/"+pid+"/mode","{\"version\":"+project(pid).path("version")+",\"mode\":\"DEVELOPMENT\"}",null,token,200);
        assertThat(columns.countByProjectId(pid)).isEqualTo(3);
        send("PATCH","/project/"+pid+"/mode","{\"version\":"+project(pid).path("version")+",\"mode\":\"SIMPLE\"}",null,token,422);
        JsonNode t=task(project(pid)); long tid=t.path("id").asLong();
        t=body(send("PATCH","/task/"+tid,"{"+version(t,p)+",\"objectiveId\":"+o.path("id")+"}",null,token,200)).path("task");
        JsonNode edited=body(send("PATCH","/project/"+pid+"/objectives/"+o.path("id"),"{\"version\":0,\"title\":\"Novo título\"}",null,token,200)).path("objective");
        assertThat(edited.path("status").asText()).isEqualTo("PENDING");
        mvc.perform(delete("/project/"+pid+"/objectives/"+o.path("id")).header("Authorization",token).header("If-Match","\""+edited.path("version").asLong()+"\"")
            .header("X-Project-Version",project(pid).path("version").asLong())).andExpect(status().isOk()).andExpect(jsonPath("$.detachedTaskCount").value(1));
        assertThat(task(tid).path("objectiveId").isNull()).isTrue();
        JsonNode preview=body(mvc.perform(get("/project/"+pid+"/deletion-preview").header("Authorization",token)).andExpect(status().isOk()).andReturn());
        task(project(pid));
        mvc.perform(delete("/project/"+pid).header("Authorization",token).header("If-Match","\""+preview.path("projectVersion").asLong()+"\"")).andExpect(status().isConflict());
        mvc.perform(delete("/project/"+pid).header("Authorization",token).header("If-Match","\""+project(pid).path("version").asLong()+"\"")).andExpect(status().isNoContent());
        JsonNode detached=task(tid); assertThat(detached.path("projectId").isNull()).isTrue(); assertThat(detached.path("plannedDate")).isEqualTo(t.path("plannedDate"));
        assertThat(detached.path("dueDate")).isEqualTo(t.path("dueDate")); assertThat(detached.path("status")).isEqualTo(t.path("status"));
        send("POST","/project/"+pid+"/objectives",command,key,token,410);
    }
    @Test void boardConfigurationReturnsStructuralVersionsAndRemovesColumnsAtomically() throws Exception {
        JsonNode p=project("DEVELOPMENT"); long pid=p.path("id").asLong(); JsonNode t=task(p);
        String key=UUID.randomUUID().toString();
        String value="{\"projectVersion\":"+project(pid).path("version")+",\"name\":\"Backlog\",\"kind\":\"PENDING\"}";
        JsonNode config=body(send("POST","/project/"+pid+"/columns",value,key,token,201));
        assertThat(config.path("columns").size()).isEqualTo(4);
        assertThat(body(send("POST","/project/"+pid+"/columns",value,key,token,201))).isEqualTo(config);
        JsonNode backlog=config.path("columns").get(3); long cid=backlog.path("id").asLong();
        send("PATCH","/project/"+pid+"/columns/"+p.path("defaultPendingColumnId"),
            "{\"version\":0,\"projectVersion\":"+config.path("projectVersion")+",\"kind\":\"CANCELLED\"}",null,token,422);
        JsonNode renamed=body(send("PATCH","/project/"+pid+"/columns/"+cid,
            "{\"version\":0,\"projectVersion\":"+config.path("projectVersion")+",\"name\":\"Próximas\"}",null,token,200));
        String ids=renamed.path("columns").get(3).path("id")+","+renamed.path("columns").get(2).path("id")+","+renamed.path("columns").get(1).path("id")+","+renamed.path("columns").get(0).path("id");
        JsonNode ordered=body(send("PUT","/project/"+pid+"/columns/order",
            "{\"projectVersion\":"+renamed.path("projectVersion")+",\"columnIds\":["+ids+"]}",null,token,200));
        assertThat(ordered.path("columns").get(0).path("id").asLong()).isEqualTo(cid);
        String remove="{\"projectVersion\":"+ordered.path("projectVersion")+",\"targetColumnId\":"+cid+",\"replacementPendingColumnId\":"+cid+"}";
        JsonNode removed=body(send("POST","/project/"+pid+"/columns/"+p.path("defaultPendingColumnId")+"/remove",remove,null,token,200));
        assertThat(removed.path("movedTaskCount").asLong()).isEqualTo(1);
        assertThat(removed.path("invalidateBoard").asBoolean()).isTrue();
        assertThat(task(t.path("id").asLong()).path("columnId").asLong()).isEqualTo(cid);
        assertThat(project(pid).path("defaultPendingColumnId").asLong()).isEqualTo(cid);
    }

    @Test void projectDeletionAndConcurrentTaskCreationSerializeWithoutOrphans() throws Exception {
        JsonNode p=project("DEVELOPMENT"); long pid=p.path("id").asLong();
        CountDownLatch locked=new CountDownLatch(1), release=new CountDownLatch(1), attempted=new CountDownLatch(1);
        ExecutorService pool=Executors.newFixedThreadPool(2);
        try {
            Future<?> deletion=pool.submit(() -> tx(() -> {
                projects.lockOwned(pid,owner).orElseThrow(); locked.countDown();
                try {
                    if(!release.await(5,TimeUnit.SECONDS)) throw new IllegalStateException("timeout");
                    mvc.perform(delete("/project/"+pid).header("Authorization",token).header("If-Match","\""+p.path("version").asLong()+"\""))
                        .andExpect(status().isNoContent());
                } catch(Exception e) { throw new RuntimeException(e); }
                return null;
            }));
            assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();
            Future<?> insertion=pool.submit(() -> {
                attempted.countDown();
                try { send("POST","/task/user/"+owner,"{\"title\":\"Concorrente\",\"projectId\":"+pid+",\"projectVersion\":0}",UUID.randomUUID().toString(),token,404); }
                catch(Exception e) { throw new RuntimeException(e); }
            });
            assertThat(attempted.await(5,TimeUnit.SECONDS)).isTrue();
            boolean waiting=false;
            for(int attempt=0; attempt<100 && !waiting; attempt++) {
                waiting=tx(() -> ((Number) em.createNativeQuery("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'").getSingleResult()).longValue()>0);
                if(!waiting) Thread.sleep(20);
            }
            assertThat(waiting).as("creation actually waits on the project's database lock").isTrue();
            release.countDown();
            deletion.get(10,TimeUnit.SECONDS); insertion.get(10,TimeUnit.SECONDS);
            assertThat(tasks.countByProjectId(pid)).isZero(); assertThat(projects.findById(pid)).isEmpty();
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void failedCreationRollsBackResourceStructureAndReceiptBeforeRetry() throws Exception {
        String key=UUID.randomUUID().toString(); long before=projects.count();
        send("POST","/project/user/"+owner,"{\"title\":\"Sem modo\"}",key,token,422);
        send("POST","/project/user/"+owner,"{\"title\":\"Projeto\",\"mode\":\"DEVELOPMENT\",\"objectives\":[{\"title\":\" \"}]}",key,token,422);
        assertThat(projects.count()).isEqualTo(before);
        assertThat(receipts.findByUserIdAndOperationAndIdempotencyKey(owner,"project:create",UUID.fromString(key))).isEmpty();
        JsonNode p=body(send("POST","/project/user/"+owner,"{\"title\":\"Projeto\",\"mode\":\"DEVELOPMENT\"}",key,token,201));
        assertThat(columns.countByProjectId(p.path("id").asLong())).isEqualTo(3);
        JsonNode replay=body(send("POST","/project/user/"+owner,"{\"mode\":\"DEVELOPMENT\",\"title\":\"Projeto\",\"objectives\":[]}",key,token,201));
        assertThat(replay).isEqualTo(p);
        mvc.perform(delete("/project/"+p.path("id")).header("Authorization",token).header("If-Match","\""+p.path("version").asLong()+"\"")).andExpect(status().isNoContent());
        send("POST","/project/user/"+owner,"{\"title\":\"Projeto\",\"mode\":\"DEVELOPMENT\"}",key,token,410);
    }

}
