// ============================================================================
// Nexus Agent Platform — @pipeline-analyst Execution Flow Examples
// ============================================================================
// This module documents three canonical execution patterns for the
// pipeline-analyst agent within the Agent Registry orchestrator:
//
//   1. Single Agent  — Standalone weekly pipeline health analysis
//   2. Chain         — Sales outreach qualified lead → pipeline fit analysis
//   3. Conditional   — Pipeline risk flags → deal-strategist remediation
//
// Each flow includes typed context propagation, correlation IDs, and
// expected output structures. These serve as both documentation and
// as testable flow definitions for the orchestrator.
// ============================================================================

import type {
  AgentInput,
  AgentOutput,
  AgentContext,
  ExecutionFlow,
} from "../types";
import type {
  PipelineAnalystInput,
  PipelineAnalystOutput,
  PipelineStage,
  DealRecord,
  VelocityMetrics,
  CoverageAnalysis,
  StageConversionFunnel,
  ForecastModel,
  PipelineRiskFlag,
  DealScoreCard,
  RiskCategory,
  ActionType,
  DealHealthStatus,
} from "../adapters/pipeline-analyst.adapter";

// ============================================================================
// FLOW 1: Single Agent — Weekly Pipeline Health Review
// ============================================================================
//
// Use case: Revenue operations runs a weekly pipeline health check every
// Monday morning to assess coverage, velocity, stage distribution, and
// forecast confidence before the weekly pipeline review.
//
// Trigger: Scheduled cron job (every Monday 06:00)
// Agents:  @pipeline-analyst (standalone)
// Context: Reads pipelineSnapshot if pre-loaded; writes full health report
// Output:  Pipeline health score + velocity metrics + risk flags + forecast

export const SINGLE_WEEKLY_PIPELINE_REVIEW_FLOW: ExecutionFlow = {
  id: "pipeline-analyst-weekly-review.v1",
  type: "single",
  description:
    "Standalone weekly pipeline health analysis. The pipeline-analyst agent " +
    "ingests the current pipeline snapshot, historical conversion data, quota " +
    "targets, and optional rep performance data, then produces a comprehensive " +
    "pipeline health report with velocity metrics, coverage analysis, stage " +
    "conversion funnel, deal score cards, risk flags, and a probability-weighted " +
    "forecast with confidence intervals.",

  steps: [
    {
      sequence: 1,
      agentId: "sales-pipeline-analyst",
      action: `Analyze current pipeline snapshot for health diagnostics:
1. Compute pipeline velocity = (Qualified Opps × Avg Deal Size × Win Rate) / Cycle Length
2. Calculate raw and quality-adjusted coverage ratios against remaining quota
3. Build stage conversion funnel with benchmark comparisons
4. Score every deal >= $50K using MEDDPICC qualification depth, engagement intensity, and progression velocity
5. Identify stalled deals (>1.5x benchmark stage duration), single-threaded deals (<2 stakeholders), and late-stage underqualified deals (<5/8 MEDDPICC)
6. Construct probability-weighted forecast with Commit / Best Case / Upside tiers using historical base rates, velocity adjustments, engagement signal adjustments, and seasonal factors
7. Produce systemic recommendations for pipeline creation gaps that will impact future quarters`,
      inputContext: [],
      outputContext: [
        "pipelineRiskFlags",
        "dealScoreCards",
        "forecastModel",
        "pipelineHealthReport",
      ],
    },
  ],

  sharedContext: [
    "pipelineRiskFlags",
    "dealScoreCards",
    "forecastModel",
    "pipelineHealthReport",
  ],

  expectedOutput: `PipelineHealthReport with composite score (0-100), VelocityMetrics showing rate and trend, CoverageAnalysis with quality-adjusted ratio, StageConversionFunnel with biggest drop-off identified, ForecastModel with three confidence tiers and method comparison, prioritized PipelineRiskFlag list, DealScoreCard array for high-value deals, and systemic recommendations for pipeline creation and data quality.`,
};

// --------------------------------------------------------------------------
// Example: Single-Agent Invocation (for reference / testing)
// --------------------------------------------------------------------------

/**
 * Creates a realistic weekly pipeline review input for the pipeline analyst.
 * Use in tests or as reference documentation.
 */
