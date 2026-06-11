// ============================================================================
// Nexus Agent Platform — Agent Registry
// Agent Adapter: @trend-researcher
// Version: 1.0.0
// Description: Market intelligence analyst — identifies emerging trends,
//   performs competitive analysis, and maps opportunity areas for product strategy.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. INPUT SCHEMA — AgentInput
// ---------------------------------------------------------------------------

/**
 * Industry or market scope to analyze.
 */
export interface IndustryFocus {
  /** Primary industry name (e.g., "fintech", "healthcare-ai", "SaaS") */
  primary: string;
  /** Adjacent sectors for cross-industry pattern detection */
  adjacent?: string[];
  /** NAICS/SIC codes for precise segmentation */
  classificationCodes?: string[];
}

/**
 * A competitor entity to be tracked.
 */
export interface CompetitorEntity {
  name: string;
  /** URL, Crunchbase ID, or other identifier */
  identifier?: string;
  /** Known product/service lines */
  productLines?: string[];
  /** Estimated market share if available */
  marketShare?: number;
}

/**
 * Source channels to draw intelligence from.
 */
export interface ResearchSources {
  /** Web search engines (Google, Bing, etc.) */
  web: boolean;
  /** News aggregators and publications */
  news: boolean;
  /** Social media platforms (Twitter/X, LinkedIn, Reddit, etc.) */
  social: boolean;
  /** Specialized databases (CB Insights, PitchBook, Statista, etc.) */
  databases: boolean;
  /** Patent filings and IP databases */
  patents: boolean;
  /** Additional custom sources */
  custom?: string[];
  /** Per-source weight (0.0–1.0) for importance scoring */
  weights?: Record<string, number>;
}

/**
 * Time horizon for trend analysis.
 */
export type TimeHorizon =
  | { type: "short-term"; months: 1 | 3 | 6 }
  | { type: "medium-term"; months: 12 | 18 | 24 }
  | { type: "long-term"; months: 36 | 60 | 120 };

/**
 * Geographic scope for market analysis.
 */
export interface GeographicScope {
  /** Target markets (e.g., ["US", "EU", "APAC"]) */
  regions: string[];
  /** Drill-down countries or metropolitan areas */
  countries?: string[];
  /** Cultural clusters for psychographic analysis */
  culturalClusters?: string[];
}

/**
 * Strength of evidence for a finding.
 */
export type EvidenceStrength = "strong" | "moderate" | "weak" | "conflicting";

/**
 * A hypothesis or strategic question to be tested by research.
 */
export interface ResearchHypothesis {
  id: string;
  statement: string;
  /** Rationale for why this hypothesis matters */
  rationale: string;
  desiredConfidence: EvidenceStrength;
}

/**
 * Full input schema for @trend-researcher invocation.
 */
export interface TrendResearcherInput {
  industry: IndustryFocus;
  competitors: CompetitorEntity[];
  sources: ResearchSources;
  horizon: TimeHorizon;
  geography: GeographicScope;
  hypotheses: ResearchHypothesis[];
  /** Language preference for output */
  language?: string;
  /** Budget/resource constraints */
  constraints?: {
    maxSources?: number;
    maxCompetitors?: number;
    timeBudgetMinutes?: number;
  };
}

// ---------------------------------------------------------------------------
// 2. OUTPUT SCHEMA — AgentOutput
// ---------------------------------------------------------------------------

/**
 * Confidence score for a prediction.
 */
export interface ConfidenceScore {
  level: EvidenceStrength;
  /** Numeric 0.0–1.0 */
  numeric: number;
  rationale: string;
}

/**
 * A single identified trend with supporting evidence.
 */
