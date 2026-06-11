// ============================================================================
// Nexus Agent Platform — Agent Registry Extended Types
// ============================================================================
// Extends the base types from lib/agents/types.ts with richer schema
// definitions, validation rules, and prompt template support.
//
// NOTE: Existing adapters that import AgentAdapter, AgentInput, AgentOutput,
// AgentContext, or ContextKey from "./types" should be updated to import
// from "@/lib/agents/types" instead. Backward-compatible re-exports are
// provided here for transient compatibility.
// ============================================================================

import type {
  SemVer as BaseSemVer,
  AgentMetadata as BaseAgentMetadata,
  AgentAdapter as BaseAgentAdapter,
  AgentContext as BaseAgentContext,
  AgentInputBase,
  AgentOutputBase,
  AgentStatus,
} from "../types";

// Re-export base types for convenience.
export type SemVer = BaseSemVer;
export type {
  AgentInputBase,
  AgentOutputBase,
  AgentError,
  AgentStatus,
  Priority,
  SearchIntent,
  Confidence,
  JsonSchema,
  AgentCapability,
  AgentExecutionRequest,
  AgentExecutionResponse,
  ExecutionMetrics,
} from "../types";

// Backward-compatible re-exports for adapters that import from "./types".
export type { BaseAgentContext as AgentContext, BaseAgentAdapter as AgentAdapter } from "../types";

/**
 * @deprecated Context keys are now plain strings. Import `CONTEXT` constant instead.
 */
export type ContextKey = string;

// ---------------------------------------------------------------------------
// Port Schemas — Documented + versioned shape definitions
// ---------------------------------------------------------------------------

/**
 * Declares the contract of a single input or output port on an agent adapter.
 * The `$id` field references a registered Schema Registry entry.
 */
export interface PortSchema {
  /** Fully-qualified schema identifier (e.g. "ui-designer-input.v1"). */
  $id: string;
  version: SemVer;
  description: string;
  /** JSON Schema-compatible type definition. */
  type: "object" | "array" | "string" | "number" | "boolean";
  properties?: Record<string, unknown>;
  required?: string[];
  /** Example payload (for docs & testing). */
  example?: unknown;
}

// ---------------------------------------------------------------------------
// Extended Validation
// ---------------------------------------------------------------------------

/**
 * Extended validation error with path and error code.
 */
export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
  code?: string;
}

/**
 * Extended validation result with categorized errors and warnings.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * A validation rule that operates on an agent's output.
 * Multiple rules are composed into the agent adapter's validator pipeline.
 */
export interface ValidationRule<TOutput = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning";
  category?: string;
  validate(output: TOutput, context?: AgentContext): ValidationResult;
}

// ---------------------------------------------------------------------------
// Enhanced Agent Metadata (extends base)
// ---------------------------------------------------------------------------

/**
 * Registration metadata extending the base AgentMetadata with
 * UI/icon info and model hints.
 */
export interface AgentMetadata extends BaseAgentMetadata {
  /** Icon emoji for visual identification. */
  icon?: string;
  /** Theme color for UI representation. */
  color?: string;
  /** Default model configuration hint. */
  model?: string;
  /** Agent lifecycle registration status. */
  registryStatus?: "active" | "deprecated" | "beta" | "experimental" | "retired";
}

// ---------------------------------------------------------------------------
// Enhanced Adapter Interface
// ---------------------------------------------------------------------------

/**
 * Extended AgentAdapter that adds input/output schema definitions,
 * validation rules, prompt template resolution, and lifecycle hooks
 * on top of the base AgentAdapter contract.
 *
 * Adapters implementing this interface are compatible with the base
 * AgentRegistry (via the execute/validate contract) while providing
 * richer metadata for tool-calling UIs, automated QA, and chain planning.
 */
export interface EnhancedAgentAdapter<
  TInput extends Record<string, unknown> = Record<string, unknown>,
  TOutput extends Record<string, unknown> = Record<string, unknown>,
> extends BaseAgentAdapter<TInput, TOutput> {
  /** Stable agent metadata (extends base). */
  readonly metadata: AgentMetadata;

  /** Input port schema definition. */
  readonly inputSchema: PortSchema;

  /** Output port schema definition. */
  readonly outputSchema: PortSchema;

  /** Context keys this agent reads from the shared context. */
  readonly readsContextKeys: string[];

  /** Context keys this agent writes to the shared context. */
  readonly writesContextKeys: string[];

  /** Validation rules that run against the output before returning. */
  readonly validators: ValidationRule<TOutput>[];

  /** Path to the externalized system prompt template (YAML). */
  readonly promptTemplate: string;

  /**
   * Resolve the final system prompt by interpolating runtime variables
   * into the prompt template file.
   */
  resolvePrompt(variables: Record<string, unknown>): Promise<string>;

  /**
   * Hook called before execution begins. Useful for preconditions,
   * context validation, or telemetry.
   */
  onBefore?(input: TInput, context: AgentContext): Promise<void>;

  /**
   * Hook called after execution completes, before validators run.
   * Useful for post-processing, logging, or metrics.
   */
  onAfter?(output: TOutput, context: AgentContext): Promise<void>;
}

// ---------------------------------------------------------------------------
// Registry Interface
// ---------------------------------------------------------------------------

/**
 * Extended registry interface with chain-planning and agent resolution.
 */
export interface AgentRegistry {
  /** Register a new adapter. */
  register(adapter: EnhancedAgentAdapter): void;

  /** Retrieve an adapter by its agent name. */
  get(name: string): EnhancedAgentAdapter | undefined;

  /** List all registered adapters, optionally filtered by tags. */
  list(tags?: string[]): EnhancedAgentAdapter[];

  /** Resolve adapters that write a given set of context keys (for chaining). */
  resolve(writesKeys: string[]): EnhancedAgentAdapter[];
}

/**
 * Context key constants — canonical string identifiers for context entries.
 * These are used across agents to ensure consistent key naming.
 *
 * @example
 * ```ts
 * context[CONTEXT.DESIGN_SYSTEM] = { colorPalette: { ... } };
 * ```
 */
export const CONTEXT = {
  // Design system keys
  DESIGN_SYSTEM: "designSystem",
  COMPONENT_LIBRARY: "componentLibrary",
  ACCESSIBILITY_AUDIT: "accessibilityAudit",
  DESIGN_TOKENS: "designTokens",
  BRAND_GUIDELINES: "brandGuidelines",

  // UX / Product keys
  UX_REQUIREMENTS: "uxRequirements",
  USER_PERSONAS: "userPersonas",
  FEATURE_SPEC: "featureSpec",
  USER_STORIES: "userStories",
  SUCCESS_METRICS: "successMetrics",
  PRODUCT_ROADMAP: "productRoadmap",
  USER_FEEDBACK: "userFeedback",

  // Engineering keys
  DATA_MODELS: "dataModels",
  SYSTEM_CONSTRAINTS: "systemConstraints",
  API_ARCHITECTURE: "apiArchitecture",
  DATA_SCHEMA: "dataSchema",
  SYSTEM_ARCHITECTURE: "systemArchitecture",
} as const;
