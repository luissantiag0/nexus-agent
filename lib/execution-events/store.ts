// ============================================================================
// Nexus Agent Platform — Execution Store
// ============================================================================
// Thread-safe in-memory storage for execution runs, events, and context
// snapshots. Implements a write-through pattern: every event or snapshot is
// appended immediately to the in-memory store.
//
// All public methods are synchronous for simplicity in the Node.js single-
// threaded event loop. Each run's events and snapshots are stored as arrays
// in insertion order for natural chronological sorting.
//
// The store is implemented as a singleton shared across all API routes and
// the instrumentation hooks layer.
// ============================================================================

import type {
  ExecutionEvent,
  ExecutionRun,
  RunSummary,
  ContextSnapshot,
  ExecutionEventType,
} from "./types";

// ---------------------------------------------------------------------------
// Store Configuration
// ---------------------------------------------------------------------------

export interface ExecutionStoreConfig {
  /** Maximum number of runs to retain in memory (FIFO eviction). Default: 500 */
  maxRuns: number;
  /** Maximum events per run. Default: 10000 */
  maxEventsPerRun: number;
  /** Maximum context snapshots per run. Default: 1000 */
  maxSnapshotsPerRun: number;
}

const DEFAULT_CONFIG: ExecutionStoreConfig = {
  maxRuns: 500,
  maxEventsPerRun: 10_000,
  maxSnapshotsPerRun: 1_000,
};

// ---------------------------------------------------------------------------
// ExecutionStore
// ---------------------------------------------------------------------------

export class ExecutionStore {
  private runs = new Map<string, ExecutionRun>();
  private config: ExecutionStoreConfig;
  private runOrder: string[] = []; // insertion order for FIFO eviction

  constructor(config?: Partial<ExecutionStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Run lifecycle
  // -----------------------------------------------------------------------

  /**
   * Create a new execution run entry.
   * If the store is at capacity, the oldest run (FIFO) is evicted.
   */
  createRun(run: ExecutionRun): void {
    // Evict oldest run if at capacity
    if (this.runOrder.length >= this.config.maxRuns) {
      const oldest = this.runOrder.shift();
      if (oldest) {
        this.runs.delete(oldest);
      }
    }

    this.runs.set(run.runId, {
      ...run,
      events: [],
      contextSnapshots: [],
      startedAt: run.startedAt ?? Date.now(),
    });
    this.runOrder.push(run.runId);
  }

  /** Update the status and/or metadata of an existing run. */
  updateRun(
    runId: string,
    patch: Partial<Pick<ExecutionRun, "status" | "completedAt" | "durationMs" | "error" | "metadata">>,
  ): void {
    const run = this.runs.get(runId);
    if (!run) return;
    Object.assign(run, patch);
  }

  /** Retrieve a full run by ID, or undefined if not found. */
  getRun(runId: string): ExecutionRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List runs with optional status filtering and pagination.
   * Returns runs ordered by startedAt descending (most recent first).
   */
  listRuns(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): { runs: RunSummary[]; total: number } {
    const status = options?.status;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Collect all runs in reverse insertion order (most recent first)
    let candidates = [...this.runOrder]
      .reverse()
      .map((id) => this.runs.get(id)!)
      .filter(Boolean);

    // Filter by status if provided
    if (status) {
      candidates = candidates.filter((r) => r.status === status);
    }

    const total = candidates.length;
    const page = candidates.slice(offset, offset + limit);

    return {
      runs: page.map(this.toSummary),
      total,
    };
  }

  /** Delete a run and all associated data. */
  deleteRun(runId: string): boolean {
    const existed = this.runs.delete(runId);
    if (existed) {
      const idx = this.runOrder.indexOf(runId);
      if (idx !== -1) this.runOrder.splice(idx, 1);
    }
    return existed;
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  /** Append an event to a run's event log. Enforces per-run event cap. */
  appendEvent(runId: string, event: ExecutionEvent): void {
    const run = this.runs.get(runId);
    if (!run) return;

    run.events.push(event);

    // Trim oldest events if exceeding limit
    if (run.events.length > this.config.maxEventsPerRun) {
      run.events.splice(0, run.events.length - this.config.maxEventsPerRun);
    }
  }

  /**
   * Retrieve events for a run with optional filtering and pagination.
   * Events are returned in chronological order (insertion order).
   */
  getEvents(
    runId: string,
    filters?: {
      type?: ExecutionEventType;
      nodeId?: string;
      limit?: number;
      offset?: number;
    },
  ): { events: ExecutionEvent[]; total: number; hasMore: boolean } {
    const run = this.runs.get(runId);
    if (!run) return { events: [], total: 0, hasMore: false };

    let filtered = run.events;

    if (filters?.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }
    if (filters?.nodeId) {
      filtered = filtered.filter((e) => e.nodeId === filters.nodeId);
    }

    const total = filtered.length;
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const page = filtered.slice(offset, offset + limit);

    return {
      events: page,
      total,
      hasMore: offset + limit < total,
    };
  }

  // -----------------------------------------------------------------------
  // Context Snapshots
  // -----------------------------------------------------------------------

  /** Append a context snapshot to a run. Enforces per-run cap. */
  appendSnapshot(runId: string, snapshot: ContextSnapshot): void {
    const run = this.runs.get(runId);
    if (!run) return;

    run.contextSnapshots.push(snapshot);

    // Trim oldest snapshots if exceeding limit
    if (run.contextSnapshots.length > this.config.maxSnapshotsPerRun) {
      run.contextSnapshots.splice(
        0,
        run.contextSnapshots.length - this.config.maxSnapshotsPerRun,
      );
    }
  }

  /**
   * Retrieve context snapshots for a run.
   * Optionally filter by a specific version; if omitted, returns all.
   */
  getSnapshots(
    runId: string,
    version?: number,
  ): { snapshots: ContextSnapshot[]; currentVersion: number } {
    const run = this.runs.get(runId);
    if (!run) return { snapshots: [], currentVersion: 0 };

    const snapshots = version
      ? run.contextSnapshots.filter((s) => s.version === version)
      : [...run.contextSnapshots];

    const currentVersion =
      run.contextSnapshots.length > 0
        ? run.contextSnapshots[run.contextSnapshots.length - 1].version
        : 0;

    return { snapshots, currentVersion };
  }

  // -----------------------------------------------------------------------
  // Diagnostics
  // -----------------------------------------------------------------------

  /** Returns aggregate statistics about the store. */
  stats() {
    return {
      runCount: this.runs.size,
      eventCount: Array.from(this.runs.values()).reduce(
        (sum, r) => sum + r.events.length,
        0,
      ),
      snapshotCount: Array.from(this.runs.values()).reduce(
        (sum, r) => sum + r.contextSnapshots.length,
        0,
      ),
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private toSummary(run: ExecutionRun): RunSummary {
    return {
      runId: run.runId,
      workflowId: run.workflowId,
      workflowName: run.workflowName,
      mode: run.mode,
      status: run.status,
      nodeCount: run.nodes.length,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      error: run.error,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Global singleton shared by API routes and instrumentation hooks.
 * Import this in route handlers to access the store.
 */
export const executionStore = new ExecutionStore();
