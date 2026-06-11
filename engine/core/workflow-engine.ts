// ============================================================================
// Nexus Agent Platform — WorkflowEngine Implementation
// ============================================================================
// Top-level orchestration engine that executes WorkflowDefinitions.
// Routes to either AgentChain (sequential) or AgentGraph (DAG) execution
// based on the workflow mode. Integrates with queue, cache, and database.
// ============================================================================

import type {
  WorkflowDefinition,
  ChainStep,
  GraphNode,
  GraphEdge,
  ChainResult,
  GraphResult,
  AgentContext,
  AgentContext as IAgentContext,
} from "@/engine/types/agent-types";
import type { AgentId } from "@/lib/agents/registry/types";
import { NexusAgentContext } from "./agent-context";
import { AgentChain } from "./agent-chain";
import { AgentGraph } from "./agent-graph";
import { InProcessWorkerPool } from "./worker-pool";
import { v4 as uuid } from "uuid";

// ============================================================================
// Workflow Engine Configuration
// ============================================================================

export interface WorkflowEngineConfig {
  /** Enable workflow persistence to database. */
  persistWorkflows: boolean;
  /** Enable execution logging. */
  logExecutions: boolean;
  /** Worker pool configuration. */
  workerPool: {
    concurrency: number;
    maxQueueSize: number;
  };
}

export const DEFAULT_ENGINE_CONFIG: WorkflowEngineConfig = {
  persistWorkflows: false,
  logExecutions: true,
  workerPool: {
    concurrency: 4,
    maxQueueSize: 1000,
  },
};

// ============================================================================
// Workflow Engine
// ============================================================================

export class WorkflowEngine {
  private readonly config: WorkflowEngineConfig;
  private readonly workerPool: InProcessWorkerPool;
  private readonly workflows = new Map<string, WorkflowDefinition>();

  constructor(config: Partial<WorkflowEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.workerPool = new InProcessWorkerPool({
      concurrency: this.config.workerPool.concurrency,
      maxQueueSize: this.config.workerPool.maxQueueSize,
    });

    this.setupWorkerPoolListeners();
  }

  // ========================================================================
  // Workflow Lifecycle
  // ========================================================================

  /**
   * Register a workflow definition for execution.
   */
  register(workflow: WorkflowDefinition): void {
    if (this.workflows.has(workflow.id)) {
      throw new Error(`Workflow '${workflow.id}' is already registered`);
    }
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Unregister a workflow.
   */
  unregister(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  /**
   * Get a registered workflow.
   */
  get(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all registered workflows.
   */
  list(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // ========================================================================
  // Execution
  // ========================================================================

  /**
   * Execute a workflow by its ID with an optional initial context.
   */
  async execute(
    workflowId: string,
    initialContext: Record<string, unknown> = {},
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    const executionId = uuid();
    const startedAt = Date.now();

    const context = new NexusAgentContext(
      executionId,
      this.extractAgentIds(workflow),
      initialContext,
      workflow.chain?.length ?? workflow.graph?.nodes.length ?? 0,
    );

    try {
      let result: ChainResult | GraphResult;

      if (workflow.mode === "chain" && workflow.chain) {
        // Sequential execution
        const chain = new AgentChain(
          workflow.chain as ChainStep[],
          executionId,
          workflow.errorHandling.failureMode,
        );
        result = await chain.execute(context as unknown as IAgentContext);
      } else if (workflow.mode === "graph" && workflow.graph) {
        // DAG execution
        const graph = new AgentGraph(
          workflow.graph.nodes as GraphNode[],
          workflow.graph.edges as GraphEdge[],
          executionId,
        );
        result = await graph.execute(context as unknown as IAgentContext);
      } else {
        throw new Error(`Invalid workflow configuration for '${workflowId}'`);
      }

      const totalDurationMs = Date.now() - startedAt;

      return {
        executionId,
        workflowId,
        status: result.status === "completed" ? "completed" : "failed",
        mode: workflow.mode,
        result,
        context: context.snapshot(),
        totalDurationMs,
        error: result.error,
      };
    } catch (error) {
      return {
        executionId,
        workflowId,
        status: "failed",
        mode: workflow.mode,
        result: null,
        context: context.snapshot(),
        totalDurationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a workflow and return a promise that resolves when the
   * workflow has been queued (for async execution patterns).
   */
  async executeAsync(
    workflowId: string,
    initialContext: Record<string, unknown> = {},
  ): Promise<{ executionId: string }> {
    const executionId = uuid();

    // Queue the execution to the worker pool
    // (In production, this would go to Bull/RabbitMQ)
    setImmediate(() => {
      this.execute(workflowId, initialContext).catch((err) => {
        console.error(`Async workflow ${workflowId} failed:`, err);
      });
    });

    return { executionId };
  }

  // ========================================================================
  // Health
  // ========================================================================

  health(): EngineHealth {
    const poolStats = this.workerPool.getStats();
    return {
      status: poolStats.utilization < 0.95 ? "healthy" : "degraded",
      registeredWorkflows: this.workflows.size,
      workerPool: poolStats,
      uptime: process.uptime(),
    };
  }

  /**
   * Graceful shutdown.
   */
  async shutdown(): Promise<void> {
    await this.workerPool.shutdown();
  }

  // ========================================================================
  // Private
  // ========================================================================

  private extractAgentIds(workflow: WorkflowDefinition): AgentId[] {
    if (workflow.mode === "chain" && workflow.chain) {
      return workflow.chain.map((s) => s.agent.metadata.id);
    }
    if (workflow.mode === "graph" && workflow.graph) {
      return workflow.graph.nodes.map((n) => n.agent.metadata.id);
    }
    return [];
  }

  private setupWorkerPoolListeners(): void {
    this.workerPool.on("task:completed", (task, result) => {
      if (this.config.logExecutions) {
        // In production: persist to database
      }
    });

    this.workerPool.on("task:failed", (task, error) => {
      if (this.config.logExecutions) {
        // In production: persist to database
      }
    });
  }
}

// ============================================================================
// Types
// ============================================================================

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "completed" | "failed" | "running";
  mode: "chain" | "graph";
  result: ChainResult | GraphResult | null;
  context: Record<string, unknown>;
  totalDurationMs: number;
  error: string | null;
}

export interface EngineHealth {
  status: "healthy" | "degraded" | "unhealthy";
  registeredWorkflows: number;
  workerPool: {
    activeWorkers: number;
    totalWorkers: number;
    queueLength: number;
    maxQueueSize: number;
    utilization: number;
  };
  uptime: number;
}
