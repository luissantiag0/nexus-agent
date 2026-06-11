// ============================================================================
// Recruitment Specialist — Agent Adapter Interface
// ============================================================================
// Nexus Agent Orchestration Runtime — Agent Registry Contract
// Defines the input/output schemas, context keys, lifecycle hooks, and
// the AgentRunner-compatible IAgentAdapter implementation for the
// recruitment-specialist agent.
// ============================================================================

import type { AgentResult } from "@/engine/types/agent-types";

// ---------------------------------------------------------------------------
// Enums & Literal Unions
// ---------------------------------------------------------------------------

/** Supported hiring platforms for sourcing */
export type SourcingChannel =
  | 'boss-zhipin'
  | 'lagou'
  | 'liepin'
  | 'zhaopin'
  | '51job'
  | 'maimai'
  | 'linkedin-china'
  | 'employee-referral'
  | 'headhunter'
  | 'campus-recruitment'
  | 'career-page';

/** Current stage of a candidate in the pipeline */
export type PipelineStage =
  | 'sourced'
  | 'applied'
  | 'screening'
  | 'phone-screen'
  | 'technical-interview'
  | 'onsite-interview'
  | 'reference-check'
  | 'offer-pending'
  | 'offer-extended'
  | 'offer-accepted'
  | 'onboarded'
  | 'rejected'
  | 'withdrawn';

/** Assessment dimension categories */
export type AssessmentDimension =
  | 'technical-skill'
  | 'domain-knowledge'
  | 'problem-solving'
  | 'system-design'
  | 'communication'
  | 'leadership'
  | 'cultural-fit'
  | 'collaboration'
  | 'execution'
  | 'learning-ability';

/** Severity level for compliance flags */
export type ComplianceSeverity = 'critical' | 'warning' | 'info';

/** Contract types per China Labor Law */
export type ContractType =
  | 'fixed-term'
  | 'open-ended'
  | 'project-based';

/** Employment level classification */
export type PositionLevel =
  | 'intern'
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c-level';

// ---------------------------------------------------------------------------
// AgentInput — Everything the agent needs to start a recruitment task
// ---------------------------------------------------------------------------

/**
 * Full input schema accepted by the recruitment-specialist agent.
 */
export interface RecruitmentAgentInput {
  /** The job requisition being recruited for */
  jobRequisition: JobRequisition;

  /** Structured role requirements derived from the JD and hiring manager intake */
  roleRequirements: RoleRequirements;

  /** Context about the hiring manager and team dynamics */
  hiringManagerContext: HiringManagerContext;

  /** Live candidate pipeline data (optional — for pipeline health analysis) */
  candidatePipeline?: CandidatePipeline;

  /** Sourcing channels to use with budget and priority configuration */
  sourcingChannels: SourcingChannelConfig[];

  /** Assessment criteria for evaluating candidates */
  assessmentCriteria: AssessmentCriteria;

  /** Compliance ruleset to apply (jurisdiction-specific) */
  complianceRequirements: ComplianceRequirements;
}

/** A single job opening requisition */
export interface JobRequisition {
  /** Unique identifier for the requisition (e.g., REQ-2026-0042) */
  id: string;

  /** Official job title */
  title: string;

  /** Department / business unit owning the hire */
  department: string;

  /** Reporting manager's name */
  reportingTo: string;

  /** Position level */
  level: PositionLevel;

  /** Whether this is a backfill or new headcount */
  type: 'backfill' | 'new-headcount' | 'replacement' | 'contract';

  /** Number of openings */
  headcount: number;

  /** Target start date (YYYY-MM-DD) */
  targetStartDate: string;

  /** Location (city / remote / hybrid) */
  location: string;

  /** Approved salary band (monthly CNY) */
  salaryBand: SalaryBand;

  /** Requisition status */
  status: 'draft' | 'open' | 'paused' | 'filled' | 'cancelled';

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  filledBy?: string;
}

export interface SalaryBand {
  min: number;       // Monthly CNY minimum
  max: number;       // Monthly CNY maximum
  currency: 'CNY' | 'USD';
  includesEquity: boolean;
  equityRange?: string;
  signingBonus?: number;
  annualBonusTarget?: number; // percentage of base salary
}

/**
 * Structured role requirements decomposed from the job description.
 */
export interface RoleRequirements {
  /** Must-have technical skills (non-negotiable) */
  mustHaveSkills: string[];

  /** Nice-to-have skills (differentiators) */
  niceToHaveSkills: string[];

  /** Minimum years of experience required */
  minimumYearsExperience: number;

  /** Required education level */
  minimumEducation: 'none' | 'associate' | 'bachelor' | 'master' | 'phd';

  /** Preferred education disciplines */
  preferredMajors: string[];

  /** Language requirements */
  languageRequirements: LanguageRequirement[];

  /** Certifications required */
  requiredCertifications: string[];

  /** Industry experience preferences */
  preferredIndustries: string[];

  /** Target companies for poaching (if any) */
  targetCompanies?: string[];

  /** Any specific domain knowledge required */
  domainExpertise?: string[];

  /** Leadership / soft skill requirements */
  softSkillRequirements: SoftSkillRequirement[];
}

export interface LanguageRequirement {
  language: string;       // e.g., "Chinese", "English"
  proficiency: 'basic' | 'conversational' | 'business' | 'fluent' | 'native';
  required: boolean;
}

export interface SoftSkillRequirement {
  skill: string;          // e.g., "cross-team collaboration"
  importance: 'critical' | 'important' | 'preferred';
  behavioralIndicator?: string; // example behavior that demonstrates this skill
}

/**
 * Context about the hiring manager and team to calibrate screening.
 */
export interface HiringManagerContext {
  /** Hiring manager's name */
  name: string;

  /** Their title */
  title: string;

  /** Communication preferences for interview feedback */
  feedbackPreference: 'async-written' | 'sync-meeting' | 'scorecard-only';

  /** How quickly they typically review candidates */
  responseTimeExpectationHours: number;

  /** Any known biases or preferences to be aware of */
  knownPreferences?: string[];

  /** Team dynamics information */
  teamContext?: TeamContext;
}

export interface TeamContext {
  /** Current team size */
  currentSize: number;

  /** Team composition */
  composition: string[];

  /** What the team is struggling with */
  painPoints: string[];

  /** Team culture description */
  cultureDescription: string;

