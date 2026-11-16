package com.oriens.oriens_api.mcp;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import com.oriens.oriens_api.security.WorkOwner;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@ConditionalOnProperty(name="oriens.mcp.enabled",havingValue="true")
public class McpController {
    private final McpStore store;private final WorkOwner owner;private final McpFlows flows;private final McpProperties props;
    public McpController(McpStore store,WorkOwner owner,McpFlows flows,McpProperties props){this.store=store;this.owner=owner;this.flows=flows;this.props=props;}
    @GetMapping({"/.well-known/oauth-protected-resource","/.well-known/oauth-protected-resource/mcp"})
    public Map<String,Object> resource(){return Map.of("resource",props.resource(),"authorization_servers",List.of(props.base()),"scopes_supported",new TreeSet<>(McpScopes.ALL),"bearer_methods_supported",List.of("header"));}
    @GetMapping("/integrations/mcp/setup")
    public Map<String,Object> setup(@RequestParam String client,Authentication principal){
        owner.id(principal);
        if(client.equals("other"))return Map.of("client",client,"resource",props.resource(),"issuer",props.base(),
            "redirectUris",List.of(),"scopes",new TreeSet<>(McpScopes.ALL),"authorizationRequired",true,
            "registrationRequired",true,"auditRetentionDays",90);
        if(!Set.of("codex","claude-code").contains(client))throw McpStore.invalid("Cliente ainda não registrado neste ambiente.");
        String id=client.equals("codex")?"oriens-codex":"oriens-claude-code";
        return Map.of("client",client,"resource",props.resource(),"issuer",props.base(),"clientId",id,
            "redirectUris",client.equals("codex")?props.codexRedirects():props.claudeRedirects(),"scopes",new TreeSet<>(McpScopes.ALL),
            "authorizationRequired",true,"auditRetentionDays",90);
    }
    @GetMapping("/integrations/mcp/connections")
    public McpStore.Page<McpStore.Connection> list(Authentication auth,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int pageSize){return store.list(owner.id(auth),page,pageSize);}
    @GetMapping("/integrations/mcp/connections/{id}")
    public McpStore.Connection detail(Authentication auth,@PathVariable UUID id){return store.owned(owner.id(auth),id,false);}
    public static class Patch {
        private Long version;private String name;private Set<String> scopes;private Set<Long> allowedProjectIds;private Boolean allowStandaloneTasks;
        public Long getVersion(){return version;}public void setVersion(Long v){version=v;}
        public String getName(){return name;} @JsonSetter(nulls=Nulls.FAIL) public void setName(String v){name=v;}
        public Set<String> getScopes(){return scopes;} @JsonSetter(nulls=Nulls.FAIL,contentNulls=Nulls.FAIL) public void setScopes(Set<String> v){scopes=v;}
        public Set<Long> getAllowedProjectIds(){return allowedProjectIds;} @JsonSetter(nulls=Nulls.FAIL,contentNulls=Nulls.FAIL) public void setAllowedProjectIds(Set<Long> v){allowedProjectIds=v;}
        public Boolean getAllowStandaloneTasks(){return allowStandaloneTasks;} @JsonSetter(nulls=Nulls.FAIL) public void setAllowStandaloneTasks(Boolean v){allowStandaloneTasks=v;}
    }
    public record Revoke(Long version) {}
    @PatchMapping("/integrations/mcp/connections/{id}")
    public McpStore.Connection patch(Authentication auth,@PathVariable UUID id,@RequestBody Patch p){
        long user=owner.id(auth);
        try{return store.patch(user,id,p.version,p.name,p.scopes,p.allowedProjectIds,p.allowStandaloneTasks);}
        catch(com.oriens.oriens_api.exception.WorkDomainException failure){store.recordFailure(user,id,failure.getCode().equals("REAUTHORIZATION_REQUIRED")?"expansion_requested":"connection_update",failure.getCode().equals("REAUTHORIZATION_REQUIRED")?"REAUTHORIZATION_REQUIRED":"DENIED");throw failure;}
    }
    @PostMapping("/integrations/mcp/connections/{id}/revoke")
    public McpStore.Connection revoke(Authentication auth,@PathVariable UUID id,@RequestBody Revoke r){return store.revoke(owner.id(auth),id,r.version);}
    @GetMapping("/integrations/mcp/connections/{id}/events")
    public McpStore.Page<Map<String,Object>> events(Authentication auth,@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) Instant from,@RequestParam(required=false) Instant to,@RequestParam(required=false) String result){return store.events(owner.id(auth),id,page,pageSize,from,to,result);}
    @GetMapping("/integrations/mcp/authorization-requests/{id}")
    public McpFlows.Summary summary(Authentication auth,@PathVariable UUID id,HttpServletRequest request){return flows.summary(owner.id(auth),id,request);}
    @PostMapping("/integrations/mcp/authorization-requests/{id}/decision")
    public Map<String,String> decision(Authentication auth,@PathVariable UUID id,@RequestBody McpFlows.Decision decision,HttpServletRequest request){return flows.decide(owner.id(auth),id,decision,request);}
}
