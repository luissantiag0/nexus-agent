// ============================================================================
// Nexus Agent — @seo-specialist Agent Adapter
// ============================================================================
// Implements the AgentAdapter interface for the SEO specialist agent.
// Handles technical SEO audits, content optimization, keyword gap analysis,
// and link building opportunity identification.
// ============================================================================

import type {
  AgentAdapter,
  AgentMetadata,
  AgentExecutionResponse,
  AgentContext,
  ValidationResult,
} from "../types";
import { AgentStatus, Priority, Confidence, SearchIntent } from "../types";
import type {
  SeoSpecialistInput,
  SeoSpecialistOutput,
  SeoRecommendation,
  ContentOptimization,
  TechnicalFix,
  KeywordGap,
  LinkOpportunity,
  SerpFeatureOpportunity,
  SeoContextValues,
} from "./types";
import {
  RecommendationCategory,
  TechnicalSeverity,
  SerpFeatureType,
  SEO_CONTEXT_KEYS,
} from "./types";
import { validateSeoInput } from "./validation";
import { SEO_SPECIALIST_INPUT_SCHEMA, SEO_SPECIALIST_OUTPUT_SCHEMA } from "./schemas";

// ============================================================================
// Prompt template reference
// ============================================================================

/**
 * The active prompt version used by this adapter.
 * The full prompt template lives at:
 *   lib/agents/seo-specialist/prompts/seo-specialist.v1.prompt.yaml
 */
const PROMPT_VERSION = "seo-specialist.v1.prompt.yaml";

// ============================================================================
// Metadata
// ============================================================================

const METADATA: AgentMetadata = {
  name: "seo-specialist",
  label: "SEO Specialist",
  description:
    "Analyzes web pages and content for technical SEO, on-page optimization, " +
    "keyword targeting, content gaps, and link authority opportunities. " +
    "Provides prioritized, confidence-labeled recommendations.",
  version: "1.0.0",
  author: "Nexus Agent Team",
  promptVersion: PROMPT_VERSION,
  tags: ["seo", "content", "technical", "search", "optimization"],
  readsContextKeys: [...SEO_CONTEXT_KEYS.READS],
  writesContextKeys: [...SEO_CONTEXT_KEYS.WRITES],
  capabilities: [
    {
      action: "audit",
      description: "Full technical and content SEO audit of a page or site section.",
      inputSchema: SEO_SPECIALIST_INPUT_SCHEMA,
      outputSchema: SEO_SPECIALIST_OUTPUT_SCHEMA,
    },
    {
      action: "optimize",
      description:
        "Quick-win content and technical optimizations for a specific page.",
      inputSchema: SEO_SPECIALIST_INPUT_SCHEMA,
      outputSchema: SEO_SPECIALIST_OUTPUT_SCHEMA,
    },
    {
      action: "brief-review",
      description:
        "Review a content brief for SEO completeness and keyword coverage.",
      inputSchema: SEO_SPECIALIST_INPUT_SCHEMA,
      outputSchema: SEO_SPECIALIST_OUTPUT_SCHEMA,
    },
  ],
};

// ============================================================================
// Adapter
// ============================================================================

