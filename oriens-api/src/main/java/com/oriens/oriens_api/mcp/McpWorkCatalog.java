package com.oriens.oriens_api.mcp;

import io.modelcontextprotocol.spec.McpSchema;
import java.util.*;
import static com.oriens.oriens_api.service.ScopedWorkReadService.fields;

/** Explicit domain surface; never discovers Spring methods or exposes REST DTOs automatically. */
public final class McpWorkCatalog {
    private McpWorkCatalog() {}
    public record Definition(McpSchema.Tool tool,String scope,boolean write,boolean delete,Map<String,Object> input) {}
    static final Map<String,Object> TEXT=Map.of("type","string"),BOOL=Map.of("type","boolean"),
        ID=Map.of("type","string","pattern","^[1-9][0-9]{0,18}$"),VERSION=Map.of("type","integer","minimum",0,"maximum",Long.MAX_VALUE),
        COUNT=Map.of("type","integer","minimum",0),DATE=Map.of("type","string","format","date","pattern","^[0-9]{4}-[0-9]{2}-[0-9]{2}$"),
        TIME=Map.of("type","string","pattern","^[0-9]{2}:[0-9]{2}:[0-9]{2}$"),
        UUID_SCHEMA=Map.of("type","string","format","uuid","pattern","^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    private static final Map<String,Object> TITLE=Map.of("type","string","minLength",1,"maxLength",200),
        DESCRIPTION=Map.of("type","string","maxLength",10000),COLOR=Map.of("type","string","maxLength",255),
        OBJECTIVE_STATUS=choices("BACKLOG","PENDING","ON_DOING","PAUSED","CONCLUDED","CANCELLED"),
        STATUS=choices("BACKLOG","PENDING","ON_DOING","CANCELLED","CONCLUDED"),PRIORITY=choices("NONE","LOW","MEDIUM","HIGH","URGENT"),MODE=choices("SIMPLE","DEVELOPMENT"),
        LOCATION=object(fields("address",nullable(Map.of("type","string","maxLength",255)),
            "latitude",nullable(Map.of("type","number","minimum",-90,"maximum",90)),
            "longitude",nullable(Map.of("type","number","minimum",-180,"maximum",180))));
    static Map<String,Object> choices(String... values) {return Map.of("type","string","enum",List.of(values));}
    static Map<String,Object> nullable(Map<String,Object> schema) {return Map.of("anyOf",List.of(schema,Map.of("type","null")));}
    static Map<String,Object> array(Map<String,Object> item) {return Map.of("type","array","items",item);}
    @SuppressWarnings("unchecked")
    static Map<String,Object> object(Map<String,Object> properties,String... required) {
        return Map.of("type","object","properties",properties,"required",List.of(required),"additionalProperties",false);
    }
    static Map<String,Object> complete(Map<String,Object> properties) {return object(properties,properties.keySet().toArray(String[]::new));}
    static Map<String,Object> extend(Map<String,Object> base,Object... pairs) {
        var result=new LinkedHashMap<>(base);result.putAll(fields(pairs));return result;
    }
    private static final Map<String,Object> COUNTS=complete(fields("totalTasks",COUNT,"nonCancelledTasks",COUNT,"completedTasks",COUNT,"cancelledTasks",COUNT));
    private static final Map<String,Object> PROJECT_FIELDS=fields("id",ID,"title",TEXT,"mode",MODE,"color",nullable(TEXT),"favorite",BOOL,"archived",BOOL,"version",VERSION);
    private static final Map<String,Object> OBJECTIVE=object(fields("id",ID,"projectId",ID,"title",TEXT,"description",nullable(DESCRIPTION),"startDate",nullable(DATE),"dueDate",nullable(DATE),
        "status",OBJECTIVE_STATUS,"favorite",BOOL,"position",COUNT,"version",VERSION,"taskCounts",COUNTS),"id","projectId","title","dueDate","status","position","version");
    private static final Map<String,Object> COLUMN=object(fields("id",ID,"projectId",ID,"name",TEXT,"kind",STATUS,"position",COUNT,"version",VERSION,
        "totalCount",COUNT,"visibleCount",COUNT),"id","projectId","name","kind","position","version");
    private static final Map<String,Object> TASK_FIELDS=fields("id",ID,"title",TEXT,"projectId",nullable(ID),"objectiveId",nullable(ID),"columnId",nullable(ID),
        "plannedDate",nullable(DATE),"startTime",nullable(TIME),"dueDate",nullable(DATE),"priority",PRIORITY,"status",STATUS,"version",VERSION);
    private static final Map<String,Object> TASK_DETAIL=complete(extend(TASK_FIELDS,"description",nullable(TEXT),"position",nullable(COUNT),"completedAt",nullable(DATE),
        "createdAt",Map.of("type","string","format","date-time"),"location",nullable(LOCATION),
        "project",nullable(complete(fields("id",ID,"title",TEXT,"version",VERSION))),
        "objective",nullable(complete(fields("id",ID,"title",TEXT,"version",VERSION))),
        "column",nullable(complete(fields("id",ID,"name",TEXT,"kind",STATUS,"version",VERSION))),
        "labels",array(complete(fields("id",ID,"name",TEXT,"color",choices("RED","ORANGE","YELLOW","GREEN","BLUE","GRAY"),"version",VERSION)))));
    static Map<String,Object> page(Map<String,Object> item) {return complete(fields("items",array(item),"page",COUNT,"pageSize",COUNT,"totalElements",COUNT,"hasNext",BOOL));}
    static Map<String,Object> envelope(Map<String,Object> data) {
        return complete(fields("ok",BOOL,"requestId",UUID_SCHEMA,"data",data,"meta",complete(fields("timezone",TEXT,"replayed",BOOL))));
    }
    private static Map<String,Object> mutation(Map<String,Object> resource) {
        return object(fields("operation",TEXT,"resourceId",ID,"resource",nullable(resource),
            "affectedProjects",array(complete(fields("id",ID,"version",VERSION))),"effects",TEXT,"detachedTaskCount",COUNT,"requiresProjectAuthorization",BOOL),
            "operation","resourceId","resource","affectedProjects","effects");
    }
    static Map<String,Object> paging(String prefix) {
        return fields(prefix.isEmpty()?"page":prefix+"Page",Map.of("type","integer","minimum",0,"maximum",Integer.MAX_VALUE,"default",0),
            prefix.isEmpty()?"pageSize":prefix+"PageSize",Map.of("type","integer","minimum",1,"maximum",100,"default",20));
    }
    static Map<String,Object> sortedPaging(String defaultSort,String... sorts) {
        return extend(paging(""),"sortBy",extend(choices(sorts),"default",defaultSort),"direction",extend(choices("ASC","DESC"),"default","DESC"));
    }
    static Definition definition(String name,String scope,boolean write,boolean delete,String description,Map<String,Object> input,Map<String,Object> output) {
        @SuppressWarnings("unchecked") var properties=(Map<String,Object>)input.get("properties");
        @SuppressWarnings("unchecked") var required=(List<String>)input.get("required");
        var tool=McpSchema.Tool.builder().name("oriens_"+name).title(name.replace('_',' ')).description(description)
            .inputSchema(new McpSchema.JsonSchema("object",properties,required,false,null,null)).outputSchema(envelope(output))
            .annotations(new McpSchema.ToolAnnotations(name.replace('_',' '),!write,delete,true,false,false)).build();
        return new Definition(tool,scope,write,delete,input);
    }
    public static final List<Definition> ALL=build();
    private static List<Definition> build() {
        var out=new ArrayList<Definition>();
        var boardPaging=new LinkedHashMap<>(paging("columns"));boardPaging.putAll(paging("tasks"));
        var context=complete(fields("connectionId",UUID_SCHEMA,"name",TEXT,"contractVersion",TEXT,"now",Map.of("type","string","format","date-time"),
            "timezone",TEXT,"scopes",array(TEXT),"allowedProjectIds",array(ID),"allowStandaloneTasks",BOOL));
        out.add(definition("get_context","mcp:context",false,false,"Permissões vigentes desta conexão e horário do Oriens. Não lê conteúdo de domínio.",object(Map.of()),context));
        out.add(definition("list_projects","projects:read",false,false,"Lista somente projetos explicitamente autorizados, sem conteúdo de tarefas.",
            object(extend(sortedPaging("id","id","title","lastAccessed","favorite","archived"),"search",TEXT,"includeArchived",BOOL)),page(complete(PROJECT_FIELDS))));
        var projectDetail=extend(PROJECT_FIELDS,"description",nullable(TEXT),"defaultPendingColumnId",nullable(ID),"defaultCompletedColumnId",nullable(ID));
        out.add(definition("get_project","projects:read",false,false,"Metadados e objetivos paginados. Resumo e contagens de tarefas somente com leitura de tarefas. Não grava acesso recente.",
            object(extend(paging("objectives"),"projectId",ID),"projectId"),object(extend(projectDetail,"objectives",page(OBJECTIVE),"taskSummary",COUNTS,"includedSections",array(TEXT)),
                "id","title","mode","color","favorite","archived","version","description","defaultPendingColumnId","defaultCompletedColumnId","objectives","includedSections")));
        var projectCreated=complete(extend(PROJECT_FIELDS,"description",nullable(TEXT)));
        out.add(definition("create_project","projects:create",true,false,"Cria SIMPLE ou DEVELOPMENT; não autoriza acesso posterior ao novo projeto. Repetir a intenção exige a mesma chave UUID.",
            object(fields("idempotencyKey",UUID_SCHEMA,"title",TITLE,"mode",MODE,"description",nullable(DESCRIPTION),"color",nullable(COLOR)),"idempotencyKey","title","mode"),mutation(projectCreated)));
        out.add(definition("update_project","projects:update",true,false,"Atualiza metadados atomicamente. Campo ausente preserva; null limpa descrição/cor. Não muda modo nem objetivos.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"expectedVersion",VERSION,"title",TITLE,"description",nullable(DESCRIPTION),"color",nullable(COLOR),"favorite",BOOL),
                "idempotencyKey","projectId","expectedVersion"),mutation(complete(projectDetail))));
        out.add(definition("set_project_archived","projects:update",true,false,"Define archived explicitamente; não alterna o estado. Exige versão lida e chave UUID.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"expectedVersion",VERSION,"archived",BOOL),"idempotencyKey","projectId","expectedVersion","archived"),mutation(complete(projectDetail))));
        out.add(definition("delete_project","projects:delete",true,true,"Exclui projeto, objetivos e colunas. As tarefas sobrevivem como avulsas e ficam inacessíveis se avulsas não estão autorizadas.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"expectedVersion",VERSION),"idempotencyKey","projectId","expectedVersion"),mutation(complete(projectDetail))));
        out.add(definition("create_objective","objectives:create",true,false,"Cria objetivo no projeto autorizado; exige a versão do projeto.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"expectedProjectVersion",VERSION,"title",TITLE,"description",nullable(DESCRIPTION),"startDate",nullable(DATE),"dueDate",nullable(DATE),"status",OBJECTIVE_STATUS),"idempotencyKey","projectId","expectedProjectVersion","title"),mutation(OBJECTIVE)));
        out.add(definition("update_objective","objectives:update",true,false,"Edita objetivo. CONCLUDED conclui independentemente das tarefas; CANCELLED cancela. Ausente preserva; null limpa descrição e datas. Término não pode anteceder início.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"objectiveId",ID,"expectedVersion",VERSION,"title",TITLE,"description",nullable(DESCRIPTION),"startDate",nullable(DATE),"dueDate",nullable(DATE),"status",OBJECTIVE_STATUS,"favorite",BOOL),
                "idempotencyKey","projectId","objectiveId","expectedVersion"),mutation(OBJECTIVE)));
        out.add(definition("delete_objective","objectives:delete",true,true,"Exclui objetivo preservando tarefas e removendo seus vínculos. Contagem de tarefas somente com leitura autorizada.",
            object(fields("idempotencyKey",UUID_SCHEMA,"projectId",ID,"objectiveId",ID,"expectedVersion",VERSION,"expectedProjectVersion",VERSION),
                "idempotencyKey","projectId","objectiveId","expectedVersion","expectedProjectVersion"),mutation(OBJECTIVE)));
        out.add(definition("get_board","projects:read",false,false,"Estrutura paginada do quadro DEVELOPMENT. Tarefas têm paginação independente e referência de coluna; linhas/contagens somente com tasks:read. Totais do projeto e do filtro são distintos. startDate e endDate (juntos, até 366 dias) limitam o período consultado, não são campos da tarefa: entra a tarefa cujo intervalo entre plannedDate e dueDate cruza a janela; tarefa sem nenhuma das duas datas sempre entra.",
            object(extend(boardPaging,
                "projectId",ID,"objectiveId",ID,"planning",choices("today","unscheduled"),"overdue",BOOL,"open",BOOL,"startDate",DATE,"endDate",DATE),"projectId"),
            object(fields("projectId",ID,"projectVersion",VERSION,"columns",page(COLUMN),"tasks",page(complete(TASK_FIELDS)),"projectTaskCounts",COUNTS,"filteredTaskCounts",COUNTS,
                "filtered",BOOL,"includedSections",array(TEXT)),"projectId","projectVersion","columns","filtered","includedSections")));
        out.add(definition("list_tasks","tasks:read",false,false,"Consulta união dos projetos autorizados e avulsas permitidas. Prazo (dueDate) e dia planejado (plannedDate) são distintos. Intervalo exige dateField, startDate e endDate. Não aceita coluna sem projeto.",
            object(extend(sortedPaging("createdAt","id","title","dueDate","plannedDate","startTime","priority","status","createdAt"),"projectId",ID,"standaloneOnly",BOOL,"columnId",ID,
                "status",STATUS,"priority",PRIORITY,"search",TEXT,"dateField",choices("plannedDate","dueDate"),"startDate",DATE,"endDate",DATE)),page(complete(TASK_FIELDS))));
        out.add(definition("get_task","tasks:read",false,false,"Detalhe autorizado incluindo descrição, localização, etiquetas atribuídas e referências/versionamento necessários para futuras alterações.",
            object(fields("taskId",ID),"taskId"),TASK_DETAIL));
        var taskInput=fields("title",TITLE,"description",nullable(DESCRIPTION),"objectiveId",nullable(ID),"plannedDate",nullable(DATE),"startTime",nullable(TIME),"dueDate",nullable(DATE),"priority",PRIORITY,"location",nullable(LOCATION));
        out.add(definition("create_task","tasks:create",true,false,"Cria tarefa avulsa ou em projeto DEVELOPMENT autorizado. Horário exige dia planejado; planejamento não altera prazo. Projeto exige expectedProjectVersion. Preserva regras de coluna e objetivo.",
            object(extend(taskInput,"idempotencyKey",UUID_SCHEMA,"projectId",nullable(ID),"expectedProjectVersion",VERSION,"columnId",ID),"idempotencyKey","title"),mutation(TASK_DETAIL)));
        out.add(definition("update_task","tasks:update",true,false,"Patch de tarefa, preservando etiquetas. Ausente preserva; null limpa campos anuláveis. Projeto atual exige expectedProjectVersion. Em projeto, a coluna governa o estado; use move_task para coluna específica.",
            object(extend(taskInput,"idempotencyKey",UUID_SCHEMA,"taskId",ID,"expectedVersion",VERSION,"expectedProjectVersion",VERSION,"status",STATUS),"idempotencyKey","taskId","expectedVersion"),mutation(TASK_DETAIL)));
        out.add(definition("move_task","tasks:update",true,false,"Move atomicamente, validando origem, destino, coluna, objetivo e âncora beforeTaskId. targetProjectId null move para avulsas. Exige versões dos projetos envolvidos, inclusive destino de avulsa para projeto.",
            object(fields("idempotencyKey",UUID_SCHEMA,"taskId",ID,"expectedVersion",VERSION,"expectedProjectVersion",VERSION,"targetProjectId",nullable(ID),"expectedTargetProjectVersion",VERSION,
                "columnId",ID,"beforeTaskId",ID,"objectiveId",nullable(ID)),"idempotencyKey","taskId","expectedVersion","targetProjectId"),mutation(TASK_DETAIL)));
        out.add(definition("delete_task","tasks:delete",true,true,"Exclui tarefa autorizada com versão esperada; projeto atual exige expectedProjectVersion. Repetir exige a mesma intenção/chave.",
            object(fields("idempotencyKey",UUID_SCHEMA,"taskId",ID,"expectedVersion",VERSION,"expectedProjectVersion",VERSION),"idempotencyKey","taskId","expectedVersion"),mutation(TASK_DETAIL)));
        out.addAll(McpFinancialCatalog.ALL);
        return List.copyOf(out);
    }
}