  /** Working style preferences */
  workingStyle: 'remote-first' | 'office-first' | 'hybrid';
}

/**
 * Live candidate pipeline data for analysis.
 */
export interface CandidatePipeline {
  /** All candidates in the pipeline */
  candidates: CandidateProfile[];

  /** Aggregate pipeline metrics */
  metrics: PipelineMetrics;
}

export interface CandidateProfile {
  id: string;
  name: string;                   // Can be anonymized for privacy
  currentStage: PipelineStage;
  source: SourcingChannel;
  appliedDate: string;
  lastActivityDate: string;
  resumeUrl?: string;
  parsedSkills: string[];
  yearsOfExperience: number;
  currentCompany?: string;
  currentTitle?: string;
  education: Education[];
  assessmentScores?: AssessmentScore[];
  complianceFlags?: ComplianceFlag[];
  notes: string[];
}

export interface Education {
  institution: string;
  degree: string;
  major: string;
  graduationYear: number;
}

export interface AssessmentScore {
  dimension: AssessmentDimension;
  score: number;        // 0-100 normalized
  weight: number;       // Weight for composite calculation (0.0-1.0)
  assessedBy: string;   // Evaluator name or 'ai-screening'
  assessedAt: string;
  notes?: string;
}

export interface ComplianceFlag {
  severity: ComplianceSeverity;
  category: string;
  description: string;
  ruleReference: string;
  suggestedAction: string;
}

export interface PipelineMetrics {
  totalCandidates: number;
  activeCandidates: number;
  rejectedCandidates: number;
  averageDaysInStage: number;
  bottleneckStage: PipelineStage | null;
  offerAcceptanceRate: number;
}

/**
 * Sourcing channel configuration with budget allocation.
 */
export interface SourcingChannelConfig {
  channel: SourcingChannel;
  /** Whether this channel is active */
  enabled: boolean;
  /** Monthly budget for this channel (CNY) */
  monthlyBudget: number;
  /** Priority — lower number = higher priority */
  priority: number;
  /** Specific configuration per channel */
  config?: Record<string, unknown>;
  /** Target positions to use this channel for */
  targetPositionLevels: PositionLevel[];
}

/**
 * Assessment criteria for evaluating candidates.
 */
export interface AssessmentCriteria {
  /** Dimensions to assess with weights */
  dimensions: DimensionWeight[];

  /** Passing threshold (0-100) for the composite score */
  passingThreshold: number;

  /** Whether a phone screen is required before technical assessment */
  phoneScreenRequired: boolean;

  /** Number of interview rounds */
  interviewRounds: number;

  /** Whether a take-home assignment is required */
  takeHomeAssignment: boolean;

  /** Whether reference checks are required */
  referenceCheckRequired: boolean;

  /** Whether background check is required */
  backgroundCheckRequired: boolean;

  /** Technical assessment platform to use */
  technicalAssessmentPlatform?: 'niuke' | 'leetcode' | 'hackerrank' | 'custom';

  /** Types of interview questions to generate */
  questionTypes: ('behavioral-star' | 'technical' | 'case-study' | 'leaderless-group' | 'portfolio-review')[];

  /** Group interview configuration (if applicable) */
  groupInterviewConfig?: GroupInterviewConfig;
}

export interface DimensionWeight {
  dimension: AssessmentDimension;
  weight: number;       // 0.0-1.0, must sum to 1.0
  minimumScore?: number; // If the candidate must clear a minimum
}

export interface GroupInterviewConfig {
  candidatesPerGroup: number;
  durationMinutes: number;
  topics: string[];
  observerRoles: string[];
}

/**
 * Compliance requirements based on China labor law.
 */
export interface ComplianceRequirements {
  jurisdiction: 'china-mainland' | 'china-hong-kong' | 'global';

  /** City-specific regulations (Beijing, Shanghai, Shenzhen, etc.) */
  city: string;

  /** Whether non-compete screening is required */
  nonCompeteScreening: boolean;

  /** Whether social insurance (五险一金) enrollment is handled */
  socialInsuranceHandling: boolean;

  /** Required contract type */
  contractType: ContractType;

  /** Probation period max months (capped by law) */
  probationMaxMonths: number;

  /** Whether mass layoff notification rules apply */
  massLayoffThreshold: number; // 0 = not applicable

  /** Whether the position is subject to foreigner work permit rules */
  foreignerWorkPermitRequired: boolean;

  /** Whether to run the compliance checklist */
  runComplianceChecklist: boolean;

  /** Additional compliance notes */
  specialRequirements?: string[];
}

// ---------------------------------------------------------------------------
// AgentOutput — Everything the agent produces
// ---------------------------------------------------------------------------

/**
 * Full output schema produced by the recruitment-specialist agent.
 */
export interface RecruitmentAgentOutput {
  /** Shortlisted candidates with ranking and rationale */
  candidateShortlist: CandidateShortlistEntry[];

  /** Normalized assessment scores across all evaluated candidates */
  assessmentScores: CandidateAssessmentResult[];

  /** Generated interview questions and scoring rubrics */
  interviewQuestions: InterviewQuestionSet[];

  /** Offer recommendations for selected candidates */
  offerRecommendations: OfferRecommendation[];

  /** Optimized sourcing strategy with channel allocation */
  sourcingStrategy: SourcingStrategyOutput;

  /** Compliance checklist results */
  complianceChecklist: ComplianceChecklistResult;

  /** Pipeline health analysis and recommendations */
  pipelineHealth: PipelineHealthReport;

  /** Execution metadata */
  metadata: AgentExecutionMetadata;
}

export interface CandidateShortlistEntry {
  candidateId: string;
  candidateName: string;
  rank: number;
  compositeScore: number;     // 0-100 normalized
  matchBreakdown: {
    skillMatch: number;       // percentage
    experienceMatch: number;  // percentage
    cultureFit: number;       // score 0-100
    overallFit: number;       // score 0-100
  };
  strengths: string[];
  risks: string[];
  recommendation: 'strong-proceed' | 'proceed' | 'hold' | 'reject';
  rationale: string;
}

export interface CandidateAssessmentResult {
  candidateId: string;
  candidateName: string;
  dimensionScores: {
    dimension: AssessmentDimension;
    score: number;
    weight: number;
  }[];
  compositeScore: number;
  passed: boolean;
  assessorNotes: string;
}

