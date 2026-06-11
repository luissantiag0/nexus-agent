// ============================================================================
// Nexus Agent — @seo-specialist: Validation Rules
// ============================================================================
// Business rules for validating SEO specialist inputs and evaluating
// recommendation quality. These rules enforce data quality gates before
// execution and confidence scoring after execution.
// ============================================================================

import type { ValidationResult, ValidationError, ValidationWarning } from "../types";
import type {
  SeoSpecialistInput,
  TargetKeyword,
  TechnicalMetrics,
} from "./types";
import { SearchIntent } from "../types";

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate the incoming SEO specialist input against business rules.
 *
 * Checks performed:
 *  - Page content length minimums per intent type.
 *  - Keyword relevance scoring (volume * difficulty sanity).
 *  - Technical SEO data completeness (CWVs, crawl, indexation).
 *  - Required fields presence.
 *  - Competitor data quality (if provided).
 */
export function validateSeoInput(
  raw: Record<string, unknown>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // -- Required field: pageContent --
  if (!raw.pageContent || typeof raw.pageContent !== "string") {
    errors.push({
      field: "pageContent",
      message: "pageContent is required and must be a non-empty string.",
      severity: "error",
    });
  } else {
    const contentLen = (raw.pageContent as string).length;
    if (contentLen < 50) {
      errors.push({
        field: "pageContent",
        message: `pageContent is too short (${contentLen} chars). Minimum 50 characters required for meaningful analysis.`,
        severity: "error",
      });
    }
  }

  // -- Required field: targetKeywords --
  if (!raw.targetKeywords || !Array.isArray(raw.targetKeywords)) {
    errors.push({
      field: "targetKeywords",
      message: "targetKeywords is required and must be a non-empty array.",
      severity: "error",
    });
  } else {
    const kwErrors = validateKeywordList(raw.targetKeywords as TargetKeyword[]);
    errors.push(...kwErrors);
  }

  // -- Required field: mode --
  if (!raw.mode || typeof raw.mode !== "string") {
    errors.push({
      field: "mode",
      message: "mode is required. Must be one of: audit, optimize, brief-review.",
      severity: "error",
    });
  } else {
    const validModes = ["audit", "optimize", "brief-review"];
    if (!validModes.includes(raw.mode as string)) {
      errors.push({
        field: "mode",
        message: `Invalid mode "${raw.mode}". Must be one of: ${validModes.join(", ")}.`,
        severity: "error",
      });
    }
  }

  // -- Content length minimums per intent (only when pageContent is present) --
  if (
    raw.pageContent &&
    typeof raw.pageContent === "string" &&
    raw.targetKeywords &&
    Array.isArray(raw.targetKeywords)
  ) {
    const contentLen = (raw.pageContent as string).length;
    const intents = extractIntents(raw.targetKeywords as TargetKeyword[]);

    if (intents.has(SearchIntent.INFORMATIONAL) && contentLen < 2000) {
      warnings.push({
        field: "pageContent",
        message: `Informational intent detected but page content is only ${contentLen} chars. Minimum 2,000 chars recommended for topical depth.`,
        severity: "warning",
      });
    }

    if (intents.has(SearchIntent.COMMERCIAL) && contentLen < 1500) {
      warnings.push({
        field: "pageContent",
        message: `Commercial investigation intent detected but page content is only ${contentLen} chars. Minimum 1,500 chars recommended for persuasive depth.`,
        severity: "warning",
      });
    }

    if (intents.has(SearchIntent.TRANSACTIONAL) && contentLen < 800) {
      warnings.push({
        field: "pageContent",
        message: `Transactional intent detected but page content is only ${contentLen} chars. Minimum 800 chars recommended for conversion copy.`,
        severity: "warning",
      });
    }
  }

  // -- Technical metrics completeness check --
  if (raw.technicalMetrics) {
    const techErrors = validateTechnicalMetrics(
      raw.technicalMetrics as TechnicalMetrics,
    );
    errors.push(...techErrors.errors);
    warnings.push(...techErrors.warnings);
  } else {
    warnings.push({
      field: "technicalMetrics",
      message:
        "No technical metrics provided. Analysis will exclude CWV, crawl, and indexation assessments. Provide technicalMetrics for a complete audit.",
      severity: "warning",
    });
  }

  // -- Competitor data quality --
  if (raw.competitorAnalysis) {
    const comp = raw.competitorAnalysis as Record<string, unknown>;
    if (comp.competitors && !Array.isArray(comp.competitors)) {
      errors.push({
        field: "competitorAnalysis.competitors",
        message: "competitors must be an array if provided.",
        severity: "error",
      });
    }
    if (comp.keywordGaps && !Array.isArray(comp.keywordGaps)) {
      errors.push({
        field: "competitorAnalysis.keywordGaps",
        message: "keywordGaps must be an array if provided.",
        severity: "error",
      });
    }
  }

  // -- URL format check (if provided) --
  if (raw.url && typeof raw.url === "string") {
    try {
      new URL(raw.url as string);
    } catch {
      warnings.push({
        field: "url",
        message: `"${raw.url}" is not a valid URL. URL validation will be skipped.`,
        severity: "warning",
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// KEYWORD VALIDATION
// ============================================================================

/**
 * Validate an array of target keywords.
 */
function validateKeywordList(keywords: TargetKeyword[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (keywords.length === 0) {
    errors.push({
      field: "targetKeywords",
      message: "At least one target keyword is required.",
      severity: "error",
    });
    return errors;
  }

  // Check for empty keyword strings.
  const emptyKws = keywords.filter(
    (k) => !k.keyword || k.keyword.trim() === "",
  );
  if (emptyKws.length > 0) {
    errors.push({
      field: "targetKeywords",
      message: `${emptyKws.length} keyword(s) have empty or whitespace-only strings.`,
      severity: "error",
    });
  }

  // Check for duplicate keywords.
  const seen = new Set<string>();
  for (const kw of keywords) {
    const normalized = kw.keyword?.trim().toLowerCase();
    if (normalized && seen.has(normalized)) {
      errors.push({
        field: "targetKeywords",
        message: `Duplicate keyword: "${kw.keyword}". Remove duplicates or merge intent.`,
        severity: "error",
      });
    }
    if (normalized) seen.add(normalized);
  }

  // Check volume/difficulty sanity.
  for (const kw of keywords) {
    if (kw.keywordDifficulty < 0 || kw.keywordDifficulty > 100) {
      errors.push({
        field: `targetKeywords["${kw.keyword}"].keywordDifficulty`,
        message: `keywordDifficulty must be 0–100, got ${kw.keywordDifficulty}.`,
        severity: "error",
      });
    }

    if (kw.searchVolume < 0) {
      errors.push({
        field: `targetKeywords["${kw.keyword}"].searchVolume`,
        message: `searchVolume cannot be negative (got ${kw.searchVolume}).`,
        severity: "error",
      });
    }

    // Intent validity check.
    const validIntents = Object.values(SearchIntent);
    if (!validIntents.includes(kw.intent as unknown as SearchIntent)) {
      errors.push({
        field: `targetKeywords["${kw.keyword}"].intent`,
        message: `Invalid intent "${kw.intent}". Must be one of: ${validIntents.join(", ")}.`,
        severity: "error",
      });
    }
  }

  return errors;
}

// ============================================================================
// TECHNICAL METRICS COMPLETENESS
// ============================================================================

interface TechValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validate technical metrics completeness. Not all fields are required,
 * but missing critical data generates warnings.
 */
function validateTechnicalMetrics(
  tm: TechnicalMetrics,
): TechValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // -- Core Web Vitals --
  if (tm.coreWebVitals) {
    const cwv = tm.coreWebVitals;

    // LCP range check
    if (cwv.lcpMobile != null && (cwv.lcpMobile < 0 || cwv.lcpMobile > 30)) {
      errors.push({
        field: "technicalMetrics.coreWebVitals.lcpMobile",
        message: `LCP mobile (${cwv.lcpMobile}s) is outside expected range (0–30s).`,
        severity: "error",
      });
    }

    // INP range check
    if (cwv.inpMobile != null && (cwv.inpMobile < 0 || cwv.inpMobile > 5000)) {
      errors.push({
        field: "technicalMetrics.coreWebVitals.inpMobile",
        message: `INP mobile (${cwv.inpMobile}ms) is outside expected range (0–5000ms).`,
        severity: "error",
      });
    }

    // CLS range check
    if (cwv.clsMobile != null && (cwv.clsMobile < 0 || cwv.clsMobile > 2)) {
      errors.push({
        field: "technicalMetrics.coreWebVitals.clsMobile",
        message: `CLS mobile (${cwv.clsMobile}) is outside expected range (0–2).`,
        severity: "error",
      });
    }

    // PASS/FAIL consistency
    if (cwv.lcpMobile != null && cwv.lcpMobile <= 2.5 && cwv.lcpPass === false) {
      warnings.push({
        field: "technicalMetrics.coreWebVitals.lcpPass",
        message: `LCP passes (${cwv.lcpMobile}s <= 2.5s) but lcpPass is false. Check flag.`,
        severity: "warning",
      });
    }
    if (cwv.lcpMobile != null && cwv.lcpMobile > 2.5 && cwv.lcpPass === true) {
      warnings.push({
        field: "technicalMetrics.coreWebVitals.lcpPass",
        message: `LCP fails (${cwv.lcpMobile}s > 2.5s) but lcpPass is true. Check flag.`,
        severity: "warning",
      });
    }
  } else {
    warnings.push({
      field: "technicalMetrics.coreWebVitals",
      message:
        "Core Web Vitals not provided. Performance recommendations will be limited.",
      severity: "warning",
    });
  }

  // -- Crawl stats --
  if (tm.crawlStats) {
    const { totalPages, pagesCrawledPerDay, crawlWastePercentage } =
      tm.crawlStats;

    if (totalPages != null && totalPages < 0) {
      errors.push({
        field: "technicalMetrics.crawlStats.totalPages",
        message: "totalPages cannot be negative.",
        severity: "error",
      });
    }

    if (
      crawlWastePercentage != null &&
      (crawlWastePercentage < 0 || crawlWastePercentage > 100)
    ) {
      errors.push({
        field: "technicalMetrics.crawlStats.crawlWastePercentage",
        message: `crawlWastePercentage must be 0–100, got ${crawlWastePercentage}.`,
        severity: "error",
      });
    }

    if (crawlWastePercentage != null && crawlWastePercentage > 30) {
      warnings.push({
        field: "technicalMetrics.crawlStats.crawlWastePercentage",
        message: `Crawl waste is ${crawlWastePercentage}% (>30%). Budget optimization recommended.`,
        severity: "warning",
      });
    }
  } else {
    warnings.push({
      field: "technicalMetrics.crawlStats",
      message: "Crawl stats not provided. Crawl budget analysis will be limited.",
      severity: "warning",
    });
  }

  // -- Indexation --
  if (tm.indexation) {
    const { submittedInSitemap, indexed } = tm.indexation;

    if (submittedInSitemap != null && submittedInSitemap < 0) {
      errors.push({
        field: "technicalMetrics.indexation.submittedInSitemap",
        message: "submittedInSitemap cannot be negative.",
        severity: "error",
      });
    }

    if (indexed != null && indexed < 0) {
      errors.push({
        field: "technicalMetrics.indexation.indexed",
        message: "indexed cannot be negative.",
        severity: "error",
      });
    }

    if (
      submittedInSitemap != null &&
      indexed != null &&
      submittedInSitemap > 0
    ) {
      const ratio = indexed / submittedInSitemap;
      if (ratio < 0.5) {
        warnings.push({
          field: "technicalMetrics.indexation",
          message: `Low index coverage ratio: ${(ratio * 100).toFixed(1)}%. Only ${indexed} of ${submittedInSitemap} submitted URLs are indexed.`,
          severity: "warning",
        });
      }
    }
  } else {
    warnings.push({
      field: "technicalMetrics.indexation",
      message:
        "Indexation data not provided. Coverage analysis will be limited.",
      severity: "warning",
    });
  }

  // -- Lighthouse --
  if (tm.lighthouse) {
    const { performanceScore } = tm.lighthouse;
    if (
      performanceScore != null &&
      (performanceScore < 0 || performanceScore > 100)
    ) {
      errors.push({
        field: "technicalMetrics.lighthouse.performanceScore",
        message: `performanceScore must be 0–100, got ${performanceScore}.`,
        severity: "error",
      });
    }
  }

  // -- Security --
  if (tm.security) {
    if (tm.security.https === false) {
      errors.push({
        field: "technicalMetrics.security.https",
        message: "HTTPS is not enabled. All sites must serve over HTTPS.",
        severity: "error",
      });
    }
  }

  return { errors, warnings };
}

// ============================================================================
// HELPER
// ============================================================================

function extractIntents(keywords: TargetKeyword[]): Set<SearchIntent> {
  const intents = new Set<SearchIntent>();
  for (const kw of keywords) {
    intents.add(kw.intent);
  }
  return intents;
}

// ============================================================================
// KEYWORD RELEVANCE SCORING
// ============================================================================

/**
 * Score how relevant a keyword is to a given page content string.
 * Returns 0–100.
 *
 * Factors:
 *  - Exact match in title (H1) or first 100 words: +40 pts
 *  - Partial match in headings (H2–H3): +20 pts
 *  - Density in body (normalized): +20 pts
 *  - Semantic relatedness via co-occurrence: +20 pts
 */
export function scoreKeywordRelevance(
  keyword: string,
  pageContent: string,
): number {
  let score = 0;
  const lowerContent = pageContent.toLowerCase();
  const lowerKw = keyword.toLowerCase();

  // 1. Exact match in first 100 words.
  const first100Words = lowerContent.split(/\s+/).slice(0, 100).join(" ");
  if (first100Words.includes(lowerKw)) {
    score += 30;
  }

  // 2. Partial match in H1 (lines starting with #).
  const h1Lines = lowerContent
    .split("\n")
    .filter((l) => l.trim().startsWith("# ") || l.trim().startsWith("#\t"));
  const h1Text = h1Lines.join(" ");
  if (h1Text.includes(lowerKw)) {
    score += 15;
  }

  // 3. Partial match in H2/H3 headings.
  const headingLines = lowerContent
    .split("\n")
    .filter(
      (l) =>
        l.trim().startsWith("## ") ||
        l.trim().startsWith("### ") ||
        l.trim().startsWith("##\t") ||
        l.trim().startsWith("###\t"),
    );
  const headingText = headingLines.join(" ");
  if (headingText.includes(lowerKw)) {
    score += 15;
  }

  // 4. Density in body.
  const words = lowerContent.split(/\s+/).filter(Boolean);
  const kwWords = lowerKw.split(/\s+/).filter(Boolean);
  if (kwWords.length > 0) {
    // Count occurrences of the keyword phrase.
    const kwEscaped = lowerKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(kwEscaped, "gi");
    const matches = lowerContent.match(regex);
    const count = matches ? matches.length : 0;
    const density = count / Math.max(words.length, 1);

    // Ideal density is ~0.5%–2%
    if (density > 0.002 && density < 0.03) {
      score += 20;
    } else if (density >= 0.03) {
      score += 10; // high density — could be keyword stuffing
    }
  }

  // 5. Semantic relatedness: check for co-occurring LSI-adjacent terms.
  //    This is a heuristic: split multi-word keywords and check each word.
  if (kwWords.length > 1) {
    const matchCount = kwWords.filter((w) => lowerContent.includes(w)).length;
    score += Math.min(matchCount * 5, 20);
  }

  return Math.min(score, 100);
}

// ============================================================================
// CONTENT-LENGTH MINIMUMS PER INTENT TYPE
// ============================================================================

/**
 * Minimum content length (in characters) recommended per search intent type.
 */
export const CONTENT_LENGTH_MINIMUMS: Record<SearchIntent, number> = {
  [SearchIntent.INFORMATIONAL]: 2000,
  [SearchIntent.COMMERCIAL]: 1500,
  [SearchIntent.TRANSACTIONAL]: 800,
  [SearchIntent.NAVIGATIONAL]: 300,
};

/**
 * Check if page content meets the minimum length for its target intent(s).
 * Returns a list of warnings for intents that fall short.
 */
export function checkContentLengthByIntent(
  contentLength: number,
  intents: SearchIntent[],
): { intent: SearchIntent; minimum: number; actual: number; passes: boolean }[] {
  return intents.map((intent) => {
    const minimum = CONTENT_LENGTH_MINIMUMS[intent];
    return {
      intent,
      minimum,
      actual: contentLength,
      passes: contentLength >= minimum,
    };
  });
}

// ============================================================================
// TECHNICAL SEO CHECK COMPLETENESS
// ============================================================================

/**
 * Categories of technical SEO checks that a full audit must cover.
 */
export const TECHNICAL_SEO_CHECK_CATEGORIES = [
  "crawlability",
  "indexation",
  "core_web_vitals",
  "mobile_friendliness",
  "https_security",
  "structured_data",
  "site_architecture",
  "internal_linking",
  "page_speed",
  "xml_sitemap",
  "robots_txt",
  "canonical_tags",
  "hreflang",
  "redirects",
  "duplicate_content",
] as const;

export type TechnicalSeoCheckCategory =
  (typeof TECHNICAL_SEO_CHECK_CATEGORIES)[number];

/**
 * Evaluate completeness of technical SEO data.
 * Returns a score (0–100) and a list of missing categories.
 */
export function evaluateTechnicalSeoCompleteness(
  metrics: TechnicalMetrics | undefined | null,
): {
  completenessScore: number;
  totalChecks: number;
  passedChecks: number;
  missingCategories: TechnicalSeoCheckCategory[];
} {
  if (!metrics) {
    return {
      completenessScore: 0,
      totalChecks: TECHNICAL_SEO_CHECK_CATEGORIES.length,
      passedChecks: 0,
      missingCategories: [...TECHNICAL_SEO_CHECK_CATEGORIES],
    };
  }

  const missing: TechnicalSeoCheckCategory[] = [];
  let passed = 0;

  // crawlability
  if (metrics.crawlStats != null) passed++;
  else missing.push("crawlability");

  // indexation
  if (metrics.indexation != null) passed++;
  else missing.push("indexation");

  // core_web_vitals
  if (metrics.coreWebVitals != null) passed++;
  else missing.push("core_web_vitals");

  // mobile_friendliness
  if (metrics.mobile != null) passed++;
  else missing.push("mobile_friendliness");

  // https_security
  if (metrics.security != null) passed++;
  else missing.push("https_security");

  // structured_data
  if (metrics.structuredData != null) passed++;
  else missing.push("structured_data");

  // site_architecture (proxied by internalLinksCount)
  if (metrics.internalLinksCount != null) passed++;
  else missing.push("site_architecture");

  // internal_linking (proxied by internalLinksCount)
  if (metrics.internalLinksCount != null) passed++;
  else missing.push("internal_linking");

  // page_speed
  if (metrics.lighthouse != null) passed++;
  else missing.push("page_speed");

  // xml_sitemap (part of indexation)
  if (metrics.indexation?.submittedInSitemap != null) passed++;
  else missing.push("xml_sitemap");

  // robots_txt (proxied by blockedFromIndex)
  if (metrics.blockedFromIndex != null) passed++;
  else missing.push("robots_txt");

  // canonical_tags, hreflang, redirects, duplicate_content
  // not directly available from TechnicalMetrics — check if any info exists.
  // These are advanced checks we flag as missing.
  missing.push("canonical_tags");
  missing.push("hreflang");
  missing.push("redirects");
  missing.push("duplicate_content");

  const totalChecks = TECHNICAL_SEO_CHECK_CATEGORIES.length;
  const score = Math.round((passed / totalChecks) * 100);

  return {
    completenessScore: score,
    totalChecks,
    passedChecks: passed,
    missingCategories: missing,
  };
}
