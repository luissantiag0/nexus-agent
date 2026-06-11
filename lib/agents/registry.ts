// ============================================================================
// Nexus Agent — Agent Registry
// ============================================================================
// Central registry that manages, discovers, and routes execution to agent
// adapters. Supports single-agent execution, chained execution, and
// multi-agent orchestration.
// ============================================================================

import type {
  AgentAdapter,
  AgentMetadata,
  AgentExecutionRequest,
  AgentExecutionResponse,
  AgentContext,
  ValidationResult,
  AgentStatus,
} from "./types";

/**
 * Error codes returned by the registry.
 */
export enum RegistryErrorCode {
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",
  AGENT_ALREADY_REGISTERED = "AGENT_ALREADY_REGISTERED",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  CHAIN_BREAK = "CHAIN_BREAK",
  CANCELLED = "CANCELLED",
}

export class RegistryError extends Error {
  constructor(
    public readonly code: RegistryErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class AgentRegistry {
  /** Map of agent name → adapter. */
  private readonly adapters = new Map<string, AgentAdapter>();

  private traceCounter = 0;

  // ---- Registration -------------------------------------------------------

  /**
   * Register an agent adapter.
   * @throws RegistryError if an agent with the same name is already registered.
   */
  register(adapter: AgentAdapter): void {
    const name = adapter.metadata.name;
    if (this.adapters.has(name)) {
      throw new RegistryError(
        RegistryErrorCode.AGENT_ALREADY_REGISTERED,
        `Agent "${name}" is already registered.`,
      );
    }
    this.adapters.set(name, adapter);
  }

  /**
   * Unregister an agent by name.
   */
  unregister(name: string): boolean {
    return this.adapters.delete(name);
  }

  /**
   * Check if an agent is registered.
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Get an agent adapter by name.
   */
  get(name: string): AgentAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * List all registered agents with their metadata.
   */
  listAgents(): AgentMetadata[] {
    const result: AgentMetadata[] = [];
    for (const adapter of this.adapters.values()) {
      result.push(adapter.metadata);
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Find agents by capability action.
   */
  findByCapability(action: string): AgentMetadata[] {
    const result: AgentMetadata[] = [];
    for (const adapter of this.adapters.values()) {
      if (adapter.metadata.capabilities.some((c) => c.action === action)) {
        result.push(adapter.metadata);
      }
    }
    return result;
  }

  // ---- Single execution ---------------------------------------------------

  /**
   * Execute a single agent with the given input and optional context.
   *
   * Steps:
   *  1. Look up the agent adapter.
   *  2. Validate the input against the adapter's schema and rules.
   *  3. Execute the adapter.
   *  4. Return the response with merged context.
   */
  async execute<TInput, TOutput>(
    request: AgentExecutionRequest<TInput>,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<TOutput>> {
    const adapter = this.adapters.get(request.agent);
    if (!adapter) {
      throw new RegistryError(
        RegistryErrorCode.AGENT_NOT_FOUND,
        `Agent "${request.agent}" is not registered.`,
        { availableAgents: this.listAgents().map((a) => a.name) },
      );
    }

    // Generate trace ID if not provided.
    const traceId = request.traceId ?? `trace-${++this.traceCounter}-${Date.now()}`;

    // --- Validation ---
    const rawInput = request.input as unknown as Record<string, unknown>;
    const validation: ValidationResult = adapter.validate(rawInput);

    if (!validation.valid) {
      return {
        agent: request.agent,
        status: "rejected_validation" as AgentStatus,
        output: {} as TOutput,
        context: request.context ?? {},
        error: {
          code: RegistryErrorCode.VALIDATION_FAILED,
          message: `Input validation failed with ${validation.errors.length} error(s).`,
          details: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        },
      };
    }

    // --- Execution ---
    const startTime = performance.now();

    try {
      const response = await adapter.execute(
        request.input as never,
        request.context ?? {},
        signal,
      );

      return {
        ...response,
        metrics: {
          ...response.metrics,
          durationMs: performance.now() - startTime,
        },
      } as unknown as AgentExecutionResponse<TOutput>;
    } catch (err) {
      const durationMs = performance.now() - startTime;

      if (err instanceof RegistryError) throw err;

      return {
        agent: request.agent,
        status: "failed" as AgentStatus,
        output: {} as TOutput,
        context: request.context ?? {},
        metrics: { durationMs },
        error: {
          code: RegistryErrorCode.EXECUTION_FAILED,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  // ---- Chained execution --------------------------------------------------

  /**
   * Execute agents in a chain. Each agent's output context is passed as input
   * to the next agent. The chain stops if any agent fails validation or
   * execution.
   *
   * @param chain - Ordered array of agent execution requests.
   * @param initialContext - Starting context shared across all agents.
   * @param signal - Optional AbortSignal.
   * @returns Array of responses, one per agent in chain order.
   */
  async chain(
    chain: AgentExecutionRequest[],
    initialContext?: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<Record<string, unknown>>[]> {
    const responses: AgentExecutionResponse<Record<string, unknown>>[] = [];
    let context: AgentContext = { ...(initialContext ?? {}) };

    for (const request of chain) {
      if (signal?.aborted) {
        throw new RegistryError(
          RegistryErrorCode.CANCELLED,
          "Chain execution was cancelled.",
        );
      }

      const response = await this.execute<Record<string, unknown>, Record<string, unknown>>(
        request as AgentExecutionRequest<Record<string, unknown>>,
        signal,
      );

      // Merge the agent's context writes into the shared context.
      context = { ...context, ...response.context };
      responses.push(response);

      // Break on failure — downstream agents should not run on bad state.
      if (response.status === "failed" || response.status === "rejected_validation") {
        break;
      }
    }

    return responses;
  }

  // ---- Multi-agent orchestration ------------------------------------------

  /**
   * Execute multiple agents in parallel (fan-out) and collect all results.
   * Each agent receives the same initial context but operates independently.
   * Failures are collected per-agent; one failure does not cancel others.
   *
   * @param requests - Array of agent execution requests to run in parallel.
   * @param initialContext - Starting context for each agent.
   * @param signal - Optional AbortSignal.
   */
  async fanOut(
    requests: AgentExecutionRequest[],
    initialContext?: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<Record<string, unknown>>[]> {
    const context = { ...(initialContext ?? {}) };
    const tasks = requests.map((request) =>
      this.execute<Record<string, unknown>, Record<string, unknown>>(
        { ...request, context: { ...context, ...request.context } } as AgentExecutionRequest<Record<string, unknown>>,
        signal,
      ),
    );

    return Promise.all(tasks);
  }

  /**
   * Execute agents in a directed acyclic graph (DAG) style.
   * Each phase runs in parallel; the next phase waits for all agents in the
   * current phase to complete and receives their merged context.
   *
   * @param phases - Ordered array of phases. Each phase is an array of agent
   *                 execution requests that run in parallel. The context
   *                 accumulates across phases.
   * @param initialContext - Starting context.
   * @param signal - Optional AbortSignal.
   */
  async dag(
    phases: AgentExecutionRequest[][],
    initialContext?: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse[]> {
    const allResponses: AgentExecutionResponse[] = [];
    let context: AgentContext = { ...(initialContext ?? {}) };

    for (const phase of phases) {
      if (signal?.aborted) {
        throw new RegistryError(
          RegistryErrorCode.CANCELLED,
          "DAG execution was cancelled.",
        );
      }

      const phaseResponses = await this.fanOut(
        phase.map((req) => ({
          ...req,
          context: { ...context, ...req.context },
        })),
        context,
        signal,
      );

      // Merge all context updates from this phase.
      for (const response of phaseResponses) {
        context = { ...context, ...response.context };
      }

      allResponses.push(...phaseResponses);
    }

    return allResponses;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: AgentRegistry | null = null;

/**
 * Get or create the global AgentRegistry singleton.
 */
export function getRegistry(): AgentRegistry {
  if (!_instance) {
    _instance = new AgentRegistry();
  }
  return _instance;
}

/**
 * Reset the registry singleton (useful for testing / hot-reload).
 */
export function resetRegistry(): void {
  _instance = null;
}
