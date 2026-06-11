// ============================================================================
// Nexus Agent Runtime Engine — SEO Specialist Adapter
// Agent: @seo-specialist
// Interface: IAgentAdapter<SeoSpecialistInput, SeoSpecialistOutput>
// ============================================================================
// Performs technical SEO audits, content optimization analysis, keyword gap
// identification, and link opportunity discovery. Designed to slot into the
// AgentRunner system with typed I/O, context key contracts, and validation.
// ============================================================================

// ---------------------------------------------------------------------------
// IAgentAdapter — Core contract for all AgentRunner adapters
// ---------------------------------------------------------------------------

/**
 * Generic adapter interface that every AgentRunner domain agent implements.
 *
 * @typeParam TInput  - The validated input payload shape.
 * @typeParam TOutput - The structured output payload shape.
 */
export interface IAgentAdapter<TInput, TOutput> {
  /** Canonical agent identifier (e.g. "seo-specialist"). */
  readonly agentId: string;

  /** Human-readable label for dashboards and logs. */
  readonly label: string;

  /** Context keys this adapter reads from the shared AgentContext. */
  readonly readsContextKeys: readonly string[];

  /** Context keys this adapter writes into the shared AgentContext. */
  readonly writesContextKeys: readonly string[];

  /**
   * Validate raw input before execution.
   * Returns a list of validation errors; an empty array means valid.
   */
  validate(input: Record<string, unknown>): ValidationError[];

  /**
   * Execute the adapter's core logic.
   *
   * @param input   - Validated domain-specific input.
   * @param context - Shared context bag for cross-agent data flow.
   * @returns       - An AgentResult wrapping the typed output.
   */
  execute(input: TInput, context: Record<string, unknown>): Promise<AgentResult<TOutput>>;
}

// ---------------------------------------------------------------------------
// AgentResult — Wraps execution output with runtime metadata
// ---------------------------------------------------------------------------

export type AgentStatus = "completed" | "failed" | "rejected_validation";

/**
 * Envelope returned by every AgentRunner adapter execution.
 * Contains the typed output plus execution telemetry.
 */
export interface AgentResult<TOutput = unknown> {
  /** Unique execution run identifier (UUID). */
  runId: string;

  /** ISO-8601 timestamp of when execution completed. */
  timestamp: string;

  /** Wall-clock execution duration in milliseconds. */
  durationMs: number;

  /** The structured output payload (null if status === "failed"). */
  output: TOutput | null;

  /** Final execution status. */
  status: AgentStatus;

  /** Human-readable error message (populated on failure). */
  error?: string;
}

// ---------------------------------------------------------------------------
// Validation types
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// SeoMode — Supported execution modes
// ---------------------------------------------------------------------------

export type SeoMode = "audit" | "optimize" | "brief-review";

export const VALID_SEO_MODES: readonly SeoMode[] = ["audit", "optimize", "brief-review"];

// ---------------------------------------------------------------------------
// SeoSpecialistInput — Input schema
// ---------------------------------------------------------------------------

export interface TargetKeyword {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number; // 0–100
  intent: "informational" | "commercial" | "transactional" | "navigational";
  currentPosition?: number | null;
}

export interface CurrentRanking {
  keyword: string;
  position: number;
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  date: string; // ISO-8601
}

export interface TechnicalMetrics {
  coreWebVitals?: {
    lcpMobile: number | null;
    lcpDesktop: number | null;
    inpMobile: number | null;
    inpDesktop: number | null;
    clsMobile: number | null;
    clsDesktop: number | null;
    lcpPass: boolean;
    inpPass: boolean;
    clsPass: boolean;
  };
  crawlStats?: {
    totalPages: number;
    pagesCrawledPerDay: number;
    crawlWastePercentage: number;
    orphanedPages: number;
    redirectChains: number;
    fourOhFourInSitemap: number;
  };
  indexation?: {
    submittedInSitemap: number;
    indexed: number;
    indexCoverageRatio: number;
    excludedCount: number;
    errorsCount: number;
  };
  lighthouse?: {
    performanceScore: number | null;
    seoScore: number | null;
    accessibilityScore: number | null;
  };
  structuredData?: {
    typesPresent: string[];
    validationErrors: number;
    missingOpportunities: string[];
  };
  security?: {
    https: boolean;
    mixedContentWarnings: number;
  };
  mobile?: {
    mobileFriendly: boolean;
    viewportConfigured: boolean;
    touchTargetsAdequate: boolean;
    fontLegible: boolean;
  };
  internalLinksCount?: number;
  externalLinksCount?: number;
  blockedFromIndex?: boolean;
}

