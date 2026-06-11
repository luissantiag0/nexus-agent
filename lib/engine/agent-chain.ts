// ============================================================================
// AgentChain — Sequential Pipeline Orchestration Model
// ============================================================================
// An AgentChain is a strictly ordered sequence of agent executions that
// forms a linear pipeline. Unlike the AgentGraph (which supports branching
// and parallelism), the AgentChain is optimized for simple sequential
// workflows where each step feeds into the next.
//
// Chains can be composed: an AgentChain can be wrapped as a single node
// within an AgentGraph, or an AgentChain step can reference a sub-graph.
// ============================================================================

import type {
  AgentName,
  ContextMapping,
  RetryBackoffStrategy,
  NodeId,
  ExecutionPolicy,
} from "./agent-graph";

// ---------------------------------------------------------------------------
// Chain Primitives
// ---------------------------------------------------------------------------

/**
 * Unique identifier for a chain instance.
 */
export type ChainId = string;

/**
 * Unique identifier for a step within a chain.
 */
export type StepId = string;

/**
 * Lifecycle status of a chain execution.
 */
export type ChainStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "aborted"
  | "timed_out";

/**
 * Status of an individual step within a chain execution.
 */
export type StepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "timed_out"
  | "retrying";

// ---------------------------------------------------------------------------
// Chain Definition
// ---------------------------------------------------------------------------

/**
 * An AgentChain — a strictly ordered sequential pipeline of agent executions.
 */
export interface AgentChain {
  /** Unique chain identifier */
  id: ChainId;
  /** Human-readable name */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Description */
  description: string;
  /** Ordered list of steps to execute */
  steps: ChainStep[];
  /** Global timeout for the entire chain execution in ms */
  timeoutMs?: number;
  /** Deadline ISO timestamp by which the chain must complete */
  deadline?: string;
  /** Global error handling policy */
  errorPolicy: ChainErrorPolicy;
  /** Global retry defaults (overridable per-step) */
  defaultRetryConfig?: RetryConfig;
  /** Input context contract: which context keys this chain expects */
  inputContract?: ContextContract;
  /** Output context contract: which context keys this chain produces */
  outputContract?: ContextContract;
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A single step within an AgentChain.
 */
export interface ChainStep {
  /** Step identifier (unique within the chain) */
  id: StepId;
  /** Human-readable label */
  label: string;
  /** Description */
  description?: string;
  /** The agent to execute */
  agent: AgentName;
  /** Instruction/prompt for this step */
  instruction: string;
  /** Context inputs: what to pass into this step from the chain context */
  inputs: ContextMapping[];
  /** Context outputs: what to extract from this step's output into the chain context */
  outputs: ContextMapping[];
  /** Per-step timeout override in ms */
  timeoutMs?: number;
  /** Per-step retry configuration (overrides chain default) */
  retryConfig?: RetryConfig;
  /** Policy for what happens when this step succeeds */
  onSuccess?: SuccessPolicy;
  /** Policy for what happens when this step fails */
  onFailure?: StepFailurePolicy;
  /** Pre-execution validation rules for inputs */
  inputValidation?: ValidationRule[];
  /** Post-execution validation rules for outputs */
  outputValidation?: ValidationRule[];
  /** Condition under which this step is skipped */
  skipCondition?: SkipCondition;
  /** Whether this step can be manually overridden by an operator */
  allowManualOverride?: boolean;
  /** Human-readable instructions for manual override (if allowed) */
  manualOverrideInstructions?: string;
}

// ---------------------------------------------------------------------------
// Error & Retry Configuration
// ---------------------------------------------------------------------------

/**
 * Global chain-level error handling policy.
 */
export interface ChainErrorPolicy {
  /**
   * What happens when a step fails and all retries are exhausted:
   * - `abort_chain`: Stop the entire chain immediately, mark as failed
   * - `abort_cleanup`: Stop and run the cleanup sequence
   * - `skip_step`: Move to the next step, mark current as failed
   * - `continue_on_failure`: Continue execution with the failed step's output
   *   replaced by a default value
   */
  onStepFailure: "abort_chain" | "abort_cleanup" | "skip_step" | "continue_on_failure";
  /**
   * What happens when the chain times out:
   * - `fail`: Mark the chain as timed_out
   * - `complete_with_partial`: Mark as partially completed with whatever
   *   steps succeeded
   */
  onTimeout: "fail" | "complete_with_partial";
  /**
   * Whether to pause the chain on failure for manual intervention.
   */
  allowManualIntervention?: boolean;
  /**
   * Maximum number of consecutive step failures before auto-aborting
   * (prevents infinite skip loops).
   */
  maxConsecutiveFailures?: number;
}

/**
 * Retry configuration for a step (or chain default).
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Backoff strategy */
  backoff: RetryBackoffStrategy;
  /**
   * Which error types are retryable:
   * - `all`: retry on any error
   * - `transient_only`: only retry on transient errors
   * - `list`: specific error codes to retry on
   */
  retryableErrors: "all" | "transient_only" | string[];
  /**
   * Whether to retry on timeout.
   */
  retryOnTimeout?: boolean;
}

