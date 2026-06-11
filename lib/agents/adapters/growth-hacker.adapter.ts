// ============================================================================
// Growth Hacker — Agent Adapter Interface
// ============================================================================
// Agent Registry Contract for the @growth-hacker agent.
// Specializes in rapid user acquisition through data-driven experimentation,
// viral loop development, funnel optimization, and scalable channel growth.
//
// Input:  product/feature specs, current AARRR metrics, user segments,
//         channel performance data, experiment history, competitor growth tactics
// Output: growth experiment designs, channel prioritization, viral loop mechanics,
//         funnel optimization recommendations, projected impact (lift estimates),
//         experiment tracking plans
//
// Context keys:
//   growthExperiment   — current experiment design and hypothesis
//   channelPriorities  — channel prioritization matrix with ROI projections
//   viralLoopDesign    — viral loop mechanics and coefficient modeling
//   funnelOptimizations — AARRR funnel-optimization recommendations
//   experimentResults  — experiment tracking data and significance results
// ============================================================================

import type { AgentAdapter, AgentContext, ExecutionResult } from "./types";

// ---------------------------------------------------------------------------
// 1. ENUMS & LITERAL TYPES
// ---------------------------------------------------------------------------

/**
 * The five stages of the AARRR (Pirate Metrics) growth funnel.
 */
export enum FunnelStage {
  ACQUISITION = "acquisition",
  ACTIVATION = "activation",
  RETENTION = "retention",
  REVENUE = "revenue",
  REFERRAL = "referral",
}

/**
 * Supported growth channels the agent can evaluate and prioritize.
 */
export enum GrowthChannel {
  // Organic
  SEO = "seo",
  CONTENT_MARKETING = "content-marketing",
  SOCIAL_MEDIA_ORGANIC = "social-media-organic",
  COMMUNITY = "community",
  PR = "pr",
  // Paid
  PAID_SEARCH = "paid-search",
  PAID_SOCIAL = "paid-social",
  DISPLAY = "display",
  INFLUENCER = "influencer",
  AFFILIATE = "affiliate",
  // Product-led
  VIRAL = "viral",
  REFERRAL = "referral",
  PRODUCT_LED = "product-led",
  PARTNERSHIP = "partnership",
  SALES = "sales",
  EMAIL = "email",
  // Experimental
  UNCONVENTIONAL = "unconventional",
}

/**
 * Experiment lifecycle status.
 */
export enum ExperimentStatus {
  DRAFT = "draft",
  RUNNING = "running",
  ANALYZING = "analyzing",
  WON = "won",
  LOST = "lost",
  INCONCLUSIVE = "inconclusive",
  CANCELLED = "cancelled",
}

/**
 * Variable type for experiment design.
 */
export enum ExperimentVariableType {
  BINOMIAL = "binomial",
  CONTINUOUS = "continuous",
  RATIO = "ratio",
  COUNT = "count",
}

/**
 * Viral loop type taxonomy.
 */
export enum ViralLoopType {
  INVITE = "invite",
  SHARE = "share",
  CONTENT_EMBED = "content-embed",
  COLLABORATION = "collaboration",
  NETWORK_EFFECT = "network-effect",
  GAMIFICATION = "gamification",
  SOCIAL_PROOF = "social-proof",
  RECIPROCITY = "reciprocity",
}

/**
 * Statistical significance level for experiment evaluation.
 */
export enum SignificanceLevel {
  ALPHA_0_01 = "0.01",
  ALPHA_0_05 = "0.05",
  ALPHA_0_10 = "0.10",
}

// ---------------------------------------------------------------------------
// 2. CORE DATA STRUCTURES
// ---------------------------------------------------------------------------

/**
 * AARRR funnel metrics snapshot for the current period.
 */
export interface AarrrFunnelMetrics {
  /** Acquisition: new users arriving in the period */
  acquisition: {
    newUsers: number;
    topChannels: Record<GrowthChannel, number>;
    costPerAcquisition: Record<GrowthChannel, number>;
    totalAcquisitionCost: number;
  };
  /** Activation: users who reach the "aha moment" */
  activation: {
    activatedUsers: number;
    activationRate: number; // 0–1
    timeToActivation: number; // median seconds
    activationTriggers: string[];
  };
  /** Retention: users who return after a period */
  retention: {
    day1Retention: number; // 0–1
    day7Retention: number;
    day30Retention: number;
    day90Retention: number;
    churnRate: number; // 0–1 monthly
  };
  /** Revenue: monetization metrics */
  revenue: {
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    lifetimeValue: number;
    paybackPeriodDays: number;
    expansionRevenue: number;
  };
  /** Referral: viral/invite metrics */
  referral: {
    invitesSent: number;
    inviteConversionRate: number; // 0–1
    viralCoefficient: number; // k-factor
    referralRevenue: number;
  };
}