export function createWeeklyReviewInput(
  overrides?: Partial<PipelineAnalystInput>,
): AgentInput<PipelineAnalystInput> {
  return {
    targetAgent: "sales-pipeline-analyst",
    correlationId: `pipeline-review-${Date.now()}`,
    timestamp: Date.now(),
    source: "revenue-operations-scheduler",
    priority: "normal",
    payload: {
      pipelineSnapshot: createMockPipelineSnapshot(),
      historicalData: {
        periodLabel: "H1 2026",
        stageWinRates: {
          [PipelineStage.DISCOVERY]: 0.78,
          [PipelineStage.QUALIFICATION]: 0.62,
          [PipelineStage.EVALUATION]: 0.44,
          [PipelineStage.PROPOSAL]: 0.68,
          [PipelineStage.NEGOTIATION]: 0.83,
          [PipelineStage.CLOSED_WON]: 1.0,
          [PipelineStage.CLOSED_LOST]: 0,
        },
        stageDurations: {
          [PipelineStage.DISCOVERY]: 14,
          [PipelineStage.QUALIFICATION]: 21,
          [PipelineStage.EVALUATION]: 30,
          [PipelineStage.PROPOSAL]: 21,
          [PipelineStage.NEGOTIATION]: 14,
        },
        overallWinRate: 0.28,
        wonCount: 42,
        lostCount: 108,
        averageDealSize: 85000,
        medianCycleDays: 75,
        sampleSize: 150,
      },
      quotaData: {
        period: "Q2-2026",
        totalQuota: 5_000_000,
        closedRevenue: 1_800_000,
        remainingQuota: 3_200_000,
        repQuotas: {
          "rep-alex": 800_000,
          "rep-jordan": 750_000,
          "rep-morgan": 700_000,
          "rep-casey": 650_000,
          "rep-riley": 600_000,
        },
      },
      repPerformanceData: [
        { repId: "rep-alex", repName: "Alex Rivera", winRate: 0.34, averageDealSize: 92000, cycleLengthDays: 68, pipelineValue: 1800000, quotaAttainmentPct: 72 },
        { repId: "rep-jordan", repName: "Jordan Lee", winRate: 0.22, averageDealSize: 76000, cycleLengthDays: 91, pipelineValue: 2100000, quotaAttainmentPct: 58 },
        { repId: "rep-morgan", repName: "Morgan Chen", winRate: 0.31, averageDealSize: 103000, cycleLengthDays: 72, pipelineValue: 1500000, quotaAttainmentPct: 65 },
        { repId: "rep-casey", repName: "Casey Kim", winRate: 0.19, averageDealSize: 64000, cycleLengthDays: 95, pipelineValue: 900000, quotaAttainmentPct: 42 },
      ],
      stageBenchmarks: {
        [PipelineStage.DISCOVERY]: { benchmarkDays: 14, benchmarkConversionRate: 0.75 },
        [PipelineStage.QUALIFICATION]: { benchmarkDays: 21, benchmarkConversionRate: 0.60 },
        [PipelineStage.EVALUATION]: { benchmarkDays: 30, benchmarkConversionRate: 0.45 },
        [PipelineStage.PROPOSAL]: { benchmarkDays: 21, benchmarkConversionRate: 0.65 },
        [PipelineStage.NEGOTIATION]: { benchmarkDays: 14, benchmarkConversionRate: 0.80 },
      },
      seasonalFactors: {
        1: 0.85, 2: 0.90, 3: 1.00,  // Q1: slow start
        4: 0.95, 5: 1.00, 6: 1.10,  // Q2: ramping
        7: 0.90, 8: 0.85, 9: 1.00,  // Q3: summer slowdown
        10: 1.05, 11: 1.10, 12: 1.25, // Q4: budget flush
      },
      analysisDepth: "standard",
      currency: "USD",
      ...overrides,
    },
  };
}

/**
 * Creates a realistic mock pipeline snapshot with a mix of deal stages,
 * health levels, and risk profiles for testing.
 */
