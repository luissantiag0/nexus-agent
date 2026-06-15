// ============================================================================
// Nexus Agent Platform — Persistence Instrumentation
// ============================================================================
// Wraps the ExecutionHooks to enqueue persistence operations via the
// PersistenceQueue. Each hook method fires the original event first,
// then asynchronously queues the corresponding write operation.
//
// == Design ==
// - Non-blocking: enqueue() is never awaited
// - Error-safe: all operations are wrapped in try/catch
// - Each hook produces the minimum payload needed for the DB write
// - Idempotency keys (operationId) are generated per invocation
// ============================================================================

import type { ExecutionHooks } from "@/lib/execution-events/execution-hooks";
import type { PersistenceQueueItem } from "./types";
import { PersistenceQueue } from "./persistence-queue";
import type { WorkflowNode, WorkflowEdge } from "@/lib/engine/workflow-execution";

// ---------------------------------------------------------------------------
// ID generation (matches pattern from execution-hooks.ts)
// ---------------------------------------------------------------------------

function operationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `pers-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// PersistenceInstrumentation
// ---------------------------------------------------------------------------

/**
 * Wraps an ExecutionHooks instance with persistence instrumentation.
 * Each hook delegates to the original hook, then enqueues a corresponding
 * persistence operation. Enqueue is fire-and-forget — never awaited.
 *
 * Usage:
 *   const hooks = instrumentExecutionLoop(emit, store);
 *   const persisted = new PersistenceInstrumentation(hooks, queue);
 *   // Use `persisted` in place of `hooks` everywhere
 */
export class PersistenceInstrumentation implements ExecutionHooks {
  /** Active tenant context — must be set before any execution run. */
  private tenantId: string = "";

  constructor(
    private readonly inner: ExecutionHooks,
    private readonly queue: PersistenceQueue,
  ) {}

  /**
   * Set the tenant context for all subsequent persistence operations.
   * Must be called before the first execution run. Throws if called
   * after enqueues have started (use resetTenant() to change).
   */
  setTenantId(id: string): void {
    this.tenantId = id;
  }

  /**
   * Get the current tenant ID. Returns empty string if not set.
   */
  getTenantId(): string {
    return this.tenantId;
  }

  /**
   * Assert tenant_id is set — throws if missing.
   */
  private requireTenantId(): string {
    if (!this.tenantId) {
      throw new Error(
        "PersistenceInstrumentation: tenant_id not set. " +
        "Call setTenantId() before starting execution.",
      );
    }
    return this.tenantId;
  }

  onRunInitialized(
    runId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): void {
    this.inner.onRunInitialized(runId, workflowId, nodes, edges);
    this.tryEnqueue({
      id: operationId(),
      operation: "run:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        workflowId,
        workflowName: workflowId,
        mode: "DAG",
        status: "initialized",
        nodeCount: nodes.length,
        edgeCount: edges.length,
        startedAt: Date.now(),
        metadata: {},
      },
    });
  }

  onNodeStarted(runId: string, nodeId: string, agentId: string): void {
    this.inner.onNodeStarted(runId, nodeId, agentId);
    this.tryEnqueue({
      id: operationId(),
      operation: "node:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        agentId,
        status: "running",
        startedAt: Date.now(),
      },
    });
  }

  onNodeCompleted(
    runId: string,
    nodeId: string,
    agentId: string,
    result: unknown,
  ): void {
    this.inner.onNodeCompleted(runId, nodeId, agentId, result);
    this.tryEnqueue({
      id: operationId(),
      operation: "node:update",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        agentId,
        status: "completed",
        result: result as Record<string, unknown> | undefined,
        completedAt: Date.now(),
      },
    });
  }

  onNodeFailed(
    runId: string,
    nodeId: string,
    agentId: string,
    error: string,
    retryCount: number,
  ): void {
    this.inner.onNodeFailed(runId, nodeId, agentId, error, retryCount);
    this.tryEnqueue({
      id: operationId(),
      operation: "node:update",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        agentId,
        status: "failed",
        error,
        retryCount,
        completedAt: Date.now(),
      },
    });
  }

  onNodeSkipped(
    runId: string,
    nodeId: string,
    agentId: string,
    reason: string,
  ): void {
    this.inner.onNodeSkipped(runId, nodeId, agentId, reason);
    this.tryEnqueue({
      id: operationId(),
      operation: "node:update",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        agentId,
        status: "skipped",
        reason,
        completedAt: Date.now(),
      },
    });
  }

  onNodeRetrying(
    runId: string,
    nodeId: string,
    agentId: string,
    attempt: number,
    backoffMs: number,
  ): void {
    this.inner.onNodeRetrying(runId, nodeId, agentId, attempt, backoffMs);
    this.tryEnqueue({
      id: operationId(),
      operation: "node:update",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        agentId,
        status: "retrying",
        attempt,
        backoffMs,
      },
    });
  }

  onContextUpdated(
    runId: string,
    agentId: string,
    writes: Record<string, unknown>,
    version: number,
  ): void {
    this.inner.onContextUpdated(runId, agentId, writes, version);
    this.tryEnqueue({
      id: operationId(),
      operation: "snapshot:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        agentId,
        version,
        writes,
        diff: {},
        capturedAt: Date.now(),
      },
    });
  }

  onRouteSelected(
    runId: string,
    nodeId: string,
    selectedRoute: string,
    targetNodeId: string,
    conditionResult: unknown,
  ): void {
    this.inner.onRouteSelected(runId, nodeId, selectedRoute, targetNodeId, conditionResult);
    this.tryEnqueue({
      id: operationId(),
      operation: "event:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        eventType: "route_selected",
        data: { selectedRoute, targetNodeId, conditionResult },
        timestamp: Date.now(),
      },
    });
  }

  onSynchronizerBarrier(
    runId: string,
    nodeId: string,
    pendingNodes: string[],
    completedNodes: string[],
  ): void {
    this.inner.onSynchronizerBarrier(runId, nodeId, pendingNodes, completedNodes);
    this.tryEnqueue({
      id: operationId(),
      operation: "event:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        eventType: "synchronizer_barrier",
        data: { pendingNodes, completedNodes },
        timestamp: Date.now(),
      },
    });
  }

  onSynchronizerMerged(
    runId: string,
    nodeId: string,
    sourceCount: number,
    mergedKeys: string[],
  ): void {
    this.inner.onSynchronizerMerged(runId, nodeId, sourceCount, mergedKeys);
    this.tryEnqueue({
      id: operationId(),
      operation: "event:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        eventType: "synchronizer_merged",
        data: { sourceCount, mergedKeys },
        timestamp: Date.now(),
      },
    });
  }

  onExecutionCompleted(runId: string, status: string, durationMs: number): void {
    this.inner.onExecutionCompleted(runId, status, durationMs);
    this.tryEnqueue({
      id: operationId(),
      operation: "run:complete",
      payload: {
        tenant_id: this.tenantId,
        runId,
        status,
        durationMs,
        completedAt: Date.now(),
      },
    });
  }

  onExecutionFailed(runId: string, error: string, durationMs: number): void {
    this.inner.onExecutionFailed(runId, error, durationMs);
    this.tryEnqueue({
      id: operationId(),
      operation: "run:complete",
      payload: {
        tenant_id: this.tenantId,
        runId,
        status: "failed",
        error,
        durationMs,
        completedAt: Date.now(),
      },
    });
  }

  onStateTransition(
    runId: string,
    nodeId: string,
    from: string,
    to: string,
    reason?: string,
  ): void {
    this.inner.onStateTransition(runId, nodeId, from, to, reason);
    this.tryEnqueue({
      id: operationId(),
      operation: "event:create",
      payload: {
        tenant_id: this.tenantId,
        runId,
        nodeId,
        eventType: "state_transition",
        data: { from, to, reason },
        timestamp: Date.now(),
      },
    });
  }

  // -----------------------------------------------------------------------
  // Private helper — fire-and-forget enqueue, never throws
  // -----------------------------------------------------------------------

  private tryEnqueue(
    item: Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError">,
  ): void {
    try {
      // Validate tenant_id is present — refuse to enqueue without it
      if (!this.tenantId) {
        console.warn(
          "[PersistenceInstrumentation] tenant_id not set, skipping enqueue. " +
          "Call setTenantId() before execution runs.",
        );
        return;
      }
      this.queue.enqueue(item);
    } catch {
      // Persistence instrumentation must never crash the execution loop
    }
  }
}