/**
 * A product or feature specification for growth experimentation.
 */
export interface ProductSpec {
  name: string;
  description: string;
  targetUserSegment: string;
  keyValueProposition: string;
  activationTriggers: string[];
  sharingMechanisms: string[];
  currentVersion?: string;
  releaseDate?: string;
}

/**
 * A user segment definition with behavioral and demographic attributes.
 */
export interface UserSegment {
  id: string;
  name: string;
  description: string;
  userCount: number;
  acquisitionChannels: GrowthChannel[];
  activationRate: number; // 0–1
  retentionRateD30: number; // 0–1
  averageRevenuePerUser: number;
  lifetimeValue: number;
  commonBehaviors: string[];
  painPoints: string[];
}

/**
 * Channel performance data from a given period.
 */
export interface ChannelPerformance {
  channel: GrowthChannel;
  period: string; // ISO date range
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  costPerAcquisition: number;
  conversionRate: number; // 0–1
  attributedRevenue: number;
  returnOnAdSpend: number;
  qualityScore?: number; // 1–10
  notes?: string;
}

/**
 * A previously run growth experiment.
 */
export interface ExperimentRecord {
  id: string;
  name: string;
  hypothesis: string;
  targetFunnelStage: FunnelStage;
  channel?: GrowthChannel;
  variantName: string;
  controlName: string;
  startDate: string;
  endDate: string;
  sampleSize: number;
  metricName: string;
  controlValue: number;
  variantValue: number;
  absoluteLift: number;
  relativeLift: number; // decimal percentage
  pValue: number;
  significanceLevel: number; // 0–1
  status: ExperimentStatus;
  winnerName?: string;
  learnings: string[];
  followUpActions: string[];
}

/**
 * Competitor growth tactic intelligence.
 */
export interface CompetitorGrowthTactic {
  competitorName: string;
  tacticDescription: string;
  channel: GrowthChannel;
  estimatedImpact: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  applicableToUs: boolean;
  adaptationSuggestion?: string;
}

// ---------------------------------------------------------------------------
// 3. AGENT INPUT SCHEMA
// ---------------------------------------------------------------------------

/**
 * Input contract for the @growth-hacker agent adapter.
 */
export interface GrowthHackerInput {
  /** Product or feature being analyzed for growth. */
  productSpec: ProductSpec;

  /** Current AARRR funnel metrics snapshot. */
  currentMetrics: AarrrFunnelMetrics;

  /** Target user segments for growth initiatives. */
  userSegments: UserSegment[];

  /** Channel performance data from last N periods. */
  channelPerformance: ChannelPerformance[];

  /** History of past growth experiments. */
  experimentHistory: ExperimentRecord[];

  /** Known competitor growth tactics being evaluated. */
  competitorTactics: CompetitorGrowthTactic[];

  /**
   * Funnel stages to focus on, in priority order.
   * @default [acquisition, activation, retention, revenue, referral]
   */
  focusStages?: FunnelStage[];

  /**
   * Channels to consider (limits scope).
   * If omitted, the agent evaluates all available channels.
   */
  allowedChannels?: GrowthChannel[];

  /**
   * Budget constraints per channel.
   * Mapped by channel enum key to maximum spend in USD.
   */
  budgetConstraints?: Partial<Record<GrowthChannel, number>>;

  /**
   * Total growth experiment budget for the period.
   */
  totalExperimentBudget?: number;

  /**
   * Acquisition targets — new users to acquire in the period.
   */
  acquisitionTargets?: {
    newUsersTarget: number;
    targetCac: number;
    targetLtvCacRatio: number;
    targetPaybackPeriodDays: number;
  };

  /**
   * Minimum detectable effect (MDE) for experiments, as decimal.
   * @default 0.05 (5% relative lift)
   */
  minimumDetectableEffect?: number;

  /**
   * Statistical significance threshold (alpha).
   * @default 0.05
   */
  significanceThreshold?: number;

