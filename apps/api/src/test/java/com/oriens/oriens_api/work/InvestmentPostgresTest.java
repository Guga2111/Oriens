package com.oriens.oriens_api.work;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import tools.jackson.databind.*;
import com.oriens.oriens_api.controller.*;
import com.oriens.oriens_api.entity.User;
import com.oriens.oriens_api.events.UserCreatedEvent;
import com.oriens.oriens_api.events.UserCreatedListener;
import com.oriens.oriens_api.mapper.FinancialMapper;
import com.oriens.oriens_api.repository.UserRepository;
import com.oriens.oriens_api.service.*;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Manual portfolio (#119): positions, linked cash entries, ownership, idempotency and versions. */
@SpringBootTest(classes=WorkApiPostgresTest.App.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "JWT_SECRET=synthetic-p6-only-not-a-production-secret-0123456789-abcdefghijklmnop", "spring.datasource.url=${P2_JDBC_URL}",
    "spring.datasource.username=postgres","spring.datasource.password=","spring.jpa.hibernate.ddl-auto=validate",
    "spring.jpa.open-in-view=false","spring.jpa.show-sql=false","spring.jpa.properties.hibernate.jdbc.time_zone=UTC",
    "spring.jpa.properties.hibernate.generate_statistics=true","spring.task.scheduling.enabled=false"
})
@AutoConfigureMockMvc
@Import({InvestmentController.class,InvestmentService.class,FinancialEntryController.class,FinancialEntryServiceImpl.class,
    FinancialMapper.class,UserCreatedListener.class})
@EnabledIfEnvironmentVariable(named="P2_JDBC_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/oriens_(p2|mcp)_proof")
class InvestmentPostgresTest {
    @MockitoBean FileStorageService profileFiles;
    @MockitoBean FileStorageProjectService files;
    @MockitoBean TaskServiceImpl legacy;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired UserRepository users;
    @Autowired Algorithm algorithm;
    @Autowired UserCreatedListener signup;
    @Autowired EntityManagerFactory emf;
    @Autowired FinancialStatisticsService statistics;
    Long owner,stranger;String token,other;

    @BeforeEach void setup() {owner=user();stranger=user();token=token(owner);other=token(stranger);}
    Long user(){User u=new User();u.setName("Carteira");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setPassword("synthetic");return users.save(u).getId();}
    String token(Long id){return "Bearer "+JWT.create().withSubject(users.findById(id).orElseThrow().getEmail()).withClaim("userId",id).withClaim("username","Carteira").withExpiresAt(new Date(System.currentTimeMillis()+3600000)).sign(algorithm);}
    String root(){return "/financial/user/"+owner+"/investments";}

    JsonNode call(MockHttpServletRequestBuilder request,String auth,Object body,String key,Long version,int expected)throws Exception {
        request.header("Authorization",auth);
        if(key!=null)request.header("Idempotency-Key",key);
        if(version!=null)request.header("If-Match","\""+version+"\"");
        if(body!=null)request.contentType("application/json").content(json.writeValueAsString(body));
        MvcResult r=mvc.perform(request).andExpect(status().is(expected)).andReturn();
        String content=r.getResponse().getContentAsString();
        return content.isEmpty()?null:json.readTree(content);
    }
    JsonNode read(String path)throws Exception{return call(get(path),token,null,null,null,200);}
    String key(){return UUID.randomUUID().toString();}
    JsonNode invest(String name,String value)throws Exception{
        return call(post(root()),token,Map.of("name",name,"assetClass","FIXED_INCOME","initialValue",new BigDecimal(value),"valuedOn","2026-11-01"),key(),null,201);
    }
    JsonNode move(long investment,String type,String amount,String date)throws Exception{
        return call(post(root()+"/"+investment+"/movements"),token,Map.of("type",type,"amount",new BigDecimal(amount),"occurredOn",date),key(),null,201);
    }
    JsonNode entry(long id)throws Exception{return read("/financial/user/"+owner+"/entries/"+id);}
    BigDecimal dec(JsonNode n){return new BigDecimal(n.asText());}

