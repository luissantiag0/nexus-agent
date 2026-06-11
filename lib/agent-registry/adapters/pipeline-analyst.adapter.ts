// ============================================================================
// Nexus Agent Platform — @pipeline-analyst Agent Adapter
// ============================================================================
// Agent ID: sales-pipeline-analyst
// Prompt Version: pipeline-analyst.v1
// Domain: sales
// Capabilities: pipeline-analysis, deal-scoring, forecast-modeling,
//               velocity-analysis, coverage-analysis, risk-detection,
//               win-rate-analysis, cycle-time-analysis, data-quality-validation
// ============================================================================
//
// The Pipeline Analyst is a revenue operations specialist that turns pipeline
// data into decisions. It diagnoses pipeline health, forecasts revenue with
// analytical rigor, scores deal quality, and surfaces pipeline risks before
// they become missed quarters.
// ============================================================================

import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentMetadata,
  AgentSchema,
  ValidationResult,
  ValidationRule,
} from "../types";

// ---------------------------------------------------------------------------
// 1. ENUMS & LITERAL TYPES
// ---------------------------------------------------------------------------

/**
 * Pipeline stage identifiers used in deal lifecycle tracking.
 * Each stage maps to a specific qualification depth and expected conversion rate.
 */
export enum PipelineStage {
  DISCOVERY = "discovery",
  QUALIFICATION = "qualification",
  EVALUATION = "evaluation",
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  CLOSED_WON = "closed-won",
  CLOSED_LOST = "closed-lost",
}

/**
 * Deal health classification — summary verdict for a single opportunity.
 */
export enum DealHealthStatus {
  HEALTHY = "healthy",               // On track — qualified, progressing, engaged
  ATTENTION = "attention",           // Minor risk signals — needs review
  AT_RISK = "at-risk",               // Significant risk — requires intervention
  CRITICAL = "critical",             // Highly likely to slip or die
  DISQUALIFIED = "disqualified",     // Should be removed from pipeline
}

/**
 * Forecast confidence tier.
 */
export enum ForecastTier {
  COMMIT = "commit",           // >90% confidence — evidence-backed
  BEST_CASE = "best-case",     // >60% confidence — high-velocity qualified
  UPSIDE = "upside",           // <60% confidence — early-stage or uncertain
}

/**
 * MEDDPICC qualification element.
 */
export enum MeddpiccElement {
  METRICS = "metrics",
  ECONOMIC_BUYER = "economic-buyer",
  DECISION_CRITERIA = "decision-criteria",
  DECISION_PROCESS = "decision-process",
  PAPER_PROCESS = "paper-process",
  IMPLICATED_PAIN = "implicated-pain",
  CHAMPION = "champion",
  COMPETITION = "competition",
}

/**
 * Risk signal categories surfaced by pipeline analysis.
 */
export enum RiskCategory {
  STALLED_DEAL = "stalled-deal",
  SINGLE_THREADED = "single-threaded",
  UNDERQUALIFIED = "underqualified",
  MISSING_ECONOMIC_BUYER = "missing-economic-buyer",
  AGING_PIPELINE = "aging-pipeline",
  COVERAGE_GAP = "coverage-gap",
  VELOCITY_DECLINE = "velocity-decline",
  WIN_RATE_EROSION = "win-rate-erosion",
  DATA_QUALITY = "data-quality",
  SEASONAL_DEVIATION = "seasonal-deviation",
}

/**
 * Recommended action type for deal intervention.
 */
export enum ActionType {
  SCHEDULE_EB_MEETING = "schedule-eb-meeting",
  INITIATE_PAPER_PROCESS = "initiate-paper-process",
  MULTI_THREAD_ACCOUNT = "multi-thread-account",
  REFINE_BUSINESS_CASE = "refine-business-case",
  RUN_COMPETITIVE_BATTLECARD = "run-competitive-battlecard",
  STAGE_CORRECTION = "stage-correction",
  REMOVE_FROM_PIPELINE = "remove-from-pipeline",
  ACCELERATE_TIMELINE = "accelerate-timeline",
  EXECUTIVE_SPONSOR_ASSIGNMENT = "executive-sponsor-assignment",
  PIPELINE_CREATION_BLITZ = "pipeline-creation-blitz",
}

// ---------------------------------------------------------------------------
// 2. CORE DATA STRUCTURES
// ---------------------------------------------------------------------------

/**
 * A single deal/opportunity in the pipeline snapshot.
 */
export interface DealRecord {
  /** Unique opportunity identifier */
  id: string;
  /** Account or company name */
  accountName: string;
  /** Deal name / description */
  dealName: string;
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Deal value in base currency */
  value: number;
  /** Expected close date (ISO-8601) */
  closeDate: string;
  /** Owner rep identifier */
  repId: string;
  /** Rep name (human-readable) */
  repName?: string;
  /** Date the deal was created (ISO-8601) */
  createdDate: string;
  /** Date of the last meaningful activity on this deal (ISO-8601) */
  lastActivityDate: string;
  /** Date the deal entered the current stage (ISO-8601) */
  stageEntryDate?: string;
  /** Number of identified stakeholders contacted */
  stakeholderCount?: number;
  /** Whether the economic buyer has been identified and engaged */
  economicBuyerEngaged?: boolean;
  /** MEDDPICC qualification scores per element (0-2) */
  meddpiccScores?: Partial<Record<MeddpiccElement, number>>;
  /** Currency code (ISO 4217) */
  currency?: string;
  /** Deal segment classification */
  segment?: "enterprise" | "mid-market" | "smb";
  /** Lead source */
  source?: string;
}

/**
 * Historical win/loss data used for conversion rate calculations.
 */
export interface HistoricalConversionData {
  /** Time period this data covers */
  periodLabel: string;
  /** Win rate by stage (fractional, 0.0-1.0) */
  stageWinRates: Record<PipelineStage, number>;
  /** Average days in each stage */
  stageDurations: Partial<Record<PipelineStage, number>>;
  /** Overall win rate (fractional, 0.0-1.0) */
  overallWinRate: number;
  /** Count of won deals in period */
  wonCount: number;
  /** Count of lost deals in period */
  lostCount: number;
  /** Average deal size of won deals */
  averageDealSize: number;
  /** Median sales cycle length in days */
  medianCycleDays: number;
  /** Sample size for statistical significance */
  sampleSize: number;
}

/**
 * Quota and target data for coverage analysis.
 */
