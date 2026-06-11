// ============================================================================
// Content Creator — Agent Adapter Interface
// ============================================================================
// Agent Registry Contract for the @content-creator agent.
// Produces multi-platform content drafts, headline variants, meta descriptions,
// CTAs, and self-assessed quality scores from a brief, audience,
// brand guidelines, SEO keywords, and campaign goals.
//
// Input:  contentBrief, targetAudience, platform, brandGuidelines,
//         keywords, tone, campaignGoals
// Output: contentDraft, headlineVariants[], metaDescription, cta,
//         contentScore, platformFormat
//
// Context READ:  seoBrief, keywordMap, topicClusters, trendingTopics
// Context WRITE: contentDraft, contentMetadata, wordCount, readabilityScore
// ============================================================================

import { randomUUID } from "node:crypto";

// ============================================================================
// IAgentAdapter — Base contract for all AgentRunner adapters
// ============================================================================

/**
 * Every agent adapter in the AgentRunner system must implement this contract.
 *
 * @typeParam TInput  — The typed input payload for this agent.
 * @typeParam TOutput — The typed output payload for this agent.
 */
export interface IAgentAdapter<TInput, TOutput> {
  /** Canonical agent identifier (e.g. "@content-creator"). */
  readonly agentId: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Context keys this adapter reads from the shared execution context. */
  readonly readsContextKeys: readonly string[];

  /** Context keys this adapter writes to the shared execution context. */
  readonly writesContextKeys: readonly string[];

  /**
   * Validate raw input against the agent's schema and business rules.
   * Called by the AgentRunner before `execute`.
   */
  validate(input: Record<string, unknown>): ContentCreatorValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   — The validated typed input.
   * @param context — Shared execution context (readable/writable key-value store).
   * @returns       — AgentResult wrapping the typed output with timing and status.
   */
  execute(
    input: TInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<TOutput>>;
}

// ============================================================================
// AgentResult — Execution result envelope
// ============================================================================

export type AgentStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "timed_out"
  | "circuit_broken";

export interface AgentResult<TData = unknown> {
  /** Unique execution ID (UUID v4). */
  runId: string;
  /** ISO-8601 timestamp of execution completion. */
  timestamp: string;
  /** Wall-clock execution duration in milliseconds. */
  durationMs: number;
  /** Final execution status. */
  status: AgentStatus;
  /** The typed output payload on success. */
  output: TData | null;
  /** Human-readable error message if failed. */
  error: string | null;
  /** Validation result from pre-execution checks. */
  validation: ContentCreatorValidationResult | null;
  /** Ephemeral metadata for telemetry and debugging. */
  meta: Record<string, unknown>;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ContentCreatorValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ContentCreatorValidationWarning {
  field: string;
  message: string;
  severity: "warning";
}

export interface ContentCreatorValidationResult {
  valid: boolean;
  errors: ContentCreatorValidationError[];
  warnings: ContentCreatorValidationWarning[];
}

// ============================================================================
// Target Platform
// ============================================================================

/**
 * Supported content distribution platforms.
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
  | "reddit"
  | "youtube"
  | "tiktok"
  | "podcast";

/**
 * All valid platform identifiers.
 */
const VALID_PLATFORMS: readonly ContentPlatform[] = [
  "blog",
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "email",
  "newsletter",
  "medium",
  "reddit",
  "youtube",
  "tiktok",
  "podcast",
];

// ============================================================================
// Input Schema — ContentCreatorInput
// ============================================================================

export interface AudienceProfile {
  demographics: {
    ageRange?: [number, number];
    location?: string;
    languages?: string[];
  };
  interests: string[];
  painPoints: string[];
  goals: string[];
  contentPreferences: string[];
}

export interface BrandVoiceProfile {
  tone: string;
  values: string[];
  forbiddenPhrases: string[];
  requiredPhrases: string[];
  readingLevel: "basic" | "intermediate" | "advanced";
}

export interface SEOKeywordMap {
  primary: string[];
  secondary: string[];
  longTail: string[];
  intent: "informational" | "commercial" | "transactional" | "navigational";
  targetDensity: number;
}

export interface CampaignGoal {
  stage: "awareness" | "consideration" | "conversion" | "retention" | "advocacy";
  kpis: string[];
  targetMetrics: Record<string, number>;
}

/**
 * Full input payload for the @content-creator agent.
 */
export interface ContentCreatorInput {
  /** Core editorial brief describing what to write about. */
  contentBrief: string;

