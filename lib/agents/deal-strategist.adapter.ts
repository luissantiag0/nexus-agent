// ============================================================================
// Nexus Agent — @deal-strategist Agent: Types & Schemas
// ============================================================================
// Adapter contract between the Nexus Agent Orchestration Runtime and the
// @deal-strategist agent. Defines input/output schemas, context keys, and
// all supporting types for MEDDPICC-based opportunity qualification,
// competitive positioning, and win planning.
// ============================================================================

import type {
  AgentInputBase,
  AgentOutputBase,
} from "./types";

// ---------------------------------------------------------------------------
// Shared Enums & Primitives
// ---------------------------------------------------------------------------

/**
 * Overall deal verdict after assessment.
 */
export type DealVerdict =
  | "COMMIT"       // High confidence, all MEDDPICC fields strong
  | "BATTLING"     // Winnable with specific gaps to close
  | "VULNERABLE"   // Significant risks identified, needs intervention
  | "AT_RISK"      // Critical gaps, likely lost without major changes
  | "DISQUALIFY";  // Should be removed from pipeline

/**
 * Risk severity level for a deal or individual MEDDPICC element.
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Competitive zone — where we stand relative to a specific competitor on a criterion.
 */
export type CompetitiveZone = "winning" | "battling" | "losing";

/**
 * Access level to the economic buyer.
 */
export type EconomicBuyerAccess = "none" | "identified-only" | "indirect" | "direct" | "executive-sponsor";

/**
 * Stakeholder influence tier within the buying organization.
 */
export type StakeholderInfluence = "decision-maker" | "influencer" | "evaluator" | "user" | "blocker";

/**
 * Stakeholder engagement sentiment toward our solution.
 */
export type StakeholderSentiment = "champion" | "supporter" | "neutral" | "skeptic" | "adversary";

/**
 * Priority level for recommended actions.
 */
export type ActionPriority = "P0" | "P1" | "P2" | "P3";

/**
 * Currency code (ISO 4217).
 */
export type CurrencyCode = "USD" | "EUR" | "GBP" | "BRL" | "ARS" | "MXN" | "CAD" | "AUD" | string;

// ---------------------------------------------------------------------------
// MEDDPICC Input Sub-Types
// ---------------------------------------------------------------------------

export interface MetricsField {
  description: string;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  timeframe?: string;
  validatedByStakeholder: boolean;
}

export interface EconomicBuyerField {
  name: string;
  title: string;
  department?: string;
  accessLevel: EconomicBuyerAccess;
  canReallocateBudget?: boolean;
  lastContactDate?: string;
  verified: boolean;
}

export interface DecisionCriteriaField {
  criteria: Array<{
    name: string;
    weight: number;
    ourPosition: CompetitiveZone | "unknown";
    confirmed: boolean;
  }>;
  source?: string;
}

export interface DecisionProcessField {
  steps: string[];
  expectedDecisionDate?: string;
  approvalsRequired: string[];
  procurementInvolved: boolean;
  validatedWithBuyer: boolean;
}

export interface PaperProcessField {
  legalReviewRequired: boolean;
  securityReviewRequired: boolean;
  dpaRequired: boolean;
  estimatedTimeline?: string;
  initiated: boolean;
  knownBlockers?: string[];
}

export interface IdentifiedPainField {
  description: string;
  quantifiedAnnualCost?: number;
  validatedBy: string[];
  costOfInaction?: string;
  linkedToInitiative?: boolean;
}

export interface ChampionField {
  name: string;
  title: string;
  power: "low" | "medium" | "high";
  access: "low" | "medium" | "high";
  motivation: "low" | "medium" | "high";
  tested: boolean;
  willBrokerEBMeeting?: boolean;
  lastCoachingDate?: string;
}

export interface CompetitionField {
  competitors: Array<{
    name: string;
    type: "direct" | "adjacent" | "internal-build" | "do-nothing" | "incumbent";
    zones: { winning: string[]; battling: string[]; losing: string[] };
    isIncumbent: boolean;
    strength?: number;
  }>;
  confirmedWithBuyer: boolean;
}