export interface InterviewQuestionSet {
  round: number;
  roundName: string;
  questions: InterviewQuestion[];
  totalDurationMinutes: number;
  focusAreas: string[];
}

export interface InterviewQuestion {
  id: string;
  type: 'behavioral-star' | 'technical' | 'case-study' | 'leaderless-group' | 'portfolio-review';
  question: string;                   // The question prompt
  dimension: AssessmentDimension;     // What this assesses
  difficulty: 'basic' | 'intermediate' | 'advanced';
  expectedDurationMinutes: number;
  scoringCriteria: ScoringCriterion[];
  followUpPrompts?: string[];         // Probing follow-ups
  idealResponseIndicators?: string[]; // What a good answer contains
}

export interface ScoringCriterion {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  behavioralAnchor: string;
}

export interface OfferRecommendation {
  candidateId: string;
  candidateName: string;
  recommendedSalary: RecommendedSalary;
  equityRecommendation?: string;
  startDate: string;
  probationPeriodMonths: number;
  contractType: ContractType;
  signingBonusRecommendation?: number;
  approvalWorkflow: string[];
  risks: string[];
  competitiveContext: string;
}

export interface RecommendedSalary {
  baseMonthly: number;
  annualBonusTarget: number;
  totalAnnualCompensation: number;   // 12 × base + bonus
  marketP50: number;                 // Market 50th percentile
  marketP75: number;                 // Market 75th percentile
  positioning: 'below-market' | 'at-market' | 'above-market' | 'premium';
  rationale: string;
}

export interface SourcingStrategyOutput {
  channelAllocation: {
    channel: SourcingChannel;
    budgetPercent: number;
    expectedApplications: number;
    expectedQualityScore: number;
    recommendation: string;
  }[];
  totalBudgetMonthly: number;
  expectedTotalApplications: number;
  optimizedStrategy: string;
  passiveCandidateOutreachPlan?: string;
  employerBrandingActions: string[];
}

export interface ComplianceChecklistResult {
  overallStatus: 'pass' | 'conditional-pass' | 'fail';
  items: ComplianceChecklistItem[];
  summary: string;
}

export interface ComplianceChecklistItem {
  id: string;
  category: string;
  description: string;
  status: 'compliant' | 'at-risk' | 'non-compliant' | 'not-applicable';
  severity: ComplianceSeverity;
  regulation: string;
  actionRequired?: string;
  owner?: string;
  deadline?: string;
}

export interface PipelineHealthReport {
  overallHealth: 'healthy' | 'warning' | 'critical';
  metrics: {
    totalActive: number;
    averageStageDuration: number;
    bottleneckStage: string | null;
    offerAcceptanceRate: number;
    candidateDropOffRate: number;
    averageScoreToHire: number;
  };
  stageBreakdown: {
    stage: PipelineStage;
    count: number;
    averageDaysInStage: number;
    conversionToNext: number;
  }[];
  recommendations: string[];
}

export interface AgentExecutionMetadata {
  agentVersion: string;
  promptVersion: string;
  executionTimestamp: string;
  processingTimeMs: number;
  dataSources: string[];
  validationPassed: boolean;
  validationErrors: string[];
}

// ---------------------------------------------------------------------------
// AgentContext — Shared state keys stored in the orchestration runtime
// ---------------------------------------------------------------------------

/**
 * Context keys that the recruitment-specialist agent reads from and writes to
 * the shared orchestration context.
 */
export interface RecruitmentAgentContext {
  /** Full job requisition details */
  jobRequisition: JobRequisition;

  /** Live candidate pipeline state */
  candidatePipeline: CandidatePipeline;

  /** Normalized assessment scores */
  assessmentScores: Map<string, CandidateAssessmentResult>;

  /** Active sourcing strategy */
  sourcingStrategy: SourcingStrategyOutput;

  /** Current compliance status across all candidates */
  complianceStatus: ComplianceChecklistResult;

  /** Pending offer recommendations */
  offerRecommendations: OfferRecommendation[];

  /** Generated interview question sets */
  interviewQuestions: InterviewQuestionSet[];

  /** Hiring manager context for the current process */
  hiringManagerContext: HiringManagerContext;
}

// ---------------------------------------------------------------------------
// Lifecycle Hook Interfaces
// ---------------------------------------------------------------------------

/**
 * Lifecycle hooks the orchestration runtime calls on the agent.
 */
export interface RecruitmentAgentHooks {
  /** Called when a new requisition is assigned */
  onRequisitionAssigned(requisition: JobRequisition): Promise<void>;

  /** Called when a candidate advances to a new stage */
  onCandidateStageChange(
    candidateId: string,
    from: PipelineStage,
    to: PipelineStage,
  ): Promise<void>;

  /** Called before an offer is extended (compliance gate) */
  preOfferGate(
    candidateId: string,
    offer: OfferRecommendation,
  ): Promise<{ approved: boolean; blockers: string[] }>;

  /** Called when a candidate is rejected */
  onCandidateRejected(candidateId: string, reason: string): Promise<void>;

  /** Called periodically for pipeline health sync */
  onPipelineSync(pipeline: CandidatePipeline): Promise<PipelineHealthReport>;
}

// ---------------------------------------------------------------------------
// Validation Rule Interfaces
// ---------------------------------------------------------------------------

/**
 * Configuration for validation rules that the agent must enforce.
 */
export interface ValidationRuleSet {
  candidateQualificationMatching: CandidateQualificationRule;
  complianceChecklistCompleteness: ComplianceCompletenessRule;
  assessmentScoreNormalization: ScoreNormalizationRule;
}

export interface CandidateQualificationRule {
  /** Must meet at least this percentage of must-have skills */
  mustHaveSkillThreshold: number;           // e.g., 0.7 = 70%

  /** Years of experience tolerance (years below requirement) */
  experienceToleranceYears: number;         // e.g., 1

  /** Whether education requirement is strict or flexible */
  educationRequirementEnforced: 'strict' | 'flexible' | 'waived';

  /** Whether language requirements are strictly enforced */
  languageRequirementEnforced: 'strict' | 'flexible';

  /** Minimum overall fit score to proceed (0-100) */
  minimumFitScore: number;                  // e.g., 60
}

export interface ComplianceCompletenessRule {
  /** Must check all mandatory compliance items */
  requireAllMandatoryItems: boolean;

  /** Maximum number of allowed 'at-risk' items before failing */
  maxAtRiskItems: number;                   // e.g., 2

