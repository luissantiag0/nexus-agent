// ============================================================================
// Nexus Agent — @seo-specialist Agent: Types & Schemas
// ============================================================================

import type {
  AgentInputBase,
  AgentOutputBase,
  Priority,
  Confidence,
  SearchIntent,
} from "../types";

// ---------------------------------------------------------------------------
// SEO-Specific Enums
// ---------------------------------------------------------------------------

/** Category of an SEO recommendation. */
export enum RecommendationCategory {
  CONTENT = "content",
  TECHNICAL = "technical",
  ON_PAGE = "on_page",
  OFF_PAGE = "off_page",
  STRUCTURED_DATA = "structured_data",
  PERFORMANCE = "performance",
  INTERNAL_LINKING = "internal_linking",
  KEYWORD_STRATEGY = "keyword_strategy",
}

/** Severity/impact level for technical issues. */
export enum TechnicalSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/** Type of SERP feature target. */
export enum SerpFeatureType {
  FEATURED_SNIPPET = "featured_snippet",
  PEOPLE_ALSO_ASK = "people_also_ask",
  KNOWLEDGE_PANEL = "knowledge_panel",
  LOCAL_PACK = "local_pack",
  VIDEO_CAROUSEL = "video_carousel",
  IMAGE_PACK = "image_pack",
  SITE_LINKS = "site_links",
  REVIEW_STARS = "review_stars",
  FAQ_RICH_RESULT = "faq_rich_result",
  HOW_TO_RICH_RESULT = "how_to_rich_result",
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

/**
 * Input schema for the @seo-specialist agent.
 */
export interface SeoSpecialistInput extends AgentInputBase {
  /** The URL or content identifier being analyzed. */
  url?: string;

  /** Full extracted page content (stripped HTML or markdown). */
  pageContent: string;

  /** Target keywords for the page or topic cluster. */
  targetKeywords: TargetKeyword[];

  /** Current SERP ranking data (optional — for optimization runs). */
  currentRankings?: CurrentRanking[];

  /** Technical SEO metrics from crawl / audit tools. */
  technicalMetrics?: TechnicalMetrics;

  /** Competitor SERP analysis data (optional). */
  competitorAnalysis?: CompetitorAnalysis;

  /** Content brief / guidelines to follow (optional). */
  contentBrief?: string;

  /** Run mode: "audit" performs full analysis; "optimize" returns quick wins. */
  mode: "audit" | "optimize" | "brief-review";
}

export interface TargetKeyword {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number; // 0–100
  intent: SearchIntent;
  currentPosition?: number | null;
  serpFeatures?: SerpFeatureType[];
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
  /** Core Web Vitals field data (origin-level). */
  coreWebVitals?: CoreWebVitalsData;

  /** Crawl stats from Search Console or log analysis. */
  crawlStats?: CrawlStats;

  /** Indexation data. */
  indexation?: IndexationData;

  /** Page speed lab data (Lighthouse). */
  lighthouse?: LighthouseData;

  /** Schema markup validation. */
  structuredData?: StructuredDataInfo;

  /** HTTPS / security. */
  security?: SecurityInfo;

  /** Mobile usability. */
  mobile?: MobileData;

  /** Internal link count for the page. */
  internalLinksCount?: number;

  /** External link count for the page. */
  externalLinksCount?: number;

  /** Whether page is blocked by robots.txt or noindex. */
  blockedFromIndex?: boolean;
}

export interface CoreWebVitalsData {
  lcpMobile: number | null;        // seconds
  lcpDesktop: number | null;
  inpMobile: number | null;        // milliseconds
  inpDesktop: number | null;
  clsMobile: number | null;
  clsDesktop: number | null;
  lcpPass: boolean;
  inpPass: boolean;
  clsPass: boolean;
}

export interface CrawlStats {
  totalPages: number;
  pagesCrawledPerDay: number;
  crawlWastePercentage: number;
  orphanedPages: number;
  redirectChains: number;
  fourOhFourInSitemap: number;
}

export interface IndexationData {
  submittedInSitemap: number;
  indexed: number;
  indexCoverageRatio: number;
  excludedCount: number;
  errorsCount: number;
}

export interface LighthouseData {
  performanceScore: number | null; // 0–100
  seoScore: number | null;
  accessibilityScore: number | null;
}

export interface StructuredDataInfo {
  typesPresent: string[];
  validationErrors: number;
  missingOpportunities: string[];
}

export interface SecurityInfo {
  https: boolean;
  mixedContentWarnings: number;
}

export interface MobileData {
  mobileFriendly: boolean;
  viewportConfigured: boolean;
  touchTargetsAdequate: boolean;
  fontLegible: boolean;
}

export interface CompetitorAnalysis {
  /** URLs of top-ranking competitor pages for the same target keywords. */
  competitors: CompetitorPage[];
  /** Keywords where competitors rank but we do not. */
  keywordGaps: string[];
}

export interface CompetitorPage {
  url: string;
  title: string;
  domainAuthority: number;
  wordCount: number;
  estimatedTraffic: number;
  backlinksCount: number;
  referringDomains: number;
  contentQualityScore: number; // 1–10 heuristic
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

/**
 * Structured output from the @seo-specialist agent.
 */
export interface SeoSpecialistOutput extends AgentOutputBase {
  /** Prioritized list of SEO recommendations. */
  recommendations: SeoRecommendation[];