/**
 * Policy executed after a step succeeds.
 */
export interface SuccessPolicy {
  /**
   * What to do after success:
   * - `continue`: proceed to next step (default)
   * - `checkpoint`: save context state before continuing
   * - `notify`: send notification then continue
   * - `wait_for_approval`: pause and wait for human approval
   */
  action: "continue" | "checkpoint" | "notify" | "wait_for_approval";
  /** Notification channel for notify action */
  notifyChannel?: string;
  /** Notification message template */
  notifyMessage?: string;
  /** Timeout for approval wait in ms */
  approvalTimeoutMs?: number;
}

/**
 * Policy executed when a step fails.
 */
export interface StepFailurePolicy {
  /**
   * Actions on failure:
   * - `retry`: retry the step (uses retryConfig)
   * - `skip`: skip to next step
   * - `abort`: abort the entire chain
   * - `fallback`: execute a fallback step then continue
   * - `pause_for_intervention`: pause and wait for human operator
   */
  action: "retry" | "skip" | "abort" | "fallback" | "pause_for_intervention";
  /** Fallback step definition (required when action = "fallback") */
  fallbackStep?: ChainStep;
  /** Error codes that trigger this policy */
  matchErrors?: string[];
  /** Notification on failure */
  notifyOnFailure?: boolean;
  /** Notification channel */
  notifyChannel?: string;
}

// ---------------------------------------------------------------------------
// Validation & Contracts
// ---------------------------------------------------------------------------

/**
 * A validation rule for inputs or outputs.
 */
export interface ValidationRule {
  /** Context path to validate */
  path: string;
  /** Validation type */
  type: ValidationType;
  /** Parameters for the validation */
  params?: Record<string, unknown>;
  /** Error message to surface on failure */
  errorMessage?: string;
  /** Whether failure is critical (aborts step) or warning (logs only) */
  severity: "error" | "warning";
}

/**
 * Types of validation that can be applied to context values.
 */
export type ValidationType =
  | "required"           // Must exist and not be null/undefined
  | "type"               // Must be of specified type (params.type)
  | "min_length"         // String/array minimum length (params.min)
  | "max_length"         // String/array maximum length (params.max)
  | "min"                // Numeric minimum (params.min)
  | "max"                // Numeric maximum (params.max)
  | "pattern"            // Regex pattern match (params.pattern)
  | "enum"               // Must be one of (params.values: unknown[])
  | "email"              // Must be valid email format
  | "url"                // Must be valid URL format
  | "json"               // Must be valid JSON
  | "custom"             // Custom validator (params.handler)

/**
 * A context contract defines the expected shape of context at a boundary.
 */
export interface ContextContract {
  /** Required fields with their expected types */
  required: Record<string, string>;
  /** Optional fields with their expected types */
  optional?: Record<string, string>;
  /** Whether additional fields beyond the contract are allowed */
  additionalFields: boolean;
}

// ---------------------------------------------------------------------------
// Skip Conditions
// ---------------------------------------------------------------------------

/**
 * A condition under which a step is skipped entirely.
 */
export interface SkipCondition {
  /**
   * Context path to evaluate.
   */
  path: string;
  /**
   * Value(s) that trigger skipping.
   * If the value at `path` matches any of these, the step is skipped.
   */
  whenValues: unknown[];
  /**
   * Skip message logged for observability.
   */
  message?: string;
}

// ---------------------------------------------------------------------------
// Chain Execution State
// ---------------------------------------------------------------------------

/**
 * The runtime state of a chain execution.
 */
export interface ChainExecutionState {
  /** Chain instance identifier */
  chainId: ChainId;
  /** Chain definition reference */
  chainRef: string;
  /** Current status */
  status: ChainStatus;
  /** Current step index (0-based, -1 if not started) */
  currentStepIndex: number;
  /** Start timestamp */
  startedAt?: string;
  /** End timestamp */
  completedAt?: string;
  /** Elapsed time in ms */
  elapsedMs?: number;
  /** Per-step execution records */
  stepResults: StepExecutionRecord[];
  /** Accumulated context across all completed steps */
  context: Record<string, unknown>;
  /** Error information if failed */
  error?: ChainError;
  /** Number of consecutive step failures */
  consecutiveFailures: number;
  /** Execution trace for observability */
  trace: ExecutionTraceEntry[];
}

/**
 * The execution record for a single chain step.
 */
