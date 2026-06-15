-- ============================================================================
-- Nexus Agent Platform — Execution Engine Schema (Supabase CLI)
-- ============================================================================
-- Multi-tenant tables for run persistence, node execution tracking,
-- event logging, and context snapshots. Designed for Supabase CLI
-- migration tooling (supabase migration up).
-- ============================================================================

-- ============================================================================
-- RUNS
-- ============================================================================
-- Aggregate root for a single workflow execution.
-- ============================================================================

CREATE TABLE runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    run_id          TEXT NOT NULL,
    workflow_id     TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'initialized'
                    CHECK (status IN ('initialized','running','completed','failed')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_runs_tenant_id ON runs (tenant_id);
CREATE INDEX idx_runs_tenant_status ON runs (tenant_id, status);
CREATE INDEX idx_runs_tenant_created ON runs (tenant_id, started_at DESC);
CREATE UNIQUE INDEX idx_runs_tenant_run ON runs (tenant_id, run_id);

-- ============================================================================
-- RUN_NODES
-- ============================================================================
-- Individual node executions within a run.
-- ============================================================================

CREATE TABLE run_nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    tenant_id       TEXT NOT NULL,
    agent_id        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','skipped','retrying')),
    input           JSONB,
    output          JSONB,
    duration_ms     BIGINT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_run_nodes_tenant ON run_nodes (tenant_id);
CREATE INDEX idx_run_nodes_run ON run_nodes (run_id);
CREATE INDEX idx_run_nodes_tenant_run ON run_nodes (tenant_id, run_id);
CREATE INDEX idx_run_nodes_status ON run_nodes (tenant_id, status);

-- ============================================================================
-- RUN_EVENTS
-- ============================================================================
-- Time-ordered event log for each run. Append-only.
-- ============================================================================

CREATE TABLE run_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    tenant_id       TEXT NOT NULL,
    node_id         TEXT,
    type            TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_events_tenant ON run_events (tenant_id);
CREATE INDEX idx_run_events_run ON run_events (run_id);
CREATE INDEX idx_run_events_tenant_run ON run_events (tenant_id, run_id);
CREATE INDEX idx_run_events_type ON run_events (tenant_id, type);

-- ============================================================================
-- CONTEXT_SNAPSHOTS
-- ============================================================================
-- Versioned context snapshots for replay and debugging.
-- ============================================================================

CREATE TABLE context_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    tenant_id           TEXT NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    context             JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_context_snapshots_tenant ON context_snapshots (tenant_id);
CREATE INDEX idx_context_snapshots_run ON context_snapshots (run_id);
CREATE INDEX idx_context_snapshots_tenant_run ON context_snapshots (tenant_id, run_id);
CREATE INDEX idx_context_snapshots_version ON context_snapshots (run_id, version);
