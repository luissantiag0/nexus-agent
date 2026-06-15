// ============================================================================
// Nexus Agent Platform — Engine Core Types
// ============================================================================
// Extends the base registry types from lib/agents/registry/types.ts with
// engine-specific runtime types for AgentRunner, AgentChain, AgentGraph, etc.

import type {
  AgentAdapter,
  AgentInput as BaseAgentInput,
  AgentOutput as BaseAgentOutput,
  AgentContext as BaseAgentContext,
  AgentMetadata,
  AgentId,
  ContextKey,
  ValidationResult,
} from "@/lib/agents/registry/types";

// ============================================================================
// AgentResult — Wraps execution output with status, timing, and diagnostics
// ============================================================================

export type AgentStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "timed_out"
  | "circuit_broken"
  | "waiting";

export interface AgentResult<TData = unknown> {
  /** Unique execution ID for this invocation. */
  executionId: string;
  /** The agent that produced this result. */
  agentId: AgentId;
  /** Final execution status. */
  status: AgentStatus;
  /** The typed output payload on success. */
  data: TData | null;
  /** Human-readable error message if failed. */
  error: string | null;
  /** Stack trace or structured error details. */
  errorDetails: Record<string, unknown> | null;
  /** Validation results after execution. */
  validation: ValidationResult | null;
  /** Timing and resource consumption. */
  performance: {
    startedAt: string;      // ISO-8601
    completedAt: string;    // ISO-8601
    durationMs: number;
    tokensUsed?: number;
    retryCount: number;
  };
  /** Ephemeral metadata for telemetry. */
  meta: Record<string, unknown>;
}

// ============================================================================
// AgentInput<TSchema> — Extended with validation
// ============================================================================

/**
 * Extended agent input that carries payload validation state.
 */
export interface ValidatedAgentInput<TBody = Record<string, unknown>> extends BaseAgentInput<TBody> {
  /** Pre-execution validation result. */
  validation: ValidationResult;
}

// ============================================================================
// AgentOutput<TSchema> — Extended with result metadata
// ============================================================================

/**
 * Extended agent output with execution provenance.
 */
export interface TrackedAgentOutput<TBody = Record<string, unknown>> extends BaseAgentOutput<TBody> {
  /** Link back to the execution. */
  executionId: string;
  /** Agent adapter version that produced this output. */
  adapterVersion: string;
}

// ============================================================================
// AgentContext<TState> — Generic state-typed execution context
// ============================================================================

/**
 * A typed execution context that carries shared state across agents
 * in a chain or graph. The generic TState parameter provides type-safe
 * access to known context keys.
 */
export interface AgentContext<TState extends Record<string, unknown> = Record<string, unknown>>
  extends Omit<BaseAgentContext, "get" | "set" | "has"> {

  /** Typed state proxy — provides type-safe get/set for known keys. */
  readonly state: AgentContextState<TState>;

  /** Raw key-value store (for dynamic/untyped access). */
  readonly raw: BaseAgentContext;

  /** Execution plan metadata. */
  readonly plan: {
    id: string;
    chain: AgentId[];
    maxSteps: number;
    currentStep: number;
  };

  /** Runtime diagnostics. */
  readonly runtime: {
    stepIndex: number;
    errors: Array<{ agentId: AgentId; message: string; timestamp: string; code?: string }>;
    warnings: string[];
    metrics: Map<string, number>;
  };

  /** Snapshot the current context state for persistence. */
  snapshot(): TState;

  /** Restore context state from a snapshot. */
  restore(state: TState): void;
}

/**
 * Type-safe state accessor proxy.
 */
export interface AgentContextState<TState extends Record<string, unknown>> {
  get<K extends keyof TState>(key: K): TState[K] | undefined;
  get<K extends keyof TState>(key: K, defaultValue: TState[K]): TState[K];
  set<K extends keyof TState>(key: K, value: TState[K]): void;
  has<K extends keyof TState>(key: K): boolean;
  keys(): Array<keyof TState>;
  entries(): Array<[keyof TState, TState[keyof TState]]>;
  toObject(): TState;
}

// ============================================================================
// AgentRunner — Primary execution unit
// ============================================================================

/**
 * Configuration for a single agent runner instance.
 */
export interface AgentRunnerConfig {
  /** Maximum execution time before timeout. */
  timeoutMs: number;
  /** Maximum retry attempts on failure. */
  maxRetries: number;
  /** Backoff strategy between retries. */
  retryBackoff: "linear" | "exponential" | "fixed";
  /** Base delay for retry backoff (ms). */
  retryDelayMs: number;
  /** Circuit breaker threshold (failures before opening). */
  circuitBreakerThreshold: number;
  /** Circuit breaker reset timeout (ms). */
  circuitBreakerResetMs: number;
  /** Rate limit: max executions per window. */
  rateLimitMax: number;
  /** Rate limit window (ms). */
  rateLimitWindowMs: number;
}