function createMockPipelineSnapshot(): DealRecord[] {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  return [
    // Healthy enterprise deal — well qualified, progressing well
    {
      id: "opp-001",
      accountName: "Acme Corp",
      dealName: "Acme — Enterprise Platform",
      stage: PipelineStage.EVALUATION,
      value: 150000,
      closeDate: daysFromNow(65),
      repId: "rep-alex",
      repName: "Alex Rivera",
      createdDate: daysAgo(70),
      lastActivityDate: daysAgo(2),
      stageEntryDate: daysAgo(30),
      stakeholderCount: 4,
      economicBuyerEngaged: true,
      meddpiccScores: {
        "metrics": 2, "economic-buyer": 2, "decision-criteria": 1,
        "decision-process": 1, "implicated-pain": 2, "champion": 2, "competition": 2,
      },
      segment: "enterprise",
      source: "outbound",
    },
    // At-risk deal — single-threaded, stalled, no EB
    {
      id: "opp-002",
      accountName: "Beta Inc",
      dealName: "Beta — Analytics Upgrade",
      stage: PipelineStage.PROPOSAL,
      value: 85000,
      closeDate: daysFromNow(49),
      repId: "rep-jordan",
      repName: "Jordan Lee",
      createdDate: daysAgo(80),
      lastActivityDate: daysAgo(18),
      stageEntryDate: daysAgo(35),
      stakeholderCount: 1,
      economicBuyerEngaged: false,
      meddpiccScores: {
        "metrics": 1, "economic-buyer": 0, "implicated-pain": 1, "champion": 1,
      },
      segment: "mid-market",
      source: "inbound",
    },
    // Stalled deal — sitting in evaluation far past benchmark
    {
      id: "opp-003",
      accountName: "Gamma Solutions",
      dealName: "Gamma — Security Suite",
      stage: PipelineStage.NEGOTIATION,
      value: 420000,
      closeDate: daysFromNow(30),
      repId: "rep-morgan",
      repName: "Morgan Chen",
      createdDate: daysAgo(120),
      lastActivityDate: daysAgo(22),
      stageEntryDate: daysAgo(38), // benchmark is 14d for negotiation
      stakeholderCount: 2,
      economicBuyerEngaged: false,
      meddpiccScores: {
        "metrics": 2, "economic-buyer": 0, "decision-criteria": 2,
        "decision-process": 1, "paper-process": 0, "implicated-pain": 2,
        "champion": 1, "competition": 1,
      },
      segment: "enterprise",
      source: "partner",
    },
    // Healthy mid-market deal
    {
      id: "opp-004",
      accountName: "Delta Services",
      dealName: "Delta — Core Platform",
      stage: PipelineStage.QUALIFICATION,
      value: 45000,
      closeDate: daysFromNow(90),
      repId: "rep-alex",
      repName: "Alex Rivera",
      createdDate: daysAgo(15),
      lastActivityDate: daysAgo(1),
      stageEntryDate: daysAgo(10),
      stakeholderCount: 3,
      economicBuyerEngaged: true,
      meddpiccScores: {
        "metrics": 1, "economic-buyer": 1, "decision-criteria": 0,
        "decision-process": 1, "implicated-pain": 2, "champion": 2,
      },
      segment: "mid-market",
      source: "outbound",
    },
    // Early-stage high-potential
    {
      id: "opp-005",
      accountName: "Epsilon Technologies",
      dealName: "Epsilon — Infrastructure Migration",
      stage: PipelineStage.DISCOVERY,
      value: 280000,
      closeDate: daysFromNow(120),
      repId: "rep-casey",
      repName: "Casey Kim",
      createdDate: daysAgo(7),
      lastActivityDate: daysAgo(1),
      stageEntryDate: daysAgo(7),
      stakeholderCount: 2,
      economicBuyerEngaged: false,
      meddpiccScores: {
        "metrics": 1, "implicated-pain": 2, "champion": 1,
      },
      segment: "enterprise",
      source: "event",
    },
    // Data quality issue — missing close date
    {
      id: "opp-006",
      accountName: "Zeta Corp",
      dealName: "Zeta — Renewal",
      stage: PipelineStage.PROPOSAL,
      value: 32000,
      closeDate: "", // missing close date — data quality issue
      repId: "rep-riley",
      repName: "Riley Smith",
      createdDate: daysAgo(45),
      lastActivityDate: daysAgo(5),
      stageEntryDate: daysAgo(20),
      stakeholderCount: 1,
      economicBuyerEngaged: false,
      segment: "smb",
      source: "renewal",
    },
    // Won deal — should be excluded from active analysis
    {
      id: "opp-007",
      accountName: "Eta Industries",
      dealName: "Eta — Platform Expansion",
      stage: PipelineStage.CLOSED_WON,
      value: 195000,
      closeDate: daysAgo(2),
      repId: "rep-alex",
      repName: "Alex Rivera",
      createdDate: daysAgo(90),
      lastActivityDate: daysAgo(2),
      segment: "enterprise",
    },
    // Lost deal — should be excluded from active analysis
    {
      id: "opp-008",
      accountName: "Theta Group",
      dealName: "Theta — Pilot Program",
      stage: PipelineStage.CLOSED_LOST,
      value: 55000,
      closeDate: daysAgo(5),
      repId: "rep-jordan",
      repName: "Jordan Lee",
      createdDate: daysAgo(60),
      lastActivityDate: daysAgo(5),
      segment: "mid-market",
    },
  ];
}

