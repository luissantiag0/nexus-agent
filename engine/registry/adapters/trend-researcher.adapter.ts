// ============================================================================
// Nexus Agent Platform — Trend Researcher Adapter
// ============================================================================
// Market intelligence adapter specializing in identifying emerging trends,
// competitive analysis, and opportunity assessment. Feeds the AgentRunner
// with validated TrendResearcherInput and structured TrendResearcherOutput.
// ============================================================================

import { v4 as uuid } from "uuid";
import type {
  AgentInput,
  AgentOutput,
  AgentMetadata,
  PortSchema,
  ValidationRule,
  ValidationResult,
  ContextKey,
  AgentContext,
} from "@/lib/agents/registry/types";
import type { AgentResult } from "@/engine/types/agent-types";

// ============================================================================
// Metadata
// ============================================================================

const METADATA: AgentMetadata = {
  id: "trend-researcher" as any,
  name: "Trend Researcher",
  description:
    "Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Provides actionable insights that drive product strategy and innovation decisions through comprehensive market research and predictive analysis.",
  version: "1.0.0",
  status: "active",
  tags: ["research", "intelligence", "trends", "market-analysis"],
  capabilities: [
    "market-research",
    "trend-analysis",
    "competitive-intelligence",
    "opportunity-assessment",
    "consumer-insights",
    "technology-scouting",
    "regulatory-intelligence",
    "weak-signal-detection",
  ],
  color: "#8b5cf6",
  icon: "📈",
  model: "gpt-4",
};

// ============================================================================
// Port Schemas
// ============================================================================

const INPUT_SCHEMA: PortSchema = {
  $id: "trend-researcher-input.v1",
  version: "1.0.0",
  description: "Research parameters for the Trend Researcher agent.",
  type: "object",
  properties: {
    industry: {
      type: "string",
      description: "Target industry for trend analysis (e.g. 'fintech', 'healthcare', 'saas')",
    },
    competitors: {
      type: "array",
      items: { type: "string" },
      description: "List of competitor names or identifiers to analyze",
    },
    sources: {
      type: "array",
      items: { type: "string" },
      description: "Data sources for research (e.g. 'google-trends', 'semrush', 'crunchbase', 'patent-db')",
    },
    timeHorizon: {
      type: "string",
      enum: ["short", "medium", "long"],
      description: "Forecast horizon: short (0-6mo), medium (6-18mo), long (18-36mo)",
    },
    geography: {
      type: "string",
      description: "Geographic market scope (e.g. 'global', 'north-america', 'eu')",
    },
    hypotheses: {
      type: "array",
      items: { type: "string" },
      description: "Initial trend hypotheses to validate or refute through research",
    },
  },
  required: ["industry", "sources", "timeHorizon"],
  example: {
    industry: "fintech",
    competitors: ["Stripe", "Square", "Adyen", "Plaid"],
    sources: ["google-trends", "crunchbase", "patent-db", "social-listening"],
    timeHorizon: "medium",
    geography: "global",
    hypotheses: [
      "Embedded finance is accelerating across B2B SaaS",
      "BNPL is declining in favor of debit-based alternatives",
    ],
  },
};

const OUTPUT_SCHEMA: PortSchema = {
  $id: "trend-researcher-output.v1",
  version: "1.0.0",
  description: "Structured research deliverables from the Trend Researcher agent.",
  type: "object",
  properties: {
    trendReport: {
      type: "string",
      description: "Comprehensive trend analysis report with signals, pattern recognition, and forecasts",
    },
    competitiveLandscape: {
      type: "string",
      description: "Competitive positioning analysis with SWOT, market maps, and white-space identification",
    },
    opportunityMatrix: {
      type: "string",
      description: "Prioritized opportunity matrix mapping trends to market gaps with sizing",
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "Actionable strategic recommendations with implementation guidance",
    },
    sourceIndex: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          credibility: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      description: "Curated source index with credibility scoring for all referenced data",
    },
  },
  required: [
    "trendReport",
    "competitiveLandscape",
    "opportunityMatrix",
    "recommendations",
    "sourceIndex",
  ],
};

// ============================================================================
// Context Keys
// ============================================================================

const READS: ContextKey[] = [
  "topicBrief" as any,
  "audienceSegments" as any,
];

const WRITES: ContextKey[] = [
  "trendReport" as any,
  "trendingTopics" as any,
  "contentGaps" as any,
  "competitiveLandscape" as any,
];

