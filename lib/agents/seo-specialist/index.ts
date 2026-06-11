// ============================================================================
// Nexus Agent — @seo-specialist barrel exports
// ============================================================================

export { getSeoSpecialistAdapter, default as SeoSpecialistAdapter } from "./adapter";
export type { default as SeoSpecialistAdapterType } from "./adapter";

export type {
  SeoSpecialistInput,
  SeoSpecialistOutput,
  TargetKeyword,
  CurrentRanking,
  TechnicalMetrics,
  CoreWebVitalsData,
  CrawlStats,
  IndexationData,
  LighthouseData,
  StructuredDataInfo,
  SecurityInfo,
  MobileData,
  CompetitorAnalysis,
  CompetitorPage,
  SeoRecommendation,
  ContentOptimization,
  TechnicalFix,
  KeywordGap,
  LinkOpportunity,
  SerpFeatureOpportunity,
  SeoContextValues,
  SeoContextReadKey,
  SeoContextWriteKey,
} from "./types";

export {
  RecommendationCategory,
  TechnicalSeverity,
  SerpFeatureType,
  SEO_CONTEXT_KEYS,
} from "./types";

export {
  validateSeoInput,
  scoreKeywordRelevance,
  checkContentLengthByIntent,
  evaluateTechnicalSeoCompleteness,
  CONTENT_LENGTH_MINIMUMS,
  TECHNICAL_SEO_CHECK_CATEGORIES,
} from "./validation";

export type { TechnicalSeoCheckCategory } from "./validation";

export {
  SEO_SPECIALIST_INPUT_SCHEMA,
  SEO_SPECIALIST_OUTPUT_SCHEMA,
} from "./schemas";
