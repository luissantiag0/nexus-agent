// ============================================================================
// Engine Error Types
// ============================================================================
// Centralized error types for the AgentGraph/AgentChain execution engine.
// Every failure mode in the system has a typed error with a code that
// can be used for routing, retry decisions, and observability.
// ============================================================================

// ---------------------------------------------------------------------------
// Base Engine Error
// ---------------------------------------------------------------------------

/**
 * Base error for all engine-level failures.
 */
export class EngineError extends Error {
  constructor(
    message: string,
    public readonly code: EngineErrorCode,
    public readonly severity: ErrorSeverity = "error",
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "EngineError";
  }

  /** Whether this error is retryable */
  get retryable(): boolean {
    return TRANSIENT_ERROR_CODES.includes(this.code);
  }

  /** Serialize to a plain object for logging */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      details: this.details,
      retryable: this.retryable,
      stack: this.stack,
      cause: this.cause ? {
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Error Severity
// ---------------------------------------------------------------------------

export type ErrorSeverity = "debug" | "info" | "warning" | "error" | "critical";

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

/**
 * All possible engine error codes.
 * Follows a hierarchical naming convention:
 *   <domain>_<subdomain>_<specific_error>
 */
export type EngineErrorCode =
  // --- Graph Errors ---
  | "GRAPH_CYCLE_DETECTED"
  | "GRAPH_NODE_NOT_FOUND"
  | "GRAPH_EDGE_NOT_FOUND"
  | "GRAPH_INVALID_START_NODE"
  | "GRAPH_INVALID_END_NODE"
  | "GRAPH_DISCONNECTED"
  | "GRAPH_UNRESOLVED_REFERENCE"

  // --- Node Execution Errors ---
  | "NODE_EXECUTION_FAILED"
  | "NODE_TIMEOUT"
  | "NODE_NOT_FOUND"
  | "NODE_INVALID_TYPE"
  | "NODE_CONDITION_EVALUATION_FAILED"

  // --- Agent Execution Errors ---
  | "AGENT_EXECUTION_FAILED"
  | "AGENT_NOT_FOUND"
  | "AGENT_TIMEOUT"
  | "AGENT_OUTPUT_INVALID"
  | "AGENT_INPUT_VALIDATION_FAILED"
  | "AGENT_OUTPUT_VALIDATION_FAILED"
  | "AGENT_RATE_LIMITED"
  | "AGENT_QUOTA_EXCEEDED"
  | "AGENT_PERMISSION_DENIED"
  | "AGENT_INTERNAL_ERROR"

  // --- Context Errors ---
  | "CONTEXT_KEY_MISSING"
  | "CONTEXT_TYPE_MISMATCH"
  | "CONTEXT_TRANSFORM_FAILED"
  | "CONTEXT_VALIDATION_FAILED"
  | "CONTEXT_EXTRACTION_FAILED"
  | "CONTEXT_APPLY_FAILED"
  | "CONTEXT_SERIALIZATION_FAILED"
  | "CONTEXT_DESERIALIZATION_FAILED"

  // --- Chain Errors ---
  | "CHAIN_STEP_FAILED"
  | "CHAIN_TIMEOUT"
  | "CHAIN_DEADLINE_EXCEEDED"
  | "CHAIN_MAX_CONSECUTIVE_FAILURES"
  | "CHAIN_INVALID_CHECKPOINT"
  | "CHAIN_RESUMPTION_FAILED"
  | "CHAIN_MANUAL_ABORT"

  // --- Parallel Execution Errors ---
  | "PARALLEL_BRANCH_FAILED"
  | "PARALLEL_TIMEOUT"
  | "PARALLEL_ALL_BRANCHES_FAILED"
  | "PARALLEL_MERGE_FAILED"

  // --- Subworkflow Errors ---
  | "SUBWORKFLOW_NOT_FOUND"
  | "SUBWORKFLOW_EXECUTION_FAILED"
  | "SUBWORKFLOW_TIMEOUT"
  | "SUBWORKFLOW_RECURSION_DETECTED"

  // --- Workflow Definition Errors ---
  | "WORKFLOW_NOT_FOUND"
  | "WORKFLOW_VALIDATION_FAILED"
  | "WORKFLOW_COMPILATION_FAILED"
  | "WORKFLOW_VERSION_MISMATCH"
  | "WORKFLOW_ALREADY_REGISTERED"
  | "WORKFLOW_CIRCULAR_DEPENDENCY"

  // --- Runtime Errors ---
  | "RUNTIME_SHUTTING_DOWN"
  | "RUNTIME_RESOURCE_EXHAUSTED"
  | "RUNTIME_INTERNAL_ERROR"
  | "RUNTIME_SCHEDULER_ERROR"
  | "RUNTIME_EVENT_BUS_ERROR"

  // --- Security Errors ---
  | "SECURITY_UNAUTHORIZED"
  | "SECURITY_FORBIDDEN"
  | "SECURITY_RATE_LIMITED"
  | "SECURITY_INVALID_TOKEN"
  | "SECURITY_TOKEN_EXPIRED"

  // --- Integration Errors ---
  | "INTEGRATION_EXTERNAL_API_ERROR"
  | "INTEGRATION_EXTERNAL_TIMEOUT"
  | "INTEGRATION_EXTERNAL_RATE_LIMITED"
  | "INTEGRATION_EXTERNAL_UNAVAILABLE"
  | "INTEGRATION_CONFIG_ERROR"
  | "INTEGRATION_CREDENTIAL_ERROR";

// ---------------------------------------------------------------------------
// Error Classifications
// ---------------------------------------------------------------------------

/**
 * Error codes that are considered transient (retryable).
 */
export const TRANSIENT_ERROR_CODES: readonly EngineErrorCode[] = [
  "AGENT_TIMEOUT",
  "AGENT_RATE_LIMITED",
  "NODE_TIMEOUT",
  "CHAIN_TIMEOUT",
  "PARALLEL_TIMEOUT",
  "SUBWORKFLOW_TIMEOUT",
  "INTEGRATION_EXTERNAL_TIMEOUT",
  "INTEGRATION_EXTERNAL_RATE_LIMITED",
  "INTEGRATION_EXTERNAL_UNAVAILABLE",
  "RUNTIME_RESOURCE_EXHAUSTED",
  "RUNTIME_SCHEDULER_ERROR",
] as const;

/**
 * Error codes that indicate a configuration issue (not retryable).
 */
export const CONFIGURATION_ERROR_CODES: readonly EngineErrorCode[] = [
  "GRAPH_CYCLE_DETECTED",
  "GRAPH_NODE_NOT_FOUND",
  "GRAPH_EDGE_NOT_FOUND",
  "GRAPH_DISCONNECTED",
  "GRAPH_UNRESOLVED_REFERENCE",
  "WORKFLOW_NOT_FOUND",
  "WORKFLOW_VALIDATION_FAILED",
  "WORKFLOW_COMPILATION_FAILED",
  "WORKFLOW_VERSION_MISMATCH",
  "INTEGRATION_CONFIG_ERROR",
  "INTEGRATION_CREDENTIAL_ERROR",
] as const;

/**
 * Error codes that indicate a security issue.
 */
export const SECURITY_ERROR_CODES: readonly EngineErrorCode[] = [
  "SECURITY_UNAUTHORIZED",
  "SECURITY_FORBIDDEN",
  "SECURITY_RATE_LIMITED",
  "SECURITY_INVALID_TOKEN",
  "SECURITY_TOKEN_EXPIRED",
  "AGENT_PERMISSION_DENIED",
] as const;

/**
 * Error codes that indicate the system is overloaded.
 */
export const OVERLOAD_ERROR_CODES: readonly EngineErrorCode[] = [
  "AGENT_RATE_LIMITED",
  "AGENT_QUOTA_EXCEEDED",
  "RUNTIME_RESOURCE_EXHAUSTED",
  "INTEGRATION_EXTERNAL_RATE_LIMITED",
  "SECURITY_RATE_LIMITED",
] as const;

// ---------------------------------------------------------------------------
// Specific Error Classes
// ---------------------------------------------------------------------------

/**
 * Thrown when a graph contains a cycle.
 */
export class GraphCycleError extends EngineError {
  constructor(
    cycles: string[][],
    details?: Record<string, unknown>
  ) {
    super(
      `Graph contains ${cycles.length} cycle(s): ${cycles.map(c => c.join(" -> ")).join("; ")}`,
      "GRAPH_CYCLE_DETECTED",
      "error",
      { cycles, ...details }
    );
    this.name = "GraphCycleError";
  }
}

/**
 * Thrown when a referenced node does not exist in the graph.
 */
export class NodeNotFoundError extends EngineError {
  constructor(nodeId: string) {
    super(
      `Node "${nodeId}" not found in the graph`,
      "GRAPH_NODE_NOT_FOUND",
      "error",
      { nodeId }
    );
    this.name = "NodeNotFoundError";
  }
}

/**
 * Thrown when a node execution times out.
 */
export class NodeTimeoutError extends EngineError {
  constructor(nodeId: string, timeoutMs: number) {
    super(
      `Node "${nodeId}" timed out after ${timeoutMs}ms`,
      "NODE_TIMEOUT",
      "error",
      { nodeId, timeoutMs }
    );
    this.name = "NodeTimeoutError";
  }
}

/**
 * Thrown when an agent execution fails.
 */
export class AgentExecutionError extends EngineError {
  constructor(
    agentName: string,
    message: string,
    code: EngineErrorCode = "AGENT_EXECUTION_FAILED",
    details?: Record<string, unknown>
  ) {
    super(
      `Agent "${agentName}" execution failed: ${message}`,
      code,
      "error",
      { agentName, ...details }
    );
    this.name = "AgentExecutionError";
  }
}

/**
 * Thrown when a chain step fails and the chain cannot continue.
 */
export class ChainStepError extends EngineError {
  constructor(
    stepId: string,
    message: string,
    code: EngineErrorCode = "CHAIN_STEP_FAILED",
    details?: Record<string, unknown>
  ) {
    super(
      `Chain step "${stepId}" failed: ${message}`,
      code,
      "error",
      { stepId, ...details }
    );
    this.name = "ChainStepError";
  }
}

/**
 * Thrown when a chain exceeds its deadline.
 */
export class ChainDeadlineError extends EngineError {
  constructor(
    deadline: string,
    elapsedMs: number
  ) {
    super(
      `Chain deadline "${deadline}" exceeded (elapsed: ${elapsedMs}ms)`,
      "CHAIN_DEADLINE_EXCEEDED",
      "error",
      { deadline, elapsedMs }
    );
    this.name = "ChainDeadlineError";
  }
}

/**
 * Thrown when a parallel branch fails.
 */
export class ParallelBranchError extends EngineError {
  constructor(
    branchId: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      `Parallel branch "${branchId}" failed: ${message}`,
      "PARALLEL_BRANCH_FAILED",
      "error",
      { branchId, ...details }
    );
    this.name = "ParallelBranchError";
  }
}

/**
 * Thrown when a workflow is not found in the registry.
 */
export class WorkflowNotFoundError extends EngineError {
  constructor(workflowId: string) {
    super(
      `Workflow "${workflowId}" not found in registry`,
      "WORKFLOW_NOT_FOUND",
      "error",
      { workflowId }
    );
    this.name = "WorkflowNotFoundError";
  }
}

/**
 * Thrown when a workflow definition fails validation.
 */
export class WorkflowValidationError extends EngineError {
  constructor(
    workflowId: string,
    issues: Array<{ code: string; message: string; path?: string }>
  ) {
    super(
      `Workflow "${workflowId}" validation failed with ${issues.length} issue(s)`,
      "WORKFLOW_VALIDATION_FAILED",
      "error",
      { workflowId, issues }
    );
    this.name = "WorkflowValidationError";
  }
}

/**
 * Thrown when context validation fails at a node boundary.
 */
export class ContextValidationError extends EngineError {
  constructor(
    errors: Array<{ path: string; message: string }>
  ) {
    super(
      `Context validation failed with ${errors.length} error(s)`,
      "CONTEXT_VALIDATION_FAILED",
      "error",
      { errors }
    );
    this.name = "ContextValidationError";
  }
}

// ---------------------------------------------------------------------------
// Error Utilities
// ---------------------------------------------------------------------------

/**
 * Determine if an error is retryable based on its code and type.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof EngineError) {
    return error.retryable;
  }
  // Network/connection errors are typically retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return false;
}

/**
 * Determine the error severity from an unknown error.
 */
export function classifyError(error: unknown, defaultCode: EngineErrorCode = "RUNTIME_INTERNAL_ERROR"): {
  code: EngineErrorCode;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
} {
  if (error instanceof EngineError) {
    return {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    // Check for common transient error patterns
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { code: "NODE_TIMEOUT", message: error.message, severity: "error", retryable: true };
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return { code: "AGENT_RATE_LIMITED", message: error.message, severity: "error", retryable: true };
    }
    if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("enotfound")) {
      return { code: "INTEGRATION_EXTERNAL_UNAVAILABLE", message: error.message, severity: "error", retryable: true };
    }
    if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("unauthorized")) {
      return { code: "SECURITY_FORBIDDEN", message: error.message, severity: "error", retryable: false };
    }
    return { code: defaultCode, message: error.message, severity: "error", retryable: false };
  }

  return { code: defaultCode, message: String(error), severity: "error", retryable: false };
}
