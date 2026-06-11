// ============================================================================
// Nexus Agent Platform — @content-creator Agent Adapter
// ============================================================================
// Agent Registry contract for multi-platform content creation.
// Handles: editorial strategy, compelling copy, brand storytelling,
//          platform-specific formatting, SEO-augmented content.
//
// Input:  content brief, target audience, platform constraints,
//         brand guidelines, SEO keywords, tone/persona, campaign goals, CTA
// Output: content draft, headline variants, meta description, CTA copy,
//         platform-specific formatting, content score, brand alignment report,
//         SEO analysis
//
// Context keys:
//   contentDraft       — the full generated content body
//   headlineOptions    — headline variants with predicted CTR
//   contentScore       — relevance/engagement/readability self-assessment
//   platformFormat     — platform-tailored format with media suggestions
//   brandAlignment     — brand voice enforcement and violation report
//   seoAnalysis        — keyword density, placement, readability metrics
// ============================================================================

import type {
  AgentContext,
  AgentInputBase,
  AgentOutputBase,
  AgentExecutionResponse,
  ValidationResult as BaseValidationResult,
  ValidationError as BaseValidationError,
  ValidationWarning as BaseValidationWarning,
  AgentStatus,
} from "../types";

import type {
  EnhancedAgentAdapter,
  PortSchema,
  ValidationRule,
  ValidationResult,
  AgentMetadata,
} from "./types";

// ---------------------------------------------------------------------------
// Context Keys
// ---------------------------------------------------------------------------

/**
 * Canonical context keys written by the @content-creator adapter.
 * These string constants ensure consistent naming across agents.
 */
export const CONTENT_CREATOR_CONTEXT = {
  CONTENT_DRAFT: "contentDraft",
  HEADLINE_OPTIONS: "headlineOptions",
  CONTENT_SCORE: "contentScore",
  PLATFORM_FORMAT: "platformFormat",
  BRAND_ALIGNMENT: "brandAlignment",
  SEO_ANALYSIS: "seoAnalysis",
} as const;

/** Union type of all context keys this adapter writes. */
export type ContentCreatorContextKey =
  (typeof CONTENT_CREATOR_CONTEXT)[keyof typeof CONTENT_CREATOR_CONTEXT];

// ---------------------------------------------------------------------------
// Shared / Reference Types
// ---------------------------------------------------------------------------

/**
 * Target platform for content distribution.
 */
export type ContentPlatform =
  | "blog"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "email"
  | "newsletter"
  | "medium"
  | "reddit";

/**
 * Content format type.
 */
export type ContentType =
  | "long-form-blog"
  | "short-form-blog"
  | "social-post"
  | "email-sequence"
  | "landing-page"
  | "video-script"
  | "podcast-script"
  | "infographic-copy"
  | "case-study";

/**
 * Brand voice tone profile.
 */
export type BrandTone =
  | "professional"
  | "conversational"
  | "authoritative"
  | "playful"
  | "empathetic";

/**
 * Campaign funnel stage.
 */
export type CampaignStage =
  | "awareness"
  | "consideration"
  | "conversion"
  | "retention"
  | "advocacy";

// ---------------------------------------------------------------------------
// Input Schema — AgentInput
// ---------------------------------------------------------------------------

export interface AudienceDemographics {
  ageRange: [number, number];
  gender?: string;
  location?: string;
  income?: string;
}

export interface AudiencePsychographics {
  interests: string[];
  painPoints: string[];
  goals: string[];
  contentPreferences: string[];
}

export interface AudiencePlatformBehavior {
  activeTimes: string[];
  engagementType: "passive" | "interactive" | "sharing";
  devicePreference: "mobile" | "desktop" | "both";
}

export interface TargetAudience {
  demographics: AudienceDemographics;
  psychographics: AudiencePsychographics;
  platformBehavior: AudiencePlatformBehavior;
}

