package com.oriens.oriens_api.mcp;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.sql.Timestamp;

@Component
public class McpMaintenance {
    private final JdbcTemplate db;private final Clock clock;
    public McpMaintenance(JdbcTemplate db,Clock clock){this.db=db;this.clock=clock;}
    @Scheduled(fixedDelay=300000) @Transactional(timeout=10)
    public void cleanup(){
        // Retention continues when exposure is disabled; older deployments have no MCP tables yet.
        if(!Boolean.TRUE.equals(db.queryForObject("select to_regclass('public.mcp_connections') is not null",Boolean.class)))return;
        Timestamp now=Timestamp.from(clock.instant());
        db.update("delete from mcp_authorization_flows where id in (select id from mcp_authorization_flows where expires_at<? limit 1000)",now);
        // Token lookup tombstones survive for the entire family lifetime, including revocation and replay.
        db.update("delete from mcp_oauth_authorizations where id in (select id from mcp_oauth_authorizations where expires_at<? limit 1000)",now);
        db.update("delete from mcp_audit_events where id in (select id from mcp_audit_events where occurred_at<? limit 1000)",Timestamp.from(clock.instant().minus(Duration.ofDays(90))));
        db.update("delete from mcp_rate_windows where (bucket,window_start) in (select bucket,window_start from mcp_rate_windows where window_start<floor(extract(epoch from statement_timestamp())/60)::bigint-1 limit 1000)");
    }
}
