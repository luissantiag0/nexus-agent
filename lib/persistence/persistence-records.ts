// ============================================================================
// Nexus Agent Platform — Persistence Record Types
// ============================================================================
// Defines the typed record structures that the PersistenceBatchWriter
// receives. These are the intermediate format between runtime events and
// database entities — they carry enough information for repository calls
// but are decoupled from any specific database schema.
// ============================================================================

// ---------------------------------------------------------------------------
// Run Node Record
// ---------------------------------------------------------------------------

export interface RunNodeRecord {
  nodeId: string;
  runId: string;
  agentId: string;
  label?: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "timed_out" | "retrying";
  level?: number;
  dependencies?: string[];
  dependents?: string[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
  result?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Run Event Record
// ---------------------------------------------------------------------------

export interface RunEventRecord {
  eventId: string;
  runId: string;
  type: string;
  nodeId?: string;
  agentId?: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Context Snapshot Record
// ---------------------------------------------------------------------------

export interface ContextSnapshotRecord {
  snapshotId: string;
  runId: string;
  version: number;
  agentId: string;
  writes: Record<string, unknown>;
  diff: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  timestamp: number;
}