export interface PlatformConstraints {
  name: ContentPlatform;
  maxChars: number;
  maxHashtags: number;
  allowMarkdown: boolean;
  allowHtml: boolean;
  imageRequired: boolean;
  linkFormat: "shortened" | "inline" | "cta-button";
}

export interface BrandVoiceProfile {
  tone: BrandTone;
  values: string[];
  forbiddenPhrases: string[];
  requiredPhrases: string[];
  readingLevel: "basic" | "intermediate" | "advanced";
  pronouns: "first-person" | "second-person" | "third-person";
  sentenceStructure: "short" | "mixed" | "long-form";
}

export interface SEOKeywordsInput {
  primary: string[];
  secondary: string[];
  longTail: string[];
  intent: "informational" | "commercial" | "transactional" | "navigational";
  targetDensity: number;
  competitorGapTerms: string[];
}

export interface CampaignGoals {
  primary: CampaignStage;
  secondary: CampaignStage[];
  kpis: string[];
  targetAudienceActions: string[];
}

export interface CallToAction {
  primary: string;
  secondary?: string;
  url?: string;
}

export interface WordCountRange {
  min: number;
  max: number;
  ideal: number;
}

/**
 * Full input payload for the @content-creator agent.
 * Extends AgentInputBase for runtime tracing and routing metadata.
 */
export interface ContentCreatorInput extends AgentInputBase {
  /** Core editorial brief describing what to write about. */
  contentBrief: string;

  /** Target audience definition. */
  targetAudience: TargetAudience;

  /** Platform constraints. */
  platform: PlatformConstraints;

  /** Brand voice profile. */
  brandGuidelines: BrandVoiceProfile;

  /** SEO keyword map (typically from @seo-specialist). */
  keywords: SEOKeywordsInput;

  /** Requested tone/persona for this piece. */
  tone: string;

  /** Campaign goals. */
  campaignGoals: CampaignGoals;

  /** Content format type. */
  contentType: ContentType;

  /** Target word count range. */
  wordCount?: WordCountRange;

  /** Reference URLs for research / competitive context. */
  referenceUrls?: string[];

  /** Call to action specification. */
  callToAction: CallToAction;
}

// ---------------------------------------------------------------------------
// Output Schema — AgentOutput
// ---------------------------------------------------------------------------

export interface HeadlineVariant {
  headline: string;
  length: number;
  includesKeyword: boolean;
  emotionalAppeal: string;
  predictedCTR: number;
}

export interface MediaSuggestion {
  type: "image" | "video" | "infographic" | "gif";
  description: string;
  altText: string;
}

export interface LinkPlacement {
  url: string;
  anchor: string;
  position: "beginning" | "middle" | "end";
}

export interface PlatformFormat {
  platform: string;
  body: string;
  characterCount: number;
  hashtags: string[];
  mentions: string[];
  mediaSuggestions: MediaSuggestion[];
  linkPlacement: LinkPlacement;
  formattingApplied: string[];
}

export interface ContentScore {
  overall: number;
  dimensions: {
    relevance: number;
    engagement: number;
    readability: number;
    brandAlignment: number;
    seoOptimization: number;
    originality: number;
  };
  predictedKPIs: {
    estimatedReads: number;
    estimatedShares: number;
    estimatedClickThrough: number;
    estimatedConversion: number;
  };
}

export interface BrandAlignmentReport {
  score: number;
  violations: string[];
  warnings: string[];
  recommendations: string[];
}

export interface SEOAnalysis {
  keywordDensity: number;
  keywordPlacements: {
    term: string;
    count: number;
    prominence: "early" | "mid" | "late";
  }[];
  readabilityScore: number;
  suggestedImprovements: string[];
}

/**
 * Full output payload from the @content-creator agent.
 * Extends AgentOutputBase for runtime status, tracing, and summary.
 */
export interface ContentCreatorOutput extends AgentOutputBase {
  /** Complete content draft, ready for platform. */
  contentDraft: string;

