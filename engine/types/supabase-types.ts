// ============================================================================
// Nexus Agent Platform — Supabase Entity Types
// ============================================================================

/** UUID string pattern. */
export type UUID = string;

/** ISO-8601 timestamp. */
export type Timestamp = string;

// ============================================================================
// Agent Entity
// ============================================================================

export interface AgentEntity {
  id: UUID;
  agent_id: string;           // Unique agent identifier (e.g. "backend-architect")
  name: string;
  description: string;
  version: string;
  status: "active" | "deprecated" | "beta" | "experimental" | "retired";
  metadata: Record<string, unknown>;
  prompt_template_ref: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null; // Soft delete
}

export interface AgentEntityCreate {
  agent_id: string;
  name: string;
  description: string;
  version: string;
  status?: AgentEntity["status"];
  metadata?: Record<string, unknown>;
  prompt_template_ref?: string;
}

export interface AgentEntityUpdate {
  name?: string;
  description?: string;
  version?: string;
  status?: AgentEntity["status"];
  metadata?: Record<string, unknown>;
  prompt_template_ref?: string;
  deleted_at?: Timestamp | null;
}

// ============================================================================
// Workflow Entity
// ============================================================================

export interface WorkflowEntity {
  id: UUID;
  workflow_id: string;
  name: string;
  version: string;
  description: string;
  mode: "chain" | "graph";
  definition: Record<string, unknown>;  // JSON-serialized WorkflowDefinition
  trigger_config: Record<string, unknown>;
  error_handling_config: Record<string, unknown>;
  observability_config: Record<string, unknown>;
  timeout_ms: number;
  tags: string[];
  is_enabled: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WorkflowEntityCreate {
  workflow_id: string;
  name: string;
  version: string;
  description: string;
  mode: WorkflowEntity["mode"];
  definition: Record<string, unknown>;
  trigger_config?: Record<string, unknown>;
  error_handling_config?: Record<string, unknown>;
  observability_config?: Record<string, unknown>;
  timeout_ms?: number;
  tags?: string[];
  is_enabled?: boolean;
}

// ============================================================================
// Execution Log Entity
// ============================================================================

export interface ExecutionLogEntity {
  id: UUID;
  execution_id: string;
  workflow_id: string | null;
  agent_id: string;
  chain_id: string | null;
  graph_id: string | null;
  status: AgentExecutionStatus;
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown> | null;
  context_snapshot: Record<string, unknown> | null;
  error: string | null;
  error_details: Record<string, unknown> | null;
  validation_result: Record<string, unknown> | null;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  duration_ms: number | null;
  tokens_used: number | null;
  retry_count: number;
  correlation_id: string | null;
  meta: Record<string, unknown>;
}

export type AgentExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "timed_out"
  | "circuit_broken";

// ============================================================================
// Context Snapshot Entity
// ============================================================================

export interface ContextSnapshotEntity {
  id: UUID;
  execution_id: string;
  workflow_id: string | null;
  step_index: number;
  state_snapshot: Record<string, unknown>;
  plan_snapshot: Record<string, unknown>;
  runtime_snapshot: Record<string, unknown>;
  created_at: Timestamp;
  ttl_seconds: number;       // Time-to-live for automatic cleanup
}

// ============================================================================
// Prompt Template Entity
// ============================================================================

export interface PromptTemplateEntity {
  id: UUID;
  template_id: string;
  name: string;
  version: string;
  content: string;            // The YAML template content
  variables: string[];         // Expected variable names
  hash: string;                // Content hash for cache invalidation
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================================================
// Adapter Configuration Entity
// ============================================================================

export interface AdapterConfigEntity {
  id: UUID;
  adapter_id: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================================================
// Database Row level permissions (RLS policies)
// ============================================================================

/**
 * Common Supabase query filter options.
 */
export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  filters?: Array<{ column: string; operator: FilterOperator; value: unknown }>;
}

export type FilterOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "like" | "ilike" | "in" | "is" | "contains"
  | "overlaps";
