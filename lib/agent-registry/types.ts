// ============================================================================
// Nexus Agent Platform — Agent Registry Core Type System
// ============================================================================
// This module defines the foundational types for all agent adapters in the
// Nexus Agent Platform runtime engine. Every agent in the registry implements
// these contracts so the orchestrator can route, validate, and compose agents
// reliably.
// ============================================================================

// ---------------------------------------------------------------------------
// Identity & Versioning
// ---------------------------------------------------------------------------

/** Unique identifier for an agent within the registry. Convention: `{domain}-{name}` */
export type AgentId = string;

/** Semantic version for agent adapters and their externalized prompts. */
export type SemVer = `${number}.${number}.${number}`;

/** Prompt version identifier, e.g. `"infrastructure-maintainer.v1"` */
export type PromptVersion = string;

// ---------------------------------------------------------------------------
// Agent Metadata
// ---------------------------------------------------------------------------

export interface AgentMetadata {
  /** Unique registry identifier (e.g. `"support-infrastructure-maintainer"`) */
  id: AgentId;
  /** Human-readable display name */
  name: string;
  /** Brief description of the agent's purpose */
  description: string;
  /** Domain grouping (support, engineering, marketing, etc.) */
  domain: AgentDomain;
  /** Agent capability tags used for routing and discovery */
  capabilities: AgentCapability[];
  /** Current adapter version */
  version: SemVer;
  /** Runtime requirements for this agent */
  requirements?: AgentRequirement[];
  /** Prompt version this adapter is bound to */
  promptVersion: PromptVersion;
}

export type AgentDomain =
  | "support"
  | "engineering"
  | "design"
  | "marketing"
  | "product"
  | "finance"
  | "testing"
  | "operations"
  | "specialized"
  | "sales";

export type AgentCapability =
  // Infrastructure
  | "infrastructure-monitoring"
  | "performance-analysis"
  | "capacity-planning"
  | "cost-optimization"
  | "incident-analysis"
  | "config-management"
  | "disaster-recovery"
  | "scaling-recommendation"
  // Cross-cutting
  | "report-generation"
  | "alert-classification"
  | "slo-validation"
  | "trend-forecasting"
  | "root-cause-analysis"
  // Sales
  | "cold-outreach"
  | "follow-up-sequencing"
  | "objection-handling"
  | "proposal-writing"
  | "pipeline-management"
  | "lead-qualification"
  | "deal-scoring"
  | "re-engagement-campaign"
  | "icp-definition"
  | "trigger-detection";

export interface AgentRequirement {
  /** Name of required resource or permission */
  resource: string;
  /** Reason for the requirement */
  justification: string;
}

// ---------------------------------------------------------------------------
// Agent Input / Output
// ---------------------------------------------------------------------------

/**
 * Every agent adapter receives a typed input payload.
 * The generic `TInput` lets each adapter define its own schema while
 * sharing the common runtime envelope.
 */
export interface AgentInput<TInput = Record<string, unknown>> {
  /** The agent that should process this input */
  targetAgent: AgentId;
  /** Domain-specific payload */
  payload: TInput;
  /** Correlation ID for tracing across agent chains */
  correlationId: string;
  /** Unix timestamp (ms) when this input was created */
  timestamp: number;
  /** Optional caller/source for audit */
  source?: string;
  /** Optional priority — affects orchestrator queuing */
  priority?: "low" | "normal" | "high" | "critical";
  /** Optional TTL — if not processed by this time, discard */
  expiresAt?: number;
}

/**
 * Every agent adapter produces a typed output payload.
 * The generic `TOutput` mirrors the adapter-specific schema.
 */
export interface AgentOutput<TOutput = Record<string, unknown>> {
  /** Agent that produced this output */
  sourceAgent: AgentId;
  /** Domain-specific result payload */
  payload: TOutput;
  /** Correlation ID from the originating input */
  correlationId: string;
  /** Unix timestamp (ms) when this output was produced */
  timestamp: number;
  /** Processing duration in milliseconds */
  processingTimeMs: number;
  /** Status of the execution */
  status: "success" | "partial" | "failure";
  /** Human-readable summary */
  summary: string;
  /** Any errors encountered (non-fatal) */
  warnings?: AgentWarning[];
  /** Validation results attached during processing */
  validation?: ValidationResult[];
}

export interface AgentWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

// ---------------------------------------------------------------------------
// Agent Context
// ---------------------------------------------------------------------------

/**
 * AgentContext is the shared state bag passed between agents in a chain
 * or multi-agent workflow. Each agent reads keys it needs and writes keys
 * it produces. The orchestrator manages context propagation.
 */
export interface AgentContext {
  /** Unique identifier for this execution session */
  sessionId: string;
  /** Arbitrary key-value storage for inter-agent communication */
  data: Record<string, unknown>;
  /** Metadata about the execution — who ran what and when */
  audit: ContextAuditEntry[];
  /** Orchestrator-level controls */
  controls: ContextControls;
}

export interface ContextAuditEntry {
  agentId: AgentId;
  action: string;
  timestamp: number;
  summary: string;
}

