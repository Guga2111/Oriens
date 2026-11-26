package com.oriens.oriens_api.mcp;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.*;
import java.util.*;

/** Atomic shared minute windows, with deterministic lock ordering across instances. */
public class McpRateLimiter {
    private final JdbcTemplate db;
    public McpRateLimiter(JdbcTemplate db) {this.db=db;}
    @Transactional(propagation=Propagation.REQUIRES_NEW,timeout=5)
    public boolean acquire(Map<String,Integer> budgets) {
        long window=db.queryForObject("select floor(extract(epoch from statement_timestamp())/60)::bigint",Long.class);
        for (var bucket:new TreeMap<>(budgets).entrySet()) {
            int used=db.queryForObject("insert into mcp_rate_windows(bucket,window_start,used) values(?,?,1) on conflict(bucket,window_start) do update set used=mcp_rate_windows.used+1 returning used",Integer.class,bucket.getKey(),window);
            if (used>bucket.getValue()) return false;
        }
        return true;
    }
}