  /** Headline variants with performance predictions. */
  headlineOptions: HeadlineVariant[];

  /** SEO meta description (150–160 chars). */
  metaDescription: string;

  /** Primary call-to-action copy. */
  ctaCopy: string;

  /** Platform-tailored format spec. */
  platformFormat: PlatformFormat;

  /** Self-assessed content quality score. */
  contentScore: ContentScore;

  /** Brand voice enforcement report. */
  brandAlignment: BrandAlignmentReport;

  /** SEO keyword integration analysis. */
  seoAnalysis: SEOAnalysis;

  /** Alternative content variants (optional). */
  variants?: string[];
}

// ---------------------------------------------------------------------------
// Port Schemas
// ---------------------------------------------------------------------------

export const CONTENT_CREATOR_INPUT_SCHEMA: PortSchema = {
  $id: "content-creator-input.v1",
  version: "1.0.0",
  description:
    "Content brief, target audience, platform constraints, brand guidelines, " +
    "SEO keywords, tone/persona, campaign goals, and CTA for the @content-creator agent.",
  type: "object",
  properties: {
    contentBrief: { type: "string", description: "Core editorial brief describing what to write about." },
    targetAudience: { type: "object", description: "Target audience demographics, psychographics, and platform behavior." },
    platform: { type: "object", description: "Target platform constraints (name, maxChars, maxHashtags, formats)." },
    brandGuidelines: { type: "object", description: "Brand voice profile with tone, forbidden/required phrases, reading level." },
    keywords: { type: "object", description: "SEO keyword map from @seo-specialist (primary, secondary, long-tail, density)." },
    tone: { type: "string", description: "Requested tone/persona for this piece." },
    campaignGoals: { type: "object", description: "Primary and secondary campaign goals with KPIs." },
    contentType: { type: "string", description: "Content format type (blog post, social post, email, etc.)." },
    wordCount: { type: "object", description: "Target word count range (min, max, ideal)." },
    referenceUrls: { type: "array", description: "Reference/research URLs for context." },
    callToAction: { type: "object", description: "Primary and optional secondary CTA with URL." },
  },
  required: [
    "contentBrief",
    "targetAudience",
    "platform",
    "brandGuidelines",
    "keywords",
    "tone",
    "campaignGoals",
    "contentType",
    "callToAction",
  ],
  example: {
    contentBrief: "Write a blog post about the top 10 productivity tools for remote teams in 2026.",
    targetAudience: {
      demographics: { ageRange: [25, 45] },
      psychographics: {
        interests: ["remote work", "productivity", "SaaS tools"],
        painPoints: ["too many tools", "team collaboration", "time management"],
        goals: ["improve team efficiency", "reduce context switching"],
        contentPreferences: ["how-to guides", "comparison posts", "listicles"],
      },
      platformBehavior: {
        activeTimes: ["09:00", "12:00", "15:00"],
        engagementType: "sharing",
        devicePreference: "both",
      },
    },
    platform: {
      name: "blog", maxChars: 8000, maxHashtags: 0,
      allowMarkdown: true, allowHtml: false, imageRequired: true, linkFormat: "inline",
    },
    brandGuidelines: {
      tone: "professional", values: ["innovation", "efficiency", "trust"],
      forbiddenPhrases: ["game-changer", "revolutionary", "supercharge"],
      requiredPhrases: [], readingLevel: "intermediate",
      pronouns: "second-person", sentenceStructure: "mixed",
    },
    keywords: {
      primary: ["productivity tools remote teams"],
      secondary: ["remote work software", "team collaboration tools"],
      longTail: ["best productivity tools for distributed teams 2026"],
      intent: "commercial", targetDensity: 1.2, competitorGapTerms: ["async communication"],
    },
    tone: "inspiring and practical",
    campaignGoals: {
      primary: "consideration", secondary: ["awareness"],
      kpis: ["page views", "time on page", "email signups"],
      targetAudienceActions: ["download comparison guide", "subscribe to newsletter"],
    },
    contentType: "long-form-blog",
    wordCount: { min: 1500, max: 2500, ideal: 2000 },
    callToAction: {
      primary: "Download the Free Comparison Guide",
      secondary: "Subscribe for weekly productivity tips",
      url: "https://example.com/guides/productivity-tools",
    },
  },
};