export interface CompetitorPage {
  url: string;
  title: string;
  domainAuthority: number;
  wordCount: number;
  estimatedTraffic: number;
  backlinksCount: number;
  referringDomains: number;
  contentQualityScore: number; // 1–10
}

export interface CompetitorAnalysis {
  competitors: CompetitorPage[];
  keywordGaps: string[];
}

/**
 * Input payload for the @seo-specialist adapter.
 */
export interface SeoSpecialistInput {
  /** Full extracted page content (markdown or stripped HTML). */
  pageContent: string;

  /** Target keywords for the page or topic cluster. */
  targetKeywords: TargetKeyword[];

  /** Current SERP ranking data (optional). */
  currentRankings?: CurrentRanking[];

  /** Technical SEO metrics from crawl / audit tools (optional). */
  technicalMetrics?: TechnicalMetrics;

  /** Competitor SERP analysis data (optional). */
  competitorAnalysis?: CompetitorAnalysis;

  /** Content brief / editorial guidelines (optional). */
  contentBrief?: string;

  /** Execution mode. */
  mode: SeoMode;
}

// ---------------------------------------------------------------------------
// SeoSpecialistOutput — Output schema
// ---------------------------------------------------------------------------

export interface SeoRecommendation {
  id: string;
  category: "content" | "technical" | "on_page" | "off_page" | "structured_data" | "performance" | "internal_linking" | "keyword_strategy";
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: "low" | "medium" | "high";
  estimatedTimeToImpact: string;
  relevantKeywords: string[];
}

export interface ContentOptimization {
  id: string;
  type: "title_tag" | "meta_description" | "heading_structure" | "keyword_integration" | "content_gap" | "readability" | "internal_linking" | "structured_data" | "image_optimization" | "word_count";
  priority: "critical" | "high" | "medium" | "low";
  currentValue: string;
  suggestedValue: string;
  rationale: string;
}

export interface TechnicalFix {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  issue: string;
  currentValue: string | number | boolean;
  expectedValue: string | number | boolean;
  fixInstructions: string;
  relevantUrls?: string[];
}

export interface KeywordGap {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  competitorUrls: string[];
  opportunityScore: number; // 0–100
  recommendation: "create_page" | "optimize_existing" | "target_in_content";
}

export interface LinkOpportunity {
  id: string;
  type: "digital_pr" | "broken_link" | "unlinked_mention" | "resource_page" | "guest_post" | "competitor_gap";
  priority: "critical" | "high" | "medium" | "low";
  targetUrl: string;
  anchorTextSuggestion: string;
  rationale: string;
  estimatedDifficulty: "easy" | "moderate" | "hard";
  prospectUrl?: string;
}

/**
 * Structured output from the @seo-specialist adapter.
 */
export interface SeoSpecialistOutput {
  /** Prioritized list of SEO recommendations. */
  recommendations: SeoRecommendation[];

  /** Content-specific optimization suggestions. */
  contentOptimizations: ContentOptimization[];

  /** Technical issues found, sorted by severity. */
  technicalFixes: TechnicalFix[];

  /** Keywords the site is missing vs. competitors. */
  keywordGapAnalysis: KeywordGap[];

  /** Link building opportunities identified. */
  linkOpportunities: LinkOpportunity[];

  /** Overall SEO health score (0–100). */
  overallSeoScore: number;
}

// ---------------------------------------------------------------------------
// SeoSpecialistAdapter — Implementation
// ---------------------------------------------------------------------------

/**
 * SEO Specialist adapter for the AgentRunner system.
 *
 * Context keys READ:  trendReport, trendingTopics, contentGaps
 * Context keys WRITE: keywordMap, seoBrief, topicClusters, searchVolumeData
 */
