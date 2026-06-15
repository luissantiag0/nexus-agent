// ============================================================================
// Nexus Agent Platform — Supabase Entity Types (Persistence Layer)
// ============================================================================
// These types map directly to the database tables defined in
// database/migrations/001_schema.sql. They use TIMESTAMPTZ strings as
// returned by Supabase's JSON serialisation.
// ============================================================================

export type UUID = string;
export type Timestamp = string;

// ============================================================================
// Tenant
// ============================================================================

export interface TenantEntity {
  id: UUID;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TenantEntityCreate {
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  is_active?: boolean;
}

export interface TenantEntityUpdate {
  name?: string;
  slug?: string;
  settings?: Record<string, unknown>;
  is_active?: boolean;
}

// ============================================================================
// Tenant Agent
// ============================================================================

export type AgentStatus = "active" | "deprecated" | "beta" | "experimental" | "retired";

export interface AgentEntity {
  id: UUID;
  tenant_id: UUID;
  agent_id: string;
  name: string;
  description: string;
  version: string;
  status: AgentStatus;
  metadata: Record<string, unknown>;
  prompt_template_ref: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
}

export interface AgentEntityCreate {
  tenant_id: UUID;
  agent_id: string;
  name: string;
  description?: string;
  version?: string;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
  prompt_template_ref?: string;
}

export interface AgentEntityUpdate {
  name?: string;
  description?: string;
  version?: string;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
  prompt_template_ref?: string;
  deleted_at?: Timestamp | null;
}

// ============================================================================
// Run
// ============================================================================

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "partial";
export type RunMode = "SINGLE_AGENT" | "CHAIN" | "DAG";

export interface RunEntity {
  id: UUID;
  tenant_id: UUID;
  run_id: string;
  workflow_id: string;
  workflow_name: string;
  mode: RunMode;
  status: RunStatus;
  node_count: number;
  edge_count: number;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  duration_ms: number | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RunEntityCreate {
  tenant_id: UUID;
  run_id: string;
  workflow_id?: string;
  workflow_name?: string;
  mode?: RunMode;
  status?: RunStatus;
  node_count?: number;
  edge_count?: number;
  started_at?: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface RunEntityUpdate {
  workflow_id?: string;
  workflow_name?: string;
  status?: RunStatus;
  node_count?: number;
  edge_count?: number;
  completed_at?: Timestamp | null;
  duration_ms?: number | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Run Node
// ============================================================================

export type NodeStatus =
  | "pending" | "running" | "completed" | "failed"
  | "skipped" | "timed_out" | "circuit_broken" | "retrying";
export type NodeType =
  | "agent_node" | "conditional_router" | "parallel_fork"
  | "synchronizer" | "start" | "end" | "subworkflow";

export interface RunNodeEntity {
  id: UUID;
  tenant_id: UUID;
  run_id: UUID;
  node_id: string;
  agent_id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  level: number;
  dependencies: string[];
  dependents: string[];
  error: string | null;
  retry_count: number;
  max_retries: number;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  result: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RunNodeEntityCreate {
  tenant_id: UUID;
  run_id: UUID;
  node_id: string;
  agent_id?: string;
  label?: string;
  type?: NodeType;
  status?: NodeStatus;
  level?: number;
  dependencies?: string[];
  dependents?: string[];
  retry_count?: number;
  max_retries?: number;
  started_at?: Timestamp | null;
}

export interface RunNodeEntityUpdate {
  agent_id?: string;
  label?: string;
  status?: NodeStatus;
  level?: number;
  dependencies?: string[];
  dependents?: string[];
  error?: string | null;
  retry_count?: number;
  max_retries?: number;
  started_at?: Timestamp | null;
  completed_at?: Timestamp | null;
  result?: Record<string, unknown> | null;
}

// ============================================================================
// Event
// ============================================================================

export interface EventEntity {
  id: UUID;
  tenant_id: UUID;
  run_id: UUID;
  event_id: string;
  type: string;
  node_id: string | null;
  agent_id: string | null;
  sequence: number;
  payload: Record<string, unknown>;
  event_timestamp: Timestamp;
  created_at: Timestamp;
}

export interface EventEntityCreate {
  tenant_id: UUID;
  run_id: UUID;
  event_id: string;
  type: string;
  node_id?: string | null;
  agent_id?: string | null;
  sequence: number;
  payload?: Record<string, unknown>;
  event_timestamp?: Timestamp;
}

// ============================================================================
// Context Snapshot
// ============================================================================

export interface ContextSnapshotEntity {
  id: UUID;
  tenant_id: UUID;
  run_id: UUID;
  version: number;
  agent_id: string;
  writes: Record<string, unknown>;
  diff: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  snapshot_timestamp: Timestamp;
  created_at: Timestamp;
}

export interface ContextSnapshotEntityCreate {
  tenant_id: UUID;
  run_id: UUID;
  version: number;
  agent_id?: string;
  writes?: Record<string, unknown>;
  diff?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  snapshot_timestamp?: Timestamp;
}

// ============================================================================
// Pagination & Filter Types
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface RunFilterParams extends PaginationParams {
  status?: RunStatus;
  workflow_id?: string;
}

export interface EventFilterParams extends PaginationParams {
  type?: string;
  node_id?: string;
}

// ============================================================================
// Metrics / Aggregation DTOs
// ============================================================================

export interface TenantMetrics {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  active_runs: number;
  avg_duration_ms: number | null;
  total_events: number;
}
