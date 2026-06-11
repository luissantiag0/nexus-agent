// ============================================================================
// Nexus Agent Platform — Agent Adapter Interfaces
// ============================================================================
// Defines the concrete input/output schemas and context keys for all 18
// agent adapter domains. Each adapter extends AgentAdapter with a specific
// typed contract for its domain.
// ============================================================================

import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentMetadata,
  PortSchema,
} from "@/lib/agents/registry/types";

// ============================================================================
// 1. Backend Architect
// ============================================================================

export interface BackendArchitectInput {
  systemRequirements: string;
  architectureContext: string;
  integrationSpecs: string[];
  performanceRequirements: {
    maxResponseTimeMs: number;
    expectedThroughput: number;
    concurrency: number;
  };
  securityConstraints: string[];
  existingSystemLandscape: string;
  constraints?: string[];
}

export interface BackendArchitectOutput {
  architectureDesignDoc: string;
  apiContracts: Array<{
    service: string;
    contract: string;
    version: string;
  }>;
  dataModels: Array<{
    entity: string;
    schema: string;
    indexes: string[];
  }>;
  deploymentTopology: string;
  integrationPatterns: string[];
  migrationPlan: string;
  securityReview: string;
}

// ============================================================================
// 2. Frontend Developer
// ============================================================================

export interface FrontendDeveloperInput {
  designSpec: string;
  componentDescription: string;
  framework: string;
  stateManagement: string;
  apiEndpoints: string[];
  responsiveBreakpoints: string[];
  accessibilityLevel: "A" | "AA" | "AAA";
}

export interface FrontendDeveloperOutput {
  componentCode: string;
  stylesCode: string;
  testSpec: string;
  storybookStories?: string;
  accessibilityReport: string;
}

// ============================================================================
// 3. Senior Developer
// ============================================================================

export interface SeniorDeveloperInput {
  featureSpec: string;
  codebaseContext: string;
  existingPatterns: string[];
  qualityGates: string[];
  testRequirements: string[];
}

export interface SeniorDeveloperOutput {
  implementation: string;
  testSuite: string;
  documentation: string;
  migrationNotes: string;
  performanceConsiderations: string[];
}

// ============================================================================
// 4. AI Engineer
// ============================================================================

export interface AIEngineerInput {
  modelArchitecture: string;
  trainingDataSpec: string;
  inferenceRequirements: string;
  mlopsConstraints: string[];
  evaluationMetrics: string[];
}

export interface AIEngineerOutput {
  modelCode: string;
  trainingPipeline: string;
  inferenceEndpoint: string;
  evaluationReport: string;
  modelCard: string;
}

// ============================================================================
// 5. DevOps Automator
// ============================================================================

export interface DevOpsAutomatorInput {
  infrastructureSpec: string;
  deploymentTarget: string;
  ciCdRequirements: string[];
  monitoringRequirements: string[];
  complianceFrameworks: string[];
}

export interface DevOpsAutomatorOutput {
  infrastructureCode: string;     // Terraform / Pulumi / CDK
  ciCdPipeline: string;
  monitoringConfig: string;
  backupStrategy: string;
  drPlan: string;
}

// ============================================================================
// 6. Security Engineer
// ============================================================================

export interface SecurityEngineerInput {
  systemArchitecture: string;
  threatModel: string;
  complianceRequirements: string[];
  dataClassification: string;
  existingControls: string[];
}

export interface SecurityEngineerOutput {
  securityAudit: string;
  vulnerabilityReport: string;
  remediationPlan: string;
  securityControls: string[];
  complianceReport: string;
}

// ============================================================================
// 7. Data Engineer
// ============================================================================

export interface DataEngineerInput {
  dataSources: string[];
  dataVolume: string;
  transformationRequirements: string[];
  storageTarget: string;
  freshnessRequirements: string;
}

export interface DataEngineerOutput {
  etlPipeline: string;
  dataModel: string;
  storageSchema: string;
  dataQualityRules: string[];
  lineageDocumentation: string;
}

// ============================================================================
// 8. Site Reliability Engineer
// ============================================================================

export interface SREInput {
  serviceSpec: string;
  sloRequirements: Array<{ metric: string; target: number }>;
  incidentResponsePlan: string;
  capacityPlan: string;
  costConstraints: string[];
}

export interface SREOutput {
  sliDefinitions: string[];
  dashboardConfigs: string[];
  alertingRules: string[];
  runbook: string;
  capacityModel: string;
}

// ============================================================================
// 9. Code Reviewer
// ============================================================================

export interface CodeReviewerInput {
  codeDiff: string;
  repositoryContext: string;
  codingStandards: string[];
  reviewDepth: "light" | "standard" | "deep";
  securityScan: boolean;
}

