// ============================================================================
// Social Media Strategist — AgentAdapter Interface for AgentRunner System
// ============================================================================
// Defines the IAgentAdapter contract and the concrete SocialMediaStrategistAdapter
// implementation used by the AgentRunner (engine/core/agent-runner.ts).
//
// Context READ:  [contentDraft, contentMetadata, keywordMap, trendingTopics]
// Context WRITE: [socialStrategy, platformAssignments, postingSchedule, hashtagSets]
// ============================================================================

import type { AgentResult, AgentStatus } from "@/engine/types/agent-types";
import type { AgentContext } from "@/lib/agents/types";
import { v4 as uuid } from "uuid";

// ============================================================================
// IAgentAdapter — Generic contract for all agents in the AgentRunner system
// ============================================================================

/**
 * Validation outcome returned by `validate()`.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Generic agent adapter interface for the AgentRunner execution system.
 *
 * @typeParam TIn  — The typed input schema for this agent.
 * @typeParam TOut — The typed output schema for this agent.
 */
export interface IAgentAdapter<TIn = Record<string, unknown>, TOut = Record<string, unknown>> {
  /** Canonical agent identifier (e.g. "@social-media-strategist"). */
  readonly agentId: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Context keys this agent reads from the shared orchestration context. */
  readonly readsContextKeys: readonly string[];

  /** Context keys this agent writes to the shared orchestration context. */
  readonly writesContextKeys: readonly string[];

  /**
   * Validate raw input against the agent's schema and business rules.
   * Called by the AgentRunner before `execute()`.
   */
  validate(input: unknown): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   — The validated typed input payload.
   * @param context — The shared orchestration context (read/write via keys).
   * @returns       — An AgentResult wrapping the typed output or error.
   */
  execute(input: TIn, context: AgentContext): Promise<AgentResult<TOut>>;
}

// ============================================================================
// Shared / Reference Types
// ============================================================================

/**
 * Supported social platforms for campaign distribution.
 */
export type SocialPlatform = "linkedin" | "twitter" | "instagram" | "reddit" | "facebook";

/**
 * The nature or category of the content asset.
 */
export type ContentAssetType =
  | "blog_post"
  | "article"
  | "video"
  | "podcast"
  | "infographic"
  | "carousel"
  | "social_post"
  | "newsletter"
  | "whitepaper"
  | "case_study"
  | "webinar"
  | "data_report";

/**
 * A content asset produced upstream (typically by @content-creator).
 */
export interface ContentAsset {
  id: string;
  type: ContentAssetType;
  title: string;
  body: string;
  mediaUrls?: string[];
  keyTakeaways: string[];
  targetAudience?: string;
  seoKeywords?: string[];
  estimatedReadTimeMinutes?: number;
}

/**
 * Campaign objective tied to measurable business outcomes.
 */
export type CampaignObjective =
  | "brand_awareness"
  | "lead_generation"
  | "thought_leadership"
  | "community_building"
  | "product_launch"
  | "event_promotion"
  | "recruitment_branding"
  | "sales_enablement"
  | "crisis_management"
  | "employee_advocacy";

/**
 * Audience segment descriptor for platform targeting.
 */
export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  platformPriorities: Partial<Record<SocialPlatform, number>>;
  demographicProfile?: Record<string, string>;
  interestTags?: string[];
  estimatedSize?: number;
}

/**
 * A single scheduled posting slot.
 */
export interface PostingSlot {
  platform: SocialPlatform;
  dateTime: string;
  contentVariantId?: string;
  purpose: string;
}

/**
 * Historical engagement record for content performance learning.
 */
export interface EngagementRecord {
  contentId: string;
  platform: SocialPlatform;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  saves: number;
  engagementRate: number;
  publishedAt: string;
  sentiment?: "positive" | "neutral" | "negative";
  topPerformingKeywords?: string[];
}

// ============================================================================
// SocialMediaInput — Agent Input Schema
// ============================================================================

/**
 * Everything the @social-media-strategist agent receives to produce
 * a cross-platform social strategy.
 */
export interface SocialMediaInput {
  /** Primary platforms to target (first = highest priority). */
  platformTargets: SocialPlatform[];

  /** Content assets handed off from @content-creator or upstream. */
  contentAssets: ContentAsset[];

  /** Campaign objectives being pursued (one or more). */
  campaignObjectives: CampaignObjective[];

  /** Target audience segments with platform priorities. */
  audienceSegments: AudienceSegment[];