export interface StepExecutionRecord {
  /** Step identifier */
  stepId: StepId;
  /** Step label */
  label: string;
  /** Execution status */
  status: StepStatus;
  /** Start timestamp */
  startedAt?: string;
  /** End timestamp */
  completedAt?: string;
  /** Duration in ms */
  durationMs?: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Input context snapshot at time of execution */
  inputSnapshot?: Record<string, unknown>;
  /** Raw output from the agent */
  output?: unknown;
  /** Error if step failed */
  error?: StepError;
  /** Warning messages */
  warnings?: string[];
  /** Whether this step was skipped */
  skipped?: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

/**
 * Error information at the chain level.
 */
export interface ChainError {
  code: ChainErrorCode;
  message: string;
  details?: Record<string, unknown>;
  failedStepId?: StepId;
  failedStepLabel?: string;
  timestamp: string;
}

/**
 * Error codes for chain-level failures.
 */
export type ChainErrorCode =
  | "STEP_FAILURE"
  | "STEP_TIMEOUT"
  | "CHAIN_TIMEOUT"
  | "DEADLINE_EXCEEDED"
  | "MAX_CONSECUTIVE_FAILURES"
  | "VALIDATION_ERROR"
  | "CONTEXT_MISSING"
  | "CONTEXT_TYPE_MISMATCH"
  | "AGENT_NOT_FOUND"
  | "INTERNAL_ERROR"
  | "MANUAL_ABORT";

/**
 * Error information at the step level.
 */
export interface StepError {
  code: StepErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Error codes for step-level failures.
 */
export type StepErrorCode =
  | "AGENT_EXECUTION_ERROR"
  | "AGENT_TIMEOUT"
  | "AGENT_NOT_FOUND"
  | "INPUT_VALIDATION_FAILED"
  | "OUTPUT_VALIDATION_FAILED"
  | "CONTEXT_KEY_MISSING"
  | "CONTEXT_TYPE_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMITED"
  | "PERMISSION_DENIED"
  | "RESOURCE_EXHAUSTED"
  | "INTERNAL_ERROR"
  | "MANUAL_SKIP";

// ---------------------------------------------------------------------------
// Execution Trace
// ---------------------------------------------------------------------------

/**
 * An entry in the execution trace for observability and debugging.
 */
export interface ExecutionTraceEntry {
  timestamp: string;
  type: TraceEntryType;
  stepId?: StepId;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Types of trace entries.
 */
export type TraceEntryType =
  | "chain_started"
  | "chain_completed"
  | "chain_failed"
  | "chain_aborted"
  | "chain_timed_out"
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "step_skipped"
  | "step_retrying"
  | "step_timed_out"
  | "context_updated"
  | "context_validated"
  | "validation_warning"
  | "validation_error"
  | "decision_evaluated"
  | "parallel_branch_started"
  | "parallel_branch_completed"
  | "manual_intervention"
  | "checkpoint_saved"
  | "checkpoint_restored";

// ---------------------------------------------------------------------------
// Checkpoint & Resumption
// ---------------------------------------------------------------------------

/**
 * A saved checkpoint that allows a chain to be resumed from a specific point.
 */
export interface ChainCheckpoint {
  /** Checkpoint identifier */
  id: string;
  /** Chain instance identifier */
  chainId: ChainId;
  /** Step index at which this checkpoint was created */
  stepIndex: number;
  /** Context snapshot at checkpoint */
  context: Record<string, unknown>;
  /** Step results up to the checkpoint */
  completedSteps: StepExecutionRecord[];
  /** Timestamp when checkpoint was created */
  createdAt: string;
  /** TTL for this checkpoint in ms */
  ttlMs: number;
}

// ---------------------------------------------------------------------------
// Chain Builder
// ---------------------------------------------------------------------------

/**
 * Builder pattern for constructing AgentChains programmatically.
 */
export class ChainBuilder {
  private chain: AgentChain;
  private currentStepIndex: number;

  constructor(name: string, description: string) {
    this.chain = {
      id: "", // assigned at registration
      name,
      version: "1.0.0",
      description,
      steps: [],
      errorPolicy: {
        onStepFailure: "abort_chain",
        onTimeout: "fail",
        maxConsecutiveFailures: 3,
      },
    };
    this.currentStepIndex = 0;
  }

  /** Set the chain version. */
  withVersion(version: string): this {
    this.chain.version = version;
    return this;
  }

  /** Set the chain timeout. */
  withTimeout(timeoutMs: number): this {
    this.chain.timeoutMs = timeoutMs;
    return this;
  }

  /** Set the chain deadline. */
  withDeadline(deadline: string): this {
    this.chain.deadline = deadline;
    return this;
  }

  /** Set the error policy. */
  withErrorPolicy(policy: ChainErrorPolicy): this {
    this.chain.errorPolicy = policy;
    return this;
  }

  /** Set default retry config. */
  withDefaultRetryConfig(config: RetryConfig): this {
    this.chain.defaultRetryConfig = config;
    return this;
  }

