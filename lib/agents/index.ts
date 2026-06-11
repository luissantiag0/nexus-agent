// ============================================================================
// Nexus Agent Platform — Agent Registry Barrel Exports
// ============================================================================
// Central export point for all agent registry types, adapters, validators,
// and prompt templates.
// ============================================================================

// ---------------------------------------------------------------------------
// Core Registry Types (lib/agents/types.ts)
// ---------------------------------------------------------------------------
export type {
  SemVer,
  AgentInputBase,
  AgentOutputBase,
  AgentError,
  AgentStatus,
  AgentContext,
  JsonSchema,
  AgentCapability,
  AgentMetadata as BaseAgentMetadata,
  AgentAdapter as BaseAgentAdapter,
  AgentExecutionRequest,
  AgentExecutionResponse,
  ExecutionMetrics,
  ValidationResult as BaseValidationResult,
  ValidationError as BaseValidationError,
  ValidationWarning as BaseValidationWarning,
} from "./types";

// ---------------------------------------------------------------------------
// Enhanced Registry Types (lib/agents/registry/types.ts)
// ---------------------------------------------------------------------------
export type {
  PortSchema,
  ValidationError,
  ValidationResult,
  ValidationRule,
  AgentMetadata,
  EnhancedAgentAdapter,
  AgentRegistry,
} from "./registry/types";

export { CONTEXT } from "./registry/types";

// ---------------------------------------------------------------------------
// UI Designer Adapter
// ---------------------------------------------------------------------------
export type {
  UiDesignerInput,
  UiDesignerOutput,
  DesignBrief,
  BrandGuidelines,
  UxRequirements,
  UserPersona,
  ComponentNeed,
  TargetPlatform,
  AccessibilityTarget,
  ColorPalette,
  ColorSwatch,
  TypographyScale,
  TypographyScaleEntry,
  SpacingGrid,
  ShadowSystem,
  ResponsiveFramework,
  ResponsiveBreakpoint,
  ComponentDefinition,
  ComponentLibrary,
  DesignTokenExports,
  AccessibilityAudit,
} from "./registry/ui-designer";

export {
  uiDesignerAdapter,
  UI_DESIGNER_INPUT_SCHEMA,
  UI_DESIGNER_OUTPUT_SCHEMA,
  UI_DESIGNER_READS,
  UI_DESIGNER_WRITES,
  UI_DESIGNER_VALIDATORS,
  wcagColorContrastRule,
  touchTargetSizeRule,
  responsiveBreakpointCoverageRule,
  designTokenConsistencyRule,
  typographyScaleSufficiencyRule,
  interactiveStatesCompletenessRule,
} from "./registry/ui-designer";

// ---------------------------------------------------------------------------
// Validation Rules (also available from ui-designer exports above)
// ---------------------------------------------------------------------------
export {
  validateUiDesignerOutput,
} from "./validation/ui-designer-rules";

// ---------------------------------------------------------------------------
// Growth Hacker Adapter
// ---------------------------------------------------------------------------
export type {
  GrowthHackerInput,
  GrowthHackerOutput,
  GrowthHackerContextKeys,
  AarrrFunnelMetrics,
  ProductSpec,
  UserSegment,
  ChannelPerformance,
  ExperimentRecord,
  CompetitorGrowthTactic,
  GrowthExperimentDesign,
  ChannelPriority,
  ViralLoopDesign,
  FunnelOptimization,
  ExperimentTrackingPlan,
} from "./adapters/growth-hacker.adapter";

export {
  GrowthHackerAdapter,
  FunnelStage,
  GrowthChannel,
  ExperimentStatus,
  ViralLoopType,
  SignificanceLevel,
  GROWTH_HACKER_DEFAULTS,
  STATISTICAL_SIGNIFICANCE_THRESHOLDS,
  CHANNEL_BUDGET_LIMITS,
  FUNNEL_CONSISTENCY_RULES,
  FUNNEL_METRIC_BOUNDARIES,
  validateFunnelConsistency,
  validateBudgetConstraints,
  validateExperimentParameters,
  validateGrowthHackerInput,
} from "./adapters/growth-hacker.adapter";
