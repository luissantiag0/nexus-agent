// ============================================================================
// Nexus Agent Platform — ExecutionHistory Implementation
// ============================================================================
// Tracks per-node execution history with timing, state transitions, and
// error information. Provides summary statistics and query methods for
// post-execution analysis and observability.
// ============================================================================

import type { NodeExecutionState } from "./execution-state-machine";

// ============================================================================
// Types
// ============================================================================

/**
 * A single entry in the execution history for a node.
 */
export interface HistoryEntry {
  nodeId: string;
  agentId: string;
  state: NodeExecutionState;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  error: string | null;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Summary statistics for an execution.
 */
export interface ExecutionSummary {
  totalNodes: number;
  completed: number;
  failed: number;
  skipped: number;
  waiting: number;
  running: number;
  pending: number;
  totalDurationMs: number;
  hasErrors: boolean;
}

/**
 * Serializable snapshot of the execution history.
 */
export interface HistorySnapshot {
  executionId: string;
  entries: HistoryEntry[];
  summary: ExecutionSummary;
}

// ============================================================================
// ExecutionHistory
// ============================================================================

export class ExecutionHistory {
  private entries: HistoryEntry[] = [];
  readonly executionId: string;
  private readonly startedAt: number;

  constructor(executionId: string) {
    this.executionId = executionId;
    this.startedAt = Date.now();
  }

  // ========================================================================
  // Recording
  // ========================================================================

  record(
    entry: Omit<HistoryEntry, "startedAt" | "completedAt" | "durationMs"> & {
      startedAt?: string;
    },
  ): void {
    const existing = this.entries.findIndex((e) => e.nodeId === entry.nodeId);
    const newEntry: HistoryEntry = {
      nodeId: entry.nodeId,
      agentId: entry.agentId,
      state: entry.state,
      startedAt: entry.startedAt ?? new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
      error: entry.error ?? null,
      retryCount: entry.retryCount ?? 0,
      metadata: entry.metadata,
    };

    if (existing >= 0) {
      this.entries[existing] = {
        ...this.entries[existing],
        ...newEntry,
        completedAt: this.entries[existing].completedAt,
        durationMs: this.entries[existing].durationMs,
      };
    } else {
      this.entries.push(newEntry);
    }
  }

  updateCompletion(
    nodeId: string,
    state: NodeExecutionState,
    error?: string | null,
    metadata?: Record<string, unknown>,
  ): void {
    const entry = this.entries.find((e) => e.nodeId === nodeId);
    if (!entry) {
      this.record({
        nodeId,
        agentId: "unknown",
        state,
        error: error ?? null,
        retryCount: 0,
        metadata,
      });
      return;
    }

    const completedAt = new Date().toISOString();
    const startedAtTime = new Date(entry.startedAt).getTime();
    const durationMs = Date.now() - startedAtTime;

    entry.state = state;
    entry.completedAt = completedAt;
    entry.durationMs = durationMs;
    entry.error = error ?? entry.error;
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }
  }

  recordError(nodeId: string, error: string): void {
    const entry = this.entries.find((e) => e.nodeId === nodeId);
    if (entry) {
      entry.error = error;
      entry.state = "failed";
      entry.completedAt = new Date().toISOString();
      entry.durationMs = Date.now() - new Date(entry.startedAt).getTime();
    }
  }

  // ========================================================================
  // Queries
  // ========================================================================

  getNodeHistory(nodeId: string): HistoryEntry[] {
    return this.entries.filter((e) => e.nodeId === nodeId);
  }

  getFailed(): HistoryEntry[] {
    return this.entries.filter(
      (e) =>
        e.state === "failed" ||
        e.state === "timed_out" ||
        e.state === "circuit_broken",
    );
  }

  getCompleted(): HistoryEntry[] {
    return this.entries.filter((e) => e.state === "completed");
  }

  getSkipped(): HistoryEntry[] {
    return this.entries.filter((e) => e.state === "skipped");
  }

  getAll(): ReadonlyArray<HistoryEntry> {
    return this.entries;
  }

  // ========================================================================
  // Summary
  // ========================================================================

  summary(): ExecutionSummary {
    const totalNodes = this.entries.length;
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let waiting = 0;
    let running = 0;
    let pending = 0;

    for (const entry of this.entries) {
      switch (entry.state) {
        case "completed":
          completed++;
          break;
        case "failed":
        case "timed_out":
        case "circuit_broken":
          failed++;
          break;
        case "skipped":
          skipped++;
          break;
        case "waiting":
          waiting++;
          break;
        case "running":
          running++;
          break;
        case "pending":
          pending++;
          break;
      }
    }

    return {
      totalNodes,
      completed,
      failed,
      skipped,
      waiting,
      running,
      pending,
      totalDurationMs: Date.now() - this.startedAt,
      hasErrors: failed > 0,
    };
  }

  toJSON(): HistorySnapshot {
    return {
      executionId: this.executionId,
      entries: [...this.entries],
      summary: this.summary(),
    };
  }
}
