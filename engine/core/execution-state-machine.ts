// ============================================================================
// Nexus Agent Platform — ExecutionStateMachine Implementation
// ============================================================================
// Manages per-node execution state transitions with strict validation.
// Ensures nodes follow the correct lifecycle:
//   pending → running → completed|failed|skipped|timed_out|circuit_broken
//   running → waiting → running → completed|failed|timed_out
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * Possible states for a node during execution lifecycle.
 */
export type NodeExecutionState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "timed_out"
  | "circuit_broken"
  | "waiting";

/**
 * Alias for NodeExecutionState used by ExecutionHistory.
 */
export type ExecutionState = NodeExecutionState;

/**
 * A single state transition record (for history tracking).
 */
export interface TransitionEntry {
  from: ExecutionState;
  to: ExecutionState;
  timestamp: number;
  reason?: string;
}

/**
 * Error information attached to a failed node.
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  timestamp: string;
}

/**
 * Defines a valid state transition.
 */
export interface StateTransitionDef {
  from: NodeExecutionState[];
  to: NodeExecutionState;
}

// ============================================================================
// Valid Transitions
// ============================================================================

export const VALID_TRANSITIONS: StateTransitionDef[] = [
  { from: ["pending"], to: "running" },
  { from: ["pending"], to: "skipped" },
  { from: ["pending"], to: "waiting" },
  { from: ["running"], to: "completed" },
  { from: ["running"], to: "failed" },
  { from: ["running"], to: "timed_out" },
  { from: ["running"], to: "circuit_broken" },
  { from: ["running"], to: "waiting" },
  { from: ["waiting"], to: "running" },
  { from: ["waiting"], to: "failed" },
  { from: ["waiting"], to: "timed_out" },
  { from: ["waiting"], to: "skipped" },
];

// ============================================================================
// Terminal States
// ============================================================================

export const TERMINAL_STATES: Set<NodeExecutionState> = new Set([
  "completed",
  "failed",
  "skipped",
  "timed_out",
  "circuit_broken",
]);

export const EXECUTING_STATES: Set<NodeExecutionState> = new Set([
  "running",
  "waiting",
]);

/**
 * Check if a state is terminal. Exported for ExecutionHistory.
 */
export function isTerminal(state: ExecutionState): boolean {
  return TERMINAL_STATES.has(state as NodeExecutionState);
}

// ============================================================================
// ExecutionStateMachine
// ============================================================================

export class ExecutionStateMachine {
  private _state: NodeExecutionState;
  private _transitions: StateTransitionDef[];
  private _startedAt: number | null = null;
  private _transitionLog: TransitionEntry[] = [];

  constructor(initialState: NodeExecutionState = "pending") {
    this._state = initialState;
    this._transitions = [...VALID_TRANSITIONS];

    this._transitionLog.push({
      from: initialState,
      to: initialState,
      timestamp: Date.now(),
    });
  }

  // ========================================================================
  // Accessors
  // ========================================================================

  get currentState(): NodeExecutionState {
    return this._state;
  }

  get transitionLog(): ReadonlyArray<TransitionEntry> {
    return this._transitionLog;
  }

  // ========================================================================
  // State Queries
  // ========================================================================

  /**
   * Check if a transition to the given state is valid.
   */
  canTransition(to: NodeExecutionState): boolean {
    if (this.isTerminal()) return false;
    return this._transitions.some(
      (t) => t.to === to && t.from.includes(this._state),
    );
  }

  /**
   * Transition to a new state. Throws if the transition is invalid.
   */
  transition(to: NodeExecutionState): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `[ExecutionStateMachine] Invalid transition: ${this._state} → ${to}`,
      );
    }

    const from = this._state;
    this._state = to;

    if (to === "running" && from !== "running") {
      // Track first time we entered running state
      if (this._startedAt === null || from === "waiting") {
        // Only reset timer on first run or after waiting
        // For retries, we keep the original startedAt
      }
    }

    this._transitionLog.push({
      from,
      to,
      timestamp: Date.now(),
    } as TransitionEntry);
  }

  /**
   * Whether the current state is terminal (no more transitions possible).
   */
  isTerminal(): boolean {
    return TERMINAL_STATES.has(this._state);
  }

  /**
   * Whether the node is currently executing (running or waiting).
   */
  isExecuting(): boolean {
    return EXECUTING_STATES.has(this._state);
  }

  /**
   * Whether the node completed successfully.
   */
  isCompleted(): boolean {
    return this._state === "completed";
  }

  /**
   * Whether the node failed.
   */
  isFailed(): boolean {
    return (
      this._state === "failed" ||
      this._state === "timed_out" ||
      this._state === "circuit_broken"
    );
  }

  /**
   * Whether the node was skipped.
   */
  isSkipped(): boolean {
    return this._state === "skipped";
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  /**
   * Mark the node as started (transition to running).
   */
  start(): void {
    this.transition("running");
    if (this._startedAt === null) {
      this._startedAt = Date.now();
    }
  }

  /**
   * Mark the node as completed successfully.
   */
  complete(): void {
    this.transition("completed");
  }

  /**
   * Mark the node as failed.
   */
  fail(): void {
    this.transition("failed");
  }

  /**
   * Mark the node as skipped.
   */
  skip(): void {
    this.transition("skipped");
  }

  /**
   * Mark the node as timed out.
   */
  timeout(): void {
    this.transition("timed_out");
  }

  /**
   * Mark the node as circuit broken.
   */
  circuitBreak(): void {
    this.transition("circuit_broken");
  }

  /**
   * Mark the node as waiting (e.g., waiting for upstream synchronizer inputs).
   */
  wait(): void {
    this.transition("waiting");
  }

  /**
   * Reset the state machine to initial state.
   */
  reset(): void {
    this._state = "pending";
    this._startedAt = null;
    this._transitionLog = [
      {
        from: "pending",
        to: "pending",
        timestamp: Date.now(),
      },
    ];
  }

  /**
   * Get elapsed time since started (ms), or 0 if not started.
   */
  elapsed(): number {
    if (this._startedAt === null) return 0;
    return Date.now() - this._startedAt;
  }
}
