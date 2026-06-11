// ============================================================================
// Nexus Agent — @product-manager Agent: Types & Schemas
// ============================================================================
// Defines the input/output contracts for the Product Manager agent adapter.
// Covers discovery, strategy, roadmap, stakeholder alignment, go-to-market,
// and outcome measurement.
// ============================================================================

import type {
  AgentInputBase,
  AgentOutputBase,
  Priority,
  Confidence,
} from "../types";

// ---------------------------------------------------------------------------
// Product-Manager-Specific Enums
// ---------------------------------------------------------------------------

/** Run mode for the PM agent — determines which phase of the lifecycle to execute. */
export enum PmAgentMode {
  PRIORITIZE = "prioritize",
  DEFINE = "define",
  PLAN = "plan",
  ALIGN = "align",
  REVIEW = "review",
  MEASURE = "measure",
}

/** The lifecycle phase a feature is currently in. */
export enum FeatureLifecyclePhase {
  DISCOVERY = "discovery",
  FRAMING = "framing",
  DEFINITION = "definition",
  DELIVERY = "delivery",
  LAUNCHED = "launched",
  MEASURING = "measuring",
  SHIPPED = "shipped",
  DEPRECATED = "deprecated",
}

/** Category of initiative on the roadmap. */
export enum InitiativeCategory {
  NEW_FEATURE = "new_feature",
  ENHANCEMENT = "enhancement",
  TECH_DEBT = "tech_debt",
  PLATFORM = "platform",
  EXPERIMENT = "experiment",
  RESEARCH = "research",
  BUG_FIX = "bug_fix",
  OPERATIONS = "operations",
}

/** Time horizon for roadmap items. */
export enum RoadmapHorizon {
  NOW = "now",
  NEXT = "next",
  LATER = "later",
  ICEBOX = "icebox",
}

/** Prioritisation framework type. */
export enum PriorityFramework {
  RICE = "rice",
  ICE = "ice",
  MOSCOW = "moscow",
  KANO = "kano",
  VALUE_EFFORT = "value_effort",
}

/** OKR key result type. */
export enum KeyResultType {
  METRIC = "metric",
  MILESTONE = "milestone",
  BINARY = "binary",
}

/** Stakeholder alignment status. */
export enum AlignmentStatus {
  APPROVED = "approved",
  CONDITIONALLY_APPROVED = "conditionally_approved",
  PENDING_REVIEW = "pending_review",
  BLOCKED = "blocked",
  DISMISSED = "dismissed",
}

/** GTM launch tier. */
export enum LaunchTier {
  MAJOR = "major",
  STANDARD = "standard",
  SILENT = "silent",
}

// ---------------------------------------------------------------------------
#region Input Types
// ---------------------------------------------------------------------------

/**
 * Input schema for the @product-manager agent.
 * The mode parameter determines which lifecycle phase logic to execute.
 */
export interface ProductManagerInput extends AgentInputBase {
  /** Run mode for this invocation. */
  mode: PmAgentMode;

  // ── Sources from Upstream Agents ─────────────────────────────────────────

  /** Market research & trend analysis from @trend-researcher or equivalent. */
  marketResearch?: MarketResearchInput;

  /** Synthesised user feedback from @feedback-synthesizer, surveys, etc. */
  userFeedback?: UserFeedbackInput;

  /** Business objectives from leadership (OKRs, revenue targets, strategic bets). */
  businessObjectives?: BusinessObjectiveInput;

  /** Stakeholder inputs (sales requests, exec direction, customer calls). */
  stakeholderInputs?: StakeholderInput[];

  /** Resource constraints (engineering capacity, budget, timeline). */
  resourceConstraints?: ResourceConstraintInput;

  /** Experiment results from @growth-hacker or A/B test platforms. */
  experimentResults?: ExperimentResult[];

  /** Support ticket signal from customer service / @support-responder. */
  supportSignal?: SupportSignalInput;

  // ── Backlog / Existing State ─────────────────────────────────────────────

  /** Current feature backlog items to prioritise. */
  featureBacklog?: FeatureBacklogItem[];

  /** Existing product roadmap (used for review/update). */
  existingRoadmap?: ExistingRoadmap;

  /** Current OKR state for measurement mode. */
  currentOkrs?: ObjectiveKeyResult[];

  /** Analytical data (usage metrics, funnel data, cohort retention). */
  analyticsData?: AnalyticsDataInput;
}

// ── Market Research ─────────────────────────────────────────────────────────