  /** Desired posting schedule constraints. */
  postingSchedule: {
    startDate: string;
    endDate: string;
    frequencyPerWeek: Partial<Record<SocialPlatform, number>>;
    fixedSlots?: PostingSlot[];
    timezone: string;
  };

  /** Historical engagement data to inform strategy. */
  engagementHistory: EngagementRecord[];

  /** Brand voice directive for content adaptation. */
  brandVoice?: string;

  /** Strategic parameters from the orchestrator. */
  context?: {
    campaignId?: string;
    competitorMentionedBrands?: string[];
    budgetAllocation?: Partial<Record<SocialPlatform, number>>;
    promotionalContentRatio?: number;
    amplificationBudget?: number;
  };
}

// ============================================================================
// SocialMediaOutput — Agent Output Schema
// ============================================================================

/**
 * A platform-adapted content variant derived from a source ContentAsset.
 */
export interface PlatformPostVariant {
  sourceAssetId: string;
  platform: SocialPlatform;
  variantId: string;
  body: string;
  characterCount: number;
  mediaAttachments: string[];
  callToAction: string;
  hashtags: string[];
  passesValidation: boolean;
  validationWarnings?: string[];
  voiceAlignmentScore: number;
}

/**
 * A scheduled entry in the publishing calendar.
 */
export interface CalendarEntry {
  slot: PostingSlot;
  variantId: string;
  forecastedEngagementRate: number;
  pillar?: string;
}

/**
 * Tactic to amplify reach and engagement beyond organic.
 */
export interface AmplificationTactic {
  type:
    | "paid_promotion"
    | "employee_advocacy"
    | "influencer_collaboration"
    | "cross_promotion"
    | "community_share"
    | "retargeting"
    | "event_integration";
  description: string;
  platform: SocialPlatform;
  estimatedCost?: number;
  expectedReachMultiplier: number;
  targetVariantIds: string[];
}

/**
 * Community engagement action tied to the campaign.
 */
export interface CommunityEngagementAction {
  platform: SocialPlatform;
  actionType:
    | "reply"
    | "comment"
    | "share"
    | "dm"
    | "group_post"
    | "space_host"
    | "linkedin_article"
    | "newsletter_send";
  frequency: "daily" | "weekly" | "per_post";
  target: string;
  description: string;
  timeAllocationMinutes: number;
}

/**
 * Hashtag strategy per platform.
 */
export interface HashtagStrategyEntry {
  platform: SocialPlatform;
  brandedHashtags: string[];
  industryHashtags: string[];
  campaignHashtags: string[];
  maxPerPost: number;
  tier1Hashtags: string[];
  tier2Hashtags: string[];
  avoidHashtags: string[];
}

/**
 * Forecasted engagement metrics per platform.
 */
export interface EngagementMetricsForecast {
  platform: SocialPlatform;
  totalReach: number;
  totalEngagements: number;
  averageEngagementRate: number;
  followerGrowthProjection: number;
  estimatedLeads: number;
  confidenceInterval: [number, number];
  riskFactors: string[];
}

/**
 * Everything the @social-media-strategist agent produces.
 */
export interface SocialMediaOutput {
  /** Platform-adapted post variants from source content. */
  postVariants: PlatformPostVariant[];

  /** Full content calendar for the campaign period. */
  contentCalendar: CalendarEntry[];

  /** Community engagement actions. */
  communityEngagementPlan: CommunityEngagementAction[];

  /** Platform-specific hashtag strategy. */
  hashtagStrategy: HashtagStrategyEntry[];

  /** Amplification tactics to extend organic reach. */
  amplificationPlan: AmplificationTactic[];

  /** Forecasted engagement metrics per platform. */
  engagementMetricsForecast: EngagementMetricsForecast[];

  /** Cross-platform posting cadence summary. */
  postingCadenceSummary: {
    platform: SocialPlatform;
    postsPerWeek: number;
    bestTimesToPost: string[];
    dayOfWeekWeights: Record<string, number>;
  }[];
}

// ============================================================================
// Context Key Contract
// ============================================================================

/**
 * Keys that @social-media-strategist reads from the orchestration context.
 */
export const SOCIAL_MEDIA_READS = [
  "contentDraft",     // Raw draft text from @content-creator
  "contentMetadata",  // Structured metadata (titles, descriptions, keywords)
  "keywordMap",       // SEO keyword map from @seo-specialist
  "trendingTopics",   // Current trending topics from @trend-researcher
] as const;