// ============================================================================
// FLOW 2: Chain — Sales Outreach → Pipeline Analyst (Lead Fit Analysis)
// ============================================================================
//
// Use case: A prospect responds positively to sales outreach. The outreach
// agent qualifies them as "warm" and chains to pipeline analyst for pipeline
// fit analysis — scoring the deal, projecting close probability, and
// recommending the optimal stage placement and next action.
//
// Trigger: @sales-outreach output has qualificationScore >= "warm" AND
//          prospect response is "replied-positive"
// Agents:  @sales-outreach → @pipeline-analyst
// Context: sales-outreach writes prospectProfile, communicationHistory,
//          nextFollowUpDate → pipeline-analyst reads those and writes
//          dealScoreCards, pipelineRiskFlags, forecastModel
// Output:  Outreach message + pipeline fit assessment + forecast impact

export const CHAIN_OUTREACH_TO_PIPELINE_ANALYST_FLOW: ExecutionFlow = {
  id: "outreach-to-pipeline-analyst.v1",
  type: "chain",
  description:
    "Two-agent chain: sales-outreach generates a follow-up message after a " +
    "prospect replies positively, then hands off to pipeline-analyst for deal " +
    "scoring and pipeline fit analysis. The pipeline analyst evaluates the deal's " +
    "qualification depth, projects close probability and weighted value, flags " +
    "risks (single-threaded risk, missing EB, competitive threat), and recommends " +
    "the optimal stage placement and next action for this lead.",

  steps: [
    {
      sequence: 1,
      agentId: "sales-outreach",
      action: `Generate a follow-up message for a prospect who replied positively.
Read the prospect's communication history and qualification context.
Craft a response that advances the conversation toward a discovery call.
Write the prospectProfile, communicationHistory (append this touch),
and nextFollowUpDate context keys for downstream use.`,
      inputContext: [],
      outputContext: [
        "prospectProfile",
        "communicationHistory",
        "nextFollowUpDate",
      ],
    },
    {
      sequence: 2,
      agentId: "sales-pipeline-analyst",
      action: `Analyze the prospect data forwarded from sales-outreach for pipeline fit:
1. Read prospectProfile and communicationHistory from context
2. Score the deal using MEDDPICC framework based on available qualification data
3. Assess engagement intensity from communication history (replies, meeting confirmations)
4. Project close probability using base rates adjusted for deal size and engagement signals
5. Flag pipeline risks: single-threading, missing economic buyer, competitive presence, data gaps
6. Recommend optimal stage placement for this lead
7. Provide a specific recommended next action with rationale
8. Write dealScoreCards (with this deal's card), pipelineRiskFlags (if any),
   and update forecastModel with this deal's impact`,
      inputContext: [
        "prospectProfile",
        "communicationHistory",
        "nextFollowUpDate",
      ],
      outputContext: [
        "dealScoreCards",
        "pipelineRiskFlags",
        "forecastModel",
      ],
    },
  ],

  sharedContext: [
    "prospectProfile",
    "communicationHistory",
    "nextFollowUpDate",
    "dealScoreCards",
    "pipelineRiskFlags",
    "forecastModel",
  ],

  expectedOutput:
    "Step 1: sales-outreach sends a follow-up message with next steps toward " +
    "a discovery call. Writes prospectProfile, communicationHistory, nextFollowUpDate. " +
    "Step 2: pipeline-analyst returns a DealScoreCard (MEDDPICC breakdown, composite score), " +
    "forecast impact (weighted value, confidence tier, recommended stage placement), " +
    "pipeline risks, and a specific recommended action (e.g., 'Schedule discovery call ' + " +
    "'this week — currently single-threaded to one stakeholder').",
};

// --------------------------------------------------------------------------
// Example: Chain Flow Context Propagation
// --------------------------------------------------------------------------

/**
 * Creates the initial context for the outreach → pipeline-analyst chain flow.
 * The sales-outreach agent populates the context keys that pipeline-analyst reads.
 */
