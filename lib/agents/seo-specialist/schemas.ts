// ============================================================================
// Nexus Agent — @seo-specialist: JSON Schemas
// ============================================================================
// JSON Schema (draft-07) definitions for the SEO specialist agent input and
// output. Used for runtime validation, tool-calling UIs, and LLM function
// calling.
// ============================================================================

import type { JsonSchema } from "../types";

/**
 * JSON Schema for the @seo-specialist agent input.
 */
export const SEO_SPECIALIST_INPUT_SCHEMA: JsonSchema = {
  type: "object",
  description: "Input payload for the SEO specialist agent.",
  properties: {
    url: {
      type: "string",
      description: "The URL or content identifier being analyzed.",
    },
    pageContent: {
      type: "string",
      description: "Full extracted page content (markdown or stripped HTML).",
      minLength: 50,
    },
    targetKeywords: {
      type: "array",
      description: "Target keywords for the page or topic cluster.",
      items: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "The target keyword phrase.",
            minLength: 1,
          },
          searchVolume: {
            type: "number",
            description: "Monthly search volume.",
            minimum: 0,
          },
          keywordDifficulty: {
            type: "number",
            description: "Keyword difficulty score (0–100).",
            minimum: 0,
            maximum: 100,
          },
          intent: {
            type: "string",
            enum: ["informational", "commercial", "transactional", "navigational"],
            description: "Search intent classification.",
          },
          currentPosition: {
            type: "number",
            description: "Current SERP position (null if not ranking).",
          },
          serpFeatures: {
            type: "array",
            description: "SERP features present for this keyword.",
            items: {
              type: "string",
              enum: [
                "featured_snippet",
                "people_also_ask",
                "knowledge_panel",
                "local_pack",
                "video_carousel",
                "image_pack",
                "site_links",
                "review_stars",
                "faq_rich_result",
                "how_to_rich_result",
              ],
            },
          },
        },
        required: ["keyword", "searchVolume", "keywordDifficulty", "intent"],
      },
      minItems: 1,
    },
    currentRankings: {
      type: "array",
      description: "Current SERP ranking data for tracked keywords.",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          position: { type: "number", minimum: 1, maximum: 100 },
          url: { type: "string" },
          clicks: { type: "number", minimum: 0 },
          impressions: { type: "number", minimum: 0 },
          ctr: { type: "number", minimum: 0, maximum: 1 },
          date: { type: "string" },
        },
        required: ["keyword", "position", "url", "clicks", "impressions", "ctr", "date"],
      },
    },
    technicalMetrics: {
      type: "object",
      description: "Technical SEO metrics from crawl / audit tools.",
      properties: {
        coreWebVitals: {
          type: "object",
          properties: {
            lcpMobile: { type: "number", description: "LCP on mobile (seconds)" },
            lcpDesktop: { type: "number", description: "LCP on desktop (seconds)" },
            inpMobile: { type: "number", description: "INP on mobile (ms)" },
            inpDesktop: { type: "number", description: "INP on desktop (ms)" },
            clsMobile: { type: "number", description: "CLS on mobile" },
            clsDesktop: { type: "number", description: "CLS on desktop" },
            lcpPass: { type: "boolean", description: "LCP passes good threshold (<2.5s)" },
            inpPass: { type: "boolean", description: "INP passes good threshold (<200ms)" },
            clsPass: { type: "boolean", description: "CLS passes good threshold (<0.1)" },
          },
        },
        crawlStats: {
          type: "object",
          properties: {
            totalPages: { type: "number", minimum: 0 },
            pagesCrawledPerDay: { type: "number", minimum: 0 },
            crawlWastePercentage: { type: "number", minimum: 0, maximum: 100 },
            orphanedPages: { type: "number", minimum: 0 },
            redirectChains: { type: "number", minimum: 0 },
            fourOhFourInSitemap: { type: "number", minimum: 0 },
          },
        },
        indexation: {
          type: "object",
          properties: {
            submittedInSitemap: { type: "number", minimum: 0 },
            indexed: { type: "number", minimum: 0 },
            indexCoverageRatio: { type: "number", minimum: 0, maximum: 1 },
            excludedCount: { type: "number", minimum: 0 },
            errorsCount: { type: "number", minimum: 0 },
          },
        },
        lighthouse: {
          type: "object",
          properties: {
            performanceScore: { type: "number", minimum: 0, maximum: 100 },
            seoScore: { type: "number", minimum: 0, maximum: 100 },
            accessibilityScore: { type: "number", minimum: 0, maximum: 100 },
          },
        },
        structuredData: {
          type: "object",
          properties: {
            typesPresent: { type: "array", items: { type: "string" } },
            validationErrors: { type: "number", minimum: 0 },
            missingOpportunities: { type: "array", items: { type: "string" } },
          },
        },
        security: {
          type: "object",
          properties: {
            https: { type: "boolean" },
            mixedContentWarnings: { type: "number", minimum: 0 },
          },
        },
        mobile: {
          type: "object",
          properties: {
            mobileFriendly: { type: "boolean" },
            viewportConfigured: { type: "boolean" },
            touchTargetsAdequate: { type: "boolean" },
            fontLegible: { type: "boolean" },
          },
        },
        internalLinksCount: { type: "number", minimum: 0 },
        externalLinksCount: { type: "number", minimum: 0 },
        blockedFromIndex: { type: "boolean" },
      },
    },
    competitorAnalysis: {
      type: "object",
      description: "Competitor SERP analysis data.",
      properties: {
        competitors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              title: { type: "string" },
              domainAuthority: { type: "number" },
              wordCount: { type: "number", minimum: 0 },
              estimatedTraffic: { type: "number", minimum: 0 },
              backlinksCount: { type: "number", minimum: 0 },
              referringDomains: { type: "number", minimum: 0 },
              contentQualityScore: { type: "number", minimum: 1, maximum: 10 },
            },
            required: ["url", "title"],
          },
        },
        keywordGaps: { type: "array", items: { type: "string" } },
      },
    },
    contentBrief: {
      type: "string",
      description: "Content brief / editorial guidelines.",
    },
    mode: {
      type: "string",
      enum: ["audit", "optimize", "brief-review"],
      description: "Run mode for the agent.",
    },
  },
  required: ["pageContent", "targetKeywords", "mode"],
};

