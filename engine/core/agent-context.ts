// ============================================================================
// Nexus Agent Platform — AgentContext Implementation
// ============================================================================
// Concrete implementation of the AgentContext interface with type-safe
// state access, snapshot/restore, and runtime diagnostics.
// ============================================================================

import type {
  AgentContext as IAgentContext,
  AgentContextState,
} from "@/engine/types/agent-types";
import type {
  AgentContext as BaseAgentContext,
  AgentId,
  ContextKey,
} from "@/lib/agents/registry/types";

// ============================================================================
// Agent Context State Proxy
// ============================================================================

class AgentContextStateImpl<TState extends Record<string, unknown>>
  implements AgentContextState<TState>
{
  constructor(private readonly store: Map<string, unknown>) {}

  get<K extends keyof TState>(key: K): TState[K] | undefined;
  get<K extends keyof TState>(key: K, defaultValue: TState[K]): TState[K];
  get<K extends keyof TState>(key: K, defaultValue?: TState[K]): TState[K] | undefined {
    const value = this.store.get(key as string);
    return value !== undefined ? (value as TState[K]) : defaultValue;
  }

  set<K extends keyof TState>(key: K, value: TState[K]): void {
    this.store.set(key as string, value);
  }

  has<K extends keyof TState>(key: K): boolean {
    return this.store.has(key as string);
  }

  keys(): Array<keyof TState> {
    return Array.from(this.store.keys()) as Array<keyof TState>;
  }

  entries(): Array<[keyof TState, TState[keyof TState]]> {
    return Array.from(this.store.entries()) as Array<[keyof TState, TState[keyof TState]]>;
  }

  toObject(): TState {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this.store.entries()) {
      obj[key] = value;
    }
    return obj as TState;
  }
}

// ============================================================================
// AgentRuntimeError
// ============================================================================

interface RuntimeErrorEntry {
  agentId: AgentId;
  message: string;
  timestamp: string;
  code?: string;
}

// ============================================================================
// AgentContext Implementation
// ============================================================================

export class NexusAgentContext<TState extends Record<string, unknown> = Record<string, unknown>>
  implements IAgentContext<TState>
{
  readonly state: AgentContextState<TState>;
  readonly raw: BaseAgentContext;
  readonly plan: IAgentContext<TState>["plan"];
  readonly runtime: {
    stepIndex: number;
    errors: RuntimeErrorEntry[];
    warnings: string[];
    metrics: Map<string, number>;
  };

  private readonly rawStore: Map<ContextKey, unknown>;

  constructor(
    planId: string,
    chain: AgentId[],
    initialState: Partial<TState> = {},
    maxSteps: number = 100,
  ) {
    // Initialize the raw key-value store for untyped access
    this.rawStore = new Map<ContextKey, unknown>();

    // Seed initial state
    for (const [key, value] of Object.entries(initialState)) {
      this.rawStore.set(key as ContextKey, value);
    }

    // Create typed state proxy
    this.state = new AgentContextStateImpl<TState>(this.rawStore as Map<string, unknown>);

    // Initialize raw context (implements BaseAgentContext)
    this.raw = {
      state: this.rawStore,
      plan: {
        id: planId,
        chain,
        maxSteps,
      },
      runtime: {
        stepIndex: 0,
        errors: [],
        warnings: [],
      },
      get: <T>(key: ContextKey, defaultValue?: T): T | undefined => {
        const value = this.rawStore.get(key);
        return value !== undefined ? (value as T) : defaultValue;
      },
      set: <T>(key: ContextKey, value: T): void => {
        this.rawStore.set(key, value);
      },
      has: (key: ContextKey): boolean => {
        return this.rawStore.has(key);
      },
    };

    // Initialize plan
    this.plan = {
      id: planId,
      chain,
      maxSteps,
      currentStep: 0,
    };

    // Initialize runtime
    this.runtime = {
      stepIndex: 0,
      errors: [],
      warnings: [],
      metrics: new Map<string, number>(),
    };
  }

  // ========================================================================
  // Snapshot / Restore
  // ========================================================================

  /**
   * Create a serializable snapshot of the current context state.
   */
  snapshot(): TState {
    return this.state.toObject();
  }

  /**
   * Restore context state from a previously taken snapshot.
   */
  restore(state: TState): void {
    this.rawStore.clear();
    for (const [key, value] of Object.entries(state)) {
      this.rawStore.set(key as ContextKey, value);
    }
  }

  // ========================================================================
  // Step Management
  // ========================================================================

  /** Advance to the next step and return the new index. */
  advanceStep(): number {
    this.plan.currentStep++;
    this.runtime.stepIndex = this.plan.currentStep;
    return this.plan.currentStep;
  }

  /** Check if the plan has completed all steps. */
  isComplete(): boolean {
    return this.plan.currentStep >= this.plan.chain.length;
  }

  // ========================================================================
  // Error Tracking
  // ========================================================================

  /** Record an error that occurred during execution. */
  recordError(agentId: AgentId, message: string, code?: string): void {
    this.runtime.errors.push({
      agentId,
      message,
      timestamp: new Date().toISOString(),
      code,
    });
  }

  /** Record a warning. */
  recordWarning(message: string): void {
    this.runtime.warnings.push(message);
  }

  /** Increment a named metric counter. */
  incrementMetric(name: string, value: number = 1): void {
    const current = this.runtime.metrics.get(name) ?? 0;
    this.runtime.metrics.set(name, current + value);
  }

  /** Set a named metric value. */
  setMetric(name: string, value: number): void {
    this.runtime.metrics.set(name, value);
  }

  // ========================================================================
  // Factory Methods
  // ========================================================================

  /**
   * Create a child context derived from this one (for sub-graphs/chains).
   * The child shares the same underlying store but has its own plan.
   */
  createChild(planId: string, chain: AgentId[]): NexusAgentContext<TState> {
    const child = new NexusAgentContext<TState>(planId, chain);
    // Copy existing state to child (shallow copy)
    for (const [key, value] of this.rawStore.entries()) {
      child.rawStore.set(key, value);
    }
    child.runtime.errors.push(...this.runtime.errors);
    child.runtime.warnings.push(...this.runtime.warnings);
    return child;
  }

  /**
   * Create a new context from a serialized snapshot.
   */
  static fromSnapshot<TState extends Record<string, unknown>>(
    snapshot: {
      state: TState;
      plan: { id: string; chain: AgentId[]; maxSteps: number };
      runtime: { stepIndex: number; errors: RuntimeErrorEntry[]; warnings: string[] };
    },
  ): NexusAgentContext<TState> {
    const ctx = new NexusAgentContext<TState>(
      snapshot.plan.id,
      snapshot.plan.chain,
      snapshot.state,
      snapshot.plan.maxSteps,
    );
    ctx.plan.currentStep = snapshot.runtime.stepIndex;
    ctx.runtime.stepIndex = snapshot.runtime.stepIndex;
    ctx.runtime.errors.push(...snapshot.runtime.errors);
    ctx.runtime.warnings.push(...snapshot.runtime.warnings);
    return ctx;
  }
}
