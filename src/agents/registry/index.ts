// ============================================================================
// Agent Registry — Runtime Core Types
// ============================================================================
// The Agent Registry is the central contract that all agent adapters conform to.
// Every agent adapter (support-responder, customer-service, etc.) implements
// the AgentAdapter<I, O, C> interface and registers itself here.
// ============================================================================

// ---------------------------------------------------------------------------
// AgentContext — shared state shape
// ---------------------------------------------------------------------------

export interface AgentContext {
  readonly sessionId: string;
  readonly correlationId: string;
  readonly promptVersion: string;
  readonly [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// AgentAdapter — the canonical contract
// ---------------------------------------------------------------------------

export interface AgentAdapter<I, O, C extends AgentContext> {
  /** Unique agent identifier (kebab-case, matches @mention) */
  readonly agentId: string;

  /** Semantic version of this adapter */
  readonly version: string;

  /** JSON Schema for input validation */
  readonly inputSchema: object;

  /** JSON Schema for output validation */
  readonly outputSchema: object;

  /** Context keys this agent reads/writes in shared state */
  readonly contextKeys: readonly (keyof C & string)[];

  /** Runtime execution entrypoint */
  execute(
    input: I,
    context: C,
  ): Promise<ExecutionResult<O>>;
}

// ---------------------------------------------------------------------------
// ExecutionResult — what every adapter call returns
// ---------------------------------------------------------------------------

export interface ExecutionResult<O> {
  success: boolean;
  data: O | null;
  error?: ExecutionError;
  contextUpdates?: Partial<Record<string, unknown>>;
  metrics: ExecutionMetrics;
}

export interface ExecutionError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  llmTokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// AgentRegistry — central registry of all adapters
// ---------------------------------------------------------------------------

export class AgentRegistry {
  private readonly adapters = new Map<string, AgentAdapter<unknown, unknown, AgentContext>>();

  register<I, O, C extends AgentContext>(adapter: AgentAdapter<I, O, C>): void {
    if (this.adapters.has(adapter.agentId)) {
      throw new Error(`Agent '${adapter.agentId}' already registered`);
    }
    this.adapters.set(adapter.agentId, adapter as AgentAdapter<unknown, unknown, AgentContext>);
  }

  get<I, O, C extends AgentContext>(agentId: string): AgentAdapter<I, O, C> {
    const adapter = this.adapters.get(agentId);
    if (!adapter) {
      throw new Error(`Agent '${agentId}' not found in registry`);
    }
    return adapter as AgentAdapter<I, O, C>;
  }

  has(agentId: string): boolean {
    return this.adapters.has(agentId);
  }

  list(): Array<{ agentId: string; version: string }> {
    return Array.from(this.adapters.values()).map((a) => ({
      agentId: a.agentId,
      version: a.version,
    }));
  }
}

// Singleton
export const agentRegistry = new AgentRegistry();