    @Test void initialPositionLeavesCashUntouchedAndMovementsFollowTheCashRule()throws Exception {
        long id=invest("CDB Inter","15000.00").path("id").asLong();
        assertThat(read(root()+"/"+id).path("positionStatus").asText()).isEqualTo("VALUED");
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isZero();

        JsonNode withdrawal=move(id,"WITHDRAWAL","2000.00","2026-11-05");
        JsonNode cash=entry(withdrawal.path("entryId").asLong());
        assertThat(cash.path("kind").asText()).isEqualTo("INVESTMENT_TRANSFER");
        assertThat(cash.path("amount").decimalValue()).isEqualByComparingTo("2000.00");
        assertThat(cash.path("investmentId").asLong()).isEqualTo(id);
        assertThat(db.queryForObject("select system_key from tags where id=?",String.class,cash.path("tagId").asLong())).isEqualTo("INVESTMENTS");
        JsonNode position=read(root()+"/"+id);
        assertThat(position.path("positionStatus").asText()).isEqualTo("ESTIMATED");
        assertThat(dec(position.path("position"))).isEqualByComparingTo("13000.00");

        JsonNode contribution=move(id,"CONTRIBUTION","500.00","2026-11-06");
        assertThat(entry(contribution.path("entryId").asLong()).path("amount").decimalValue()).isEqualByComparingTo("-500.00");
        JsonNode income=move(id,"INCOME","100.00","2026-11-07");
        assertThat(entry(income.path("entryId").asLong()).path("kind").asText()).isEqualTo("INVESTMENT_INCOME");
        // Income is cash received; the position follows valuation, contributions and withdrawals only.
        assertThat(dec(read(root()+"/"+id).path("position"))).isEqualByComparingTo("13500.00");

        var money=statistics.filteredSummary(owner,java.time.LocalDate.parse("2026-11-01"),java.time.LocalDate.parse("2026-11-13"),null,null,
            org.springframework.data.domain.PageRequest.of(0,10)).totals();
        assertThat(money.income()).isEqualByComparingTo("100.00");
        assertThat(money.expenses()).isEqualByComparingTo("0.00");
        assertThat(money.investmentTransfers()).isEqualByComparingTo("1500.00");

        JsonNode summary=read(root()+"/summary");
        assertThat(dec(summary.path("total"))).isEqualByComparingTo("13500.00");
        assertThat(dec(summary.path("netContributions"))).isEqualByComparingTo("-1500.00");
        assertThat(dec(summary.path("incomeReceived"))).isEqualByComparingTo("100.00");
        assertThat(summary.path("composition").get(0).path("assetClass").asText()).isEqualTo("FIXED_INCOME");

        JsonNode incomes=read(root()+"/movements?investmentId="+id+"&type=INCOME&startDate=2026-11-07&endDate=2026-11-07");
        assertThat(incomes.path("totalElements").asLong()).isEqualTo(1);
        assertThat(read(root()+"/movements?type=CONTRIBUTION&endDate=2026-11-05").path("totalElements").asLong()).isZero();
    }

    @Test void sameDayMovementsCountOnlyWhenRecordedAfterTheValuation()throws Exception {
        long id=invest("Ações","1000.00").path("id").asLong();
        move(id,"CONTRIBUTION","200.00","2026-11-10");
        call(post(root()+"/"+id+"/valuations"),token,Map.of("amount",new BigDecimal("1300.00"),"valuedOn","2026-11-10"),key(),null,201);
        JsonNode valued=read(root()+"/"+id);
        assertThat(valued.path("positionStatus").asText()).isEqualTo("VALUED");
        assertThat(dec(valued.path("position"))).isEqualByComparingTo("1300.00");
        move(id,"CONTRIBUTION","50.00","2026-11-10");
        assertThat(dec(read(root()+"/"+id).path("position"))).isEqualByComparingTo("1350.00");
        assertThat(read(root()+"/"+id+"/valuations").path("content").get(0).path("valuedOn").asText()).isEqualTo("2026-11-10");
    }

    @Test void negativeEstimateAndMissingValuationMakeTheTotalPartial()throws Exception {
        long a=invest("Renda","100.00").path("id").asLong();
        long b=invest("Fundo","40.00").path("id").asLong();
        long c=invest("Zero","0.00").path("id").asLong();
        move(a,"WITHDRAWAL","150.00","2026-11-05");
        JsonNode pending=read(root()+"/"+a);
        assertThat(pending.path("positionStatus").asText()).isEqualTo("NEEDS_VALUATION");
        assertThat(pending.path("position").isNull()).isTrue();
        JsonNode valuation=read(root()+"/"+b+"/valuations").path("content").get(0);
        call(delete(root()+"/"+b+"/valuations/"+valuation.path("id").asLong()),token,null,key(),valuation.path("version").asLong(),204);
        assertThat(read(root()+"/"+b).path("positionStatus").asText()).isEqualTo("UNAVAILABLE");
        JsonNode summary=read(root()+"/summary");
        assertThat(summary.path("investments").asLong()).isEqualTo(3);
        assertThat(summary.path("covered").asLong()).isEqualTo(1);
        assertThat(dec(summary.path("total"))).isEqualByComparingTo("0.00");
        assertThat(read(root()+"/"+c).path("positionStatus").asText()).isEqualTo("VALUED");
    }