export interface CodeReviewerOutput {
  reviewSummary: string;
  issues: Array<{
    severity: "critical" | "major" | "minor" | "nit";
    file: string;
    line: number;
    message: string;
    suggestion: string;
  }>;
  securityFindings: string[];
  qualityScore: number;
  approvalRecommendation: "approve" | "changes_requested" | "blocked";
}

// ============================================================================
// 10. UI Designer
// ============================================================================

export interface UiDesignerInput {
  /** High-level creative brief describing the design scope and objectives. */
  designBrief: string;
  /** Brand identity guidelines — color palettes, typography, logos, tone. */
  brandGuidelines: string;
  /** Target platform for the design. */
  platform: "web" | "mobile" | "desktop";
  /** List of components the design system needs to cover. */
  componentNeeds: string[];
  /** WCAG accessibility target level. */
  accessibilityTarget: "A" | "AA" | "AAA";
  /** User persona descriptions for human-centred design. */
  userPersonas: string[];
}

export interface ComponentSpec {
  /** Component display name. */
  name: string;
  /** Purpose and usage description. */
  description: string;
  /** Interactive states (default, hover, active, disabled, focus). */
  states: string[];
  /** Visual variants (primary, secondary, outline, ghost, etc.). */
  variants: string[];
  /** Design token overrides for this component. */
  tokens: Record<string, string>;
}

export interface AccessibilityAudit {
  /** The WCAG level targeted. */
  targetLevel: "A" | "AA" | "AAA";
  /** Numeric compliance score (0–100). */
  score: number;
  /** Accessibility issues found. */
  issues: string[];
  /** Remediation recommendations. */
  recommendations: string[];
}

export interface ResponsiveBreakpoint {
  /** Human-readable breakpoint name (e.g. "mobile", "tablet"). */
  name: string;
  /** Minimum viewport width in pixels. */
  minWidth: number;
  /** Grid column count at this breakpoint. */
  columns: number;
}

export interface UiDesignerOutput {
  /** Comprehensive design system documentation. */
  designSystem: string;
  /** Typed component library with states, variants, and token mappings. */
  componentLibrary: ComponentSpec[];
  /** WCAG accessibility audit with score, issues, and recommendations. */
  accessibilityAudit: AccessibilityAudit;
  /** Design token dictionary — colors, typography, spacing, shadows, etc. */
  designTokens: Record<string, unknown>;
  /** Responsive breakpoint definitions. */
  responsiveBreakpoints: ResponsiveBreakpoint[];
}

// ============================================================================
// 11. UX Architect
// ============================================================================

export interface UXArchitectInput {
  userResearchData: string;
  productSpec: string;
  userFlows: string[];
  usabilityGoals: string[];
  technicalConstraints: string[];
}

export interface UXArchitectOutput {
  userJourneyMaps: string;
  informationArchitecture: string;
  wireframes: string;
  interactionDesign: string;
  usabilityReport: string;
}

// ============================================================================
// 12. Brand Guardian
// ============================================================================

export interface BrandGuardianInput {
  brandIdentity: string;
  contentToReview: string;
  channelContext: string;
  brandVoice: string;
  visualGuidelines: string;
}

export interface BrandGuardianOutput {
  brandConsistencyReport: string;
  recommendedChanges: string[];
  toneAnalysis: string;
  visualCompliance: string;
  brandRiskAssessment: string;
}

// ============================================================================
// 13. Content Creator
// ============================================================================

export interface ContentCreatorInput {
  contentBrief: string;
  targetAudience: string;
  channel: string;
  brandVoice: string;
  seoKeywords: string[];
  contentFormat: string;
}

export interface ContentCreatorOutput {
  content: string;
  headlineVariants: string[];
  metaDescription: string;
  contentType: string;
  contentStrategy: string;
}

// ============================================================================
// 14. SEO Specialist
// ============================================================================

export interface SEOSpecialistInput {
  websiteContent: string;
  targetKeywords: string[];
  competitorUrls: string[];
  technicalSeoData: string;
  currentRankings: string;
}

export interface SEOSpecialistOutput {
  seoAudit: string;
  keywordStrategy: string;
  technicalRecommendations: string[];
  contentOptimizationPlan: string;
  linkBuildingStrategy: string;
}

// ============================================================================
// 15. Product Manager
// ============================================================================

export interface ProductManagerInput {
  marketResearch: string;
  userFeedback: string;
  businessGoals: string[];
  technicalConstraints: string[];
  stakeholderInput: string;
}

export interface ProductManagerOutput {
  productSpec: string;
  userStories: string[];
  roadmap: string;
  kpiDefinitions: string[];
  prioritizationMatrix: string;
}