/**
 * AgentRunner executes a single agent adapter with full lifecycle
 * management: validation → execution → retry → circuit breaking.
 */
export interface AgentRunner<TIn extends Record<string, unknown> = Record<string, unknown>,
  TOut extends Record<string, unknown> = Record<string, unknown>> {
  /** The underlying agent adapter. */
  readonly adapter: AgentAdapter<TIn, TOut>;
  /** Runtime configuration. */
  readonly config: AgentRunnerConfig;

  /** Execute the agent with lifecycle management. */
  run(input: BaseAgentInput<TIn>, context: AgentContext): Promise<AgentResult<TOut>>;

  /** Validate input against the adapter's schema. */
  validate(input: BaseAgentInput<TIn>): Promise<ValidationResult>;

  /** Get current health status of this runner. */
  health(): RunnerHealth;
}

export interface RunnerHealth {
  agentId: AgentId;
  status: "healthy" | "degraded" | "circuit_open" | "rate_limited";
  circuitState: "closed" | "open" | "half_open";
  failureCount: number;
  rateLimitRemaining: number;
  lastExecutedAt: string | null;
}

// ============================================================================
// AgentChain — Sequential execution pipeline
// ============================================================================

/**
 * A step in an agent chain. Each step maps an agent to its expected
 * output contract and context key mapping.
 */
export interface ChainStep<TIn = Record<string, unknown>, TOut = Record<string, unknown>> {
  /** The agent adapter to execute. */
  agent: AgentAdapter<TIn, TOut>;
  /** Input mapping: how to derive this step's input from context. */
  inputMap: (context: AgentContext) => BaseAgentInput<TIn>;
  /** Output mapping: how to store this step's output in context. */
  outputMap: (output: AgentOutput<TOut>, context: AgentContext) => void;
  /** Optional precondition — skip step if false. */
  precondition?: (context: AgentContext) => boolean;
  /** Optional timeout override for this step. */
  timeoutMs?: number;
  /** Optional retry override for this step. */
  maxRetries?: number;
}

/**
 * Specifies how a chain should behave on step failures.
 */
export type ChainFailureMode = "abort" | "skip" | "continue";

/**
 * AgentChain executes agents sequentially, passing context between steps.
 */
export interface AgentChain<TSteps extends readonly ChainStep[] = ChainStep[]> {
  /** Ordered list of steps. */
  readonly steps: TSteps;
  /** Chain-level execution ID. */
  readonly chainId: string;
  /** Behavior on step failure. */
  readonly failureMode: ChainFailureMode;

  /** Execute all steps in sequence. */
  execute(context: AgentContext): Promise<ChainResult>;

  /** Execute up to a specific step index. */
  executeUntil(stepIndex: number, context: AgentContext): Promise<ChainResult>;

  /** Get results for completed steps. */
  getResults(): Map<number, AgentResult>;
}

export interface ChainResult {
  chainId: string;
  status: "completed" | "failed" | "aborted" | "partial";
  steps: ChainStepResult[];
  totalDurationMs: number;
  error: string | null;
}

export interface ChainStepResult {
  stepIndex: number;
  agentId: AgentId;
  status: AgentStatus;
  result: AgentResult | null;
  durationMs: number;
  error: string | null;
}

// ============================================================================
// New Primitives: Node types, merge strategies, route branches
// ============================================================================

/**
 * The type of a graph node, determining how it is executed.
 * - standard: Executes an agent adapter via AgentRunner.
 * - conditional_router: Evaluates conditions and routes to a branch.
 * - synchronizer: Waits for upstream nodes and merges their context.
 */
export type GraphNodeType = "standard" | "conditional_router" | "synchronizer";

/**
 * Merge strategy for combining context contributions from multiple upstream nodes.
 * - shallow: First-level keys are merged (Object.assign style).
 * - deep: Recursive deep merge of nested objects.
 * - overwrite: Later sources completely replace earlier ones.
 */
export type MergeStrategy = "shallow" | "deep" | "overwrite";

/**
 * A single route branch in a conditional router node.
 */
export interface RouteBranch {
  /** The target node ID to route to if this branch is selected. */
  targetNodeId: string;
  /** Condition that must be true for this branch to be selected. */
  condition: (context: AgentContext) => boolean | Promise<boolean>;
  /** Priority (lower number = higher priority). Defaults to 100. */
  priority?: number;
  /** Optional human-readable label. */
  label?: string;
}

