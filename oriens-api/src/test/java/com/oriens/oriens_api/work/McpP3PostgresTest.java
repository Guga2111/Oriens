package com.oriens.oriens_api.work;

import com.fasterxml.jackson.databind.JsonNode;
import com.oriens.oriens_api.service.*;
import com.oriens.oriens_api.mcp.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static com.oriens.oriens_api.service.ScopedWorkReadService.fields;

/** P3 plus the complete inherited P0/P1/P2 suite, against disposable PostgreSQL. */
class McpP3PostgresTest extends McpP2PostgresTest {
    @Autowired RecurringFinancialService recurring;
    @Autowired FinancialEntryServiceImpl finance;
    static final Set<String> FINANCE=Set.of("mcp:context","finance:read","finance:create","finance:update","finance:delete");
    Long category(long user,String name,boolean negative) {
        return db.queryForObject("insert into tags(user_id,name,color,is_default,allow_negative,created_at) values(?,?,?,false,?,now()) returning id",Long.class,user,name,"#781336",negative);
    }
    Grant financial()throws Exception {return grant(FINANCE,Set.of(),false);}
    Map<String,Object> entryIntent(long tag,String amount) {return intent("tagId",id(tag),"amount",amount,"entryDate",LocalDate.now().toString(),"description","Café sintético","isRecurring",false);}
    JsonNode create(Grant g,long tag,String amount)throws Exception {return success(g,"create_financial_entry",entryIntent(tag,amount)).path("data");}
    String rest() {return "/financial/user/"+owner+"/entries";}
    Map<String,Object> restInput(long tag,String amount) {return fields("tagId",tag,"amount",new BigDecimal(amount),"entryDate",LocalDate.now().toString(),"description","REST sintético","isRecurring",false);}
    JsonNode restCreate(long tag,String amount,String key)throws Exception {return body(mvc.perform(post(rest()).header("Authorization",jwt).header("Idempotency-Key",key).contentType("application/json").content(str(restInput(tag,amount)))).andExpect(status().isCreated()).andReturn());}

    @Test void financialScopesAreIndependentAndReadsNeverRevealAnotherAccount()throws Exception {
        long tag=category(owner,"Categoria permitida",true),foreign=category(other,"Categoria secreta",true);var g=financial();
        var created=create(g,tag,"-12.34");
        var catalog=body(rpc(g.bearer(),"tools/list","{}",200)).path("result").path("tools");assertThat(catalog).hasSize(8);assertThat(catalog.toString()).doesNotContain("oriens_get_task","oriens_get_project");
        var projects=grant(Set.of("mcp:context","projects:read"),Set.of(),false);
        denied(projects,"list_financial_entries",fields(),"INSUFFICIENT_SCOPE");
        denied(g,"list_financial_entries",fields("tagId",id(foreign)),"NOT_FOUND");
        denied(g,"get_financial_summary",fields("tagId",id(foreign),"startDate",LocalDate.now().toString(),"endDate",LocalDate.now().toString()),"NOT_FOUND");
        var bad=entryIntent(foreign,"1.00");denied(g,"create_financial_entry",bad,"NOT_FOUND");
        var categories=success(g,"list_financial_categories",fields()).path("data");assertThat(categories.path("totalElements").asLong()).isEqualTo(1);assertThat(categories.toString()).doesNotContain("secreta","userId");
        var otherGrant=store.create(other,"oriens-codex","Outra conta",FINANCE,Set.of(),false);
        var definition=McpWorkCatalog.ALL.stream().filter(d->d.tool().name().equals("oriens_get_financial_entry")).findFirst().orElseThrow();
        var response=tools.call(definition,new McpStore.Delegated(otherGrant.id(),other,"oriens-codex",FINANCE),fields("entryId",created.path("id").asText()));
        assertThat(response.isError()).isTrue();assertThat(response.toString()).contains("NOT_FOUND").doesNotContain("Café");
        mvc.perform(get(rest()+"/"+created.path("id").asText()).header("Authorization",otherJwt)).andExpect(status().isNotFound());
    }