export interface TrendFinding {
  id: string;
  name: string;
  description: string;
  category:
    | "technology"
    | "consumer-behavior"
    | "regulatory"
    | "market-structure"
    | "cultural"
    | "business-model";
  evidenceStrength: ConfidenceScore;
  /** Timelines */
  emergenceDate: string; // ISO date
  maturityProjection: string; // ISO date or description
  /** Supporting sources */
  sources: SourceCitation[];
  /** Key quantitative signal */
  signalMetrics: Record<string, number | string>;
  /** Cross-trend dependencies */
  relatedTrends: string[];
  /** Relevance to each geographic region */
  geographicRelevance: Record<string, EvidenceStrength>;
}

/**
 * SWOT assessment for a competitor.
 */
export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/**
 * Competitive positioning analysis for a single competitor.
 */
export interface CompetitorProfile {
  name: string;
  marketPosition: "leader" | "challenger" | "niche" | "emerging";
  estimatedMarketShare?: number;
  recentMoves: string[];
  swot: SWOT;
  /** Key differentiators vs. our product */
  differentiators: string[];
  /** Threat level */
  threatLevel: "high" | "medium" | "low";
}

/**
 * Opportunity assessment entry with impact × feasibility scoring.
 */
export interface OpportunityEntry {
  id: string;
  name: string;
  description: string;
  linkedTrends: string[];
  /** Impact score 1–10 */
  impact: number;
  /** Feasibility score 1–10 */
  feasibility: number;
  /** Combined priority score */
  priority: number; // (impact * feasibility) / 2
  timeToValue: "short" | "medium" | "long";
  resourceRequired: "minimal" | "moderate" | "significant";
  riskLevel: "low" | "medium" | "high";
  recommendation: "pursue" | "watch" | "defer" | "deprioritize";
}

/**
 * Strategic recommendation from the research.
 */
export interface StrategicRecommendation {
  id: string;
  action: string;
  rationale: string;
  expectedOutcome: string;
  confidence: ConfidenceScore;
  timeline: string;
  dependencies: string[];
}

/**
 * Citation for a single source used in research.
 */
export interface SourceCitation {
  id: string;
  title: string;
  url?: string;
  publicationDate: string;
  sourceType:
    | "news-article"
    | "research-report"
    | "patent-filing"
    | "social-post"
    | "expert-interview"
    | "analyst-report"
    | "academic-paper"
    | "conference-talk"
    | "regulatory-filing"
    | "financial-filing";
  publisher: string;
  credibilityScore: ConfidenceScore;
  /** Relevance to each research hypothesis */
  hypothesisRelevance: string[];
  /** Geographic relevance */
  geographicFocus: string[];
}

/**
 * Full output schema returned by @trend-researcher.
 */
export interface TrendResearcherOutput {
  /** Execution metadata */
  meta: {
    generatedAt: string; // ISO timestamp
    modelVersion: string;
    promptVersion: string;
    processingTimeMs: number;
    totalSourcesConsumed: number;
    hypothesesTested: number;
  };
  /** Executive summary */
  summary: {
    headline: string;
    keyTakeaway: string;
    topTrendsCount: number;
    opportunitiesIdentified: number;
    criticalInsight: string;
  };
  /** Identified trends */
  trends: TrendFinding[];
  /** Competitive landscape analysis */
  competitiveLandscape: {
    marketOverview: string;
    competitors: CompetitorProfile[];
    marketConcentration: "fragmented" | "consolidating" | "oligopoly" | "monopoly";
    entryBarriers: string[];
  };
  /** Opportunity matrix (impact × feasibility) */
  opportunityMatrix: {
    description: string;
    entries: OpportunityEntry[];
    /** Named quadrants for visual mapping */
    quadrants: {
      label: string;
      impactRange: [number, number];
      feasibilityRange: [number, number];
      entries: OpportunityEntry["id"][];
    }[];
  };
  /** Strategic recommendations */
  recommendations: StrategicRecommendation[];
  /** Full source index for traceability */
  sourceIndex: {
    total: number;
    byType: Record<string, number>;
    byCredibility: Record<string, number>;
    sources: SourceCitation[];
  };
}

// ---------------------------------------------------------------------------
// 3. CONTEXT SCHEMA — AgentContext
// ---------------------------------------------------------------------------