  /** Target audience definition. */
  targetAudience: AudienceProfile;

  /** Target platform for content distribution. */
  platform: ContentPlatform;

  /** Brand voice and messaging guidelines. */
  brandGuidelines: BrandVoiceProfile;

  /** SEO keyword map (typically from @seo-specialist). */
  keywords: SEOKeywordMap;

  /** Requested tone / persona for this piece (e.g. "inspiring and practical"). */
  tone: string;

  /** Campaign goals and success metrics. */
  campaignGoals: CampaignGoal;
}

// ============================================================================
// Output Schema — ContentCreatorOutput
// ============================================================================

export interface HeadlineVariant {
  headline: string;
  characterCount: number;
  includesPrimaryKeyword: boolean;
  emotionalAppeal: string;
  predictedCTR: number;
}

export interface ContentScore {
  overall: number;
  dimensions: {
    relevance: number;
    engagement: number;
    readability: number;
    brandAlignment: number;
    seoOptimization: number;
  };
}

export interface PlatformFormat {
  platform: ContentPlatform;
  body: string;
  characterCount: number;
  hashtags: string[];
  mentions: string[];
  linkPlacement: {
    url: string;
    anchor: string;
    position: "beginning" | "middle" | "end";
  };
  formattingApplied: string[];
  mediaSuggestions: string[];
}

export interface ContentMetadata {
  wordCount: number;
  readingTimeMinutes: number;
  readabilityScore: number;
  keywordDensity: number;
}

/**
 * Full output payload from the @content-creator agent.
 */
export interface ContentCreatorOutput {
  /** Complete content draft ready for the target platform. */
  contentDraft: string;

  /** Headline variants with performance predictions (minimum 5). */
  headlineVariants: HeadlineVariant[];

  /** SEO-optimized meta description (150-160 characters). */
  metaDescription: string;

  /** Primary call-to-action copy. */
  cta: string;

  /** Self-assessed content quality score. */
  contentScore: ContentScore;

  /** Platform-tailored format specification. */
  platformFormat: PlatformFormat;