export interface ImplementationField {
  expectedTimeline?: string;
  complexity?: "low" | "medium" | "high";
  buyerResourcesRequired?: string[];
  risks?: string[];
  discussed: boolean;
}

export interface ContractField {
  termMonths?: number;
  pricingModel?: string;
  constraints?: string[];
  initiated: boolean;
  expectedSpecialTerms?: string[];
}

/**
 * Comprehensive MEDDPICC input structure with 8 core + 2 extended fields.
 */
export interface MeddpiccInput {
  metrics?: MetricsField;
  economicBuyer?: EconomicBuyerField;
  decisionCriteria?: DecisionCriteriaField;
  decisionProcess?: DecisionProcessField;
  paperProcess?: PaperProcessField;
  identifiedPain?: IdentifiedPainField;
  champion?: ChampionField;
  competition?: CompetitionField;
  /** Extended: Implementation considerations */
  implementation?: ImplementationField;
  /** Extended: Contract / commercial terms */
  contract?: ContractField;
}

// ---------------------------------------------------------------------------
// Stakeholder & Competitive Landscape Types
// ---------------------------------------------------------------------------

export interface StakeholderEntry {
  name: string;
  title: string;
  department?: string;
  influence: StakeholderInfluence;
  sentiment: StakeholderSentiment;
  engaged: boolean;
  lastEngagementDate?: string;
  notes?: string;
  relationshipToChampion?: "ally" | "neutral" | "adversary" | "manager" | "direct-report";
}

export interface CompetitiveLandscape {
  competitors: Array<{
    name: string;
    type: "direct" | "adjacent" | "internal-build" | "do-nothing" | "incumbent";
    strengths: string[];
    weaknesses: string[];
    positioning: CompetitiveZone;
    recommendedTalkTracks?: Record<string, string>;
    recommendedLandmines?: string[];
  }>;
  summary?: string;
}

// ---------------------------------------------------------------------------
// Agent Input Schema
// ---------------------------------------------------------------------------

/**
 * Full input schema for the @deal-strategist agent.
 */
export interface DealStrategistInput extends AgentInputBase {
  /** Opportunity metadata */
  opportunity: {
    name: string;
    value: number;
    displayValue: number;
    currency: CurrencyCode;
    stage: string;
    closeDate: string;
    owner?: string;
    accountName?: string;
    industry?: string;
    region?: string;
  };

  /** MEDDPICC fields — at least 3 should be populated for a valid assessment */
  meddpicc: MeddpiccInput;

  /** Stakeholder map — known contacts in the buying organization */
  stakeholders: StakeholderEntry[];

  /** Competitive landscape — structured competitive intelligence */
  competitiveLandscape: CompetitiveLandscape;

  /** Prompt version to use (defaults to latest if not specified) */
  promptVersion?: string;
}

// ---------------------------------------------------------------------------
// Output Sub-Types
// ---------------------------------------------------------------------------

export interface MeddpiccElementScore {
  score: number;         // 0-5
  evidence: string;
  gap: string;
  rationale?: string;
  recommendedActions?: string[];
}

export interface MeddpiccCompletionMap {
  metrics: MeddpiccElementScore;
  economicBuyer: MeddpiccElementScore;
  decisionCriteria: MeddpiccElementScore;
  decisionProcess: MeddpiccElementScore;
  paperProcess: MeddpiccElementScore;
  identifiedPain: MeddpiccElementScore;
  champion: MeddpiccElementScore;
  competition: MeddpiccElementScore;
  implementation?: MeddpiccElementScore;
  contract?: MeddpiccElementScore;
}

export interface RedFlag {
  category: string;
  description: string;
  severity: RiskLevel;
  mitigation?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  redFlags: RedFlag[];
  earlyWarnings: string[];
  assumptions: string[];
}