export interface MarketResearchInput {
  /** TAM / SAM / SOM sizing. */
  marketSize?: {
    tam: number;
    sam: number;
    som: number;
    currency: string;
    growthRate: number; // CAGR percentage
  };
  /** Competitive intelligence. */
  competitiveLandscape?: CompetitiveIntelligence[];
  /** Emerging trends and weak signals. */
  trends?: TrendSignal[];
  /** Industry analyst reports summary. */
  analystReports?: string;
  /** Source freshness. */
  lastUpdated: string; // ISO-8601
}

export interface CompetitiveIntelligence {
  competitorName: string;
  marketShare?: number;
  strengths: string[];
  weaknesses: string[];
  recentMoves: string[];
  featureComparison: Record<string, "present" | "absent" | "inferior" | "superior">;
}

export interface TrendSignal {
  trend: string;
  confidence: "high" | "medium" | "low";
  impactPotential: number; // 1–10
  timeToMainstream: string; // e.g. "6–12 months"
  sources: string[];
}

// ── User Feedback ───────────────────────────────────────────────────────────

export interface UserFeedbackInput {
  /** Survey scores. */
  nps?: { current: number; trend: "up" | "stable" | "down"; sampleSize: number };
  csat?: { current: number; target: number };
  /** Interview themes. */
  interviewThemes: FeedbackTheme[];
  /** Support ticket analysis. */
  supportTicketVolume: number;
  topComplaintCategories: string[];
  featureRequests: PrioritisedRequest[];
  verbatimQuotes: string[];
}

export interface FeedbackTheme {
  theme: string;
  severity: "pain" | "friction" | "delight" | "opportunity";
  frequency: number; // out of total
  representativeQuote: string;
  evidenceStrength: "strong" | "moderate" | "anecdotal";
}

export interface PrioritisedRequest {
  request: string;
  frequency: number;
  userSegments: string[];
  estimatedValue: "low" | "medium" | "high";
}

// ── Business Objectives ─────────────────────────────────────────────────────

export interface BusinessObjectiveInput {
  okrs: ObjectiveKeyResult[];
  revenueTargets: RevenueTarget[];
  strategicThemes: string[];
  boardDirection?: string;
}

export interface ObjectiveKeyResult {
  objective: string;
  keyResults: KeyResult[];
  owner: string;
  quarter: string;
}

export interface KeyResult {
  label: string;
  type: KeyResultType;
  currentValue?: number;
  targetValue: number;
  measurementUnit: string;
  confidence: number; // 0–100
}

export interface RevenueTarget {
  metric: string; // e.g. "ARR", "Net Revenue Retention"
  currentValue: number;
  targetValue: number;
  timeframe: string; // e.g. "FY2026 Q3"
}

// ── Stakeholder Inputs ──────────────────────────────────────────────────────

export interface StakeholderInput {
  source: string; // e.g. "sales", "ceo", "customer-success"
  request: string;
  rationale: string;
  urgency: "critical" | "high" | "medium" | "low";
  businessValueClaim: string;
  submittedAt: string; // ISO-8601
}

// ── Resource Constraints ────────────────────────────────────────────────────

export interface ResourceConstraintInput {
  /** Available engineering capacity in person-weeks per quarter. */
  totalCapacityPersonWeeks: number;
  /** Allocated by initiative. */
  currentAllocations: ResourceAllocation[];
  /** Budget available for the period. */
  availableBudget?: number;
  /** Key dates (freezes, events, releases). */
  timelineConstraints?: TimelineConstraint[];
}

export interface ResourceAllocation {
  initiative: string;
  personWeeks: number;
  teams: string[];
  startDate: string;
  endDate: string;
}

export interface TimelineConstraint {
  event: string;
  date: string; // ISO-8601
  impact: "blocking" | "warning" | "informational";
}

// ── Experiment Results ──────────────────────────────────────────────────────

export interface ExperimentResult {
  experimentName: string;
  hypothesis: string;
  variant: string;
  control: string;
  metric: string;
  result: "significant_positive" | "significant_negative" | "inconclusive" | "flat";
  confidenceInterval: [number, number];
  pValue: number;
  sampleSize: number;
  durationDays: number;
  recommendation: "ship" | "iterate" | "kill" | "rerun";
}

// ── Support Signal ──────────────────────────────────────────────────────────

export interface SupportSignalInput {
  totalTicketVolume: number;
  ticketTrend: "increasing" | "stable" | "decreasing";
  topCategories: SupportCategory[];
  escalationRate: number; // percentage
  csatScore: number;
  recurringThemeQuotes: string[];
}

