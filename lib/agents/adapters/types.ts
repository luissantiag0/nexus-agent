// ============================================================================
// Agent Registry — Core Adapter Types
// ============================================================================
// Base types that every agent adapter in the registry implements.
// These define the contract between the orchestration engine and each agent.
// ============================================================================

/**
 * Generic agent adapter interface.
 * Every agent in the registry must implement this contract.
 */
export interface AgentAdapter<TInput = unknown, TOutput = unknown> {
  /** Canonical agent identifier (e.g. "@social-media-strategist"). */
  readonly agentId: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Filename of the externalized prompt template (e.g. "social-media-strategist.v1.prompt.yaml"). */
  readonly promptVersion: string;

  /** Agent IDs that this adapter expects data from. */
  readonly upstreamDependencies: readonly string[];

  /** Agent IDs that consume this adapter's context keys. */
  readonly downstreamTargets: readonly string[];

  /** Validate and coerce raw input into the typed input schema. */
  validateInput(input: unknown): Promise<TInput>;

  /** Validate and coerce raw output into the typed output schema. */
  validateOutput(output: unknown): Promise<TOutput>;

  /** Extract context keys from the output for downstream agents. */
  extractContextKeys(output: TOutput): AgentContext;

  /** Compose a prompt preamble from the typed input for the LLM. */
  composePrompt(input: TInput): string;
}

/**
 * Shared context map written by adapters and read by downstream agents.
 * Keys are arbitrary strings; values are structured JSON-serializable data.
 */
export interface AgentContext {
  [key: string]: unknown;
}

/**
 * Result of a single agent execution.
 */
export interface ExecutionResult<TOutput = unknown> {
  agentId: string;
  success: boolean;
  output: TOutput | null;
  error?: string;
  context: AgentContext;
  metadata: {
    startedAt: string;
    completedAt: string;
    promptVersion: string;
    durationMs: number;
  };
}