export interface QuotaData {
  /** Period identifier (e.g. "Q2-2026") */
  period: string;
  /** Total team quota for the period */
  totalQuota: number;
  /** Revenue already closed in the period */
  closedRevenue: number;
  /** Remaining quota to hit */
  remainingQuota: number;
  /** Quota breakdown by rep */
  repQuotas: Record<string, number>;
}

/**
 * Pipeline velocity metrics — the compound leading indicator.
 */
export interface VelocityMetrics {
  /** Pipeline velocity in currency/day */
  velocityPerDay: number;
  /** Number of qualified opportunities in the period */
  qualifiedOpportunityCount: number;
  /** Average deal size across all active deals */
  averageDealSize: number;
  /** Overall weighted win rate */
  winRate: number;
  /** Average sales cycle length in days */
  cycleLengthDays: number;
  /** Period-over-period trend indicators */
  trend: "accelerating" | "stable" | "decelerating";
  /** Change from prior period as a fraction */
  changeFromPriorPeriod: number;
}

/**
 * Coverage analysis — raw and quality-adjusted ratios.
 */
export interface CoverageAnalysis {
  /** Simple (stage-weighted) pipeline-to-quota ratio */
  rawCoverageRatio: number;
  /** Total weighted pipeline value */
  weightedPipelineValue: number;
  /** Quality-adjusted pipeline value (discounted by health score) */
  qualityAdjustedValue: number;
  /** Quality-adjusted coverage ratio */
  qualityAdjustedRatio: number;
  /** Coverage by segment */
  segmentCoverage: Array<{
    segment: string;
    quotaRemaining: number;
    weightedPipeline: number;
    coverageRatio: number;
    qualityAdjusted: number;
  }>;
  /** Flag indicating whether coverage is below target threshold */
  coverageGap: boolean;
}

/**
 * Stage conversion funnel — a single stage's metrics.
 */
export interface StageFunnelEntry {
  stage: PipelineStage;
  dealsEntered: number;
  dealsConverted: number;
  dealsLost: number;
  conversionRate: number;
  averageDaysInStage: number;
  benchmarkDays: number;
  /** Whether this stage is deviating from benchmark (>1.5x) */
  stalledIndicator: boolean;
}

/**
 * Aggregate funnel report across all stages.
 */
export interface StageConversionFunnel {
  stages: StageFunnelEntry[];
  /** Stage where the biggest drop-off occurs */
  biggestDropOffStage: PipelineStage;
  /** Overall drop-off rate from first to last stage */
  overallConversionRate: number;
}

/**
 * A single identified risk with severity and recommended action.
 */
export interface PipelineRiskFlag {
  /** Unique risk identifier */
  id: string;
  /** Risk category */
  category: RiskCategory;
  /** Human-readable risk description */
  description: string;
  /** Severity */
  severity: "critical" | "high" | "medium" | "low";
  /** Deal ID this risk is associated with (if scoped to a deal) */
  dealId?: string;
  /** Deal value at risk */
  valueAtRisk?: number;
  /** Specific recommended action */
  recommendedAction: ActionType;
  /** Additional context or remediation guidance */
  remediationGuidance: string;
}

/**
 * A single deal scoring card — MEDDPICC + engagement + velocity.
 */
export interface DealScoreCard {
  dealId: string;
  dealName: string;
  /** MEDDPICC qualification score (0-16) */
  meddpiccScore: number;
  /** Per-element scores */
  meddpiccBreakdown: Partial<Record<MeddpiccElement, { score: number; evidence: string; gap: string }>>;
  /** Engagement intensity score (0-10) */
  engagementScore: number;
  /** Progression velocity score (0-10) */
  velocityScore: number;
  /** Composite health score (0-36) */
  compositeScore: number;
  /** Health classification */
  healthStatus: DealHealthStatus;
  /** Top 3 risk signals identified */
  topRisks: string[];
}

/**
 * Probability-weighted forecast with confidence intervals.
 */
export interface ForecastModel {
  /** Commit forecast (>90% confidence) */
  commit: { amount: number; dealCount: number; assumptions: string[] };
  /** Best-case forecast (>60% confidence) */
  bestCase: { amount: number; dealCount: number; assumptions: string[] };
  /** Upside forecast (<60% confidence) */
  upside: { amount: number; dealCount: number; assumptions: string[] };
  /** Stage-weighted comparison for variance detection */
  stageWeightedComparison: {
    stageWeightedAmount: number;
    velocityAdjustedAmount: number;
    engagementAdjustedAmount: number;
    historicalPatternAmount: number;
    varianceFromCommit: number;
  };
  /** Key risk factors with quantified impact */
  riskFactors: Array<{ description: string; quantifiedImpact: number; probability: number }>;
  /** Key upside opportunities */
  upsideOpportunities: Array<{ description: string; potentialAmount: number; probability: number }>;
}

/**
 * Forecast accuracy tracking for a given period.
 */
export interface ForecastAccuracyRecord {
  period: string;
  commitForecast: number;
  bestCaseForecast: number;
  actualRevenue: number;
  commitAccuracyPct: number;
  bestCaseAccuracyPct: number;
  /** Comparison of different forecasting methods against actual */
  methodAccuracy: Record<string, number>;
}

// ---------------------------------------------------------------------------
// 3. AGENT INPUT / OUTPUT SCHEMAS
// ---------------------------------------------------------------------------

/**
 * Input contract for the @pipeline-analyst agent adapter.
 *
 * The pipeline analyst requires a full pipeline snapshot, historical conversion
 * data for base rates, quota targets for coverage, and optional rep performance
 * data for coaching insights.
 */
export interface PipelineAnalystInput {
  /** Full pipeline snapshot — array of deal records */
  pipelineSnapshot: DealRecord[];

  /** Historical win/loss data for conversion base rates */
  historicalData: HistoricalConversionData;

  /** Quota and targets for coverage ratio analysis */
  quotaData: QuotaData;

  /** Optional: rep performance data for rep-level diagnostics */
  repPerformanceData?: Array<{
    repId: string;
    repName: string;
    winRate: number;
    averageDealSize: number;
    cycleLengthDays: number;
    pipelineValue: number;
    quotaAttainmentPct: number;
  }>;

  /** Optional: benchmark stage durations for velocity comparison */
  stageBenchmarks?: Partial<Record<PipelineStage, { benchmarkDays: number; benchmarkConversionRate: number }>>;

  /** Optional: seasonal adjustment factors (by month, 1-12) */
  seasonalFactors?: Record<number, number>;