export interface SupportCategory {
  name: string;
  volumePercent: number;
  trend: "up" | "stable" | "down";
  estimatedCostPerMonth?: number;
}

// ── Feature Backlog ─────────────────────────────────────────────────────────

export interface FeatureBacklogItem {
  id: string;
  title: string;
  description: string;
  category: InitiativeCategory;
  lifecyclePhase: FeatureLifecyclePhase;
  /** Existing priority scores if any. */
  riceScore?: RiceScore;
  iceScore?: IceScore;
  /** Effort estimate (engineering t-shirt). */
  effortEstimate: "xs" | "s" | "m" | "l" | "xl" | "unknown";
  /** Dependencies. */
  dependencies: string[];
  /** Linked OKR. */
  objectiveAlignment?: string;
  /** Who requested it. */
  requester?: string;
  /** Date entered backlog. */
  enteredAt: string;
}

export interface RiceScore {
  reach: number;  // users per quarter
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  confidence: number; // 0%–100%
  effort: number; // person-months
}

export interface IceScore {
  impact: number;  // 1–10
  confidence: number; // 1–10
  ease: number; // 1–10
}

// ── Existing Roadmap ────────────────────────────────────────────────────────

export interface ExistingRoadmap {
  northStarMetric?: string;
  currentValue?: number;
  targetValue?: number;
  horizonItems: HorizonItem[];
}

export interface HorizonItem {
  initiativeId: string;
  title: string;
  horizon: RoadmapHorizon;
  owner?: string;
  eta?: string;
  successMetric?: string;
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsDataInput {
  activeUsers: { monthly: number; daily: number; weekly: number };
  retentionCohorts: CohortData[];
  funnelStages: FunnelStage[];
  featureAdoption: Record<string, number>; // feature name → adoption %
}

export interface CohortData {
  cohort: string; // e.g. "2026-01"
  retentionRates: number[]; // [D1, D7, D30, D60, D90]
}

export interface FunnelStage {
  stage: string;
  users: number;
  dropOffPercent: number;
}

// ---------------------------------------------------------------------------
#endregion
// ---------------------------------------------------------------------------
#region Output Types
// ---------------------------------------------------------------------------

/**
 * Structured output from the @product-manager agent.
 * The shape varies by mode but all modes share a common base.
 */
export interface ProductManagerOutput extends AgentOutputBase {
  /** Mode that was executed. */
  mode: PmAgentMode;

  // ── Mode-specific output ──────────────────────────────────────────────────

  /** Prioritized features with scores (mode: prioritize). */
  prioritizedFeatures?: PrioritizedFeature[];

  /** Product Requirements Document (mode: define). */
  prd?: ProductRequirementDocument;

  /** Go-to-market plan (mode: plan). */
  goToMarketPlan?: GoToMarketPlan;

  /** Stakeholder alignment summary (mode: align). */
  stakeholderAlignment?: StakeholderAlignmentSummary;

  /** Product roadmap (mode: review / plan). */
  roadmap?: ProductRoadmapOutput;

  /** Outcome measurement report (mode: measure). */
  outcomeReport?: OutcomeMeasurementReport;

  /** Opportunity assessment (any discovery mode). */
  opportunityAssessment?: OpportunityAssessmentOutput;

  /** Sprint health snapshot (mode: review). */
  sprintHealth?: SprintHealthSnapshot;
}

// ── Prioritized Feature ─────────────────────────────────────────────────────

export interface PrioritizedFeature {
  id: string;
  title: string;
  riceScore?: RiceScore;
  riceTotal?: number; // (Reach × Impact × Confidence) ÷ Effort
  iceScore?: IceScore;
  iceTotal?: number; // (Impact × Confidence × Ease)
  framework: PriorityFramework;
  rank: number;
  priority: Priority;
  rationale: string;
  recommendedAction: "build" | "explore" | "defer" | "kill";
}

// ── Product Requirements Document ───────────────────────────────────────────

export interface ProductRequirementDocument {
  title: string;
  version: string;
  status: "draft" | "in_review" | "approved" | "in_development" | "shipped";
  lastUpdated: string;
  stakeholders: string[];

  problemStatement: {
    description: string;
    evidence: ProblemEvidence;
    costOfNotSolving: string;
  };

  goals: GoalDefinition[];
  nonGoals: string[];

  personas: PersonaDefinition[];
  userStories: UserStory[];

