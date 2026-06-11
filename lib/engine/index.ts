// ============================================================================
// Nexus Agent — Engine Module
// ============================================================================
// Barrel exports for the AgentGraph / AgentChain execution engine.
// ============================================================================

// --- AgentGraph (DAG) Model ---
export type {
  NodeId,
  EdgeId,
  AgentName,
  GraphNode,
  AgentNode,
  ConditionalRouter,
  ParallelFork,
  Synchronizer,
  StartNode,
  EndNode,
  SubworkflowNode,
  GraphEdge,
  EdgeType,
  ConditionExpression,
  ComparisonOperator,
  ConditionValue,
  RouteTarget,
  ExecutionPolicy,
  RetryBackoffStrategy,
  ContextMapping,
  ContextTransform,
  TransformType,
  AgentGraph,
  WorkflowMetadata,
  CycleDetectionResult,
  TopologicalSortResult,
  ParallelBranch,
  JoinPolicy,
  MergeStrategy,
} from "./agent-graph";

export {
  detectCycles,
  topologicalSort,
  getPredecessors,
  getSuccessors,
  getPredecessorsWithEdges,
  toDOT,
} from "./agent-graph";

// --- AgentChain Model ---
export type {
  ChainId,
  StepId,
  ChainStatus,
  StepStatus,
  AgentChain,
  ChainStep,
  ChainErrorPolicy,
  RetryConfig,
  SuccessPolicy,
  StepFailurePolicy,
  ValidationRule,
  ValidationType,
  ContextContract,
  SkipCondition,
  ChainExecutionState,
  StepExecutionRecord,
  ChainError,
  ChainErrorCode,
  StepError,
  StepErrorCode,
  ExecutionTraceEntry,
  TraceEntryType,
  ChainCheckpoint,
  ChainValidationResult,
  ChainValidationIssue,
} from "./agent-chain";

export {
  ChainBuilder,
  createChain,
  calculateChainBudget,
  validateChain,
} from "./agent-chain";

// --- Workflow Definition ---
export type {
  WorkflowDefinition,
  WorkflowMeta,
  GraphDefinition,
  NodeDefinition,
  AgentNodeDefinition,
  ConditionalRouterDefinition,
  ParallelForkDefinition,
  SynchronizerDefinition,
  SubworkflowNodeDefinition,
  EdgeDefinition,
  ConditionExpressionDefinition,
  ComparisonCondition,
  CompoundCondition,
  RouteDefinition,
  ParallelBranchDefinition,
  MergeStrategyDefinition,
  ContextMappingDefinition,
  ContextTransformDefinition,
  SharedNodeDefinition,
  ChainDefinition,
  ChainStepDefinition,
  RetryDefinition,
  SkipConditionDefinition,
  ContractDefinition,
  WorkflowCompilationResult,
  CompilationError,
  CompilationWarning,
  ValidationResult,
  ValidationIssue,
} from "./workflow-definition";

export {
  parseConditionExpression,
  validateDefinition,
  compileToGraph,
} from "./workflow-definition";

// --- Context Propagation ---
export type {
  ContextHistoryEntry,
  ContextApplyError,
  ContextApplyResult,
  ContextValidationResult,
  ContextValidationIssue,
} from "./context-propagation";

export {
  AgentContext,
  applyTransform,
  getByPath,
  setByPath,
  deleteByPath,
  validateContext,
  ContextError,
  ContextExtractionError,
} from "./context-propagation";

// --- Error Types ---
export type {
  EngineErrorCode,
  ErrorSeverity,
} from "./errors";

export {
  EngineError,
  GraphCycleError,
  NodeNotFoundError,
  NodeTimeoutError,
  AgentExecutionError,
  ChainStepError,
  ChainDeadlineError,
  ParallelBranchError,
  WorkflowNotFoundError,
  WorkflowValidationError,
  ContextValidationError,
  isRetryable,
  classifyError,
  TRANSIENT_ERROR_CODES,
  CONFIGURATION_ERROR_CODES,
  SECURITY_ERROR_CODES,
  OVERLOAD_ERROR_CODES,
} from "./errors";