/**
 * Keys that @social-media-strategist writes to the orchestration context.
 */
export const SOCIAL_MEDIA_WRITES = [
  "socialStrategy",       // The full strategic plan summary
  "platformAssignments",  // Per-platform content variant assignments
  "postingSchedule",      // The resolved content calendar
  "hashtagSets",          // Hashtag strategy per platform
] as const;

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Per-platform character and media constraints.
 */
const PLATFORM_RULES: Record<
  SocialPlatform,
  { maxChars: number; maxHashtags: number; maxMedia: number }
> = {
  linkedin:   { maxChars: 3000, maxHashtags: 5,  maxMedia: 9 },
  twitter:    { maxChars: 280,  maxHashtags: 3,  maxMedia: 4 },
  instagram:  { maxChars: 2200, maxHashtags: 30, maxMedia: 10 },
  reddit:     { maxChars: 40000, maxHashtags: 0, maxMedia: 0 },
  facebook:   { maxChars: 63206, maxHashtags: 5, maxMedia: 10 },
};

// ============================================================================
// SocialMediaStrategistAdapter — Concrete Implementation
// ============================================================================

/**
 * The @social-media-strategist adapter — implements IAgentAdapter for the
 * AgentRunner system. Handles cross-platform social strategy generation,
 * post variant creation, content calendaring, and amplification planning.
 */
