import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";
import { executionEventStream } from "@/lib/execution-events/stream";
import { ExecutionEventType } from "@/lib/execution-events/types";
import type { ExecutionEvent } from "@/lib/execution-events/types";

export const dynamic = "force-dynamic";

type ControlAction = "pause" | "resume" | "cancel" | "step";

const VALID_ACTIONS: ControlAction[] = ["pause", "resume", "cancel", "step"];
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function eventId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

function emitEvent(runId: string, type: ExecutionEventType, data: Record<string, unknown>): void {
  const event: ExecutionEvent = {
    id: eventId(),
    runId,
    type,
    timestamp: Date.now(),
    data,
  };
  executionStore.appendEvent(runId, event);
  executionEventStream.publish(event);
}

function skipPendingNodes(runId: string, reason: string): void {
  const run = executionStore.getRun(runId);
  if (!run) return;

  // Determine which nodes were not executed (pending or never started)
  const startedNodes = new Set<string>(
    run.events.filter((e) => e.type === ExecutionEventType.NODE_STARTED).map((e) => e.nodeId),
  );
  const completedNodes = new Set<string>(
    run.events
      .filter((e) => [ExecutionEventType.NODE_COMPLETED, ExecutionEventType.NODE_FAILED, ExecutionEventType.NODE_SKIPPED].includes(e.type))
      .map((e) => e.nodeId),
  );

  for (const node of run.nodes) {
    if (!startedNodes.has(node.nodeId) && !completedNodes.has(node.nodeId)) {
      emitEvent(runId, ExecutionEventType.NODE_SKIPPED, {
        nodeId: node.nodeId,
        agentId: node.agentId,
        reason,
        skippedAt: Date.now(),
      });
    }
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    if (!runId || runId.trim().length === 0) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    const run = executionStore.getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found", code: "RUN_NOT_FOUND" }, { status: 404 });
    }

    if (TERMINAL_STATUSES.has(run.status)) {
      return NextResponse.json(
        { error: `Run already in terminal status: ${run.status}`, code: "RUN_TERMINATED" },
        { status: 409 },
      );
    }

    const body = await _request.json().catch(() => ({})) as { action?: string; reason?: string };
    const action = body.action as ControlAction;
    const reason = body.reason;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    switch (action) {
      case "pause": {
        // Idempotent: already paused is a no-op
        if (run.status === "paused") {
          return NextResponse.json({ status: "paused", runId, idempotent: true });
        }
        // Cannot pause a failed run through normal flow
        if (run.status === "failed") {
          return NextResponse.json(
            { error: "Cannot pause a failed run", code: "RUN_FAILED" },
            { status: 409 },
          );
        }
        executionStore.updateRun(runId, { status: "paused" });
        emitEvent(runId, ExecutionEventType.RUN_PAUSED, {
          reason: reason ?? "User requested",
          pausedAt: Date.now(),
        });
        return NextResponse.json({ status: "paused", runId });
      }

      case "resume": {
        // Idempotent: already running is a no-op
        if (run.status === "running") {
          return NextResponse.json({ status: "running", runId, idempotent: true });
        }
        // Cannot resume a failed run — it's non-recoverable without restart
        if (run.status === "failed") {
          return NextResponse.json(
            { error: "Cannot resume a failed run. The run has terminated with errors and is non-recoverable.", code: "RUN_FAILED_NON_RECOVERABLE" },
            { status: 409 },
          );
        }
        // Only paused runs can be resumed
        if (run.status !== "paused") {
          return NextResponse.json(
            { error: `Cannot resume a run in status "${run.status}". Only paused runs can be resumed.`, code: "INVALID_STATE_TRANSITION" },
            { status: 409 },
          );
        }
        executionStore.updateRun(runId, { status: "running" });
        emitEvent(runId, ExecutionEventType.RUN_RESUMED, { resumedAt: Date.now() });
        return NextResponse.json({ status: "running", runId });
      }

      case "cancel": {
        // Idempotent: already cancelled skip
        if (run.status === "cancelled") {
          return NextResponse.json({ status: "cancelled", runId, idempotent: true });
        }
        const now = Date.now();
        executionStore.updateRun(runId, {
          status: "cancelled",
          completedAt: now,
          durationMs: now - run.startedAt,
        });
        // Propagate SKIP to all pending (never started) downstream nodes
        skipPendingNodes(runId, reason ?? "Run cancelled by user");
        emitEvent(runId, ExecutionEventType.RUN_CANCELLED, {
          reason: reason ?? "User requested",
          cancelledAt: now,
        });
        return NextResponse.json({ status: "cancelled", runId });
      }

      case "step": {
        // Step is idempotent — each call advances by one event emission
        emitEvent(runId, ExecutionEventType.STATE_TRANSITION, {
          action: "step",
          reason: reason ?? "Manual step",
          steppedAt: Date.now(),
        });
        return NextResponse.json({ status: run.status, runId, stepped: true });
      }

      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[POST /api/runs/:runId/control] ${message}`);
    return NextResponse.json({ error: "Failed to control run", detail: message }, { status: 500 });
  }
}