  /** Content-specific optimization suggestions. */
  contentOptimizations: ContentOptimization[];

  /** Technical issues found, sorted by severity. */
  technicalFixes: TechnicalFix[];

  /** Keywords we are missing vs. competitors. */
  keywordGapAnalysis: KeywordGap[];

  /** Link building opportunities found. */
  linkOpportunities: LinkOpportunity[];

  /** SERP feature capture opportunities. */
  serpFeatureOpportunities: SerpFeatureOpportunity[];

  /** Overall SEO score (0–100). */
  overallSeoScore: number;
}

export interface SeoRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: Priority;
  confidence: Confidence;
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: "low" | "medium" | "high";
  estimatedTimeToImpact: string; // e.g. "2–4 weeks"
  relevantKeywords: string[];
}

export interface ContentOptimization {
  id: string;
  type:
    | "title_tag"
    | "meta_description"
    | "heading_structure"
    | "keyword_integration"
    | "content_gap"
    | "readability"
    | "internal_linking"
    | "structured_data"
    | "image_optimization"
    | "word_count";
  priority: Priority;
  currentValue: string;
  suggestedValue: string;
  rationale: string;
}

export interface TechnicalFix {
  id: string;
  severity: TechnicalSeverity;
  priority: Priority;
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
  intent: SearchIntent;
  competitorUrls: string[];
  opportunityScore: number; // 0–100
  recommendation: "create_page" | "optimize_existing" | "target_in_content";
}

export interface LinkOpportunity {
  id: string;
  type: "digital_pr" | "broken_link" | "unlinked_mention" | "resource_page" | "guest_post" | "competitor_gap";
  priority: Priority;
  targetUrl: string;
  anchorTextSuggestion: string;
  rationale: string;
  estimatedDifficulty: "easy" | "moderate" | "hard";
  prospectUrl?: string;
}

export interface SerpFeatureOpportunity {
  featureType: SerpFeatureType;
  keyword: string;
  currentOwner: string;
  captureStrategy: string;
  priority: Priority;
  confidence: Confidence;
}

// ---------------------------------------------------------------------------
// Context keys declared by this agent
// ---------------------------------------------------------------------------

/**
 * Keys that @seo-specialist reads from and writes to AgentContext.
 */
export const SEO_CONTEXT_KEYS = {
  READS: [
    "pageContent",
    "targetKeywords",
    "currentRankings",
    "competitorAnalysis",
    "technicalMetrics",
  ] as const,

  WRITES: [
    "seoAudit",
    "keywordMap",
    "contentOptimizations",
    "technicalFixes",
    "linkOpportunities",
  ] as const,
} as const;

export type SeoContextReadKey = (typeof SEO_CONTEXT_KEYS.READS)[number];
export type SeoContextWriteKey = (typeof SEO_CONTEXT_KEYS.WRITES)[number];

/**
 * Expected shape of each context key written by @seo-specialist.
 */
export interface SeoContextValues {
  /** Full audit output from the agent. */
  seoAudit: SeoSpecialistOutput;

  /** Normalized keyword → page mapping for the topic cluster. */
  keywordMap: Record<
    string,
    {
      targetUrl: string;
      intent: SearchIntent;
      volume: number;
      difficulty: number;
      currentPosition: number | null;
      owner: "pillar" | "satellite";
    }
  >;

  /** Content optimization suggestions keyed by page URL. */
  contentOptimizations: Record<string, ContentOptimization[]>;

  /** Technical fixes keyed by category. */
  technicalFixes: Record<string, TechnicalFix[]>;

  /** Link building opportunities. */
  linkOpportunities: LinkOpportunity[];
}
