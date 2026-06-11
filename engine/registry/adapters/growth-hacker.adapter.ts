// ============================================================================
// Nexus Agent Platform — Growth Hacker Adapter
// ============================================================================
// AgentRunner contract for the @growth-hacker agent. Specializes in rapid
// user acquisition through data-driven experimentation, viral loop development,
// funnel optimization, and scalable channel growth.
//
// Implements IAgentAdapter<GrowthHackerInput, GrowthHackerOutput> for use
// by the AgentRunner execution lifecycle (validate → rateLimit → execute → retry).
//
// Context keys READ:  [trendReport, competitiveLandscape, socialStrategy]
// Context keys WRITE: [growthExperiments, channelPriorities, viralLoopDesign, funnelOptimizations]
// ============================================================================

import type { AgentResult, AgentStatus } from "@/engine/types/agent-types";
import type {
  AgentContext,
  AgentId,
  ValidationError,
  ValidationResult,
} from "@/lib/agents/registry/types";

// ============================================================================
// IAgentAdapter — Generic AgentRunner Interface
// ============================================================================

/**
 * Core contract that every agent adapter must implement for the AgentRunner
 * execution lifecycle. The runner calls `validate` before `execute` and wraps
 * the result in an `AgentResult<T>` envelope with timing, status, and diagnostics.
 *
 * @typeParam TInput  - Typed input payload schema for this agent.
 * @typeParam TOutput - Typed output payload schema for this agent.
 */
export interface IAgentAdapter<TInput, TOutput> {
  /** Canonical agent identifier (e.g. "growth-hacker"). */
  readonly agentId: AgentId;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Human-readable display name. */
  readonly name: string;

  /** Brief description of the agent's purpose and domain. */
  readonly description: string;

  /** Tags for discoverability and routing. */
  readonly tags: string[];

  /** Context keys this agent reads from the shared execution context. */
  readonly readsContextKeys: string[];

  /** Context keys this agent writes to the shared execution context. */
  readonly writesContextKeys: string[];

  /**
   * Pre-execution validation of the raw input object.
   * Must check all required fields, type constraints, and business rules.
   *
   * @param input - The raw (untrusted) input to validate.
   * @returns A ValidationResult with errors (fatal) and warnings (advisory).
   */
  validate(input: Record<string, unknown>): ValidationResult;

  /**
   * Execute the agent's core growth-hacking logic.
   *
   * @param input   - The validated typed input payload.
   * @param context - The shared agent chain context (read/write keys).
   * @returns An AgentResult containing the typed output on success,
   *          or error/status information on failure.
   */
  execute(
    input: TInput,
    context: AgentContext,
  ): Promise<AgentResult<TOutput>>;
}

// ============================================================================
// 1. ENUMS & LITERAL TYPES
// ============================================================================

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

// ============================================================================
// 2. INPUT SCHEMA — GrowthHackerInput
// ============================================================================

/**
 * AARRR funnel metrics snapshot for the current period.
 */
export interface AarrrMetrics {
  acquisition: {
    newUsers: number;
    topChannels: Record<string, number>;
    costPerAcquisition: Record<string, number>;
    totalAcquisitionCost: number;
  };
  activation: {
    activatedUsers: number;
    activationRate: number; // 0–1
    timeToActivation: number; // median seconds
    activationTriggers: string[];
  };
  retention: {
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
    day90Retention: number;
    churnRate: number;
  };
  revenue: {
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    lifetimeValue: number;
    paybackPeriodDays: number;
    expansionRevenue: number;
  };
  referral: {
    invitesSent: number;
    inviteConversionRate: number;
    viralCoefficient: number;
    referralRevenue: number;
  };
}

/**
 * Product or feature specification for growth experimentation.
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
  acquisitionChannels: string[];
  activationRate: number;
  retentionRateD30: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  commonBehaviors: string[];
  painPoints: string[];
}

/**
 * Channel performance data from a given period.
 */
export interface ChannelPerformance {
  channel: string;
  period: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  costPerAcquisition: number;
  conversionRate: number;
  attributedRevenue: number;
  returnOnAdSpend: number;
  qualityScore?: number;
  notes?: string;
}

/**
 * A previously run growth experiment.
 */
