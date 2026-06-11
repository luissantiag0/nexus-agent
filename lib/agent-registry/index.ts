// ============================================================================
// Nexus Agent Platform — Agent Registry Barrel Export
// ============================================================================

// Core type system
export type {
  AgentId,
  SemVer,
  PromptVersion,
  AgentMetadata,
  AgentDomain,
  AgentCapability,
  AgentRequirement,
  AgentInput,
  AgentOutput,
  AgentContext,
  ContextAuditEntry,
  ContextControls,
  AgentAdapter,
  AgentSchema,
  SchemaField,
  SchemaFieldSet,
  AgentContextSchema,
  ContextKey,
  ValidationRule,
  ValidationResult,
  AgentWarning,
  PromptTemplate,
  PromptVariable,
  PromptChangelogEntry,
  ExecutionFlow,
  ExecutionFlowType,
  FlowStep,
} from "./types";

// Registry
export { agentRegistry } from "./registry";

// Infrastructure Maintainer Adapter
export type {
  InfrastructureMaintainerInput,
  InfrastructureMaintainerOutput,
  InfrastructureMaintainerContextKeys,
  SystemMetrics,
  DeploymentStatus,
  AlertEvent,
  ConfigChangeEvent,
  ScalingEvent,
  IncidentReport,
  IncidentTimelineEntry,
  SloTarget,
  CapacityThresholds,
  InfrastructureHealthReport,
  ServiceHealth,
  PerformanceRecommendation,
  RecommendationItem,
  ScalingSuggestion,
  ScalingServiceSuggestion,
  CapacityForecast,
  IncidentAnalysis,
  RootCause,
  ConfigOptimizationProposal,
  ConfigProposal,
} from "./adapters/infrastructure-maintainer";

export { infrastructureMaintainerAdapter } from "./adapters/infrastructure-maintainer";

// Execution Flows
export {
  SINGLE_HEALTH_ANALYSIS_FLOW,
  CHAIN_INFRA_TO_ARCHITECT_FLOW,
  MULTI_AGENT_INCIDENT_RESPONSE_FLOW,
  INFRASTRUCTURE_MAINTAINER_FLOWS,
  createSingleAgentInput,
  createChainFlowContext,
  createMultiAgentInput,
} from "./flows/infrastructure-maintainer-flows";
