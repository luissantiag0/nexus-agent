-- ============================================================================
-- Nexus Agent Platform — Schema 001
-- ============================================================================
-- Production-grade multi-tenant schema for execution persistence.
--
-- DESIGN PRINCIPLES:
--   - Every tenant-scoped table includes tenant_id with FK constraint
--   - UUID primary keys throughout for distributed compatibility
--   - JSONB for all dynamic payloads (events, context, metadata)
--   - Version columns enable optimistic concurrency where needed
--   - Indexes target the access patterns: tenant isolation, run lookups,
--     event filtering, and time-range queries
--   - Timestamps use TIMESTAMPTZ for timezone-aware storage
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query perf monitoring

-- ============================================================================
-- TENANTS
-- ============================================================================
-- Root entity for multi-tenant isolation. Every data row belongs to exactly
-- one tenant. The `slug` column enables URL-based tenant resolution.
-- ============================================================================

CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    settings    JSONB NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_active ON tenants (is_active) WHERE is_active = TRUE;

-- ============================================================================
-- AGENTS
-- ============================================================================
-- Registry of agent definitions scoped to each tenant. The (tenant_id, agent_id)
-- pair is the logical key; the PK is a UUID for referential integrity.
-- Soft-delete is supported via deleted_at.
-- ============================================================================

CREATE TABLE agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id            TEXT NOT NULL,          -- logical name, e.g. "backend-architect"
    name                TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    version             TEXT NOT NULL DEFAULT '1.0.0',
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','deprecated','beta','experimental','retired')),
    metadata            JSONB NOT NULL DEFAULT '{}',
    prompt_template_ref TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ             -- soft-delete timestamp
);

CREATE UNIQUE INDEX idx_agents_tenant_agent ON agents (tenant_id, agent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_tenant_status ON agents (tenant_id, status) WHERE deleted_at IS NULL;

-- ============================================================================
-- RUNS
-- ============================================================================
-- Aggregate root for a single workflow execution. Each run captures the
-- execution plan (node_count, edge_count), lifecycle timestamps, and
-- terminal status. Runs are never deleted — retention is handled by TTL.
-- ============================================================================

CREATE TABLE runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id          TEXT NOT NULL,              -- runtime execution ID
    workflow_id     TEXT NOT NULL DEFAULT '',
    workflow_name   TEXT NOT NULL DEFAULT '',
    mode            TEXT NOT NULL DEFAULT 'DAG'
                    CHECK (mode IN ('SINGLE_AGENT','CHAIN','DAG')),
    status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('pending','running','completed','failed','cancelled','partial')),
    node_count      INTEGER NOT NULL DEFAULT 0,
    edge_count      INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    duration_ms     BIGINT,
    error           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_tenant_id ON runs (tenant_id);
CREATE INDEX idx_runs_tenant_status ON runs (tenant_id, status);
CREATE INDEX idx_runs_tenant_created ON runs (tenant_id, created_at DESC);
CREATE INDEX idx_runs_run_id ON runs (run_id);
CREATE UNIQUE INDEX idx_runs_tenant_run ON runs (tenant_id, run_id);

-- ============================================================================
-- RUN_NODES
-- ============================================================================
-- Individual node executions within a run. Captures per-node lifecycle,
-- status transitions, and output results. Referential integrity to runs
-- ensures nodes are cleaned up when a run is removed.
-- ============================================================================

CREATE TABLE run_nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id          UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    node_id         TEXT NOT NULL,              -- runtime node identifier
    agent_id        TEXT NOT NULL DEFAULT '',
    label           TEXT NOT NULL DEFAULT '',
    type            TEXT NOT NULL DEFAULT 'agent_node'
                    CHECK (type IN ('agent_node','conditional_router','parallel_fork','synchronizer','start','end','subworkflow')),
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','skipped','timed_out','circuit_broken','retrying')),
    level           INTEGER NOT NULL DEFAULT 0,
    dependencies    JSONB NOT NULL DEFAULT '[]',-- array of node_id strings
    dependents      JSONB NOT NULL DEFAULT '[]',-- array of node_id strings
    error           TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    result          JSONB,                      -- agent output payload
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_nodes_tenant ON run_nodes (tenant_id);
CREATE INDEX idx_run_nodes_run ON run_nodes (run_id);
CREATE INDEX idx_run_nodes_tenant_run ON run_nodes (tenant_id, run_id);
CREATE INDEX idx_run_nodes_status ON run_nodes (tenant_id, status);
CREATE INDEX idx_run_nodes_node_id ON run_nodes (node_id);

