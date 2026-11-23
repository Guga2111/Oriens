package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import tools.jackson.databind.*;
import com.oriens.oriens_api.controller.*;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.*;
import com.oriens.oriens_api.entity.enums.RecurrencePattern;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes=WorkApiPostgresTest.App.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "JWT_SECRET=synthetic-p6-only-not-a-production-secret-0123456789-abcdefghijklmnop", "spring.datasource.url=${P2_JDBC_URL}",
    "spring.datasource.username=postgres","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.open-in-view=false","spring.jpa.show-sql=false","spring.jpa.properties.hibernate.jdbc.time_zone=UTC","spring.task.scheduling.enabled=false"
})
@AutoConfigureMockMvc
@Import({HabitController.class,HabitService.class,FinancialEntryController.class,FinancialEntryServiceImpl.class,
    TagController.class,TagServiceImpl.class,FinancialMapper.class,RecurringFinancialService.class})
@EnabledIfEnvironmentVariable(named="P2_JDBC_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p2|mcp)_proof")
class StatisticsPostgresTest {
    @MockitoBean FileStorageService profileFiles;
    @MockitoBean FileStorageProjectService files;
    @MockitoBean TaskServiceImpl legacy;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired UserRepository users;
    @Autowired Algorithm algorithm;
    @Autowired HabitService habits;
    @Autowired FinancialEntryServiceImpl entries;
    @org.springframework.boot.test.web.server.LocalServerPort int httpPort;
    Long owner,stranger;String token,other;
    @BeforeEach void setup() {
        owner=user();stranger=user();token=token(owner);other=token(stranger);
        db.update("update statistics_coverage set started_on='2026-11-01' where id=1");
        db.update("update users set statistics_started_on='2026-11-01' where id in (?,?)",owner,stranger);
    }
    Long user(){User u=new User();u.setName("Conta de análise");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setPassword("synthetic");return users.save(u).getId();}
    String token(Long id){return "Bearer "+JWT.create().withSubject(users.findById(id).orElseThrow().getEmail()).withClaim("userId",id).withClaim("username","Conta de análise").withExpiresAt(new Date(System.currentTimeMillis()+3600000)).sign(algorithm);}
    JsonNode body(MvcResult r)throws Exception{return json.readTree(r.getResponse().getContentAsString());}
    JsonNode get(String path)throws Exception{return body(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path).header("Authorization",token)).andExpect(status().isOk()).andReturn());}
    JsonNode post(String path,Object payload)throws Exception{return body(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).header("Authorization",token).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(payload))).andExpect(status().isCreated()).andReturn());}
    String root(){return "/statistics/user/"+owner;}
    void task(Long user,String name,String planned,String completed,String due,String status){db.update("insert into tasks(user_id,title,planned_date,completed_at,due_date,status,created_at) values(?,?,?,?,?,?,?::timestamptz)",user,name,planned==null?null:LocalDate.parse(planned),completed==null?null:LocalDate.parse(completed),due==null?null:LocalDate.parse(due),status,"2026-10-01T12:00:00Z");}
    Long tag(String name){return db.queryForObject("insert into tags(user_id,name,color,is_default,allow_negative,created_at) values(?,?,'#781336',false,true,now()) returning id",Long.class,owner,name);}
    Long entry(Long tag,String amount,String date,String description){return db.queryForObject("insert into financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at) values(?,?,?,?::date,?,false,now()) returning id",Long.class,owner,tag,new BigDecimal(amount),date,description);}

    @Test void streakCombinesSourcesDeduplicatesAndRecountsMutations()throws Exception {
        assertThat(get(root()+"/streak").path("days").asLong()).isZero();
        task(owner,"Ontem",null,"2026-11-12",null,"CONCLUDED");
        task(owner,"Ontem novamente",null,"2026-11-12",null,"CONCLUDED");
        task(owner,"Antes",null,"2026-11-11",null,"CONCLUDED");
        task(stranger,"Outra conta",null,"2026-11-13",null,"CONCLUDED");
        assertThat(get(root()+"/streak").path("days").asLong()).isEqualTo(2);
        assertThat(get(root()+"/streak").path("throughDate").asText()).isEqualTo("2026-11-12");
        var h=habits.create(owner,new com.oriens.oriens_api.entity.dto.statistics.HabitViews.Input("Hoje",List.of(5),null,LocalDate.parse("2026-11-13"),null));
        habits.execute(owner,h.id(),LocalDate.parse("2026-11-13"),new com.oriens.oriens_api.entity.dto.statistics.HabitViews.Execution(0L,true));
        assertThat(get(root()+"/streak").path("days").asLong()).isEqualTo(3);
        task(owner,"Hoje também",null,"2026-11-13",null,"CONCLUDED");
        assertThat(get(root()+"/streak").path("days").asLong()).isEqualTo(3);
        db.update("update tasks set status='PENDING',completed_at=null where user_id=? and title='Hoje também'",owner);
        assertThat(get(root()+"/streak").path("days").asLong()).isEqualTo(3);
        habits.execute(owner,h.id(),LocalDate.parse("2026-11-13"),new com.oriens.oriens_api.entity.dto.statistics.HabitViews.Execution(1L,false));
        assertThat(get(root()+"/streak").path("days").asLong()).isEqualTo(2);
        db.update("delete from tasks where user_id=? and completed_at='2026-11-12'",owner);
        assertThat(get(root()+"/streak").path("days").asLong()).isZero();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(root()+"/streak").header("Authorization",other)).andExpect(status().isNotFound());
    }

    @Test void streakUsesRecifeMidnightAndIncludesWeekends() {
        task(owner,"Sexta",null,"2026-11-13",null,"CONCLUDED");
        task(owner,"Sábado",null,"2026-11-14",null,"CONCLUDED");
        task(owner,"Domingo",null,"2026-11-15",null,"CONCLUDED");
        var before=new StatisticsReadService(db,Clock.fixed(Instant.parse("2026-11-14T02:59:59Z"),ZoneOffset.UTC)).streak(owner);
        assertThat(before.today()).isEqualTo(LocalDate.parse("2026-11-13"));assertThat(before.days()).isEqualTo(1);
        var sunday=new StatisticsReadService(db,Clock.fixed(Instant.parse("2026-11-16T02:59:59Z"),ZoneOffset.UTC)).streak(owner);
        assertThat(sunday.days()).isEqualTo(3);
        var monday=new StatisticsReadService(db,Clock.fixed(Instant.parse("2026-11-16T03:00:00Z"),ZoneOffset.UTC)).streak(owner);
        assertThat(monday.days()).isEqualTo(3);assertThat(monday.throughDate()).isEqualTo(LocalDate.parse("2026-11-15"));
        var tuesday=new StatisticsReadService(db,Clock.fixed(Instant.parse("2026-11-17T03:00:00Z"),ZoneOffset.UTC)).streak(owner);
        assertThat(tuesday.days()).isZero();
    }

    @Test void streakHasNoAnnualCapAndNeverInventsMissingHistory()throws Exception {
        db.update("update users set statistics_started_on='2026-11-13' where id=?",owner);
        assertThat(get(root()+"/streak").path("days").isNull()).isTrue();
        LocalDate today=LocalDate.parse("2026-11-13");
        for(int i=0;i<370;i++)task(owner,"Dia "+i,null,today.minusDays(i).toString(),null,"CONCLUDED");
        JsonNode longStreak=get(root()+"/streak");
        assertThat(longStreak.path("days").asLong()).isEqualTo(370);
        assertThat(longStreak.path("lowerBound").asBoolean()).isTrue();
        assertThat(longStreak.path("startDate").asText()).isEqualTo(today.minusDays(369).toString());
        db.update("update users set statistics_started_on='2025-01-01' where id=?",owner);
        db.update("update statistics_coverage set started_on='2025-01-01' where id=1");
        assertThat(get(root()+"/streak").path("lowerBound").asBoolean()).isFalse();
    }

    @Test void populationsDatesEvidenceAndOwnershipReconcile()throws Exception {
        task(owner,"No plano","2026-11-10","2026-11-10",null,"CONCLUDED");
        task(owner,"Concluída depois","2026-11-11","2026-11-14",null,"CONCLUDED");
        task(owner,"Atrasada","2026-11-12",null,"2026-11-12","PENDING");
        task(owner,"Cancelada","2026-11-11",null,"2026-11-01","CANCELLED");
        task(owner,"Outro planejamento","2026-11-01","2026-11-12",null,"CONCLUDED");
        task(owner,"Avulsa",null,"2026-11-13",null,"CONCLUDED");
        task(owner,"Antecipada","2026-11-13","2026-11-09",null,"CONCLUDED");
        task(owner,"Prazo hoje","2026-11-13",null,"2026-11-13","ON_DOING");
        task(stranger,"Privada",null,"2026-11-13",null,"CONCLUDED");
        String range="?startDate=2026-11-10&endDate=2026-11-13";
        JsonNode activity=get(root()+"/activity"+range),plan=get(root()+"/planning"+range);
        assertThat(activity.path("total").asLong()).isEqualTo(3);assertThat(activity.path("previousTotal").asLong()).isEqualTo(1);
        assertThat(activity.path("days").size()).isEqualTo(4);assertThat(activity.path("days").get(1).path("completed").asLong()).isZero();
        assertThat(activity.path("period").path("previousStartDate").asText()).isEqualTo("2026-11-06");
        assertThat(activity.path("period").path("timezone").asText()).isEqualTo("America/Recife");
        assertThat(plan.path("current").path("planned").asLong()).isEqualTo(5);assertThat(plan.path("current").path("completed").asLong()).isEqualTo(2);
        assertThat(plan.path("overdue").asLong()).isEqualTo(1);
        assertThat(get(root()+"/tasks"+range+"&kind=completed&size=2").path("totalElements").asLong()).isEqualTo(3);
        assertThat(get(root()+"/tasks"+range+"&kind=planned").path("totalElements").asLong()).isEqualTo(5);
        assertThat(get(root()+"/tasks"+range+"&kind=overdue&unassigned=true").path("totalElements").asLong()).isEqualTo(1);
        for(String path:List.of(root()+"/activity"+range,root()+"/planning"+range,root()+"/finance"+range,"/habits/user/"+owner+range,"/financial/user/"+owner+"/entries","/financial/user/"+owner+"/tags"))
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path).header("Authorization",other)).andExpect(status().isNotFound());
        mvc.perform(delete("/financial/user/"+owner+"/entries/123").header("Authorization",other)).andExpect(status().isNotFound());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/habits/user/"+owner).header("Authorization",other).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content("{\"name\":\"Invadido\",\"weekdays\":[5],\"startDate\":\"2026-11-13\"}")).andExpect(status().isNotFound());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(root()+"/activity?startDate=2026-11-14&endDate=2026-11-13").header("Authorization",token)).andExpect(status().isBadRequest());
        db.update("update tasks set status='PENDING',completed_at=null where user_id=? and title='Avulsa'",owner);
        assertThat(get(root()+"/activity"+range).path("total").asLong()).isEqualTo(2);
        db.update("delete from tasks where user_id=? and title='No plano'",owner);
        assertThat(get(root()+"/activity"+range).path("total").asLong()).isEqualTo(1);
    }
    @Test void exactFinancialTotalsExceedOnePageAndFiltersCompose()throws Exception {
        Long a=tag("Alimentação"),b=tag("Casa");
        for(int i=0;i<50;i++)entry(a,"-0.10","2026-11-12","Café "+i);
        entry(b,"-0.20","2026-11-13","Aluguel");entry(b,"100.10","2026-11-13","Receita");entry(a,"-99.00","2026-10-01","Café antigo");
        JsonNode summary=get(root()+"/finance?startDate=2026-11-10&endDate=2026-11-13");
        assertThat(summary.path("current").path("income").asText()).isEqualTo("100.10");
        assertThat(summary.path("current").path("expenses").asText()).isEqualTo("5.20");
        assertThat(summary.path("current").path("result").asText()).isEqualTo("94.90");
        assertThat(summary.path("current").path("entries").asLong()).isEqualTo(52);
        BigDecimal sum=BigDecimal.ZERO;for(JsonNode d:summary.path("days"))sum=sum.add(new BigDecimal(d.path("expenses").asText()));
        assertThat(sum).isEqualByComparingTo("5.20");
        // Amounts are decimal strings, deliberately not lossy JSON binary floats.
        BigDecimal categories=BigDecimal.ZERO;for(JsonNode c:summary.path("categories"))categories=categories.add(new BigDecimal(c.path("amount").asText()));
        assertThat(categories).isEqualByComparingTo("5.20");
        JsonNode page=get("/financial/user/"+owner+"/entries?startDate=2026-11-10&endDate=2026-11-13&tagId="+a+"&search=Café&size=20&page=1");
        assertThat(page.path("content").size()).isEqualTo(20);assertThat(page.path("totalElements").asLong()).isEqualTo(50);
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/financial/user/"+owner+"/entries").header("Authorization",token).contentType("application/json").content("{\"amount\":0.001,\"tagId\":"+a+",\"entryDate\":\"2026-11-13\",\"isRecurring\":false}")).andExpect(status().isBadRequest());
    }
    @Test void habitDefinitionsAreProspectiveAndExecutionsAreUnique()throws Exception {
        String path="/habits/user/"+owner;Map<String,Object> input=Map.of("name","Ler","weekdays",List.of(5),"startDate","2026-11-13");
        JsonNode habit=post(path,input);long id=habit.path("id").asLong();
        JsonNode before=get(path+"?startDate=2026-11-12&endDate=2026-11-13");assertThat(before.path("expected").asLong()).isEqualTo(1);
        assertThat(before.path("habits").get(0).path("days").get(0).path("state").asText()).isEqualTo("OUTSIDE");
        JsonNode done=body(mvc.perform(put(path+"/"+id+"/executions/2026-11-13").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"completed\":true}")).andExpect(status().isOk()).andReturn());
        assertThat(done.path("completed").asLong()).isEqualTo(1);
        mvc.perform(put(path+"/"+id+"/executions/2026-11-13").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"completed\":true}")).andExpect(status().isConflict());
        assertThat(db.queryForObject("select count(*) from habit_executions where habit_id=?",Long.class,id)).isEqualTo(1);
        mvc.perform(put(path+"/"+id).header("Authorization",token).contentType("application/json").content("{\"version\":1,\"name\":\"Ler\",\"weekdays\":[1]}")).andExpect(status().isOk());
        var later=new HabitService(db,Clock.fixed(Instant.parse("2026-11-16T15:00:00Z"),ZoneOffset.UTC)).summary(owner,LocalDate.parse("2026-11-13"),LocalDate.parse("2026-11-16"));
        assertThat(later.expected()).isEqualTo(2);assertThat(later.completed()).isEqualTo(1);
        assertThat(later.habits().get(0).days().stream().map(d->d.state()).toList()).containsExactly("DONE","OFF","OFF","PENDING");
        mvc.perform(put(path+"/"+id+"/executions/2026-11-14").header("Authorization",token).contentType("application/json").content("{\"version\":2,\"completed\":true}")).andExpect(status().isBadRequest());
        JsonNode off=post(path,Map.of("name","Caminhar","weekdays",List.of(1),"startDate","2026-11-13"));
        mvc.perform(put(path+"/"+off.path("id")+"/executions/2026-11-13").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"completed\":true}")).andExpect(status().isBadRequest());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path+"/"+id+"/archive").header("Authorization",token).contentType("application/json").content("{\"version\":2}")).andExpect(status().isOk());
        assertThat(habits.summary(owner,LocalDate.parse("2026-11-13"),LocalDate.parse("2026-11-13")).completed()).isEqualTo(1);
    }
    // Regression: "5x per week" habits were bound to fixed weekdays, so any other day was a miss.
    @Test void weeklyTargetHabitsCountAnyDayAndOnlyMissWhatTheWeekCanNoLongerReach()throws Exception {
        String path="/habits/user/"+owner;
        for(String invalid:List.of("{\"name\":\"Treino\",\"weekdays\":[1],\"weeklyTarget\":5,\"startDate\":\"2026-11-13\"}",
                "{\"name\":\"Treino\",\"weeklyTarget\":8,\"startDate\":\"2026-11-13\"}","{\"name\":\"Treino\",\"startDate\":\"2026-11-13\"}"))
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).header("Authorization",token).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        String key=UUID.randomUUID().toString(),payload="{\"name\":\"Treino\",\"weeklyTarget\":5,\"startDate\":\"2026-11-13\"}";
        JsonNode habit=null;for(int i=0;i<2;i++){JsonNode result=body(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).header("Authorization",token).header("Idempotency-Key",key).contentType("application/json").content(payload)).andExpect(status().isCreated()).andReturn());if(habit==null)habit=result;else assertThat(result.path("id")).isEqualTo(habit.path("id"));}
        long id=habit.path("id").asLong();
        assertThat(habit.path("schedules").get(0).path("weeklyTarget").asInt()).isEqualTo(5);
        assertThatThrownBy(()->db.update("update habit_schedules set weekdays=31 where habit_id=?",id)).hasMessageContaining("ck_habit_schedule_weekly_target");
        // Backdate the definition to Monday 2026-11-09; today is Friday 2026-11-13.
        db.update("update habits set created_on='2026-11-09',start_date='2026-11-09' where id=?",id);
        db.update("update habit_schedules set start_date='2026-11-09' where habit_id=?",id);
        long version=0;
        for(String day:List.of("2026-11-10","2026-11-11","2026-11-09"))
            version=body(mvc.perform(put(path+"/"+id+"/executions/"+day).header("Authorization",token).contentType("application/json").content("{\"version\":"+version+",\"completed\":true}")).andExpect(status().isOk()).andReturn()).path("version").asLong();
        JsonNode week=get(path+"?startDate=2026-11-09&endDate=2026-11-13").path("habits").get(0);
        List<String> states=new ArrayList<>();week.path("days").forEach(d->states.add(d.path("state").asText()));
        // 3 of 5 done and the weekend still open: today is pending, nothing is missed.
        assertThat(states).containsExactly("DONE","DONE","DONE","OPTIONAL","PENDING");
        assertThat(week.path("completed").asLong()).isEqualTo(3);assertThat(week.path("expected").asLong()).isEqualTo(4);
        // The following Monday the week is closed: exactly the 2 unmet executions are missed.
        var monday=new HabitService(db,Clock.fixed(Instant.parse("2026-11-16T15:00:00Z"),ZoneOffset.UTC)).summary(owner,LocalDate.parse("2026-11-09"),LocalDate.parse("2026-11-15")).habits().get(0);
        assertThat(monday.days().stream().filter(d->d.state().equals("MISSED")).count()).isEqualTo(2);
        assertThat(monday.completed()).isEqualTo(3);assertThat(monday.expected()).isEqualTo(5);
        // An existing fixed-weekday habit can switch to a weekly target from tomorrow on.
        JsonNode fixed=post(path,Map.of("name","Correr","weekdays",List.of(5),"startDate","2026-11-13"));
        JsonNode switched=body(mvc.perform(put(path+"/"+fixed.path("id")).header("Authorization",token).contentType("application/json").content("{\"version\":0,\"name\":\"Correr\",\"weeklyTarget\":3}")).andExpect(status().isOk()).andReturn());
        assertThat(switched.path("schedules").get(1).path("startDate").asText()).isEqualTo("2026-11-14");
        assertThat(switched.path("schedules").get(1).path("weeklyTarget").asInt()).isEqualTo(3);
        assertThat(switched.path("schedules").get(0).path("weeklyTarget").isNull()).isTrue();
    }
    @Test void pauseAndIdempotentCreationPreserveDenominators()throws Exception {
        String path="/habits/user/"+owner,key=UUID.randomUUID().toString();String payload="{\"name\":\"Alongar\",\"weekdays\":[5],\"startDate\":\"2026-11-13\"}";
        JsonNode first=null;for(int i=0;i<2;i++){JsonNode result=body(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path).header("Authorization",token).header("Idempotency-Key",key).contentType("application/json").content(payload)).andExpect(status().isCreated()).andReturn());if(first==null)first=result;else assertThat(result.path("id")).isEqualTo(first.path("id"));}
        long id=first.path("id").asLong();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path+"/"+id+"/pauses").header("Authorization",token).contentType("application/json").content("{\"version\":0,\"startDate\":\"2026-11-13\",\"endDate\":\"2026-11-14\"}")).andExpect(status().isOk());
        assertThat(get(path+"?startDate=2026-11-13&endDate=2026-11-13").path("expected").asLong()).isZero();
    }
    @Test void recurrenceKeepsAnchorAndDeletionTombstonesWithoutLegacyBackfill()throws Exception {
        Long tag=tag("Recorrente"),parent=entry(tag,"-12.34","2026-01-31","Mensalidade");
        db.update("update financial_entry set is_recurring=true,recurrence_pattern='MONTHLY',recurrence_started_on='2026-11-01' where id=?",parent);
        var november=new RecurringFinancialService(db,Clock.fixed(Instant.parse("2026-11-30T15:00:00Z"),ZoneOffset.UTC));
        assertThat(november.generate()).isEqualTo(1);assertThat(november.generate()).isZero();
        Long child=db.queryForObject("select id from financial_entry where parent_entry_id=?",Long.class,parent);entries.write(owner,"rest:financial",UUID.randomUUID().toString(),new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Delete(child,0L));
        assertThat(november.generate()).isZero();
        var march=new RecurringFinancialService(db,Clock.fixed(Instant.parse("2027-03-31T15:00:00Z"),ZoneOffset.UTC));
        assertThat(march.generate()).isEqualTo(4);
        assertThat(db.queryForList("select entry_date::text from financial_entry where parent_entry_id=? order by entry_date",String.class,parent)).containsExactly("2026-12-31","2027-01-31","2027-02-28","2027-03-31");
        assertThat(RecurringFinancialService.scheduled(LocalDate.parse("2024-02-29"),LocalDate.parse("2025-02-28"),RecurrencePattern.YEARLY)).isTrue();
    }


    @Test void accountCoverageAndRecurrenceActivationNeverFabricateEarlierHistory()throws Exception {
        db.update("update users set statistics_started_on='2026-11-13' where id=?",owner);
        assertThat(get(root()+"/activity?startDate=2026-11-10&endDate=2026-11-13").path("coverageFrom").asText()).isEqualTo("2026-11-13");
        Long category=tag("Registrada hoje");
        JsonNode parent=post("/financial/user/"+owner+"/entries",Map.of("tagId",category,"description","Recorrência retrodatada","amount",new BigDecimal("-0.10"),"entryDate","2020-01-01","isRecurring",true,"recurrencePattern","DAILY"));
        assertThat(db.queryForObject("select recurrence_started_on::text from financial_entry where id=?",String.class,parent.path("id").asLong())).isEqualTo("2026-11-13");
        new org.springframework.transaction.support.TransactionTemplate(transactions).execute(status->new RecurringFinancialService(db,Clock.fixed(Instant.parse("2026-11-13T15:00:00Z"),ZoneOffset.UTC)).generate());
        assertThat(db.queryForObject("select count(*) from financial_entry where parent_entry_id=? and entry_date<'2026-11-13'",Long.class,parent.path("id").asLong())).isZero();
        db.update("update financial_entry set recurrence_end_date='2026-11-13' where id=?",parent.path("id").asLong());
    }
    @Test void concurrentRecurrencesAndHabitExecutionsAreAtomic()throws Exception {
        Long category=tag("Diária"),parent=entry(category,"-0.10","2026-11-12","Diária");
        db.update("update financial_entry set is_recurring=true,recurrence_pattern='DAILY',recurrence_end_date='2026-11-13',recurrence_started_on='2026-11-01' where id=?",parent);
        var generator=new RecurringFinancialService(db,Clock.fixed(Instant.parse("2026-11-13T15:00:00Z"),ZoneOffset.UTC));
        var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        assertThatThrownBy(()->tx.execute(status->{generator.generate();throw new IllegalStateException("rollback probe");})).isInstanceOf(IllegalStateException.class);
        assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=?",Long.class,parent)).isZero();
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->tx.execute(status->generator.generate()));
            var second=pool.submit(()->tx.execute(status->generator.generate()));
            assertThat(first.get(10,java.util.concurrent.TimeUnit.SECONDS)+second.get(10,java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(1);
            assertThat(db.queryForObject("select count(*) from financial_entry where parent_entry_id=?",Long.class,parent)).isEqualTo(1);
            var h=habits.create(owner,new com.oriens.oriens_api.entity.dto.statistics.HabitViews.Input("Concorrente",List.of(5),null,LocalDate.parse("2026-11-13"),null));
            java.util.concurrent.Callable<Boolean> execute=()->{try{habits.execute(owner,h.id(),LocalDate.parse("2026-11-13"),new com.oriens.oriens_api.entity.dto.statistics.HabitViews.Execution(0L,true));return true;}catch(com.oriens.oriens_api.exception.WorkDomainException e){assertThat(e.getCode()).isEqualTo("VERSION_CONFLICT");return false;}};
            var one=pool.submit(execute);var two=pool.submit(execute);
            assertThat(List.of(one.get(10,java.util.concurrent.TimeUnit.SECONDS),two.get(10,java.util.concurrent.TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
            assertThat(db.queryForObject("select count(*) from habit_executions where habit_id=?",Long.class,h.id())).isEqualTo(1);
        }finally{pool.shutdownNow();}
    }
    @Test @EnabledIfEnvironmentVariable(named="STATISTICS_BROWSER_PROOF",matches="1")
    void productionBrowserUsesRealApiForHabitsPeriodsAndFinancialEvidence()throws Exception {
        task(owner,"Revisar proposta","2026-11-13","2026-11-13",null,"CONCLUDED");
        task(owner,"Organizar pesquisa","2026-11-12",null,"2026-11-12","PENDING");
        Long category=tag("Leitura");for(int i=0;i<25;i++)entry(category,"-12.34","2026-11-13","Livro "+i);
        java.nio.file.Path repo=java.nio.file.Path.of("..").toAbsolutePath().normalize();
        assertThat(java.nio.file.Files.exists(repo.resolve("oriens-front/dist/index.html"))).isTrue();
        var command=new ProcessBuilder("node","docs/screenshots/statistics/fixture-server.mjs","oriens-front/dist","4214").directory(repo.toFile()).redirectErrorStream(true);
        command.environment().put("QA_API_ORIGIN","http://127.0.0.1:"+httpPort);
        command.environment().put("QA_TOKEN",token.substring(7));command.environment().put("QA_NOW","2026-11-14T02:30:00Z");
        command.redirectOutput(java.nio.file.Path.of(System.getProperty("java.io.tmpdir"),"oriens-statistics-live-server.log").toFile());
        Process server=command.start();
        try {
            var client=java.net.http.HttpClient.newHttpClient();
            for(int i=0;i<40;i++){try {if(client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:4214/stats")).build(),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode()==200)break;}catch(Exception ignored){}Thread.sleep(100);}
            Process browser=new ProcessBuilder("node","docs/screenshots/statistics/browser-proof.mjs","http://127.0.0.1:4214","--live").directory(repo.toFile()).inheritIO().start();
            try {assertThat(browser.waitFor(180,java.util.concurrent.TimeUnit.SECONDS)).isTrue();assertThat(browser.exitValue()).isZero();}
            finally {if(browser.isAlive())browser.destroyForcibly();}
        }finally{server.destroy();if(!server.waitFor(5,java.util.concurrent.TimeUnit.SECONDS))server.destroyForcibly();}
    }

}