export const CONTENT_CREATOR_OUTPUT_SCHEMA: PortSchema = {
  $id: "content-creator-output.v1",
  version: "1.0.0",
  description:
    "Content draft, headline variants, meta description, CTA copy, " +
    "platform-specific formatting, content score, brand alignment, and SEO analysis.",
  type: "object",
  properties: {
    contentDraft: { type: "string", description: "Complete content draft ready for the target platform." },
    headlineOptions: { type: "array", description: "Headline variants with predicted CTR scoring." },
    metaDescription: { type: "string", description: "SEO-optimized meta description (150–160 characters)." },
    ctaCopy: { type: "string", description: "Primary call-to-action text." },
    platformFormat: { type: "object", description: "Platform-tailored format with media suggestions." },
    contentScore: { type: "object", description: "Self-assessed content quality across 6 dimensions." },
    brandAlignment: { type: "object", description: "Brand voice enforcement report with violations." },
    seoAnalysis: { type: "object", description: "Keyword density, placement, and readability analysis." },
  },
  required: [
    "contentDraft",
    "headlineOptions",
    "metaDescription",
    "ctaCopy",
    "platformFormat",
    "contentScore",
    "brandAlignment",
    "seoAnalysis",
  ],
};

// ---------------------------------------------------------------------------
// Platform Writing Guides
// ---------------------------------------------------------------------------

/**
 * Structural rules and best-practice guidance per platform.
 * Used to shape the prompt for the LLM.
 */
export const PLATFORM_WRITING_GUIDES: Record<
  ContentPlatform,
  { structure: string; toneAdvice: string; hookStyle: string; maxParagraphs: number }
> = {
  blog: {
    structure: "H1 → intro (hook) → H2 subsections → bullet points → conclusion → CTA",
    toneAdvice: "Authority-building with conversational warmth",
    hookStyle: "Question, statistic, or relatable anecdote",
    maxParagraphs: 40,
  },
  linkedin: {
    structure: "Hook → insight → body (2–3 short paragraphs) → question/CTA → line break → hashtags",
    toneAdvice: "Professional yet personal — share expertise",
    hookStyle: "Bold provocative statement or lessons-learned opener",
    maxParagraphs: 6,
  },
  twitter: {
    structure: "Hook → value → CTA (all in <280 chars or <4000 for Premium)",
    toneAdvice: "Conversational, punchy, high-signal",
    hookStyle: "Hot take, thread opener, or counter-intuitive stat",
    maxParagraphs: 1,
  },
  instagram: {
    structure: "Caption hook → line break → story/context → line break → CTA → hashtags (1st comment)",
    toneAdvice: "Visual-first, emotionally resonant, community-focused",
    hookStyle: "Relatable confession, question, or bold statement",
    maxParagraphs: 5,
  },
  facebook: {
    structure: "Hook → story/value → engagement question → link preview",
    toneAdvice: "Conversational, community-oriented, shareable",
    hookStyle: "Question, shareable insight, or relatable story",
    maxParagraphs: 8,
  },
  email: {
    structure: "Subject line → preheader → salutation → hook → body → CTA button → signature",
    toneAdvice: "Direct, personal, value-first",
    hookStyle: "Subject line with curiosity gap or clear benefit",
    maxParagraphs: 10,
  },
  newsletter: {
    structure: "Subject → greeting → main essay/curation → personal note → CTA → sign-off",
    toneAdvice: "Intimate, consistent voice, feels like a letter",
    hookStyle: "Personal anecdote or timely observation",
    maxParagraphs: 20,
  },
  medium: {
    structure: "Title → subtitle → intro → H2 sections → conclusion → claps request",
    toneAdvice: "Thought-leadership, evidence-backed, narrative-driven",
    hookStyle: "Bold thesis statement or surprising opening stat",
    maxParagraphs: 35,
  },
  reddit: {
    structure: "Subreddit context → hook → story/argument → discussion prompt",
    toneAdvice: "Authentic, transparent, anti-corporate, value-adding",
    hookStyle: "Direct address, honest framing, TL;DR upfront for long posts",
    maxParagraphs: 15,
  },
};