  /**
   * Analysis depth requested.
   * @default "standard"
   */
  analysisDepth?: "lightning" | "standard" | "deep";

  /** Currency code for monetary values */
  currency?: string;
}

/**
 * Output contract from the @pipeline-analyst agent adapter.
 */
export interface PipelineAnalystOutput {
  /** Pipeline health report execution summary */
  summary: string;

  /** Composite pipeline health score (0-100) */
  pipelineHealthScore: number;

  /** Velocity metrics with trend analysis */
  velocityMetrics: VelocityMetrics;

  /** Coverage analysis with quality adjustment */
  coverageAnalysis: CoverageAnalysis;

  /** Stage conversion funnel with benchmark comparisons */
  stageFunnel: StageConversionFunnel;

  /** Forecast model with confidence tiers */
  forecast: ForecastModel;

  /** Identified risk flags requiring intervention */
  riskFlags: PipelineRiskFlag[];

  /** Deal scoring cards for high-value or at-risk deals */
  dealScoreCards: DealScoreCard[];

  /** Forecast accuracy record (if historical data was provided) */
  forecastAccuracy?: ForecastAccuracyRecord;

  /** Data quality warnings — fields that were missing or malformed */
  dataQualityWarnings: string[];

  /** Recommended systemic actions (not deal-specific) */
  systemicRecommendations: Array<{
    action: string;
    rationale: string;
    expectedImpact: string;
    priority: "critical" | "high" | "medium" | "low";
  }>;
}

// ---------------------------------------------------------------------------
// 4. AGENT CONTEXT
// ---------------------------------------------------------------------------

/**
 * Context keys that the @pipeline-analyst agent reads from and writes to
 * the shared AgentContext store during chain/multi-agent execution.
 *
 * Read keys (consumed from upstream agents):
 *   - pipelineSnapshot   – Full deal-level pipeline data
 *   - dealVelocityMap    – Pre-computed velocity by deal/segment/rep
 *   - stageConversionRates – Historical and current conversion rates
 *   - forecastAccuracy   – Prior forecast accuracy records
 *
 * Write keys (produced for downstream agents):
 *   - pipelineRiskFlags  – Surfaced risk signals requiring intervention
 *   - dealScoreCards     – Scored deal assessments
 *   - forecastModel      – Probability-weighted forecast with confidence tiers
 *   - pipelineHealthReport – Full diagnostic report
 */
export interface PipelineAnalystContextKeys {
  /** ⬇️ READ — Full pipeline snapshot (deal-level detail) */
  pipelineSnapshot: DealRecord[];

  /** ⬇️ READ — Pre-computed deal velocity map by deal/segment/rep */
  dealVelocityMap: Record<string, {
    velocity: number;
    daysInStage: number;
    benchmarkRatio: number;
    trend: "accelerating" | "stable" | "decelerating";
  }>;

  /** ⬇️ READ — Stage conversion rates (historical and current period) */
  stageConversionRates: Record<PipelineStage, {
    historicalRate: number;
    currentRate: number;
    sampleSize: number;
    trend: "improving" | "stable" | "declining";
  }>;

  /** ⬇️ READ — Prior forecast accuracy tracking */
  forecastAccuracy: ForecastAccuracyRecord[];

  /** ⬆️ WRITE — Pipeline risk flags surfaced by analysis */
  pipelineRiskFlags: PipelineRiskFlag[];

  /** ⬆️ WRITE — Deal scoring cards for high-value or at-risk deals */
  dealScoreCards: DealScoreCard[];

  /** ⬆️ WRITE — Forecast model output */
  forecastModel: ForecastModel;

  /** ⬆️ WRITE — Full pipeline health diagnostic report */
  pipelineHealthReport: {
    pipelineHealthScore: number;
    velocityMetrics: VelocityMetrics;
    coverageAnalysis: CoverageAnalysis;
    stageFunnel: StageConversionFunnel;
    dataQualityWarnings: string[];
  };
}

// ---------------------------------------------------------------------------
// 5. ADAPTER EXPORTS — REGISTRY CONTRACT
// ---------------------------------------------------------------------------

/**
 * Metadata that the Agent Registry uses to register this adapter.
 */
export const PIPELINE_ANALYST_ADAPTER_META = {
  id: "sales-pipeline-analyst" as const,
  name: "Pipeline Analyst",
  version: "1.0.0" as const,
  promptVersion: "pipeline-analyst.v1" as const,
  description:
    "Revenue operations analyst specializing in pipeline health diagnostics, " +
    "deal velocity analysis, forecast accuracy, and data-driven sales coaching. " +
    "Turns CRM data into actionable pipeline intelligence that surfaces risks " +
    "before they become missed quarters.",
  domain: "sales" as const,
  capabilities: [
    "pipeline-analysis",
    "deal-scoring",
    "forecast-modeling",
    "velocity-analysis",
    "coverage-analysis",
    "risk-detection",
    "win-rate-analysis",
    "cycle-time-analysis",
    "data-quality-validation",
  ] as const,
  // Context keys consumed from chain/upstream agents
  readsContextKeys: [
    "pipelineSnapshot",
    "dealVelocityMap",
    "stageConversionRates",
    "forecastAccuracy",
  ] as const,
  // Context keys produced for downstream agents
  writesContextKeys: [
    "pipelineRiskFlags",
    "dealScoreCards",
    "forecastModel",
    "pipelineHealthReport",
  ] as const,
} as const;

// ---------------------------------------------------------------------------
// 6. VALIDATION RULES
// ---------------------------------------------------------------------------

/**
 * Validation result for a single rule check.
 */
export interface ValidationResultItem {
  rule: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning";
}

/**
 * Aggregate result of running all validation rules.
 */
export interface ValidationReport {
  passed: boolean;
  results: ValidationResultItem[];
  errors: ValidationResultItem[];
  warnings: ValidationResultItem[];
}

// ---------------------------------------------------------------------------
// 7. VALIDATION FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Validates pipeline data completeness.
 * Checks every DealRecord for required fields and data type correctness.
 */
