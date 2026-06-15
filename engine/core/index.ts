// ============================================================================
// Nexus Agent Platform — Engine Core Barrel Export
// ============================================================================
// Exports all engine core modules including new primitives, execution loop,
// and existing runners/chains/graphs for backward compatibility.
// ============================================================================

// ============================================================================
// New Primitives
// ============================================================================

export {
  ConditionEvaluator,
  conditionEvaluator,
} from "./condition-evaluator";
export type {
  Condition,
  ConditionRule,
  ConditionEvaluation,
} from "./condition-evaluator";

export {
  ConditionalRouter,
} from "./conditional-router";
export type {
  RouteBranch,
  BranchEvaluation,
  RouterResult,
} from "./conditional-router";

export {
  ContextMerger,
  contextMerger,
} from "./context-merger";
export type {
  MergeStrategy,
  MergeConfig,
  MergeSource,
  ConflictResolution,
} from "./context-merger";

export {
  Synchronizer,
} from "./synchronizer";
export type {
  SynchronizerConfig,
  SynchronizerResult,
} from "./synchronizer";

export {
  ExecutionStateMachine,
} from "./execution-state-machine";
export type {
  NodeExecutionState,
  StateTransitionDef,
} from "./execution-state-machine";
export {
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  EXECUTING_STATES,
} from "./execution-state-machine";

export {
  ExecutionHistory,
} from "./execution-history";
export type {
  HistoryEntry,
  ExecutionSummary,
  HistorySnapshot,
} from "./execution-history";

export {
  GraphValidator,
  graphValidator,
} from "./graph-validator";
export type {
  ValidationIssue,
  ValidationResult as GraphValidationResult,
} from "./graph-validator";

// ============================================================================
// Execution Loop
// ============================================================================

export {
  ExecutionLoop,
} from "./execution-loop";
export type {
  ExecutionLoopConfig,
} from "./execution-loop";
export {
  DEFAULT_LOOP_CONFIG,
} from "./execution-loop";

// ============================================================================
// Existing Core (backward compatible)
// ============================================================================

export {
  AgentRunner,
  DEFAULT_RUNNER_CONFIG,
} from "./agent-runner";
export type {
  AgentRunner as AgentRunnerInterface,
} from "@/engine/types/agent-types";

export {
  NexusAgentContext,
} from "./agent-context";
export type {
  AgentContextState,
} from "@/engine/types/agent-types";

export {
  AgentChain,
} from "./agent-chain";
export type {
  ChainStep,
  ChainResult,
  ChainStepResult,
  ChainFailureMode,
} from "@/engine/types/agent-types";

export {
  AgentGraph,
  GraphCycleError,
} from "./agent-graph";
export type {
  GraphNode,
  GraphEdge,
  GraphResult,
  GraphNodeResult,
  GraphNodeType,
  RouteBranch as GraphRouteBranch,
} from "@/engine/types/agent-types";

// ============================================================================
// Workflow Engine
// ============================================================================

export {
  WorkflowEngine,
} from "./workflow-engine";
export type {
  WorkflowEngineConfig,
  WorkflowExecutionResult,
  EngineHealth,
} from "./workflow-engine";
export {
  DEFAULT_ENGINE_CONFIG,
} from "./workflow-engine";
