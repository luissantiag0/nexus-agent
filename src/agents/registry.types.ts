// ============================================================================
// Nexus Agent Platform — Agent Registry Common Types
// ============================================================================

/**
 * Shared context store that agents read from and write to during execution.
 * The Agent Registry runtime manages this as a key-value store scoped to
 * the current pipeline or execution chain.
 */
export interface AgentContext {
  /** Arbitrary key-value store for inter-agent communication */
  [key: string]: unknown;
}

/**
 * Lifecycle hooks that the Agent Registry calls at various points during
 * an agent's execution. Adapters can implement these to hook into the
 * runtime lifecycle.
 */
export interface AgentLifecycleHooks<TInput = unknown, TOutput = unknown> {
  /** Called before agent execution begins */
  onBeforeExecute?: (input: TInput, context: AgentContext) => Promise<void> | void;
  /** Called after agent execution completes successfully */
  onAfterExecute?: (output: TOutput, context: AgentContext) => Promise<void> | void;
  /** Called if agent execution fails */
  onError?: (error: Error, input: TInput, context: AgentContext) => Promise<void> | void;
  /** Called to validate input before execution */
  validateInput?: (input: TInput) => string[];
  /** Called to validate output after execution */
  validateOutput?: (output: TOutput) => string[];
}

/**
 * Standardized slot definition for the Agent Registry.
 * Each agent adapter registers itself using this shape.
 */
export interface AgentSlot {
  agentId: string;
  name: string;
  description: string;
  version: string;
  promptVersion: string;
  color: string;
  emoji: string;
  inputKeys: string[];
  outputKeys: string[];
  execute(input: Record<string, unknown>, context: AgentContext): Promise<Record<string, unknown>>;
  dryRun(input: Record<string, unknown>): { valid: boolean; validationErrors: string[] };
}