// ============================================================================
// Validation Rules
// ============================================================================

const VALID_TIME_HORIZONS = ["short", "medium", "long"] as const;

const OUTPUT_VALIDATORS: ValidationRule<TrendResearcherOutput>[] = [
  {
    id: "trend-report-not-empty",
    name: "Trend report is present",
    description: "Ensures the trend report is not empty",
    severity: "error",
    validate: (output: TrendResearcherOutput): ValidationResult => {
      const errors = [];
      if (!output.trendReport || output.trendReport.trim().length === 0) {
        errors.push({
          path: "trendReport",
          message: "Trend report is required and must not be empty",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "competitive-landscape-present",
    name: "Competitive landscape is defined",
    description: "Ensures the competitive landscape analysis is present",
    severity: "error",
    validate: (output: TrendResearcherOutput): ValidationResult => {
      const errors = [];
      if (!output.competitiveLandscape || output.competitiveLandscape.trim().length === 0) {
        errors.push({
          path: "competitiveLandscape",
          message: "Competitive landscape analysis is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "opportunity-matrix-present",
    name: "Opportunity matrix is defined",
    description: "Ensures the opportunity matrix is present",
    severity: "error",
    validate: (output: TrendResearcherOutput): ValidationResult => {
      const errors = [];
      if (!output.opportunityMatrix || output.opportunityMatrix.trim().length === 0) {
        errors.push({
          path: "opportunityMatrix",
          message: "Opportunity matrix is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "recommendations-not-empty",
    name: "Recommendations are provided",
    description: "Ensures at least one actionable recommendation is specified",
    severity: "error",
    validate: (output: TrendResearcherOutput): ValidationResult => {
      const errors = [];
      if (!output.recommendations || output.recommendations.length === 0) {
        errors.push({
          path: "recommendations",
          message: "At least one strategic recommendation must be provided",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "source-index-present",
    name: "Source index is populated",
    description: "Warns if source index is empty",
    severity: "warning",
    validate: (output: TrendResearcherOutput): ValidationResult => {
      const warnings = [];
      if (!output.sourceIndex || output.sourceIndex.length === 0) {
        warnings.push({
          path: "sourceIndex",
          message: "Source index is empty; credibility scoring will be unavailable",
          severity: "warning",
        });
      }
      return { valid: warnings.length === 0, errors: [], warnings };
    },
  },
];

// ============================================================================
// Prompt Template Path
// ============================================================================

const PROMPT_TEMPLATE = "engine/prompts/templates/trend-researcher-v1.yaml";

// ============================================================================
// TrendResearcherInput — Input schema for the Trend Researcher adapter
// ============================================================================

/**
 * Research parameters fed into the Trend Researcher agent.
 */
export interface TrendResearcherInput {
  /** Target industry for trend analysis (e.g. 'fintech', 'healthcare', 'saas'). */
  industry: string;

  /** List of competitor names or identifiers to analyze. */
  competitors?: string[];

  /** Data sources for research (e.g. 'google-trends', 'semrush', 'crunchbase', 'patent-db'). */
  sources: string[];

  /** Forecast horizon: short (0-6mo), medium (6-18mo), long (18-36mo). */
  timeHorizon: "short" | "medium" | "long";

  /** Geographic market scope (e.g. 'global', 'north-america', 'eu'). */
  geography?: string;

  /** Initial trend hypotheses to validate or refute through research. */
  hypotheses?: string[];
}

// ============================================================================
// TrendResearcherOutput — Output schema for the Trend Researcher adapter
// ============================================================================

/**
 * Structured research deliverables produced by the Trend Researcher agent.
 */
export interface TrendResearcherOutput {
  /** Comprehensive trend analysis report with signals, pattern recognition, and forecasts. */
  trendReport: string;

  /** Competitive positioning analysis with SWOT, market maps, and white-space identification. */
  competitiveLandscape: string;

  /** Prioritized opportunity matrix mapping trends to market gaps with sizing. */
  opportunityMatrix: string;

  /** Actionable strategic recommendations with implementation guidance. */
  recommendations: string[];

  /** Curated source index with credibility scoring (0–1) for all referenced data. */
  sourceIndex: Array<{
    title: string;
    url: string;
    credibility: number;
  }>;
}

// ============================================================================
// IAgentAdapter — Typed contract for Trend Researcher
// ============================================================================

/**
 * Generic adapter interface for the AgentRunner system.
 * Each adapter implements validate() for pre-flight input checking
 * and execute() returning a structured AgentResult.
 */
export interface IAgentAdapter<
  TIn extends Record<string, unknown> = Record<string, unknown>,
  TOut extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Stable agent metadata. */
  readonly metadata: AgentMetadata;

  /** Input port schema definition. */
  readonly inputSchema: PortSchema;

  /** Output port schema definition. */
  readonly outputSchema: PortSchema;

  /** Context keys this agent reads from the shared context. */
  readonly reads: ContextKey[];

  /** Context keys this agent writes to the shared context. */
  readonly writes: ContextKey[];

  /** Validation rules that run against the output before returning. */
  readonly validators: ValidationRule<TOut>[];

  /** Path to the externalized system prompt template. */
  readonly promptTemplate: string;

  /** Resolve the system prompt by interpolating runtime variables. */
  resolvePrompt(variables: Record<string, unknown>): Promise<string>;

  /**
   * Validate input against the agent's schema and business rules.
   * Called by the registry before execute.
   */
  validate(input: TIn): ValidationResult;

  /**
   * Execute the agent's core research logic.
   *
   * @param input   - Validated input payload.
   * @param context - Shared agent chain context.
   * @param signal  - Optional abort signal for cancellation.
   * @returns       - AgentResult with runId, timestamp, durationMs, output, status.
   */
  execute(
    input: TIn,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentResult<TOut>>;
}

// ============================================================================
// Trend Researcher Adapter Implementation
// ============================================================================

export class TrendResearcherAdapter
  implements IAgentAdapter<TrendResearcherInput, TrendResearcherOutput>
{
  readonly metadata: AgentMetadata = METADATA;
  readonly inputSchema: PortSchema = INPUT_SCHEMA;
  readonly outputSchema: PortSchema = OUTPUT_SCHEMA;
  readonly reads: ContextKey[] = READS;
  readonly writes: ContextKey[] = WRITES;
  readonly validators: ValidationRule<TrendResearcherOutput>[] = OUTPUT_VALIDATORS;
  readonly promptTemplate: string = PROMPT_TEMPLATE;

  /**
   * Resolve the system prompt by interpolating runtime variables
   * into the YAML prompt template.
   */
  async resolvePrompt(variables: Record<string, unknown>): Promise<string> {
    const basePrompt = `
You are Trend Researcher, an expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment.

## Industry
${variables.industry ?? "(not provided)"}

## Competitors
${Array.isArray(variables.competitors) ? (variables.competitors as string[]).join("\n") : "(not provided)"}

## Data Sources
${Array.isArray(variables.sources) ? (variables.sources as string[]).join("\n") : "(not provided)"}

## Time Horizon
${variables.timeHorizon ?? "(not provided)"}

## Geography
${variables.geography ?? "global"}

## Hypotheses to Validate
${Array.isArray(variables.hypotheses) ? (variables.hypotheses as string[]).join("\n") : "None provided"}

## Your Task
Conduct a comprehensive trend research analysis including:
1. Trend report — signals, patterns, forecasts with confidence scoring
2. Competitive landscape — positioning, SWOT, white-space opportunities
3. Opportunity matrix — prioritized opportunities with market sizing
4. Strategic recommendations — actionable next steps with implementation guidance
5. Source index — curated references with credibility scoring (0–1)

Respond with a structured JSON output conforming to the TrendResearcherOutput schema.
`;

    return basePrompt;
  }

  // ========================================================================
  // Input Validation
  // ========================================================================

  /**
   * Validates TrendResearcherInput against business rules.
   *
   * Checks:
   *  - industry must be non-empty
   *  - sources list must be non-empty
   *  - timeHorizon must be one of "short" | "medium" | "long"
   */
  validate(input: TrendResearcherInput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    // industry: non-empty string
    if (!input.industry || input.industry.trim().length === 0) {
      errors.push({
        path: "industry",
        message: "industry is required and must be a non-empty string",
        severity: "error",
      });
    }

    // sources: non-empty array
    if (!input.sources || !Array.isArray(input.sources) || input.sources.length === 0) {
      errors.push({
        path: "sources",
        message: "sources list is required and must contain at least one source",
        severity: "error",
      });
    }

    // timeHorizon: must be valid
    const validHorizons: ReadonlyArray<string> = VALID_TIME_HORIZONS;
    if (!input.timeHorizon) {
      errors.push({
        path: "timeHorizon",
        message: "timeHorizon is required",
        severity: "error",
      });
    } else if (!validHorizons.includes(input.timeHorizon)) {
      errors.push({
        path: "timeHorizon",
        message: `timeHorizon must be one of: ${validHorizons.join(", ")}`,
        severity: "error",
      });
    }

    // Competitors: optional but warn if empty
    if (!input.competitors || !Array.isArray(input.competitors) || input.competitors.length === 0) {
      warnings.push({
        path: "competitors",
        message: "No competitors specified; competitive analysis will be generic",
        severity: "warning",
      } as any);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.map((w: any) => w.message),
    };
  }

  // ========================================================================
  // Lifecycle Hooks
  // ========================================================================

  async onBefore(
    input: AgentInput<TrendResearcherInput>,
    context: AgentContext,
  ): Promise<void> {
    // Validate that required context keys are available
    const topicBrief = context.get?.("topicBrief" as any);
    const audienceSegments = context.get?.("audienceSegments" as any);

    if (!topicBrief) {
      console.warn("[TrendResearcher] topicBrief not found in context; proceeding without brief");
    }
    if (!audienceSegments) {
      console.warn("[TrendResearcher] audienceSegments not found in context; proceeding without segments");
    }
  }

  async onAfter(
    output: AgentOutput<TrendResearcherOutput>,
    context: AgentContext,
  ): Promise<void> {
    // Write outputs to shared context for downstream agents
    context.set?.("trendReport" as any, output.payload.trendReport);
    context.set?.("trendingTopics" as any, output.payload.trendReport);
    context.set?.("contentGaps" as any, output.payload.opportunityMatrix);
    context.set?.("competitiveLandscape" as any, output.payload.competitiveLandscape);
  }

  // ========================================================================
  // Primary Execution
  // ========================================================================

  async execute(
    input: TrendResearcherInput,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentResult<TrendResearcherOutput>> {
    const executionId = uuid();
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    try {
      // Check for cancellation
      if (signal?.aborted) {
        return this.buildResult(executionId, startedAt, startMs, {
          status: "skipped",
          data: null,
          error: "Execution was cancelled before processing began",
          errorDetails: { reason: (signal as AbortSignal).reason },
        });
      }

      // --- Stub: In production this calls the LLM via resolvePrompt() ---
      const {
        industry,
        competitors,
        sources,
        timeHorizon,
        geography,
        hypotheses,
      } = input;

      // Simulate research processing
      const trendReport = this.generateTrendReport(industry, sources, timeHorizon, geography, hypotheses);
      const competitiveLandscape = this.generateCompetitiveLandscape(industry, competitors ?? []);
      const opportunityMatrix = this.generateOpportunityMatrix(industry, trendReport, competitiveLandscape);
      const recommendations = this.generateRecommendations(opportunityMatrix, timeHorizon);
      const sourceIndex = this.generateSourceIndex(sources);

      const output: TrendResearcherOutput = {
        trendReport,
        competitiveLandscape,
        opportunityMatrix,
        recommendations,
        sourceIndex,
      };

      return this.buildResult(executionId, startedAt, startMs, {
        status: "completed",
        data: output,
        error: null,
        errorDetails: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.buildResult(executionId, startedAt, startMs, {
        status: "failed",
        data: null,
        error: message,
        errorDetails: err instanceof Error ? { stack: err.stack } : { raw: err },
      });
    }
  }

  // ========================================================================
  // Private Result Builder
  // ========================================================================

  private buildResult(
    executionId: string,
    startedAt: string,
    startMs: number,
    opts: {
      status: AgentResult["status"];
      data: TrendResearcherOutput | null;
      error: string | null;
      errorDetails: Record<string, unknown> | null;
    },
  ): AgentResult<TrendResearcherOutput> {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    return {
      executionId,
      agentId: this.metadata.id as any,
      status: opts.status,
      data: opts.data,
      error: opts.error,
      errorDetails: opts.errorDetails,
      validation: null,
      performance: {
        startedAt,
        completedAt,
        durationMs,
        retryCount: 0,
      },
      meta: {},
    };
  }

  // ========================================================================
  // Stub Generators — Replaced by LLM calls in production
  // ========================================================================

  private generateTrendReport(
    industry: string,
    sources: string[],
    timeHorizon: string,
    geography?: string,
    hypotheses?: string[],
  ): string {
    return `
# Trend Research Report: ${industry}

## Executive Summary
Comprehensive trend analysis for the ${industry} industry covering ${geography ?? "global"} markets over a ${timeHorizon}-term horizon.

## Key Signals Identified
- **Signal 1**: Emerging technology adoption accelerating in ${industry}
- **Signal 2**: Consumer behavior shift toward personalization
- **Signal 3**: Regulatory changes creating new market opportunities

## Sources Analyzed
${sources.map((s) => `- ${s}`).join("\n")}

## Hypotheses Assessment
${hypotheses && hypotheses.length > 0
      ? hypotheses.map((h) => `- **${h}**: Partially validated with moderate signal strength`).join("\n")
      : "- No specific hypotheses provided; exploratory analysis conducted"}

## Forecast (${timeHorizon}-term)
- Adoption curve: Early majority expected within ${timeHorizon === "short" ? "3" : timeHorizon === "medium" ? "12" : "24"} months
- Confidence level: 75%
- Key inflection points identified
    `.trim();
  }

  private generateCompetitiveLandscape(
    industry: string,
    competitors: string[],
  ): string {
    const competitorsList = competitors.length > 0
      ? competitors
      : ["Market Leader A", "Challenger B", "Niche Player C"];

    return `
# Competitive Landscape: ${industry}

## Market Overview
${competitorsList.length} key players analyzed in the ${industry} ecosystem.

## Competitive Positioning
${competitorsList.map((c) => `- **${c}**: Established presence, moderate innovation velocity`).join("\n")}

## White-Space Analysis
- **Gap 1**: Underserved segment in ${industry} with high willingness-to-pay
- **Gap 2**: Integration opportunity between adjacent verticals
- **Gap 3**: Emerging regulatory requirement creating new compliance market
    `.trim();
  }

  private generateOpportunityMatrix(
    industry: string,
    _trendReport: string,
    _competitiveLandscape: string,
  ): string {
    return `
# Opportunity Matrix: ${industry}

| Opportunity | Market Size | Signal Strength | Time to Peak | Strategic Fit |
|---|---|---|---|---|
| AI-powered personalization | $2.5B | Strong | 12-18 mo | High |
| Compliance automation | $1.8B | Moderate | 18-24 mo | High |
| Embedded finance integration | $3.2B | Strong | 6-12 mo | Medium |
| Vertical-specific SaaS | $1.2B | Weak | 24-36 mo | Low |

## Prioritized Actions
1. **Immediate** (0-6mo): Validate AI personalization with pilot customers
2. **Short-term** (6-12mo): Build compliance automation MVP
3. **Medium-term** (12-24mo): Explore embedded finance partnerships
    `.trim();
  }

  private generateRecommendations(
    _opportunityMatrix: string,
    _timeHorizon: string,
  ): string[] {
    return [
      "Launch a 4-week signal validation sprint using social listening and patent analysis to confirm top-3 trend hypotheses before committing engineering resources",
      "Establish a competitive monitoring cadence — bi-weekly scans of funding activity, product launches, and hiring patterns across identified competitors",
      "Commission a deep-dive market sizing study on the #1 opportunity (AI-powered personalization) with primary research (50+ customer interviews)",
      "Build a trend-tracking dashboard with automated alerts for the top 10 signals to maintain 3-6 month lead time before mainstream adoption",
      "Schedule a cross-functional opportunity prioritization workshop within 2 weeks to align roadmap decisions with the opportunity matrix",
    ];
  }

  private generateSourceIndex(sources: string[]): TrendResearcherOutput["sourceIndex"] {
    const credibilityMap: Record<string, number> = {
      "google-trends": 0.75,
      "semrush": 0.85,
      "ahrefs": 0.80,
      "crunchbase": 0.70,
      "pitchbook": 0.90,
      "cb-insights": 0.88,
      "statista": 0.80,
      "similarweb": 0.75,
      "patent-db": 0.95,
      "social-listening": 0.60,
      "expert-interviews": 0.85,
      "conference-intelligence": 0.65,
    };

    return sources.map((source, index) => ({
      title: `${source.charAt(0).toUpperCase() + source.slice(1).replace(/-/g, " ")} Analysis`,
      url: `https://research.nexusagent.io/sources/${source}/${index}`,
      credibility: credibilityMap[source] ?? 0.50,
    }));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const trendResearcherAdapter = new TrendResearcherAdapter();
export default trendResearcherAdapter;


