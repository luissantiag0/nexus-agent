// ============================================================================
// Nexus Agent Platform — Execution Event Types
// ============================================================================
// Core type system for the observability and execution tracing subsystem.
// Defines event types, run metadata, context snapshots, and summary views
// consumed by the API layer, SSE streams, and instrumentation hooks.
// ============================================================================

import type { WorkflowNode, WorkflowEdge } from "@/lib/engine/workflow-execution";

// ---------------------------------------------------------------------------
// ExecutionEventType — discriminated event type enum
// ---------------------------------------------------------------------------

/**
 * Discriminated set of all possible execution events emitted during a
 * workflow run. Each event maps to a specific lifecycle transition.
 */
export enum ExecutionEventType {
  RUN_INITIALIZED = "RUN_INITIALIZED",
  NODE_STARTED = "NODE_STARTED",
  NODE_COMPLETED = "NODE_COMPLETED",
  NODE_FAILED = "NODE_FAILED",
  NODE_SKIPPED = "NODE_SKIPPED",
  NODE_RETRYING = "NODE_RETRYING",
  CONTEXT_UPDATED = "CONTEXT_UPDATED",
  ROUTE_SELECTED = "ROUTE_SELECTED",
  SYNCHRONIZER_BARRIER = "SYNCHRONIZER_BARRIER",
  SYNCHRONIZER_MERGED = "SYNCHRONIZER_MERGED",
  EXECUTION_COMPLETED = "EXECUTION_COMPLETED",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  STATE_TRANSITION = "STATE_TRANSITION",
  RUN_PAUSED = "RUN_PAUSED",
  RUN_RESUMED = "RUN_RESUMED",
  RUN_CANCELLED = "RUN_CANCELLED",
}

// ---------------------------------------------------------------------------
// ExecutionEvent — single event record
// ---------------------------------------------------------------------------

/**
 * A single observable event within a workflow execution run.
 * Every state change, node lifecycle transition, context update, or routing
 * decision produces one of these records.
 */
export interface ExecutionEvent {
  /** Globally unique event identifier (UUID v4) */
  id: string;
  /** The execution run this event belongs to */
  runId: string;
  /** Discriminated event type */
  type: ExecutionEventType;
  /** Node that produced this event (omitted for run-level events) */
  nodeId?: string;
  /** Agent that produced this event (omitted for run-level events) */
  agentId?: string;
  /** Unix timestamp (ms) when the event was emitted */
  timestamp: number;
  /** Type-specific payload */
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ContextSnapshot — point-in-time view of execution context
// ---------------------------------------------------------------------------

/**
 * A point-in-time snapshot of the shared execution context.
 * Captured whenever an agent writes to the context, enabling replay and
 * differential analysis of context evolution across the workflow.
 */
export interface ContextSnapshot {
  /** The run this snapshot belongs to */
  runId: string;
  /** Monotonically increasing version number within the run */
  version: number;
  /** Agent that produced the writes */
  agentId: string;
  /** Key-value writes applied in this snapshot */
  writes: Record<string, unknown>;
  /** Previous snapshot version this diff is relative to */
  previousVersion?: number;
  /** Computed diff against the previous snapshot */
  diff?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
  /** Unix timestamp (ms) when the snapshot was captured */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// ExecutionRun — aggregate root for a single workflow execution
// ---------------------------------------------------------------------------

/**
 * Aggregate root representing a single workflow execution instance.
 * Contains the full execution plan (nodes, edges), all emitted events,
 * context snapshots, and terminal status.
 */
export interface ExecutionRun {
  /** Unique execution identifier */
  runId: string;
  /** Workflow definition identifier */
  workflowId: string;
  /** Human-readable workflow name */
  workflowName?: string;
  /** Execution topology mode */
  mode?: string;
  /** Current/terminal run status */
  status: string;
  /** Execution plan nodes */
  nodes: WorkflowNode[];
  /** Execution plan edges */
  edges: WorkflowEdge[];
  /** All events emitted during this run (in chronological order) */
  events: ExecutionEvent[];
  /** Context snapshots captured during this run */
  contextSnapshots: ContextSnapshot[];
  /** Unix timestamp (ms) when the run started */
  startedAt: number;
  /** Unix timestamp (ms) when the run completed or failed */
  completedAt?: number;
  /** Total execution duration in milliseconds */
  durationMs?: number;
  /** Terminal error message (only present for failed runs) */
  error?: string;
  /** Arbitrary metadata for tooling and observability */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// RunSummary — lightweight view for list endpoints
// ---------------------------------------------------------------------------

/**
 * Lightweight projection of an ExecutionRun used for list/queries.
 * Excludes the full events and context snapshots arrays to minimise
 * payload size in collection endpoints.
 */
export interface RunSummary {
  /** Unique execution identifier */
  runId: string;
  /** Workflow definition identifier */
  workflowId: string;
  /** Human-readable workflow name */
  workflowName?: string;
  /** Execution topology mode */
  mode?: string;
  /** Current/terminal run status */
  status: string;
  /** Number of nodes in the execution plan */
  nodeCount: number;
  /** Unix timestamp (ms) when the run started */
  startedAt: number;
  /** Unix timestamp (ms) when the run completed or failed */
  completedAt?: number;
  /** Total execution duration in milliseconds */
  durationMs?: number;
  /** Terminal error message (only present for failed runs) */
  error?: string;
}

// ---------------------------------------------------------------------------
// EventFilter — query filter for event retrieval
// ---------------------------------------------------------------------------

/**
 * Query filters accepted by the events retrieval endpoint.
 */
export interface EventFilter {
  /** Filter by event type */
  type?: ExecutionEventType;
  /** Filter by node ID */
  nodeId?: string;
  /** Maximum number of events to return */
  limit?: number;
  /** Number of events to skip (for pagination) */
  offset?: number;
}

// ---------------------------------------------------------------------------
// SSE Event — wire format for server-sent events
// ---------------------------------------------------------------------------

/**
 * The wire format for an event dispatched over a Server-Sent Events stream.
 * The `event` field maps to the SSE `event:` line and the `data` field is
 * JSON-serialised and sent as the SSE `data:` line.
 */
export interface SSEEvent {
  /** SSE event type (maps to ExecutionEventType) */
  event: ExecutionEventType | "KEEPALIVE";
  /** JSON-serialisable payload */
  data: Record<string, unknown>;
}