    @Test void totalsStayExactAcrossManySmallMovements()throws Exception {
        long id=invest("Tesouro","0.10").path("id").asLong();
        for(int i=0;i<30;i++)move(id,"CONTRIBUTION","0.10","2026-11-12");
        assertThat(read(root()+"/"+id).path("position").asText()).isEqualTo("3.10");
        assertThat(read(root()+"/summary").path("netContributions").asText()).isEqualTo("3.00");
        assertThat(db.queryForObject("select sum(amount) from financial_entry where user_id=? and kind='INVESTMENT_TRANSFER'",BigDecimal.class,owner))
            .isEqualByComparingTo("-3.00");
    }

    @Test void retriesDoNotDuplicateAndCorrectionsStayConsistent()throws Exception {
        long id=invest("CDB","1000.00").path("id").asLong();
        String retry=key();Map<String,Object> payload=Map.of("type","CONTRIBUTION","amount",new BigDecimal("300.00"),"occurredOn","2026-11-08");
        JsonNode first=call(post(root()+"/"+id+"/movements"),token,payload,retry,null,201);
        JsonNode again=call(post(root()+"/"+id+"/movements"),token,payload,retry,null,201);
        assertThat(again.path("id").asLong()).isEqualTo(first.path("id").asLong());
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isEqualTo(1);
        call(post(root()+"/"+id+"/movements"),token,Map.of("type","CONTRIBUTION","amount",new BigDecimal("301.00"),"occurredOn","2026-11-08"),retry,null,409);
        call(post(root()+"/"+id+"/movements"),token,payload,null,null,428);

        long movement=first.path("id").asLong(),cash=first.path("entryId").asLong();
        JsonNode fixed=call(put(root()+"/"+id+"/movements/"+movement),token,Map.of("type","INCOME","amount",new BigDecimal("45.50"),"occurredOn","2026-11-09"),key(),0L,200);
        assertThat(fixed.path("version").asLong()).isEqualTo(1);
        JsonNode linked=entry(cash);
        assertThat(linked.path("kind").asText()).isEqualTo("INVESTMENT_INCOME");
        assertThat(linked.path("amount").decimalValue()).isEqualByComparingTo("45.50");
        assertThat(linked.path("entryDate").asText()).isEqualTo("2026-11-09");
        assertThat(dec(read(root()+"/"+id).path("position"))).isEqualByComparingTo("1000.00");
        call(put(root()+"/"+id+"/movements/"+movement),token,Map.of("type","INCOME","amount",new BigDecimal("1.00"),"occurredOn","2026-11-09"),key(),0L,409);
        call(patch(root()+"/"+id),token,Map.of("name","CDB Novo"),key(),7L,409);

        // The entries API cannot fork the linked entry away from its movement.
        call(put("/financial/user/"+owner+"/entries/"+cash),token,Map.of("amount",new BigDecimal("10.00"),"entryDate","2026-11-09","tagId",linked.path("tagId").asLong(),"isRecurring",false),key(),linked.path("version").asLong(),422);
        call(delete("/financial/user/"+owner+"/entries/"+cash),token,null,key(),linked.path("version").asLong(),422);

        call(delete(root()+"/"+id+"/movements/"+movement),token,null,key(),1L,204);
        assertThat(db.queryForObject("select count(*) from financial_entry where id=?",Long.class,cash)).isZero();
    }

    @Test void investmentDeletionNeedsNoMovementsOrAZeroPositionAndKeepsCashHistory()throws Exception {
        long empty=invest("Sem movimentos","500.00").path("id").asLong();
        call(delete(root()+"/"+empty),token,null,key(),0L,204);
        call(get(root()+"/"+empty),token,null,null,null,404);

        long id=invest("Resgatado","1000.00").path("id").asLong();
        JsonNode out=move(id,"WITHDRAWAL","600.00","2026-11-10");
        call(delete(root()+"/"+id),token,null,key(),0L,422);
        move(id,"WITHDRAWAL","400.00","2026-11-11");
        assertThat(dec(read(root()+"/"+id).path("position"))).isEqualByComparingTo("0.00");
        call(delete(root()+"/"+id),token,null,key(),0L,204);
        JsonNode kept=entry(out.path("entryId").asLong());
        assertThat(kept.path("kind").asText()).isEqualTo("INVESTMENT_TRANSFER");
        assertThat(kept.hasNonNull("investmentId")).isFalse();
        call(put("/financial/user/"+owner+"/entries/"+kept.path("id").asLong()),token,Map.of("amount",new BigDecimal("600.00"),"entryDate","2026-11-10","description","Resgate final","tagId",kept.path("tagId").asLong(),"isRecurring",false),key(),kept.path("version").asLong(),200);
    }

