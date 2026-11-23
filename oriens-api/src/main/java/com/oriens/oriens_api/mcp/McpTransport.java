package com.oriens.oriens_api.mcp;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.core.StreamReadFeature;
import com.oriens.oriens_api.service.*;
import io.modelcontextprotocol.common.McpTransportContext;
import io.modelcontextprotocol.json.jackson3.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.*;
import org.springframework.ai.mcp.server.webmvc.transport.WebMvcStatelessServerTransport;
import io.modelcontextprotocol.spec.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.function.*;
import reactor.core.publisher.Mono;
import java.time.*;
import java.util.*;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
public class McpTransport {
    @Bean McpWorkTools mcpWorkTools(McpStore store,McpRateLimiter limits,ScopedWorkReadService read,ProjectWorkService work,WorkCreationService receipts,JsonMapper json,Clock clock,FinancialEntryServiceImpl finance,FinancialStatisticsService statistics,org.springframework.jdbc.core.JdbcTemplate db) {
        return new McpWorkTools(store,limits,read,work,receipts,json,clock,new McpFinancialTools(finance,statistics,db,json));
    }
    @Bean WebMvcStatelessServerTransport mcpHttpTransport() {
        var mapper=new JacksonMcpJsonMapper(JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build());
        return WebMvcStatelessServerTransport.builder().jsonMapper(mapper).contextExtractor(request->{
            Object principal=request.servletRequest().getAttribute("oriens.mcp.principal");
            if(!(principal instanceof McpStore.Delegated))throw McpStore.denied();
            return McpTransportContext.create(Map.of("principal",principal));
        }).build();
    }
    @Bean McpStatelessSyncServer mcpServer(WebMvcStatelessServerTransport transport,McpWorkTools tools,JsonMapper json) {
        // The SDK has a global registry. Decorate its transport SPI to filter discovery per
        // request, without mutating that registry or implementing JSON-RPC.
        McpStatelessServerTransport scoped=new McpStatelessServerTransport() {
            public void setMcpHandler(McpStatelessServerHandler sdk) {
                transport.setMcpHandler(new McpStatelessServerHandler() {
                    public Mono<McpSchema.JSONRPCResponse> handleRequest(McpTransportContext ctx,McpSchema.JSONRPCRequest request) {
                        return sdk.handleRequest(ctx,request).map(response->{
                            if(!request.method().equals("tools/list")||response.error()!=null)return response;
                            var allowed=tools.visible((McpStore.Delegated)ctx.get("principal"));
                            var result=json.convertValue(response.result(),McpSchema.ListToolsResult.class);
                            return new McpSchema.JSONRPCResponse(response.jsonrpc(),response.id(),
                                new McpSchema.ListToolsResult(result.tools().stream().filter(t->allowed.contains(t.name())).toList(),result.nextCursor(),result.meta()),null);
                        });
                    }
                    public Mono<Void> handleNotification(McpTransportContext ctx,McpSchema.JSONRPCNotification notification) {return sdk.handleNotification(ctx,notification);}
                });
            }
            public Mono<Void> closeGracefully() {return transport.closeGracefully();}
            public List<String> protocolVersions() {return transport.protocolVersions();}
        };
        // McpWorkTools owns strict input validation and the public error contract (PRECONDITION_REQUIRED,
        // INVALID_REQUEST...). The SDK's schema pre-validation would answer first with its own format.
        var builder=McpServer.sync(scoped).serverInfo("oriens","1.0").jsonMapper(new JacksonMcpJsonMapper(json))
            .validateToolInputs(false).requestTimeout(Duration.ofSeconds(15)).capabilities(McpSchema.ServerCapabilities.builder().tools(false).build());
        for(var definition:McpWorkCatalog.ALL)builder.toolCall(definition.tool(),(ctx,request)->
            tools.call(definition,(McpStore.Delegated)ctx.get("principal"),request.arguments()));
        return builder.build();
    }
    @Bean RouterFunction<ServerResponse> mcpRoutes(WebMvcStatelessServerTransport transport,McpStatelessSyncServer server){return transport.getRouterFunction();}
}