    @Test void totalsCoverAllPagesWithExactCentsAndIndependentCategoryPaging()throws Exception {
        long a=category(owner,"Alimentação",true),b=category(owner,"Renda",true);var g=financial();String day=LocalDate.now().toString();
        db.update("insert into financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at) select ?,?,0.10,?::date,'Filtro café',false,now() from generate_series(1,50)",owner,b,day);
        db.update("insert into financial_entry(user_id,tag_id,amount,entry_date,description,is_recurring,created_at) select ?,?,-0.03,?::date,'Filtro café',false,now() from generate_series(1,75)",owner,a,day);
        create(g,a,"0.00");
        var list=success(g,"list_financial_entries",fields("search","filtro CAFÉ","page",6,"pageSize",20)).path("data");assertThat(list.path("items")).hasSize(5);assertThat(list.path("totalElements").asLong()).isEqualTo(125);
        var summary=success(g,"get_financial_summary",fields("search","filtro CAFÉ","startDate",day,"endDate",day,"categoriesPageSize",1,"categoriesPage",1)).path("data");
        assertThat(summary.path("income").asText()).isEqualTo("5.00");assertThat(summary.path("expenses").asText()).isEqualTo("2.25");assertThat(summary.path("result").asText()).isEqualTo("2.75");assertThat(summary.path("entries").asLong()).isEqualTo(125);
        assertThat(summary.path("categories").path("totalElements").asLong()).isEqualTo(2);assertThat(summary.path("categories").path("items")).hasSize(1);assertThat(summary.toString()).doesNotContain("previous","userId");
        var empty=success(g,"get_financial_summary",fields("search","inexistente","startDate",day,"endDate",day)).path("data");assertThat(empty.path("result").asText()).isEqualTo("0.00");assertThat(empty.path("categories").path("items")).isEmpty();
        denied(g,"get_financial_summary",fields("startDate",day,"endDate",LocalDate.now().plusDays(1).toString()),"INVALID_REQUEST");
        denied(g,"get_financial_summary",fields("startDate",LocalDate.now().minusDays(366).toString(),"endDate",day),"INVALID_REQUEST");
        success(g,"get_financial_summary",fields("startDate",LocalDate.now().minusDays(365).toString(),"endDate",day));
        var future=entryIntent(a,"1.00");future.put("entryDate",LocalDate.now().plusDays(40).toString());success(g,"create_financial_entry",future);
        success(g,"list_financial_entries",fields("startDate",LocalDate.now().plusDays(40).toString(),"endDate",LocalDate.now().plusDays(40).toString()));
        for(int i=0;i<104;i++)category(owner,"Categoria "+i,true);
        assertThat(success(g,"list_financial_categories",fields("page",5,"pageSize",20)).path("data").path("items")).hasSize(6);
    }

    @Test void everyMutationHasDurableReceiptVersionAndStrictMoneyAndPatchContracts()throws Exception {
        long tag=category(owner,"Geral",true),incomeOnly=category(owner,"Somente receita",false);var g=financial();
        var initial=entryIntent(tag,"-12.34");var created=repeat(g,"create_financial_entry",initial);String entry=created.path("id").asText();
        assertThat(created.path("version").asLong()).isZero();
        var patch=intent("entryId",entry,"expectedVersion",0,"description",null);var updated=repeat(g,"update_financial_entry",patch);
        assertThat(updated.path("amount").asText()).isEqualTo("-12.34");assertThat(updated.path("description").asText()).isEmpty();assertThat(updated.path("version").asLong()).isEqualTo(1);
        denied(g,"update_financial_entry",intent("entryId",entry,"expectedVersion",0,"amount","1.00"),"VERSION_CONFLICT");
        denied(g,"update_financial_entry",intent("entryId",entry,"expectedVersion",1,"amount",null),"INVALID_REQUEST");
        denied(g,"update_financial_entry",intent("entryId",entry,"expectedVersion",1),"INVALID_REQUEST");
        denied(g,"update_financial_entry",intent("entryId",entry,"description","sem versão"),"PRECONDITION_REQUIRED");
        var changed=new LinkedHashMap<>(initial);changed.put("amount","0.01");denied(g,"create_financial_entry",changed,"IDEMPOTENCY_CONFLICT");
        for(Object amount:List.of(1.25,"1.234","1e2","01.00","10000000000.00","NaN","1,00")) {
            var invalid=entryIntent(tag,"1.00");invalid.put("amount",amount);denied(g,"create_financial_entry",invalid,"INVALID_REQUEST");
        }
        create(g,tag,"9999999999.99");create(g,tag,"9999999999.99");create(g,tag,"-9999999999.99");
        assertThat(success(g,"get_financial_summary",fields("startDate",LocalDate.now().toString(),"endDate",LocalDate.now().toString())).path("data").path("income").asText()).isEqualTo("19999999999.98");
        denied(g,"create_financial_entry",entryIntent(incomeOnly,"-0.01"),"DOMAIN_VIOLATION");
        var forbidden=entryIntent(tag,"1.00");forbidden.put("parentEntryId",entry);denied(g,"create_financial_entry",forbidden,"INVALID_REQUEST");
        var invalid=entryIntent(tag,"1.00");invalid.remove("idempotencyKey");denied(g,"create_financial_entry",invalid,"PRECONDITION_REQUIRED");
        invalid=entryIntent(tag,"1.00");invalid.put("entryDate","2026-02-30");denied(g,"create_financial_entry",invalid,"INVALID_REQUEST");
        repeat(g,"delete_financial_entry",intent("entryId",entry,"expectedVersion",updated.path("version").asLong()));
        denied(g,"create_financial_entry",initial,"RESOURCE_GONE");denied(g,"update_financial_entry",patch,"RESOURCE_GONE");
        denied(g,"get_financial_entry",fields("entryId",entry),"NOT_FOUND");
    }