export function createChainFlowContext(): AgentContext {
  return {
    sessionId: `chain-outreach-pipeline-${Date.now()}`,
    data: {
      // sales-outreach will populate these
      prospectProfile: null,
      communicationHistory: null,
      nextFollowUpDate: null,
      // pipeline-analyst will populate these
      dealScoreCards: null,
      pipelineRiskFlags: null,
      forecastModel: null,
    },
    audit: [],
    controls: {
      maxHops: 2,
      hopCount: 0,
      terminateAfter: false,
    },
  };
}

/**
 * Creates the pipeline analyst input for the second step of the chain.
 * This input is built from the context written by sales-outreach.
 */
export function createPipelineFitInput(
  correlationId: string,
  prospectProfile: Record<string, unknown>,
  communicationHistory: Array<Record<string, unknown>>,
): AgentInput<PipelineAnalystInput> {
  // Convert the single prospect into a deal record for scoring
  const dealRecord: DealRecord = {
    id: `lead-${prospectProfile.id ?? "unknown"}`,
    accountName: (prospectProfile.company as string) ?? "Unknown Company",
    dealName: `${prospectProfile.company as string ?? "Unknown"} — New Opportunity`,
    stage: PipelineStage.QUALIFICATION,
    value: 50000, // placeholder — would be refined with discovery
    closeDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    repId: "tbd",
    repName: "TBD",
    createdDate: new Date().toISOString(),
    lastActivityDate: new Date().toISOString(),
    stageEntryDate: new Date().toISOString(),
    stakeholderCount: communicationHistory.length > 0 ? 1 : 0,
    economicBuyerEngaged: false,
    segment: "mid-market",
    source: "outbound",
  };

  return {
    targetAgent: "sales-pipeline-analyst",
    correlationId,
    timestamp: Date.now(),
    source: "sales-outreach",
    priority: "normal",
    payload: {
      pipelineSnapshot: [dealRecord],
      historicalData: {
        periodLabel: "H1 2026",
        stageWinRates: {
          [PipelineStage.DISCOVERY]: 0.78,
          [PipelineStage.QUALIFICATION]: 0.62,
          [PipelineStage.EVALUATION]: 0.44,
          [PipelineStage.PROPOSAL]: 0.68,
          [PipelineStage.NEGOTIATION]: 0.83,
          [PipelineStage.CLOSED_WON]: 1.0,
          [PipelineStage.CLOSED_LOST]: 0,
        },
        overallWinRate: 0.28,
        wonCount: 42,
        lostCount: 108,
        averageDealSize: 85000,
        medianCycleDays: 75,
        sampleSize: 150,
      },
      quotaData: {
        period: "Q2-2026",
        totalQuota: 5_000_000,
        closedRevenue: 1_800_000,
        remainingQuota: 3_200_000,
        repQuotas: {},
      },
      analysisDepth: "lightning",
      currency: "USD",
    },
  };
}

// ============================================================================
// FLOW 3: Conditional — Pipeline Risk Flags → Deal-Strategist Remediation
// ============================================================================
//
// Use case: After pipeline analysis, if risk flags are surfaced, the
// orchestrator conditionally routes to @deal-strategist for remediation
// planning. The deal-strategist agent develops competitive positioning,
// win plans, and multi-threading strategies for flagged deals.
//
// Trigger: pipeline-analyst writes pipelineRiskFlags with length > 0
// Agents:  @pipeline-analyst → [conditional] → @deal-strategist
// Context: pipeline-analyst writes pipelineRiskFlags and dealScoreCards
//          → condition met → deal-strategist reads those and writes
//          remediation plans for each flagged deal
// Output:  Pipeline health report + (conditional) deal remediation plans