    @Test void otherAccountsGetNotFoundEverywhere()throws Exception {
        long id=invest("Privada","100.00").path("id").asLong();
        JsonNode m=move(id,"CONTRIBUTION","10.00","2026-11-10");
        long valuation=read(root()+"/"+id+"/valuations").path("content").get(0).path("id").asLong();
        String path=root()+"/"+id;
        call(get(path),other,null,null,null,404);
        call(get(path+"/valuations"),other,null,null,null,404);
        call(get(root()+"/summary"),other,null,null,null,404);
        String own="/financial/user/"+stranger+"/investments";
        call(get(own+"/"+id),other,null,null,null,404);
        call(get(own+"/movements?investmentId="+id),other,null,null,null,404);
        call(patch(own+"/"+id),other,Map.of("name","Invadida"),key(),0L,404);
        call(delete(own+"/"+id),other,null,key(),0L,404);
        call(post(own+"/"+id+"/valuations"),other,Map.of("amount",new BigDecimal("1.00"),"valuedOn","2026-11-10"),key(),null,404);
        call(put(own+"/"+id+"/valuations/"+valuation),other,Map.of("amount",new BigDecimal("1.00"),"valuedOn","2026-11-10"),key(),0L,404);
        call(post(own+"/"+id+"/movements"),other,Map.of("type","INCOME","amount",new BigDecimal("1.00"),"occurredOn","2026-11-10"),key(),null,404);
        call(put(own+"/"+id+"/movements/"+m.path("id").asLong()),other,Map.of("type","INCOME","amount",new BigDecimal("1.00"),"occurredOn","2026-11-10"),key(),0L,404);
        call(delete(own+"/"+id+"/movements/"+m.path("id").asLong()),other,null,key(),0L,404);
        call(get("/financial/user/"+stranger+"/entries/"+m.path("entryId").asLong()),other,null,null,null,404);
        assertThat(read(path).path("name").asText()).isEqualTo("Privada");
        assertThat(call(get(own),other,null,null,null,200).path("totalElements").asLong()).isZero();
    }

    @Test void investmentTagIsResolvedByKeyAndSurvivesRenames()throws Exception {
        signup.handleUserCreated(new UserCreatedEvent(this,owner));
        Long tag=db.queryForObject("select id from tags where user_id=? and system_key='INVESTMENTS'",Long.class,owner);
        db.update("update tags set name='Carteira' where id=?",tag);
        long id=invest("CDB","10.00").path("id").asLong();
        assertThat(entry(move(id,"CONTRIBUTION","5.00","2026-11-10").path("entryId").asLong()).path("tagId").asLong()).isEqualTo(tag);
        // An account without the signup tags adopts its own "Investimentos" tag instead of creating a twin.
        Long custom=db.queryForObject("insert into tags(user_id,name,color,is_default,allow_negative,created_at) values(?,'Investimentos','#781336',false,true,now()) returning id",Long.class,stranger);
        long theirs=call(post("/financial/user/"+stranger+"/investments"),other,Map.of("name","FII","assetClass","REAL_ESTATE_FUNDS","initialValue",new BigDecimal("1.00"),"valuedOn","2026-11-01"),key(),null,201).path("id").asLong();
        long cash=call(post("/financial/user/"+stranger+"/investments/"+theirs+"/movements"),other,Map.of("type","INCOME","amount",new BigDecimal("1.00"),"occurredOn","2026-11-10"),key(),null,201).path("entryId").asLong();
        assertThat(db.queryForObject("select tag_id from financial_entry where id=?",Long.class,cash)).isEqualTo(custom);
        assertThat(db.queryForObject("select count(*) from tags where user_id=? and system_key='INVESTMENTS'",Long.class,stranger)).isEqualTo(1);
    }

    @Test void entryPagesLinkInvestmentsWithAConstantQueryCount()throws Exception {
        long id=invest("Lote","1000.00").path("id").asLong();
        move(id,"CONTRIBUTION","1.00","2026-11-10");
        var stats=emf.unwrap(SessionFactory.class).getStatistics();
        String page="/financial/user/"+owner+"/entries?size=50";
        stats.clear();read(page);long one=stats.getPrepareStatementCount();
        for(int i=0;i<19;i++)move(id,"CONTRIBUTION","1.00","2026-11-10");
        stats.clear();JsonNode many=read(page);
        assertThat(many.path("content").size()).isEqualTo(20);
        assertThat(many.path("content").get(0).path("investmentId").asLong()).isEqualTo(id);
        assertThat(stats.getPrepareStatementCount()).isEqualTo(one);
    }
}
