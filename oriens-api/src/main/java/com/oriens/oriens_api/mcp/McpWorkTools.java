package com.oriens.oriens_api.mcp;

import com.fasterxml.jackson.databind.*;
import com.oriens.oriens_api.entity.*;
import com.oriens.oriens_api.entity.dto.work.*;
import com.oriens.oriens_api.entity.dto.work.WorkCommands.*;
import com.oriens.oriens_api.entity.embeddable.Location;
import com.oriens.oriens_api.entity.enums.*;
import com.oriens.oriens_api.exception.WorkDomainException;
import com.oriens.oriens_api.service.*;
import com.oriens.oriens_api.service.ScopedWorkReadService.Access;
import io.modelcontextprotocol.json.schema.jackson.DefaultJsonSchemaValidator;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.data.domain.*;
import java.time.*;
import java.util.*;
import static com.oriens.oriens_api.service.ScopedWorkReadService.fields;

/** Adapts the closed MCP contracts to the canonical domain. Policy, domain, receipt and audit
 * execute under one transaction; no controller calls or ambient SecurityContext identity. */
public class McpWorkTools {
    private final McpStore store;
    private final McpRateLimiter limits;
    private final ScopedWorkReadService read;
    private final ProjectWorkService work;
    private final WorkCreationService receipts;
    private final ObjectMapper json;
    private final DefaultJsonSchemaValidator schemas;
    private final Clock clock;
    private final McpFinancialTools finance;
    public McpWorkTools(McpStore store,McpRateLimiter limits,ScopedWorkReadService read,ProjectWorkService work,WorkCreationService receipts,ObjectMapper json,Clock clock,McpFinancialTools finance) {
        this.finance=finance;this.store=store;this.limits=limits;this.read=read;this.work=work;this.receipts=receipts;this.json=json;this.clock=clock;schemas=new DefaultJsonSchemaValidator(json);
    }
    private static Access access(McpStore.Policy p) {
        return new Access(p.userId(),p.allowedProjectIds(),p.allowStandaloneTasks(),p.scopes().contains("projects:read"),p.scopes().contains("tasks:read"));
    }
    public Set<String> visible(McpStore.Delegated d) {
        return store.withPolicy(d,p->{var names=new TreeSet<String>();for(var t:McpWorkCatalog.ALL)if(p.scopes().contains(t.scope()))names.add(t.tool().name());return Set.copyOf(names);});
    }
    public McpSchema.CallToolResult call(McpWorkCatalog.Definition definition,McpStore.Delegated d,Map<String,Object> arguments) {
        UUID requestId=UUID.randomUUID();long started=System.nanoTime();String name=definition.tool().name();
        try {
            JsonNode input=json.valueToTree(arguments==null?Map.of():arguments);
            validate(definition,input);
            String kind=definition.write()?"write":"read";
            if(!limits.acquire(Map.of(kind+":connection:"+d.connectionId(),definition.write()?30:120,kind+":account:"+d.userId(),definition.write()?60:300)))
                throw failure("RATE_LIMITED",null,"Aguarde antes de repetir a mesma intenção.");
            return store.withPolicy(d,p->{
                p.require(definition.scope());
                Access a=access(p);boolean replayed=false;Object data;
                if (McpFinancialTools.handles(name) && definition.write()) {
                    var result=finance.write(name,p,input);
                    data=finance.result(name,result.result().body());replayed=result.replayed();
                } else if(definition.write()) {
                    var result=receipts.execute(p.userId(),"mcp:"+p.connectionId()+":"+name,text(input,"idempotencyKey"),input,name.startsWith("oriens_create_")?201:200,
                        ()->mutate(definition,p,a,input),r->authorizeReplay(definition,p,a,r));
                    data=json.valueToTree(result.result().body()).get("data");replayed=result.replayed();
                } else if (McpFinancialTools.handles(name)) data=finance.read(name,p,input,page(input,"","entryDate"));
                else data=read(name,p,a,input);
                JsonNode tree=json.valueToTree(data);
                var envelope=fields("ok",true,"requestId",requestId.toString(),"data",tree,"meta",fields("timezone","America/Recife","replayed",replayed));
                // Check projection before commit, so an invalid output cannot leave a committed mutation.
                if(!schemas.validate(definition.tool().outputSchema(),envelope).valid()) throw new IllegalStateException("Invalid MCP projection");
                int count=tree.has("items")?tree.path("items").size():tree.has("columns")?
                    tree.path("columns").path("items").size()+tree.path("tasks").path("items").size():
                    tree.has("objectives")?1+tree.path("objectives").path("items").size():1;
                List<String> resources=new ArrayList<>();
                if(tree.has("resourceId"))resources.add(tree.path("resourceId").asText());
                else if(tree.has("id"))resources.add(tree.path("id").asText());
                else if(tree.has("projectId"))resources.add(tree.path("projectId").asText());
                store.audit(p.userId(),p.connectionId(),name,replayed?"REPLAY":"SUCCESS",requestId,
                    definition.write()?fieldsChanged(name,input):List.of(),count,(System.nanoTime()-started)/1_000_000,resources);
                return response(envelope,false);
            });
        }catch(WorkDomainException e) {return error(d,name,requestId,e,started);}
        catch(org.springframework.dao.OptimisticLockingFailureException|jakarta.persistence.OptimisticLockException e) {
            return error(d,name,requestId,failure("VERSION_CONFLICT",null,"Os dados mudaram. Consulte novamente antes de salvar."),started);
        }catch(org.springframework.transaction.TransactionTimedOutException|org.springframework.dao.TransientDataAccessException|jakarta.persistence.LockTimeoutException|jakarta.persistence.PessimisticLockException e) {
            return error(d,name,requestId,failure("TEMPORARILY_UNAVAILABLE",null,"Tente novamente com a mesma chave após uma breve espera."),started);
        }catch(RuntimeException e) {return error(d,name,requestId,failure("INTERNAL_ERROR",null,"Não foi possível concluir. Consulte ou repita com a mesma chave e informe requestId."),started);}
    }
    private McpSchema.CallToolResult response(Object body,boolean error) {
        try {
            var b=McpSchema.CallToolResult.builder().isError(error).addTextContent(json.writeValueAsString(body));
            if(!error)b.structuredContent(json.convertValue(body,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){}));
            return b.build();
        } catch(java.io.IOException e) {throw new IllegalStateException("Cannot project MCP response",e);}
    }
    private McpSchema.CallToolResult error(McpStore.Delegated d,String name,UUID requestId,WorkDomainException error,long started) {
        String code=error.getCode();String message=error.getMessage();
        try {store.toolFailure(d,requestId,name,Set.of("INTERNAL_ERROR","TEMPORARILY_UNAVAILABLE").contains(code)?"FAILED":"DENIED",(System.nanoTime()-started)/1_000_000);}
        catch(RuntimeException unavailable){code="INTERNAL_ERROR";message="Não foi possível registrar o resultado. Informe requestId.";}
        var details=fields("code",code,"message",message,"fieldErrors",error.getField()==null?List.of():List.of(fields("field",error.getField(),"message",message)),
            "retryable",Set.of("TEMPORARILY_UNAVAILABLE","RATE_LIMITED").contains(code));
        if(code.equals("RATE_LIMITED"))details.put("retryAfterSeconds",60-clock.instant().getEpochSecond()%60);
        return response(fields("ok",false,"requestId",requestId.toString(),"error",details),true);
    }
    private void validate(McpWorkCatalog.Definition d,JsonNode n) {
        if(!n.isObject())throw McpStore.invalid("Argumentos devem formar um objeto.");
        @SuppressWarnings("unchecked") var required=(List<String>)d.input().get("required");
        for(String name:required)if(!n.has(name)&&(name.equals("idempotencyKey")||name.startsWith("expected")))
            throw failure("PRECONDITION_REQUIRED",name,"Informe a chave e as versões exigidas pela operação.");
        if(!schemas.validate(d.input(),n).valid())throw McpStore.invalid("Campos desconhecidos, ausentes, com tipo, formato ou limite inválido.");
        var keys=n.fieldNames();
        while(keys.hasNext()) {
            String key=keys.next();JsonNode value=n.get(key);
            if(value.isNull())continue;
            if(key.endsWith("Id"))id(n,key);
            if(key.startsWith("expected")||key.equals("page")||key.endsWith("Page")||key.endsWith("PageSize")||key.equals("pageSize")) {
                if(!value.isIntegralNumber()||!value.canConvertToLong())throw McpStore.invalid("Inteiro fora de faixa.");
            }
            if(key.endsWith("Date"))date(n,key);
            if(key.equals("startTime"))time(n,key);
        }
        if(n.hasNonNull("idempotencyKey")) {
            try{if(!UUID.fromString(text(n,"idempotencyKey")).toString().equalsIgnoreCase(text(n,"idempotencyKey")))throw new IllegalArgumentException();}
            catch(IllegalArgumentException e){throw McpStore.invalid("idempotencyKey deve ser UUID.");}
        }
        if(d.tool().name().equals("oriens_list_tasks")) {
            if(bool(n,"standaloneOnly")&&n.has("projectId")||n.has("columnId")&&!n.has("projectId"))throw McpStore.invalid("Combinação de filtros inválida.");
            boolean any=n.has("startDate")||n.has("endDate")||n.has("dateField");
            if(any&&!(n.has("startDate")&&n.has("endDate")&&n.has("dateField")))throw McpStore.invalid("Informe dateField, startDate e endDate juntos.");
            if(any&&date(n,"startDate").isAfter(date(n,"endDate")))throw McpStore.invalid("Intervalo de datas inválido.");
        }
        if(d.tool().name().equals("oriens_update_task")&&!hasAny(n,"title","description","objectiveId","plannedDate","startTime","dueDate","priority","location","status")
            ||d.tool().name().equals("oriens_update_project")&&!hasAny(n,"title","description","color","favorite")
            ||d.tool().name().equals("oriens_update_objective")&&!hasAny(n,"title","dueDate","status"))throw McpStore.invalid("Informe ao menos um campo para alterar.");
    }
    private Object read(String name,McpStore.Policy p,Access a,JsonNode n) {
        return switch(name) {
            case "oriens_get_context" -> fields("connectionId",p.connectionId().toString(),"name",store.find(p.connectionId(),false).name(),"contractVersion","1.0", "now",clock.instant().toString(),
                "timezone","America/Recife","scopes",new TreeSet<>(p.scopes()),"allowedProjectIds",p.allowedProjectIds().stream().sorted().map(String::valueOf).toList(),"allowStandaloneTasks",p.allowStandaloneTasks());
            case "oriens_list_projects" -> read.listProjects(a,text(n,"search"),bool(n,"includeArchived"),page(n,"","id"));
            case "oriens_get_project" -> read.getProject(a,id(n,"projectId"),page(n,"objectives","position"));
            case "oriens_get_board" -> read.board(a,id(n,"projectId"),page(n,"columns","position"),boardTasks(n),id(n,"objectiveId"),text(n,"planning"),bool(n,"overdue"),bool(n,"open"));
            case "oriens_list_tasks" -> read.listTasks(a,new ScopedWorkReadService.TaskFilter(id(n,"projectId"),bool(n,"standaloneOnly"),id(n,"columnId"),enumeration(n,"status",Status.class),
                enumeration(n,"priority",Priority.class),text(n,"search"),text(n,"dateField"),date(n,"startDate"),date(n,"endDate")),page(n,"","createdAt"));
            case "oriens_get_task" -> read.getTask(a,id(n,"taskId"));
            default -> throw new IllegalStateException("Unregistered read");
        };
    }
    private Pageable page(JsonNode n,String prefix,String defaultSort) {
        int page=integer(n,prefix.isEmpty()?"page":prefix+"Page",0),size=integer(n,prefix.isEmpty()?"pageSize":prefix+"PageSize",20);McpStore.page(page,size);
        String sort=prefix.isEmpty()&&n.has("sortBy")?text(n,"sortBy"):defaultSort;
        Sort.Direction direction=prefix.isEmpty()?enumeration(n,"direction",Sort.Direction.class):Sort.Direction.ASC;
        if(direction==null)direction=Sort.Direction.DESC;
        Sort order=Sort.by(direction,sort);if(!sort.equals("id"))order=order.and(Sort.by(direction,"id"));
        return PageRequest.of(page,size,order);
    }
    private Pageable boardTasks(JsonNode n) {
        Pageable p=page(n,"tasks","position");return PageRequest.of(p.getPageNumber(),p.getPageSize(),Sort.by("columnId","position","id"));
    }
    private WorkCreationService.Created mutate(McpWorkCatalog.Definition d,McpStore.Policy p,Access a,JsonNode n) {
        String name=d.tool().name();String resourceKind=name.contains("objective")?"objective":name.contains("task")?"task":"project";
        var projectIds=new TreeSet<Long>();boolean standalone=false;Object resource=null;long resourceId,version=0;Long detached=null;
        String effects="Alteração concluída.";var usedScopes=new TreeSet<>(Set.of(d.scope()));
        if(resourceKind.equals("project")) {
            if(name.equals("oriens_create_project")) {
                Project created=work.createProject(p.userId(),new CreateProject(text(n,"title"),enumeration(n,"mode",ProjectMode.class),text(n,"description"),text(n,"color"),List.of()));
                resourceId=created.getId();version=created.getVersion();resource=read.projectBrief(created);
                @SuppressWarnings("unchecked") var createdMap=(Map<String,Object>)resource;createdMap.put("description",created.getDescription());
            } else {
                resourceId=id(n,"projectId");read.project(a,resourceId);projectIds.add(resourceId);usedScopes.add("projects:read");
                if(d.delete()) {
                    if(a.taskRead()){detached=read.taskCount(a,resourceId,null);usedScopes.add("tasks:read");}
                    work.deleteProject(p.userId(),resourceId,version(n,"expectedVersion"));effects="Projeto excluído. As tarefas foram preservadas como avulsas.";
                } else {
                    Project changed;
                    if(name.equals("oriens_set_project_archived"))changed=work.setArchived(p.userId(),resourceId,version(n,"expectedVersion"),bool(n,"archived"));
                    else {
                        var patch=new PatchProject();patch.setVersion(version(n,"expectedVersion"));
                        if(n.has("title"))patch.setTitle(text(n,"title"));if(n.has("description"))patch.setDescription(text(n,"description"));
                        if(n.has("color"))patch.setColor(text(n,"color"));if(n.has("favorite"))patch.setFavorite(bool(n,"favorite"));
                        changed=work.patchProject(p.userId(),resourceId,patch);
                    }
                    resource=read.projectDetail(changed);version=changed.getVersion();
                }
            }
        } else if(resourceKind.equals("objective")) {
            long projectId=id(n,"projectId");read.project(a,projectId);projectIds.add(projectId);usedScopes.add("projects:read");
            Objective changed;
            if(name.equals("oriens_create_objective")) changed=work.createObjective(p.userId(),projectId,new CreateObjective(version(n,"expectedProjectVersion"),text(n,"title"),date(n,"dueDate")));
            else {
                resourceId=id(n,"objectiveId");read.objective(a,projectId,resourceId);
                if(d.delete()) {
                    if(a.taskRead()){detached=read.taskCount(a,projectId,resourceId);usedScopes.add("tasks:read");}
                    work.deleteObjective(p.userId(),projectId,resourceId,version(n,"expectedVersion"),version(n,"expectedProjectVersion"));changed=null;effects="Objetivo excluído. As tarefas foram preservadas sem esse vínculo.";
                } else {
                    var patch=new PatchObjective();patch.setVersion(version(n,"expectedVersion"));
                    if(n.has("title"))patch.setTitle(text(n,"title"));if(n.has("dueDate"))patch.setDueDate(date(n,"dueDate"));if(n.has("status"))patch.setStatus(enumeration(n,"status",ObjectiveStatus.class));
                    changed=work.patchObjective(p.userId(),projectId,resourceId,patch);
                }
            }
            resourceId=changed==null?id(n,"objectiveId"):changed.getId();
            if(changed!=null) {resource=read.objectiveView(a,changed);version=changed.getVersion();if(a.taskRead())usedScopes.add("tasks:read");}
        } else {
            usedScopes.add("tasks:read");Task changed;
            if(name.equals("oriens_create_task")) {
                Long projectId=id(n,"projectId");p.task(projectId);standalone=projectId==null;
                if(projectId!=null) {read.project(a,projectId);projectIds.add(projectId);validateLinks(a,n,projectId);}
                changed=work.createTask(p.userId(),new CreateTask(text(n,"title"),text(n,"description"),projectId,projectId==null?null:version(n,"expectedProjectVersion"),id(n,"objectiveId"),id(n,"columnId"),
                    date(n,"plannedDate"),time(n,"startTime"),date(n,"dueDate"),enumeration(n,"priority",Priority.class),location(n),null));
                resourceId=changed.getId();
            } else {
                resourceId=id(n,"taskId");Task before=read.task(a,resourceId);Long source=before.getProjectId();standalone=source==null;
                if(source!=null){projectIds.add(source);version(n,"expectedProjectVersion");}
                if(d.delete()) {work.deleteTask(p.userId(),resourceId,version(n,"expectedVersion"),source==null?null:version(n,"expectedProjectVersion"));changed=null;effects="Tarefa excluída.";}
                else {
                    var patch=new PatchTask();patch.setVersion(version(n,"expectedVersion"));
                    if(source!=null)patch.setProjectVersion(version(n,"expectedProjectVersion"));
                    if(name.equals("oriens_move_task")) {
                        Long target=id(n,"targetProjectId");p.task(target);standalone|=target==null;
                        if(target!=null) {
                            read.project(a,target);projectIds.add(target);validateLinks(a,n,target);
                            if(!Objects.equals(source,target)) {
                                Long targetVersion=version(n,"expectedTargetProjectVersion");
                                if(source==null)patch.setProjectVersion(targetVersion);else patch.setTargetProjectVersion(targetVersion);
                            } else if(n.has("expectedTargetProjectVersion")&&!Objects.equals(version(n,"expectedTargetProjectVersion"),version(n,"expectedProjectVersion")))throw failure("VERSION_CONFLICT","expectedTargetProjectVersion","Versões do mesmo projeto devem concordar.");
                        }
                        if(n.hasNonNull("beforeTaskId")) {
                            Task anchor=read.task(a,id(n,"beforeTaskId"));if(!Objects.equals(anchor.getProjectId(),target))throw McpStore.missing();
                            patch.setBeforeTaskId(anchor.getId());
                        }
                        patch.setProjectId(target);if(n.has("columnId"))patch.setColumnId(id(n,"columnId"));
                    } else {
                        if(source!=null)validateLinks(a,n,source);
                        if(n.has("title"))patch.setTitle(text(n,"title"));if(n.has("description"))patch.setDescription(text(n,"description"));
                        if(n.has("plannedDate"))patch.setPlannedDate(date(n,"plannedDate"));if(n.has("startTime"))patch.setStartTime(time(n,"startTime"));
                        if(n.has("dueDate"))patch.setDueDate(date(n,"dueDate"));if(n.has("priority"))patch.setPriority(enumeration(n,"priority",Priority.class));
                        if(n.has("location"))patch.setLocation(location(n));if(n.has("status"))patch.setStatus(enumeration(n,"status",Status.class));
                    }
                    if(n.has("objectiveId"))patch.setObjectiveId(id(n,"objectiveId"));
                    changed=work.patchTask(p.userId(),resourceId,patch);
                }
            }
            if(!projectIds.isEmpty())usedScopes.add("projects:read");
            if(changed!=null){resource=read.taskDetail(a,changed);version=changed.getVersion();}
        }
        var affected=new ArrayList<Map<String,Object>>();
        for(long projectId:projectIds)if(!(d.delete()&&resourceKind.equals("project"))) {
            Project affectedProject=read.project(a,projectId);affected.add(fields("id",Long.toString(projectId),"version",affectedProject.getVersion()));
        }
        var data=fields("operation",name,"resourceId",Long.toString(resourceId),"resource",resource,"affectedProjects",affected,"effects",effects);
        if(detached!=null)data.put("detachedTaskCount",detached);
        if(name.equals("oriens_create_project"))data.put("requiresProjectAuthorization",true);
        var proof=fields("policyRevision",p.policyRevision(),"projectIds",projectIds,"standalone",standalone,"scopes",usedScopes,"kind",resourceKind);
        return new WorkCreationService.Created(fields("data",data,"authorization",proof),version,resourceId);
    }
    private void validateLinks(Access a,JsonNode n,long projectId) {
        if(n.hasNonNull("objectiveId"))read.objective(a,projectId,id(n,"objectiveId"));
        if(n.hasNonNull("columnId"))read.column(a,projectId,id(n,"columnId"));
    }
    private void authorizeReplay(McpWorkCatalog.Definition d,McpStore.Policy p,Access a,CreationReceipt r) {
        JsonNode proof=r.getResponseBody().path("authorization");
        for(JsonNode scope:proof.path("scopes"))p.require(scope.asText());
        boolean exception=d.tool().name().equals("oriens_create_project")||d.tool().name().equals("oriens_delete_project");
        if(exception&&proof.path("policyRevision").asLong(-1)!=p.policyRevision())throw McpStore.missing();
        if(!exception)for(JsonNode id:proof.path("projectIds")) {p.project(id.asLong());read.project(a,id.asLong());}
        if(proof.path("standalone").asBoolean()&&!p.allowStandaloneTasks())throw McpStore.missing();
        if(!d.delete()) {
            if(d.tool().name().equals("oriens_create_project")) {
                if(!read.ownedProjectExists(p.userId(),r.getResourceId()))throw failure("RESOURCE_GONE",null,"O projeto criado já foi excluído.");
            } else read.authorizeReplayResource(a,proof.path("kind").asText(),r.getResourceId());
        }
    }
    private static List<String> fieldsChanged(String name,JsonNode n) {
        Set<String> targetIds=name.contains("_financial_")?Set.of("entryId"):name.contains("_task")?Set.of("taskId"):name.contains("_objective")?Set.of("projectId","objectiveId"):Set.of("projectId");
        var result=new ArrayList<String>();
        n.fieldNames().forEachRemaining(k->{if(!targetIds.contains(k)&&!k.equals("idempotencyKey")&&!k.startsWith("expected"))result.add(k);});
        Collections.sort(result);return result;
    }
    private static boolean hasAny(JsonNode n,String... names) {return Arrays.stream(names).anyMatch(n::has);}
    static String text(JsonNode n,String key) {return n.hasNonNull(key)?n.get(key).asText():null;}
    static boolean bool(JsonNode n,String key) {return n.path(key).asBoolean(false);}
    static int integer(JsonNode n,String key,int fallback) {return n.has(key)?n.get(key).intValue():fallback;}
    static Long id(JsonNode n,String key) {
        if(!n.hasNonNull(key))return null;
        try{String value=n.get(key).textValue();if(value==null||!value.matches("[1-9][0-9]*"))throw new IllegalArgumentException();return Long.parseLong(value);}
        catch(IllegalArgumentException e){throw McpStore.invalid("ID deve ser string decimal positiva dentro da faixa Long.");}
    }
    static Long version(JsonNode n,String key) {
        if(!n.hasNonNull(key))throw failure("PRECONDITION_REQUIRED",key,"Informe a versão lida do recurso.");return n.get(key).longValue();
    }
    static LocalDate date(JsonNode n,String key) {
        if(!n.hasNonNull(key))return null;
        try{String value=text(n,key);if(!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")||value.startsWith("0000-"))throw new DateTimeException("format");return LocalDate.parse(value);}
        catch(DateTimeException e){throw McpStore.invalid("Data inválida. Use YYYY-MM-DD.");}
    }
    private static LocalTime time(JsonNode n,String key) {
        if(!n.hasNonNull(key))return null;
        try{String value=text(n,key);if(!value.matches("[0-9]{2}:[0-9]{2}:[0-9]{2}"))throw new DateTimeException("format");return LocalTime.parse(value);}
        catch(DateTimeException e){throw McpStore.invalid("Horário inválido. Use HH:mm:ss.");}
    }
    static <T extends Enum<T>> T enumeration(JsonNode n,String key,Class<T> type) {return n.hasNonNull(key)?Enum.valueOf(type,text(n,key)):null;}
    private static Location location(JsonNode n) {return n.hasNonNull("location")?new Location(text(n.get("location"),"address"),number(n.get("location"),"latitude"),number(n.get("location"),"longitude")):null;}
    private static Double number(JsonNode n,String key) {return n.hasNonNull(key)?n.get(key).doubleValue():null;}
    private static WorkDomainException failure(String code,String field,String message) {return new WorkDomainException(code,field,message);}
}