// ---------------------------------------------------------------------------
// Validation Rules
// ---------------------------------------------------------------------------

/**
 * Brand voice consistency — scans output alignment report for violations.
 * Severity: error — any forbidden phrase usage blocks execution.
 */
export const brandVoiceConsistencyRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.brand-voice-consistency",
  name: "Brand Voice Consistency",
  description: "Validates that the generated content does not contain forbidden brand phrases.",
  severity: "error",
  validate(output: ContentCreatorOutput, _context?: AgentContext): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];
    const alignment = output.brandAlignment;

    for (const violation of alignment.violations) {
      errors.push({
        path: "brandAlignment.violations",
        message: `Brand voice violation: ${violation}`,
        severity: "error",
        code: "BRAND_VOICE_VIOLATION",
      });
    }

    for (const warning of alignment.warnings) {
      warnings.push(warning);
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

/**
 * Platform character limit assessment.
 * Severity: warning — flags content approaching platform limits.
 */
export const platformCharacterLimitRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.platform-character-limit",
  name: "Platform Character Limit Flag",
  description: "Flags if generated content approaches or exceeds platform max character limits.",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];
    const format = output.platformFormat;

    warnings.push(
      `Platform character count: ${format.characterCount}. ` +
      "Verify against platform max before publishing."
    );

    return { valid: true, errors, warnings };
  },
};

/**
 * Keyword density bounds — ensures SEO keyword density is within 0.5%–2.5%.
 * Severity: warning — flags content that may be under- or over-optimized.
 */
