// ============================================================================
// Nexus Agent Platform — ExecutionLoop Instrumentation Hooks
// ============================================================================
//
// == Purpose ==
// This module provides hook functions that can be called BY ExecutionLoop v2
// to emit observability events WITHOUT modifying the loop's own business
// logic. The hooks are pure instrumentation — they fire and forget events
// to the store and SSE stream, with zero impact on execution semantics.
//
// == How to integrate with ExecutionLoop v2 ==
//
// 1. Import this module in the ExecutionLoop file:
//
//      import { instrumentExecutionLoop } from "@/lib/execution-events/execution-hooks";
//      import { executionStore } from "@/lib/execution-events/store";
//      import { executionEventStream } from "@/lib/execution-events/stream";
//
// 2. Create hooks at the start of a run:
//
//      const hooks = instrumentExecutionLoop(
//        (event) => {
//          executionStore.appendEvent(event.runId, event);
//          executionEventStream.publish(event);
//        },
//        executionStore,
//      );
//
// 3. Append hook calls to existing method calls — do NOT replace them.
//    For example, if ExecutionLoop already has:
//
//      this.markNodeStarted(nodeId);
//      this.executeAgent(nodeId);
//
//    Change it to:
//
//      this.markNodeStarted(nodeId);
//      hooks.onNodeStarted(runId, nodeId, agentId);   // <-- appended
//      this.executeAgent(nodeId);
//
// 4. The hooks fire synchronously and should always come AFTER the actual
//    state change they report, so the store is consistent.
//
// == Design Principles ==
//
// - ZERO side effects on ExecutionLoop state — these hooks are read-only
//   with respect to execution state.
// - All errors are caught internally — a hook failure will NEVER crash
//   the execution loop.
// - Events are dispatched synchronously to preserve ordering guarantees.
//
// ============================================================================

import type { ExecutionEvent, ExecutionRun, ContextSnapshot } from "./types";
import { ExecutionEventType } from "./types";
import type { ExecutionStore } from "./store";
import type { WorkflowNode, WorkflowEdge } from "@/lib/engine/workflow-execution";

// ---------------------------------------------------------------------------
// ExecutionHooks interface
// ---------------------------------------------------------------------------

/**
 * Collection of instrumentation hooks that an ExecutionLoop can call at
 * each lifecycle transition point. Each method accepts the minimal data
 * needed to construct the corresponding observability event.
 *
 * All methods are synchronous and error-safe — they will never throw.
 */
export interface ExecutionHooks {
  /**
   * Called when a new execution run is initialised (before any node executes).
   * Creates the run record in the store with its execution plan.
   */
  onRunInitialized(
    runId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): void;

  /**
   * Called when a node transitions from "pending" to "running".
   */
  onNodeStarted(runId: string, nodeId: string, agentId: string): void;

  /**
   * Called when a node completes successfully.
   * @param result - The agent's output payload
   */
  onNodeCompleted(
    runId: string,
    nodeId: string,
    agentId: string,
    result: unknown,
  ): void;

  /**
   * Called when a node fails after exhausting all retries.
   */
  onNodeFailed(
    runId: string,
    nodeId: string,
    agentId: string,
    error: string,
    retryCount: number,
  ): void;

  /**
   * Called when a node is skipped (e.g. due to a conditional edge evaluating
   * to false, or a dependency failure).
   */
  onNodeSkipped(
    runId: string,
    nodeId: string,
    agentId: string,
    reason: string,
  ): void;

  /**
   * Called when a retryable node failure occurs and a retry is scheduled.
   */
  onNodeRetrying(
    runId: string,
    nodeId: string,
    agentId: string,
    attempt: number,
    backoffMs: number,
  ): void;

  /**
   * Called after an agent writes to the shared execution context.
   * Captures a context snapshot with an optional diff.
   */
  onContextUpdated(
    runId: string,
    agentId: string,
    writes: Record<string, unknown>,
    version: number,
  ): void;

  /**
   * Called when a conditional router node selects a route.
   */
  onRouteSelected(
    runId: string,
    nodeId: string,
    selectedRoute: string,
    targetNodeId: string,
    conditionResult: unknown,
  ): void;

  /**
   * Called when a synchronizer node is waiting for pending branches.
   */
  onSynchronizerBarrier(
    runId: string,
    nodeId: string,
    pendingNodes: string[],
    completedNodes: string[],
  ): void;

  /**
   * Called when a synchronizer node merges results from parallel branches.
   */
  onSynchronizerMerged(
    runId: string,
    nodeId: string,
    sourceCount: number,
    mergedKeys: string[],
  ): void;