  /**
   * Desired confidence level for experiment sizing.
   * @default 0.80 (80% power)
   */
  statisticalPower?: number;
}

// ---------------------------------------------------------------------------
// 4. AGENT OUTPUT SCHEMA
// ---------------------------------------------------------------------------

/**
 * A designed growth experiment ready for launch.
 */
export interface GrowthExperimentDesign {
  experimentId: string;
  name: string;
  hypothesis: string;
  targetFunnelStage: FunnelStage;
  channel: GrowthChannel;
  controlName: string;
  variantName: string;
  controlDescription: string;
  variantDescription: string;
  primaryMetric: {
    name: string;
    type: ExperimentVariableType;
    currentBaseline: number;
    minimumDetectableEffect: number;
    expectedLift: number; // decimal percentage
  };
  secondaryMetrics: Array<{
    name: string;
    type: ExperimentVariableType;
    currentBaseline: number;
    guardrailThreshold: number;
  }>;
  sampleSizeRequired: number;
  estimatedDurationDays: number;
  trafficAllocation: number; // 0–1 (e.g. 0.5 = 50/50 split)
  riskLevel: "low" | "medium" | "high";
  segmentationPlan: string;
  guardrailMetrics: string[];
  stopConditions: string[];
  trackingImplementation: string;
}

/**
 * Channel prioritization entry with ROI projection.
 */
export interface ChannelPriority {
  channel: GrowthChannel;
  priorityScore: number; // 0–100
  rank: number;
  estimatedCac: number;
  estimatedLtv: number;
  estimatedReach: number;
  scalability: "low" | "medium" | "high";
  timeToScale: string;
  confidence: "low" | "medium" | "high";
  rationale: string;
  budgetAllocation: number; // USD
  expectedNewUsers: number;
  expectedRoi: number; // ratio
}

/**
 * Viral loop mechanics design.
 */
export interface ViralLoopDesign {
  loopType: ViralLoopType;
  loopDescription: string;
  currentKFactor: number;
  targetKFactor: number;
  inviteMechanism: string;
  incentiveStructure: string;
  conversionSteps: Array<{
    step: number;
    description: string;
    currentConversion: number; // 0–1
    targetConversion: number; // 0–1
    optimizationLever: string;
  }>;
  viralCycleTime: string; // e.g. "48 hours"
  shareChannel: GrowthChannel;
  estimatedVirality: {
    organicGrowthRate: number; // decimal
    paidRequired: boolean;
    breakEvenKFactor: number;
    projectedKFactorAfter: number;
  };
  implementationRequirements: string[];
}

/**
 * Funnel optimization recommendation for a specific stage.
 */
export interface FunnelOptimization {
  stage: FunnelStage;
  currentConversionRate: number; // 0–1
  targetConversionRate: number; // 0–1
  estimatedLift: number; // decimal
  recommendedActions: string[];
  effortEstimate: "low" | "medium" | "high";
  impactEstimate: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  dependencies: string[];
  experimentationRequired: boolean;
  quickWin: boolean;
}

/**
 * Experiment tracking plan with measurement framework.
 */
export interface ExperimentTrackingPlan {
  experimentId: string;
  metricDefinitions: Array<{
    name: string;
    definition: string;
    dataSource: string;
    collectionMethod: string;
    frequency: string;
    owner: string;
  }>;
  instrumentationRequirements: string[];
  dashboardUrl?: string;
  alertThresholds: Array<{
    metric: string;
    warningThreshold: number;
    criticalThreshold: number;
  }>;
  reviewCadence: string;
  stakeholders: string[];
}

/**
 * Output contract from the @growth-hacker agent adapter.
 */
export interface GrowthHackerOutput {
  /** Designed experiments ready for implementation. */
  experiments: GrowthExperimentDesign[];

  /** Prioritized channel ranking with budget allocation. */
  channelPriorities: ChannelPriority[];

  /** Viral loop mechanics design (if referral/referral stage targeted). */
  viralLoopDesign?: ViralLoopDesign;

  /** Funnel optimization recommendations per stage. */
  funnelOptimizations: FunnelOptimization[];

  /** Projected impact of recommended initiatives. */
  projectedImpact: {
    expectedNewUsers: number;
    expectedActivationLift: number; // decimal
    expectedRetentionLift: number; // decimal
    expectedRevenueLift: number; // decimal
    expectedKFactorLift: number; // decimal
    totalProjectedLiftDescription: string;
    confidenceInterval: [number, number]; // [lower, upper] as decimals
  };

