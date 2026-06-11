// ============================================================================
// Nexus Agent Platform — API Layer Types
// ============================================================================

import type { AgentResult, ChainResult, GraphResult, WorkflowDefinition } from "./agent-types";
import type { ExecutionLogEntity } from "./supabase-types";

// ============================================================================
// Standard API Response Envelope
// ============================================================================

export interface ApiResponse<TData = unknown> {
  success: boolean;
  data: TData | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only included in development mode
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  version: string;
  durationMs: number;
  pagination?: ApiPagination;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================================
// Agent Endpoints
// ============================================================================

export interface ExecuteAgentRequest {
  agentId: string;
  input: Record<string, unknown>;
  correlationId?: string;
  options?: {
    timeoutMs?: number;
    maxRetries?: number;
    contextOverrides?: Record<string, unknown>;
  };
}

export interface ExecuteAgentResponse {
  executionId: string;
  agentId: string;
  result: AgentResult;
}

export interface ListAgentsQuery {
  tags?: string[];
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Workflow Endpoints
// ============================================================================

export interface CreateWorkflowRequest {
  name: string;
  version: string;
  description: string;
  mode: "chain" | "graph";
  definition: Omit<WorkflowDefinition, "id" | "name" | "version" | "description">;
  tags?: string[];
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  input?: Record<string, unknown>;
  correlationId?: string;
  options?: {
    timeoutMs?: number;
    contextOverrides?: Record<string, unknown>;
  };
}

export interface ExecuteWorkflowResponse {
  executionId: string;
  workflowId: string;
  status: "running" | "completed" | "failed";
  result: ChainResult | GraphResult | null;
}

// ============================================================================
// Execution Endpoints
// ============================================================================

export interface GetExecutionLogsQuery {
  workflowId?: string;
  agentId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// gRPC Service Definitions (mirrors REST)
// ============================================================================

/**
 * gRPC service method descriptors for the Nexus service.
 * These correspond to the nexus.proto definitions.
 */
export const GRPC_SERVICE_DEFINITIONS = {
  AgentService: {
    executeAgent: { path: "/nexus.AgentService/ExecuteAgent" },
    getAgent: { path: "/nexus.AgentService/GetAgent" },
    listAgents: { path: "/nexus.AgentService/ListAgents" },
    getAgentHealth: { path: "/nexus.AgentService/GetAgentHealth" },
  },
  WorkflowService: {
    createWorkflow: { path: "/nexus.WorkflowService/CreateWorkflow" },
    getWorkflow: { path: "/nexus.WorkflowService/GetWorkflow" },
    listWorkflows: { path: "/nexus.WorkflowService/ListWorkflows" },
    executeWorkflow: { path: "/nexus.WorkflowService/ExecuteWorkflow" },
    getExecutionLogs: { path: "/nexus.WorkflowService/GetExecutionLogs" },
  },
} as const;
