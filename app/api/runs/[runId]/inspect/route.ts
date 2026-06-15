import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";
import type { ExecutionEvent } from "@/lib/execution-events/types";
import { ExecutionEventType } from "@/lib/execution-events/types";

export const dynamic = "force-dynamic";

interface RetryHistoryEntry {
  attempt: number;
  timestamp: number;
  error?: string;
  backoffMs?: number;
}

interface NodeInspection {
  nodeId: string;
  agentId: string;
  label: string;
  status: string;
  level: number;
  /** All events for this node, in chronological order */
  events: ExecutionEvent[];
  /** Input data passed to the node (first CONTEXT_UPDATED or NODE_STARTED data) */
  inputData?: Record<string, unknown>;
  /** Output data produced by the node (NODE_COMPLETED data) */
  outputData?: Record<string, unknown>;
  /** Diff between input and output */
  inputOutputDiff?: Record<string, { before?: unknown; after?: unknown }>;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
  /** Structured retry history */
  retryHistory: RetryHistoryEntry[];
  /** Context keys written by this node */
  contextImpact: string[];
}

interface InspectResponse {
  runId: string;
  workflowId: string;
  status: string;
  totalNodes: number;
  totalEvents: number;
  nodes: NodeInspection[];
}

export async function GET(
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

    const queryNodeId = _request.nextUrl.searchParams.get("nodeId");

    const nodes: NodeInspection[] = run.nodes.map((node) => {
      const nodeEvents = run.events.filter((e) => e.nodeId === node.nodeId);
      const filteredEvents = queryNodeId && queryNodeId !== node.nodeId ? [] : nodeEvents;

      // Extract input/output from events
      const startedEvent = nodeEvents.find((e) => e.type === ExecutionEventType.NODE_STARTED);
      const completedEvent = nodeEvents.find((e) => e.type === ExecutionEventType.NODE_COMPLETED);
      const failedEvent = nodeEvents.find((e) => e.type === ExecutionEventType.NODE_FAILED);
      const errorEvent = failedEvent ?? nodeEvents.find((e) => e.type === ExecutionEventType.NODE_FAILED);
      const retryEvents = nodeEvents
        .filter((e) => e.type === ExecutionEventType.NODE_RETRYING)
        .map((e, i) => ({
          attempt: (e.data?.attempt as number) ?? i + 1,
          timestamp: e.timestamp,
          error: e.data?.error as string | undefined,
          backoffMs: e.data?.backoffMs as number | undefined,
        }));

      // Input data = context keys read before exec started
      const inputData = startedEvent?.data as Record<string, unknown> | undefined;
      // Output data = result from completion
      const outputData = completedEvent?.data as Record<string, unknown> | undefined;

      // Compute diff
      const inputOutputDiff: Record<string, { before?: unknown; after?: unknown }> = {};
      if (inputData && outputData) {
        const allKeys = new Set([...Object.keys(inputData), ...Object.keys(outputData)]);
        for (const key of allKeys) {
          const before = inputData[key];
          const after = outputData[key];
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            inputOutputDiff[key] = { before, after };
          }
        }
      }

      let status = "pending";
      if (nodeEvents.some((e) => e.type === ExecutionEventType.NODE_COMPLETED)) status = "completed";
      else if (nodeEvents.some((e) => e.type === ExecutionEventType.NODE_FAILED)) status = "failed";
      else if (nodeEvents.some((e) => e.type === ExecutionEventType.NODE_SKIPPED)) status = "skipped";
      else if (nodeEvents.some((e) => e.type === ExecutionEventType.NODE_STARTED)) status = "running";

      const contextEvents = run.contextSnapshots
        .filter((s) => s.agentId === node.agentId)
        .flatMap((s) => Object.keys(s.writes));

      const nodeLevel = run.edges.reduce((max, edge) => {
        if (edge.to === node.nodeId) return Math.max(max, (run.edges.filter((e) => e.to === edge.to).length));
        return max;
      }, 0);

      return {
        nodeId: node.nodeId,
        agentId: node.agentId,
        label: node.description ?? node.agentId,
        status,
        level: nodeLevel,
        events: filteredEvents,
        inputData: inputData && Object.keys(inputData).length > 0 ? inputData : undefined,
        outputData: outputData && Object.keys(outputData).length > 0 ? outputData : undefined,
        inputOutputDiff: Object.keys(inputOutputDiff).length > 0 ? inputOutputDiff : undefined,
        startedAt: startedEvent?.timestamp,
        completedAt: completedEvent?.timestamp ?? failedEvent?.timestamp,
        durationMs: startedEvent && (completedEvent ?? failedEvent)
          ? ((completedEvent ?? failedEvent)!.timestamp - startedEvent.timestamp) : undefined,
        error: errorEvent?.data?.error as string | undefined,
        retryHistory: retryEvents,
        contextImpact: [...new Set(contextEvents)],
      } satisfies NodeInspection;
    });

    return NextResponse.json({
      runId: run.runId,
      workflowId: run.workflowId,
      status: run.status,
      totalNodes: nodes.length,
      totalEvents: run.events.length,
      nodes,
    } satisfies InspectResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[GET /api/runs/:runId/inspect] ${message}`);
    return NextResponse.json({ error: "Failed to inspect run", detail: message }, { status: 500 });
  }
}