export class SocialMediaStrategistAdapter
  implements IAgentAdapter<SocialMediaInput, SocialMediaOutput>
{
  readonly agentId = "@social-media-strategist";
  readonly version = "0.1.0";

  readonly readsContextKeys = SOCIAL_MEDIA_READS;
  readonly writesContextKeys = SOCIAL_MEDIA_WRITES;

  // ========================================================================
  // validate — Schema & business-rule checks on raw input
  // ========================================================================

  validate(input: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const parsed = input as Partial<SocialMediaInput>;

    // --- Required field checks ---

    if (!parsed.platformTargets || parsed.platformTargets.length === 0) {
      errors.push("platformTargets must be a non-empty array");
    } else {
      const unsupported = parsed.platformTargets.filter(
        (p) => !(p in PLATFORM_RULES),
      );
      if (unsupported.length > 0) {
        errors.push(
          `Unsupported platform(s): ${unsupported.join(", ")}. ` +
          `Supported: ${Object.keys(PLATFORM_RULES).join(", ")}`,
        );
      }
    }

    if (!parsed.campaignObjectives || parsed.campaignObjectives.length === 0) {
      errors.push("campaignObjectives must contain at least one objective");
    }

    if (!parsed.brandVoice && !parsed.context?.brandVoice) {
      warnings.push(
        "brandVoice is empty — falling back to 'professional_authoritative'",
      );
    }

    if (!parsed.contentAssets || parsed.contentAssets.length === 0) {
      errors.push("contentAssets must contain at least one asset");
    }

    if (!parsed.postingSchedule?.startDate || !parsed.postingSchedule?.endDate) {
      errors.push("postingSchedule.startDate and postingSchedule.endDate are required");
    }

    if (!parsed.postingSchedule?.timezone) {
      warnings.push("postingSchedule.timezone is missing — defaulting to UTC");
    }

    // --- Cross-field consistency ---

    if (parsed.platformTargets && parsed.postingSchedule?.frequencyPerWeek) {
      for (const platform of parsed.platformTargets) {
        const freq = parsed.postingSchedule.frequencyPerWeek[platform];
        if (freq !== undefined) {
          const rule = PLATFORM_RULES[platform];
          if (freq < 1) {
            errors.push(
              `${platform} frequencyPerWeek (${freq}) must be >= 1`,
            );
          }
          if (rule && freq > 30) {
            warnings.push(
              `${platform} frequencyPerWeek (${freq}) exceeds 30 — risk of audience fatigue`,
            );
          }
        }
      }
    }

    // --- Posting schedule coherence ---

    if (
      parsed.postingSchedule?.startDate &&
      parsed.postingSchedule?.endDate
    ) {
      const start = new Date(parsed.postingSchedule.startDate).getTime();
      const end = new Date(parsed.postingSchedule.endDate).getTime();
      if (isNaN(start) || isNaN(end)) {
        errors.push("postingSchedule dates must be valid ISO-8601 strings");
      } else if (end <= start) {
        errors.push("postingSchedule.endDate must be after startDate");
      }
    }

    // --- Engagement history quality ---

    if (parsed.engagementHistory && parsed.engagementHistory.length > 0) {
      for (const rec of parsed.engagementHistory) {
        if (rec.impressions < 0 || rec.engagementRate < 0) {
          warnings.push(
            `EngagementRecord "${rec.contentId}" has negative values — data may be incorrect`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ========================================================================
  // execute — Core agent logic stub (integration point for LLM / business logic)
  // ========================================================================

  async execute(
    input: SocialMediaInput,
    _context: AgentContext,
  ): Promise<AgentResult<SocialMediaOutput>> {
    const executionId = uuid();
    const startedAt = new Date().toISOString();

    try {
      // ---- STEP 1: Map source content to platform-adapted variants ----
      const postVariants: PlatformPostVariant[] = [];
      for (const asset of input.contentAssets) {
        for (const platform of input.platformTargets) {
          const variant = this.adaptContentForPlatform(asset, platform, input.brandVoice);
          postVariants.push(variant);
        }
      }

      // ---- STEP 2: Build content calendar ----
      const contentCalendar = this.buildContentCalendar(
        postVariants,
        input.postingSchedule,
      );

      // ---- STEP 3: Derive hashtag strategy ----
      const hashtagStrategy = this.buildHashtagStrategy(input.platformTargets);

      // ---- STEP 4: Define amplification tactics ----
      const amplificationPlan = this.buildAmplificationPlan(
        input.platformTargets,
        input.context?.amplificationBudget,
      );

      // ---- STEP 5: Community engagement plan ----
      const communityEngagementPlan = this.buildCommunityEngagementPlan(
        input.platformTargets,
        input.campaignObjectives,
      );

      // ---- STEP 6: Forecast engagement metrics ----
      const engagementMetricsForecast = this.forecastEngagement(
        input.platformTargets,
        input.engagementHistory,
        postVariants.length,
      );

      // ---- STEP 7: Cadence summary ----
      const postingCadenceSummary = this.buildCadenceSummary(
        input.platformTargets,
        input.postingSchedule.frequencyPerWeek,
      );

      // ---- Assemble output ----
      const output: SocialMediaOutput = {
        postVariants,
        contentCalendar,
        communityEngagementPlan,
        hashtagStrategy,
        amplificationPlan,
        engagementMetricsForecast,
        postingCadenceSummary,
      };

      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      return {
        executionId,
        agentId: this.agentId,
        status: "completed" as AgentStatus,
        data: output,
        error: null,
        errorDetails: null,
        validation: null,
        performance: {
          startedAt,
          completedAt,
          durationMs,
          tokensUsed: undefined,
          retryCount: 0,
        },
        meta: {
          assetCount: input.contentAssets.length,
          platformCount: input.platformTargets.length,
          variantCount: postVariants.length,
        },
      };
    } catch (err) {
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      const message = err instanceof Error ? err.message : String(err);

      return {
        executionId,
        agentId: this.agentId,
        status: "failed" as AgentStatus,
        data: null,
        error: message,
        errorDetails: err instanceof Error ? { stack: err.stack } : null,
        validation: null,
        performance: {
          startedAt,
          completedAt,
          durationMs,
          tokensUsed: undefined,
          retryCount: 0,
        },
        meta: {},
      };
    }
  }

  // ========================================================================
  // Private Helpers (strategy stubs — pluggable with LLM calls)
  // ========================================================================

  /**
   * Adapt a single content asset into a platform-specific post variant.
   */
  private adaptContentForPlatform(
    asset: ContentAsset,
    platform: SocialPlatform,
    brandVoice?: string,
  ): PlatformPostVariant {
    const rules = PLATFORM_RULES[platform];
    const voiceGuidance = brandVoice ?? "professional_authoritative";

    // Truncate body to platform max characters, preserving key takeaways
    let body = `${asset.title}\n\n${asset.keyTakeaways.join("\n")}`;
    if (body.length > rules.maxChars) {
      body = body.slice(0, rules.maxChars - 3) + "...";
    }

    return {
      sourceAssetId: asset.id,
      platform,
      variantId: `${asset.id}--${platform}--${Date.now()}`,
      body,
      characterCount: body.length,
      mediaAttachments: asset.mediaUrls ?? [],
      callToAction: this.getDefaultCta(platform),
      hashtags: [],
      passesValidation: body.length <= rules.maxChars,
      voiceAlignmentScore: 0.85, // placeholder — LLM scoring replaces this
    };
  }

  /**
   * Build a content calendar spanning the campaign period.
   */
  private buildContentCalendar(
    variants: PlatformPostVariant[],
    schedule: SocialMediaInput["postingSchedule"],
  ): CalendarEntry[] {
    const calendar: CalendarEntry[] = [];
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const freq = schedule.frequencyPerWeek;

    // Distribute variants across the campaign period per-platform
    for (const platform of Object.keys(freq) as SocialPlatform[]) {
      const postsPerWeek = freq[platform] ?? 3;
      const platformVariants = variants.filter((v) => v.platform === platform);
      if (platformVariants.length === 0) continue;

      let variantIndex = 0;
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
        // Skip weekends for LinkedIn
        if (platform === "linkedin" && (dayOfWeek === 0 || dayOfWeek === 6)) {
          current.setDate(current.getDate() + 1);
          continue;
        }

        const variant = platformVariants[variantIndex % platformVariants.length];
        calendar.push({
          slot: {
            platform,
            dateTime: current.toISOString(),
            contentVariantId: variant.variantId,
            purpose: "promotional",
          },
          variantId: variant.variantId,
          forecastedEngagementRate: this.estimateEngagementRate(platform),
          pillar: "content",
        });

        variantIndex++;
        // Skip days to match postsPerWeek target
        current.setDate(current.getDate() + Math.max(1, Math.floor(7 / postsPerWeek)));
      }
    }

    // Include fixed slots if provided
    if (schedule.fixedSlots) {
      for (const slot of schedule.fixedSlots) {
        const match = variants.find((v) => v.platform === slot.platform);
        if (match) {
          calendar.push({
            slot,
            variantId: match.variantId,
            forecastedEngagementRate: this.estimateEngagementRate(slot.platform),
            pillar: "fixed",
          });
        }
      }
    }

    // Sort chronologically
    calendar.sort(
      (a, b) => new Date(a.slot.dateTime).getTime() - new Date(b.slot.dateTime).getTime(),
    );

    return calendar;
  }

  /**
   * Build hashtag strategy per platform.
   */
  private buildHashtagStrategy(platforms: SocialPlatform[]): HashtagStrategyEntry[] {
    return platforms.map((platform) => {
      const strategy: HashtagStrategyEntry = {
        platform,
        brandedHashtags: ["#NexusAgent"],
        industryHashtags: [
          "#AgentOrchestration",
          "#MultiAgentSystems",
          "#AIAgents",
        ],
        campaignHashtags: [],
        maxPerPost: PLATFORM_RULES[platform].maxHashtags,
        tier1Hashtags: [],
        tier2Hashtags: [],
        avoidHashtags: [],
      };

      if (platform === "reddit") {
        strategy.brandedHashtags = [];
        strategy.industryHashtags = [];
        strategy.avoidHashtags = ["#sponsored", "#ad"];
      }

      return strategy;
    });
  }

  /**
   * Build amplification plan based on platform targets and budget.
   */
  private buildAmplificationPlan(
    platforms: SocialPlatform[],
    budget?: number,
  ): AmplificationTactic[] {
    const plan: AmplificationTactic[] = [];
    const totalBudget = budget ?? 5000;

    for (const platform of platforms) {
      if (platform === "linkedin") {
        plan.push({
          type: "paid_promotion",
          description: "LinkedIn Sponsored Content — top 2 variants",
          platform,
          estimatedCost: totalBudget * 0.4,
          expectedReachMultiplier: 3.5,
          targetVariantIds: [],
        });
        plan.push({
          type: "employee_advocacy",
          description: "Activate executive team to reshare top posts",
          platform,
          estimatedCost: 0,
          expectedReachMultiplier: 2.0,
          targetVariantIds: [],
        });
      } else if (platform === "twitter") {
        plan.push({
          type: "cross_promotion",
          description: "Pin campaign thread and cross-link from LinkedIn",
          platform,
          estimatedCost: 0,
          expectedReachMultiplier: 1.5,
          targetVariantIds: [],
        });
      } else if (platform === "instagram") {
        plan.push({
          type: "influencer_collaboration",
          description: "Partner with 2 industry micro-influencers",
          platform,
          estimatedCost: totalBudget * 0.3,
          expectedReachMultiplier: 4.0,
          targetVariantIds: [],
        });
      }
    }

    return plan;
  }

  /**
   * Build community engagement actions.
   */
  private buildCommunityEngagementPlan(
    platforms: SocialPlatform[],
    objectives: CampaignObjective[],
  ): CommunityEngagementAction[] {
    const actions: CommunityEngagementAction[] = [];

    for (const platform of platforms) {
      actions.push({
        platform,
        actionType: "reply",
        frequency: "daily",
        target: "@mentions and post comments",
        description: "Respond to all comments and mentions within 4 hours",
        timeAllocationMinutes: 30,
      });

      if (objectives.includes("thought_leadership") && platform === "linkedin") {
        actions.push({
          platform,
          actionType: "linkedin_article",
          frequency: "weekly",
          target: "Industry thought leaders and target accounts",
          description: "Publish one long-form LinkedIn article per week",
          timeAllocationMinutes: 90,
        });
      }

      if (platform === "twitter") {
        actions.push({
          platform,
          actionType: "share",
          frequency: "daily",
          target: "Industry hashtags and trending topics",
          description: "Share and quote relevant industry content",
          timeAllocationMinutes: 15,
        });
      }
    }

    return actions;
  }

  /**
   * Forecast engagement metrics based on historical data.
   */
  private forecastEngagement(
    platforms: SocialPlatform[],
    history: EngagementRecord[],
    variantCount: number,
  ): EngagementMetricsForecast[] {
    return platforms.map((platform) => {
      const platformHistory = history.filter((r) => r.platform === platform);
      const avgEngagementRate =
        platformHistory.length > 0
          ? platformHistory.reduce((sum, r) => sum + r.engagementRate, 0) /
            platformHistory.length
          : 0.03; // default 3% if no history

      const avgReachPerPost =
        platformHistory.length > 0
          ? platformHistory.reduce((sum, r) => sum + r.impressions, 0) /
            platformHistory.length
          : 1000;

      return {
        platform,
        totalReach: Math.round(avgReachPerPost * variantCount * 1.2),
        totalEngagements: Math.round(
          avgReachPerPost * variantCount * 1.2 * avgEngagementRate,
        ),
        averageEngagementRate: avgEngagementRate,
        followerGrowthProjection: Math.round(variantCount * 15),
        estimatedLeads: Math.round(variantCount * 2.5),
        confidenceInterval: [
          Math.max(0, avgEngagementRate - 0.015),
          Math.min(1, avgEngagementRate + 0.015),
        ],
        riskFactors: [],
      };
    });
  }

  /**
   * Build per-platform cadence summary.
   */
  private buildCadenceSummary(
    platforms: SocialPlatform[],
    frequencyPerWeek: Partial<Record<SocialPlatform, number>>,
  ): SocialMediaOutput["postingCadenceSummary"] {
    const bestTimes: Record<SocialPlatform, string[]> = {
      linkedin: ["08:00", "10:00", "12:00"],
      twitter: ["08:00", "12:00", "17:00"],
      instagram: ["11:00", "13:00", "19:00"],
      reddit: ["14:00", "16:00"],
      facebook: ["09:00", "11:00", "14:00"],
    };

    const dayWeights: Record<string, number> = {
      monday: 0.9,
      tuesday: 1.0,
      wednesday: 1.0,
      thursday: 1.0,
      friday: 0.8,
      saturday: 0.4,
      sunday: 0.3,
    };

    return platforms.map((platform) => ({
      platform,
      postsPerWeek: frequencyPerWeek[platform] ?? 3,
      bestTimesToPost: bestTimes[platform],
      dayOfWeekWeights: { ...dayWeights },
    }));
  }

  /**
   * Default CTA tailored to platform norms.
   */
  private getDefaultCta(platform: SocialPlatform): string {
    switch (platform) {
      case "linkedin":
        return "Share your thoughts in the comments";
      case "twitter":
        return "Retweet to spread the word";
      case "instagram":
        return "Double-tap if you agree";
      case "reddit":
        return "What do you think?";
      case "facebook":
        return "Comment below";
    }
  }

  /**
   * Estimate engagement rate baseline per platform.
   */
  private estimateEngagementRate(platform: SocialPlatform): number {
    const baselines: Record<SocialPlatform, number> = {
      linkedin: 0.035,
      twitter: 0.015,
      instagram: 0.025,
      reddit: 0.04,
      facebook: 0.02,
    };
    return baselines[platform];
  }
}

// ============================================================================
// Namespace Export — Convenience grouping for type consumers
// ============================================================================

export namespace SocialMediaStrategist {
  export type Input = SocialMediaInput;
  export type Output = SocialMediaOutput;
  export type Adapter = SocialMediaStrategistAdapter;
}

export default SocialMediaStrategistAdapter;
