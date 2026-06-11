// ============================================================================
// Nexus Agent Platform — Execution Log Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExecutionLogEntity,
  AgentExecutionStatus,
  QueryOptions,
} from "@/engine/types/supabase-types";
import { BaseRepository } from "./base.repository";

export class ExecutionLogRepository extends BaseRepository<ExecutionLogEntity> {
  constructor(client: SupabaseClient) {
    super(client, "execution_logs", null); // Never delete execution logs
  }

  /**
   * Find logs for a specific execution.
   */
  async findByExecutionId(executionId: string): Promise<ExecutionLogEntity[]> {
    return this.find({ execution_id: executionId } as Partial<ExecutionLogEntity>, {
      orderBy: { column: "started_at", ascending: true },
    });
  }

  /**
   * Find logs for a specific agent.
   */
  async findByAgentId(
    agentId: string,
    options?: QueryOptions,
  ): Promise<ExecutionLogEntity[]> {
    return this.find({ agent_id: agentId } as Partial<ExecutionLogEntity>, {
      orderBy: { column: "started_at", ascending: false },
      ...options,
    });
  }

  /**
   * Find logs for a specific workflow.
   */
  async findByWorkflowId(
    workflowId: string,
    options?: QueryOptions,
  ): Promise<ExecutionLogEntity[]> {
    return this.find({ workflow_id: workflowId } as Partial<ExecutionLogEntity>, {
      orderBy: { column: "started_at", ascending: false },
      ...options,
    });
  }

  /**
   * Find logs by status.
   */
  async findByStatus(status: AgentExecutionStatus): Promise<ExecutionLogEntity[]> {
    return this.find({ status } as Partial<ExecutionLogEntity>, {
      orderBy: { column: "started_at", ascending: false },
    });
  }

  /**
   * Get recent failed executions.
   */
  async findRecentFailures(limit: number = 10): Promise<ExecutionLogEntity[]> {
    return this.find(
      { status: "failed" as AgentExecutionStatus } as Partial<ExecutionLogEntity>,
      { limit, orderBy: { column: "started_at", ascending: false } },
    );
  }

  /**
   * Get execution statistics for an agent.
   */
  async getAgentStats(agentId: string): Promise<AgentExecutionStats> {
    const allLogs = await this.findByAgentId(agentId);
    const completed = allLogs.filter((l) => l.status === "completed");
    const failed = allLogs.filter((l) => l.status === "failed");

    const avgDuration = completed.length > 0
      ? completed.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / completed.length
      : 0;

    return {
      totalExecutions: allLogs.length,
      completed: completed.length,
      failed: failed.length,
      avgDurationMs: avgDuration,
      lastExecution: allLogs[0]?.started_at ?? null,
    };
  }
}

export interface AgentExecutionStats {
  totalExecutions: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  lastExecution: string | null;
}