export interface ExperimentRecord {
  id: string;
  name: string;
  hypothesis: string;
  targetFunnelStage: string;
  channel?: string;
  startDate: string;
  endDate: string;
  sampleSize: number;
  metricName: string;
  controlValue: number;
  variantValue: number;
  absoluteLift: number;
  relativeLift: number;
  pValue: number;
  significanceLevel: number;
  status: string;
  winnerName?: string;
  learnings: string[];
  followUpActions: string[];
}

/**
 * Budget constraint applied per channel.
 */
export interface BudgetConstraint {
  channel: GrowthChannel;
  maxSpend: number;
  minSpend?: number;
}

/**
 * Acquisition targets for the growth period.
 */
export interface AcquisitionTarget {
  newUsersTarget: number;
  targetCac: number;
  targetLtvCacRatio: number;
  targetPaybackPeriodDays: number;
}

/**
 * Input contract for the @growth-hacker agent adapter.
 */
export interface GrowthHackerInput {
  /** Product or feature being analyzed for growth. */
  productSpec: ProductSpec;

  /** Current AARRR funnel metrics snapshot. */
  aarrrMetrics: AarrrMetrics;

  /** Target user segments for growth initiatives. */
  userSegments: UserSegment[];

  /** Channel performance data from last N periods. */
  channelPerformance: ChannelPerformance[];

  /** History of past growth experiments. */
  experimentHistory: ExperimentRecord[];

  /**
   * Budget constraints per channel.
   * When omitted, the agent derives constraints from channel performance.
   */
  budgetConstraints?: BudgetConstraint[];

  /**
   * Acquisition targets for the period.
   * When omitted, the agent uses defaults based on current metrics.
   */
  acquisitionTargets?: AcquisitionTarget;

  /**
   * Funnel stages to focus on, in priority order.
   * @default [acquisition, activation, retention, revenue, referral]
   */
  focusStages?: FunnelStage[];

  /** Channels to consider (limits scope). If omitted, evaluates all. */
  allowedChannels?: GrowthChannel[];

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
   * Desired statistical power.
   * @default 0.80 (80%)
   */
  statisticalPower?: number;
}

// ============================================================================
// 3. OUTPUT SCHEMA — GrowthHackerOutput
// ============================================================================

/**
 * A designed growth experiment ready for launch.
 */
export interface GrowthExperiment {
  experimentId: string;
  name: string;
  hypothesis: string;
  targetFunnelStage: FunnelStage;
  channel: GrowthChannel;
  primaryMetric: {
    name: string;
    type: ExperimentVariableType;
    currentBaseline: number;
    minimumDetectableEffect: number;
    expectedLift: number;
  };
  secondaryMetrics: Array<{
    name: string;
    type: ExperimentVariableType;
    currentBaseline: number;
    guardrailThreshold: number;
  }>;
  sampleSizeRequired: number;
  estimatedDurationDays: number;
  trafficAllocation: number;
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
  priorityScore: number;
  rank: number;
  estimatedCac: number;
  estimatedLtv: number;
  estimatedReach: number;
  scalability: "low" | "medium" | "high";
  timeToScale: string;
  confidence: "low" | "medium" | "high";
  rationale: string;
  budgetAllocation: number;
  expectedNewUsers: number;
  expectedRoi: number;
}

/**
 * Viral loop mechanics design.
 */
export interface ViralLoop {
  loopType: ViralLoopType;
  loopDescription: string;
  currentKFactor: number;
  targetKFactor: number;
  inviteMechanism: string;
  incentiveStructure: string;
  conversionSteps: Array<{
    step: number;
    description: string;
    currentConversion: number;
    targetConversion: number;
    optimizationLever: string;
  }>;
  viralCycleTime: string;
  shareChannel: GrowthChannel;
  estimatedVirality: {
    organicGrowthRate: number;
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
  currentConversionRate: number;
  targetConversionRate: number;
  estimatedLift: number;
  recommendedActions: string[];
  effortEstimate: "low" | "medium" | "high";
  impactEstimate: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  dependencies: string[];
  experimentationRequired: boolean;
  quickWin: boolean;
}

/**
 * Projected impact summary of all recommended initiatives.
 */
export interface ProjectedImpact {
  expectedNewUsers: number;
  expectedActivationLift: number;
  expectedRetentionLift: number;
  expectedRevenueLift: number;
  expectedKFactorLift: number;
  totalProjectedLiftDescription: string;
  confidenceInterval: [number, number];
}

/**
 * Output contract from the @growth-hacker agent adapter.
 */
export interface GrowthHackerOutput {
  /** Designed experiments ready for implementation. */
  experiments: GrowthExperiment[];