  /** Content metadata for downstream processing. */
  metadata: ContentMetadata;
}

// ============================================================================
// Context Key Constants
// ============================================================================

export const CONTENT_CREATOR_READS = [
  "seoBrief",
  "keywordMap",
  "topicClusters",
  "trendingTopics",
] as const;

export const CONTENT_CREATOR_WRITES = [
  "contentDraft",
  "contentMetadata",
  "wordCount",
  "readabilityScore",
] as const;

// ============================================================================
// Adapter Implementation
// ============================================================================

/**
 * @content-creator agent adapter.
 *
 * Registered with the AgentRunner system and invoked in single-step,
 * chain, or graph execution modes.
 */
export class ContentCreatorAdapter
  implements IAgentAdapter<ContentCreatorInput, ContentCreatorOutput>
{
  readonly agentId = "@content-creator";
  readonly version = "1.0.0";
  readonly readsContextKeys: readonly string[] = CONTENT_CREATOR_READS;
  readonly writesContextKeys: readonly string[] = CONTENT_CREATOR_WRITES;

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validate raw input against the agent's schema and business rules.
   *
   * Checks:
   * 1. `contentBrief` — must be a non-empty string
   * 2. `platform`     — must be a supported platform identifier
   * 3. `brandGuidelines` — must be a non-null object with required fields
   */
  validate(input: Record<string, unknown>): ContentCreatorValidationResult {
    const errors: ContentCreatorValidationError[] = [];
    const warnings: ContentCreatorValidationWarning[] = [];

    // --- contentBrief ---
    if (
      !input.contentBrief ||
      typeof input.contentBrief !== "string" ||
      input.contentBrief.trim().length === 0
    ) {
      errors.push({
        field: "contentBrief",
        message:
          "contentBrief is required and must be a non-empty string describing the editorial brief.",
        severity: "error",
      });
    }

    // --- platform ---
    if (!input.platform || typeof input.platform !== "string") {
      errors.push({
        field: "platform",
        message:
          "platform is required and must be a string identifying the target distribution platform.",
        severity: "error",
      });
    } else if (
      !VALID_PLATFORMS.includes(input.platform as ContentPlatform)
    ) {
      errors.push({
        field: "platform",
        message:
          `platform "${input.platform}" is not supported. ` +
          `Valid platforms: ${VALID_PLATFORMS.join(", ")}.`,
        severity: "error",
      });
    }

    // --- brandGuidelines ---
    if (
      !input.brandGuidelines ||
      typeof input.brandGuidelines !== "object" ||
      input.brandGuidelines === null
    ) {
      errors.push({
        field: "brandGuidelines",
        message:
          "brandGuidelines is required and must be an object with tone, values, forbiddenPhrases, requiredPhrases, and readingLevel.",
        severity: "error",
      });
    } else {
      const bg = input.brandGuidelines as Record<string, unknown>;

      if (!bg.tone || typeof bg.tone !== "string") {
        errors.push({
          field: "brandGuidelines.tone",
          message:
            "brandGuidelines.tone is required and must be a string (e.g. 'professional', 'conversational').",
          severity: "error",
        });
      }

      if (!Array.isArray(bg.values) || bg.values.length === 0) {
        errors.push({
          field: "brandGuidelines.values",
          message:
            "brandGuidelines.values is required and must be a non-empty array of brand value strings.",
          severity: "error",
        });
      }

      if (!Array.isArray(bg.forbiddenPhrases)) {
        errors.push({
          field: "brandGuidelines.forbiddenPhrases",
          message:
            "brandGuidelines.forbiddenPhrases is required and must be an array of phrase strings.",
          severity: "error",
        });
      }

      if (!Array.isArray(bg.requiredPhrases)) {
        errors.push({
          field: "brandGuidelines.requiredPhrases",
          message:
            "brandGuidelines.requiredPhrases is required and must be an array of phrase strings.",
          severity: "error",
        });
      }

      const validLevels = ["basic", "intermediate", "advanced"];
      if (
        !bg.readingLevel ||
        typeof bg.readingLevel !== "string" ||
        !validLevels.includes(bg.readingLevel)
      ) {
        errors.push({
          field: "brandGuidelines.readingLevel",
          message:
            "brandGuidelines.readingLevel is required and must be one of: basic, intermediate, advanced.",
          severity: "error",
        });
      }
    }

    // --- warnings for optional but recommended fields ---
    if (!input.targetAudience || typeof input.targetAudience !== "object") {
      warnings.push({
        field: "targetAudience",
        message:
          "targetAudience is missing. Content will be generated without audience targeting — relevance may be reduced.",
        severity: "warning",
      });
    }

    if (!input.keywords || typeof input.keywords !== "object") {
      warnings.push({
        field: "keywords",
        message:
          "keywords is missing. Content will be generated without SEO keyword guidance — organic discovery may be suboptimal.",
        severity: "warning",
      });
    }

    if (!input.tone || typeof input.tone !== "string") {
      warnings.push({
        field: "tone",
        message:
          "tone is missing. Content will use a default neutral tone.",
        severity: "warning",
      });
    }

    if (!input.campaignGoals || typeof input.campaignGoals !== "object") {
      warnings.push({
        field: "campaignGoals",
        message:
          "campaignGoals is missing. Content will be generated without campaign-specific optimization.",
        severity: "warning",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================================================
  // Execution
  // ========================================================================

  /**
   * Execute the content creator agent.
   *
   * In production, this method:
   * 1. Resolves the prompt template with input variables
   * 2. Calls the configured LLM provider with the resolved prompt
   * 3. Parses the structured JSON response
   * 4. Validates the output against business rules
   * 5. Writes context keys for downstream agents
   *
   * @param input   — Validated ContentCreatorInput payload.
   * @param context — Shared execution context. Reads: seoBrief, keywordMap,
   *                  topicClusters, trendingTopics. Writes: contentDraft,
   *                  contentMetadata, wordCount, readabilityScore.
   * @returns       — AgentResult with the generated content output.
   */
  async execute(
    input: ContentCreatorInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<ContentCreatorOutput>> {
    const startedAt = Date.now();
    const runId = randomUUID();

    try {
      // ---- Resolve prompt variables from input + context ----
      const seoBrief = context.seoBrief ?? null;
      const keywordMap = context.keywordMap ?? null;
      const topicClusters = context.topicClusters ?? null;
      const trendingTopics = context.trendingTopics ?? null;

      // ---- Stub: LLM invocation placeholder ----
      // In production, the resolved prompt is dispatched to the model provider
      // (e.g. OpenAI, Anthropic, or local model). The response is parsed into
      // the structured ContentCreatorOutput shape.
      //
      // Example invocation:
      //   const llmResponse = await modelProvider.generate({
      //     systemPrompt: resolvedPrompt,
      //     temperature: 0.7,
      //     maxTokens: 4000,
      //   });
      //   const output = ContentCreatorOutputSchema.parse(llmResponse.choices[0].message.content);

      const durationMs = Date.now() - startedAt;
      const now = new Date().toISOString();

      // Stub output — demonstrates the full contract shape
      const output: ContentCreatorOutput = {
        contentDraft: "",
        headlineVariants: [],
        metaDescription: "",
        cta: input.campaignGoals?.kpis?.[0] ?? "",
        contentScore: {
          overall: 0,
          dimensions: {
            relevance: 0,
            engagement: 0,
            readability: 0,
            brandAlignment: 0,
            seoOptimization: 0,
          },
        },
        platformFormat: {
          platform: input.platform,
          body: "",
          characterCount: 0,
          hashtags: [],
          mentions: [],
          linkPlacement: {
            url: "",
            anchor: "",
            position: "end",
          },
          formattingApplied: [],
          mediaSuggestions: [],
        },
        metadata: {
          wordCount: 0,
          readingTimeMinutes: 0,
          readabilityScore: 0,
          keywordDensity: 0,
        },
      };

      // ---- Write context keys for downstream agents ----
      context.contentDraft = output.contentDraft;
      context.contentMetadata = output.metadata;
      context.wordCount = output.metadata.wordCount;
      context.readabilityScore = output.metadata.readabilityScore;

      return {
        runId,
        timestamp: now,
        durationMs,
        status: "completed",
        output,
        error: null,
        validation: null,
        meta: {
          agentId: this.agentId,
          version: this.version,
          platform: input.platform,
          briefLength: input.contentBrief.length,
          contextKeysRead: this.readsContextKeys,
          contextKeysWritten: this.writesContextKeys,
        },
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const now = new Date().toISOString();
      const message =
        err instanceof Error ? err.message : "Unknown execution error";

      return {
        runId,
        timestamp: now,
        durationMs,
        status: "failed",
        output: null,
        error: message,
        validation: null,
        meta: {
          agentId: this.agentId,
          version: this.version,
          errorStack: err instanceof Error ? err.stack : undefined,
        },
      };
    }
  }
}

export default ContentCreatorAdapter;
