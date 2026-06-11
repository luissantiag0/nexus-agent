// ============================================================================
// Nexus Agent — Agent Registry Core Types
// ============================================================================
// This module defines the base interfaces for all agent adapters in the
// Nexus Agent Orchestration Runtime Engine.
// ============================================================================

/**
 * Semantic version string (e.g. "1.0.0").
 */
export type SemVer = string;

/**
 * Agent execution status for observability and error recovery.
 */
export enum AgentStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  REJECTED_VALIDATION = "rejected_validation",
}

/**
 * Priority level for agent output items (recommendations, fixes, etc.).
 */
export enum Priority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Search intent classification for keyword targeting.
 */
export enum SearchIntent {
  INFORMATIONAL = "informational",
  COMMERCIAL = "commercial",
  TRANSACTIONAL = "transactional",
  NAVIGATIONAL = "navigational",
}

/**
 * Confidence label attached to each recommendation.
 * Derived from data sufficiency, signal strength, and historical pattern match.
 */
export enum Confidence {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

// ---------------------------------------------------------------------------
// Base agent interfaces
// ---------------------------------------------------------------------------

/**
 * Every agent input must extend this interface.
 * Provides metadata that the runtime uses for routing, tracing, and billing.
 */
export interface AgentInputBase {
  /** ISO-8601 timestamp of when this input was created. */
  readonly timestamp?: string;

  /** Correlation ID for tracing execution chains. */
  readonly traceId?: string;

  /** The agent that produced the output feeding into this agent (if chained). */
  readonly sourceAgent?: string;
}

/**
 * Every agent output must extend this interface.
 */
export interface AgentOutputBase {
  /** ISO-8601 timestamp of when this output was produced. */
  readonly timestamp: string;

  /** The agent that produced this output. */
  readonly sourceAgent: string;

  /** Execution correlation ID. */
  readonly traceId: string;

  /** Execution status. */
  status: AgentStatus;

  /** Human-readable summary of what was done. */
  summary: string;

  /** Error information (populated when status === FAILED). */
  error?: AgentError;
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Agent context is the shared state object passed between agents in a chain.
 * Each agent declares the keys it reads from and writes to the context.
 */
export interface AgentContext {
  /** Arbitrary key-value storage for agent chain data flow. */
  [key: string]: unknown;
}

/**
 * Input validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning";
}

// ---------------------------------------------------------------------------
// Agent adapter interface
// ---------------------------------------------------------------------------

/**
 * Schema definition using JSON Schema (draft-07) subset.
 * Used for runtime input/output validation and for tool-calling UIs.
 */
export type JsonSchemaType = "object" | "array" | "string" | "number" | "boolean";

export interface JsonSchema {
  type: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  description?: string;
  enum?: string[];
  default?: unknown;
  [key: string]: unknown;
}

/**
 * Agent capability descriptor.
 */
export interface AgentCapability {
  /** Action the agent can perform (e.g. "audit", "optimize", "research"). */
  action: string;
  /** Human-readable description. */
  description: string;
  /** Input schema for this specific capability. */
  inputSchema: JsonSchema;
  /** Output schema for this specific capability. */
  outputSchema: JsonSchema;
}

/**
 * Metadata descriptor for an agent adapter.
 */
export interface AgentMetadata {
  /** Unique agent identifier (e.g. "seo-specialist"). */
  name: string;
  /** Human-readable label. */
  label: string;
  /** Brief description of the agent's purpose. */
  description: string;
  /** Current version. */
  version: SemVer;
  /** Agent author / maintainer. */
  author?: string;
  /** Capabilities this agent exposes. */
  capabilities: AgentCapability[];
  /** Context keys this agent reads. */
  readsContextKeys: string[];
  /** Context keys this agent writes. */
  writesContextKeys: string[];
  /** Prompt version used by this agent (for audit trail). */
  promptVersion: string;
  /** Tags for discoverability. */
  tags: string[];
}

/**
 * Agent execution request.
 */
export interface AgentExecutionRequest<TInput = Record<string, unknown>> {
  /** Target agent name. */
  agent: string;
  /** Input payload (validated against the agent's inputSchema). */
  input: TInput;
  /** Shared context (may be partially populated by upstream agents). */
  context?: AgentContext;
  /** Correlation ID for tracing. */
  traceId?: string;
}

/**
 * Agent execution response.
 */
export interface AgentExecutionResponse<TOutput = Record<string, unknown>> {
  /** The agent that executed. */
  agent: string;
  /** Execution status. */
  status: AgentStatus;
  /** Structured output. */
  output: TOutput;
  /** Updated context (agent's writes merged). */
  context: AgentContext;
  /** Performance / observability data. */
  metrics?: ExecutionMetrics;
  /** Error information if status === FAILED. */
  error?: AgentError;
}

export interface ExecutionMetrics {
  /** Wall-clock execution time in milliseconds. */
  durationMs: number;
  /** Number of tokens consumed (if available). */
  tokensUsed?: number;
  /** Model used for LLM-based agents. */
  model?: string;
}

// ---------------------------------------------------------------------------
// Agent adapter: the core interface every agent must implement
// ---------------------------------------------------------------------------

/**
 * The AgentAdapter interface.
 *
 * Every agent in the registry (including @seo-specialist, @content-creator,
 * @trend-researcher, etc.) must implement this interface.
 *
 * @typeParam TInput  - The typed input interface for this agent.
 * @typeParam TOutput - The typed output interface for this agent.
 */
export interface AgentAdapter<
  TInput extends AgentInputBase = AgentInputBase,
  TOutput extends AgentOutputBase = AgentOutputBase,
> {
  /** Agent metadata (name, version, capabilities, etc.). */
  readonly metadata: AgentMetadata;

  /**
   * Validate input against the agent's schema and business rules.
   * Called by the registry before `execute`.
   * If validation fails (result.valid === false), the registry MUST reject
   * the execution with status REJECTED_VALIDATION.
   */
  validate(input: Record<string, unknown>): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input      - The validated input payload.
   * @param context    - The shared agent chain context.
   * @param signal     - Optional AbortSignal for cancellation.
   * @returns          - The agent's output and updated context.
   */
  execute(
    input: TInput,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<TOutput>>;
}
