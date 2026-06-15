import type { SubscriptionEvent } from "./supabase-realtime-client";
import type { ExecutionEvent } from "@/lib/execution-events/types";
import { ExecutionEventType } from "@/lib/execution-events/types";
import { executionEventStream } from "@/lib/execution-events/stream";
import { executionStore } from "@/lib/execution-events/store";

function mapToExecutionEvent(subEvent: SubscriptionEvent): ExecutionEvent | null {
  const base = {
    id: subEvent.data.id as string ?? crypto.randomUUID(),
    runId: subEvent.runId,
    timestamp: Date.parse(subEvent.data.created_at as string) || Date.now(),
    data: subEvent.data as Record<string, unknown>,
  };

  switch (subEvent.table) {
    case "run_events":
      return {
        ...base,
        type: (subEvent.data.event_type as ExecutionEventType) ?? ExecutionEventType.STATE_TRANSITION,
        nodeId: subEvent.data.node_id as string,
        agentId: subEvent.data.agent_id as string,
      };
    case "run_nodes":
      return {
        ...base,
        type: mapNodeEventType(subEvent),
        nodeId: subEvent.nodeId,
        agentId: subEvent.data.agent_id as string,
      };
    case "runs":
      return {
        ...base,
        type: mapRunEventType(subEvent),
      };
    default:
      return null;
  }
}

function mapNodeEventType(ev: SubscriptionEvent & { table: "run_nodes" }): ExecutionEventType {
  const status = ev.data.status as string;
  if (status === "running") return ExecutionEventType.NODE_STARTED;
  if (status === "completed") return ExecutionEventType.NODE_COMPLETED;
  if (status === "failed") return ExecutionEventType.NODE_FAILED;
  if (status === "skipped") return ExecutionEventType.NODE_SKIPPED;
  return ExecutionEventType.STATE_TRANSITION;
}

function mapRunEventType(ev: SubscriptionEvent & { table: "runs" }): ExecutionEventType {
  const status = ev.data.status as string;
  if (status === "completed") return ExecutionEventType.EXECUTION_COMPLETED;
  if (status === "failed") return ExecutionEventType.EXECUTION_FAILED;
  return ExecutionEventType.RUN_INITIALIZED;
}

export function bridgeRealtimeEvent(subEvent: SubscriptionEvent): void {
  const execEvent = mapToExecutionEvent(subEvent);
  if (!execEvent) return;

  executionStore.appendEvent(execEvent.runId, execEvent);
  executionEventStream.publish(execEvent);
}