  /** Whether non-compete screening is mandatory */
  nonCompeteScreeningMandatory: boolean;

  /** Whether background check must be complete before offer */
  backgroundCheckBeforeOffer: boolean;

  /** Whether social insurance registration must be initiated */
  socialInsuranceCheckRequired: boolean;
}

export interface ScoreNormalizationRule {
  /** Normalization method */
  method: 'z-score' | 'min-max' | 'percentile' | 'none';

  /** Whether to apply weight adjustments */
  weightAdjustmentEnabled: boolean;

  /** Outlier handling strategy */
  outlierHandling: 'clip' | 'remove' | 'winsorize' | 'keep';

  /** Whether to round final scores */
  roundToNearest: 0.5 | 1 | 5 | 10 | null;

  /** Whether dimension minimums are enforced */
  enforceDimensionMinimums: boolean;
}

// ---------------------------------------------------------------------------
// Default Exports
// ---------------------------------------------------------------------------

/** The recruitment specialist agent adapter identifier */
export const AGENT_ID = 'recruitment-specialist';

/** Supported prompt versions */
export const SUPPORTED_PROMPT_VERSIONS = [
  'recruitment-specialist.v1.prompt.yaml',
] as const;

export type PromptVersion = typeof SUPPORTED_PROMPT_VERSIONS[number];

/** Default validation rules for the recruitment agent */
export const DEFAULT_VALIDATION_RULES: ValidationRuleSet = {
  candidateQualificationMatching: {
    mustHaveSkillThreshold: 0.7,
    experienceToleranceYears: 1,
    educationRequirementEnforced: 'flexible',
    languageRequirementEnforced: 'strict',
    minimumFitScore: 60,
  },
  complianceChecklistCompleteness: {
    requireAllMandatoryItems: true,
    maxAtRiskItems: 2,
    nonCompeteScreeningMandatory: true,
    backgroundCheckBeforeOffer: true,
    socialInsuranceCheckRequired: true,
  },
  assessmentScoreNormalization: {
    method: 'min-max',
    weightAdjustmentEnabled: true,
    outlierHandling: 'winsorize',
    roundToNearest: 1,
    enforceDimensionMinimums: true,
  },
};

// ============================================================================
// AgentRunner IAgentAdapter — Recruitment Specialist
// ============================================================================
// The interfaces below define the simplified IAgentAdapter contract that the
// AgentRunner system uses to invoke the recruitment-specialist agent.
// ============================================================================

// ---------------------------------------------------------------------------
// Context Key Constants
// ---------------------------------------------------------------------------

/** Context keys that the recruitment-specialist agent reads from shared state */
export const READ_CONTEXT_KEYS = [
  "teamStructure",
  "hiringManagerContext",
  "openPositions",
] as const;

/** Context keys that the recruitment-specialist agent writes to shared state */
export const WRITE_CONTEXT_KEYS = [
  "jobRequisition",
  "candidatePipeline",
  "assessmentScores",
  "sourcingStrategy",
  "complianceStatus",
] as const;

export type ReadContextKey = typeof READ_CONTEXT_KEYS[number];
export type WriteContextKey = typeof WRITE_CONTEXT_KEYS[number];

// ---------------------------------------------------------------------------
// RecruitmentInput — Simplified input schema for the AgentRunner
// ---------------------------------------------------------------------------

/**
 * Input payload for the recruitment-specialist agent.
 */
export interface RecruitmentInput {
  /** The job requisition being recruited for */
  jobRequisition: JobRequisition;

  /** Structured role requirements derived from the JD */
  roleRequirements: RoleRequirements;

  /** Live candidate pipeline entries */
  candidatePipeline: CandidateProfile[];

  /** Assessment criteria for evaluating candidates */
  assessmentCriteria: AssessmentCriteria;

  /** Compliance ruleset to apply (China labor law jurisdiction) */
  complianceRequirements: ComplianceRequirements;
}

// ---------------------------------------------------------------------------
// RecruitmentOutput — Simplified output schema for the AgentRunner
// ---------------------------------------------------------------------------

/**
 * Output payload produced by the recruitment-specialist agent.
 */
export interface RecruitmentOutput {
  /** Shortlisted candidates with ranking, fit scores, and recommendation */
  candidateShortlist: CandidateShortlistEntry[];

  /** Normalized assessment scores across all evaluated candidates */
  assessmentScores: CandidateAssessmentResult[];

  /** Generated interview questions with scoring rubrics per round */
  interviewQuestions: InterviewQuestionSet[];

  /** Offer recommendation for the selected candidate */
  offerRecommendation: OfferRecommendation;

  /** Optimised sourcing strategy with channel allocation and ROI */
  sourcingStrategy: SourcingStrategyOutput;

  /** Compliance checklist status (pass / conditional-pass / fail) */
  complianceStatus: ComplianceChecklistResult;
}

// ---------------------------------------------------------------------------
// IAgentAdapter — Generic adapter interface for the AgentRunner
// ---------------------------------------------------------------------------

/**
 * Generic adapter contract that every agent must implement for the
 * AgentRunner system.
 */
export interface IAgentAdapter<TInput, TOutput> {
  /** Canonical agent identifier (e.g. "recruitment-specialist") */
  readonly agentId: string;

  /** Semantic version of this adapter implementation */
  readonly version: string;

  /** Context keys this agent reads from the shared orchestration context */
  readonly readsContextKeys: readonly string[];

  /** Context keys this agent writes to the shared orchestration context */
  readonly writesContextKeys: readonly string[];