export class SeoSpecialistAdapter
  implements IAgentAdapter<SeoSpecialistInput, SeoSpecialistOutput>
{
  readonly agentId = "seo-specialist";
  readonly label = "SEO Specialist";

  readonly readsContextKeys = ["trendReport", "trendingTopics", "contentGaps"] as const;
  readonly writesContextKeys = ["keywordMap", "seoBrief", "topicClusters", "searchVolumeData"] as const;

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validate raw input before execution.
   *
   * Checks performed:
   *  - targetKeywords is a non-empty array with non-empty keyword strings
   *  - pageContent is a non-empty string
   *  - mode is one of: "audit", "optimize", "brief-review"
   */
  validate(raw: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = [];

    // -- pageContent --
    if (!raw.pageContent || typeof raw.pageContent !== "string" || raw.pageContent.trim().length === 0) {
      errors.push({
        field: "pageContent",
        message: "pageContent is required and must be a non-empty string.",
        code: "MISSING_PAGE_CONTENT",
      });
    } else if (raw.pageContent.trim().length < 50) {
      errors.push({
        field: "pageContent",
        message: `pageContent is too short (${raw.pageContent.trim().length} chars). Minimum 50 characters required for meaningful analysis.`,
        code: "PAGE_CONTENT_TOO_SHORT",
      });
    }

    // -- targetKeywords --
    if (!raw.targetKeywords || !Array.isArray(raw.targetKeywords)) {
      errors.push({
        field: "targetKeywords",
        message: "targetKeywords is required and must be a non-empty array.",
        code: "MISSING_TARGET_KEYWORDS",
      });
    } else if (raw.targetKeywords.length === 0) {
      errors.push({
        field: "targetKeywords",
        message: "targetKeywords array must contain at least one keyword.",
        code: "EMPTY_KEYWORDS",
      });
    } else {
      const keywordItems = raw.targetKeywords as Record<string, unknown>[];
      for (let i = 0; i < keywordItems.length; i++) {
        const kw = keywordItems[i];
        if (!kw.keyword || typeof kw.keyword !== "string" || kw.keyword.trim() === "") {
          errors.push({
            field: `targetKeywords[${i}].keyword`,
            message: `Keyword at index ${i} has an empty or whitespace-only string.`,
            code: "EMPTY_KEYWORD_STRING",
          });
        }
      }
    }

    // -- mode --
    if (!raw.mode || typeof raw.mode !== "string") {
      errors.push({
        field: "mode",
        message: "mode is required. Must be one of: audit, optimize, brief-review.",
        code: "MISSING_MODE",
      });
    } else {
      const mode = raw.mode as string;
      if (!(VALID_SEO_MODES as readonly string[]).includes(mode)) {
        errors.push({
          field: "mode",
          message: `Invalid mode "${mode}". Must be one of: ${VALID_SEO_MODES.join(", ")}.`,
          code: "INVALID_MODE",
        });
      }
    }

    return errors;
  }

  // ========================================================================
  // Execute
  // ========================================================================

  /**
   * Execute the SEO specialist analysis.
   *
   * Stub implementation — in production this would:
   *   1. Read context keys: trendReport, trendingTopics, contentGaps
   *   2. Perform technical/content/keyword analysis via LLM or rules
   *   3. Write context keys: keywordMap, seoBrief, topicClusters, searchVolumeData
   *   4. Return structured output wrapped in AgentResult
   */
  async execute(
    input: SeoSpecialistInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<SeoSpecialistOutput>> {
    const startedAt = Date.now();

    try {
      // --- Read context dependencies ---
      const _trendReport = context["trendReport"];
      const _trendingTopics = context["trendingTopics"];
      const _contentGaps = context["contentGaps"];

      // --- Deterministic analysis stub ---
      // In production: invoke LLM or rule engine with input + context signals.
      const recommendations = this.buildRecommendations(input);
      const contentOptimizations = this.buildContentOptimizations(input);
      const technicalFixes = this.buildTechnicalFixes(input);
      const keywordGapAnalysis = this.buildKeywordGapAnalysis(input);
      const linkOpportunities = this.buildLinkOpportunities(input);
      const overallSeoScore = this.calculateOverallScore(
        input,
        recommendations,
        technicalFixes,
      );

      const output: SeoSpecialistOutput = {
        recommendations,
        contentOptimizations,
        technicalFixes,
        keywordGapAnalysis,
        linkOpportunities,
        overallSeoScore,
      };

      // --- Write context keys for downstream agents ---
      context["keywordMap"] = this.buildKeywordMap(input);
      context["seoBrief"] = this.buildSeoBrief(output);
      context["topicClusters"] = this.buildTopicClusters(input);
      context["searchVolumeData"] = this.buildSearchVolumeData(input);

      const durationMs = Date.now() - startedAt;

      return {
        runId: this.generateRunId(),
        timestamp: new Date().toISOString(),
        durationMs,
        output,
        status: "completed",
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : "Unknown execution error";

      return {
        runId: this.generateRunId(),
        timestamp: new Date().toISOString(),
        durationMs,
        output: null,
        status: "failed",
        error: message,
      };
    }
  }

  // ========================================================================
  // Analysis helpers (stub implementations)
  // ========================================================================

  private buildRecommendations(input: SeoSpecialistInput): SeoRecommendation[] {
    const recs: SeoRecommendation[] = [];
    let id = 0;

    // Title tag / H1 check
    const h1Match = input.pageContent.match(/^# (.+)$/m);
    const primaryKw = input.targetKeywords[0]?.keyword;
    if (primaryKw && h1Match && !h1Match[1].toLowerCase().includes(primaryKw.toLowerCase())) {
      recs.push({
        id: `rec-${++id}`,
        category: "on_page",
        priority: "high",
        confidence: "high",
        title: "Primary keyword missing from H1",
        description: `The H1 "${h1Match[1]}" does not include the primary target keyword "${primaryKw}".`,
        expectedImpact: "Moderate ranking lift for primary keyword.",
        implementationEffort: "low",
        estimatedTimeToImpact: "2–4 weeks",
        relevantKeywords: [primaryKw],
      });
    }

    // Word count check
    const wordCount = input.pageContent.split(/\s+/).filter(Boolean).length;
    const hasInformational = input.targetKeywords.some(
      (k) => k.intent === "informational",
    );
    if (hasInformational && wordCount < 1200) {
      recs.push({
        id: `rec-${++id}`,
        category: "content",
        priority: "medium",
        confidence: "medium",
        title: "Content length below informational benchmark",
        description: `Content is ~${wordCount} words. Informational pages typically need 1,500–2,500+ words.`,
        expectedImpact: "Improved dwell time and topical authority.",
        implementationEffort: "medium",
        estimatedTimeToImpact: "4–8 weeks",
        relevantKeywords: input.targetKeywords.map((k) => k.keyword),
      });
    }

    return recs;
  }

  private buildContentOptimizations(input: SeoSpecialistInput): ContentOptimization[] {
    const opts: ContentOptimization[] = [];
    let id = 0;

    // Extract likely current title from markdown H1
    const titleMatch = input.pageContent.match(/^# (.+)$/m);
    const currentTitle = titleMatch ? titleMatch[1] : "";
    const primaryKw = input.targetKeywords[0]?.keyword ?? "";

    if (currentTitle && primaryKw && !currentTitle.toLowerCase().includes(primaryKw.toLowerCase())) {
      opts.push({
        id: `opt-${++id}`,
        type: "title_tag",
        priority: "high",
        currentValue: currentTitle,
        suggestedValue: `${primaryKw} — ${currentTitle}`,
        rationale:
          "Title tag is the strongest on-page ranking signal. Including the primary keyword signals relevance to search engines.",
      });
    }

    // Meta description suggestion from first content
    const firstLines = input.pageContent
      .split("\n")
      .filter((l) => l.trim().length > 0 && !l.startsWith("#"))
      .slice(0, 3)
      .join(" ");
    if (firstLines.length > 0) {
      opts.push({
        id: `opt-${++id}`,
        type: "meta_description",
        priority: "medium",
        currentValue: "(needs extraction from HTML metadata)",
        suggestedValue: firstLines.substring(0, 157) + "...",
        rationale:
          "Meta description influences CTR. Keep 150–160 characters with primary keyword and a clear CTA.",
      });
    }

    return opts;
  }

  private buildTechnicalFixes(input: SeoSpecialistInput): TechnicalFix[] {
    const fixes: TechnicalFix[] = [];
    let id = 0;

    const cwv = input.technicalMetrics?.coreWebVitals;
    if (cwv) {
      if (!cwv.lcpPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: "critical",
          priority: "critical",
          category: "core_web_vitals",
          issue: `LCP too slow (${cwv.lcpMobile?.toFixed(1)}s mobile)`,
          currentValue: `${cwv.lcpMobile?.toFixed(1)}s`,
          expectedValue: "<2.5s",
          fixInstructions:
            "Optimize LCP element: compress hero image, convert to WebP/AVIF, add fetchpriority=high, minimize render-blocking resources.",
        });
      }
      if (!cwv.inpPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: "high",
          priority: "high",
          category: "core_web_vitals",
          issue: `INP too high (${cwv.inpMobile}ms)`,
          currentValue: `${cwv.inpMobile}ms`,
          expectedValue: "<200ms",
          fixInstructions:
            "Break up long JS tasks with setTimeout or scheduler.yield(). Debounce event handlers. Avoid heavy JS on interaction paths.",
        });
      }
      if (!cwv.clsPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: "high",
          priority: "high",
          category: "core_web_vitals",
          issue: `CLS too high (${cwv.clsMobile})`,
          currentValue: `${cwv.clsMobile}`,
          expectedValue: "<0.1",
          fixInstructions:
            "Set explicit width/height on all images/embeds. Reserve space for ads. Avoid inserting content above existing content.",
        });
      }
    }

    return fixes;
  }

  private buildKeywordGapAnalysis(input: SeoSpecialistInput): KeywordGap[] {
    if (!input.competitorAnalysis?.keywordGaps) return [];

    return input.competitorAnalysis.keywordGaps.map((kw, i) => ({
      keyword: kw,
      searchVolume: 0,
      keywordDifficulty: 50,
      intent: "informational" as const,
      competitorUrls:
        input.competitorAnalysis?.competitors?.map((c) => c.url) ?? [],
      opportunityScore: Math.max(0, 90 - i * 10),
      recommendation: "create_page" as const,
    }));
  }

  private buildLinkOpportunities(_input: SeoSpecialistInput): LinkOpportunity[] {
    // Stub: in production, use a backlink database to compare competitor profiles.
    return [];
  }

  private calculateOverallScore(
    input: SeoSpecialistInput,
    recommendations: SeoRecommendation[],
    technicalFixes: TechnicalFix[],
  ): number {
    let score = 70;

    const criticalRecs = recommendations.filter((r) => r.priority === "critical").length;
    const criticalFixes = technicalFixes.filter((f) => f.severity === "critical").length;
    score -= (criticalRecs + criticalFixes) * 10;

    const highRecs = recommendations.filter((r) => r.priority === "high").length;
    const highFixes = technicalFixes.filter((f) => f.severity === "high").length;
    score -= (highRecs + highFixes) * 5;

    if (input.technicalMetrics?.coreWebVitals) {
      const cwv = input.technicalMetrics.coreWebVitals;
      if (cwv.lcpPass && cwv.inpPass && cwv.clsPass) score += 10;
      else if (cwv.lcpPass || cwv.inpPass || cwv.clsPass) score += 5;
    }

    if (input.technicalMetrics?.mobile?.mobileFriendly) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // ========================================================================
  // Context write helpers
  // ========================================================================

  private buildKeywordMap(
    input: SeoSpecialistInput,
  ): Record<string, { targetUrl: string; intent: string; volume: number; difficulty: number }> {
    const map: Record<string, { targetUrl: string; intent: string; volume: number; difficulty: number }> = {};
    for (const kw of input.targetKeywords) {
      map[kw.keyword] = {
        targetUrl: "(current-page)",
        intent: kw.intent,
        volume: kw.searchVolume,
        difficulty: kw.keywordDifficulty,
      };
    }
    return map;
  }

  private buildSeoBrief(_output: SeoSpecialistOutput): string {
    return `SEO analysis complete: ${_output.recommendations.length} recommendations, ${_output.technicalFixes.length} technical fixes, score ${_output.overallSeoScore}/100.`;
  }

  private buildTopicClusters(
    input: SeoSpecialistInput,
  ): Array<{ topic: string; keywords: string[] }> {
    // Group keywords by intent as a heuristic for cluster assignment.
    const clusters = new Map<string, string[]>();
    for (const kw of input.targetKeywords) {
      const key = kw.intent;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(kw.keyword);
    }
    return Array.from(clusters.entries()).map(([intent, keywords]) => ({
      topic: `${intent}-cluster`,
      keywords,
    }));
  }

  private buildSearchVolumeData(
    input: SeoSpecialistInput,
  ): Array<{ keyword: string; volume: number; difficulty: number; intent: string }> {
    return input.targetKeywords.map((kw) => ({
      keyword: kw.keyword,
      volume: kw.searchVolume,
      difficulty: kw.keywordDifficulty,
      intent: kw.intent,
    }));
  }

  // ========================================================================
  // Utility
  // ========================================================================

  private generateRunId(): string {
    // Simple unique ID — in production use uuid v4
    return `seo-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}

// ============================================================================
// Singleton export
// ============================================================================

export const seoSpecialistAdapter = new SeoSpecialistAdapter();
export default seoSpecialistAdapter;