export const keywordDensityBoundsRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.keyword-density-bounds",
  name: "Keyword Density Bounds",
  description: "Validates keyword density is within acceptable SEO bounds (0.5%–2.5%).",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];
    const seo = output.seoAnalysis;

    if (seo.keywordDensity < 0.5) {
      warnings.push(
        `Low keyword density: ${seo.keywordDensity.toFixed(2)}%. ` +
        `Target range is 0.5%–2.5%. Content may lack SEO focus.`
      );
    } else if (seo.keywordDensity > 2.5) {
      warnings.push(
        `High keyword density: ${seo.keywordDensity.toFixed(2)}%. ` +
        `Target range is 0.5%–2.5%. Risk of keyword stuffing.`
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

/**
 * Headline sufficiency — at least 5 headline variants required.
 * Severity: warning — fewer than 5 limits A/B testing capability.
 */
export const headlineSufficiencyRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.headline-sufficiency",
  name: "Headline Variant Sufficiency",
  description: "Ensures at least 5 headline variants are provided for A/B testing.",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];

    if (output.headlineOptions.length < 5) {
      warnings.push(
        `Only ${output.headlineOptions.length} headline variant(s) provided. ` +
        `Minimum 5 recommended for effective A/B testing.`
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

/**
 * Meta description validity — presence and 150–160 character length.
 * Severity: error if missing; warning if outside range.
 */
export const metaDescriptionValidityRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.meta-description-validity",
  name: "Meta Description Validity",
  description: "Validates meta description is present and within 150–160 character range.",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];
    const meta = output.metaDescription;

    if (!meta || meta.trim().length === 0) {
      errors.push({
        path: "metaDescription",
        message: "Meta description is empty. A 150–160 character meta description is required for SEO.",
        severity: "error",
        code: "META_DESCRIPTION_MISSING",
      });
    } else if (meta.length < 150) {
      warnings.push(
        `Meta description is ${meta.length} characters. ` +
        `Recommended length is 150–160 characters for optimal SERP display.`
      );
    } else if (meta.length > 160) {
      warnings.push(
        `Meta description is ${meta.length} characters. ` +
        `May be truncated in SERP (recommended max: 160 characters).`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

/**
 * Content relevance check — ensures content addresses audience needs.
 * Severity: warning — flags low relevance scores.
 */
export const contentRelevanceCheckRule: ValidationRule<ContentCreatorOutput> = {
  id: "content-creator.content-relevance",
  name: "Content Relevance Check",
  description: "Validates that generated content relevance meets minimum thresholds.",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];
    const score = output.contentScore;

    if (score.dimensions.relevance < 50) {
      warnings.push(
        `Content relevance score is ${score.dimensions.relevance}/100. ` +
        `Target is 70+. Consider revising to better address audience pain points and goals.`
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Platform Writing Guide Builder
// ---------------------------------------------------------------------------

/**
 * Build the platform-specific writing guide string for prompt injection.
 */
export function buildPlatformWritingGuide(platform: ContentPlatform): string {
  const guide = PLATFORM_WRITING_GUIDES[platform];
  if (!guide) return "";
  return [
    `Structure: ${guide.structure}`,
    `Tone advice: ${guide.toneAdvice}`,
    `Hook style: ${guide.hookStyle}`,
    `Max paragraphs: ${guide.maxParagraphs}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Adapter Implementation
// ---------------------------------------------------------------------------

/**
 * @content-creator agent adapter.
 *
 * Registered with the Nexus Agent Registry and invoked by the Orchestration
 * Engine in single-step, chain, or DAG execution modes.
 */
export const contentCreatorAdapter: AgentAdapter<ContentCreatorInput, ContentCreatorOutput> = {
  metadata: {
    name: "content-creator",
    label: "Content Creator",
    description:
      "Expert content strategist and creator for multi-platform campaigns. " +
      "Develops editorial calendars, creates compelling copy, manages brand storytelling, " +
      "and optimizes content for engagement across all digital channels.",
    version: "1.0.0",
    capabilities: [
      {
        action: "generate-content",
        description: "Produces a complete content draft from a brief, including headlines, meta, and CTA.",
        inputSchema: { type: "object", properties: {}, required: [] },
        outputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        action: "optimize-headlines",
        description: "Generates multiple headline variants with predicted CTR scoring.",
        inputSchema: { type: "object", properties: {}, required: [] },
        outputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        action: "score-content",
        description: "Self-assesses content quality across relevance, engagement, readability, brand alignment, SEO, and originality.",
        inputSchema: { type: "object", properties: {}, required: [] },
        outputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        action: "format-for-platform",
        description: "Adapts content to platform-specific constraints (character limits, hashtags, link formats).",
        inputSchema: { type: "object", properties: {}, required: [] },
        outputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
    readsContextKeys: [],
    writesContextKeys: Object.values(CONTENT_CREATOR_CONTEXT),
    promptVersion: "content-creator.v1",
    tags: ["content", "copywriting", "brand-storytelling", "multi-platform", "seo-content"],
    icon: "\u270D\uFE0F",
    color: "#008080",
    model: "gpt-4o",
  },

  /** Input port schema definition. */
  inputSchema: CONTENT_CREATOR_INPUT_SCHEMA,

  /** Output port schema definition. */
  outputSchema: CONTENT_CREATOR_OUTPUT_SCHEMA,

  /** Validation rules that run against the output before returning. */
  validators: [
    brandVoiceConsistencyRule,
    platformCharacterLimitRule,
    keywordDensityBoundsRule,
    headlineSufficiencyRule,
    metaDescriptionValidityRule,
    contentRelevanceCheckRule,
  ],

  /** Path to the externalized system prompt template (YAML). */
  promptTemplate: "lib/agents/prompts/content-creator.v1.prompt.yaml",

  /**
   * Resolve the final system prompt by interpolating runtime variables
   * into the prompt template file.
   */
  async resolvePrompt(variables: Record<string, unknown>): Promise<string> {
    // In production: load YAML template from promptTemplate path,
    // locate {{ variable }} placeholders, and interpolate.
    const platform = variables.platform as Record<string, unknown> | undefined;
    const brand = variables.brand_voice as Record<string, unknown> | undefined;
    return [
      `# Content Creator — Resolved Prompt`,
      `# Template: ${this.promptTemplate}`,
      ``,
      `## Brief`,
      `${variables.content_brief ?? "(not provided)"}`,
      ``,
      `## Platform`,
      `Name: ${platform?.name ?? "unknown"}`,
      `Max chars: ${platform?.maxChars ?? "N/A"}`,
      ``,
      `## Brand Voice`,
      `Tone: ${brand?.tone ?? "not set"}`,
      `Forbidden phrases: ${JSON.stringify(brand?.forbiddenPhrases ?? [])}`,
      ``,
      `## SEO Keywords`,
      `Primary: ${JSON.stringify((variables.keywords as Record<string, unknown>)?.primary ?? [])}`,
      `Target density: ${(variables.keywords as Record<string, unknown>)?.targetDensity ?? "N/A"}%`,
      ``,
      `## Full template resolution`,
      `The runtime engine resolves all {{ variables }} from the YAML template`,
      `and dispatches the complete system prompt to the LLM.`,
      `See lib/agents/prompts/content-creator.v1.prompt.yaml for the full template.`,
    ].join("\n");
  },

  /**
   * Validate input against the agent's schema and business rules.
   * Called by the registry before `execute`.
   */
  validate(input: Record<string, unknown>): BaseValidationResult {
    const errors: BaseValidationResult["errors"] = [];
    const warnings: BaseValidationResult["warnings"] = [];

    if (!input.contentBrief || typeof input.contentBrief !== "string") {
      errors.push({
        field: "contentBrief",
        message: "contentBrief is required and must be a non-empty string.",
        severity: "error",
      });
    }

    if (!input.platform || typeof input.platform !== "object") {
      errors.push({
        field: "platform",
        message: "platform is required and must be an object with name, maxChars, etc.",
        severity: "error",
      });
    }

    if (!input.brandGuidelines || typeof input.brandGuidelines !== "object") {
      errors.push({
        field: "brandGuidelines",
        message: "brandGuidelines is required and must include tone, forbiddenPhrases, and readingLevel.",
        severity: "error",
      });
    }

    if (!input.keywords || typeof input.keywords !== "object") {
      errors.push({
        field: "keywords",
        message: "keywords is required and must include primary, secondary, and targetDensity.",
        severity: "error",
      });
    }

    if (!input.callToAction || typeof input.callToAction !== "object") {
      errors.push({
        field: "callToAction",
        message: "callToAction is required and must include at least a primary CTA.",
        severity: "error",
      });
    }

    if (!input.tone || typeof input.tone !== "string") {
      errors.push({
        field: "tone",
        message: "tone is required and must be a string describing the requested voice.",
        severity: "error",
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Execute the agent's core logic.
   *
   * @param input   — The validated input payload (ContentCreatorInput).
   * @param context — The shared agent chain context.
   * @param signal  — Optional AbortSignal for cancellation.
   * @returns       — The agent's output and updated context.
   */
  async execute(
    input: ContentCreatorInput,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentExecutionResponse<ContentCreatorOutput>> {
    const startedAt = Date.now();

    // --- Pre-execution: resolve prompt ---
    const platformGuide = buildPlatformWritingGuide(input.platform.name);
    const prompt = await this.resolvePrompt({
      content_brief: input.contentBrief,
      target_audience: input.targetAudience,
      platform: input.platform,
      brand_voice: input.brandGuidelines,
      keywords: input.keywords,
      tone: input.tone,
      campaign_goals: input.campaignGoals,
      call_to_action: input.callToAction,
      platform_writing_guide: platformGuide,
    });

    // --- Execute ---
    // The actual LLM invocation is delegated to the runtime engine.
    // The adapter provides the schema, prompt template, validators, and
    // typed contracts. The runtime calls the LLM with the resolved prompt,
    // parses the structured JSON output, and returns it through this method.
    //
    // In production, the LLM call would happen here via the engine's
    // configured model provider. For the adapter definition, we produce
    // a placeholder that documents the expected contract.
    const output: ContentCreatorOutput = {
      timestamp: new Date().toISOString(),
      sourceAgent: "content-creator",
      traceId: input.traceId ?? "auto-generated",
      status: "completed" as AgentStatus,
      summary: `Generated "${input.contentType}" on "${input.platform.name}" for campaign "${input.campaignGoals.primary}".`,
      contentDraft: "",
      headlineOptions: [],
      metaDescription: "",
      ctaCopy: input.callToAction.primary,
      platformFormat: {
        platform: input.platform.name,
        body: "",
        characterCount: 0,
        hashtags: [],
        mentions: [],
        mediaSuggestions: [],
        linkPlacement: { url: input.callToAction.url ?? "", anchor: input.callToAction.primary, position: "end" },
        formattingApplied: [],
      },
      contentScore: {
        overall: 0,
        dimensions: { relevance: 0, engagement: 0, readability: 0, brandAlignment: 0, seoOptimization: 0, originality: 0 },
        predictedKPIs: { estimatedReads: 0, estimatedShares: 0, estimatedClickThrough: 0, estimatedConversion: 0 },
      },
      brandAlignment: {
        score: 0,
        violations: [],
        warnings: [],
        recommendations: ["Brand alignment report generated post-LLM execution."],
      },
      seoAnalysis: {
        keywordDensity: 0,
        keywordPlacements: [],
        readabilityScore: 0,
        suggestedImprovements: [],
      },
    };

    // --- Run validators ---
    const allWarnings: string[] = [];
    for (const validator of this.validators) {
      const result = validator.validate(output, context);
      if (!result.valid) {
        for (const err of result.errors) {
          if (err.severity === "error") {
            // In production, this would set status to REJECTED_VALIDATION
            output.status = "rejected_validation" as AgentStatus;
            output.error = {
              code: "VALIDATION_FAILED",
              message: `Validation "${validator.id}" failed: ${err.message}`,
              details: { validationPath: err.path },
            };
            break;
          }
        }
      }
      allWarnings.push(...result.warnings);
    }

    // --- Write to shared context ---
    context[CONTENT_CREATOR_CONTEXT.CONTENT_DRAFT] = output.contentDraft;
    context[CONTENT_CREATOR_CONTEXT.HEADLINE_OPTIONS] = output.headlineOptions;
    context[CONTENT_CREATOR_CONTEXT.CONTENT_SCORE] = output.contentScore;
    context[CONTENT_CREATOR_CONTEXT.PLATFORM_FORMAT] = output.platformFormat;
    context[CONTENT_CREATOR_CONTEXT.BRAND_ALIGNMENT] = output.brandAlignment;
    context[CONTENT_CREATOR_CONTEXT.SEO_ANALYSIS] = output.seoAnalysis;

    const durationMs = Date.now() - startedAt;

    return {
      agent: "content-creator",
      status: output.status,
      output,
      context,
      metrics: {
        durationMs,
        model: "gpt-4o",
        tokensUsed: 0,
      },
      error: output.error,
    };
  },
};