  /** Prioritized channel ranking with budget allocation. */
  channelPriorities: ChannelPriority[];

  /** Viral loop mechanics design (optional, stage-dependent). */
  viralLoopDesign: ViralLoop | null;

  /** Funnel optimization recommendations per stage. */
  funnelOptimizations: FunnelOptimization[];

  /** Projected impact of recommended initiatives. */
  projectedImpact: ProjectedImpact;

  /** Summary suitable for dashboards or executive readout. */
  executiveSummary: string;

  /** Warnings about data quality, risks, or constraints. */
  warnings: string[];
}

// ============================================================================
// 4. CONTEXT CONTRACT
// ============================================================================

/**
 * Typed context interface for the @growth-hacker agent.
 * Documents the shape of data read from and written to the shared context.
 */
export interface GrowthHackerContext {
  // ── READ keys ────────────────────────────────────────────────────────────
  /** Trend research data (written by @trend-researcher). */
  trendReport?: unknown;

  /** Competitive landscape analysis (written by competitive-intel agent). */
  competitiveLandscape?: unknown;

  /** Social media strategy and audience insights (written by @social-media-strategist). */
  socialStrategy?: unknown;

  // ── WRITE keys ────────────────────────────────────────────────────────────
  /** Designed growth experiments with hypotheses and tracking plans. */
  growthExperiments: GrowthExperiment[] | null;

  /** Prioritized channel ranking with budget allocation and ROI projections. */
  channelPriorities: ChannelPriority[] | null;

  /** Viral loop mechanics and coefficient modeling (nullable if not applicable). */
  viralLoopDesign: ViralLoop | null;

  /** AARRR funnel-optimization recommendations per stage. */
  funnelOptimizations: FunnelOptimization[] | null;
}

/**
 * Canonical context key names for the @growth-hacker agent.
 */
export const GROWTH_HACKER_CONTEXT_KEYS = {
  READS: ["trendReport", "competitiveLandscape", "socialStrategy"] as const,
  WRITES: ["growthExperiments", "channelPriorities", "viralLoopDesign", "funnelOptimizations"] as const,
} as const;

// ============================================================================
// 5. DEFAULTS
// ============================================================================

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

// ============================================================================
// 6. VALIDATION
// ============================================================================

/**
 * Validates that the growth hacker input meets all required field and
 * business-rule constraints.
 *
 * @param input - The raw (untrusted) input object.
 * @returns A ValidationResult with errors (fatal) and warnings (advisory).
 */
export function validateGrowthHackerInput(
  input: Record<string, unknown>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // ── 1. productSpec — required, must be a non-empty object ────────────────
  const productSpec = input.productSpec as Record<string, unknown> | undefined;
  if (!productSpec || typeof productSpec !== "object") {
    errors.push({
      path: "productSpec",
      message: "productSpec is required and must be a non-empty object",
      severity: "error",
    });
  } else {
    const name = productSpec.name;
    if (!name || typeof name !== "string" || String(name).trim().length === 0) {
      errors.push({
        path: "productSpec.name",
        message: "productSpec.name is required and must be a non-empty string",
        severity: "error",
      });
    }
    const description = productSpec.description;
    if (!description || typeof description !== "string" || String(description).trim().length === 0) {
      errors.push({
        path: "productSpec.description",
        message: "productSpec.description is required and must be a non-empty string",
        severity: "error",
      });
    }
  }

  // ── 2. aarrrMetrics — required, must have all five funnel stages ─────────
  const aarrrMetrics = input.aarrrMetrics as Record<string, unknown> | undefined;
  if (!aarrrMetrics || typeof aarrrMetrics !== "object") {
    errors.push({
      path: "aarrrMetrics",
      message: "aarrrMetrics is required and must be an object with all five funnel stages",
      severity: "error",
    });
  } else {
    const stages = ["acquisition", "activation", "retention", "revenue", "referral"];
    for (const stage of stages) {
      const stageData = aarrrMetrics[stage] as Record<string, unknown> | undefined;
      if (!stageData || typeof stageData !== "object") {
        errors.push({
          path: `aarrrMetrics.${stage}`,
          message: `aarrrMetrics.${stage} is required and must be an object`,
          severity: "error",
        });
      }
    }

    // Validate rate boundaries where present
    const activation = aarrrMetrics.activation as Record<string, unknown> | undefined;
    if (activation?.activationRate !== undefined) {
      const rate = Number(activation.activationRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        errors.push({
          path: "aarrrMetrics.activation.activationRate",
          message: "activationRate must be a number between 0 and 1",
          severity: "error",
        });
      }
    }

    const retention = aarrrMetrics.retention as Record<string, unknown> | undefined;
    if (retention) {
      for (const key of ["day1Retention", "day7Retention", "day30Retention", "day90Retention"] as const) {
        const val = retention[key];
        if (val !== undefined) {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 1) {
            errors.push({
              path: `aarrrMetrics.retention.${key}`,
              message: `${key} must be a number between 0 and 1`,
              severity: "error",
            });
          }
        }
      }
    }
  }