export function validatePipelineSnapshot(deals: DealRecord[]): ValidationReport {
  const results: ValidationResultItem[] = [];

  if (!deals || deals.length === 0) {
    results.push({
      rule: "pipeline-snapshot:empty",
      passed: false,
      message: "Pipeline snapshot is empty — no deals to analyze",
      severity: "error",
    });
    return aggregateValidation(results);
  }

  const requiredFields: Array<{
    key: string;
    test: (d: DealRecord) => boolean;
    label: string;
    type: string;
  }> = [
    { key: "id",         test: (d) => typeof d.id === "string" && d.id.length > 0,               label: "Deal ID",              type: "string" },
    { key: "accountName",test: (d) => typeof d.accountName === "string" && d.accountName.length > 0,label: "Account name",       type: "string" },
    { key: "stage",      test: (d) => Object.values(PipelineStage).includes(d.stage),             label: "Pipeline stage",       type: "enum (PipelineStage)" },
    { key: "value",      test: (d) => typeof d.value === "number" && d.value >= 0,                label: "Deal value",           type: "number (currency)" },
    { key: "closeDate",  test: (d) => typeof d.closeDate === "string" && !isNaN(Date.parse(d.closeDate)), label: "Close date", type: "ISO-8601 date string" },
    { key: "repId",      test: (d) => typeof d.repId === "string" && d.repId.length > 0,          label: "Rep ID",               type: "string" },
    { key: "createdDate",test: (d) => typeof d.createdDate === "string" && !isNaN(Date.parse(d.createdDate)), label: "Created date", type: "ISO-8601 date string" },
    { key: "lastActivityDate", test: (d) => typeof d.lastActivityDate === "string" && !isNaN(Date.parse(d.lastActivityDate)), label: "Last activity date", type: "ISO-8601 date string" },
  ];

  const errorsByField: Record<string, number> = {};

  for (const field of requiredFields) {
    errorsByField[field.key] = 0;
    for (const deal of deals) {
      if (!field.test(deal)) {
        errorsByField[field.key]++;
      }
    }
  }

  for (const field of requiredFields) {
    const failureCount = errorsByField[field.key];
    const totalDeals = deals.length;
    const failureRate = failureCount / totalDeals;

    if (failureRate > 0.5) {
      results.push({
        rule: `pipeline-snapshot:${field.key}`,
        passed: false,
        message: `${failureCount}/${totalDeals} deals (${(failureRate * 100).toFixed(0)}%) are missing or have invalid "${field.label}" (expected ${field.type}) — analysis will be degraded`,
        severity: "error",
      });
    } else if (failureRate > 0.1) {
      results.push({
        rule: `pipeline-snapshot:${field.key}`,
        passed: false,
        message: `${failureCount}/${totalDeals} deals (${(failureRate * 100).toFixed(0)}%) have incomplete "${field.label}" — consider data cleanup`,
        severity: "warning",
      });
    } else if (failureCount > 0) {
      results.push({
        rule: `pipeline-snapshot:${field.key}`,
        passed: false,
        message: `${failureCount} deal(s) with incomplete "${field.label}" — minor data quality gap`,
        severity: "warning",
      });
    } else {
      results.push({
        rule: `pipeline-snapshot:${field.key}`,
        passed: true,
        message: `All deals have valid "${field.label}"`,
        severity: "warning",
      });
    }
  }

  // Cross-reference: stage entry date should be <= last activity date
  const stageDateIssues = deals.filter(
    (d) => d.stageEntryDate && d.lastActivityDate && new Date(d.stageEntryDate) > new Date(d.lastActivityDate),
  );
  if (stageDateIssues.length > 0) {
    results.push({
      rule: "pipeline-snapshot:stage-entry-after-last-activity",
      passed: false,
      message: `${stageDateIssues.length} deal(s) have a stage entry date AFTER the last activity date — stage or activity data is inconsistent`,
      severity: "warning",
    });
  }

  // Cross-reference: close date should be in the future for active stages
  const pastDueDeals = deals.filter(
    (d) =>
      d.stage !== PipelineStage.CLOSED_WON &&
      d.stage !== PipelineStage.CLOSED_LOST &&
      new Date(d.closeDate) < new Date(),
  );
  if (pastDueDeals.length > 0) {
    results.push({
      rule: "pipeline-snapshot:past-close-date",
      passed: false,
      message: `${pastDueDeals.length} active deal(s) have past close dates — review for stage correctness or timeline reset`,
      severity: "warning",
    });
  }

  // Check for stale deals (no activity in 30+ days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const staleDeals = deals.filter(
    (d) =>
      d.stage !== PipelineStage.CLOSED_WON &&
      d.stage !== PipelineStage.CLOSED_LOST &&
      new Date(d.lastActivityDate) < thirtyDaysAgo,
  );
  if (staleDeals.length > 0) {
    results.push({
      rule: "pipeline-snapshot:stale-deals",
      passed: false,
      message: `${staleDeals.length} active deal(s) have had no activity in 30+ days — flag for pipeline review`,
      severity: "warning",
    });
  }

  // Validate currency
  const valueErrors = deals.filter((d) => typeof d.value !== "number" || d.value < 0 || isNaN(d.value));
  if (valueErrors.length > 0) {
    results.push({
      rule: "pipeline-snapshot:invalid-value",
      passed: false,
      message: `${valueErrors.length} deal(s) have invalid or negative deal values`,
      severity: "error",
    });
  }

  return aggregateValidation(results);
}

/**
 * Validates historical data completeness.
 */
export function validateHistoricalData(data: HistoricalConversionData | null | undefined): ValidationReport {
  const results: ValidationResultItem[] = [];

  if (!data) {
    results.push({
      rule: "historical-data:missing",
      passed: false,
      message: "No historical data provided — forecast will use stage-weighted probabilities without base-rate adjustment",
      severity: "warning",
    });
    return aggregateValidation(results);
  }

  if (data.sampleSize < 30) {
    results.push({
      rule: "historical-data:small-sample",
      passed: false,
      message: `Historical data sample size (${data.sampleSize}) is below 30 — conversion rates may have high variance`,
      severity: "warning",
    });
  }

  if (data.overallWinRate < 0 || data.overallWinRate > 1) {
    results.push({
      rule: "historical-data:win-rate-range",
      passed: false,
      message: `Overall win rate (${data.overallWinRate}) is outside expected range [0.0, 1.0]`,
      severity: "error",
    });
  }

  const stageRatesOk = Object.values(data.stageWinRates).every((r) => r >= 0 && r <= 1);
  if (!stageRatesOk) {
    results.push({
      rule: "historical-data:stage-win-rate-range",
      passed: false,
      message: "One or more stage win rates are outside expected range [0.0, 1.0]",
      severity: "error",
    });
  }

  return aggregateValidation(results);
}

/**
 * Validates quota data completeness.
 */