  /**
   * Validate the input payload against schema and business rules.
   * Returns validation errors/warnings. The runner will reject execution
   * if validation fails with errors.
   */
  validate(input: TInput): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   - The validated input payload.
   * @param context - The shared orchestration context (AgentContext).
   * @returns       - An AgentResult wrapping the typed output.
   */
  execute(
    input: TInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<TOutput>>;
}

// ---------------------------------------------------------------------------
// RecruitmentSpecialistAdapter — AgentRunner implementation
// ---------------------------------------------------------------------------

/**
 * Adapter implementation for the recruitment-specialist agent.
 *
 * Validates recruitment inputs (job requisition, role requirements,
 * candidate pipeline) and executes talent acquisition logic to produce
 * candidate shortlists, assessment scores, interview questions, offer
 * recommendations, sourcing strategies, and compliance checks.
 */
export class RecruitmentSpecialistAdapter
  implements IAgentAdapter<RecruitmentInput, RecruitmentOutput>
{
  readonly agentId = "recruitment-specialist";
  readonly version = "1.0.0";

  readonly readsContextKeys: readonly string[] = READ_CONTEXT_KEYS;
  readonly writesContextKeys: readonly string[] = WRITE_CONTEXT_KEYS;

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validate that the input contains a non-empty job requisition, present
   * role requirements, and a non-empty candidate pipeline.
   */
  validate(input: RecruitmentInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ── jobRequisition checks ──────────────────────────────────────────

    if (!input.jobRequisition) {
      errors.push({
        field: "jobRequisition",
        message: "jobRequisition is required",
        severity: "error",
      });
    } else {
      if (!input.jobRequisition.id || input.jobRequisition.id.trim().length === 0) {
        errors.push({
          field: "jobRequisition.id",
          message: "jobRequisition.id must be non-empty",
          severity: "error",
        });
      }
      if (!input.jobRequisition.title || input.jobRequisition.title.trim().length === 0) {
        errors.push({
          field: "jobRequisition.title",
          message: "jobRequisition.title must be non-empty",
          severity: "error",
        });
      }
      if (!input.jobRequisition.department || input.jobRequisition.department.trim().length === 0) {
        errors.push({
          field: "jobRequisition.department",
          message: "jobRequisition.department must be non-empty",
          severity: "error",
        });
      }
      if (input.jobRequisition.headcount < 1) {
        errors.push({
          field: "jobRequisition.headcount",
          message: "jobRequisition.headcount must be at least 1",
          severity: "error",
        });
      }
      if (!input.jobRequisition.salaryBand || input.jobRequisition.salaryBand.max <= 0) {
        errors.push({
          field: "jobRequisition.salaryBand",
          message: "jobRequisition.salaryBand must specify a valid max salary",
          severity: "error",
        });
      }
    }

    // ── roleRequirements checks ────────────────────────────────────────

    if (!input.roleRequirements) {
      errors.push({
        field: "roleRequirements",
        message: "roleRequirements is required",
        severity: "error",
      });
    } else {
      if (
        !input.roleRequirements.mustHaveSkills ||
        input.roleRequirements.mustHaveSkills.length === 0
      ) {
        errors.push({
          field: "roleRequirements.mustHaveSkills",
          message: "At least one mustHaveSkill is required",
          severity: "error",
        });
      }
      if (input.roleRequirements.minimumYearsExperience < 0) {
        errors.push({
          field: "roleRequirements.minimumYearsExperience",
          message: "minimumYearsExperience must be >= 0",
          severity: "error",
        });
      }
      if (
        input.roleRequirements.languageRequirements &&
        input.roleRequirements.languageRequirements.length > 0
      ) {
        const missingProficiency = input.roleRequirements.languageRequirements.find(
          (l) => !l.language || !l.proficiency,
        );
        if (missingProficiency) {
          errors.push({
            field: "roleRequirements.languageRequirements",
            message: `Language requirement missing language or proficiency: ${JSON.stringify(missingProficiency)}`,
            severity: "error",
          });
        }
      }
    }

    // ── candidatePipeline checks ───────────────────────────────────────

    if (!input.candidatePipeline || input.candidatePipeline.length === 0) {
      errors.push({
        field: "candidatePipeline",
        message: "candidatePipeline must be a non-empty array",
        severity: "error",
      });
    } else {
      for (let i = 0; i < input.candidatePipeline.length; i++) {
        const c = input.candidatePipeline[i];
        if (!c.id) {
          errors.push({
            field: `candidatePipeline[${i}].id`,
            message: `Candidate at index ${i} is missing id`,
            severity: "error",
          });
        }
        if (!c.currentStage) {
          errors.push({
            field: `candidatePipeline[${i}].currentStage`,
            message: `Candidate "${c.id || i}" is missing currentStage`,
            severity: "error",
          });
        }
        if (c.yearsOfExperience < 0) {
          errors.push({
            field: `candidatePipeline[${i}].yearsOfExperience`,
            message: `Candidate "${c.id || i}" has negative yearsOfExperience`,
            severity: "error",
          });
        }
      }
    }

    // ── assessmentCriteria checks ──────────────────────────────────────

    if (!input.assessmentCriteria) {
      errors.push({
        field: "assessmentCriteria",
        message: "assessmentCriteria is required",
        severity: "error",
      });
    } else {
      if (
        !input.assessmentCriteria.dimensions ||
        input.assessmentCriteria.dimensions.length === 0
      ) {
        errors.push({
          field: "assessmentCriteria.dimensions",
          message: "At least one assessment dimension is required",
          severity: "error",
        });
      } else {
        const totalWeight = input.assessmentCriteria.dimensions.reduce(
          (sum, d) => sum + d.weight,
          0,
        );
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          warnings.push({
            field: "assessmentCriteria.dimensions",
            message: `Dimension weights sum to ${totalWeight.toFixed(2)}, expected 1.0`,
            severity: "warning",
          });
        }
      }

      if (input.assessmentCriteria.interviewRounds < 1) {
        errors.push({
          field: "assessmentCriteria.interviewRounds",
          message: "At least 1 interview round is required",
          severity: "error",
        });
      }
    }

    // ── complianceRequirements checks ──────────────────────────────────

    if (!input.complianceRequirements) {
      errors.push({
        field: "complianceRequirements",
        message: "complianceRequirements is required",
        severity: "error",
      });
    } else {
      if (!input.complianceRequirements.jurisdiction) {
        errors.push({
          field: "complianceRequirements.jurisdiction",
          message: "complianceRequirements.jurisdiction is required",
          severity: "error",
        });
      }
      if (!input.complianceRequirements.city || input.complianceRequirements.city.trim().length === 0) {
        errors.push({
          field: "complianceRequirements.city",
          message: "complianceRequirements.city is required",
          severity: "error",
        });
      }
      if (
        input.complianceRequirements.probationMaxMonths < 0 ||
        input.complianceRequirements.probationMaxMonths > 6
      ) {
        warnings.push({
          field: "complianceRequirements.probationMaxMonths",
          message:
            "Probation period should be between 0 and 6 months per China labor law (劳动合同法)",
          severity: "warning",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================================================
  // Execute
  // ========================================================================

  /**
   * Execute the recruitment-specialist agent.
   *
   * Orchestrates candidate screening → assessment scoring → interview
   * question generation → offer recommendation → sourcing strategy →
   * compliance checklist. In production this delegates to the LLM with the
   * full recruitment system prompt. This stub returns a template result.
   */
  async execute(
    input: RecruitmentInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<RecruitmentOutput>> {
    const startedAt = new Date();

    // ── Resolve context dependencies ───────────────────────────────────
    const teamStructure: unknown = context["teamStructure"];
    const hiringManagerCtx: unknown = context["hiringManagerContext"];
    const openPositions: unknown = context["openPositions"];

    // ── Build candidate shortlist (top-N ranked by composite score) ────
    const candidateShortlist: CandidateShortlistEntry[] =
      input.candidatePipeline.map((candidate, idx) => {
        const skillMatch = this.computeSkillMatch(
          candidate.parsedSkills,
          input.roleRequirements.mustHaveSkills,
        );
        const experienceMatch = this.computeExperienceMatch(
          candidate.yearsOfExperience,
          input.roleRequirements.minimumYearsExperience,
        );
        const cultureFit = this.computeCultureFit(candidate, hiringManagerCtx);
        const overallFit = Math.round(
          skillMatch * 0.4 + experienceMatch * 0.3 + cultureFit * 0.3,
        );

        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          rank: idx + 1,
          compositeScore: overallFit,
          matchBreakdown: {
            skillMatch,
            experienceMatch,
            cultureFit,
            overallFit,
          },
          strengths: this.identifyStrengths(candidate, input.roleRequirements),
          risks: this.identifyRisks(candidate, input.complianceRequirements),
          recommendation:
            overallFit >= 80
              ? "strong-proceed"
              : overallFit >= 60
                ? "proceed"
                : overallFit >= 40
                  ? "hold"
                  : "reject",
          rationale: `Skill match ${skillMatch}%, experience match ${experienceMatch}%, culture fit ${cultureFit}/100.`,
        };
      }).sort((a, b) => b.compositeScore - a.compositeScore)
       .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // ── Build assessment scores ────────────────────────────────────────
    const assessmentScores: CandidateAssessmentResult[] =
      input.candidatePipeline.map((candidate) => {
        const dimensionScores = input.assessmentCriteria.dimensions.map((dim) => ({
          dimension: dim.dimension,
          score: this.scoreDimension(candidate, dim.dimension),
          weight: dim.weight,
        }));
        const compositeScore = Math.round(
          dimensionScores.reduce((sum, ds) => sum + ds.score * ds.weight, 0),
        );
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          dimensionScores,
          compositeScore,
          passed: compositeScore >= input.assessmentCriteria.passingThreshold,
          assessorNotes: `Auto-scored via ${input.assessmentCriteria.dimensions.length} dimensions.`,
        };
      });

    // ── Generate interview questions ───────────────────────────────────
    const interviewQuestions: InterviewQuestionSet[] =
      this.generateInterviewQuestions(input);

    // ── Build offer recommendation (top candidate) ─────────────────────
    const topCandidate = candidateShortlist[0];
    const topAssessment = assessmentScores.find(
      (a) => a.candidateId === topCandidate?.candidateId,
    );

    const offerRecommendation = this.buildOfferRecommendation(
      input,
      topCandidate,
      topAssessment,
    );

    // ── Build sourcing strategy ────────────────────────────────────────
    const sourcingStrategy = this.buildSourcingStrategy(input);

    // ── Build compliance checklist ─────────────────────────────────────
    const complianceStatus = this.buildComplianceChecklist(input);

    // ── Assemble output ────────────────────────────────────────────────
    const output: RecruitmentOutput = {
      candidateShortlist,
      assessmentScores,
      interviewQuestions,
      offerRecommendation,
      sourcingStrategy,
      complianceStatus,
    };

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    return {
      executionId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      agentId: this.agentId as import("@/lib/agents/registry/types").AgentId,
      status: "completed",
      data: output,
      error: null,
      errorDetails: null,
      validation: null,
      performance: {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        retryCount: 0,
      },
      meta: {
        candidatesEvaluated: input.candidatePipeline.length,
        teamStructureAvailable: !!teamStructure,
        hiringManagerContextAvailable: !!hiringManagerCtx,
        openPositionsAvailable: !!openPositions,
      },
    };
  }

  // ========================================================================
  // Private Helpers — Scoring Heuristics
  // ========================================================================

  /** Compute skill match percentage between candidate skills and must-haves. */
  private computeSkillMatch(
    candidateSkills: string[],
    mustHaveSkills: string[],
  ): number {
    if (mustHaveSkills.length === 0) return 100;
    const normalized = candidateSkills.map((s) => s.toLowerCase());
    const matched = mustHaveSkills.filter((req) =>
      normalized.some(
        (cs) => cs.includes(req.toLowerCase()) || req.toLowerCase().includes(cs),
      ),
    ).length;
    return Math.round((matched / mustHaveSkills.length) * 100);
  }

  /** Compute experience match percentage. */
  private computeExperienceMatch(
    candidateYears: number,
    requiredYears: number,
  ): number {
    if (requiredYears <= 0) return 100;
    return Math.min(100, Math.round((candidateYears / requiredYears) * 100));
  }

  /** Compute culture fit score (heuristic based on available signals). */
  private computeCultureFit(
    candidate: CandidateProfile,
    _hiringManagerCtx: unknown,
  ): number {
    // Placeholder — in production this evaluates working style alignment,
    // team composition fit, and hiring manager preferences.
    return 70;
  }

  /** Identify candidate strengths relative to requirements. */
  private identifyStrengths(
    candidate: CandidateProfile,
    requirements: RoleRequirements,
  ): string[] {
    const strengths: string[] = [];
    const matched = requirements.mustHaveSkills.filter((req) =>
      candidate.parsedSkills.some(
        (cs) =>
          cs.toLowerCase().includes(req.toLowerCase()) ||
          req.toLowerCase().includes(cs.toLowerCase()),
      ),
    );
    if (matched.length > 0) {
      strengths.push(`Matches ${matched.length}/${requirements.mustHaveSkills.length} must-have skills`);
    }
    if (candidate.yearsOfExperience >= requirements.minimumYearsExperience) {
      strengths.push(`${candidate.yearsOfExperience} years of experience meets minimum`);
    }
    return strengths;
  }

  /** Identify candidate risks. */
  private identifyRisks(
    candidate: CandidateProfile,
    compliance: ComplianceRequirements,
  ): string[] {
    const risks: string[] = [];
    if (candidate.yearsOfExperience < 1) {
      risks.push("Limited professional experience");
    }
    if (compliance.nonCompeteScreening && !candidate.currentCompany) {
      risks.push("Current employer unknown — non-compete screening may be required");
    }
    return risks;
  }

  /** Score a candidate on a given assessment dimension (0–100). */
  private scoreDimension(
    candidate: CandidateProfile,
    dimension: AssessmentDimension,
  ): number {
    const existing = candidate.assessmentScores?.find(
      (s) => s.dimension === dimension,
    );
    if (existing) return existing.score;

    // Fallback heuristic based on available signals
    switch (dimension) {
      case "technical-skill":
        return Math.min(100, candidate.yearsOfExperience * 15 + 20);
      case "domain-knowledge":
        return candidate.parsedSkills.length > 0 ? 65 : 40;
      case "problem-solving":
        return 60;
      case "communication":
        return 70;
      case "cultural-fit":
        return 65;
      case "collaboration":
        return 70;
      case "execution":
        return 60;
      case "learning-ability":
        return 75;
      default:
        return 50;
    }
  }

  /** Generate interview question sets per round. */
  private generateInterviewQuestions(input: RecruitmentInput): InterviewQuestionSet[] {
    const rounds: InterviewQuestionSet[] = [];
    const { assessmentCriteria, roleRequirements } = input;

    for (let round = 1; round <= assessmentCriteria.interviewRounds; round++) {
      const roundName = this.getRoundName(round);
      const questions: InterviewQuestion[] = [];

      const type = round === 1
        ? "behavioral-star"
        : round === 2 && assessmentCriteria.technicalAssessmentPlatform
          ? "technical"
          : "behavioral-star";

      for (let q = 0; q < 3; q++) {
        const dimension = assessmentCriteria.dimensions[q % assessmentCriteria.dimensions.length].dimension;
        questions.push({
          id: `q-${round}-${q + 1}`,
          type,
          question: this.generateQuestionPrompt(round, dimension, roleRequirements),
          dimension,
          difficulty: round <= 1 ? "basic" : round === 2 ? "intermediate" : "advanced",
          expectedDurationMinutes: 10,
          scoringCriteria: [
            { level: 1, label: "Below Expectation", description: "Lacks fundamental understanding", behavioralAnchor: "Unable to articulate relevant experience" },
            { level: 3, label: "Meets Expectation", description: "Demonstrates solid competence", behavioralAnchor: "Provides specific examples with measurable outcomes" },
            { level: 5, label: "Exceeds Expectation", description: "Deep expertise with strategic insight", behavioralAnchor: "Connects experience to business impact and teaches others" },
          ],
        });
      }

      rounds.push({
        round,
        roundName,
        questions,
        totalDurationMinutes: questions.reduce((sum, q) => sum + q.expectedDurationMinutes, 0),
        focusAreas: assessmentCriteria.dimensions.map((d) => d.dimension),
      });
    }

    return rounds;
  }

  /** Get human-readable round name. */
  private getRoundName(round: number): string {
    switch (round) {
      case 1: return "Phone Screen / Initial Fit";
      case 2: return "Technical Assessment";
      case 3: return "Hiring Manager / Cross-functional";
      case 4: return "Executive / Final Round";
      default: return `Round ${round}`;
    }
  }

  /** Generate a question prompt template. */
  private generateQuestionPrompt(
    round: number,
    dimension: AssessmentDimension,
    roleRequirements: RoleRequirements,
  ): string {
    const skillContext =
      roleRequirements.mustHaveSkills.length > 0
        ? roleRequirements.mustHaveSkills.slice(0, 3).join(", ")
        : "relevant domain";

    if (dimension === "technical-skill") {
      return `Describe a project where you used ${skillContext}. Walk through the architecture, key decisions, and trade-offs you made.`;
    }
    if (dimension === "leadership") {
      return "Tell me about a time you led a team through a difficult challenge. How did you align the team, handle conflict, and drive results?";
    }
    if (dimension === "problem-solving") {
      return `Give an example of a complex problem you solved involving ${skillContext}. What was your approach, what alternatives did you consider, and what was the outcome?`;
    }
    if (dimension === "cultural-fit") {
      return "Describe the team environment where you do your best work. What values, practices, and dynamics help you thrive?";
    }
    return `Tell me about a time you demonstrated ${dimension.replace(/-/g, " ")}. What was the situation, what actions did you take, and what was the result?`;
  }

  /** Build offer recommendation for the top candidate. */
  private buildOfferRecommendation(
    input: RecruitmentInput,
    topCandidate: CandidateShortlistEntry | undefined,
    topAssessment: CandidateAssessmentResult | undefined,
  ): OfferRecommendation {
    if (!topCandidate || !topAssessment) {
      return {
        candidateId: "none",
        candidateName: "No qualified candidate",
        recommendedSalary: {
          baseMonthly: 0,
          annualBonusTarget: 0,
          totalAnnualCompensation: 0,
          marketP50: 0,
          marketP75: 0,
          positioning: "at-market",
          rationale: "No candidate met the passing threshold.",
        },
        startDate: input.jobRequisition.targetStartDate,
        probationPeriodMonths: Math.min(
          input.complianceRequirements.probationMaxMonths,
          6,
        ),
        contractType: input.complianceRequirements.contractType,
        approvalWorkflow: [
          input.jobRequisition.reportingTo,
          "HR Business Partner",
          "Compensation & Benefits",
        ],
        risks: ["No viable candidate shortlisted"],
        competitiveContext: "Market data unavailable — no candidate selected.",
      };
    }

    const baseMonthly = Math.round(
      input.jobRequisition.salaryBand.min +
        (input.jobRequisition.salaryBand.max - input.jobRequisition.salaryBand.min) *
          (topCandidate.compositeScore / 100),
    );
    const bonusTarget = input.jobRequisition.salaryBand.annualBonusTarget ?? 15;
    const marketP50 = Math.round(input.jobRequisition.salaryBand.min * 1.1);
    const marketP75 = Math.round(input.jobRequisition.salaryBand.max * 0.95);

    return {
      candidateId: topCandidate.candidateId,
      candidateName: topCandidate.candidateName,
      recommendedSalary: {
        baseMonthly,
        annualBonusTarget: bonusTarget,
        totalAnnualCompensation: baseMonthly * 12 + Math.round(baseMonthly * 12 * bonusTarget / 100),
        marketP50,
        marketP75,
        positioning: baseMonthly >= marketP75 ? "above-market" : baseMonthly >= marketP50 ? "at-market" : "below-market",
        rationale: `Offer positioned at ${baseMonthly >= marketP75 ? "above" : baseMonthly >= marketP50 ? "at" : "below"} market based on composite score of ${topCandidate.compositeScore}/100.`,
      },
      startDate: input.jobRequisition.targetStartDate,
      probationPeriodMonths: Math.min(
        input.complianceRequirements.probationMaxMonths,
        6,
      ),
      contractType: input.complianceRequirements.contractType,
      approvalWorkflow: [
        input.jobRequisition.reportingTo,
        "HR Business Partner",
        "Compensation & Benefits",
        ...(baseMonthly > input.jobRequisition.salaryBand.max
          ? ["VP of People", "Finance Director"]
          : []),
      ],
      risks: topCandidate.risks,
      competitiveContext: `Market P50: ¥${(marketP50 * 12).toLocaleString()} annual, P75: ¥${(marketP75 * 12).toLocaleString()} annual.`,
    };
  }

  /** Build optimized sourcing strategy. */
  private buildSourcingStrategy(input: RecruitmentInput): SourcingStrategyOutput {
    return {
      channelAllocation: [
        {
          channel: "boss-zhipin",
          budgetPercent: 35,
          expectedApplications: 120,
          expectedQualityScore: 70,
          recommendation: "Primary channel for active job seekers — optimize job cards with targeted keywords.",
        },
        {
          channel: "liepin",
          budgetPercent: 25,
          expectedApplications: 40,
          expectedQualityScore: 85,
          recommendation: "Best for mid-to-senior passive candidates — leverage headhunter network.",
        },
        {
          channel: "employee-referral",
          budgetPercent: 20,
          expectedApplications: 15,
          expectedQualityScore: 90,
          recommendation: "Highest quality and retention — increase referral bonus for this role.",
        },
        {
          channel: "linkedin-china",
          budgetPercent: 10,
          expectedApplications: 20,
          expectedQualityScore: 75,
          recommendation: "Target returnees and foreign enterprise candidates.",
        },
        {
          channel: "maimai",
          budgetPercent: 10,
          expectedApplications: 25,
          expectedQualityScore: 72,
          recommendation: "Content-driven employer branding to attract passive candidates.",
        },
      ],
      totalBudgetMonthly: 15000,
      expectedTotalApplications: 220,
      optimizedStrategy: `Allocate 35% budget to Boss Zhipin for volume, 25% to Liepin for quality mid-senior pipeline, 20% to referral program, and 10% each to LinkedIn China and Maimai for passive engagement.`,
      employerBrandingActions: [
        "Publish employee testimonials on Maimai (脉脉) to boost employer reputation",
        "Optimize company page on Boss Zhipin with detailed benefits and growth opportunities",
        "Share technical content on Zhihu (知乎) to attract skilled professionals",
      ],
    };
  }

  /** Build compliance checklist result. */
  private buildComplianceChecklist(input: ComplianceRequirements): ComplianceChecklistResult {
    const items: ComplianceChecklistItem[] = [];

    items.push({
      id: "comp-001",
      category: "Contract Type",
      description: `Contract type must be "${input.contractType}" per requisition requirements`,
      status: "compliant",
      severity: "info",
      regulation: "劳动合同法 (Labor Contract Law) — Art. 12-14",
    });

    items.push({
      id: "comp-002",
      category: "Probation Period",
      description: `Probation period must not exceed ${input.probationMaxMonths} months`,
      status: input.probationMaxMonths <= 6 ? "compliant" : "non-compliant",
      severity: input.probationMaxMonths <= 6 ? "info" : "critical",
      regulation: "劳动合同法 — Art. 19",
      actionRequired: input.probationMaxMonths > 6
        ? "Reduce probation period to maximum 6 months per law"
        : undefined,
    });

    items.push({
      id: "comp-003",
      category: "Social Insurance",
      description: `${input.city} social insurance (五险一金) enrollment must be completed within 30 days of start`,
      status: input.socialInsuranceHandling ? "compliant" : "at-risk",
      severity: "warning",
      regulation: "社会保险法 (Social Insurance Law) — Art. 58",
      actionRequired: input.socialInsuranceHandling
        ? undefined
        : "Setup social insurance registration process before onboarding",
    });

    if (input.nonCompeteScreening) {
      items.push({
        id: "comp-004",
        category: "Non-Compete Screening",
        description: "Verify candidates are not subject to active non-compete restrictions (竞业限制)",
        status: "at-risk",
        severity: "warning",
        regulation: "劳动合同法 — Art. 23-24",
        actionRequired: "Request candidate declaration and review prior employment agreements",
      });
    }

    items.push({
      id: "comp-005",
      category: "Background Check",
      description: "Education and employment verification for all shortlisted candidates",
      status: "at-risk",
      severity: "info",
      regulation: "个人信息保护法 (PIPL) — Consent required for background checks",
      actionRequired: "Obtain written candidate authorization before initiating background check",
    });

    items.push({
      id: "comp-006",
      category: "Contract Signing Deadline",
      description: "Written labor contract must be signed within 30 days of onboarding",
      status: "compliant",
      severity: "warning",
      regulation: "劳动合同法 — Art. 10 (double wages if unsigned after 30 days)",
    });

    const criticalNonCompliant = items.filter(
      (i) => i.severity === "critical" && i.status === "non-compliant",
    );
    const atRiskCount = items.filter((i) => i.status === "at-risk").length;

    return {
      overallStatus:
        criticalNonCompliant.length > 0
          ? "fail"
          : atRiskCount > input.maxAtRiskItems
            ? "conditional-pass"
            : "pass",
      items,
      summary:
        criticalNonCompliant.length > 0
          ? `${criticalNonCompliant.length} critical compliance issues must be resolved before proceeding.`
          : atRiskCount > 0
            ? `${atRiskCount} item(s) at risk — address before offer extension.`
            : "All compliance checks passed.",
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton instance for registration in the AgentRunner system. */
export const recruitmentSpecialistAdapter = new RecruitmentSpecialistAdapter();
export default recruitmentSpecialistAdapter;