  /** Set input contract. */
  withInputContract(contract: ContextContract): this {
    this.chain.inputContract = contract;
    return this;
  }

  /** Set output contract. */
  withOutputContract(contract: ContextContract): this {
    this.chain.outputContract = contract;
    return this;
  }

  /** Add a step to the chain. */
  addStep(step: ChainStep): this {
    this.chain.steps.push({
      ...step,
      id: step.id || `step_${this.chain.steps.length + 1}`,
    });
    return this;
  }

  /** Add an agent execution step with concise syntax. */
  addAgentStep(
    label: string,
    agent: AgentName,
    instruction: string,
    inputs: ContextMapping[],
    outputs: ContextMapping[],
    config?: Partial<ChainStep>
  ): this {
    return this.addStep({
      id: `step_${this.chain.steps.length + 1}`,
      label,
      agent,
      instruction,
      inputs,
      outputs,
      ...config,
    });
  }

  /** Set tags. */
  withTags(tags: string[]): this {
    this.chain.tags = tags;
    return this;
  }

  /** Set metadata. */
  withMetadata(metadata: Record<string, unknown>): this {
    this.chain.metadata = metadata;
    return this;
  }

  /** Build the chain. */
  build(): AgentChain {
    return { ...this.chain };
  }
}

/**
 * Create a new chain with the builder.
 */
export function createChain(name: string, description: string): ChainBuilder {
  return new ChainBuilder(name, description);
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Calculate the total estimated duration of a chain based on step timeouts.
 * Useful for pre-execution SLA validation.
 */
export function calculateChainBudget(chain: AgentChain): {
  totalBudgetMs: number;
  stepBudgets: Array<{ stepId: StepId; timeoutMs: number }>;
} {
  const stepBudgets: Array<{ stepId: StepId; timeoutMs: number }> = [];

  for (const step of chain.steps) {
    const timeoutMs = step.timeoutMs ?? chain.timeoutMs ?? 30000;
    stepBudgets.push({ stepId: step.id, timeoutMs });
  }

  const totalBudgetMs = stepBudgets.reduce((sum, s) => sum + s.timeoutMs, 0);

  return { totalBudgetMs, stepBudgets };
}

/**
 * Validate a chain structure before execution.
 * Returns all structural issues found.
 */
export function validateChain(chain: AgentChain): ChainValidationResult {
  const errors: ChainValidationIssue[] = [];
  const warnings: ChainValidationIssue[] = [];

  // Check for empty chain
  if (chain.steps.length === 0) {
    errors.push({
      type: "structural",
      message: "Chain has no steps defined",
    });
  }

  // Check for duplicate step IDs
  const stepIds = new Set<string>();
  for (const step of chain.steps) {
    if (stepIds.has(step.id)) {
      errors.push({
        type: "structural",
        message: `Duplicate step ID: ${step.id}`,
        stepId: step.id,
      });
    }
    stepIds.add(step.id);
  }

  // Check step order references
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];

    // Check for missing agent
    if (!step.agent) {
      errors.push({
        type: "missing_field",
        message: `Step "${step.id}" has no agent specified`,
        stepId: step.id,
      });
    }

    // Check for missing instruction
    if (!step.instruction) {
      errors.push({
        type: "missing_field",
        message: `Step "${step.id}" has no instruction specified`,
        stepId: step.id,
      });
    }

    // Check timeout exceeds chain timeout
    if (step.timeoutMs && chain.timeoutMs && step.timeoutMs > chain.timeoutMs) {
      warnings.push({
        type: "configuration",
        message: `Step "${step.id}" timeout (${step.timeoutMs}ms) exceeds chain timeout (${chain.timeoutMs}ms)`,
        stepId: step.id,
      });
    }
  }

  // Validate retry config
  if (chain.defaultRetryConfig) {
    const retry = chain.defaultRetryConfig;
    if (retry.maxRetries < 0) {
      errors.push({
        type: "configuration",
        message: "defaultRetryConfig.maxRetries must be >= 0",
      });
    }
    if (retry.backoff.baseMs <= 0) {
      errors.push({
        type: "configuration",
        message: "defaultRetryConfig.backoff.baseMs must be > 0",
      });
    }
  }

  // Check deadlines
  if (chain.deadline) {
    const deadlineDate = new Date(chain.deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.push({
        type: "configuration",
        message: `Invalid deadline format: "${chain.deadline}". Expected ISO 8601 timestamp.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalSteps: chain.steps.length,
  };
}

export interface ChainValidationResult {
  valid: boolean;
  errors: ChainValidationIssue[];
  warnings: ChainValidationIssue[];
  totalSteps: number;
}

export interface ChainValidationIssue {
  type: "structural" | "missing_field" | "configuration" | "contract";
  message: string;
  stepId?: StepId;
  detail?: string;
}