// ============================================================================
// 16. Project Manager
// ============================================================================

export interface ProjectManagerInput {
  projectSpec: string;
  teamComposition: string;
  timelineConstraints: string;
  resourceAvailability: string;
  riskRegister: string[];
}

export interface ProjectManagerOutput {
  taskList: string;
  milestones: string[];
  resourcePlan: string;
  riskMitigationPlan: string;
  progressTrackers: string[];
}

// ============================================================================
// 17. API Tester
// ============================================================================

export interface APITesterInput {
  apiSpec: string;
  endpoints: string[];
  testScenarios: string[];
  environmentConfig: string;
  authMethod: string;
}

export interface APITesterOutput {
  testResults: string;
  coverageReport: string;
  performanceBenchmarks: string;
  securityFindings: string[];
  regressionTestSuite: string;
}

// ============================================================================
// 18. Agents Orchestrator
// ============================================================================

export interface AgentsOrchestratorInput {
  pipelineSpec: string;
  agentAssignments: Array<{
    task: string;
    agentType: string;
    contextKeys: string[];
  }>;
  qualityGates: Array<{
    phase: string;
    criteria: string[];
    requiredEvidence: string[];
  }>;
  failureHandling: {
    maxRetries: number;
    escalationPath: string[];
    fallbackStrategy: string;
  };
}

export interface AgentsOrchestratorOutput {
  pipelineResult: string;
  phaseResults: Array<{
    phase: string;
    status: "completed" | "failed" | "skipped";
    agentOutputs: string[];
    qualityMetrics: Record<string, number>;
  }>;
  qualityReport: string;
  completionSummary: string;
  artifacts: string[];
}

// ============================================================================
// Adapter Registry — Map of all adapter IDs to their I/O types
// ============================================================================

/**
 * Union of all adapter input types for discriminated routing.
 */
export type AdapterInputMap = {
  "backend-architect": BackendArchitectInput;
  "frontend-developer": FrontendDeveloperInput;
  "senior-developer": SeniorDeveloperInput;
  "ai-engineer": AIEngineerInput;
  "devops-automator": DevOpsAutomatorInput;
  "security-engineer": SecurityEngineerInput;
  "data-engineer": DataEngineerInput;
  "sre": SREInput;
  "code-reviewer": CodeReviewerInput;
  "ui-designer": UiDesignerInput;
  "ux-architect": UXArchitectInput;
  "brand-guardian": BrandGuardianInput;
  "content-creator": ContentCreatorInput;
  "seo-specialist": SEOSpecialistInput;
  "product-manager": ProductManagerInput;
  "project-manager": ProjectManagerInput;
  "api-tester": APITesterInput;
  "agents-orchestrator": AgentsOrchestratorInput;
  "pipeline-analyst": PipelineAnalystInput;
  "recruitment-specialist": RecruitmentInput;
};

/**
 * Union of all adapter output types.
 */
export type AdapterOutputMap = {
  "backend-architect": BackendArchitectOutput;
  "frontend-developer": FrontendDeveloperOutput;
  "senior-developer": SeniorDeveloperOutput;
  "ai-engineer": AIEngineerOutput;
  "devops-automator": DevOpsAutomatorOutput;
  "security-engineer": SecurityEngineerOutput;
  "data-engineer": DataEngineerOutput;
  "sre": SREOutput;
  "code-reviewer": CodeReviewerOutput;
  "ui-designer": UiDesignerOutput;
  "ux-architect": UXArchitectOutput;
  "brand-guardian": BrandGuardianOutput;
  "content-creator": ContentCreatorOutput;
  "seo-specialist": SEOSpecialistOutput;
  "product-manager": ProductManagerOutput;
  "project-manager": ProjectManagerOutput;
  "api-tester": APITesterOutput;
  "agents-orchestrator": AgentsOrchestratorOutput;
  "pipeline-analyst": PipelineAnalystOutput;
  "recruitment-specialist": RecruitmentOutput;
};

/**
 * Adapter ID type — a string literal union of all 18 adapter identifiers.
 */
export type AdapterId = keyof AdapterInputMap & keyof AdapterOutputMap;

/**
 * Discriminated union of all adapter input types keyed by adapterType.
 */
export type AnyAdapterInput = {
  [K in AdapterId]: { adapterType: K; payload: AdapterInputMap[K] };
}[AdapterId];

/**
 * Discriminated union of all adapter output types keyed by adapterType.
 */
export type AnyAdapterOutput = {
  [K in AdapterId]: { adapterType: K; payload: AdapterOutputMap[K] };
}[AdapterId];