export const CONDITIONAL_RISK_TO_DEAL_STRATEGIST_FLOW: ExecutionFlow = {
  id: "pipeline-risk-to-deal-strategist.v1",
  type: "chain",
  description:
    "Two-agent chain with conditional branching: pipeline-analyst performs " +
    "full pipeline health diagnostics and identifies risk flags. If " +
    "pipelineRiskFlags.length > 0, the orchestrator conditionally routes " +
    "to deal-strategist for each flagged deal. The deal-strategist develops " +
    "targeted remediation plans: competitive battlecards for deals with " +
    "competitive risk, multi-threading plans for single-threaded deals, " +
    "executive engagement strategies for missing EB, and stage-acceleration " +
    "plans for stalled deals. If no risk flags are surfaced, the chain " +
    "terminates after pipeline-analyst and returns the health report only.",

  steps: [
    {
      sequence: 1,
      agentId: "sales-pipeline-analyst",
      action: `Perform full pipeline health diagnostics:
1. Analyze pipeline snapshot for velocity, coverage, stage conversion, and deal health
2. Score all deals using MEDDPICC, engagement, and velocity metrics
3. Compute probability-weighted forecast with confidence tiers
4. Surface all risk flags: stalled deals, single-threaded, missing EB, coverage gaps, velocity declines
5. Write pipelineRiskFlags with severity and value-at-risk for every flagged deal
6. Write dealScoreCards for all deals >= $50K or at-risk deals`,
      inputContext: [],
      outputContext: [
        "pipelineRiskFlags",
        "dealScoreCards",
        "forecastModel",
        "pipelineHealthReport",
      ],
    },
    {
      sequence: 2,
      agentId: "deal-strategist",
      action: `Read pipelineRiskFlags and dealScoreCards from context.
For EACH risk flag where severity is "critical" or "high", develop a remediation plan:
1. Stalled deals: Build acceleration plan with specific timeline, milestones, and escalation path
2. Single-threaded deals: Map stakeholder org chart, identify missing contacts, build multi-threading plan
3. Missing economic buyer: Develop EB engagement strategy with champion enablement materials
4. Competitive threats: Build competitive battlecard with positioning, landmines, and trap handling
5. Underqualified late-stage deals: Build MEDDPICC gap-closure plan with specific questions and meeting agendas
6. Write remediation plans into context for downstream reporting`,
      inputContext: ["pipelineRiskFlags", "dealScoreCards"],
      outputContext: [
        "remediationPlans",
      ],
      condition: "context.data.pipelineRiskFlags && context.data.pipelineRiskFlags.length > 0",
    },
  ],

  sharedContext: [
    "pipelineRiskFlags",
    "dealScoreCards",
    "forecastModel",
    "pipelineHealthReport",
    "remediationPlans",
  ],

  expectedOutput:
    "Step 1: Pipeline health report with score, velocity metrics, coverage analysis, " +
    "stage funnel, forecast model, and prioritized risk flags. " +
    "Step 2 (conditional): If risks exist, deal-strategist produces targeted " +
    "remediation plans per flagged deal. If no risks exist, chain terminates " +
    "after step 1 and returns only the health report.",
};

// --------------------------------------------------------------------------
// Example: Conditional Flow with Risk Flag Context
// --------------------------------------------------------------------------

/**
 * Creates the initial context for the risk → remediation flow,
 * including a realistic set of risk flags that trigger the conditional
 * route to deal-strategist.
 */