export interface WinPlanAction {
  action: string;
  owner: string;
  deadline?: string;
  priority: ActionPriority;
  successCriteria?: string;
}

export interface WinPlan {
  verdict: DealVerdict;
  summary: string;
  actions: WinPlanAction[];
  milestones?: Array<{ milestone: string; targetDate?: string; owner?: string }>;
  exitCriteria: string[];
}

export interface CompetitivePositioningEntry {
  competitor: string;
  positioning: CompetitiveZone;
  talkTracks: Record<string, string>;
  landmineQuestions: string[];
  trapHandling?: Record<string, string>;
}

export interface StakeholderAlignmentEntry {
  name: string;
  influence: StakeholderInfluence;
  sentiment: StakeholderSentiment;
  engagementLevel: "none" | "low" | "medium" | "high";
  recommendedAction?: string;
}

// ---------------------------------------------------------------------------
// Agent Output Schema
// ---------------------------------------------------------------------------

/**
 * Full output schema for the @deal-strategist agent.
 */
export interface DealStrategistOutput extends AgentOutputBase {
  /** Overall deal score 0-100 */
  dealScore: number;

  /** MEDDPICC completion map — per-element scored assessment */
  meddpiccCompletion: MeddpiccCompletionMap;

  /** Aggregate MEDDPICC score (0-40 for 8 core elements at 5 pts each) */
  meddpiccTotalScore: number;

  /** Risk assessment with red flags and early warnings */
  riskAssessment: RiskAssessment;

  /** Win plan with actions, milestones, and exit criteria */
  winPlan: WinPlan;

  /** Per-competitor competitive positioning strategy */
  competitivePositioning: CompetitivePositioningEntry[];

  /** Stakeholder alignment map — influence × sentiment × engagement */
  stakeholderAlignment: StakeholderAlignmentEntry[];

  /** Consolidated recommended next actions (P0-P3) */
  recommendedActions: WinPlanAction[];

  /** Single-word deal verdict */
  verdict: DealVerdict;

  /** Confidence in this assessment (0.0 - 1.0) */
  confidence: number;

  /** Prompt version used to generate this output */
  promptVersionUsed: string;
}

// ---------------------------------------------------------------------------
// Context Keys
// ---------------------------------------------------------------------------

/**
 * Keys that @deal-strategist reads from and writes to AgentContext.
 */
export const DEAL_STRATEGIST_CONTEXT_KEYS = {
  READS: [
    "pipelineRiskFlags",
    "winThemeMatrix",
  ] as const,

  WRITES: [
    "dealScore",
    "meddpiccMap",
    "winPlan",
    "competitivePositioning",
    "stakeholderAlignment",
    "riskAssessment",
    "verdict",
    "recommendedActions",
  ] as const,
} as const;

export type DealStrategistReadKey = (typeof DEAL_STRATEGIST_CONTEXT_KEYS.READS)[number];
export type DealStrategistWriteKey = (typeof DEAL_STRATEGIST_CONTEXT_KEYS.WRITES)[number];

/**
 * Expected shape of each context key written by @deal-strategist.
 */
export interface DealStrategistContextValues {
  /** Numeric deal score 0-100 */
  dealScore: number;

  /** Full MEDDPICC completion map */
  meddpiccMap: MeddpiccCompletionMap;

  /** Win plan with actions, milestones, and exit criteria */
  winPlan: WinPlan;

  /** Per-competitor competitive positioning strategies */
  competitivePositioning: CompetitivePositioningEntry[];

  /** Stakeholder alignment map (influence × sentiment × engagement) */
  stakeholderAlignment: StakeholderAlignmentEntry[];

  /** Overall risk assessment with red flags and warnings */
  riskAssessment: RiskAssessment;

  /** Deal verdict string */
  verdict: DealVerdict;

  /** Consolidated recommended actions */
  recommendedActions: WinPlanAction[];
}