  solutionOverview: {
    narrative: string;
    keyDecisions: DesignDecision[];
    designMocksUrl?: string;
  };

  technicalConsiderations: {
    dependencies: Dependency[];
    risks: RiskAssessment[];
    openQuestions: OpenQuestion[];
  };

  launchPlan: LaunchPhase[];
  rollbackCriteria: string;
}

export interface ProblemEvidence {
  userResearch: string;
  behavioralData: string;
  supportSignal: string;
  competitiveSignal: string;
}

export interface GoalDefinition {
  label: string;
  metric: string;
  currentBaseline: number;
  target: number;
  measurementWindow: string;
}

export interface PersonaDefinition {
  name: string;
  context: string;
  archetype: "primary" | "secondary" | "anti";
}

export interface UserStory {
  id: string;
  persona: string;
  action: string;
  outcome: string;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
  type?: "functional" | "performance" | "edge_case";
}

export interface DesignDecision {
  decision: string;
  chosen: string;
  rejected: string;
  rationale: string;
  tradeOff: string;
}

export interface Dependency {
  system: string;
  purpose: string;
  owner: string;
  timelineRisk: "high" | "medium" | "low";
}

export interface RiskAssessment {
  risk: string;
  likelihood: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  mitigation: string;
}

export interface OpenQuestion {
  question: string;
  owner: string;
  deadline: string;
}

export interface LaunchPhase {
  phase: string;
  date: string;
  audience: string;
  successGate: string;
}

// ── Go-to-Market Plan ───────────────────────────────────────────────────────

export interface GoToMarketPlan {
  productName: string;
  launchDate: string;
  launchTier: LaunchTier;
  dri: {
    product: string;
    marketing: string;
    engineering: string;
  };

  valueProposition: {
    oneLiner: string;
    messagingByAudience: MessagingByAudience[];
  };

  targetAudience: TargetAudienceSegment[];

  launchChecklist: LaunchChecklist;

  successCriteria: GtmSuccessCriterion[];