  /** Experiment tracking plans. */
  trackingPlans: ExperimentTrackingPlan[];

  /** Summary suitable for dashboards or executive readout. */
  executiveSummary: string;

  /** Warnings about data quality, risks, or constraints. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// 5. AGENT CONTEXT KEYS
// ---------------------------------------------------------------------------

/**
 * Context keys that the @growth-hacker agent writes to the shared
 * orchestration context for downstream agents (e.g. @product-manager,
 * @social-media-strategist, @analytics-reporter) to consume.
 */
export interface GrowthHackerContextKeys {
  /** Current experiment design and hypothesis. */
  growthExperiment: GrowthExperimentDesign;

  /** Channel prioritization matrix with ROI projections. */
  channelPriorities: ChannelPriority[];

  /** Viral loop mechanics and coefficient modeling. */
  viralLoopDesign: ViralLoopDesign | null;

  /** AARRR funnel-optimization recommendations. */
  funnelOptimizations: FunnelOptimization[];

  /** Experiment tracking data and significance results. */
  experimentResults: ExperimentTrackingPlan[];
}

// ---------------------------------------------------------------------------
// 6. VALIDATION RULES
// ---------------------------------------------------------------------------

/**
 * Statistical significance configuration for experiment validation.
 */
export const STATISTICAL_SIGNIFICANCE_THRESHOLDS = {
  /** Minimum p-value for declaring a winner (default: 0.05). */
  defaultAlpha: 0.05,
  /** Minimum statistical power (default: 0.80). */
  defaultPower: 0.80,
  /** Minimum sample size per variant for binomial metrics. */
  minimumSamplePerVariant: 100,
  /** Minimum detectable effect as relative decimal (default: 5%). */
  defaultMinimumDetectableEffect: 0.05,
  /** Confidence levels mapped to z-scores. */
  confidenceZScore: {
    "0.90": 1.645,
    "0.95": 1.96,
    "0.99": 2.576,
  },
} as const;

/**
 * Channel budget allocation limits (% of total budget per channel).
 * Prevents single-channel over-allocation.
 */
export const CHANNEL_BUDGET_LIMITS: Record<GrowthChannel, { maxAllocationPct: number; minAllocationPct: number }> = {
  [GrowthChannel.SEO]:               { maxAllocationPct: 0.30, minAllocationPct: 0.05 },
  [GrowthChannel.CONTENT_MARKETING]:  { maxAllocationPct: 0.25, minAllocationPct: 0.05 },
  [GrowthChannel.SOCIAL_MEDIA_ORGANIC]: { maxAllocationPct: 0.15, minAllocationPct: 0.02 },
  [GrowthChannel.COMMUNITY]:          { maxAllocationPct: 0.15, minAllocationPct: 0.02 },
  [GrowthChannel.PR]:                 { maxAllocationPct: 0.10, minAllocationPct: 0.01 },
  [GrowthChannel.PAID_SEARCH]:        { maxAllocationPct: 0.40, minAllocationPct: 0.05 },
  [GrowthChannel.PAID_SOCIAL]:        { maxAllocationPct: 0.35, minAllocationPct: 0.05 },
  [GrowthChannel.DISPLAY]:            { maxAllocationPct: 0.20, minAllocationPct: 0.02 },
  [GrowthChannel.INFLUENCER]:         { maxAllocationPct: 0.25, minAllocationPct: 0.03 },
  [GrowthChannel.AFFILIATE]:          { maxAllocationPct: 0.20, minAllocationPct: 0.03 },
  [GrowthChannel.VIRAL]:              { maxAllocationPct: 0.15, minAllocationPct: 0.01 },
  [GrowthChannel.REFERRAL]:           { maxAllocationPct: 0.20, minAllocationPct: 0.03 },
  [GrowthChannel.PRODUCT_LED]:        { maxAllocationPct: 0.20, minAllocationPct: 0.03 },
  [GrowthChannel.PARTNERSHIP]:        { maxAllocationPct: 0.20, minAllocationPct: 0.02 },
  [GrowthChannel.SALES]:              { maxAllocationPct: 0.30, minAllocationPct: 0.05 },
  [GrowthChannel.EMAIL]:              { maxAllocationPct: 0.15, minAllocationPct: 0.02 },
  [GrowthChannel.UNCONVENTIONAL]:     { maxAllocationPct: 0.10, minAllocationPct: 0.01 },
};

/**
 * Funnel metric consistency checks — ensures downstream funnels
 * cannot exceed upstream funnels.
 */
export const FUNNEL_CONSISTENCY_RULES = {
  /** Activation rate must be ≤ acquisition rate (activated users ≤ acquired users). */
  activationCannotExceedAcquisition: true,
  /** Retention rate must be ≤ activation rate (retained users ≤ activated users). */
  retentionCannotExceedActivation: true,
  /** Revenue per user must be >= 0. */
  revenueNonNegative: true,
  /** Viral coefficient (k-factor) must be ≥ 0. */
  kFactorNonNegative: true,
  /** CAC must be > 0 for channels with spend. */
  cacPositiveForSpend: true,
  /** LTV must be ≥ CAC for sustainable growth. */
  ltvGreaterThanCac: true,
} as const;

/**
 * Funnel metric boundary ranges for validity checking.
 */
export const FUNNEL_METRIC_BOUNDARIES: Record<FunnelStage, Record<string, { min: number; max: number }>> = {
  [FunnelStage.ACQUISITION]: {
    newUsers: { min: 0, max: Infinity },
    costPerAcquisition: { min: 0, max: Infinity },
    totalAcquisitionCost: { min: 0, max: Infinity },
  },
  [FunnelStage.ACTIVATION]: {
    activatedUsers: { min: 0, max: Infinity },
    activationRate: { min: 0, max: 1 },
    timeToActivation: { min: 0, max: Infinity },
  },
  [FunnelStage.RETENTION]: {
    day1Retention: { min: 0, max: 1 },
    day7Retention: { min: 0, max: 1 },
    day30Retention: { min: 0, max: 1 },
    day90Retention: { min: 0, max: 1 },
    churnRate: { min: 0, max: 1 },
  },
  [FunnelStage.REVENUE]: {
    monthlyRecurringRevenue: { min: 0, max: Infinity },
    averageRevenuePerUser: { min: 0, max: Infinity },
    lifetimeValue: { min: 0, max: Infinity },
    paybackPeriodDays: { min: 0, max: Infinity },
  },
  [FunnelStage.REFERRAL]: {
    invitesSent: { min: 0, max: Infinity },
    inviteConversionRate: { min: 0, max: 1 },
    viralCoefficient: { min: 0, max: Infinity },
  },
};

// ---------------------------------------------------------------------------
// 7. VALIDATION FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Validates funnel metric consistency — ensures downstream funnels
 * are logically bounded by upstream funnels.
 */
export function validateFunnelConsistency(metrics: AarrrFunnelMetrics): string[] {
  const warnings: string[] = [];

  // Activation cannot exceed acquisition
  if (metrics.activation.activatedUsers > metrics.acquisition.newUsers) {
    warnings.push(
      `Funnel inconsistency: Activated users (${metrics.activation.activatedUsers}) ` +
      `exceed acquired users (${metrics.acquisition.newUsers}). ` +
      `Activation rate capped at ${metrics.acquisition.newUsers > 0
        ? (metrics.acquisition.newUsers / metrics.acquisition.newUsers).toFixed(2)
        : "N/A"}.`
    );
  }

  // Retention (D30) cannot exceed activation rate
  if (metrics.retention.day30Retention > metrics.activation.activationRate) {
    warnings.push(
      `Funnel inconsistency: D30 retention (${(metrics.retention.day30Retention * 100).toFixed(1)}%) ` +
      `exceeds activation rate (${(metrics.activation.activationRate * 100).toFixed(1)}%). ` +
      `Retained users should be a subset of activated users.`
    );
  }

  // LTV should be >= CAC for sustainable unit economics
  const avgCac = metrics.acquisition.newUsers > 0
    ? metrics.acquisition.totalAcquisitionCost / metrics.acquisition.newUsers
    : 0;
  if (avgCac > 0 && metrics.revenue.lifetimeValue < avgCac) {
    warnings.push(
      `Unit economics warning: LTV ($${metrics.revenue.lifetimeValue.toFixed(2)}) ` +
      `is below average CAC ($${avgCac.toFixed(2)}). ` +
      `LTV:CAC ratio is ${(metrics.revenue.lifetimeValue / avgCac).toFixed(2)}:1. ` +
      `Target minimum is 3:1.`
    );
  }

  // Viral coefficient cannot exceed realistic bounds
  if (metrics.referral.viralCoefficient > 10) {
    warnings.push(
      `Unusual viral coefficient: k=${metrics.referral.viralCoefficient.toFixed(2)}. ` +
      `Values above 10 indicate measurement error. Verify invite tracking.`
    );
  }

  return warnings;
}

/**
 * Validates channel budget constraints against allocation limits.
 */
export function validateBudgetConstraints(
  priorities: ChannelPriority[],
  totalBudget: number,
): string[] {
  const warnings: string[] = [];

  for (const priority of priorities) {
    const limits = CHANNEL_BUDGET_LIMITS[priority.channel];
    if (!limits) continue;

    const allocationPct = priority.budgetAllocation / totalBudget;

    if (allocationPct > limits.maxAllocationPct) {
      warnings.push(
        `Budget constraint violation: ${priority.channel} allocated ` +
        `${(allocationPct * 100).toFixed(1)}% of total budget ` +
        `(max allowed: ${(limits.maxAllocationPct * 100).toFixed(0)}%). ` +
        `Reduce ${priority.channel} allocation by ` +
        `$${(priority.budgetAllocation - totalBudget * limits.maxAllocationPct).toFixed(0)}.`
      );
    }

    if (allocationPct < limits.minAllocationPct && allocationPct > 0) {
      warnings.push(
        `Budget allocation warning: ${priority.channel} allocated ` +
        `${(allocationPct * 100).toFixed(1)}% (min recommended: ` +
        `${(limits.minAllocationPct * 100).toFixed(0)}%). ` +
        `Consider increasing investment to minimum effective level.`
      );
    }
  }

  // Total allocated must not exceed total budget
  const totalAllocated = priorities.reduce((sum, p) => sum + p.budgetAllocation, 0);
  if (totalAllocated > totalBudget) {
    warnings.push(
      `Total allocated ($${totalAllocated.toFixed(0)}) exceeds ` +
      `total budget ($${totalBudget.toFixed(0)}) by ` +
      `$${(totalAllocated - totalBudget).toFixed(0)}. ` +
      `Reduce allocations across channels.`
    );
  }

  return warnings;
}

/**
 * Validates statistical significance parameters for experiment design.
 */
export function validateExperimentParameters(
  alpha: number,
  power: number,
  minimumDetectableEffect: number,
): string[] {
  const warnings: string[] = [];

  if (alpha <= 0 || alpha >= 1) {
    warnings.push(`Significance threshold (alpha) must be between 0 and 1. Got: ${alpha}.`);
  }
  if (alpha > 0.1) {
    warnings.push(
      `Significance threshold alpha=${alpha} is above 0.10. ` +
      `Recommended: alpha ≤ 0.05 for reliable results.`
    );
  }

  if (power <= 0 || power >= 1) {
    warnings.push(`Statistical power must be between 0 and 1. Got: ${power}.`);
  }
  if (power < 0.8) {
    warnings.push(
      `Statistical power ${power} is below 0.80. ` +
      `Risk of false negatives (Type II errors) is elevated. ` +
      `Increase sample size or accept higher MDE.`
    );
  }

  if (minimumDetectableEffect <= 0 || minimumDetectableEffect >= 1) {
    warnings.push(`MDE must be between 0 and 1 (decimal). Got: ${minimumDetectableEffect}.`);
  }
  if (minimumDetectableEffect < 0.01) {
    warnings.push(
      `MDE of ${(minimumDetectableEffect * 100).toFixed(1)}% is very small. ` +
      `Required sample size may be impractically large. ` +
      `Consider MDE ≥ 5% for most growth experiments.`
    );
  }

  return warnings;
}

/**
 * Runs the full validation suite on the growth hacker input.
 */
export function validateGrowthHackerInput(input: GrowthHackerInput): {
  passed: boolean;
  errors: string[];
  warnings: string[];
} {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // 1. Validate required fields
  if (!input.productSpec?.name) {
    allErrors.push("Missing required field: productSpec.name");
  }
  if (!input.currentMetrics) {
    allErrors.push("Missing required field: currentMetrics (AARRR funnel data)");
  }
  if (!input.userSegments?.length) {
    allErrors.push("Missing required field: userSegments — at least one segment required");
  }
  if (!input.channelPerformance?.length) {
    allErrors.push("Missing required field: channelPerformance — at least one channel required");
  }

  // 2. Validate funnel consistency
  if (input.currentMetrics) {
    const funnelWarnings = validateFunnelConsistency(input.currentMetrics);
    allWarnings.push(...funnelWarnings);
  }

  // 3. Validate experiment parameters
  const alpha = input.significanceThreshold ?? STATISTICAL_SIGNIFICANCE_THRESHOLDS.defaultAlpha;
  const power = input.statisticalPower ?? STATISTICAL_SIGNIFICANCE_THRESHOLDS.defaultPower;
  const mde = input.minimumDetectableEffect ?? STATISTICAL_SIGNIFICANCE_THRESHOLDS.defaultMinimumDetectableEffect;
  const paramWarnings = validateExperimentParameters(alpha, power, mde);
  allWarnings.push(...paramWarnings);

  // 4. Check budget constraints if provided
  if (input.budgetConstraints && input.totalExperimentBudget) {
    for (const [channel, budget] of Object.entries(input.budgetConstraints)) {
      const limits = CHANNEL_BUDGET_LIMITS[channel as GrowthChannel];
      if (limits && budget > input.totalExperimentBudget * limits.maxAllocationPct) {
        allWarnings.push(
          `Budget constraint: ${channel} budget ($${budget}) exceeds ` +
          `${(limits.maxAllocationPct * 100).toFixed(0)}% max allocation of total budget.`
        );
      }
    }
  }

  // 5. Check for metric boundary violations
  if (input.currentMetrics?.activation) {
    const { activationRate } = input.currentMetrics.activation;
    if (activationRate < 0 || activationRate > 1) {
      allErrors.push(`Activation rate must be between 0 and 1. Got: ${activationRate}.`);
    }
  }
  if (input.currentMetrics?.retention) {
    const { day1Retention, day7Retention, day30Retention } = input.currentMetrics.retention;
    const retentionChecks: Array<[string, number | undefined]> = [
      ["D1 retention", day1Retention],
      ["D7 retention", day7Retention],
      ["D30 retention", day30Retention],
    ];
    for (const [name, val] of retentionChecks) {
      if (val !== undefined && (val < 0 || val > 1)) {
        allErrors.push(`${name} must be between 0 and 1. Got: ${val}.`);
      }
    }
  }

  return {
    passed: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ---------------------------------------------------------------------------
// 8. DEFAULTS
// ---------------------------------------------------------------------------

/**
 * Default configuration values injected when the orchestrator omits optional
 * input fields.
 */
export const GROWTH_HACKER_DEFAULTS = {
  focusStages: [
    FunnelStage.ACQUISITION,
    FunnelStage.ACTIVATION,
    FunnelStage.RETENTION,
    FunnelStage.REVENUE,
    FunnelStage.REFERRAL,
  ],
  minimumDetectableEffect: 0.05,
  significanceThreshold: 0.05,
  statisticalPower: 0.80,
  acquisitionTargets: {
    newUsersTarget: 10000,
    targetCac: 50,
    targetLtvCacRatio: 3.0,
    targetPaybackPeriodDays: 180,
  },
} as const;

/**
 * Channel priority scoring weights.
 */
export const CHANNEL_PRIORITY_WEIGHTS = {
  cacWeight: 0.25,
  scalabilityWeight: 0.20,
  confidenceWeight: 0.15,
  reachWeight: 0.15,
  roiWeight: 0.25,
} as const;

// ---------------------------------------------------------------------------
// 9. ADAPTER IMPLEMENTATION
// ---------------------------------------------------------------------------

/**
 * The @growth-hacker adapter — registered with the Agent Registry
 * and used by the orchestration engine to dispatch growth strategy tasks.
 */
export class GrowthHackerAdapter
  implements AgentAdapter<GrowthHackerInput, GrowthHackerOutput>
{
  readonly agentId = "@growth-hacker" as const;
  readonly version = "0.1.0" as const;
  readonly promptVersion = "growth-hacker.v1.prompt.yaml" as const;

  /** Upstream agents this adapter expects handoffs from. */
  readonly upstreamDependencies = [
    "@trend-researcher",
    "@social-media-strategist",
    "@content-creator",
    "@analytics-reporter",
  ] as const;

  /** Downstream agents that consume this adapter's context keys. */
  readonly downstreamTargets = [
    "@product-manager",
    "@social-media-strategist",
    "@paid-media-ppc-strategist",
    "@analytics-reporter",
    "@experiment-tracker",
  ] as const;

  async validateInput(input: unknown): Promise<GrowthHackerInput> {
    const parsed = input as GrowthHackerInput;

    if (!parsed.productSpec?.name) {
      throw new Error("Input validation failed: productSpec.name is required");
    }
    if (!parsed.currentMetrics) {
      throw new Error("Input validation failed: currentMetrics (AARRR data) is required");
    }
    if (!parsed.userSegments?.length) {
      throw new Error("Input validation failed: at least one userSegment is required");
    }
    if (!parsed.channelPerformance?.length) {
      throw new Error("Input validation failed: at least one channelPerformance entry is required");
    }

    // Run funnel consistency checks
    const validation = validateGrowthHackerInput(parsed);
    if (!validation.passed) {
      throw new Error(`Input validation failed:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`);
    }

    return parsed;
  }

  async validateOutput(output: unknown): Promise<GrowthHackerOutput> {
    const parsed = output as GrowthHackerOutput;

    if (!parsed.experiments?.length) {
      throw new Error("Output validation failed: at least one experiment design is required");
    }
    if (!parsed.channelPriorities?.length) {
      throw new Error("Output validation failed: channelPriorities must have at least one entry");
    }
    if (!parsed.funnelOptimizations?.length) {
      throw new Error("Output validation failed: funnelOptimizations must have at least one entry");
    }
    if (!parsed.executiveSummary) {
      throw new Error("Output validation failed: executiveSummary is required");
    }

    // Validate each experiment has required fields
    for (const exp of parsed.experiments) {
      if (!exp.hypothesis) {
        throw new Error(`Output validation failed: experiment "${exp.experimentId}" missing hypothesis`);
      }
      if (exp.sampleSizeRequired < STATISTICAL_SIGNIFICANCE_THRESHOLDS.minimumSamplePerVariant) {
        throw new Error(
          `Output validation failed: experiment "${exp.experimentId}" sample size ` +
          `(${exp.sampleSizeRequired}) below minimum (${STATISTICAL_SIGNIFICANCE_THRESHOLDS.minimumSamplePerVariant})`
        );
      }
    }

    return parsed;
  }

  extractContextKeys(output: GrowthHackerOutput): AgentContext {
    return {
      growthExperiment: output.experiments[0],
      channelPriorities: output.channelPriorities,
      viralLoopDesign: output.viralLoopDesign ?? null,
      funnelOptimizations: output.funnelOptimizations,
      experimentResults: output.trackingPlans,
    };
  }

  composePrompt(input: GrowthHackerInput): string {
    const stages = input.focusStages ?? GROWTH_HACKER_DEFAULTS.focusStages;
    const channels = input.allowedChannels ?? [];

    return [
      `# Growth Strategy: ${input.productSpec.name}`,
      `## Target Funnel Stages: ${stages.map((s) => s).join(", ")}`,
      input.allowedChannels
        ? `## Allowed Channels: ${channels.map((c) => c).join(", ")}`
        : "## All Channels Considered (no restrictions)",
      `## User Segments: ${input.userSegments.length} defined`,
      `## Channel Performance: ${input.channelPerformance.length} periods analyzed`,
      `## Experiment History: ${input.experimentHistory.length} prior experiments`,
      `## Competitor Tactics: ${input.competitorTactics.length} identified`,
      input.acquisitionTargets
        ? `## Acquisition Targets: ${input.acquisitionTargets.newUsersTarget} new users @ CAC $${input.acquisitionTargets.targetCac}`
        : "",
      input.totalExperimentBudget
        ? `## Experiment Budget: $${input.totalExperimentBudget.toLocaleString()}`
        : "",
      `## Significance Threshold: ${input.significanceThreshold ?? GROWTH_HACKER_DEFAULTS.significanceThreshold}`,
      `## Minimum Detectable Effect: ${(input.minimumDetectableEffect ?? GROWTH_HACKER_DEFAULTS.minimumDetectableEffect) * 100}%`,
    ].filter(Boolean).join("\n");
  }
}

// ---------------------------------------------------------------------------
// 10. RE-EXPORTS
// ---------------------------------------------------------------------------

export namespace GrowthHacker {
  export type Input = GrowthHackerInput;
  export type Output = GrowthHackerOutput;
  export type Context = GrowthHackerContextKeys;
  export type Adapter = GrowthHackerAdapter;
}

export default GrowthHackerAdapter;