export interface ContextControls {
  /** Maximum number of agents this context can be routed through */
  maxHops: number;
  /** Current hop count */
  hopCount: number;
  /** If true, execution stops after this agent */
  terminateAfter?: boolean;
}

// ---------------------------------------------------------------------------
// Agent Adapter Contract
// ---------------------------------------------------------------------------

/**
 * The core contract every agent adapter must implement.
 *
 * @typeparam TInput  Shape of the adapter-specific input payload.
 * @typeparam TOutput Shape of the adapter-specific output payload.
 * @typeparam TContextKeys  Union of string literals for context data keys.
 */
export interface AgentAdapter<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>,
  TContextKeys extends string = string,
> {
  /** Static metadata registered with the orchestrator */
  metadata: AgentMetadata;

  /** The core execution function — input in, output out */
  execute(input: AgentInput<TInput>, context: AgentContext): Promise<AgentOutput<TOutput>>;

  /** Runtime validation of input before execution — throws on failure */
  validateInput(input: unknown): asserts input is AgentInput<TInput>;

  /** Runtime validation of context keys before execution */
  validateContext(context: AgentContext): ValidationResult[];

  /** Schema definition (used for codegen / docs) */
  schema: AgentSchema<TInput, TOutput, TContextKeys>;
}

// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------

/**
 * Declarative schema that describes an agent's input, output, and context
 * contract. Used for documentation, code generation, and runtime reflection.
 */
export interface AgentSchema<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>,
  TContextKeys extends string = string,
> {
  /** Input contract */
  input: SchemaFieldSet<TInput>;
  /** Output contract */
  output: SchemaFieldSet<TOutput>;
  /** Context keys this agent reads and writes */
  context: AgentContextSchema<TContextKeys>;
  /** Validation rules applied during execution */
  validation: ValidationRule[];
}

export interface SchemaField<T> {
  /** Path within the payload (dot-notation) */
  path: string;
  /** Human-readable label */
  label: string;
  /** Description of what this field contains */
  description: string;
  /** Expected TypeScript type */
  type: "string" | "number" | "boolean" | "object" | "array" | "unknown";
  /** Whether this field is required */
  required: boolean;
  /** Example value */
  example?: unknown;
  /** If this is an enum, the allowed values */
  enum?: readonly string[];
}

export type SchemaFieldSet<T> = SchemaField<keyof T>[];

export interface AgentContextSchema<TContextKeys extends string = string> {
  /** Keys this agent **reads** from context */
  reads: ContextKey<TContextKeys>[];
  /** Keys this agent **writes** to context */
  writes: ContextKey<TContextKeys>[];
}

export interface ContextKey<TKey extends string = string> {
  key: TKey;
  description: string;
  type: string;
  required: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationRule {
  /** Rule identifier for traceability */
  rule: string;
  /** Human-readable description */
  description: string;
  /** Severity when violated */
  severity: "error" | "warning";
  /** The validation function (executed at runtime) */
  validate: (input: unknown, context: AgentContext) => boolean | Promise<boolean>;
  /** Error message template */
  errorMessage: string;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  severity: "error" | "warning";
  message: string;
  /** The value that was validated (for debugging) */
  value?: unknown;
}

// ---------------------------------------------------------------------------
// Prompt Template
// ---------------------------------------------------------------------------

/**
 * Describes a versioned system prompt for an agent.
 * The prompt is externalized so it can be updated without code changes.
 */
export interface PromptTemplate {
  /** Unique identifier, e.g. `"infrastructure-maintainer.v1"` */
  id: PromptVersion;
  /** The agent this prompt belongs to */
  agentId: AgentId;
  /** Human-readable title */
  title: string;
  /** The prompt text, with {{variable}} placeholders */
  systemPrompt: string;
  /** Variables used in the prompt and their descriptions */
  variables: PromptVariable[];
  /** Changelog for version tracking */
  changelog: PromptChangelogEntry[];
}

export interface PromptVariable {
  name: string;
  description: string;
  type: "string" | "number" | "object" | "array";
  required: boolean;
  example?: unknown;
}

export interface PromptChangelogEntry {
  version: SemVer;
  date: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Execution Flow
// ---------------------------------------------------------------------------

export type ExecutionFlowType = "single" | "chain" | "multi-agent" | "broadcast";

export interface ExecutionFlow {
  /** Unique flow identifier */
  id: string;
  /** Type of execution flow */
  type: ExecutionFlowType;
  /** Human-readable description */
  description: string;
  /** Ordered list of steps */
  steps: FlowStep[];
  /** Shared context keys passed between steps */
  sharedContext: string[];
  /** Expected outcomes */
  expectedOutput: string;
}

export interface FlowStep {
  /** Index in the sequence */
  sequence: number;
  /** Agent to invoke */
  agentId: AgentId;
  /** What this step does */
  action: string;
  /** Context keys this step needs from prior steps */
  inputContext: string[];
  /** Context keys this step produces for subsequent steps */
  outputContext: string[];
  /** Branch/conditional logic, if any */
  condition?: string;
}