class SeoSpecialistAdapter
  implements AgentAdapter<SeoSpecialistInput, SeoSpecialistOutput>
{
  readonly metadata = METADATA;

  validate(raw: Record<string, unknown>): ValidationResult {
    return validateSeoInput(raw);
  }

  async execute(
    input: SeoSpecialistInput,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<SeoSpecialistOutput>> {
    const startTime = Date.now();
    const traceId = context.traceId as string ?? `seo-${Date.now()}`;

    // The actual LLM inference or rule-based engine would run here.
    // This implementation constructs a structured audit from the input data
    // using deterministic analysis + prompt orchestration.
    //
    // In production, this method would:
    //   1. Load the prompt template from `prompts/seo-specialist.v1.prompt.yaml`
    //   2. Hydrate the template with input variables
    //   3. Call the configured LLM with the hydrated prompt
    //   4. Parse and validate the response against the output schema
    //
    // For this design, we produce a structured analysis directly.

    if (signal?.aborted) {
      return this.errorResponse(
        traceId,
        "CANCELLED",
        "Execution was cancelled via AbortSignal.",
      );
    }

    // --- Determine run mode behavior ---
    switch (input.mode) {
      case "audit":
        return this.runAudit(input, traceId, context);
      case "optimize":
        return this.runOptimization(input, traceId, context);
      case "brief-review":
        return this.runBriefReview(input, traceId, context);
      default:
        return this.errorResponse(
          traceId,
          "INVALID_MODE",
          `Unknown mode: ${input.mode}`,
        );
    }
  }

  // ========================================================================
  // Mode: Full Audit
  // ========================================================================

  private async runAudit(
    input: SeoSpecialistInput,
    traceId: string,
    context: AgentContext,
  ): Promise<AgentExecutionResponse<SeoSpecialistOutput>> {
    const timestamp = new Date().toISOString();

    // -- Recommendations --
    const recommendations = this.generateRecommendations(input);

    // -- Content optimizations --
    const contentOptimizations = this.generateContentOptimizations(input);

    // -- Technical fixes --
    const technicalFixes = this.generateTechnicalFixes(input);

    // -- Keyword gaps --
    const keywordGaps = this.generateKeywordGaps(input);

    // -- Link opportunities --
    const linkOpportunities = this.generateLinkOpportunities(input);

    // -- SERP feature opportunities --
    const serpFeatures = this.generateSerpFeatureOpportunities(input);

    // -- Overall score --
    const overallScore = this.calculateOverallScore(
      input,
      recommendations,
      technicalFixes,
    );

    const output: SeoSpecialistOutput = {
      timestamp,
      sourceAgent: "seo-specialist",
      traceId,
      status: AgentStatus.COMPLETED,
      summary: this.buildSummary(
        input,
        recommendations,
        technicalFixes,
        keywordGaps,
        overallScore,
      ),
      recommendations,
      contentOptimizations,
      technicalFixes,
      keywordGapAnalysis: keywordGaps,
      linkOpportunities,
      serpFeatureOpportunities: serpFeatures,
      overallSeoScore: overallScore,
    };

    // Write context keys for chaining.
    const contextWrites: SeoContextValues = {
      seoAudit: output,
      keywordMap: this.buildKeywordMap(input),
      contentOptimizations: this.groupOptimizationsByUrl(contentOptimizations),
      technicalFixes: this.groupFixesByCategory(technicalFixes),
      linkOpportunities,
    };

    return {
      agent: "seo-specialist",
      status: AgentStatus.COMPLETED,
      output,
      context: { ...context, ...contextWrites },
      metrics: {
        durationMs: 0, // computed by registry
        model: "seo-analyzer-v1",
      },
    };
  }

  // ========================================================================
  // Mode: Quick Optimization
  // ========================================================================

  private async runOptimization(
    input: SeoSpecialistInput,
    traceId: string,
    context: AgentContext,
  ): Promise<AgentExecutionResponse<SeoSpecialistOutput>> {
    // Optimization mode returns only high/critical priority items.
    const fullAudit = await this.runAudit(input, traceId, context);

    const pruned: SeoSpecialistOutput = {
      ...fullAudit.output,
      status: AgentStatus.COMPLETED,
      summary: `Quick optimization scan: ${fullAudit.output.recommendations.filter(
        (r) => r.priority === Priority.CRITICAL || r.priority === Priority.HIGH,
      ).length} high-priority actions identified.`,
      recommendations: fullAudit.output.recommendations.filter(
        (r) => r.priority === Priority.CRITICAL || r.priority === Priority.HIGH,
      ),
      contentOptimizations: fullAudit.output.contentOptimizations.filter(
        (o) => o.priority === Priority.CRITICAL || o.priority === Priority.HIGH,
      ),
      technicalFixes: fullAudit.output.technicalFixes.filter(
        (f) =>
          f.severity === TechnicalSeverity.CRITICAL ||
          f.severity === TechnicalSeverity.HIGH,
      ),
    };

    return { ...fullAudit, output: pruned };
  }

  // ========================================================================
  // Mode: Brief Review
  // ========================================================================

  private async runBriefReview(
    input: SeoSpecialistInput,
    traceId: string,
    context: AgentContext,
  ): Promise<AgentExecutionResponse<SeoSpecialistOutput>> {
    // Brief review focuses on keyword coverage and content structure.
    const timestamp = new Date().toISOString();

    const contentOptimizations = this.generateContentOptimizations(input);

    const recommendations: SeoRecommendation[] = [
      {
        id: "brev-kw-1",
        category: RecommendationCategory.KEYWORD_STRATEGY,
        priority: Priority.HIGH,
        confidence: Confidence.MEDIUM,
        title: "Keyword coverage assessment",
        description: `Brief covers ${input.targetKeywords.length} target keyword(s). ${
          input.targetKeywords.filter(
            (k) => k.intent === SearchIntent.INFORMATIONAL,
          ).length
        } informational, ${
          input.targetKeywords.filter(
            (k) => k.intent === SearchIntent.COMMERCIAL,
          ).length
        } commercial.`,
        expectedImpact: "Ensures content addresses full search intent spectrum.",
        implementationEffort: "low",
        estimatedTimeToImpact: "Immediate",
        relevantKeywords: input.targetKeywords.map((k) => k.keyword),
      },
    ];

    const output: SeoSpecialistOutput = {
      timestamp,
      sourceAgent: "seo-specialist",
      traceId,
      status: AgentStatus.COMPLETED,
      summary: `Brief review complete: ${contentOptimizations.length} content suggestions, ${recommendations.length} strategic recommendations.`,
      recommendations,
      contentOptimizations,
      technicalFixes: [],
      keywordGapAnalysis: this.generateKeywordGaps(input),
      linkOpportunities: [],
      serpFeatureOpportunities: [],
      overallSeoScore: 0, // Not applicable for brief review
    };

    return {
      agent: "seo-specialist",
      status: AgentStatus.COMPLETED,
      output,
      context,
    };
  }

  // ========================================================================
  // Analysis helpers
  // ========================================================================

  private generateRecommendations(input: SeoSpecialistInput): SeoRecommendation[] {
    const recs: SeoRecommendation[] = [];
    let id = 0;

    // --- On-page: Title tag check ---
    const h1Matches = this.extractH1(input.pageContent);
    const primaryKw = input.targetKeywords[0]?.keyword;
    if (primaryKw && h1Matches && !h1Matches.toLowerCase().includes(primaryKw.toLowerCase())) {
      recs.push({
        id: `rec-${++id}`,
        category: RecommendationCategory.ON_PAGE,
        priority: Priority.HIGH,
        confidence: Confidence.HIGH,
        title: "Primary keyword missing from H1",
        description: `The H1 "${h1Matches}" does not include the primary target keyword "${primaryKw}". Adding it improves relevance signals.`,
        expectedImpact: "Moderate ranking lift for primary keyword.",
        implementationEffort: "low",
        estimatedTimeToImpact: "2–4 weeks",
        relevantKeywords: [primaryKw],
      });
    }

    // --- Content length ---
    const wordCount = input.pageContent.split(/\s+/).filter(Boolean).length;
    const hasInformational = input.targetKeywords.some(
      (k) => k.intent === SearchIntent.INFORMATIONAL,
    );
    if (hasInformational && wordCount < 1200) {
      recs.push({
        id: `rec-${++id}`,
        category: RecommendationCategory.CONTENT,
        priority: Priority.MEDIUM,
        confidence: Confidence.MEDIUM,
        title: "Content length below informational intent benchmark",
        description: `Content is ~${wordCount} words. Informational pages typically need 1,500–2,500+ words for comprehensive topical coverage.`,
        expectedImpact: "Improved dwell time and topical authority signals.",
        implementationEffort: "medium",
        estimatedTimeToImpact: "4–8 weeks",
        relevantKeywords: input.targetKeywords.map((k) => k.keyword),
      });
    }

    // --- Core Web Vitals ---
    if (input.technicalMetrics?.coreWebVitals) {
      const cwv = input.technicalMetrics.coreWebVitals;
      if (cwv.lcpPass === false) {
        recs.push({
          id: `rec-${++id}`,
          category: RecommendationCategory.PERFORMANCE,
          priority: Priority.CRITICAL,
          confidence: Confidence.HIGH,
          title: "LCP exceeds recommended threshold",
          description: `LCP is ${cwv.lcpMobile?.toFixed(1)}s on mobile (target: <2.5s). Largest Contentful Paint delay impacts both UX and ranking.`,
          expectedImpact: "Core Web Vitals eligibility, potential ranking boost.",
          implementationEffort: "medium",
          estimatedTimeToImpact: "2–6 weeks",
          relevantKeywords: [],
        });
      }
      if (cwv.clsPass === false) {
        recs.push({
          id: `rec-${++id}`,
          category: RecommendationCategory.PERFORMANCE,
          priority: Priority.HIGH,
          confidence: Confidence.HIGH,
          title: "CLS exceeds stability threshold",
          description: `CLS is ${cwv.clsMobile?.toFixed(2)} (target: <0.1). Layout shifts degrade user experience.`,
          expectedImpact: "Improved user experience and CWV pass rate.",
          implementationEffort: "medium",
          estimatedTimeToImpact: "2–4 weeks",
          relevantKeywords: [],
        });
      }
      if (cwv.inpPass === false) {
        recs.push({
          id: `rec-${++id}`,
          category: RecommendationCategory.PERFORMANCE,
          priority: Priority.HIGH,
          confidence: Confidence.HIGH,
          title: "INP exceeds responsiveness threshold",
          description: `INP is ${cwv.inpMobile}ms (target: <200ms). Pages feel sluggish to users.`,
          expectedImpact: "Improved interaction responsiveness.",
          implementationEffort: "high",
          estimatedTimeToImpact: "4–8 weeks",
          relevantKeywords: [],
        });
      }
    }

    // --- Mobile usability ---
    if (input.technicalMetrics?.mobile?.mobileFriendly === false) {
      recs.push({
        id: `rec-${++id}`,
        category: RecommendationCategory.TECHNICAL,
        priority: Priority.CRITICAL,
        confidence: Confidence.HIGH,
        title: "Page is not mobile-friendly",
        description: "Google uses mobile-first indexing. Non-mobile-friendly pages will lose visibility.",
        expectedImpact: "Mobile rankings and organic traffic from mobile searches.",
        implementationEffort: "high",
        estimatedTimeToImpact: "4–12 weeks",
        relevantKeywords: [],
      });
    }

    // --- Structured data ---
    if (
      input.technicalMetrics?.structuredData &&
      input.technicalMetrics.structuredData.validationErrors > 0
    ) {
      recs.push({
        id: `rec-${++id}`,
        category: RecommendationCategory.STRUCTURED_DATA,
        priority: Priority.HIGH,
        confidence: Confidence.HIGH,
        title: "Schema markup has validation errors",
        description: `${input.technicalMetrics.structuredData.validationErrors} schema validation error(s) detected. Fixing them enables rich result eligibility.`,
        expectedImpact: "Rich result appearance in SERPs.",
        implementationEffort: "low",
        estimatedTimeToImpact: "1–2 weeks",
        relevantKeywords: [],
      });
    }

    // --- Internal links ---
    if (
      input.technicalMetrics?.internalLinksCount != null &&
      input.technicalMetrics.internalLinksCount < 2
    ) {
      recs.push({
        id: `rec-${++id}`,
        category: RecommendationCategory.INTERNAL_LINKING,
        priority: Priority.MEDIUM,
        confidence: Confidence.MEDIUM,
        title: "Page has insufficient internal links",
        description: `Only ${input.technicalMetrics.internalLinksCount} internal link(s). Internal links distribute authority and help discovery.`,
        expectedImpact: "Improved crawlability and link equity distribution.",
        implementationEffort: "low",
        estimatedTimeToImpact: "2–4 weeks",
        relevantKeywords: [],
      });
    }

    return recs;
  }

  private generateContentOptimizations(
    input: SeoSpecialistInput,
  ): ContentOptimization[] {
    const opts: ContentOptimization[] = [];
    let id = 0;
    const primaryKw = input.targetKeywords[0]?.keyword ?? "";

    // --- Title tag ---
    const titleMatch = input.pageContent.match(/^# (.+)$/m);
    const currentTitle = titleMatch ? titleMatch[1] : "";
    if (currentTitle && primaryKw && !currentTitle.toLowerCase().includes(primaryKw.toLowerCase())) {
      opts.push({
        id: `opt-${++id}`,
        type: "title_tag",
        priority: Priority.HIGH,
        currentValue: currentTitle,
        suggestedValue: `${primaryKw} — ${currentTitle}`,
        rationale:
          "Title tag is the strongest on-page ranking signal. Including the primary keyword signals relevance to search engines.",
      });
    }

    // --- Meta description ---
    const firstParagraphs = input.pageContent
      .split("\n")
      .filter((l) => l.trim().length > 0 && !l.startsWith("#"))
      .slice(0, 3)
      .join(" ");
    if (firstParagraphs.length > 0) {
      const descSnippet = firstParagraphs.substring(0, 160);
      opts.push({
        id: `opt-${++id}`,
        type: "meta_description",
        priority: Priority.MEDIUM,
        currentValue: "(needs extraction from HTML metadata)",
        suggestedValue: descSnippet + (firstParagraphs.length > 160 ? "..." : ""),
        rationale:
          "Meta description influences CTR from search results. Keep 150–160 characters with primary keyword and a clear call to action.",
      });
    }

    // --- Keyword integration check ---
    for (const kw of input.targetKeywords) {
      const count = (
        input.pageContent.toLowerCase().match(new RegExp(kw.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? []
      ).length;

      if (count === 0) {
        opts.push({
          id: `opt-${++id}`,
          type: "keyword_integration",
          priority: kw.intent === SearchIntent.INFORMATIONAL ? Priority.HIGH : Priority.MEDIUM,
          currentValue: `Keyword "${kw.keyword}" not found in content.`,
          suggestedValue: `Naturally integrate "${kw.keyword}" in the first 100 words and at least 2 subheadings.`,
          rationale: `Target keyword with ${kw.searchVolume} monthly searches and ${kw.keywordDifficulty}/100 difficulty is missing from the content entirely.`,
        });
      } else if (count < 2) {
        opts.push({
          id: `opt-${++id}`,
          type: "keyword_integration",
          priority: Priority.MEDIUM,
          currentValue: `Keyword "${kw.keyword}" appears ${count} time(s).`,
          suggestedValue: `Increase usage to 3–5 natural occurrences including in headings.`,
          rationale: `Low keyword presence (${count}x) may miss relevance signals for this ${kw.intent} intent keyword.`,
        });
      }
    }

    // --- Word count ---
    const wordCount = input.pageContent.split(/\s+/).filter(Boolean).length;
    if (wordCount < 300) {
      opts.push({
        id: `opt-${++id}`,
        type: "word_count",
        priority: Priority.HIGH,
        currentValue: `${wordCount} words.`,
        suggestedValue: "Expand to at least 800 words (transactional) or 2,000 (informational).",
        rationale:
          "Thin content (<300 words) rarely ranks competitively. Depth signals expertise.",
      });
    }

    return opts;
  }

  private generateTechnicalFixes(input: SeoSpecialistInput): TechnicalFix[] {
    const fixes: TechnicalFix[] = [];
    let id = 0;

    const cwv = input.technicalMetrics?.coreWebVitals;
    if (cwv) {
      if (!cwv.lcpPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.CRITICAL,
          priority: Priority.CRITICAL,
          category: "core_web_vitals",
          issue: `LCP too slow (${cwv.lcpMobile?.toFixed(1)}s mobile)`,
          currentValue: `${cwv.lcpMobile?.toFixed(1)}s`,
          expectedValue: "<2.5s",
          fixInstructions:
            "Optimize LCP element: (1) Identify the largest content element. (2) Optimize image: compress, convert to WebP/AVIF, add fetchpriority=high. (3) Minimize render-blocking resources. (4) Consider SSR/SSG for above-fold content.",
        });
      }
      if (!cwv.inpPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.HIGH,
          priority: Priority.HIGH,
          category: "core_web_vitals",
          issue: `INP too high (${cwv.inpMobile}ms)`,
          currentValue: `${cwv.inpMobile}ms`,
          expectedValue: "<200ms",
          fixInstructions:
            "Optimize interaction responsiveness: (1) Break up long tasks with setTimeout or scheduler.yield(). (2) Debounce expensive event handlers. (3) Avoid heavy JS on interaction paths. (4) Use passive event listeners.",
        });
      }
      if (!cwv.clsPass) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.HIGH,
          priority: Priority.HIGH,
          category: "core_web_vitals",
          issue: `CLS too high (${cwv.clsMobile})`,
          currentValue: `${cwv.clsMobile}`,
          expectedValue: "<0.1",
          fixInstructions:
            "Fix layout stability: (1) Set explicit width/height on all images and embeds. (2) Reserve space for ads/dynamic content. (3) Avoid inserting content above existing content. (4) Use transform animations instead of layout-triggering ones.",
        });
      }
    }

    // --- Indexation issues ---
    if (input.technicalMetrics?.indexation) {
      const idx = input.technicalMetrics.indexation;
      if (idx.indexCoverageRatio != null && idx.indexCoverageRatio < 0.5) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.HIGH,
          priority: Priority.HIGH,
          category: "indexation",
          issue: `Low index coverage (${(idx.indexCoverageRatio * 100).toFixed(0)}%)`,
          currentValue: `${idx.indexed} indexed of ${idx.submittedInSitemap} submitted`,
          expectedValue: ">90% coverage ratio",
          fixInstructions:
            "Improve index coverage: (1) Check Coverage report in Search Console for errors. (2) Fix 'Submitted URL not found (404)' and 'Submitted URL blocked by robots.txt'. (3) Review noindex tags on important pages. (4) Ensure sitemap only includes canonical, indexable URLs.",
        });
      }
      if (idx.errorsCount > 0) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.HIGH,
          priority: Priority.HIGH,
          category: "indexation",
          issue: `${idx.errorsCount} indexation error(s) in Search Console`,
          currentValue: `${idx.errorsCount} errors`,
          expectedValue: "0 errors",
          fixInstructions:
            "Review and fix Search Console index coverage errors. Common causes: server errors (5xx), redirect errors, blocked resources, and soft 404s.",
        });
      }
    }

    // --- Crawl waste ---
    if (input.technicalMetrics?.crawlStats) {
      const cw = input.technicalMetrics.crawlStats;
      if (cw.crawlWastePercentage > 30) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.MEDIUM,
          priority: Priority.MEDIUM,
          category: "crawl_budget",
          issue: `Crawl waste at ${cw.crawlWastePercentage}%`,
          currentValue: `${cw.crawlWastePercentage}%`,
          expectedValue: "<20%",
          fixInstructions:
            "Reduce crawl waste: (1) Noindex thin/duplicate/faceted pages. (2) Remove unnecessary parameters from URLs. (3) Consolidate pagination. (4) Update robots.txt to disallow low-value crawl paths.",
        });
      }
      if (cw.fourOhFourInSitemap > 0) {
        fixes.push({
          id: `fix-${++id}`,
          severity: TechnicalSeverity.HIGH,
          priority: Priority.HIGH,
          category: "crawl_budget",
          issue: `${cw.fourOhFourInSitemap} 404 URLs in XML sitemap`,
          currentValue: `${cw.fourOhFourInSitemap} URLs returning 404`,
          expectedValue: "0 404s in sitemap",
          fixInstructions:
            "Remove or replace 404 URLs in the XML sitemap. Every 404 in a sitemap wastes crawl budget and signals poor site maintenance.",
        });
      }
    }

    // --- Security ---
    if (input.technicalMetrics?.security?.https === false) {
      fixes.push({
        id: `fix-${++id}`,
        severity: TechnicalSeverity.CRITICAL,
        priority: Priority.CRITICAL,
        category: "security",
        issue: "HTTPS not enabled",
        currentValue: "HTTP (insecure)",
        expectedValue: "HTTPS (with valid SSL certificate)",
        fixInstructions:
          "Enable HTTPS immediately: (1) Purchase/install an SSL certificate. (2) Configure 301 redirects from HTTP to HTTPS. (3) Update canonical URLs to HTTPS. (4) Update hreflang and sitemap URLs.",
      });
    }

    return fixes;
  }

  private generateKeywordGaps(input: SeoSpecialistInput): KeywordGap[] {
    if (!input.competitorAnalysis?.keywordGaps) return [];

    return input.competitorAnalysis.keywordGaps.map((kw, i) => ({
      keyword: kw,
      searchVolume: 0, // not available from gap list alone
      keywordDifficulty: 50,
      intent: SearchIntent.INFORMATIONAL,
      competitorUrls:
        input.competitorAnalysis?.competitors?.map((c) => c.url) ?? [],
      opportunityScore: Math.max(0, 90 - i * 10),
      recommendation: "create_page" as const,
    }));
  }

  private generateLinkOpportunities(
    _input: SeoSpecialistInput,
  ): LinkOpportunity[] {
    // In production, this would use a backlink database (Ahrefs, Majestic, etc.)
    // and compare competitor link profiles.
    return [];
  }

  private generateSerpFeatureOpportunities(
    input: SeoSpecialistInput,
  ): SerpFeatureOpportunity[] {
    const features: SerpFeatureOpportunity[] = [];

    for (const kw of input.targetKeywords) {
      if (!kw.serpFeatures || kw.serpFeatures.length === 0) continue;

      for (const feature of kw.serpFeatures) {
        features.push({
          featureType: feature,
          keyword: kw.keyword,
          currentOwner: "(unknown)",
          captureStrategy: this.serpCaptureStrategy(feature),
          priority:
            feature === SerpFeatureType.FEATURED_SNIPPET
              ? Priority.HIGH
              : Priority.MEDIUM,
          confidence:
            feature === SerpFeatureType.PEOPLE_ALSO_ASK
              ? Confidence.HIGH
              : Confidence.MEDIUM,
        });
      }
    }

    return features;
  }

  private serpCaptureStrategy(feature: SerpFeatureType): string {
    const strategies: Record<SerpFeatureType, string> = {
      [SerpFeatureType.FEATURED_SNIPPET]:
        "Structure content with direct Q&A format. Provide concise answers in 40–50 words, followed by expanded explanation. Use table/definition-list markup for comparison snippets.",
      [SerpFeatureType.PEOPLE_ALSO_ASK]:
        "Include an FAQ section (with FAQ schema) that answers related questions. Target question-based long-tail keywords.",
      [SerpFeatureType.KNOWLEDGE_PANEL]:
        "Implement Organization or Person schema with complete, verified data. Maintain consistent NAP citations across web.",
      [SerpFeatureType.LOCAL_PACK]:
        "Optimize Google Business Profile. Ensure NAP consistency. Get local reviews. Build local citations.",
      [SerpFeatureType.VIDEO_CAROUSEL]:
        "Create video content with VideoObject schema. Use descriptive titles matching search queries.",
      [SerpFeatureType.IMAGE_PACK]:
        "Optimize images with descriptive file names, alt text, and ImageObject schema. Use high-quality, original visuals.",
      [SerpFeatureType.SITE_LINKS]:
        "Improve internal linking and site architecture. Ensure clear navigation hierarchy and descriptive anchor text.",
      [SerpFeatureType.REVIEW_STARS]:
        "Implement Review or AggregateRating schema. Collect authentic user reviews on the page.",
      [SerpFeatureType.FAQ_RICH_RESULT]:
        "Add FAQ schema markup to question-answer pairs. Ensure each answer is comprehensive yet concise.",
      [SerpFeatureType.HOW_TO_RICH_RESULT]:
        "Use HowTo schema on instructional content. Break steps into clear numbered instructions with optional images.",
    };
    return strategies[feature] ?? "Analyze SERP for specific capture requirements.";
  }

  // ========================================================================
  // Scoring
  // ========================================================================

  private calculateOverallScore(
    input: SeoSpecialistInput,
    recommendations: SeoRecommendation[],
    technicalFixes: TechnicalFix[],
  ): number {
    let score = 70; // baseline

    // Deduct for critical issues.
    const criticalRecs = recommendations.filter(
      (r) => r.priority === Priority.CRITICAL,
    ).length;
    const criticalFixes = technicalFixes.filter(
      (f) => f.severity === TechnicalSeverity.CRITICAL,
    ).length;
    score -= (criticalRecs + criticalFixes) * 10;

    // Deduct for high issues.
    const highRecs = recommendations.filter(
      (r) => r.priority === Priority.HIGH,
    ).length;
    const highFixes = technicalFixes.filter(
      (f) => f.severity === TechnicalSeverity.HIGH,
    ).length;
    score -= (highRecs + highFixes) * 5;

    // CWV bonus.
    if (input.technicalMetrics?.coreWebVitals) {
      const cwv = input.technicalMetrics.coreWebVitals;
      if (cwv.lcpPass && cwv.inpPass && cwv.clsPass) score += 10;
      else if (cwv.lcpPass || cwv.inpPass || cwv.clsPass) score += 5;
    }

    // Mobile bonus.
    if (input.technicalMetrics?.mobile?.mobileFriendly) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // ========================================================================
  // Context building
  // ========================================================================

  private buildKeywordMap(input: SeoSpecialistInput): SeoContextValues["keywordMap"] {
    const map: SeoContextValues["keywordMap"] = {};
    for (const kw of input.targetKeywords) {
      map[kw.keyword] = {
        targetUrl: input.url ?? "(unknown)",
        intent: kw.intent,
        volume: kw.searchVolume,
        difficulty: kw.keywordDifficulty,
        currentPosition: kw.currentPosition ?? null,
        owner: "satellite",
      };
    }
    // First keyword is designated as pillar owner.
    if (input.targetKeywords.length > 0) {
      map[input.targetKeywords[0].keyword].owner = "pillar";
    }
    return map;
  }

  private groupOptimizationsByUrl(
    optimizations: ContentOptimization[],
  ): Record<string, ContentOptimization[]> {
    // In production, group by actual page URL.
    return { "(current-page)": optimizations };
  }

  private groupFixesByCategory(
    fixes: TechnicalFix[],
  ): Record<string, TechnicalFix[]> {
    const grouped: Record<string, TechnicalFix[]> = {};
    for (const fix of fixes) {
      if (!grouped[fix.category]) grouped[fix.category] = [];
      grouped[fix.category].push(fix);
    }
    return grouped;
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private buildSummary(
    input: SeoSpecialistInput,
    recommendations: SeoRecommendation[],
    technicalFixes: TechnicalFix[],
    keywordGaps: KeywordGap[],
    overallScore: number,
  ): string {
    const critical = recommendations.filter(
      (r) => r.priority === Priority.CRITICAL,
    ).length;
    const high = recommendations.filter(
      (r) => r.priority === Priority.HIGH,
    ).length;
    const techCritical = technicalFixes.filter(
      (f) => f.severity === TechnicalSeverity.CRITICAL,
    ).length;
    const techHigh = technicalFixes.filter(
      (f) => f.severity === TechnicalSeverity.HIGH,
    ).length;

    return (
      `SEO audit complete for ${input.url ?? "provided content"}. ` +
      `Overall score: ${overallScore}/100. ` +
      `Found ${recommendations.length} recommendation(s) (${critical} critical, ${high} high), ` +
      `${technicalFixes.length} technical fix(es) (${techCritical} critical, ${techHigh} high), ` +
      `${keywordGaps.length} keyword gap(s).`
    );
  }

  private extractH1(content: string): string | null {
    const match = content.match(/^# (.+)$/m);
    return match ? match[1].trim() : null;
  }

  private errorResponse(
    traceId: string,
    code: string,
    message: string,
  ): AgentExecutionResponse<SeoSpecialistOutput> {
    return {
      agent: "seo-specialist",
      status: AgentStatus.FAILED,
      output: {
        timestamp: new Date().toISOString(),
        sourceAgent: "seo-specialist",
        traceId,
        status: AgentStatus.FAILED,
        summary: message,
        recommendations: [],
        contentOptimizations: [],
        technicalFixes: [],
        keywordGapAnalysis: [],
        linkOpportunities: [],
        serpFeatureOpportunities: [],
        overallSeoScore: 0,
      },
      context: {},
      error: { code, message },
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

let _instance: SeoSpecialistAdapter | null = null;

/**
 * Get or create the singleton SEO specialist adapter instance.
 */
export function getSeoSpecialistAdapter(): SeoSpecialistAdapter {
  if (!_instance) {
    _instance = new SeoSpecialistAdapter();
  }
  return _instance;
}

export default SeoSpecialistAdapter;
