// ============================================================================
// Nexus Agent Platform — Tenant API DTOs
// ============================================================================

export interface ApiError {
  error: string;
  code?: string;
  detail?: string;
  tenantId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface RunDTO {
  id: string;
  runId: string;
  workflowId: string;
  workflowName: string;
  mode: string;
  status: string;
  nodeCount: number;
  edgeCount: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface EventDTO {
  id: string;
  eventId: string;
  type: string;
  nodeId: string | null;
  agentId: string | null;
  sequence: number;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface MetricsDTO {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  activeRuns: number;
  avgDurationMs: number | null;
  totalEvents: number;
  totalNodes: number;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

import type {
  RunEntity,
  EventEntity,
} from "@/lib/supabase/types";

export function toRunDTO(entity: RunEntity): RunDTO {
  return {
    id: entity.id,
    runId: entity.run_id,
    workflowId: entity.workflow_id,
    workflowName: entity.workflow_name,
    mode: entity.mode,
    status: entity.status,
    nodeCount: entity.node_count,
    edgeCount: entity.edge_count,
    startedAt: entity.started_at,
    completedAt: entity.completed_at,
    durationMs: entity.duration_ms,
    error: entity.error,
  };
}

export function toEventDTO(entity: EventEntity): EventDTO {
  return {
    id: entity.id,
    eventId: entity.event_id,
    type: entity.type,
    nodeId: entity.node_id,
    agentId: entity.agent_id,
    sequence: entity.sequence,
    payload: entity.payload,
    timestamp: entity.event_timestamp,
  };
}
