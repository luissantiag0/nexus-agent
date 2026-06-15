// ============================================================================
// Nexus Agent Platform — Persistence Event Mapper
// ============================================================================
// Maps runtime execution events and state into PersistenceQueueItem records
// ready for enqueueing. This is the translation layer between the event
// system and the persistence system.
//
// Each mapping produces a complete, self-contained queue item with an
// idempotency key and structured payload that the BatchWriter can route.
// ============================================================================

import type { PersistenceQueueItem } from "./types";
import type { ExecutionEvent, ExecutionRun, ContextSnapshot } from "@/lib/execution-events/types";
import type { RunNodeRecord, RunEventRecord, ContextSnapshotRecord } from "./persistence-records";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function itemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `pe-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// PersistenceEventMapper
// ---------------------------------------------------------------------------

export class PersistenceEventMapper {
  /**
   * Map an ExecutionRun creation to a queue item.
   */
  runCreated(run: ExecutionRun): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    return {
      id: itemId(),
      operation: "run:create",
      payload: {
        runId: run.runId,
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        mode: run.mode,
        status: run.status,
        nodeCount: run.nodes.length,
        edgeCount: run.edges.length,
        startedAt: run.startedAt,
      },
    };
  }

  /**
   * Map an ExecutionRun completion to a queue item.
   */
  runCompleted(run: ExecutionRun): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    return {
      id: itemId(),
      operation: "run:complete",
      payload: {
        runId: run.runId,
        status: run.status,
        durationMs: run.durationMs,
        completedAt: run.completedAt,
        error: run.error,
      },
    };
  }

  /**
   * Map a single ExecutionEvent to a queue item.
   */
  eventCreated(event: ExecutionEvent): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    const record: RunEventRecord = {
      eventId: event.id,
      runId: event.runId,
      type: event.type,
      nodeId: event.nodeId,
      agentId: event.agentId,
      timestamp: event.timestamp,
      payload: event.data ?? {},
    };

    return {
      id: itemId(),
      operation: "event:create",
      payload: record as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map a ContextSnapshot to a queue item.
   */
  snapshotCreated(
    snapshot: ContextSnapshot,
    runId: string,
  ): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    const record: ContextSnapshotRecord = {
      snapshotId: itemId(),
      runId,
      version: snapshot.version,
      agentId: snapshot.agentId,
      writes: snapshot.writes,
      diff: snapshot.diff ?? {},
      timestamp: snapshot.timestamp,
    };

    return {
      id: itemId(),
      operation: "snapshot:create",
      payload: record as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map a node lifecycle update to a queue item.
   */
  nodeUpdated(
    runId: string,
    nodeId: string,
    agentId: string,
    status: string,
    extra?: Record<string, unknown>,
  ): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    const record: Partial<RunNodeRecord> = {
      nodeId,
      runId,
      agentId,
      status: status as RunNodeRecord["status"],
      updatedAt: Date.now(),
      ...extra,
    };

    return {
      id: itemId(),
      operation: "node:update",
      payload: record as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map a route selection to a queue item.
   */
  routeSelected(
    runId: string,
    nodeId: string,
    selectedRoute: string,
    targetNodeId: string,
    conditionResult: unknown,
  ): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    return {
      id: itemId(),
      operation: "event:create",
      payload: {
        runId,
        nodeId,
        eventType: "route_selected",
        data: { selectedRoute, targetNodeId, conditionResult },
        timestamp: Date.now(),
      } as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map a state transition to a queue item.
   */
  stateTransitioned(
    runId: string,
    nodeId: string,
    from: string,
    to: string,
    reason?: string,
  ): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    return {
      id: itemId(),
      operation: "event:create",
      payload: {
        runId,
        nodeId,
        eventType: "state_transition",
        data: { from, to, reason },
        timestamp: Date.now(),
      } as unknown as Record<string, unknown>,
    };
  }

  /**
   * Map a synchronizer event to a queue item.
   */
  synchronizerEvent(
    runId: string,
    nodeId: string,
    eventType: "synchronizer_barrier" | "synchronizer_merged",
    data: Record<string, unknown>,
  ): Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError"> {
    return {
      id: itemId(),
      operation: "event:create",
      payload: {
        runId,
        nodeId,
        eventType,
        data,
        timestamp: Date.now(),
      } as unknown as Record<string, unknown>,
    };
  }
}
