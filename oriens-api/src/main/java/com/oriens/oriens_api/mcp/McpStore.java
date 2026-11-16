package com.oriens.oriens_api.mcp;

import com.oriens.oriens_api.exception.WorkDomainException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.function.Function;

/** Durable grant boundary. Every delegated domain operation must run inside withPolicy's transaction. */
public class McpStore {
    private final JdbcTemplate db;
    private final Clock clock;
    public McpStore(JdbcTemplate db, Clock clock) { this.db=db; this.clock=clock; }
    public record Connection(UUID id, long userId, String clientId, String name, long version,
            long policyRevision, boolean allowStandaloneTasks, Instant createdAt, Instant authorizedAt,
            Instant expiresAt, Instant lastUsedAt, Instant revokedAt, Set<String> scopes, Set<Long> allowedProjectIds) {
        public Connection { scopes=Set.copyOf(scopes); allowedProjectIds=Set.copyOf(allowedProjectIds); }
    }
    public record Delegated(UUID connectionId, long userId, String clientId, Set<String> tokenScopes) {
        public Delegated { tokenScopes=Set.copyOf(tokenScopes); }
    }
    public record Policy(UUID connectionId, long userId, long policyRevision, Set<String> scopes,
            Set<Long> allowedProjectIds, boolean allowStandaloneTasks) {
        public Policy { scopes=Set.copyOf(scopes); allowedProjectIds=Set.copyOf(allowedProjectIds); }
        public void require(String scope) { if (!scopes.contains(scope)) throw denied(); }
        public void project(long id) { require("projects:read"); if (!allowedProjectIds.contains(id)) throw denied(); }
        public void task(Long projectId) {
            require("tasks:read");
            if (projectId == null) { if (!allowStandaloneTasks) throw denied(); } else project(projectId);
        }
    }
    public record Page<T>(List<T> items, int page, int pageSize, long totalElements, boolean hasNext) {}
    public static void page(int page, int size) {
        if (page<0 || size<1 || size>100 || (long)page*size>Integer.MAX_VALUE) throw invalid("Página inválida.");
    }
    private static Instant instant(ResultSet r, String column) throws SQLException {
        var v=r.getTimestamp(column); return v==null ? null : v.toInstant();
    }
    public Connection find(UUID id, boolean lock) {
        var rows=db.query("select * from mcp_connections where id=?"+(lock ? " for update" : ""), (r,n)->new Connection(
            r.getObject("id",UUID.class),r.getLong("user_id"),r.getString("client_id"),r.getString("name"),r.getLong("version"),
            r.getLong("policy_revision"),r.getBoolean("allow_standalone_tasks"),instant(r,"created_at"),instant(r,"authorized_at"),
            instant(r,"expires_at"),instant(r,"last_used_at"),instant(r,"revoked_at"),Set.of(),Set.of()),id);
        if (rows.isEmpty()) throw missing();
        Connection c=rows.get(0);
        return new Connection(c.id,c.userId,c.clientId,c.name,c.version,c.policyRevision,c.allowStandaloneTasks,c.createdAt,
            c.authorizedAt,c.expiresAt,c.lastUsedAt,c.revokedAt,
            new HashSet<>(db.queryForList("select scope from mcp_connection_scopes where connection_id=?",String.class,id)),
            new HashSet<>(db.queryForList("select project_id from mcp_connection_projects where connection_id=?",Long.class,id)));
    }
    public Connection owned(long owner, UUID id, boolean lock) {
        // Owner is in the initial predicate, including before acquiring a lock.
        if (db.queryForObject("select count(*) from mcp_connections where id=? and user_id=?",Long.class,id,owner)!=1) throw missing();
        Connection c=find(id,lock); if (c.userId!=owner) throw missing(); return c;
    }
    public void active(Connection c) {
        if (c.revokedAt!=null || !clock.instant().isBefore(c.expiresAt)) throw denied();
    }
    private void version(Connection c, Long version) {
        if (version==null) throw new WorkDomainException("PRECONDITION_REQUIRED","version","Informe a versão da conexão.");
        if (version<0 || c.version!=version) throw new WorkDomainException("VERSION_CONFLICT","version","A conexão mudou. Recarregue antes de salvar.");
    }
    private void projects(long user, Set<Long> ids) {
        // Lock selected projects in ID order through commit so deletion cannot race consent.
        for (long id : new TreeSet<>(ids)) {
            if (db.queryForList("select id from project where id=? and user_id=? for key share",Long.class,id,user).isEmpty()) throw missing();
        }
    }
    @Transactional(timeout=10)
    public Connection create(long owner, String client, String name, Set<String> scopes, Set<Long> ids, boolean standalone) {
        McpScopes.validate(scopes,ids,standalone); projects(owner,ids); name=name(name);
        UUID id=UUID.randomUUID(); Instant now=clock.instant();
        db.update("insert into mcp_connections(id,user_id,client_id,name,allow_standalone_tasks,created_at,authorized_at,expires_at) values(?,?,?,?,?,?,?,?)",
            id,owner,client,name,standalone,Timestamp.from(now),Timestamp.from(now),Timestamp.from(now.plus(Duration.ofDays(30))));
        savePolicy(id,owner,scopes,ids); audit(owner,id,"authorization","SUCCESS"); return find(id,false);
    }
    private void savePolicy(UUID id, long owner, Set<String> scopes, Set<Long> projects) {
        db.update("delete from mcp_connection_scopes where connection_id=?",id);
        db.update("delete from mcp_connection_projects where connection_id=?",id);
        scopes.stream().sorted().forEach(s->db.update("insert into mcp_connection_scopes values(?,?)",id,s));
        projects.stream().sorted().forEach(p->db.update("insert into mcp_connection_projects values(?,?,?)",id,owner,p));
    }
    @Transactional(timeout=10)
    public Connection patch(long owner, UUID id, Long expected, String name, Set<String> scopes, Set<Long> ids, Boolean standalone) {
        Connection c=owned(owner,id,true); active(c); version(c,expected);
        Set<String> nextScopes=scopes==null?c.scopes:Set.copyOf(scopes);
        Set<Long> nextIds=ids==null?c.allowedProjectIds:Set.copyOf(ids);
        boolean nextStandalone=standalone==null?c.allowStandaloneTasks:standalone;
        McpScopes.validate(nextScopes,nextIds,nextStandalone);
        if (!c.scopes.containsAll(nextScopes) || !c.allowedProjectIds.containsAll(nextIds) || (nextStandalone&&!c.allowStandaloneTasks)) {
            throw new WorkDomainException("REAUTHORIZATION_REQUIRED",null,"Autorize novamente pelo cliente para ampliar o acesso. Uma nova conexão será criada.");
        }
        boolean changed=!c.scopes.equals(nextScopes)||!c.allowedProjectIds.equals(nextIds)||nextStandalone!=c.allowStandaloneTasks;
        db.update("update mcp_connections set name=?,version=version+1,policy_revision=policy_revision+?,allow_standalone_tasks=? where id=?",
            name==null?c.name:name(name),changed?1:0,nextStandalone,id);
        savePolicy(id,owner,nextScopes,nextIds);
        var fields=new ArrayList<String>();
        if(name!=null&&!c.name.equals(name))fields.add("name");
        if(!c.scopes.equals(nextScopes))fields.add("scopes");
        if(!c.allowedProjectIds.equals(nextIds))fields.add("allowedProjectIds");
        if(nextStandalone!=c.allowStandaloneTasks)fields.add("allowStandaloneTasks");
        audit(owner,id,changed?"permissions_reduced":"renamed","SUCCESS",UUID.randomUUID(),fields,null,null); return find(id,false);
    }
    @Transactional(timeout=10)
    public Connection revoke(long owner, UUID id, Long expected) {
        Connection c=owned(owner,id,true);
        if (c.revokedAt!=null) return c;
        version(c,expected); revokeLocked(c,"revocation"); return find(id,false);
    }
    public void revokeLocked(Connection c, String action) {
        db.update("update mcp_connections set revoked_at=coalesce(revoked_at,?),version=version+1,policy_revision=policy_revision+1 where id=? and revoked_at is null",
            Timestamp.from(clock.instant()),c.id);
        audit(c.userId,c.id,action,"REVOKED");
    }
    @Transactional(timeout=10)
    public <T> T withPolicy(Delegated delegated, Function<Policy,T> action) {
        Connection c=find(delegated.connectionId,true); active(c);
        if (c.userId!=delegated.userId || !c.clientId.equals(delegated.clientId)) throw denied();
        Set<String> scopes=new HashSet<>(c.scopes); scopes.retainAll(delegated.tokenScopes);
        if (!scopes.contains("mcp:context")) throw denied();
        Policy p=new Policy(c.id,c.userId,c.policyRevision,scopes,c.allowedProjectIds,c.allowStandaloneTasks);
        T result=action.apply(p);
        db.update("update mcp_connections set last_used_at=? where id=?",Timestamp.from(clock.instant()),c.id);
        return result;
    }
    @Transactional(readOnly=true)
    public Page<Connection> list(long owner, int page, int size) {
        page(page,size);
        var ids=db.queryForList("select id from mcp_connections where user_id=? order by created_at desc,id desc limit ? offset ?",UUID.class,owner,size,(long)page*size);
        long total=db.queryForObject("select count(*) from mcp_connections where user_id=?",Long.class,owner);
        return new Page<>(ids.stream().map(id->find(id,false)).toList(),page,size,total,(long)(page+1)*size<total);
    }
    @Transactional(readOnly=true)
    public Page<Map<String,Object>> events(long owner, UUID id, int page, int size, Instant from, Instant to, String result) {
        page(page,size); owned(owner,id,false);
        if (from==null) from=clock.instant().minus(Duration.ofDays(90));
        if (to==null) to=clock.instant();
        if (from.isAfter(to) || Duration.between(from,to).compareTo(Duration.ofDays(90))>0
                || result!=null&&!Set.of("SUCCESS","DENIED","FAILED","REVOKED","REAUTHORIZATION_REQUIRED","REPLAY").contains(result)) throw invalid("Filtros inválidos.");
        String where=" from mcp_audit_events where user_id=? and connection_id=? and occurred_at>=? and occurred_at<=?"+(result==null?"":" and result=?");
        var args=new ArrayList<Object>(List.of(owner,id,Timestamp.from(from),Timestamp.from(to))); if (result!=null) args.add(result);
        long total=db.queryForObject("select count(*)"+where,Long.class,args.toArray()); args.add(size); args.add((long)page*size);
        var rows=db.queryForList("select id,occurred_at,action,result,request_id,resource_ids,field_names,result_count,duration_ms"+where+" order by occurred_at desc,id desc limit ? offset ?",args.toArray());
        for(var row:rows) {
            row.put("occurred_at",((Timestamp)row.get("occurred_at")).toInstant());
            try {
                var json=new com.fasterxml.jackson.databind.ObjectMapper();
                row.put("resource_ids",json.readTree(row.get("resource_ids").toString()));
                row.put("field_names",json.readTree(row.get("field_names").toString()));
            }catch(java.io.IOException e){throw new IllegalStateException("Invalid persisted audit metadata",e);}
        }
        return new Page<>(rows,page,size,total,(long)(page+1)*size<total);
    }
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,timeout=5)
    public void recordFailure(long owner, UUID id, String action, String result) {
        try {owned(owner,id,false);} catch(WorkDomainException absent) {return;}
        audit(owner,id,action,result);
    }
    public void audit(long owner, UUID connection, String action, String result) {
        audit(owner,connection,action,result,UUID.randomUUID(),List.of(),null,null);
    }
    public void audit(long owner, UUID connection, String action, String result, UUID requestId,List<String> fieldNames,Integer count,Long durationMs) {
        String fields;
        try {fields=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(fieldNames);}
        catch(java.io.IOException e){throw new IllegalStateException("Cannot project audit fields",e);}
        db.update("insert into mcp_audit_events(id,user_id,connection_id,action,result,request_id,occurred_at,field_names,result_count,duration_ms) values(?,?,?,?,?,?,?,cast(? as jsonb),?,?)",
            UUID.randomUUID(),owner,connection,action,result,requestId,Timestamp.from(clock.instant()),fields,count,durationMs);
    }
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,timeout=5)
    public void toolFailure(Delegated delegated,UUID requestId,String result,long durationMs) {
        try {owned(delegated.userId,delegated.connectionId,false);} catch(WorkDomainException absent) {return;}
        audit(delegated.userId,delegated.connectionId,"oriens_get_context",result,requestId,List.of(),null,durationMs);
    }
    private static String name(String v) {
        if (v==null || v.isBlank() || v.length()>120 || v.chars().anyMatch(Character::isISOControl)) throw invalid("Nome de conexão inválido.");
        return v.strip();
    }
    public static WorkDomainException invalid(String message) {return new WorkDomainException("INVALID_REQUEST",null,message);}
    public static WorkDomainException denied() {return new WorkDomainException("FORBIDDEN",null,"Acesso não autorizado.");}
    public static WorkDomainException missing() {return new WorkDomainException("NOT_FOUND",null,"Recurso não encontrado.");}
}