    @Test void restRequiresPreconditionsAndNamespacesDoNotCollideWithMcp()throws Exception {
        long tag=category(owner,"REST",true);var g=financial();String key=UUID.randomUUID().toString();
        mvc.perform(post(rest()).header("Authorization",jwt).contentType("application/json").content(str(restInput(tag,"1.00")))).andExpect(status().isPreconditionRequired());
        var created=restCreate(tag,"1.00",key);var replay=restCreate(tag,"1.00",key);assertThat(replay).isEqualTo(created);
        var mcp=entryIntent(tag,"1.00");mcp.put("idempotencyKey",key);success(g,"create_financial_entry",mcp);
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isEqualTo(2);
        String url=rest()+"/"+created.path("id").asText();
        mvc.perform(put(url).header("Authorization",jwt).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(str(restInput(tag,"2.00")))).andExpect(status().isPreconditionRequired());
        String update=UUID.randomUUID().toString();
        var first=body(mvc.perform(put(url).header("Authorization",jwt).header("Idempotency-Key",update).header("If-Match","\"0\"").contentType("application/json").content(str(restInput(tag,"2.00")))).andExpect(status().isOk()).andReturn());
        var again=body(mvc.perform(put(url).header("Authorization",jwt).header("Idempotency-Key",update).header("If-Match","\"0\"").contentType("application/json").content(str(restInput(tag,"2.00")))).andExpect(status().isOk()).andReturn());assertThat(again).isEqualTo(first);
        denied(g,"update_financial_entry",intent("entryId",created.path("id").asText(),"expectedVersion",0,"amount","3.00"),"VERSION_CONFLICT");
        mvc.perform(delete(url).header("Authorization",jwt)).andExpect(status().isPreconditionRequired());
        String deleteKey=UUID.randomUUID().toString();
        for(int i=0;i<2;i++)mvc.perform(delete(url).header("Authorization",jwt).header("If-Match","\"1\"").header("Idempotency-Key",deleteKey)).andExpect(status().isNoContent());
        mvc.perform(post(rest()).header("Authorization",jwt).header("Idempotency-Key",key).contentType("application/json").content(str(restInput(tag,"1.00")))).andExpect(status().isGone());
    }

