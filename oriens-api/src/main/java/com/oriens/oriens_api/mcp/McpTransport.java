package com.oriens.oriens_api.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonParser;
import io.modelcontextprotocol.common.McpTransportContext;
import io.modelcontextprotocol.json.jackson.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.*;
import io.modelcontextprotocol.server.transport.WebMvcStatelessServerTransport;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.function.*;
import java.time.*;
import java.util.*;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
public class McpTransport {
    @Bean WebMvcStatelessServerTransport mcpHttpTransport() {
        var mapper=new JacksonMcpJsonMapper(new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION));
        return WebMvcStatelessServerTransport.builder().jsonMapper(mapper).contextExtractor(request->{
            Object principal=request.servletRequest().getAttribute("oriens.mcp.principal");
            if(!(principal instanceof McpStore.Delegated))throw McpStore.denied();
            return McpTransportContext.create(Map.of("principal",principal));
        }).build();
    }
    @Bean McpStatelessSyncServer mcpServer(WebMvcStatelessServerTransport transport,McpStore store,McpRateLimiter limits,Clock clock) {
        var mapper=new JacksonMcpJsonMapper(new ObjectMapper());
        var tool=McpSchema.Tool.builder().name("oriens_get_context").title("Permissões desta conexão")
            .description("Retorna somente permissões, IDs autorizados e o horário do Oriens; não lê conteúdo de projetos, tarefas ou finanças.")
            .inputSchema(new McpSchema.JsonSchema("object",Map.of(),List.of(),false,null,null))
            .outputSchema(object(Map.of("ok",Map.of("type","boolean"),"requestId",Map.of("type","string","format","uuid"),
                "data",object(Map.of("connectionId",Map.of("type","string","format","uuid"),"name",Map.of("type","string"),"contractVersion",Map.of("type","string"),
                    "now",Map.of("type","string","format","date-time"),"timezone",Map.of("type","string"),"scopes",Map.of("type","array","items",Map.of("type","string")),
                    "allowedProjectIds",Map.of("type","array","items",Map.of("type","string","pattern","^[1-9][0-9]*$")),"allowStandaloneTasks",Map.of("type","boolean"))),
                "meta",object(Map.of("timezone",Map.of("type","string"),"replayed",Map.of("type","boolean"))))))
            .annotations(new McpSchema.ToolAnnotations("Permissões desta conexão",true,false,true,false,false)).build();
        return McpServer.sync(transport).serverInfo("oriens","1.0").requestTimeout(Duration.ofSeconds(15))
            .capabilities(McpSchema.ServerCapabilities.builder().tools(false).build())
            .toolCall(tool,(ctx,request)->{
                var delegated=(McpStore.Delegated)ctx.get("principal");
                String requestId=UUID.randomUUID().toString();long started=System.nanoTime();
                try {
                    if(request.arguments()!=null&&!request.arguments().isEmpty())throw McpStore.invalid("Esta ferramenta não aceita argumentos.");
                    if(!limits.acquire(Map.of("read:connection:"+delegated.connectionId(),120,"read:account:"+delegated.userId(),300)))
                        throw new com.oriens.oriens_api.exception.WorkDomainException("RATE_LIMITED",null,"Aguarde o próximo minuto antes de tentar novamente.");
                    return store.withPolicy(delegated,policy->{
                        policy.require("mcp:context");
                        var connection=store.find(policy.connectionId(),false);
                        var data=Map.of("connectionId",policy.connectionId().toString(),"name",connection.name(),"contractVersion","1.0",
                            "now",clock.instant().toString(),"timezone","America/Recife","scopes",new TreeSet<>(policy.scopes()),
                            "allowedProjectIds",policy.allowedProjectIds().stream().sorted().map(String::valueOf).toList(),"allowStandaloneTasks",policy.allowStandaloneTasks());
                        store.audit(policy.userId(),policy.connectionId(),"oriens_get_context","SUCCESS",UUID.fromString(requestId),List.of(),1,(System.nanoTime()-started)/1_000_000);
                        Map<String,Object> result=Map.of("ok",true,"requestId",requestId,"data",data,"meta",Map.of("timezone","America/Recife","replayed",false));
                        try{return McpSchema.CallToolResult.builder().structuredContent(result).addTextContent(mapper.writeValueAsString(result)).isError(false).build();}
                        catch(Exception e){throw new IllegalStateException("Cannot project MCP context",e);}
                    });
                }catch(com.oriens.oriens_api.exception.WorkDomainException failure){
                    return failure(store,delegated,requestId,failure.getCode(),"DENIED",started);
                }catch(RuntimeException failure){
                    return failure(store,delegated,requestId,"INTERNAL_ERROR","FAILED",started);
                }
            }).build();
    }
    private static Map<String,Object> object(Map<String,Object> properties) {
        return Map.of("type","object","properties",properties,"required",new ArrayList<>(new TreeSet<>(properties.keySet())),"additionalProperties",false);
    }
    private McpSchema.CallToolResult failure(McpStore store,McpStore.Delegated delegated,String requestId,String code,String outcome,long started) {
        try {store.toolFailure(delegated,UUID.fromString(requestId),outcome,(System.nanoTime()-started)/1_000_000);}
        catch(RuntimeException unavailable) {code="INTERNAL_ERROR";}
        return McpSchema.CallToolResult.builder().isError(true).addTextContent("{\"ok\":false,\"code\":\""+code+"\",\"requestId\":\""+requestId+"\""+(code.equals("RATE_LIMITED")?",\"retryAfterSeconds\":"+(60-Instant.now().getEpochSecond()%60):"")+"}").build();
    }
    @Bean RouterFunction<ServerResponse> mcpRoutes(WebMvcStatelessServerTransport transport,McpStatelessSyncServer server){return transport.getRouterFunction();}
}