  // ── 3. userSegments — required, at least one segment ─────────────────────
  const userSegments = input.userSegments;
  if (!Array.isArray(userSegments) || userSegments.length === 0) {
    errors.push({
      path: "userSegments",
      message: "userSegments is required and must be a non-empty array",
      severity: "error",
    });
  }

  // ── 4. channelPerformance — required, at least one entry ─────────────────
  const channelPerformance = input.channelPerformance;
  if (!Array.isArray(channelPerformance) || channelPerformance.length === 0) {
    errors.push({
      path: "channelPerformance",
      message: "channelPerformance is required and must be a non-empty array",
      severity: "error",
    });
  }

  // ── 5. experimentHistory — optional but validated if present ─────────────
  const experimentHistory = input.experimentHistory;
  if (experimentHistory !== undefined && !Array.isArray(experimentHistory)) {
    errors.push({
      path: "experimentHistory",
      message: "experimentHistory must be an array if provided",
      severity: "error",
    });
  }

  // ── 6. acquisitionTargets — required conditions ──────────────────────────
  const acquisitionTargets = input.acquisitionTargets as Record<string, unknown> | undefined;
  if (acquisitionTargets !== undefined && acquisitionTargets !== null) {
    if (typeof acquisitionTargets !== "object") {
      errors.push({
        path: "acquisitionTargets",
        message: "acquisitionTargets must be an object if provided",
        severity: "error",
      });
    } else {
      const newUsersTarget = acquisitionTargets.newUsersTarget;
      if (newUsersTarget === undefined || newUsersTarget === null) {
        errors.push({
          path: "acquisitionTargets.newUsersTarget",
          message: "acquisitionTargets.newUsersTarget is required when acquisitionTargets is provided",
          severity: "error",
        });
      } else if (typeof newUsersTarget !== "number" || Number(newUsersTarget) <= 0) {
        errors.push({
          path: "acquisitionTargets.newUsersTarget",
          message: "acquisitionTargets.newUsersTarget must be a positive number",
          severity: "error",
        });
      }
    }
  }

  // ── 7. budgetConstraints — optional, validated if provided ───────────────
  const budgetConstraints = input.budgetConstraints;
  if (budgetConstraints !== undefined && !Array.isArray(budgetConstraints)) {
    errors.push({
      path: "budgetConstraints",
      message: "budgetConstraints must be an array if provided",
      severity: "error",
    });
  }