  /**
   * Called when the entire execution completes successfully.
   */
  onExecutionCompleted(runId: string, status: string, durationMs: number): void;

  /**
   * Called when the entire execution fails with a non-retryable error.
   */
  onExecutionFailed(runId: string, error: string, durationMs: number): void;

  /**
   * Called on any generic state transition within a node.
   */
  onStateTransition(
    runId: string,
    nodeId: string,
    from: string,
    to: string,
    reason?: string,
  ): void;
}

// ---------------------------------------------------------------------------
// Event ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a reasonably unique event ID using timestamp + random suffix.
 * In production, this should be replaced with a proper UUID v4 library
 * (e.g. `crypto.randomUUID()` in Node.js 19+).
 */
function eventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// Emit helper — creates and dispatches an event
// ---------------------------------------------------------------------------

/**
 * Construct an ExecutionEvent and dispatch it via the emit function.
 * The emit function is responsible for storing the event and broadcasting
 * it to SSE subscribers.
 */
function createAndEmit(
  emit: (event: ExecutionEvent) => void,
  runId: string,
  type: ExecutionEventType,
  extra?: {
    nodeId?: string;
    agentId?: string;
    data?: Record<string, unknown>;
  },
): void {
  try {
    const event: ExecutionEvent = {
      id: eventId(),
      runId,
      type,
      timestamp: Date.now(),
      nodeId: extra?.nodeId,
      agentId: extra?.agentId,
      data: extra?.data,
    };
    emit(event);
  } catch {
    // Instrumentation must never crash the caller
  }
}

// ---------------------------------------------------------------------------
// instrumentExecutionLoop — factory function
// ---------------------------------------------------------------------------

/**
 * Create the set of instrumentation hooks for an ExecutionLoop instance.
 *
 * @param emit  - Function that dispatches the event to the store and stream.
 *                 Typical implementation:
 *                   (event) => {
 *                     executionStore.appendEvent(event.runId, event);
 *                     executionEventStream.publish(event);
 *                   }
 * @param store - The ExecutionStore instance for run lifecycle management
 *                 (creating runs, updating status, appending snapshots).
 *
 * @returns An ExecutionHooks object whose methods can be appended to
 *          ExecutionLoop's existing method calls.
 */