    @Test void schedulerPreservesClaimsAndConsumesParentVersionWithoutPartialDefinitions()throws Exception {
        long tag=category(owner,"Recorrência",true);var g=financial();LocalDate today=LocalDate.now();
        var recurringInput=entryIntent(tag,"-0.10");recurringInput.put("entryDate",today.minusDays(2).toString());recurringInput.put("isRecurring",true);recurringInput.put("recurrencePattern","DAILY");
        var parent=repeat(g,"create_financial_entry",recurringInput);long parentId=parent.path("id").asLong();
        assertThat(db.queryForObject("select version from financial_entry where id=?",Long.class,parentId)).isEqualTo(parent.path("version").asLong());
        recurring.generate();
        long child=db.queryForObject("select id from financial_entry where parent_entry_id=?",Long.class,parentId);
        assertThat(db.queryForObject("select amount from financial_entry where id=?",BigDecimal.class,child)).isEqualByComparingTo("-0.10");
        assertThat(db.queryForObject("select version from financial_entry where id=?",Long.class,parentId)).isEqualTo(1);
        denied(g,"update_financial_entry",intent("entryId",id(parentId),"expectedVersion",0,"amount","-0.20"),"VERSION_CONFLICT");
        denied(g,"update_financial_entry",intent("entryId",id(child),"expectedVersion",0,"description","Editar filho"),"DOMAIN_VIOLATION");
        denied(g,"update_financial_entry",intent("entryId",id(parentId),"expectedVersion",1,"recurrencePattern","WEEKLY"),"DOMAIN_VIOLATION");
        denied(g,"delete_financial_entry",intent("entryId",id(parentId),"expectedVersion",1),"DOMAIN_VIOLATION");
        repeat(g,"delete_financial_entry",intent("entryId",id(child),"expectedVersion",0));recurring.generate();
        assertThat(db.queryForObject("select count(*) from financial_entry where parent_entry_id=?",Long.class,parentId)).isZero();
        assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=? and entry_id is null",Long.class,parentId)).isEqualTo(1);
        repeat(g,"update_financial_entry",intent("entryId",id(parentId),"expectedVersion",1,"recurrenceEndDate",today.minusDays(1).toString()));recurring.generate();
        assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=?",Long.class,parentId)).isEqualTo(1);
    }

