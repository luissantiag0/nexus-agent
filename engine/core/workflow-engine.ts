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
import { ExecutionLoop, type ExecutionLoopConfig } from "./execution-loop";
import { GraphValidator } from "./graph-validator";
import { ExecutionHistory } from "./execution-history";
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
  /** Graph validation options. */
  validation: {
    /** Validate graphs before execution (default: true). */
    validateBeforeExecution: boolean;
    /** Throw on validation errors (default: false — returns error result). */
    throwOnValidationError: boolean;
  };
  /** History tracking options. */
  tracking: {
    /** Track execution history (default: true). */
    trackHistory: boolean;
    /** Maximum history entries to keep in memory (default: 10000). */
    maxHistoryEntries: number;
  };
  /** ExecutionLoop configuration overrides. */
  executionLoop?: Partial<ExecutionLoopConfig>;
}

export const DEFAULT_ENGINE_CONFIG: WorkflowEngineConfig = {
  persistWorkflows: false,
  logExecutions: true,
  workerPool: {
    concurrency: 4,
    maxQueueSize: 1000,
  },
  validation: {
    validateBeforeExecution: true,
    throwOnValidationError: false,
  },
  tracking: {
    trackHistory: true,
    maxHistoryEntries: 10000,
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

    // Execution history tracking
    let executionHistory: ExecutionHistory | null = null;
    if (this.config.tracking.trackHistory) {
      executionHistory = new ExecutionHistory(executionId);
    }

    try {
      let result: ChainResult | GraphResult;

      if (workflow.mode === "chain" && workflow.chain) {
        // Sequential execution (backward compatible)
        const chain = new AgentChain(
          workflow.chain as ChainStep[],
          executionId,
          workflow.errorHandling.failureMode,
        );
        result = await chain.execute(context as unknown as IAgentContext);
      } else if (workflow.mode === "graph" && workflow.graph) {
        // DAG execution (backward compatible)
        const graph = new AgentGraph(
          workflow.graph.nodes as GraphNode[],
          workflow.graph.edges as GraphEdge[],
          executionId,
        );
        result = await graph.execute(context as unknown as IAgentContext);
      } else if (workflow.mode === "execution_graph" && workflow.graph) {
        // ── Full ExecutionLoop with all primitives ────────────────────
        const nodes = workflow.graph.nodes as GraphNode[];
        const edges = workflow.graph.edges as GraphEdge[];

        // Pre-execution validation
        if (this.config.validation.validateBeforeExecution) {
          const validator = new GraphValidator();
          const validation = validator.validate(nodes, edges);
          if (!validation.valid) {
            const errorMsg = validation.errors.map((e) => e.message).join("; ");
            if (this.config.validation.throwOnValidationError) {
              throw new Error(`Graph validation failed: ${errorMsg}`);
            }
            return {
              executionId,
              workflowId,
              status: "failed",
              mode: workflow.mode,
              result: null,
              context: context.snapshot(),
              totalDurationMs: Date.now() - startedAt,
              error: `Graph validation failed: ${errorMsg}`,
              history: executionHistory?.toJSON() ?? null,
            };
          }
        }

        // Create and run execution loop
        const loop = new ExecutionLoop(
          nodes,
          edges,
          {
            validateGraph: false, // Already validated above
            trackHistory: this.config.tracking.trackHistory,
            ...this.config.executionLoop,
          },
          executionId,
        );

        result = await loop.execute(context as unknown as IAgentContext);

        // Capture history from loop
        if (executionHistory) {
          const loopHistory = loop.getHistory();
          if (loopHistory) {
            executionHistory = loopHistory;
          }
        }
      } else {
        throw new Error(`Invalid workflow configuration for '${workflowId}'`);
      }

      const totalDurationMs = Date.now() - startedAt;

      return {
        executionId,
        workflowId,
        status: result.status === "completed" || result.status === "partial" ? "completed" : "failed",
        mode: workflow.mode,
        result,
        context: context.snapshot(),
        totalDurationMs,
        error: result.error,
        history: executionHistory?.toJSON() ?? null,
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
        history: executionHistory?.toJSON() ?? null,
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
    if ((workflow.mode === "graph" || workflow.mode === "execution_graph") && workflow.graph) {
      return workflow.graph.nodes
        .filter((n) => (n as any).type === undefined || (n as any).type === "standard")
        .map((n) => n.agent.metadata.id);
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
  mode: "chain" | "graph" | "execution_graph";
  result: ChainResult | GraphResult | null;
  context: Record<string, unknown>;
  totalDurationMs: number;
  error: string | null;
  /** Execution history snapshot (only populated for execution_graph mode). */
  history?: {
    executionId: string;
    entries: Array<{
      nodeId: string;
      agentId: string;
      state: string;
      startedAt: string;
      completedAt: string | null;
      durationMs: number;
      error: string | null;
      retryCount: number;
      metadata?: Record<string, unknown>;
    }>;
    summary: {
      totalNodes: number;
      completed: number;
      failed: number;
      skipped: number;
      waiting: number;
      running: number;
      pending: number;
      totalDurationMs: number;
      hasErrors: boolean;
    };
  } | null;
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