  // ── 8. Optional numeric parameter bounds ─────────────────────────────────
  const mde = input.minimumDetectableEffect;
  if (mde !== undefined && (typeof mde !== "number" || mde <= 0 || mde >= 1)) {
    errors.push({
      path: "minimumDetectableEffect",
      message: "minimumDetectableEffect must be a number between 0 and 1 (exclusive)",
      severity: "error",
    });
  }
  const alpha = input.significanceThreshold;
  if (alpha !== undefined && (typeof alpha !== "number" || alpha <= 0 || alpha >= 1)) {
    errors.push({
      path: "significanceThreshold",
      message: "significanceThreshold must be a number between 0 and 1 (exclusive)",
      severity: "error",
    });
  }
  const power = input.statisticalPower;
  if (power !== undefined && (typeof power !== "number" || power <= 0 || power >= 1)) {
    errors.push({
      path: "statisticalPower",
      message: "statisticalPower must be a number between 0 and 1 (exclusive)",
      severity: "error",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 7. GROWTH HACKER ADAPTER — IAgentAdapter Implementation
// ============================================================================

/**
 * Default agent metadata for the @growth-hacker adapter.
 */
const AGENT_ID: AgentId = "growth-hacker";

/**
 * The @growth-hacker adapter — registered with the Agent Registry and used
 * by the AgentRunner to dispatch growth strategy tasks with full lifecycle
 * management (validate → rateLimit → circuitCheck → execute → retry).
 */
export class GrowthHackerAdapter
  implements IAgentAdapter<GrowthHackerInput, GrowthHackerOutput>
{
  readonly agentId: AgentId = AGENT_ID;
  readonly version = "1.0.0";
  readonly name = "Growth Hacker";
  readonly description =
    "Rapid user acquisition specialist using data-driven experimentation, " +
    "viral loop development, funnel optimization, and scalable channel growth.";
  readonly tags = ["marketing", "growth", "experimentation", "acquisition"];

  readonly readsContextKeys: string[] = [...GROWTH_HACKER_CONTEXT_KEYS.READS];
  readonly writesContextKeys: string[] = [...GROWTH_HACKER_CONTEXT_KEYS.WRITES];

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Pre-execution validation of the raw input payload.
   *
   * Checks:
   * - productSpec.name is a non-empty string
   * - aarrrMetrics is present with all five funnel stages
   * - acquisitionTargets.newUsersTarget > 0 (if acquisitionTargets provided)
   * - userSegments and channelPerformance arrays are non-empty
   *
   * @param input - The raw (untrusted) input object, typically from an
   *                AgentInput<TInput>.payload serialized to JSON.
   * @returns A ValidationResult. If `valid` is `false`, the AgentRunner
   *          rejects execution with status `REJECTED_VALIDATION`.
   */
  validate(input: Record<string, unknown>): ValidationResult {
    return validateGrowthHackerInput(input);
  }

  // ========================================================================
  // Execution
  // ========================================================================

  /**
   * Execute the growth hacking strategy generation.
   *
   * In production, this assembles the full system prompt (incorporating
   * context data from trendReport, competitiveLandscape, socialStrategy)
   * and calls an LLM to produce the structured GrowthHackerOutput.
   *
   * @param input   - The validated GrowthHackerInput payload.
   * @param context - The shared execution context. This adapter reads
   *                  `trendReport`, `competitiveLandscape`, and `socialStrategy`
   *                  keys, and writes `growthExperiments`, `channelPriorities`,
   *                  `viralLoopDesign`, and `funnelOptimizations`.
   * @returns An AgentResult envelope containing the GrowthHackerOutput
   *          on success, or error details on failure.
   */
  async execute(
    input: GrowthHackerInput,
    context: AgentContext,
  ): Promise<AgentResult<GrowthHackerOutput>> {
    const startedAt = Date.now();
    const executionId = crypto.randomUUID?.() ?? `${AGENT_ID}-${startedAt}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      // ── Read upstream context keys ──────────────────────────────────────
      const trendReport: unknown = context.get?.("trendReport") ?? context.data?.trendReport;
      const competitiveLandscape: unknown = context.get?.("competitiveLandscape") ?? context.data?.competitiveLandscape;
      const socialStrategy: unknown = context.get?.("socialStrategy") ?? context.data?.socialStrategy;

      // ── Stub: in production this calls the LLM ──────────────────────────
      // Build prompt from input + context, invoke model, parse structured output.
      //
      // For the stub, we generate a minimal valid GrowthHackerOutput to
      // demonstrate the contract.

      const output: GrowthHackerOutput = this.buildStubOutput(input, {
        trendReport,
        competitiveLandscape,
        socialStrategy,
      });

      // ── Write output to context for downstream agents ───────────────────
      if (typeof context.set === "function") {
        context.set("growthExperiments", output.experiments);
        context.set("channelPriorities", output.channelPriorities);
        context.set("viralLoopDesign", output.viralLoopDesign);
        context.set("funnelOptimizations", output.funnelOptimizations);
      } else if (context.data) {
        context.data.growthExperiments = output.experiments;
        context.data.channelPriorities = output.channelPriorities;
        context.data.viralLoopDesign = output.viralLoopDesign;
        context.data.funnelOptimizations = output.funnelOptimizations;
      }

      const durationMs = Date.now() - startedAt;

      return {
        executionId,
        agentId: AGENT_ID,
        status: "completed",
        data: output,
        error: null,
        errorDetails: null,
        validation: null,
        performance: {
          startedAt: new Date(startedAt).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs,
          retryCount: 0,
        },
        meta: {
          inputSummary: this.summarizeInput(input),
          contextKeysUsed: {
            read: this.readsContextKeys,
            write: this.writesContextKeys,
          },
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unexpected execution error";
      const stack = error instanceof Error ? error.stack : undefined;

      return {
        executionId,
        agentId: AGENT_ID,
        status: "failed",
        data: null,
        error: message,
        errorDetails: stack ? { stack } : null,
        validation: null,
        performance: {
          startedAt: new Date(startedAt).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs,
          retryCount: 0,
        },
        meta: {},
      };
    }
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Build a stub output for development/testing purposes.
   * Replace with LLM invocation in production.
   */
  private buildStubOutput(
    input: GrowthHackerInput,
    contextInputs: {
      trendReport: unknown;
      competitiveLandscape: unknown;
      socialStrategy: unknown;
    },
  ): GrowthHackerOutput {
    const focusStages = input.focusStages ?? GROWTH_HACKER_DEFAULTS.focusStages;
    const hasReferralStage = focusStages.includes(FunnelStage.REFERRAL);
    const hasViralTarget = input.aarrrMetrics.referral.viralCoefficient < 1.0;

    return {
      experiments: [
        {
          experimentId: `exp-${Date.now()}-001`,
          name: `Activation Optimization — ${input.productSpec.name}`,
          hypothesis:
            "Improving the onboarding flow by simplifying the first-run experience " +
            "will increase activation rate by 10% relative.",
          targetFunnelStage: FunnelStage.ACTIVATION,
          channel: GrowthChannel.PRODUCT_LED,
          primaryMetric: {
            name: "activation_rate",
            type: ExperimentVariableType.BINOMIAL,
            currentBaseline: input.aarrrMetrics.activation.activationRate,
            minimumDetectableEffect:
              input.minimumDetectableEffect ?? GROWTH_HACKER_DEFAULTS.minimumDetectableEffect,
            expectedLift: 0.10,
          },
          secondaryMetrics: [
            {
              name: "time_to_activation",
              type: ExperimentVariableType.CONTINUOUS,
              currentBaseline: input.aarrrMetrics.activation.timeToActivation,
              guardrailThreshold: input.aarrrMetrics.activation.timeToActivation * 1.2,
            },
          ],
          sampleSizeRequired: 5000,
          estimatedDurationDays: 14,
          trafficAllocation: 0.5,
          riskLevel: "low",
          segmentationPlan:
            "New users acquired via organic channels; exclude returning users",
          guardrailMetrics: ["d1_retention", "revenue_per_user"],
          stopConditions: [
            "p_value below 0.05 after 7 days",
            "guardrail metric degrades more than 5%",
          ],
          trackingImplementation:
            "Instrument activation event in analytics; A/B test via feature flag",
        },
      ],
      channelPriorities: input.channelPerformance
        .sort((a, b) => b.returnOnAdSpend - a.returnOnAdSpend)
        .slice(0, 5)
        .map((perf, idx) => ({
          channel: perf.channel as GrowthChannel,
          priorityScore: Math.round((1 - idx / 5) * 100),
          rank: idx + 1,
          estimatedCac: perf.costPerAcquisition,
          estimatedLtv: input.aarrrMetrics.revenue.lifetimeValue,
          estimatedReach: perf.impressions,
          scalability: idx < 2 ? ("high" as const) : idx < 4 ? ("medium" as const) : ("low" as const),
          timeToScale: idx === 0 ? "1–2 weeks" : idx < 3 ? "3–4 weeks" : "6+ weeks",
          confidence: perf.returnOnAdSpend > 3 ? ("high" as const) : ("medium" as const),
          rationale: `ROAS of ${perf.returnOnAdSpend.toFixed(2)} with CAC $${perf.costPerAcquisition.toFixed(2)}`,
          budgetAllocation: Math.round(
            (input.aarrrMetrics.acquisition.totalAcquisitionCost / input.channelPerformance.length) *
              (5 - idx),
          ),
          expectedNewUsers: Math.round(perf.conversions * (1 + (5 - idx) * 0.1)),
          expectedRoi: perf.returnOnAdSpend * (1 + (5 - idx) * 0.05),
        })),
      viralLoopDesign:
        hasReferralStage && hasViralTarget
          ? {
              loopType: ViralLoopType.INVITE,
              loopDescription: `Referral program for ${input.productSpec.name}: existing users invite peers via shareable link`,
              currentKFactor: input.aarrrMetrics.referral.viralCoefficient,
              targetKFactor: 1.2,
              inviteMechanism: "In-app share button + personalized referral link",
              incentiveStructure: "Sender gets 1 month free; receiver gets 20% off first payment",
              conversionSteps: [
                {
                  step: 1,
                  description: "User triggers share action",
                  currentConversion: 0.12,
                  targetConversion: 0.25,
                  optimizationLever: "Prominent placement in post-activation modal",
                },
                {
                  step: 2,
                  description: "Recipient clicks referral link",
                  currentConversion: 0.35,
                  targetConversion: 0.50,
                  optimizationLever: "Personalized landing page with social proof",
                },
                {
                  step: 3,
                  description: "Recipient completes sign-up",
                  currentConversion: 0.40,
                  targetConversion: 0.60,
                  optimizationLever: "Streamlined registration pre-filled with referrer context",
                },
              ],
              viralCycleTime: "48 hours",
              shareChannel: GrowthChannel.EMAIL,
              estimatedVirality: {
                organicGrowthRate: 0.08,
                paidRequired: true,
                breakEvenKFactor: 1.0,
                projectedKFactorAfter: 1.15,
              },
              implementationRequirements: [
                "Referral tracking system with unique codes",
                "In-app share sheet integration",
                "Automated reward fulfillment pipeline",
                "Anti-fraud detection for referral abuse",
              ],
            }
          : null,
      funnelOptimizations: focusStages.map((stage) => {
        const currentRate = this.getStageConversionRate(stage, input.aarrrMetrics);
        const targetRate = Math.min(currentRate * 1.3, 1.0);
        return {
          stage,
          currentConversionRate: currentRate,
          targetConversionRate: targetRate,
          estimatedLift: targetRate - currentRate,
          recommendedActions: this.getRecommendedActions(stage, currentRate),
          effortEstimate: currentRate < 0.2 ? ("high" as const) : ("medium" as const),
          impactEstimate: currentRate < 0.3 ? ("high" as const) : ("medium" as const),
          confidence: currentRate > 0.1 ? ("medium" as const) : ("low" as const),
          dependencies:
            stage === FunnelStage.ACTIVATION
              ? ["Onboarding flow redesign", "Feature flag infrastructure"]
              : stage === FunnelStage.REFERRAL
                ? ["Referral tracking implementation", "Reward system"]
                : [],
          experimentationRequired: true,
          quickWin: currentRate < 0.15,
        };
      }),
      projectedImpact: {
        expectedNewUsers: Math.round(
          input.aarrrMetrics.acquisition.newUsers * 1.25,
        ),
        expectedActivationLift: 0.12,
        expectedRetentionLift: 0.08,
        expectedRevenueLift: 0.15,
        expectedKFactorLift: hasReferralStage ? 0.3 : 0,
        totalProjectedLiftDescription:
          "25% increase in new users, 12% improvement in activation, " +
          "and 15% revenue uplift over the next quarter",
        confidenceInterval: [0.08, 0.22],
      },
      executiveSummary: [
        `Growth strategy for ${input.productSpec.name}:`,
        `- ${focusStages.length} funnel stages targeted for optimization`,
        `- ${input.channelPerformance.length} channels analyzed and prioritized`,
        `- ${this.buildStubOutput.length > 0 ? "1" : "0"} experiment designed for activation improvement`,
        hasViralTarget && hasReferralStage
          ? "- Referral viral loop recommended (k-factor from " +
            `${input.aarrrMetrics.referral.viralCoefficient.toFixed(2)} → 1.15)`
          : "",
        `- Projected 25% user growth with ${(this.getAvgCac(input) / input.aarrrMetrics.revenue.lifetimeValue * 100).toFixed(0)}% LTV:CAC ratio`,
      ]
        .filter(Boolean)
        .join("\n"),
      warnings: contextInputs.trendReport
        ? []
        : ["No trendReport found in context — market trend analysis may be incomplete"],
    };
  }

  /**
   * Extract the conversion rate for a given funnel stage from current metrics.
   */
  private getStageConversionRate(
    stage: FunnelStage,
    metrics: AarrrMetrics,
  ): number {
    switch (stage) {
      case FunnelStage.ACQUISITION:
        return metrics.acquisition.newUsers > 0 ? 1.0 : 0;
      case FunnelStage.ACTIVATION:
        return metrics.activation.activationRate;
      case FunnelStage.RETENTION:
        return metrics.retention.day7Retention;
      case FunnelStage.REVENUE:
        return metrics.acquisition.newUsers > 0
          ? metrics.revenue.monthlyRecurringRevenue / metrics.acquisition.newUsers / 100
          : 0;
      case FunnelStage.REFERRAL:
        return metrics.referral.inviteConversionRate;
      default:
        return 0;
    }
  }

  /**
   * Get recommended optimization actions for a funnel stage.
   */
  private getRecommendedActions(
    stage: FunnelStage,
    currentRate: number,
  ): string[] {
    const generic: string[] = [
      "Run A/B test on primary conversion event",
      "Analyze drop-off cohorts to identify friction points",
    ];

    switch (stage) {
      case FunnelStage.ACQUISITION:
        return [
          ...generic,
          "Optimize highest-ROI channels with increased budget allocation",
          "Launch lookalike audiences on top-performing paid channels",
          "Implement UTM tagging audit for accurate source attribution",
        ];
      case FunnelStage.ACTIVATION:
        return [
          ...generic,
          currentRate < 0.3
            ? "Redesign onboarding flow to reduce time-to-value"
            : "Add progressive onboarding with feature unlocks",
          "Implement in-app guidance and tooltips for key actions",
          "Create activation-focused email drip for stalled users",
        ];
      case FunnelStage.RETENTION:
        return [
          ...generic,
          "Build engagement scoring model to identify at-risk users",
          "Deploy re-engagement campaigns with personalized content",
          "Add habit-forming mechanics (streaks, notifications, goals)",
        ];
      case FunnelStage.REVENUE:
        return [
          ...generic,
          "Test pricing page variations and payment friction reduction",
          "Introduce usage-based upsell triggers at key milestones",
          "Launch annual subscription discount to reduce churn",
        ];
      case FunnelStage.REFERRAL:
        return [
          ...generic,
          "Implement in-app referral prompts at post-activation moment",
          "A/B test incentive amounts and reward structures",
          "Add social sharing with deep-linked landing pages",
        ];
      default:
        return generic;
    }
  }

  /**
   * Calculate average CAC across all channels.
   */
  private getAvgCac(input: GrowthHackerInput): number {
    const totalSpend = input.channelPerformance.reduce(
      (sum, c) => sum + c.spend,
      0,
    );
    const totalConversions = input.channelPerformance.reduce(
      (sum, c) => sum + c.conversions,
      0,
    );
    return totalConversions > 0 ? totalSpend / totalConversions : 0;
  }

  /**
   * Generate a human-readable summary of the input for telemetry metadata.
   */
  private summarizeInput(input: GrowthHackerInput): Record<string, unknown> {
    return {
      product: input.productSpec.name,
      userSegments: input.userSegments.length,
      channelPerformance: input.channelPerformance.length,
      experimentHistory: input.experimentHistory.length,
      focusStages: input.focusStages?.map((s) => s) ?? "all",
      acquisitionTargets: input.acquisitionTargets
        ? `${input.acquisitionTargets.newUsersTarget} users`
        : "not specified",
      budgetConstraints: input.budgetConstraints?.length ?? 0,
    };
  }
}

// ============================================================================
// 8. SINGLETON EXPORT
// ============================================================================

/**
 * Pre-instantiated singleton for registry registration.
 * Import this when adding to the ALL_ADAPTERS map.
 */
export const growthHackerAdapter = new GrowthHackerAdapter();
export default growthHackerAdapter;
