-- oriens-mcp-account-v1: additive over oriens-statistics-v1 (V3).
CREATE TABLE mcp_connections (
 id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_id varchar(100) NOT NULL, name varchar(120) NOT NULL,
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0), policy_revision bigint NOT NULL DEFAULT 0 CHECK(policy_revision>=0),
 allow_standalone_tasks boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), authorized_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL, last_used_at timestamptz, revoked_at timestamptz,
 UNIQUE(id,user_id), CHECK(expires_at>authorized_at)
);
CREATE INDEX mcp_connections_owner ON mcp_connections(user_id,revoked_at,created_at DESC,id);
CREATE TABLE mcp_connection_scopes (
 connection_id uuid NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
 scope varchar(40) NOT NULL CHECK(scope IN ('mcp:context','offline_access',
 'projects:read','projects:create','projects:update','projects:delete',
 'objectives:create','objectives:update','objectives:delete',
 'tasks:read','tasks:create','tasks:update','tasks:delete',
 'finance:read','finance:create','finance:update','finance:delete')),
 PRIMARY KEY(connection_id,scope)
);
CREATE TABLE mcp_connection_projects (
 connection_id uuid NOT NULL, user_id bigint NOT NULL, project_id bigint NOT NULL,
 PRIMARY KEY(connection_id,project_id),
 FOREIGN KEY(connection_id,user_id) REFERENCES mcp_connections(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,user_id) REFERENCES project(id,user_id) ON DELETE CASCADE
);
CREATE INDEX mcp_project_owner ON mcp_connection_projects(user_id,project_id);
CREATE TABLE mcp_oauth_authorizations (
 id varchar(100) PRIMARY KEY, connection_id uuid NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
 encrypted_value text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX mcp_oauth_connection ON mcp_oauth_authorizations(connection_id);
CREATE TABLE mcp_oauth_token_lookup (
 token_hash char(64) PRIMARY KEY, token_type varchar(24) NOT NULL,
 authorization_id varchar(100) NOT NULL REFERENCES mcp_oauth_authorizations(id) ON DELETE CASCADE,
 consumed boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL
);
CREATE INDEX mcp_oauth_lookup_authorization ON mcp_oauth_token_lookup(authorization_id);
CREATE INDEX mcp_oauth_expiry ON mcp_oauth_authorizations(expires_at);
CREATE TABLE mcp_authorization_flows (
 id uuid PRIMARY KEY, browser_hash char(64) NOT NULL, encrypted_request text NOT NULL,
 user_id bigint REFERENCES users(id) ON DELETE CASCADE,
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0),
 expires_at timestamptz NOT NULL, completed_at timestamptz
);
CREATE INDEX mcp_flow_expiry ON mcp_authorization_flows(expires_at);
CREATE TABLE mcp_audit_events (
 id uuid PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 connection_id uuid REFERENCES mcp_connections(id) ON DELETE CASCADE,
 occurred_at timestamptz NOT NULL DEFAULT now(), action varchar(80) NOT NULL,
 result varchar(40) NOT NULL, request_id uuid NOT NULL,
 resource_ids jsonb NOT NULL DEFAULT '[]', field_names jsonb NOT NULL DEFAULT '[]',
 result_count integer CHECK(result_count>=0), duration_ms bigint CHECK(duration_ms>=0)
);
CREATE INDEX mcp_audit_owner ON mcp_audit_events(user_id,connection_id,occurred_at DESC,id DESC);
CREATE INDEX mcp_audit_retention ON mcp_audit_events(occurred_at);
CREATE TABLE mcp_rate_windows (
 bucket varchar(200) NOT NULL, window_start bigint NOT NULL,
 used integer NOT NULL CHECK(used>0), PRIMARY KEY(bucket,window_start)
);
CREATE INDEX mcp_rate_expiry ON mcp_rate_windows(window_start);