    @Test void concurrentRestAndMcpUpdatesAndRepeatedCreatesCommitOnce()throws Exception {
        long tag=category(owner,"Corrida",true);var g=financial();var created=create(g,tag,"1.00");String entry=created.path("id").asText();
        var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var rest=pool.submit(()->{start.await();return mvc.perform(put(rest()+"/"+entry).header("Authorization",jwt).header("If-Match","\"0\"").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(str(restInput(tag,"2.00")))).andReturn().getResponse().getStatus();});
            var mcp=pool.submit(()->{start.await();return call(g,"update_financial_entry",intent("entryId",entry,"expectedVersion",0,"amount","3.00"));});start.countDown();
            int status=rest.get(15,TimeUnit.SECONDS);JsonNode response=mcp.get(15,TimeUnit.SECONDS);
            assertThat((status==200?1:0)+(response.path("ok").asBoolean()?1:0)).isEqualTo(1);
            if(status!=200)assertThat(status).isEqualTo(409);else assertThat(response.path("error").path("code").asText()).isEqualTo("VERSION_CONFLICT");
            assertThat(db.queryForObject("select version from financial_entry where id=?",Long.class,Long.parseLong(entry))).isEqualTo(1);
            var same=entryIntent(tag,"0.01");var barrier=new CountDownLatch(1);
            var a=pool.submit(()->{barrier.await();return success(g,"create_financial_entry",same);});var b=pool.submit(()->{barrier.await();return success(g,"create_financial_entry",same);});barrier.countDown();
            assertThat(a.get(15,TimeUnit.SECONDS).path("data")).isEqualTo(b.get(15,TimeUnit.SECONDS).path("data"));
            assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isEqualTo(2);
        } finally {pool.shutdownNow();}
    }

    @Test void schedulerAndClosureOrDeletionSerializeOnTheOriginInBothOrders()throws Exception {
        long tag=category(owner,"Locks recorrentes",true);var g=financial();LocalDate today=LocalDate.now();
        var pool=Executors.newFixedThreadPool(2);
        try {
            for(boolean delete:List.of(false,true)) {
                var input=entryIntent(tag,"-0.10");input.put("isRecurring",true);input.put("recurrencePattern","DAILY");input.put("entryDate",today.minusDays(2).toString());
                long parent=success(g,"create_financial_entry",input).path("data").path("id").asLong();
                var written=new CountDownLatch(1);var release=new CountDownLatch(1);
                var writer=pool.submit(()->new TransactionTemplate(manager).execute(tx->{
                    com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Command command;
                    if(delete)command=new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Delete(parent,0L);
                    else {
                        var patch=new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Patch();patch.set("recurrenceEndDate",json.valueToTree(today.minusDays(1).toString()));
                        command=new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Update(parent,0L,patch);
                    }
                    finance.write(owner,"rest:financial",UUID.randomUUID().toString(),command);written.countDown();
                    try {if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("test timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;
                }));
                assertThat(written.await(5,TimeUnit.SECONDS)).isTrue();
                var scheduler=pool.submit(()->recurring.generate());Thread.sleep(100);assertThat(scheduler.isDone()).isFalse();release.countDown();
                writer.get(10,TimeUnit.SECONDS);scheduler.get(10,TimeUnit.SECONDS);
                assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=?",Long.class,parent)).isZero();
            }
            var input=entryIntent(tag,"-0.10");input.put("isRecurring",true);input.put("recurrencePattern","DAILY");input.put("entryDate",today.minusDays(2).toString());
            long parent=success(g,"create_financial_entry",input).path("data").path("id").asLong();
            var generated=new CountDownLatch(1);var release=new CountDownLatch(1);
            var scheduler=pool.submit(()->new TransactionTemplate(manager).execute(tx->{recurring.generate();generated.countDown();try {if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("test timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;}));
            assertThat(generated.await(5,TimeUnit.SECONDS)).isTrue();
            var deletion=pool.submit(()->call(g,"delete_financial_entry",intent("entryId",id(parent),"expectedVersion",0)));
            Thread.sleep(100);assertThat(deletion.isDone()).isFalse();release.countDown();scheduler.get(10,TimeUnit.SECONDS);
            assertThat(deletion.get(10,TimeUnit.SECONDS).path("error").path("code").asText()).isEqualTo("VERSION_CONFLICT");
            assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=?",Long.class,parent)).isEqualTo(1);
        } finally {pool.shutdownNow();}
    }

    @Test void ownerSerializationDoesNotDeadlockSchedulerForeignKeyChecks()throws Exception {
        long tag=category(owner,"FK lock",true);var g=financial();
        var input=entryIntent(tag,"-0.10");input.put("isRecurring",true);input.put("recurrencePattern","DAILY");input.put("entryDate",LocalDate.now().minusDays(2).toString());
        long parent=success(g,"create_financial_entry",input).path("data").path("id").asLong();
        var originLocked=new CountDownLatch(1);var ownerLocked=new CountDownLatch(1);var release=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var scheduler=pool.submit(()->new TransactionTemplate(manager).execute(tx->{
                db.queryForObject("select id from statistics_coverage where id=1 for update",Long.class);
                db.queryForObject("select id from financial_entry where id=? for update",Long.class,parent);originLocked.countDown();
                try {if(!release.await(5,TimeUnit.SECONDS))throw new IllegalStateException("test timeout");}catch(InterruptedException e){throw new RuntimeException(e);}
                return recurring.generate();
            }));
            assertThat(originLocked.await(5,TimeUnit.SECONDS)).isTrue();
            var writer=pool.submit(()->store.withPolicy(g.delegated(),p->{
                ownerLocked.countDown();var patch=new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Patch();patch.set("description",json.valueToTree("Concorrente"));
                return finance.write(owner,"mcp:"+p.connectionId()+":oriens_update_financial_entry",UUID.randomUUID().toString(),
                    new com.oriens.oriens_api.entity.dto.financial.FinancialCommands.Update(parent,0L,patch));
            }));
            assertThat(ownerLocked.await(5,TimeUnit.SECONDS)).isTrue();release.countDown();scheduler.get(10,TimeUnit.SECONDS);
            assertThatThrownBy(()->writer.get(10,TimeUnit.SECONDS)).hasCauseInstanceOf(com.oriens.oriens_api.exception.WorkDomainException.class)
                .satisfies(e->assertThat(((com.oriens.oriens_api.exception.WorkDomainException)e.getCause()).getCode()).isEqualTo("VERSION_CONFLICT"));
            assertThat(db.queryForObject("select count(*) from financial_occurrences where parent_entry_id=?",Long.class,parent)).isEqualTo(1);
        } finally {release.countDown();pool.shutdownNow();}
    }

    @Test void rollbackExpiryRevocationAndReductionApplyBeforeFinancialReplay()throws Exception {
        long tag=category(owner,"Auditoria",true);var g=financial();var input=entryIntent(tag,"1.00");
        db.execute("create function p3_audit_failure() returns trigger language plpgsql as $$ begin if NEW.action='oriens_create_financial_entry' and NEW.result='SUCCESS' then raise exception 'synthetic audit failure'; end if; return NEW; end $$");
        db.execute("create trigger p3_audit_failure before insert on mcp_audit_events for each row execute function p3_audit_failure()");
        try {denied(g,"create_financial_entry",input,"INTERNAL_ERROR");assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isZero();}
        finally {db.execute("drop trigger p3_audit_failure on mcp_audit_events");db.execute("drop function p3_audit_failure()");}
        repeat(g,"create_financial_entry",input);
        var event=db.queryForObject("select field_names::text from mcp_audit_events where connection_id=? and result='SUCCESS' and action='oriens_create_financial_entry'",String.class,g.delegated().connectionId());assertThat(event).contains("amount").doesNotContain("1.00","Café");
        var otherConnection=financial();success(otherConnection,"create_financial_entry",input);assertThat(db.queryForObject("select count(*) from financial_entry where user_id=?",Long.class,owner)).isEqualTo(2);
        db.update("update creation_receipts set created_at=now()-interval '2 days',expires_at=now()-interval '1 second' where user_id=?",owner);receipts.cleanExpiredBodies();denied(g,"create_financial_entry",input,"RESOURCE_GONE");
        store.patch(owner,otherConnection.delegated().connectionId(),0L,null,Set.of("mcp:context","finance:read"),null,null);denied(otherConnection,"create_financial_entry",input,"INSUFFICIENT_SCOPE");
        store.revoke(owner,g.delegated().connectionId(),0L);rpc(g.bearer(),"tools/call",str(fields("name","oriens_create_financial_entry","arguments",input)),401);
    }
    @Test @org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="MCP_P3_BROWSER_PROOF",matches="1")
    void productionFinancialUiRetriesCommittedWritesAndRecoversConflict()throws Exception {
        long tag=category(owner,"Alimentação",true);
        var initial=restInput(tag,"-12.34");initial.put("description","Café sintético");
        var created=body(mvc.perform(post(rest()).header("Authorization",jwt).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(str(initial))).andExpect(status().isCreated()).andReturn());
        var recurringInput=restInput(tag,"2500.00");recurringInput.put("description","Recorrência sintética");recurringInput.put("isRecurring",true);recurringInput.put("recurrencePattern","DAILY");
        mvc.perform(post(rest()).header("Authorization",jwt).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(str(recurringInput))).andExpect(status().isCreated());
        String token="Bearer "+com.auth0.jwt.JWT.create().withSubject(users.findById(owner).orElseThrow().getEmail()).withClaim("userId",owner).withClaim("username","Conta sintética").withClaim("role","USER").withExpiresAt(Instant.now().plusSeconds(600)).sign(algorithm);
        var runner=new ProcessBuilder("node","ops/mcp-account/financial_browser_proof.mjs").inheritIO();
        runner.environment().put("P3_API",properties.issuer().toString());runner.environment().put("P3_JWT",token);
        runner.environment().put("P3_USER_ID",Long.toString(owner));runner.environment().put("P3_TAG_ID",Long.toString(tag));
        var process=runner.start();
        boolean ended=process.waitFor(150,TimeUnit.SECONDS);
        if(!ended)process.destroyForcibly();
        assertThat(ended).as("production browser proof completed").isTrue();assertThat(process.exitValue()).isZero();
        assertThat(db.queryForObject("select count(*) from financial_entry where user_id=? and description='Browser idempotente'",Long.class,owner)).isEqualTo(1);
        assertThat(db.queryForObject("select count(*) from financial_entry where id=?",Long.class,created.path("id").asLong())).isZero();
        assertThat(db.queryForObject("select recurrence_end_date from financial_entry where user_id=? and description='Recorrência sintética'",LocalDate.class,owner)).isEqualTo(LocalDate.now());
    }
}