export function validateQuotaData(quota: QuotaData | null | undefined): ValidationReport {
  const results: ValidationResultItem[] = [];

  if (!quota) {
    results.push({
      rule: "quota-data:missing",
      passed: false,
      message: "No quota data provided — coverage analysis will be skipped",
      severity: "warning",
    });
    return aggregateValidation(results);
  }

  if (quota.totalQuota <= 0) {
    results.push({
      rule: "quota-data:total-quota",
      passed: false,
      message: `Total quota (${quota.totalQuota}) must be greater than zero`,
      severity: "error",
    });
  }

  if (quota.remainingQuota < 0) {
    results.push({
      rule: "quota-data:remaining-quota",
      passed: false,
      message: `Remaining quota (${quota.remainingQuota}) is negative — check closed revenue value`,
      severity: "error",
    });
  }

  return aggregateValidation(results);
}

/**
 * Type guard: checks if a value is a valid non-negative number usable for currency.
 */
export function isValidCurrencyValue(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && value >= 0 && isFinite(value);
}

/**
 * Type guard: checks if a string is a valid ISO-8601 date.
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return !isNaN(parsed);
}

/**
 * Type guard: checks if a value is a valid PipelineStage enum member.
 */
export function isValidPipelineStage(value: unknown): value is PipelineStage {
  return Object.values(PipelineStage).includes(value as PipelineStage);
}

/**
 * Cross-reference pipeline data against historical averages.
 * Flags deviations beyond 1.5x the historical baseline.
 */