export function createConditionalFlowContext(): AgentContext {
  const riskFlags: PipelineRiskFlag[] = [
    {
      id: "risk-stall-001",
      category: RiskCategory.STALLED_DEAL,
      description: "Gamma Solutions (opp-003) has been in Negotiation stage for 38 days — 2.7x the 14-day benchmark. Deal value $420K at risk.",
      severity: "critical",
      dealId: "opp-003",
      valueAtRisk: 420000,
      recommendedAction: ActionType.EXECUTIVE_SPONSOR_ASSIGNMENT,
      remediationGuidance: "Assign VP of Sales as executive sponsor. Schedule EB meeting within 5 business days. Initiate paper process in parallel to compress timeline.",
    },
    {
      id: "risk-single-001",
      category: RiskCategory.SINGLE_THREADED,
      description: "Beta Inc (opp-002) is single-threaded to a single procurement contact at Proposal stage. $85K deal at risk if that contact goes dark.",
      severity: "high",
      dealId: "opp-002",
      valueAtRisk: 85000,
      recommendedAction: ActionType.MULTI_THREAD_ACCOUNT,
      remediationGuidance: "Ask current contact for introduction to the economic buyer and the technical evaluator. Prepare champion assessment: is the current contact a true champion or just a friendly gatekeeper?",
    },
    {
      id: "risk-eb-001",
      category: RiskCategory.MISSING_ECONOMIC_BUYER,
      description: "Gamma Solutions (opp-003) and Beta Inc (opp-002) both lack identified and engaged economic buyers. Combined value at risk: $505K.",
      severity: "high",
      dealId: "opp-003",
      valueAtRisk: 505000,
      recommendedAction: ActionType.SCHEDULE_EB_MEETING,
      remediationGuidance: "For Gamma: Champion claims to have budget authority — verify by requesting a meeting with the CFO 'to align on ROI model.' For Beta: Current contact is procurement — they are not the EB. Identify the budget holder through the champion.",
    },
    {
      id: "risk-coverage-001",
      category: RiskCategory.COVERAGE_GAP,
      description: "Quality-adjusted coverage ratio is 1.8x against a 3x target. Pipeline creation is insufficient to close Q2 gap of $1.4M.",
      severity: "critical",
      valueAtRisk: 1400000,
      recommendedAction: ActionType.PIPELINE_CREATION_BLITZ,
      remediationGuidance: "Launch 6-week pipeline creation blitz targeting enterprise accounts in fintech and healthcare verticals. Requires $2.4M in new qualified pipeline to reach 3x coverage. Coordinate with outbound strategist.",
    },
  ];

  const scoreCards: DealScoreCard[] = [
    {
      dealId: "opp-003",
      dealName: "Gamma Solutions — Security Suite",
      meddpiccScore: 9,
      meddpiccBreakdown: {
        "metrics": { score: 2, evidence: "Buyer quantified compliance penalties at $420K/yr", gap: "" },
        "economic-buyer": { score: 0, evidence: "", gap: "EB not identified — champion claims authority but not verified" },
        "decision-criteria": { score: 2, evidence: "Evaluating against 4 criteria: security coverage, time to deploy, TCO, vendor stability", gap: "" },
        "decision-process": { score: 1, evidence: "4-step process mapped: eval → technical validation → legal → exec sign-off", gap: "Legal step timeline unknown" },
        "paper-process": { score: 0, evidence: "", gap: "Paper process not initiated — HIGH RISK for 30-day close" },
        "implicated-pain": { score: 2, evidence: "Regulatory compliance gap costing $420K/yr in potential penalties", gap: "" },
        "champion": { score: 1, evidence: "Dir. of Security — motivated, participated in demo", gap: "Champion has not been tested on a hard ask (EB intro or competitor comparison)" },
        "competition": { score: 1, evidence: "Incumbent vendor plus one emerging challenger identified", gap: "Relative positioning not assessed against challenger" },
      },
      engagementScore: 4,
      velocityScore: 2,
      compositeScore: 15,
      healthStatus: DealHealthStatus.AT_RISK,
      topRisks: ["Stalled 2.7x benchmark", "No economic buyer access", "Paper process not started", "Close in 30 days — critical timeline risk"],
    },
    {
      dealId: "opp-002",
      dealName: "Beta Inc — Analytics Upgrade",
      meddpiccScore: 4,
      meddpiccBreakdown: {
        "metrics": { score: 1, evidence: "General efficiency improvement stated but not quantified", gap: "No specific dollar value attached to pain" },
        "economic-buyer": { score: 0, evidence: "", gap: "Deal routed through procurement — EB unknown" },
        "decision-criteria": { score: 0, evidence: "", gap: "Evaluation criteria not discussed" },
        "decision-process": { score: 0, evidence: "", gap: "Decision process unknown — procurement contact only" },
        "paper-process": { score: 0, evidence: "", gap: "Not discussed" },
        "implicated-pain": { score: 1, evidence: "Current analytics tool is slow and limited", gap: "Not connected to a business outcome" },
        "champion": { score: 1, evidence: "Procurement contact is friendly", gap: "Contact is a gatekeeper, not a champion — no internal advocacy" },
        "competition": { score: 1, evidence: "At least one competitor in evaluation", gap: "No competitive intel gathered" },
      },
      engagementScore: 2,
      velocityScore: 3,
      compositeScore: 9,
      healthStatus: DealHealthStatus.CRITICAL,
      topRisks: ["Single-threaded to procurement", "No economic buyer", "No decision criteria mapped", "Short close timeline with no paper process started"],
    },
  ];

  return {
    sessionId: `conditional-risk-remediation-${Date.now()}`,
    data: {
      pipelineRiskFlags: riskFlags,
      dealScoreCards: scoreCards,
      forecastModel: null, // will be populated by pipeline-analyst
      pipelineHealthReport: null,
      remediationPlans: null, // will be populated by deal-strategist (conditional)
    },
    audit: [],
    controls: {
      maxHops: 2,
      hopCount: 0,
      terminateAfter: false,
    },
  };
}