// ============================================================================
// AgentGraph — DAG-based execution with parallel branches
// ============================================================================

/**
 * A node in the agent execution graph.
 */
export interface GraphNode<TIn = Record<string, unknown>, TOut = Record<string, unknown>> {
  /** Unique node identifier. */
  id: string;
  /** Node type determines execution behavior. Defaults to "standard". */
  type?: GraphNodeType;
  /** The agent adapter to execute at this node (required for standard nodes). */
  agent: AgentAdapter<TIn, TOut>;
  /** Input mapping from context. */
  inputMap: (context: AgentContext) => BaseAgentInput<TIn>;
  /** Output mapping to context. */
  outputMap: (output: AgentOutput<TOut>, context: AgentContext) => void;
  /** Node-level timeout. */
  timeoutMs?: number;
  /** Node-level retries. */
  maxRetries?: number;
  /** Metadata for filtering/grouping. */
  tags?: string[];

  // ========================================================================
  // Conditional Router configuration (used when type = "conditional_router")
  // ========================================================================
  /** Route branches for conditional routing. */
  routes?: RouteBranch[];

  // ========================================================================
  // Synchronizer configuration (used when type = "synchronizer")
  // ========================================================================
  /** Merge strategy for combining upstream context contributions. */
  mergeStrategy?: MergeStrategy;
  /** Timeout in ms for waiting on upstream nodes. */
  synchronizerTimeoutMs?: number;
  /** Whether ALL upstream nodes must complete before proceeding. */
  requireAllUpstream?: boolean;
}

/**
 * A directed edge between two graph nodes.
 */
export interface GraphEdge {
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /** Optional condition — edge is only followed if condition passes. */
  condition?: (context: AgentContext) => boolean;
  /** Data filter — transform data flowing across this edge. */
  transform?: (data: unknown, context: AgentContext) => unknown;
}

/**
 * AgentGraph executes agents as a DAG, with topological ordering
 * and parallel execution of independent branches.
 */
export interface AgentGraph<TNodes extends readonly GraphNode[] = GraphNode[],
  TEdges extends readonly GraphEdge[] = GraphEdge[]> {
  /** Graph nodes. */
  readonly nodes: TNodes;
  /** Graph edges. */
  readonly edges: TEdges;
  /** Graph-level execution ID. */
  readonly graphId: string;

  /** Execute the entire DAG in topological order. */
  execute(context: AgentContext): Promise<GraphResult>;

  /** Execute a subset of nodes by tag filter. */
  executeSubgraph(tags: string[], context: AgentContext): Promise<GraphResult>;
}

export interface GraphResult {
  graphId: string;
  status: "completed" | "failed" | "partial";
  nodeResults: Map<string, GraphNodeResult>;
  executionOrder: string[];
  totalDurationMs: number;
  error: string | null;
}

export interface GraphNodeResult {
  nodeId: string;
  agentId: AgentId;
  status: AgentStatus;
  result: AgentResult | null;
  dependencies: string[];
  dependents: string[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
}

// ============================================================================
// WorkflowDefinition — Top-level workflow specification
// ============================================================================

/**
 * A WorkflowDefinition describes the complete orchestration plan:
 * sequence of steps (chain) or DAG (graph), with trigger, error handling,
 * and observability configuration.
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Semantic version. */
  version: string;
  /** Workflow description. */
  description: string;

  /** Execution mode: chain (sequential), graph (DAG), or execution_graph (full ExecutionLoop). */
  mode: "chain" | "graph" | "execution_graph";

  /** Chain steps (used when mode = "chain"). */
  chain?: ChainStep[];

  /** Graph nodes + edges (used when mode = "graph"). */
  graph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };

  /** Trigger configuration. */
  trigger: WorkflowTrigger;

  /** Error handling policy. */
  errorHandling: {
    failureMode: ChainFailureMode;
    maxGlobalRetries: number;
    fallbackAgentId?: AgentId;
  };

  /** Observability configuration. */
  observability: {
    tracing: boolean;
    metrics: boolean;
    logging: "debug" | "info" | "warn" | "error";
    outputPersistence: "none" | "last" | "all";
  };

  /** Timeout for the entire workflow. */
  timeoutMs: number;

  /** Tags for categorization. */
  tags: string[];

  /** Context key requirements. */
  contextRequirements: {
    reads: ContextKey[];
    writes: ContextKey[];
  };
}

export type WorkflowTrigger =
  | { type: "manual" }
  | { type: "event"; eventName: string; filter?: Record<string, unknown> }
  | { type: "schedule"; cron: string; timezone?: string }
  | { type: "webhook"; path: string; method: "GET" | "POST" | "PUT" }
  | { type: "n8n"; webhookId: string };