export function crossReferenceHistoricalAverages(
  deals: DealRecord[],
  historicalData: HistoricalConversionData,
): ValidationResultItem[] {
  const results: ValidationResultItem[] = [];

  if (!historicalData) return results;

  // Check average deal size deviation
  const currentAvgDealSize = deals.reduce((sum, d) => sum + d.value, 0) / deals.length;
  const histAvgDealSize = historicalData.averageDealSize;

  if (histAvgDealSize > 0) {
    const ratio = currentAvgDealSize / histAvgDealSize;
    if (ratio > 1.5) {
      results.push({
        rule: "cross-ref:deal-size-above-historical",
        passed: false,
        message: `Current average deal size (${formatCurrency(currentAvgDealSize)}) is ${(ratio * 100 - 100).toFixed(0)}% above historical average (${formatCurrency(histAvgDealSize)}) — may indicate scope creep or segment mix shift`,
        severity: "warning",
      });
    } else if (ratio < 0.5) {
      results.push({
        rule: "cross-ref:deal-size-below-historical",
        passed: false,
        message: `Current average deal size (${formatCurrency(currentAvgDealSize)}) is ${(100 - ratio * 100).toFixed(0)}% below historical average (${formatCurrency(histAvgDealSize)}) — may indicate discounting pressure or market shift`,
        severity: "warning",
      });
    }
  }

  // Check cycle length deviation (using stage entry to compute rough cycle)
  const dealsWithStageDates = deals.filter((d) => d.stageEntryDate && d.createdDate);
  if (dealsWithStageDates.length >= 5 && historicalData.medianCycleDays > 0) {
    const currentCycleDays =
      dealsWithStageDates.reduce((sum, d) => {
        const stageEntry = new Date(d.stageEntryDate!);
        const created = new Date(d.createdDate);
        return sum + Math.max(0, (stageEntry.getTime() - created.getTime()) / 86400000);
      }, 0) / dealsWithStageDates.length;

    const cycleRatio = currentCycleDays / historicalData.medianCycleDays;
    if (cycleRatio > 1.5) {
      results.push({
        rule: "cross-ref:cycle-length-above-historical",
        passed: false,
        message: `Current cycle length (${currentCycleDays.toFixed(0)} days) is ${(cycleRatio * 100 - 100).toFixed(0)}% above historical median (${historicalData.medianCycleDays} days) — deals are taking longer to progress`,
        severity: "warning",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 8. PIPELINE METRIC COMPUTATION FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Computes pipeline velocity in currency/day.
 *
 * Velocity = (Qualified Opportunities × Average Deal Size × Win Rate) / Cycle Length
 */
export function computeVelocityMetrics(
  deals: DealRecord[],
  historicalData: HistoricalConversionData,
  priorPeriodVelocity?: number,
): VelocityMetrics {
  const activeDeals = deals.filter(
    (d) => d.stage !== PipelineStage.CLOSED_WON && d.stage !== PipelineStage.CLOSED_LOST,
  );

  const qualifiedCount = activeDeals.filter(
    (d) => d.stage !== PipelineStage.DISCOVERY, // exclude earliest stage
  ).length;

  const avgDealSize = activeDeals.length > 0
    ? activeDeals.reduce((sum, d) => sum + d.value, 0) / activeDeals.length
    : 0;

  const winRate = historicalData?.overallWinRate ?? 0.25;
  const cycleLength = historicalData?.medianCycleDays ?? 90;

  const velocity = (qualifiedCount * avgDealSize * winRate) / Math.max(cycleLength, 1);

  let trend: VelocityMetrics["trend"] = "stable";
  let changeFromPrior = 0;

  if (priorPeriodVelocity && priorPeriodVelocity > 0) {
    changeFromPrior = (velocity - priorPeriodVelocity) / priorPeriodVelocity;
    if (changeFromPrior > 0.1) trend = "accelerating";
    else if (changeFromPrior < -0.1) trend = "decelerating";
  }

  return {
    velocityPerDay: Math.round(velocity * 100) / 100,
    qualifiedOpportunityCount: qualifiedCount,
    averageDealSize: Math.round(avgDealSize * 100) / 100,
    winRate: Math.round(winRate * 10000) / 100,
    cycleLengthDays: cycleLength,
    trend,
    changeFromPriorPeriod: Math.round(changeFromPrior * 10000) / 100,
  };
}

/**
 * Computes coverage ratio with quality adjustment.
 */
export function computeCoverage(
  deals: DealRecord[],
  quotaData: QuotaData,
  dealScoreCards?: DealScoreCard[],
): CoverageAnalysis {
  const activeDeals = deals.filter(
    (d) => d.stage !== PipelineStage.CLOSED_WON && d.stage !== PipelineStage.CLOSED_LOST,
  );

  // Stage-based weighting
  const stageWeights: Record<PipelineStage, number> = {
    [PipelineStage.DISCOVERY]: 0.1,
    [PipelineStage.QUALIFICATION]: 0.25,
    [PipelineStage.EVALUATION]: 0.4,
    [PipelineStage.PROPOSAL]: 0.6,
    [PipelineStage.NEGOTIATION]: 0.8,
    [PipelineStage.CLOSED_WON]: 1.0,
    [PipelineStage.CLOSED_LOST]: 0,
  };

  const weightedPipeline = activeDeals.reduce((sum, d) => {
    const weight = stageWeights[d.stage] ?? 0;
    return sum + d.value * weight;
  }, 0);

  // Quality adjustment using deal score cards (if provided)
  let qualityAdjustedValue = weightedPipeline;
  if (dealScoreCards && dealScoreCards.length > 0) {
    const scoreMap = new Map(dealScoreCards.map((c) => [c.dealId, c]));
    qualityAdjustedValue = activeDeals.reduce((sum, d) => {
      const card = scoreMap.get(d.id);
      if (card) {
        const qualityFactor = card.compositeScore / 36; // normalize to 0-1
        return sum + d.value * qualityFactor;
      }
      return sum + d.value * 0.5; // default factor for unscored deals
    }, 0);
  }

  const remainingQuota = quotaData?.remainingQuota ?? 1;

  // Segment-level breakdown
  const segments = [...new Set(activeDeals.map((d) => d.segment ?? "unsegmented"))];
  const segmentCoverage = segments.map((segment) => {
    const segDeals = activeDeals.filter((d) => (d.segment ?? "unsegmented") === segment);
    const segWeighted = segDeals.reduce((s, d) => s + d.value * (stageWeights[d.stage] ?? 0), 0);
    const segRemaining = quotaData?.repQuotas
      ? Object.entries(quotaData.repQuotas).reduce((s, [repId, q]) => {
          const repDeals = segDeals.filter((d) => d.repId === repId);
          return repDeals.length > 0 ? s + q : s;
        }, 0)
      : remainingQuota / segments.length;

    return {
      segment,
      quotaRemaining: Math.round(segRemaining * 100) / 100,
      weightedPipeline: Math.round(segWeighted * 100) / 100,
      coverageRatio: segRemaining > 0 ? Math.round((segWeighted / segRemaining) * 100) / 100 : 0,
      qualityAdjusted: 0, // simplified — full calc would need per-segment scores
    };
  });

  const rawRatio = remainingQuota > 0 ? weightedPipeline / remainingQuota : 0;
  const qualityRatio = remainingQuota > 0 ? qualityAdjustedValue / remainingQuota : 0;

  return {
    rawCoverageRatio: Math.round(rawRatio * 100) / 100,
    weightedPipelineValue: Math.round(weightedPipeline * 100) / 100,
    qualityAdjustedValue: Math.round(qualityAdjustedValue * 100) / 100,
    qualityAdjustedRatio: Math.round(qualityRatio * 100) / 100,
    segmentCoverage,
    coverageGap: rawRatio < 3.0, // below 3x threshold
  };
}

/**
 * Computes a single deal's MEDDPICC score.
 * Each element scored 0-2 (0=unknown/absent, 1=partial, 2=full).
 */
export function computeMeddpiccScore(deal: DealRecord): {
  total: number;
  breakdown: Partial<Record<MeddpiccElement, { score: number; evidence: string; gap: string }>>;
} {
  const scores = deal.meddpiccScores ?? {};

  // If no scores provided, infer from available deal data
  const breakdown: DealScoreCard["meddpiccBreakdown"] = {};

  for (const element of Object.values(MeddpiccElement)) {
    const explicitScore = scores[element];
    let score = explicitScore ?? 0;
    let evidence = "";
    let gap = "";

    // Infer from known deal attributes when explicit scores are missing
    switch (element) {
      case MeddpiccElement.ECONOMIC_BUYER:
        evidence = deal.economicBuyerEngaged ? "Economic buyer identified and engaged" : "Economic buyer status unknown";
        gap = deal.economicBuyerEngaged ? "" : "Economic buyer not identified or not engaged";
        score = deal.economicBuyerEngaged ? Math.max(score, 1) : score;
        break;
      case MeddpiccElement.COMPETITION:
        gap = "Competitive landscape not assessed in input data";
        break;
      case MeddpiccElement.PAPER_PROCESS:
        gap = "Paper process requirements not mapped — potential late-stage blocker";
        break;
      default:
        break;
    }

    breakdown[element] = { score, evidence: evidence || "See deal record", gap };
  }

  const total = Object.values(breakdown).reduce((sum, e) => sum + e.score, 0);
  return { total, breakdown };
}

/**
 * Computes a composite deal health score (0-36) and status classification.
 * Combines MEDDPICC score (0-16), engagement intensity (0-10), and velocity (0-10).
 */
export function computeDealHealth(deal: DealRecord, benchmarks?: {
  stageDurationDays: number;
  benchmarkStageDays: number;
}): { compositeScore: number; meddpiccScore: number; engagementScore: number; velocityScore: number; status: DealHealthStatus } {
  const { total: meddpiccScore } = computeMeddpiccScore(deal);

  // Engagement score (0-10) derived from stakeholder breadth and recency
  const stakeholderBreadth = deal.stakeholderCount ?? 0;
  const daysSinceActivity = deal.lastActivityDate
    ? Math.max(0, (Date.now() - new Date(deal.lastActivityDate).getTime()) / 86400000)
    : 999;

  let engagementScore = 0;
  if (stakeholderBreadth >= 3) engagementScore += 4;
  else if (stakeholderBreadth >= 2) engagementScore += 2;
  else if (stakeholderBreadth >= 1) engagementScore += 1;

  if (daysSinceActivity <= 3) engagementScore += 4;
  else if (daysSinceActivity <= 7) engagementScore += 3;
  else if (daysSinceActivity <= 14) engagementScore += 2;
  else if (daysSinceActivity <= 30) engagementScore += 1;

  if (deal.economicBuyerEngaged) engagementScore += 2;
  engagementScore = Math.min(10, engagementScore);

  // Velocity score (0-10)
  let velocityScore = 5; // default neutral
  if (benchmarks && deal.stageEntryDate) {
    const daysInStage = (Date.now() - new Date(deal.stageEntryDate).getTime()) / 86400000;
    const ratio = daysInStage / Math.max(benchmarks.benchmarkStageDays, 1);

    if (ratio <= 0.5) velocityScore = 9;
    else if (ratio <= 0.8) velocityScore = 7;
    else if (ratio <= 1.0) velocityScore = 5;
    else if (ratio <= 1.5) velocityScore = 3;
    else velocityScore = 1;
  }

  const compositeScore = meddpiccScore + engagementScore + velocityScore;

  let status: DealHealthStatus;
  if (compositeScore >= 28) status = DealHealthStatus.HEALTHY;
  else if (compositeScore >= 20) status = DealHealthStatus.ATTENTION;
  else if (compositeScore >= 12) status = DealHealthStatus.AT_RISK;
  else if (compositeScore >= 6) status = DealHealthStatus.CRITICAL;
  else status = DealHealthStatus.DISQUALIFIED;

  return { compositeScore, meddpiccScore, engagementScore, velocityScore, status };
}

/**
 * Builds the stage conversion funnel from deal data.
 */
export function buildStageFunnel(
  deals: DealRecord[],
  stageBenchmarks?: PipelineAnalystInput["stageBenchmarks"],
): StageConversionFunnel {
  const stages = Object.values(PipelineStage).filter(
    (s) => s !== PipelineStage.CLOSED_WON && s !== PipelineStage.CLOSED_LOST,
  );

  const entries: StageFunnelEntry[] = [];
  let biggestDropOff = PipelineStage.DISCOVERY;
  let worstConversion = 1;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const dealsInStage = deals.filter((d) => d.stage === stage);

    // Approximate conversion: look at transition from this stage to next
    const nextStage = i < stages.length - 1 ? stages[i + 1] : null;
    const dealsAdvanced = nextStage
      ? deals.filter((d) => d.stage === nextStage).length
      : deals.filter((d) => d.stage === PipelineStage.CLOSED_WON).length;

    const dealsLostAtStage = deals.filter(
      (d) => d.stage === PipelineStage.CLOSED_LOST,
    ).length; // approximation

    const totalExited = dealsAdvanced + dealsLostAtStage;
    const conversionRate = totalExited > 0 ? dealsAdvanced / totalExited : 0;

    // Track the biggest drop-off
    if (conversionRate < worstConversion && i > 0) {
      worstConversion = conversionRate;
      biggestDropOff = stage;
    }

    // Average days in stage
    const stageDays: number[] = dealsInStage
      .filter((d) => d.stageEntryDate && d.createdDate)
      .map((d) => (new Date(d.stageEntryDate!).getTime() - new Date(d.createdDate).getTime()) / 86400000);

    const avgDays = stageDays.length > 0
      ? stageDays.reduce((s, d) => s + d, 0) / stageDays.length
      : 0;

    const benchmarkDays = stageBenchmarks?.[stage]?.benchmarkDays ?? 30;
    const stalled = avgDays > benchmarkDays * 1.5;

    entries.push({
      stage,
      dealsEntered: dealsInStage.length + dealsAdvanced,
      dealsConverted: dealsAdvanced,
      dealsLost: dealsLostAtStage,
      conversionRate: Math.round(conversionRate * 10000) / 100,
      averageDaysInStage: Math.round(avgDays * 10) / 10,
      benchmarkDays,
      stalledIndicator: stalled,
    });
  }

  return {
    stages: entries,
    biggestDropOffStage: biggestDropOff,
    overallConversionRate: entries.length > 0
      ? entries[entries.length - 1]?.conversionRate ?? 0
      : 0,
  };
}

// ---------------------------------------------------------------------------
// 9. INTERNAL HELPERS
// ---------------------------------------------------------------------------

function aggregateValidation(results: ValidationResultItem[]): ValidationReport {
  const errors = results.filter((r) => r.severity === "error" && !r.passed);
  const warnings = results.filter((r) => r.severity === "warning" && !r.passed);
  return {
    passed: errors.length === 0,
    results,
    errors,
    warnings,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// 10. VALIDATION RULES — REGISTRY-COMPLIANT
// ---------------------------------------------------------------------------

/**
 * Declarative validation rules registered with the Agent Registry.
 * These are the formal business rules applied at dispatch time.
 */
export const VALIDATION_RULES: ValidationRule[] = [
  {
    rule: "pipeline-snapshot:required-fields",
    description: "Every deal must have id, accountName, stage, value, closeDate, repId, createdDate, and lastActivityDate",
    severity: "error",
    validate: (input: unknown) => {
      const deals = (input as PipelineAnalystInput)?.pipelineSnapshot ?? [];
      return deals.length > 0 && deals.every(
        (d: DealRecord) =>
          d.id && d.accountName && d.stage &&
          typeof d.value === "number" && d.value >= 0 &&
          d.closeDate && d.repId && d.createdDate && d.lastActivityDate,
      );
    },
    errorMessage: "Pipeline snapshot contains deals with missing or invalid required fields (id, accountName, stage, value, closeDate, repId, createdDate, lastActivityDate)",
  },
  {
    rule: "pipeline-snapshot:minimum-deals",
    description: "Pipeline snapshot must contain at least 1 deal",
    severity: "error",
    validate: (input: unknown) => {
      const deals = (input as PipelineAnalystInput)?.pipelineSnapshot ?? [];
      return deals.length >= 1;
    },
    errorMessage: "Pipeline snapshot is empty — at least one deal record is required",
  },
  {
    rule: "historical-data:win-rate-range",
    description: "Overall win rate must be between 0 and 1",
    severity: "error",
    validate: (input: unknown) => {
      const hist = (input as PipelineAnalystInput)?.historicalData;
      return !hist || (hist.overallWinRate >= 0 && hist.overallWinRate <= 1);
    },
    errorMessage: "Historical win rate is outside expected range [0.0, 1.0]",
  },
  {
    rule: "quota-data:positive-quota",
    description: "Total quota must be greater than zero if quota data is provided",
    severity: "warning",
    validate: (input: unknown) => {
      const quota = (input as PipelineAnalystInput)?.quotaData;
      return !quota || quota.totalQuota > 0;
    },
    errorMessage: "Total quota must be greater than zero for coverage analysis",
  },
  {
    rule: "close-date:valid-iso",
    description: "All close dates must be valid ISO-8601 date strings",
    severity: "error",
    validate: (input: unknown) => {
      const deals = (input as PipelineAnalystInput)?.pipelineSnapshot ?? [];
      return deals.every((d: DealRecord) => !d.closeDate || !isNaN(Date.parse(d.closeDate)));
    },
    errorMessage: "One or more deals have invalid close dates",
  },
  {
    rule: "deal-value:non-negative",
    description: "All deal values must be non-negative numbers",
    severity: "error",
    validate: (input: unknown) => {
      const deals = (input as PipelineAnalystInput)?.pipelineSnapshot ?? [];
      return deals.every((d: DealRecord) => typeof d.value === "number" && d.value >= 0 && !isNaN(d.value));
    },
    errorMessage: "One or more deals have invalid (negative or NaN) deal values",
  },
  {
    rule: "stage-valid-enum",
    description: "All deal stages must be valid PipelineStage enum members",
    severity: "error",
    validate: (input: unknown) => {
      const deals = (input as PipelineAnalystInput)?.pipelineSnapshot ?? [];
      const validStages = Object.values(PipelineStage);
      return deals.every((d: DealRecord) => validStages.includes(d.stage));
    },
    errorMessage: "One or more deals have an unrecognized pipeline stage",
  },
  {
    rule: "historical-data:sufficient-sample",
    description: "Historical data sample should have at least 30 deals for statistical significance",
    severity: "warning",
    validate: (input: unknown) => {
      const hist = (input as PipelineAnalystInput)?.historicalData;
      return !hist || hist.sampleSize >= 30;
    },
    errorMessage: "Historical data sample size is below 30 — conversion rates may have high variance",
  },
  {
    rule: "cross-ref:deal-size-vs-historical",
    description: "Current average deal size should be within 50%-150% of historical average",
    severity: "warning",
    validate: (input: unknown) => {
      const { pipelineSnapshot, historicalData } = input as PipelineAnalystInput;
      if (!historicalData || !pipelineSnapshot?.length) return true;
      const currentAvg = pipelineSnapshot.reduce((s: number, d: DealRecord) => s + d.value, 0) / pipelineSnapshot.length;
      if (historicalData.averageDealSize <= 0) return true;
      const ratio = currentAvg / historicalData.averageDealSize;
      return ratio >= 0.5 && ratio <= 1.5;
    },
    errorMessage: "Current average deal size deviates significantly from historical average — investigate segment mix or pricing changes",
  },
];

// ---------------------------------------------------------------------------
// 11. SCHEMA DEFINITION
// ---------------------------------------------------------------------------

/**
 * Schema definition for the pipeline-analyst adapter.
 * Used by the Agent Registry for codegen, documentation, and runtime reflection.
 */
export const PIPELINE_ANALYST_SCHEMA: AgentSchema<PipelineAnalystInput, PipelineAnalystOutput, keyof PipelineAnalystContextKeys> = {
  input: [
    {
      path: "pipelineSnapshot",
      label: "Pipeline Snapshot",
      description: "Array of deal records representing the current pipeline",
      type: "array",
      required: true,
      example: [
        {
          id: "opp-001",
          accountName: "Acme Corp",
          dealName: "Acme - Enterprise Platform",
          stage: PipelineStage.EVALUATION,
          value: 150000,
          closeDate: "2026-08-15T00:00:00Z",
          repId: "rep-alex",
          repName: "Alex Rivera",
          createdDate: "2026-04-01T00:00:00Z",
          lastActivityDate: "2026-06-10T00:00:00Z",
          stageEntryDate: "2026-05-15T00:00:00Z",
          stakeholderCount: 4,
          economicBuyerEngaged: true,
          meddpiccScores: { "metrics": 2, "economic-buyer": 1, "champion": 2 },
          segment: "enterprise",
        },
      ],
    },
    {
      path: "historicalData",
      label: "Historical Conversion Data",
      description: "Historical win/loss data for base rate calculations",
      type: "object",
      required: true,
      example: {
        periodLabel: "H1 2026",
        stageWinRates: { "discovery": 0.8, "qualification": 0.6, "evaluation": 0.45, "proposal": 0.7, "negotiation": 0.85, "closed-won": 1, "closed-lost": 0 },
        overallWinRate: 0.28,
        wonCount: 42,
        lostCount: 108,
        averageDealSize: 85000,
        medianCycleDays: 75,
        sampleSize: 150,
      },
    },
    {
      path: "quotaData",
      label: "Quota Data",
      description: "Period quota and target data for coverage analysis",
      type: "object",
      required: false,
      example: {
        period: "Q2-2026",
        totalQuota: 5000000,
        closedRevenue: 1800000,
        remainingQuota: 3200000,
        repQuotas: { "rep-alex": 800000, "rep-jordan": 750000 },
      },
    },
    {
      path: "analysisDepth",
      label: "Analysis Depth",
      description: "Depth of analysis to perform",
      type: "string",
      required: false,
      enum: ["lightning", "standard", "deep"],
      example: "standard",
    },
  ],

  output: [
    {
      path: "pipelineHealthScore",
      label: "Pipeline Health Score",
      description: "Composite pipeline health score (0-100)",
      type: "number",
      required: true,
      example: 72,
    },
    {
      path: "velocityMetrics",
      label: "Velocity Metrics",
      description: "Pipeline velocity with trend analysis",
      type: "object",
      required: true,
    },
    {
      path: "forecast",
      label: "Forecast Model",
      description: "Probability-weighted forecast with confidence intervals",
      type: "object",
      required: true,
    },
    {
      path: "riskFlags",
      label: "Pipeline Risk Flags",
      description: "Identified risks requiring intervention",
      type: "array",
      required: true,
      example: [
        {
          id: "risk-001",
          category: RiskCategory.STALLED_DEAL,
          description: "Acme Corp has been in Evaluation stage for 45 days — 1.5x benchmark",
          severity: "high",
          dealId: "opp-001",
          valueAtRisk: 150000,
          recommendedAction: ActionType.ACCELERATE_TIMELINE,
          remediationGuidance: "Schedule executive sponsor review this week",
        },
      ],
    },
  ],

  context: {
    reads: [
      { key: "pipelineSnapshot",  description: "Full deal-level pipeline data",        type: "array",  required: true },
      { key: "dealVelocityMap",   description: "Pre-computed velocity by deal/segment", type: "object", required: false },
      { key: "stageConversionRates", description: "Historical and current conversion",  type: "object", required: false },
      { key: "forecastAccuracy",  description: "Prior forecast accuracy records",       type: "array",  required: false },
    ],
    writes: [
      { key: "pipelineRiskFlags", description: "Surfaced risk signals requiring intervention", type: "array", required: true },
      { key: "dealScoreCards",    description: "Scored deal assessments",                      type: "array", required: true },
      { key: "forecastModel",     description: "Probability-weighted forecast with confidence", type: "object", required: true },
      { key: "pipelineHealthReport", description: "Full pipeline health diagnostic report",     type: "object", required: true },
    ],
  },

  validation: VALIDATION_RULES,
};
