// ============================================================================
// Execution Event Types — DAG Visualization Data Models
// ============================================================================
// These types define the runtime data structures consumed by the DAG
// Visualization Engine in the execution dashboard. They represent the
// state of a workflow execution run, including nodes, edges, and events.
// ============================================================================

// ---------------------------------------------------------------------------
// Execution Node — a single step in a workflow run
// ---------------------------------------------------------------------------

export type ExecutionNodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "succeeded"
  | "failed"
  | "skipped"
  | "timed_out";

/**
 * A single node in a workflow execution run.
 * Each node maps to one agent invocation with its runtime state.
 */
export interface ExecutionRunNode {
  /** Unique identifier for this node within the execution run */
  nodeId: string;
  /** The registered agent that was/will be invoked */
  agentId: string;
  /** Human-readable label displayed on the node */
  label: string;
  /** The node type, affecting visual presentation */
  type:
    | "agent_node"
    | "conditional_router"
    | "parallel_fork"
    | "synchronizer"
    | "start"
    | "end"
    | "subworkflow";
  /** Current runtime status */
  status: ExecutionNodeStatus;
  /** Topological depth level (0 = root, no dependencies) */
  level: number;
  /** IDs of all direct predecessor nodes */
  dependencies: string[];
  /** IDs of all direct successor nodes */
  dependents: string[];
  /** Ordered history of state transitions for this node */
  stateHistory: Record<string, unknown>[];
  /** Human-readable description of this node's purpose */
  description?: string;
  /** Runtime error message if execution failed */
  error?: string;
  /** Unix timestamp (ms) when execution started */
  startedAt?: number;
  /** Unix timestamp (ms) when execution completed */
  completedAt?: number;
  /** Computed duration in ms (completedAt - startedAt) */
  duration?: number;
  /** Number of times this node has been retried */
  retryCount?: number;
  /** Maximum retry attempts allowed */
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// Execution Edge — a directed dependency between two nodes
// ---------------------------------------------------------------------------

/**
 * A directed edge in the execution DAG, representing a dependency or
 * flow-control relationship between two nodes.
 */
export interface ExecutionRunEdge {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /**
   * The nature of the relationship:
   * - `SEQUENTIAL`: strict ordering — "to" runs after "from" completes
   * - `CONDITIONAL_TRUE`: "to" runs only if "from" produced a truthy result
   * - `CONDITIONAL_FALSE`: "to" runs only if "from" produced a falsy result
   * - `DATA_DEPENDENCY`: "to" needs data from "from" without strict ordering
   */
  type: "SEQUENTIAL" | "CONDITIONAL_TRUE" | "CONDITIONAL_FALSE" | "DATA_DEPENDENCY";
  /** Optional display label for the edge */
  label?: string;
  /** Condition evaluated at runtime to determine traversal */
  condition?: {
    /** The context path or output field being evaluated */
    field: string;
    /** Comparison operator */
    operator: string;
    /** Value to compare against */
    value?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Edge endpoints (computed by the layout engine)
// ---------------------------------------------------------------------------

/**
 * Computed position of a node's edge connection point.
 * Produced by the DAG layout engine for rendering edges.
 */
export interface EdgePoint {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isNodeInStatus(
  node: ExecutionRunNode,
  status: ExecutionNodeStatus
): boolean {
  // Normalize "succeeded" -> "completed" for display
  const normalized = node.status === "succeeded" ? "completed" : node.status;
  return normalized === status;
}

export function isNodeTerminal(node: ExecutionRunNode): boolean {
  return (
    node.status === "completed" ||
    node.status === "succeeded" ||
    node.status === "failed" ||
    node.status === "skipped" ||
    node.status === "timed_out"
  );
}

export function isConditionalEdge(
  edge: ExecutionRunEdge
): boolean {
  return (
    edge.type === "CONDITIONAL_TRUE" ||
    edge.type === "CONDITIONAL_FALSE"
  );
}