  rollbackPlan: RollbackPlan;
}

export interface MessagingByAudience {
  audience: string;
  painLanguage: string;
  message: string;
  proofPoint: string;
}

export interface TargetAudienceSegment {
  name: string;
  size: number;
  painSolved: string;
  channel: string;
}

export interface LaunchChecklist {
  engineering: string[];
  product: string[];
  marketing: string[];
  sales: string[];
}

export interface GtmSuccessCriterion {
  timeframe: string;
  metric: string;
  target: string | number;
  owner: string;
}

export interface RollbackPlan {
  trigger: string;
  owner: string;
  communicationTemplate: string;
}

// ── Stakeholder Alignment ───────────────────────────────────────────────────

export interface StakeholderAlignmentSummary {
  initiative: string;
  status: AlignmentStatus;
  decisions: AlignmentDecision[];
  stakeholders: StakeholderRecord[];
  blockingIssues: string[];
  nextReview: string; // ISO-8601
}

export interface AlignmentDecision {
  topic: string;
  decision: string;
  rationale: string;
  madeBy: string;
  date: string;
}

export interface StakeholderRecord {
  name: string;
  role: string;
  position: "supports" | "neutral" | "concerned" | "blocks";
  concerns: string[];
  lastEngaged: string;
}

// ── Product Roadmap ─────────────────────────────────────────────────────────

export interface ProductRoadmapOutput {
  northStarMetric: string;
  currentValue: number;
  targetValue: number;
  horizons: RoadmapHorizonSection[];
  deferredItems: DeferredItem[];
}

export interface RoadmapHorizonSection {
  horizon: RoadmapHorizon;
  label: string;
  items: RoadmapInitiative[];
}

export interface RoadmapInitiative {
  id: string;
  title: string;
  userProblem: string;
  successMetric: string;
  owner: string;
  status: string;
  eta: string;
  confidence: "high" | "medium" | "low";
  blocker?: string;
}

export interface DeferredItem {
  request: string;
  source: string;
  reasonForDeferral: string;
  revisitCondition: string;
}

// ── Outcome Measurement ─────────────────────────────────────────────────────

export interface OutcomeMeasurementReport {
  initiative: string;
  launchDate: string;
  measurementPeriodDays: number;
  goalResults: GoalResult[];
  insights: string[];
  recommendations: string[];
  verdict: "on_track" | "missed" | "exceeded" | "inconclusive";
}

export interface GoalResult {
  goal: string;
  metric: string;
  baseline: number;
  target: number;
  actual: number;
  met: boolean;
  notes: string;
}

// ── Opportunity Assessment ──────────────────────────────────────────────────

export interface OpportunityAssessmentOutput {
  title: string;
  whyNow: string;
  userEvidence: {
    interviews: InterviewFinding[];
    behavioralData: string[];
    supportSignal: string[];
  };
  businessCase: {
    revenueImpact: string;
    costImpact: string;
    strategicFit: string;
  };
  riceScore: RiceScore;
  optionsConsidered: OptionConsidered[];
  recommendation: {
    decision: "build" | "explore" | "defer" | "kill";
    rationale: string;
    nextStep: string;
    owner: string;
  };
}

export interface InterviewFinding {
  theme: string;
  quote: string;
  prevalence: string;
}

export interface OptionConsidered {
  option: string;
  pros: string[];
  cons: string[];
  effort: "xs" | "s" | "m" | "l" | "xl";
}

// ── Sprint Health ───────────────────────────────────────────────────────────

export interface SprintHealthSnapshot {
  sprint: string;
  dates: string;
  velocity: SprintVelocity;
  blockers: Blocker[];
  scopeChanges: ScopeChange[];
  risks: string[];
}

export interface SprintVelocity {
  committed: number;
  delivered: number;
  completionPercent: number;
  rollingAverage: number;
}

export interface Blocker {
  issue: string;
  impact: string;
  owner: string;
  eta: string;
}

export interface ScopeChange {
  request: string;
  source: string;
  decision: "accepted" | "deferred" | "rejected";
  rationale: string;
}

// ---------------------------------------------------------------------------
#endregion
// ---------------------------------------------------------------------------
#region Agent Context Keys
// ---------------------------------------------------------------------------

/**
 * Context keys that @product-manager reads from and writes to the shared
 * orchestration context.
 */
export const PRODUCT_MANAGER_CONTEXT_KEYS = {
  READS: [
    "marketResearch",
    "userFeedback",
    "businessObjectives",
    "resourceConstraints",
    "stakeholderInputs",
    "experimentResults",
    "supportSignal",
    "featureBacklog",
    "existingRoadmap",
    "currentOkrs",
    "analyticsData",
  ] as const,

  WRITES: [
    "productRoadmap",
    "prioritizedFeatures",
    "prd",
    "goToMarketPlan",
    "successMetrics",
    "stakeholderAlignment",
  ] as const,
} as const;

export type PmContextReadKey = (typeof PRODUCT_MANAGER_CONTEXT_KEYS.READS)[number];
export type PmContextWriteKey = (typeof PRODUCT_MANAGER_CONTEXT_KEYS.WRITES)[number];

/**
 * Expected shape of each context key written by @product-manager.
 * Downstream agents (engineering, design, growth) consume these.
 */
export interface ProductManagerContextValues {
  /** Full product roadmap with horizon breakdown. */
  productRoadmap: ProductRoadmapOutput;

  /** Prioritised feature list with RICE/ICE scores and ranking. */
  prioritizedFeatures: PrioritizedFeature[];

  /** Product requirements document for a specific initiative. */
  prd: ProductRequirementDocument;

  /** Go-to-market plan for a specific launch. */
  goToMarketPlan: GoToMarketPlan;

  /** Success metrics / OKR definitions for measurement. */
  successMetrics: OutcomeMeasurementReport;

  /** Stakeholder alignment status and decisions. */
  stakeholderAlignment: StakeholderAlignmentSummary;
}

// ---------------------------------------------------------------------------
#endregion
// ---------------------------------------------------------------------------
#region Defaults & Constants
// ---------------------------------------------------------------------------

/** Default RICE scoring factors used when partial data is available. */
export const RICE_DEFAULTS = {
  reach: 100,
  impact: 0.5 as const,
  confidence: 0.5,
  effort: 4, // person-months
} as const;

/** Confidence thresholds for RICE scores. */
export const RICE_CONFIDENCE_THRESHOLDS = {
  high: 0.8,  // ≥80% → high confidence
  medium: 0.5, // ≥50% → medium confidence
} as const;

/** Map of effort t-shirt size to person-months for RICE scoring. */
export const EFFORT_IN_PERSON_MONTHS: Record<string, number> = {
  xs: 0.5,
  s: 1,
  m: 2,
  l: 4,
  xl: 8,
} as const;

/** Maximum acceptable OKR confidence gap (current vs target). */
export const OKR_CONFIDENCE_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
#endregion