-- ============================================================================
-- EVENTS
-- ============================================================================
-- Time-ordered event log for each run. Events are append-only and support
-- the observability dashboard's real-time streaming. Every event carries
-- a `sequence` number for deterministic ordering within a run.
-- ============================================================================

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id          UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    event_id        TEXT NOT NULL,              -- runtime event identifier
    type            TEXT NOT NULL,              -- ExecutionEventType enum value
    node_id         TEXT,                       -- nullable for run-level events
    agent_id        TEXT,                       -- nullable for run-level events
    sequence        BIGINT NOT NULL DEFAULT 0,  -- monotonic per-run ordering
    payload         JSONB NOT NULL DEFAULT '{}',
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_tenant ON events (tenant_id);
CREATE INDEX idx_events_run ON events (run_id);
CREATE INDEX idx_events_tenant_run ON events (tenant_id, run_id);
CREATE INDEX idx_events_type ON events (tenant_id, type);
CREATE INDEX idx_events_sequence ON events (run_id, sequence);
CREATE INDEX idx_events_created ON events (tenant_id, created_at DESC);

-- ============================================================================
-- CONTEXT_SNAPSHOTS
-- ============================================================================
-- Point-in-time captures of the shared execution context. Used for replay,
-- debugging, and differential analysis. Each snapshot includes the writes
-- applied and a computed diff against the prior version.
-- ============================================================================

CREATE TABLE context_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id              UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL DEFAULT 1,  -- monotonic per-run version
    agent_id            TEXT NOT NULL DEFAULT '',
    writes              JSONB NOT NULL DEFAULT '{}',  -- key-value pairs written
    diff                JSONB NOT NULL DEFAULT '{}',  -- {key: {oldValue, newValue}}
    snapshot_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_context_snapshots_tenant ON context_snapshots (tenant_id);
CREATE INDEX idx_context_snapshots_run ON context_snapshots (run_id);
CREATE INDEX idx_context_snapshots_tenant_run ON context_snapshots (tenant_id, run_id);
CREATE INDEX idx_context_snapshots_version ON context_snapshots (run_id, version);

-- ============================================================================
-- FOREIGN KEY CROSS-REFERENCES (documentation only — enforced by FK above)
-- ============================================================================
-- runs.tenant_id          → tenants.id
-- run_nodes.tenant_id     → tenants.id
-- run_nodes.run_id        → runs.id
-- events.tenant_id        → tenants.id
-- events.run_id           → runs.id
-- context_snapshots.tenant_id → tenants.id
-- context_snapshots.run_id    → runs.id
--
-- All FKs use ON DELETE CASCADE to maintain referential integrity when a
-- tenant or run is removed.

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================================
-- Keeps updated_at in sync for all tables that have it.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_runs_updated_at
    BEFORE UPDATE ON runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_run_nodes_updated_at
    BEFORE UPDATE ON run_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW-LEVEL SECURITY (Supabase RLS)
-- ============================================================================
-- Enforces tenant isolation at the database level. Every query must include
-- the tenant_id filter. The `tenant_id` is set via:
--   SELECT set_config('app.tenant_id', <uuid>, true)
-- in the middleware layer before any query executes.
-- ============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies: each row's tenant_id must match the session
-- variable set by the middleware. The USING clause filters reads and writes.

CREATE POLICY tenant_isolation_agents ON agents
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_runs ON runs
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_run_nodes ON run_nodes
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_events ON events
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_context_snapshots ON context_snapshots
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Tenants table is globally readable (needed for auth middleware) but
-- only the owning service role can modify rows.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read_tenants ON tenants
    FOR SELECT USING (TRUE);

CREATE POLICY tenant_write_tenants ON tenants
    USING (id = current_setting('app.tenant_id')::UUID);