export function instrumentExecutionLoop(
  emit: (event: ExecutionEvent) => void,
  store: ExecutionStore,
): ExecutionHooks {
  // ---- Run lifecycle ----

  const onRunInitialized: ExecutionHooks["onRunInitialized"] = (
    runId,
    workflowId,
    nodes,
    edges,
  ) => {
    const now = Date.now();

    // Create the run record in the store
    const run: ExecutionRun = {
      runId,
      workflowId,
      status: "running",
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
      events: [],
      contextSnapshots: [],
      startedAt: now,
    };
    store.createRun(run);

    // Emit the initialised event
    createAndEmit(emit, runId, ExecutionEventType.RUN_INITIALIZED, {
      data: {
        workflowId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        startedAt: now,
      },
    });
  };

  // ---- Node lifecycle ----

  const onNodeStarted: ExecutionHooks["onNodeStarted"] = (
    runId,
    nodeId,
    agentId,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.NODE_STARTED, {
      nodeId,
      agentId,
      data: { startedAt: Date.now() },
    });
  };

  const onNodeCompleted: ExecutionHooks["onNodeCompleted"] = (
    runId,
    nodeId,
    agentId,
    result,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.NODE_COMPLETED, {
      nodeId,
      agentId,
      data: {
        completedAt: Date.now(),
        hasResult: result !== null && result !== undefined,
        resultSummary:
          result && typeof result === "object" && !Array.isArray(result)
            ? Object.keys(result as Record<string, unknown>)
            : typeof result,
      },
    });
  };

  const onNodeFailed: ExecutionHooks["onNodeFailed"] = (
    runId,
    nodeId,
    agentId,
    error,
    retryCount,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.NODE_FAILED, {
      nodeId,
      agentId,
      data: {
        error,
        retryCount,
        failedAt: Date.now(),
        retriesExhausted: retryCount,
      },
    });
  };

  const onNodeSkipped: ExecutionHooks["onNodeSkipped"] = (
    runId,
    nodeId,
    agentId,
    reason,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.NODE_SKIPPED, {
      nodeId,
      agentId,
      data: {
        reason,
        skippedAt: Date.now(),
      },
    });
  };

  const onNodeRetrying: ExecutionHooks["onNodeRetrying"] = (
    runId,
    nodeId,
    agentId,
    attempt,
    backoffMs,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.NODE_RETRYING, {
      nodeId,
      agentId,
      data: {
        attempt,
        maxRetries: attempt, // hook doesn't know maxRetries, caller can enrich
        backoffMs,
        nextRetryAt: Date.now() + backoffMs,
      },
    });
  };

  // ---- Context ----

  const onContextUpdated: ExecutionHooks["onContextUpdated"] = (
    runId,
    agentId,
    writes,
    version,
  ) => {
    const now = Date.now();

    // Build a diff against the previous snapshot if available
    const previousSnapshots = store.getSnapshots(runId);
    const previousVersion = previousSnapshots.currentVersion;
    const previousWrites =
      previousSnapshots.snapshots.length > 0
        ? previousSnapshots.snapshots[previousSnapshots.snapshots.length - 1]
            .writes
        : {};

    const diff: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
    for (const [key, newValue] of Object.entries(writes)) {
      const oldValue = (previousWrites as Record<string, unknown>)[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff[key] = { oldValue, newValue };
      }
    }

    // Store the snapshot
    const snapshot: ContextSnapshot = {
      runId,
      version,
      agentId,
      writes,
      previousVersion,
      diff: Object.keys(diff).length > 0 ? diff : undefined,
      timestamp: now,
    };
    store.appendSnapshot(runId, snapshot);

    // Emit the context updated event
    createAndEmit(emit, runId, ExecutionEventType.CONTEXT_UPDATED, {
      nodeId: undefined, // context may be updated at run level
      agentId,
      data: {
        version,
        previousVersion,
        writeCount: Object.keys(writes).length,
        changedKeys: Object.keys(diff),
        timestamp: now,
      },
    });
  };

  // ---- Routing ----

  const onRouteSelected: ExecutionHooks["onRouteSelected"] = (
    runId,
    nodeId,
    selectedRoute,
    targetNodeId,
    conditionResult,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.ROUTE_SELECTED, {
      nodeId,
      data: {
        selectedRoute,
        targetNodeId,
        conditionResult,
        routedAt: Date.now(),
      },
    });
  };

  // ---- Synchronizer ----

  const onSynchronizerBarrier: ExecutionHooks["onSynchronizerBarrier"] = (
    runId,
    nodeId,
    pendingNodes,
    completedNodes,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.SYNCHRONIZER_BARRIER, {
      nodeId,
      data: {
        pendingNodes,
        completedNodes,
        pendingCount: pendingNodes.length,
        completedCount: completedNodes.length,
        timestamp: Date.now(),
      },
    });
  };

  const onSynchronizerMerged: ExecutionHooks["onSynchronizerMerged"] = (
    runId,
    nodeId,
    sourceCount,
    mergedKeys,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.SYNCHRONIZER_MERGED, {
      nodeId,
      data: {
        sourceCount,
        mergedKeys,
        mergedKeyCount: mergedKeys.length,
        timestamp: Date.now(),
      },
    });
  };

  // ---- Execution terminal ----

  const onExecutionCompleted: ExecutionHooks["onExecutionCompleted"] = (
    runId,
    status,
    durationMs,
  ) => {
    const now = Date.now();

    // Update the run record
    store.updateRun(runId, {
      status,
      completedAt: now,
      durationMs,
    });

    createAndEmit(emit, runId, ExecutionEventType.EXECUTION_COMPLETED, {
      data: {
        status,
        durationMs,
        completedAt: now,
      },
    });
  };

  const onExecutionFailed: ExecutionHooks["onExecutionFailed"] = (
    runId,
    error,
    durationMs,
  ) => {
    const now = Date.now();

    // Update the run record
    store.updateRun(runId, {
      status: "failed",
      completedAt: now,
      durationMs,
      error,
    });

    createAndEmit(emit, runId, ExecutionEventType.EXECUTION_FAILED, {
      data: {
        error,
        durationMs,
        failedAt: now,
      },
    });
  };

  // ---- State transitions ----

  const onStateTransition: ExecutionHooks["onStateTransition"] = (
    runId,
    nodeId,
    from,
    to,
    reason?,
  ) => {
    createAndEmit(emit, runId, ExecutionEventType.STATE_TRANSITION, {
      nodeId,
      data: {
        from,
        to,
        reason,
        transitionedAt: Date.now(),
      },
    });
  };

  // -----------------------------------------------------------------------
  // Assemble and return the hooks object
  // -----------------------------------------------------------------------

  return {
    onRunInitialized,
    onNodeStarted,
    onNodeCompleted,
    onNodeFailed,
    onNodeSkipped,
    onNodeRetrying,
    onContextUpdated,
    onRouteSelected,
    onSynchronizerBarrier,
    onSynchronizerMerged,
    onExecutionCompleted,
    onExecutionFailed,
    onStateTransition,
  };
}