/**
 * Memory keys that @trend-researcher reads/writes in agent context.
 */
export interface TrendResearcherContextKeys {
  /** Primary trend report output — written by this agent, consumed by downstream agents */
  trendReport: "trendReport";
  /** Competitive landscape analysis — structured competitive data */
  competitiveLandscape: "competitiveLandscape";
  /** Opportunity matrix — impact × feasibility scored opportunity entries */
  opportunityMatrix: "opportunityMatrix";
  /** Raw market intelligence signals — intermediate research artifacts */
  marketInsights: "marketInsights";
  /** Indexed source citations — full bibliography with credibility scoring */
  sourceIndex: "sourceIndex";
}

/**
 * Typed context payload shape for downstream consumers.
 */
export interface TrendResearcherContext {
  trendReport: {
    headline: string;
    trends: TrendFinding[];
    generatedAt: string;
  };
  competitiveLandscape: {
    competitors: CompetitorProfile[];
    marketOverview: string;
  };
  opportunityMatrix: {
    entries: OpportunityEntry[];
    quadrants: TrendResearcherOutput["opportunityMatrix"]["quadrants"];
  };
  marketInsights: {
    signals: Array<{
      signal: string;
      strength: EvidenceStrength;
      source: string;
      detectedAt: string;
    }>;
    hypothesesResults: Array<{
      hypothesisId: string;
      validated: boolean;
      confidence: ConfidenceScore;
    }>;
  };
  sourceIndex: {
    sources: SourceCitation[];
    credibilityDistribution: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// 4. VALIDATION RULES
// ---------------------------------------------------------------------------

/**
 * Credibility scoring criteria for a source.
 */
export interface SourceCredibilityCriteria {
  /** Recency: how recent is the publication (in days) */
  recencyDays: number;
  /** Authority: publisher reputation tier */
  authorityTier: 1 | 2 | 3 | 4 | 5;
  /** Peer-review status */
  peerReviewed: boolean;
  /** Citation count (for academic sources) */
  citationCount?: number;
  /** Methodology transparency */
  methodologyDisclosed: boolean;
  /** Funding/disclosure transparency */
  conflictsDisclosed: boolean;
}

/**
 * Scoring matrix for source credibility.
 * Returns 0.0–1.0 score mapped to EvidenceStrength:
 *   ≥0.8 → "strong"
 *   ≥0.5 → "moderate"
 *   ≥0.2 → "weak"
 *   <0.2 → "conflicting"
 */
export function scoreSourceCredibility(criteria: SourceCredibilityCriteria): ConfidenceScore {
  const weights = {
    recency: 0.25,
    authority: 0.30,
    peerReview: 0.15,
    citations: 0.10,
    methodology: 0.10,
    conflicts: 0.10,
  };

  const recencyScore = Math.max(0, 1 - criteria.recencyDays / 1095); // 3-year decay
  const authorityScore = criteria.authorityTier / 5;
  const peerReviewScore = criteria.peerReviewed ? 1 : 0.3;
  const citationScore = criteria.citationCount
    ? Math.min(1, criteria.citationCount / 100)
    : 0.3;
  const methodologyScore = criteria.methodologyDisclosed ? 1 : 0.2;
  const conflictsScore = criteria.conflictsDisclosed ? 1 : 0.4;

  const numeric =
    weights.recency * recencyScore +
    weights.authority * authorityScore +
    weights.peerReview * peerReviewScore +
    weights.citations * citationScore +
    weights.methodology * methodologyScore +
    weights.conflicts * conflictsScore;

  const level: EvidenceStrength =
    numeric >= 0.8 ? "strong" :
    numeric >= 0.5 ? "moderate" :
    numeric >= 0.2 ? "weak" :
    "conflicting";

  const reasons: string[] = [];
  if (criteria.recencyDays <= 90) reasons.push("recent publication");
  if (criteria.authorityTier >= 4) reasons.push("high-authority publisher");
  if (criteria.peerReviewed) reasons.push("peer-reviewed");
  if (criteria.methodologyDisclosed) reasons.push("methodology disclosed");
  if (criteria.conflictsDisclosed) reasons.push("conflicts disclosed");

  return {
    level,
    numeric: Math.round(numeric * 100) / 100,
    rationale: reasons.length > 0
      ? `Credibility score ${numeric.toFixed(2)}: ${reasons.join(", ")}.`
      : `Credibility score ${numeric.toFixed(2)}: limited verification signals.`,
  };
}

/**
 * Trend evidence strength assessment.
 */
export interface TrendEvidenceAssessment {
  trendId: string;
  /** Number of independent sources corroborating */
  corroborationCount: number;
  /** Data quality across sources */
  dataConsistency: "high" | "medium" | "low";
  /** Temporal consistency of the signal */
  temporalConsistency: "increasing" | "stable" | "declining" | "volatile";
  /** Whether multiple methodologies converge */
  methodologicalTriangulation: boolean;
  /** Expert consensus if available */
  expertConsensus?: "majority" | "split" | "minority";
}

export function assessTrendEvidence(assessment: TrendEvidenceAssessment): ConfidenceScore {
  let score = 0;

  // Corroboration (up to 0.30)
  score += Math.min(1, assessment.corroborationCount / 10) * 0.30;

  // Data consistency (up to 0.20)
  score +=
    assessment.dataConsistency === "high" ? 0.20 :
    assessment.dataConsistency === "medium" ? 0.12 :
    0.04;

  // Temporal consistency (up to 0.20)
  score +=
    assessment.temporalConsistency === "increasing" ? 0.20 :
    assessment.temporalConsistency === "stable" ? 0.15 :
    assessment.temporalConsistency === "volatile" ? 0.08 :
    0.02;

  // Methodological triangulation (up to 0.15)
  if (assessment.methodologicalTriangulation) score += 0.15;

  // Expert consensus (up to 0.15)
  score +=
    assessment.expertConsensus === "majority" ? 0.15 :
    assessment.expertConsensus === "split" ? 0.07 :
    0.02;

  const level: EvidenceStrength =
    score >= 0.8 ? "strong" :
    score >= 0.5 ? "moderate" :
    score >= 0.2 ? "weak" :
    "conflicting";

  return {
    level,
    numeric: Math.round(score * 100) / 100,
    rationale: `${assessment.corroborationCount} corroborating sources, ` +
      `${assessment.dataConsistency} data consistency, ` +
      `${assessment.temporalConsistency} temporal trend.`,
  };
}

/**
 * Geographic relevance check.
 */
export interface GeographicRelevanceCheck {
  trendId: string;
  /** Geographic scope of the source data */
  sourceGeography: string[];
  /** Target regions from the research brief */
  targetRegions: string[];
  /** Local adoption indicators (signals found per region) */
  localSignals: Record<string, number>;
  /** Cultural/regulatory alignment */
  alignmentFactors: Record<string, string[]>;
}

export function checkGeographicRelevance(check: GeographicRelevanceCheck): Record<string, EvidenceStrength> {
  const result: Record<string, EvidenceStrength> = {};

  for (const region of check.targetRegions) {
    const sourcesInRegion = check.sourceGeography.filter(g =>
      g.toLowerCase() === region.toLowerCase()
    ).length;
    const localSignalStrength = check.localSignals[region] ?? 0;
    const factors = check.alignmentFactors[region] ?? [];

    // Composite score (0–1)
    const sourceScore = Math.min(1, sourcesInRegion / 5) * 0.35;
    const signalScore = Math.min(1, localSignalStrength / 10) * 0.40;
    const factorScore = Math.min(1, factors.length / 5) * 0.25;

    const composite = sourceScore + signalScore + factorScore;

    result[region] =
      composite >= 0.7 ? "strong" :
      composite >= 0.4 ? "moderate" :
      composite >= 0.15 ? "weak" :
      "conflicting";
  }

  return result;
}

// ---------------------------------------------------------------------------
// 5. ADAPTER CLASS
// ---------------------------------------------------------------------------

/**
 * Adapter class that wraps @trend-researcher for the Agent Registry.
 */
export class TrendResearcherAdapter {
  static readonly agentId = "@trend-researcher";
  static readonly version = "1.0.0";
  static readonly promptVersion = "trend-researcher.v1.prompt.yaml";

  /** Context keys this agent reads from shared context */
  static readonly readsFromContext: (keyof TrendResearcherContext)[] = ["marketInsights"];

  /** Context keys this agent writes to shared context */
  static readonly writesToContext: (keyof TrendResearcherContext)[] = [
    "trendReport",
    "competitiveLandscape",
    "opportunityMatrix",
    "marketInsights",
    "sourceIndex",
  ];

  /**
   * Validate and normalize input before execution.
   */
  static validateInput(input: unknown): TrendResearcherInput {
    const raw = input as Record<string, unknown>;

    // Required field checks
    if (!raw.industry || typeof raw.industry !== "object") {
      throw new Error("TrendResearcherInput.industry is required");
    }
    if (!Array.isArray(raw.competitors)) {
      throw new Error("TrendResearcherInput.competitors must be an array");
    }
    if (!raw.sources || typeof raw.sources !== "object") {
      throw new Error("TrendResearcherInput.sources is required");
    }
    if (!raw.horizon || typeof raw.horizon !== "object") {
      throw new Error("TrendResearcherInput.horizon is required");
    }
    if (!raw.geography || typeof raw.geography !== "object") {
      throw new Error("TrendResearcherInput.geography is required");
    }

    // Type narrowing
    const industry = raw.industry as IndustryFocus;
    const competitors = raw.competitors as CompetitorEntity[];
    const sources = raw.sources as ResearchSources;
    const horizon = raw.horizon as TimeHorizon;
    const geography = raw.geography as GeographicScope;
    const hypotheses = Array.isArray(raw.hypotheses)
      ? (raw.hypotheses as ResearchHypothesis[])
      : [];

    if (!industry.primary || industry.primary.trim().length === 0) {
      throw new Error("TrendResearcherInput.industry.primary is required");
    }

    if (competitors.length === 0) {
      throw new Error("At least one competitor must be specified");
    }

    if (!sources.web && !sources.news && !sources.social && !sources.databases && !sources.patents) {
      throw new Error("At least one research source type must be enabled");
    }

    if (!Array.isArray(geography.regions) || geography.regions.length === 0) {
      throw new Error("At least one geographic region must be specified");
    }

    return {
      industry,
      competitors,
      sources,
      horizon,
      geography,
      hypotheses,
      language: typeof raw.language === "string" ? raw.language : "en",
      constraints: raw.constraints as TrendResearcherInput["constraints"],
    };
  }

  /**
   * Assemble the prompt payload for the agent.
   */
  static buildPrompt(input: TrendResearcherInput): Record<string, unknown> {
    const horizonLabel =
      input.horizon.type === "short-term" ? `${input.horizon.months}-month` :
      input.horizon.type === "medium-term" ? `${input.horizon.months}-month` :
      input.horizon.type === "long-term" ? `${input.horizon.months / 12}-year` :
      "unknown";

    return {
      prompt_version: this.promptVersion,
      variables: {
        industry_focus: input.industry.primary,
        adjacent_industries: input.industry.adjacent ?? [],
        competitors: input.competitors.map((c) => c.name),
        research_questions: input.hypotheses.map((h) => h.statement),
        time_horizon: horizonLabel,
        geographic_scope: input.geography.regions.join(", "),
        analysis_framework: "trend-lifecycle + competitive-intelligence + opportunity-matrix",
        source_channels: Object.entries(input.sources)
          .filter(([, enabled]) => enabled === true)
          .map(([key]) => key),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 6. EXECUTION FLOW EXAMPLES
// ---------------------------------------------------------------------------

/**
 * EXAMPLE 1: Single — Quarterly Market Trends Report
 *
 * A standalone invocation of @trend-researcher to generate a Q2 2026 market
 * trends report for the B2B SaaS analytics space.
 *
 * ```typescript
 * import { TrendResearcherAdapter, TrendResearcherInput } from "@/app/agents/trend-researcher-adapter";
 *
 * const input: TrendResearcherInput = {
 *   industry: {
 *     primary: "B2B SaaS Analytics",
 *     adjacent: ["Business Intelligence", "Data Engineering", "Marketing Analytics"],
 *   },
 *   competitors: [
 *     { name: "Tableau", identifier: "tableau.com" },
 *     { name: "Looker", identifier: "looker.com" },
 *     { name: "Mode Analytics", identifier: "mode.com" },
 *     { name: "Metabase", identifier: "metabase.com" },
 *   ],
 *   sources: {
 *     web: true,
 *     news: true,
 *     social: true,
 *     databases: true,
 *     patents: false,
 *   },
 *   horizon: { type: "short-term", months: 6 },
 *   geography: {
 *     regions: ["North America", "Europe", "APAC"],
 *     countries: ["US", "UK", "Germany", "Singapore"],
 *   },
 *   hypotheses: [
 *     {
 *       id: "H1",
 *       statement: "AI-native analytics assistants are displacing traditional dashboard UIs",
 *       rationale: "Multiple vendors shipping LLM-powered query interfaces",
 *       desiredConfidence: "strong",
 *     },
 *     {
 *       id: "H2",
 *       statement: "Embedded analytics is becoming a must-have feature for SaaS platforms",
 *       rationale: "Shift toward product-led growth and in-app reporting",
 *       desiredConfidence: "moderate",
 *     },
 *   ],
 * };
 *
 * // Validate
 * const validated = TrendResearcherAdapter.validateInput(input);
 *
 * // Build prompt variables
 * const promptVars = TrendResearcherAdapter.buildPrompt(validated);
 *
 * // Execute via agent runtime...
 * // const output: TrendResearcherOutput = await agentRuntime.execute("@trend-researcher", promptVars);
 *
 * // Context handoff:
 * // context.set("trendReport", output.trends);
 * // context.set("competitiveLandscape", output.competitiveLandscape);
 * // context.set("opportunityMatrix", output.opportunityMatrix);
 * ```
 */

/**
 * EXAMPLE 2: Chain — @trend-researcher → @product-manager
 *
 * Research output feeds directly into product strategy definition.
 * The product-manager agent consumes trend data to inform roadmap priorities.
 *
 * ```typescript
 * // Step 1 — Research phase
 * // const researchOutput = await runtime.execute("@trend-researcher", { ... });
 *
 * // Step 2 — Context handoff
 * // runtime.setContext({
 * //   trendReport: researchOutput.trends,
 * //   competitiveLandscape: researchOutput.competitiveLandscape,
 * //   opportunityMatrix: researchOutput.opportunityMatrix,
 * //   sourceIndex: researchOutput.sourceIndex,
 * // });
 *
 * // Step 3 — Product strategy definition
 * // const strategyInput = {
 * //   productArea: "Analytics Dashboard",
 * //   businessGoals: ["Increase retention", "Expand to enterprise"],
 * //   trendInput: {
 * //     topTrends: researchOutput.trends.filter(t => t.evidenceStrength.numeric >= 0.7),
 * //     keyOpportunities: researchOutput.opportunityMatrix.entries
 * //       .filter(e => e.recommendation === "pursue")
 * //       .sort((a, b) => b.priority - a.priority),
 * //     competitiveThreats: researchOutput.competitiveLandscape.competitors
 * //       .filter(c => c.threatLevel === "high"),
 * //   },
 * // };
 * //
 * // const strategy = await runtime.execute("@product-manager", strategyInput);
 * ```
 *
 * Context flow:
 * ┌──────────────────┐     trendReport       ┌────────────────────┐
 * │ @trend-researcher │ ────────────────────→ │  @product-manager  │
 * │                   │   competitiveLandscape │                    │
 * │   Generates:      │ ────────────────────→ │  Consumes to:      │
 * │   • Trend findings│   opportunityMatrix   │   • Define roadmap │
 * │   • Comp analysis │ ────────────────────→ │   • Set priorities │
 * │   • Opportunities │   sourceIndex          │   • Write PRDs     │
 * └──────────────────┘     (traceability)     └────────────────────┘
 */

/**
 * EXAMPLE 3: Multi-agent — @trend-researcher → @seo-specialist → @content-creator
 *
 * Research identifies trending topics → SEO validates keyword opportunity →
 * Content creator produces optimized assets.
 *
 * ```typescript
 * // Step 1 — Trend research scoped to content/marketing signals
 * // const trendInput: TrendResearcherInput = {
 * //   industry: { primary: "B2B SaaS Analytics" },
 * //   sources: { web: true, news: true, social: true, databases: false, patents: false },
 * //   horizon: { type: "short-term", months: 3 },
 * //   geography: { regions: ["Global"] },
 * //   hypotheses: [
 * //     { id: "H1", statement: "Conversational analytics is trending in the media",
 * //       rationale: "Spike in thought-leadership articles", desiredConfidence: "moderate" },
 * //     { id: "H2", statement: "Data democratization is a growing search category",
 * //       rationale: "Increase in 'analytics for non-technical' queries", desiredConfidence: "moderate" },
 * //   ],
 * //   competitors: [{ name: "Tableau" }, { name: "Looker" }],
 * // };
 * //
 * // const research = await runtime.execute("@trend-researcher", trendInput);
 *
 * // Step 2 — SEO keyword validation
 * // const seoInput = {
 * //   trendingTopics: research.trends.map(t => ({
 * //     topic: t.name,
 * //     evidence: t.evidenceStrength.numeric,
 * //     relatedSources: t.sources.map(s => s.title),
 * //   })),
 * //   targetMarket: "North America",
 * //   searchIntent: "informational",
 * // };
 * //
 * // const seoStrategy = await runtime.execute("@seo-specialist", seoInput);
 * // // Returns: keyword clusters, search volumes, cannibalization audit, content gap analysis
 *
 * // Step 3 — Content production
 * // const contentInput = {
 * //   contentBriefs: seoStrategy.topOpportunities.map((opp: any) => ({
 * //     targetKeyword: opp.keyword,
 * //     searchVolume: opp.volume,
 * //     contentGap: opp.gapAnalysis,
 * //     targetAudience: "Data analysts and BI managers",
 * //     format: opp.recommendedFormat,
 * //   })),
 * //   brandVoice: "Authoritative but accessible, data-driven",
 * //   channels: ["Blog", "LinkedIn", "YouTube"],
 * // };
 * //
 * // const contentPlan = await runtime.execute("@content-creator", contentInput);
 * // // Returns: editorial calendar, draft outlines, platform-optimized content
 * // ```
 *
 * Agent pipeline:
 * ┌──────────────────┐  trending topics   ┌────────────────┐  keyword strategy  ┌─────────────────┐
 * │ @trend-researcher │ ────────────────→ │ @seo-specialist │ ────────────────→ │ @content-creator │
 * │                   │  + signal evidence│                 │  + content gaps    │                  │
 * │  Detects:         │                   │  Validates:     │                   │  Produces:       │
 * │  • Emerging topics│                   │  • Search volume│                   │  • Blog posts    │
 * │  • Social signals │                   │  • Competition  │                   │  • Social copy   │
 * │  • Media coverage │                   │  • Intent match │                   │  • Video scripts │
 * └──────────────────┘                    └────────────────┘                   └─────────────────┘
 */