/**
 * Creates the input for the pipeline-analyst step in the conditional flow.
 * Uses a wider set of deals that includes both healthy and at-risk deals
 * to ensure risk flags are surfaced.
 */
export function createConditionalFlowInput(
  correlationId: string,
): AgentInput<PipelineAnalystInput> {
  return {
    targetAgent: "sales-pipeline-analyst",
    correlationId,
    timestamp: Date.now(),
    source: "revenue-operations",
    priority: "high",
    payload: {
      pipelineSnapshot: createMockPipelineSnapshot(),
      historicalData: {
        periodLabel: "H1 2026",
        stageWinRates: {
          [PipelineStage.DISCOVERY]: 0.78,
          [PipelineStage.QUALIFICATION]: 0.62,
          [PipelineStage.EVALUATION]: 0.44,
          [PipelineStage.PROPOSAL]: 0.68,
          [PipelineStage.NEGOTIATION]: 0.83,
          [PipelineStage.CLOSED_WON]: 1.0,
          [PipelineStage.CLOSED_LOST]: 0,
        },
        overallWinRate: 0.28,
        wonCount: 42,
        lostCount: 108,
        averageDealSize: 85000,
        medianCycleDays: 75,
        sampleSize: 150,
      },
      quotaData: {
        period: "Q2-2026",
        totalQuota: 5_000_000,
        closedRevenue: 1_800_000,
        remainingQuota: 3_200_000,
        repQuotas: {
          "rep-alex": 800_000,
          "rep-jordan": 750_000,
          "rep-morgan": 700_000,
          "rep-casey": 650_000,
        },
      },
      stageBenchmarks: {
        [PipelineStage.DISCOVERY]: { benchmarkDays: 14, benchmarkConversionRate: 0.75 },
        [PipelineStage.QUALIFICATION]: { benchmarkDays: 21, benchmarkConversionRate: 0.60 },
        [PipelineStage.EVALUATION]: { benchmarkDays: 30, benchmarkConversionRate: 0.45 },
        [PipelineStage.PROPOSAL]: { benchmarkDays: 21, benchmarkConversionRate: 0.65 },
        [PipelineStage.NEGOTIATION]: { benchmarkDays: 14, benchmarkConversionRate: 0.80 },
      },
      analysisDepth: "deep",
      currency: "USD",
    },
  };
}

// ============================================================================
// Flow Registry — Canonical Flow Reference
// ============================================================================

/**
 * Registry of all canonical execution flows for the pipeline-analyst agent.
 * The orchestrator looks up flows by ID to understand agent chains,
 * context propagation requirements, and conditional branching rules.
 */
export const PIPELINE_ANALYST_FLOWS: Record<string, ExecutionFlow> = {
  "pipeline-analyst-weekly-review.v1": SINGLE_WEEKLY_PIPELINE_REVIEW_FLOW,
  "outreach-to-pipeline-analyst.v1": CHAIN_OUTREACH_TO_PIPELINE_ANALYST_FLOW,
  "pipeline-risk-to-deal-strategist.v1": CONDITIONAL_RISK_TO_DEAL_STRATEGIST_FLOW,
};

// ============================================================================
// Execution Flow Decision Matrix
// ============================================================================

/**
 * Decision matrix mapping scenarios to the optimal execution flow pattern.
 *
 * | Scenario | Pattern | Why |
 * |---|---|---|
 * | Weekly pipeline health review | **Single** | No dependencies — standalone diagnostics |
 * | Deal-level deep dive on at-risk opp | **Single** (deep analysis) | Focused analysis on one deal |
 * | Outreach prospect replies positive | **Chain** (→ pipeline-analyst) | Needs pipeline fit scoring before next step |
 * | Late-stage deal velocity check | **Single** | Quick velocity health check |
 * | Pipeline risk remediation planning | **Conditional** (→ deal-strategist) | Only needed when risks exist |
 * | Coverage gap detected | **Conditional** (→ outbound-strategist) | Only needed when coverage is below target |
 * | Team pipeline health is critical | **Conditional** (→ sales-coach) | Only needed when health score < 50 |
 * | New quarter forecast construction | **Single** | Full pipeline analysis + forecast build |
 * | Rep coaching diagnostics | **Chain** (pipeline-analyst → sales-coach) | Needs pipeline data + rep scoring |
 * | Post-quarter forecast accuracy audit | **Single** (with accuracy history) | Compare forecast vs actual |
 */