/**
 * JSON Schema for the @seo-specialist agent output.
 */
export const SEO_SPECIALIST_OUTPUT_SCHEMA: JsonSchema = {
  type: "object",
  description: "Structured output from the SEO specialist agent.",
  properties: {
    timestamp: { type: "string", description: "ISO-8601 timestamp of the output." },
    sourceAgent: { type: "string", description: "Agent that produced this output." },
    traceId: { type: "string", description: "Correlation ID for tracing." },
    status: {
      type: "string",
      enum: ["pending", "running", "completed", "failed", "rejected_validation"],
    },
    summary: { type: "string", description: "Human-readable summary of findings." },
    recommendations: {
      type: "array",
      description: "Prioritized SEO recommendations.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          category: {
            type: "string",
            enum: [
              "content", "technical", "on_page", "off_page",
              "structured_data", "performance", "internal_linking", "keyword_strategy",
            ],
          },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          description: { type: "string" },
          expectedImpact: { type: "string" },
          implementationEffort: { type: "string", enum: ["low", "medium", "high"] },
          estimatedTimeToImpact: { type: "string" },
          relevantKeywords: { type: "array", items: { type: "string" } },
        },
        required: ["id", "category", "priority", "title", "description"],
      },
    },
    contentOptimizations: {
      type: "array",
      description: "Content-specific optimization suggestions.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "title_tag", "meta_description", "heading_structure",
              "keyword_integration", "content_gap", "readability",
              "internal_linking", "structured_data", "image_optimization", "word_count",
            ],
          },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          currentValue: { type: "string" },
          suggestedValue: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["id", "type", "priority", "currentValue", "suggestedValue", "rationale"],
      },
    },
    technicalFixes: {
      type: "array",
      description: "Technical issues found, sorted by severity.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          category: { type: "string" },
          issue: { type: "string" },
          currentValue: { type: ["string", "number", "boolean"] },
          expectedValue: { type: ["string", "number", "boolean"] },
          fixInstructions: { type: "string" },
          relevantUrls: { type: "array", items: { type: "string" } },
        },
        required: ["id", "severity", "issue", "fixInstructions"],
      },
    },
    keywordGapAnalysis: {
      type: "array",
      description: "Keywords the site is missing vs competitors.",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          searchVolume: { type: "number" },
          keywordDifficulty: { type: "number" },
          intent: { type: "string" },
          competitorUrls: { type: "array", items: { type: "string" } },
          opportunityScore: { type: "number", minimum: 0, maximum: 100 },
          recommendation: {
            type: "string",
            enum: ["create_page", "optimize_existing", "target_in_content"],
          },
        },
        required: ["keyword", "searchVolume", "keywordDifficulty", "intent", "recommendation"],
      },
    },
    linkOpportunities: {
      type: "array",
      description: "Link building opportunities.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "digital_pr", "broken_link", "unlinked_mention",
              "resource_page", "guest_post", "competitor_gap",
            ],
          },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          targetUrl: { type: "string" },
          anchorTextSuggestion: { type: "string" },
          rationale: { type: "string" },
          estimatedDifficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
          prospectUrl: { type: "string" },
        },
        required: ["id", "type", "priority", "targetUrl", "rationale"],
      },
    },
    serpFeatureOpportunities: {
      type: "array",
      description: "SERP feature capture opportunities.",
      items: {
        type: "object",
        properties: {
          featureType: { type: "string" },
          keyword: { type: "string" },
          currentOwner: { type: "string" },
          captureStrategy: { type: "string" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["featureType", "keyword", "captureStrategy"],
      },
    },
    overallSeoScore: {
      type: "number",
      description: "Overall SEO health score (0–100).",
      minimum: 0,
      maximum: 100,
    },
  },
  required: [
    "timestamp",
    "sourceAgent",
    "traceId",
    "status",
    "summary",
    "recommendations",
    "contentOptimizations",
    "technicalFixes",
    "keywordGapAnalysis",
    "linkOpportunities",
    "serpFeatureOpportunities",
    "overallSeoScore",
  ],
};
