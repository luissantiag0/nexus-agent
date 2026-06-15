import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";
import { ExecutionEventType } from "@/lib/execution-events/types";
import type { ExecutionEvent, ContextSnapshot } from "@/lib/execution-events/types";

export const dynamic = "force-dynamic";

/** Per-node status at a given frame */
interface NodeStatusInFrame {
  nodeId: string;
  agentId: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  level: number;
}

/** Context state key-value at a given frame */
interface ContextStateEntry {
  value: unknown;
  sourceAgent: string;
}

interface ReplayFrameResponse {
  timestamp: number;
  /** Per-node DAG state */
  nodeStates: NodeStatusInFrame[];
  /** Active (running) node IDs */
  activeNodes: string[];
  /** Completed node IDs */
  completedNodes: string[];
  /** Failed node IDs */
  failedNodes: string[];
  /** Skipped node IDs */
  skippedNodes: string[];
  /** Full resolved context snapshot at this point */
  contextSnapshot: Record<string, ContextStateEntry>;
  /** All events batched at this timestamp */
  eventBatch: Array<{
    id: string;
    type: string;
    nodeId?: string;
    agentId?: string;
    timestamp: number;
    data?: Record<string, unknown>;
  }>;
}

interface ReplayResponse {
  runId: string;
  workflowId: string;
  totalFrames: number;
  totalDuration: number;
  startedAt: number;
  completedAt?: number;
  status: string;
  nodeCount: number;
  frames: ReplayFrameResponse[];
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

    const sorted = [...run.events].sort((a, b) => a.timestamp - b.timestamp);
    const totalDuration = sorted.length > 1 ? sorted[sorted.length - 1].timestamp - sorted[0].timestamp : 0;

    // Batch events by timestamp
    const timestampGroups = new Map<number, ExecutionEvent[]>();
    for (const ev of sorted) {
      const group = timestampGroups.get(ev.timestamp) ?? [];
      group.push(ev);
      timestampGroups.set(ev.timestamp, group);
    }
    const sortedTimestamps = [...timestampGroups.keys()].sort((a, b) => a - b);

    // Build node lookup for metadata
    const nodeMeta = new Map(run.nodes.map((n) => [n.nodeId, { agentId: n.agentId, description: n.description, level: 0 }]));
    const nodeLevels = new Map<string, number>();
    for (const edge of run.edges) {
      const toLevel = (nodeLevels.get(edge.to) ?? 0);
      const fromLevel = (nodeLevels.get(edge.from) ?? 0);
      nodeLevels.set(edge.to, Math.max(toLevel, fromLevel + 1));
    }

    let activeNodes = new Set<string>();
    let completedNodes = new Set<string>();
    let failedNodes = new Set<string>();
    let skippedNodes = new Set<string>();
    let contextState = new Map<string, { value: unknown; sourceAgent: string }>();

    const frames: ReplayFrameResponse[] = sortedTimestamps.map((timestamp) => {
      const batch = timestampGroups.get(timestamp)!;

      for (const event of batch) {
        const nodeId = event.nodeId;
        switch (event.type) {
          case ExecutionEventType.NODE_STARTED:
            if (nodeId) activeNodes.add(nodeId);
            break;
          case ExecutionEventType.NODE_COMPLETED:
            if (nodeId) { activeNodes.delete(nodeId); completedNodes.add(nodeId); }
            break;
          case ExecutionEventType.NODE_FAILED:
            if (nodeId) { activeNodes.delete(nodeId); failedNodes.add(nodeId); }
            break;
          case ExecutionEventType.NODE_SKIPPED:
            if (nodeId) skippedNodes.add(nodeId);
            break;
          case ExecutionEventType.CONTEXT_UPDATED:
            if (event.agentId && event.data?.writeKeys) {
              const keys = event.data.writeKeys as string[];
              for (const key of keys) {
                contextState.set(key, { value: event.data[`write_${key}`] ?? null, sourceAgent: event.agentId });
              }
            }
            break;
        }
      }

      // Build per-node status for all nodes
      const nodeStates: NodeStatusInFrame[] = run.nodes.map((n) => {
        let status: NodeStatusInFrame["status"] = "pending";
        if (activeNodes.has(n.nodeId)) status = "running";
        else if (completedNodes.has(n.nodeId)) status = "completed";
        else if (failedNodes.has(n.nodeId)) status = "failed";
        else if (skippedNodes.has(n.nodeId)) status = "skipped";
        return {
          nodeId: n.nodeId,
          agentId: n.agentId,
          label: n.description ?? n.agentId,
          status,
          level: nodeLevels.get(n.nodeId) ?? 0,
        };
      });

      const resolvedContext: Record<string, { value: unknown; sourceAgent: string }> = {};
      for (const [key, val] of contextState) resolvedContext[key] = val;

      return {
        timestamp,
        nodeStates,
        activeNodes: [...activeNodes],
        completedNodes: [...completedNodes],
        failedNodes: [...failedNodes],
        skippedNodes: [...skippedNodes],
        contextSnapshot: resolvedContext,
        eventBatch: batch.map((ev) => ({
          id: ev.id,
          type: ev.type,
          nodeId: ev.nodeId,
          agentId: ev.agentId,
          timestamp: ev.timestamp,
          data: ev.data,
        })),
      };
    });

    return NextResponse.json({
      runId: run.runId,
      workflowId: run.workflowId,
      totalFrames: frames.length,
      totalDuration,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      status: run.status,
      nodeCount: run.nodes.length,
      frames,
    } satisfies ReplayResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[GET /api/runs/:runId/replay] ${message}`);
    return NextResponse.json({ error: "Failed to build replay data", detail: message }, { status: 500 });
  }
}