// ---------------------------------------------------------------------------
// Input/Output JSON Schemas (for AgentMetadata, capability discovery, and
// tool-calling UIs)
// ---------------------------------------------------------------------------

/**
 * JSON Schema (draft-07) for the @deal-strategist input.
 */
export const DEAL_STRATEGIST_INPUT_SCHEMA = {
  type: "object" as const,
  required: ["opportunity", "meddpicc", "stakeholders", "competitiveLandscape"],
  properties: {
    opportunity: {
      type: "object" as const,
      required: ["name", "value", "displayValue", "currency", "stage", "closeDate"],
      properties: {
        name: { type: "string" as const, description: "CRM opportunity name" },
        value: { type: "number" as const, description: "Deal value in minor currency units" },
        displayValue: { type: "number" as const, description: "Display value (e.g., 150000)" },
        currency: { type: "string" as const, description: "ISO 4217 currency code" },
        stage: { type: "string" as const, description: "Pipeline stage" },
        closeDate: { type: "string" as const, description: "Expected close date (ISO 8601)" },
        owner: { type: "string" as const, description: "Sales rep owner" },
        accountName: { type: "string" as const, description: "Account / company name" },
        industry: { type: "string" as const, description: "Industry vertical" },
        region: { type: "string" as const, description: "Region" },
      },
    },
    meddpicc: {
      type: "object" as const,
      description: "MEDDPICC qualification data",
      properties: {
        metrics: { type: "object" as const, description: "Quantifiable business outcome" },
        economicBuyer: { type: "object" as const, description: "Budget authority" },
        decisionCriteria: { type: "object" as const, description: "Evaluation criteria with weights" },
        decisionProcess: { type: "object" as const, description: "Decision steps and approvals" },
        paperProcess: { type: "object" as const, description: "Legal, security, procurement" },
        identifiedPain: { type: "object" as const, description: "Quantified business problem" },
        champion: { type: "object" as const, description: "Internal advocate" },
        competition: { type: "object" as const, description: "Competitive landscape" },
        implementation: { type: "object" as const, description: "Implementation considerations" },
        contract: { type: "object" as const, description: "Commercial terms" },
      },
    },
    stakeholders: {
      type: "array" as const,
      description: "Stakeholder map",
      items: { type: "object" as const },
    },
    competitiveLandscape: {
      type: "object" as const,
      description: "Structured competitive intelligence",
    },
    promptVersion: {
      type: "string" as const,
      description: "Prompt version override",
    },
  },
} as const;

/**
 * JSON Schema (draft-07) for the @deal-strategist output.
 */
export const DEAL_STRATEGIST_OUTPUT_SCHEMA = {
  type: "object" as const,
  required: [
    "dealScore", "meddpiccCompletion", "meddpiccTotalScore",
    "riskAssessment", "winPlan", "competitivePositioning",
    "stakeholderAlignment", "recommendedActions", "verdict", "confidence",
  ],
  properties: {
    dealScore: { type: "number" as const, description: "Overall deal score 0-100" },
    meddpiccTotalScore: { type: "number" as const, description: "Aggregate MEDDPICC score 0-40" },
    meddpiccCompletion: { type: "object" as const, description: "Per-element scores" },
    riskAssessment: { type: "object" as const, description: "Risk assessment" },
    winPlan: { type: "object" as const, description: "Win plan" },
    competitivePositioning: {
      type: "array" as const,
      description: "Per-competitor positioning",
    },
    stakeholderAlignment: {
      type: "array" as const,
      description: "Stakeholder alignment map",
    },
    recommendedActions: {
      type: "array" as const,
      description: "Consolidated next actions",
    },
    verdict: {
      type: "string" as const,
      enum: ["COMMIT", "BATTLING", "VULNERABLE", "AT_RISK", "DISQUALIFY"],
      description: "Deal verdict",
    },
    confidence: { type: "number" as const, description: "Assessment confidence 0.0-1.0" },
    promptVersionUsed: { type: "string" as const, description: "Prompt version" },
  },
} as const;
