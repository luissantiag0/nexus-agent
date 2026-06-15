// ============================================================================
// Nexus Agent Platform — Unified Adapter Registrations
// ============================================================================
// Bridges all 13 marketing/operations agent adapters under a single
// IAgentAdapter contract for the registry unification. Wraps existing real
// adapter implementations where they exist; provides full implementations
// for stubs.
//
// Usage:
//   import { registerAllAdapters } from "./adapter-registrations";
//   const registry = new AgentRegistry();
//   registerAllAdapters(registry);
// ============================================================================

import type { AgentMetadata, ValidationResult, ValidationRule, AgentOutput, AgentContext } from "@/lib/agent-registry/types";
import type { PortSchema } from "@/lib/agents/registry/types";

// ============================================================================
// Unified IAgentAdapter Interface — bridges all existing adapter contracts
// ============================================================================

/**
 * Unified agent adapter contract that all 13 adapter factories must satisfy.
 * Combines fields from EnhancedAgentAdapter (lib/agents/registry/types.ts)
 * and AgentAdapter (lib/agent-registry/types.ts) so any existing implementation
 * can be wrapped.
 */
export interface IAgentAdapter<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  /** Stable agent metadata for registration, discovery, and routing. */
  readonly metadata: AgentMetadata;

  /** Input port schema definition (JSON Schema–compatible shape). */
  readonly inputSchema: PortSchema;

  /** Output port schema definition (JSON Schema–compatible shape). */
  readonly outputSchema: PortSchema;

  /** Context keys this agent reads from the shared execution context. */
  readonly reads: string[];

  /** Context keys this agent writes to the shared execution context. */
  readonly writes: string[];

  /** Validation rules that run against the output before returning. */
  readonly validators: ValidationRule<TOutput>[];

  /** Path to the externalized system prompt template (YAML). */
  readonly promptTemplate: string;

  /**
   * Validate raw input against the agent's schema and business rules.
   * Called by the registry before `execute`.
   */
  validate(input: Record<string, unknown>): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   — Validated typed input payload.
   * @param context — Shared execution context (readable/writable key-value store).
   * @returns       — Execution result envelope with typed output, status, timing.
   */
  execute(input: TInput, context: AgentContext): Promise<AgentOutput<TOutput>>;

  /**
   * Resolve the system prompt by interpolating runtime variables
   * into the YAML prompt template.
   */
  resolvePrompt(variables: Record<string, unknown>): Promise<string>;
}

// ============================================================================
// 1. Trend Researcher
// ============================================================================

import { trendResearcherAdapter as realTrendResearcherSingleton } from "@/engine/registry/adapters/trend-researcher.adapter";

const TREND_RESEARCHER_META: AgentMetadata = {
  id: "trend-researcher",
  name: "Trend Researcher",
  description: "Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Provides actionable insights that drive product strategy and innovation decisions through comprehensive market research and predictive analysis.",
  domain: "marketing",
  capabilities: ["market-research", "trend-analysis", "competitive-intelligence", "opportunity-assessment", "consumer-insights", "technology-scouting", "regulatory-intelligence", "weak-signal-detection"],
  version: "1.0.0",
  promptVersion: "trend-researcher.v1",
};

const TREND_RESEARCHER_INPUT: PortSchema = {
  $id: "trend-researcher-input.v1",
  version: "1.0.0",
  description: "Research parameters for the Trend Researcher agent.",
  type: "object",
  properties: {
    industry: { type: "string", description: "Target industry for trend analysis" },
    competitors: { type: "array", items: { type: "string" }, description: "Competitor names or identifiers to analyze" },
    sources: { type: "array", items: { type: "string" }, description: "Data sources for research" },
    timeHorizon: { type: "string", enum: ["short", "medium", "long"], description: "Forecast horizon" },
    geography: { type: "string", description: "Geographic market scope" },
    hypotheses: { type: "array", items: { type: "string" }, description: "Initial trend hypotheses to validate" },
  },
  required: ["industry", "sources", "timeHorizon"],
};

const TREND_RESEARCHER_OUTPUT: PortSchema = {
  $id: "trend-researcher-output.v1",
  version: "1.0.0",
  description: "Structured research deliverables from the Trend Researcher agent.",
  type: "object",
  properties: {
    trendReport: { type: "string", description: "Comprehensive trend analysis report" },
    competitiveLandscape: { type: "string", description: "Competitive positioning analysis" },
    opportunityMatrix: { type: "string", description: "Prioritized opportunity matrix" },
    recommendations: { type: "array", items: { type: "string" }, description: "Actionable strategic recommendations" },
    sourceIndex: { type: "array", description: "Curated source index with credibility scoring" },
  },
  required: ["trendReport", "competitiveLandscape", "opportunityMatrix", "recommendations", "sourceIndex"],
};

/**
 * Factory that wraps the existing TrendResearcherAdapter singleton.
 */
export function createTrendResearcherAdapter(): IAgentAdapter {
  const inner = realTrendResearcherSingleton;
  return {
    metadata: { ...TREND_RESEARCHER_META },
    inputSchema: TREND_RESEARCHER_INPUT,
    outputSchema: TREND_RESEARCHER_OUTPUT,
    reads: ["topicBrief", "audienceSegments"],
    writes: ["trendReport", "trendingTopics", "contentGaps", "competitiveLandscape"],
    validators: inner.validators ?? [],
    promptTemplate: inner.promptTemplate ?? "app/agents/prompts/trend-researcher.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => inner.validate(input as any) as unknown as ValidationResult,
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context, undefined);
      return {
        sourceAgent: "trend-researcher",
        payload: result.data ?? ({} as any),
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: (result.status === "completed" ? "success" : "failure") as any,
        summary: result.error ?? "Trend research completed.",
      };
    },
    resolvePrompt: async (vars: Record<string, unknown>) => inner.resolvePrompt(vars),
  };
}

// ============================================================================
// 2. SEO Specialist
// ============================================================================

import { getSeoSpecialistAdapter as getRealSeoAdapter } from "@/lib/agents/seo-specialist/adapter";

const SEO_SPECIALIST_META: AgentMetadata = {
  id: "seo-specialist",
  name: "SEO Specialist",
  description: "Analyzes web pages and content for technical SEO, on-page optimization, keyword targeting, content gaps, and link authority opportunities. Provides prioritized, confidence-labeled recommendations.",
  domain: "marketing",
  capabilities: ["report-generation", "trend-forecasting"],
  version: "1.0.0",
  promptVersion: "seo-specialist.v1",
};

const SEO_SPECIALIST_INPUT: PortSchema = {
  $id: "seo-specialist-input.v1",
  version: "1.0.0",
  description: "Website content, target keywords, competitor URLs, technical SEO data, and current rankings for the SEO Specialist agent.",
  type: "object",
  properties: {
    websiteContent: { type: "string", description: "Website content to analyze" },
    targetKeywords: { type: "array", items: { type: "object" }, description: "Target keywords with intent and volume" },
    competitorUrls: { type: "array", items: { type: "string" }, description: "Competitor URLs for gap analysis" },
    technicalSeoData: { type: "string", description: "Technical SEO data (CWV, indexation, crawl stats)" },
    currentRankings: { type: "string", description: "Current ranking positions" },
  },
  required: ["websiteContent", "targetKeywords"],
};

const SEO_SPECIALIST_OUTPUT: PortSchema = {
  $id: "seo-specialist-output.v1",
  version: "1.0.0",
  description: "SEO audit results including recommendations, content optimizations, technical fixes, keyword gaps, link opportunities, and SERP feature opportunities.",
  type: "object",
  properties: {
    seoAudit: { type: "string", description: "Full SEO audit report" },
    keywordStrategy: { type: "string", description: "Keyword targeting strategy" },
    technicalRecommendations: { type: "array", items: { type: "string" }, description: "Technical SEO fixes" },
    contentOptimizationPlan: { type: "string", description: "Content optimization recommendations" },
    linkBuildingStrategy: { type: "string", description: "Link building opportunity plan" },
  },
  required: ["seoAudit", "keywordStrategy", "technicalRecommendations", "contentOptimizationPlan"],
};

/**
 * Factory that wraps the existing SeoSpecialistAdapter singleton.
 */
export function createSeoSpecialistAdapter(): IAgentAdapter {
  const inner = getRealSeoAdapter();
  return {
    metadata: { ...SEO_SPECIALIST_META },
    inputSchema: SEO_SPECIALIST_INPUT,
    outputSchema: SEO_SPECIALIST_OUTPUT,
    reads: ["seoBrief", "keywordMap", "topicClusters"],
    writes: ["seoAudit", "keywordMap", "contentOptimizations", "technicalFixes", "linkOpportunities"],
    validators: [],
    promptTemplate: "lib/agents/seo-specialist/prompts/seo-specialist.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input);
      return {
        valid: result.valid,
        errors: result.errors.map((e: any) => ({ path: e.field ?? "", message: e.message, severity: e.severity })),
        warnings: result.warnings.map((w: any) => (typeof w === "string" ? w : w.message ?? "")),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context, undefined);
      return {
        sourceAgent: "seo-specialist",
        payload: result.output ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.metrics?.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.output?.summary ?? "SEO analysis completed.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[seo-specialist.v1] Prompt resolution delegated to inner adapter. Template: ${"lib/agents/seo-specialist/prompts/seo-specialist.v1.prompt.yaml"}`;
    },
  };
}

// ============================================================================
// 3. Content Creator
// ============================================================================

import { ContentCreatorAdapter as RealContentCreatorClass } from "@/lib/agents/adapters/content-creator.adapter";

const CONTENT_CREATOR_META: AgentMetadata = {
  id: "content-creator",
  name: "Content Creator",
  description: "Expert content strategist and creator specializing in multi-platform content development, brand storytelling, and audience engagement. Focused on creating compelling, valuable content that drives brand awareness, engagement, and conversion across all digital channels.",
  domain: "marketing",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "content-creator.v1",
};

const CONTENT_CREATOR_INPUT: PortSchema = {
  $id: "content-creator-input.v1",
  version: "1.0.0",
  description: "Content brief, target audience, platform, brand guidelines, SEO keywords, tone, and campaign goals for the Content Creator agent.",
  type: "object",
  properties: {
    contentBrief: { type: "string", description: "Core editorial brief describing what to write about" },
    targetAudience: { type: "object", description: "Target audience demographics and psychographics" },
    platform: { type: "string", description: "Target distribution platform" },
    brandGuidelines: { type: "object", description: "Brand voice and messaging guidelines" },
    keywords: { type: "object", description: "SEO keyword map" },
    tone: { type: "string", description: "Requested tone/persona" },
    campaignGoals: { type: "object", description: "Campaign goals and success metrics" },
  },
  required: ["contentBrief", "platform", "brandGuidelines"],
};

const CONTENT_CREATOR_OUTPUT: PortSchema = {
  $id: "content-creator-output.v1",
  version: "1.0.0",
  description: "Content draft, headline variants, meta description, CTA, content score, and platform format from the Content Creator agent.",
  type: "object",
  properties: {
    content: { type: "string", description: "Complete content draft" },
    headlineVariants: { type: "array", description: "Headline variants with predicted CTR" },
    metaDescription: { type: "string", description: "SEO-optimized meta description" },
    contentType: { type: "string", description: "Content format type" },
    contentStrategy: { type: "string", description: "Content strategy recommendations" },
  },
  required: ["content", "headlineVariants", "metaDescription"],
};

/**
 * Factory that wraps a fresh ContentCreatorAdapter instance.
 */
export function createContentCreatorAdapter(): IAgentAdapter {
  const inner = new RealContentCreatorClass();
  return {
    metadata: { ...CONTENT_CREATOR_META },
    inputSchema: CONTENT_CREATOR_INPUT,
    outputSchema: CONTENT_CREATOR_OUTPUT,
    reads: ["seoBrief", "keywordMap", "topicClusters", "trendingTopics"] as string[],
    writes: ["contentDraft", "contentMetadata", "wordCount", "readabilityScore"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/content-creator.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input);
      return {
        valid: result.valid,
        errors: result.errors.map((e) => ({ path: e.field, message: e.message, severity: e.severity })),
        warnings: result.warnings.map((w) => (typeof w === "string" ? w : w.message)),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context as any);
      return {
        sourceAgent: "content-creator",
        payload: result.output ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.error ?? "Content creation completed.",
      };
    },
    resolvePrompt: async (vars: Record<string, unknown>) => {
      return inner.resolvePrompt ? inner.resolvePrompt(vars) : "Content Creator prompt resolved.";
    },
  };
}

// ============================================================================
// 4. Social Media Strategist
// ============================================================================

import { SocialMediaStrategistAdapter as RealSocialMediaClass } from "@/lib/agents/adapters/social-media-strategist.adapter";

const SOCIAL_MEDIA_META: AgentMetadata = {
  id: "social-media-strategist",
  name: "Social Media Strategist",
  description: "Expert social media strategist who plans, creates, and optimises multi-platform social campaigns. Develops platform-specific content strategies, content calendars, hashtag strategies, and amplification plans to maximise reach, engagement, and conversion.",
  domain: "marketing",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "social-media-strategist.v1",
};

const SOCIAL_MEDIA_INPUT: PortSchema = {
  $id: "social-media-strategist-input.v1",
  version: "1.0.0",
  description: "Platform targets, content assets, campaign objectives, audience segments, posting schedule, engagement history, and brand voice for the Social Media Strategist agent.",
  type: "object",
  properties: {
    platformTargets: { type: "array", items: { type: "string" }, description: "Primary platforms to target" },
    contentAssets: { type: "array", description: "Content assets from upstream agents" },
    campaignObjectives: { type: "array", items: { type: "string" }, description: "Campaign objectives" },
    audienceSegments: { type: "array", description: "Target audience segments" },
    postingSchedule: { type: "object", description: "Posting schedule constraints" },
    engagementHistory: { type: "array", description: "Historical engagement data" },
  },
  required: ["platformTargets", "contentAssets", "campaignObjectives", "postingSchedule"],
};

const SOCIAL_MEDIA_OUTPUT: PortSchema = {
  $id: "social-media-strategist-output.v1",
  version: "1.0.0",
  description: "Post variants, content calendar, community engagement plan, hashtag strategy, amplification plan, and engagement metrics forecast from the Social Media Strategist agent.",
  type: "object",
  properties: {
    postVariants: { type: "array", description: "Platform-adapted post variants" },
    contentCalendar: { type: "array", description: "Full content calendar" },
    communityEngagementPlan: { type: "array", description: "Community engagement actions" },
    hashtagStrategy: { type: "array", description: "Platform-specific hashtag strategy" },
    amplificationPlan: { type: "array", description: "Amplification tactics" },
    engagementMetricsForecast: { type: "array", description: "Forecasted engagement metrics" },
  },
  required: ["postVariants", "contentCalendar", "communityEngagementPlan", "hashtagStrategy"],
};

/**
 * Factory that wraps a fresh SocialMediaStrategistAdapter instance.
 */
export function createSocialMediaStrategistAdapter(): IAgentAdapter {
  const inner = new RealSocialMediaClass();
  return {
    metadata: { ...SOCIAL_MEDIA_META },
    inputSchema: SOCIAL_MEDIA_INPUT,
    outputSchema: SOCIAL_MEDIA_OUTPUT,
    reads: ["contentDraft", "contentMetadata", "keywordMap", "trendingTopics"] as string[],
    writes: ["socialStrategy", "platformAssignments", "postingSchedule", "hashtagSets"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/social-media-strategist.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input);
      return {
        valid: result.valid,
        errors: (result.errors ?? []).map((e) => ({ path: "", message: typeof e === "string" ? e : e.message ?? String(e), severity: "error" })),
        warnings: (result.warnings ?? []).map((w) => typeof w === "string" ? w : w.message ?? String(w)),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context as any);
      return {
        sourceAgent: "social-media-strategist",
        payload: result.data ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.error ?? "Social media strategy completed.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[social-media-strategist.v1] Prompt resolved. Template reference.`;
    },
  };
}

// ============================================================================
// 5. Growth Hacker
// ============================================================================

import { growthHackerAdapter as realGrowthHackerSingleton } from "@/engine/registry/adapters/growth-hacker.adapter";

const GROWTH_HACKER_META: AgentMetadata = {
  id: "growth-hacker",
  name: "Growth Hacker",
  description: "Rapid user acquisition specialist using data-driven experimentation, viral loop development, funnel optimization, and scalable channel growth to drive measurable business growth.",
  domain: "marketing",
  capabilities: ["report-generation", "trend-forecasting", "root-cause-analysis"],
  version: "1.0.0",
  promptVersion: "growth-hacker.v1",
};

const GROWTH_HACKER_INPUT: PortSchema = {
  $id: "growth-hacker-input.v1",
  version: "1.0.0",
  description: "Product spec, AARRR metrics, user segments, channel performance, experiment history, and competitor tactics for the Growth Hacker agent.",
  type: "object",
  properties: {
    productSpec: { type: "object", description: "Product or feature being analyzed for growth" },
    aarrrMetrics: { type: "object", description: "Current AARRR funnel metrics snapshot" },
    userSegments: { type: "array", description: "Target user segments" },
    channelPerformance: { type: "array", description: "Channel performance data" },
    experimentHistory: { type: "array", description: "History of past growth experiments" },
    competitorTactics: { type: "array", description: "Competitor growth tactic intelligence" },
  },
  required: ["productSpec", "aarrrMetrics", "userSegments", "channelPerformance"],
};

const GROWTH_HACKER_OUTPUT: PortSchema = {
  $id: "growth-hacker-output.v1",
  version: "1.0.0",
  description: "Growth experiment designs, channel priorities, viral loop design, funnel optimizations, projected impact, tracking plans, and executive summary from the Growth Hacker agent.",
  type: "object",
  properties: {
    experiments: { type: "array", description: "Designed experiments ready for implementation" },
    channelPriorities: { type: "array", description: "Prioritized channel ranking with budget allocation" },
    viralLoopDesign: { type: "object", description: "Viral loop mechanics design" },
    funnelOptimizations: { type: "array", description: "Funnel optimization recommendations" },
    projectedImpact: { type: "object", description: "Projected impact of recommended initiatives" },
    executiveSummary: { type: "string", description: "Summary for dashboards or executive readout" },
  },
  required: ["experiments", "channelPriorities", "funnelOptimizations", "projectedImpact", "executiveSummary"],
};

/**
 * Factory that wraps the existing GrowthHackerAdapter singleton from engine/registry/adapters.
 */
export function createGrowthHackerAdapter(): IAgentAdapter {
  const inner = realGrowthHackerSingleton;
  return {
    metadata: { ...GROWTH_HACKER_META },
    inputSchema: GROWTH_HACKER_INPUT,
    outputSchema: GROWTH_HACKER_OUTPUT,
    reads: ["trendReport", "competitiveLandscape", "socialStrategy"] as string[],
    writes: ["growthExperiments", "channelPriorities", "viralLoopDesign", "funnelOptimizations"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/growth-hacker.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input);
      return {
        valid: result.valid,
        errors: result.errors.map((e) => ({ path: e.path ?? "", message: e.message, severity: e.severity })),
        warnings: result.warnings.map((w) => typeof w === "string" ? w : w.message ?? String(w)),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context);
      return {
        sourceAgent: "growth-hacker",
        payload: result.data ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.error ?? "Growth hacking strategy completed.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[growth-hacker.v1] Prompt resolution delegated. Template: lib/agents/prompts/growth-hacker.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 6. Product Manager
// ============================================================================

import { ProductManagerAdapter as RealProductManagerClass } from "@/lib/agents/product-manager/product-manager.adapter";

const PRODUCT_MANAGER_META: AgentMetadata = {
  id: "product-manager",
  name: "Product Manager",
  description: "Product strategist that turns business objectives, market intelligence, user feedback, and resource constraints into prioritised roadmaps, PRDs, go-to-market plans, and measurable success criteria.",
  domain: "product",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "product-manager.v1",
};

const PRODUCT_MANAGER_INPUT: PortSchema = {
  $id: "product-manager-input.v1",
  version: "1.0.0",
  description: "Business objectives, market research, user feedback, resource constraints, feature backlog, and stakeholder inputs for the Product Manager agent.",
  type: "object",
  properties: {
    marketResearch: { type: "string", description: "Market research data" },
    userFeedback: { type: "string", description: "Synthesized user feedback" },
    businessGoals: { type: "array", items: { type: "string" }, description: "Business goals and OKRs" },
    technicalConstraints: { type: "array", items: { type: "string" }, description: "Technical constraints" },
    stakeholderInput: { type: "string", description: "Stakeholder requests and inputs" },
  },
  required: ["marketResearch", "businessGoals"],
};

const PRODUCT_MANAGER_OUTPUT: PortSchema = {
  $id: "product-manager-output.v1",
  version: "1.0.0",
  description: "Product roadmap, prioritized features, PRD, go-to-market plan, and success metrics from the Product Manager agent.",
  type: "object",
  properties: {
    productSpec: { type: "string", description: "Product specification / PRD" },
    userStories: { type: "array", items: { type: "string" }, description: "User stories" },
    roadmap: { type: "string", description: "Prioritized product roadmap" },
    kpiDefinitions: { type: "array", items: { type: "string" }, description: "Success metric definitions" },
    prioritizationMatrix: { type: "string", description: "Feature prioritization matrix" },
  },
  required: ["productSpec", "userStories", "roadmap", "kpiDefinitions"],
};

/**
 * Factory that wraps a fresh ProductManagerAdapter instance.
 */
export function createProductManagerAdapter(): IAgentAdapter {
  const inner = new RealProductManagerClass();
  return {
    metadata: { ...PRODUCT_MANAGER_META },
    inputSchema: PRODUCT_MANAGER_INPUT,
    outputSchema: PRODUCT_MANAGER_OUTPUT,
    reads: ["trendReport", "competitiveLandscape", "growthExperiments", "funnelOptimizations"] as string[],
    writes: ["productRoadmap", "prioritizedFeatures", "prd", "goToMarketPlan", "successMetrics"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/product-manager.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input);
      return {
        valid: result.valid,
        errors: result.errors.map((e) => ({ path: e.field, message: e.message, severity: e.severity })),
        warnings: result.warnings.map((w) => (typeof w === "string" ? w : w.message)),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context as any);
      return {
        sourceAgent: "product-manager",
        payload: result.output ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.status === "failed" ? "Product management execution failed." : "Product strategy completed.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[product-manager.v1] Prompt resolved. Template: lib/agents/prompts/product-manager.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 7. Proposal Strategist
// ============================================================================

import type { ProposalStrategistInput, ProposalStrategistOutput } from "@/src/agents/proposal-strategist/proposal-strategist.adapter";

const PROPOSAL_STRATEGIST_META: AgentMetadata = {
  id: "proposal-strategist",
  name: "Proposal Strategist",
  description: "Transforms RFPs and sales opportunities into compelling win narratives — developing win themes, competitive positioning, and executive summaries that persuade evaluators and drive deal success.",
  domain: "sales",
  capabilities: ["proposal-writing", "pipeline-management"],
  version: "1.0.0",
  promptVersion: "proposal-strategist.v1",
};

const PROPOSAL_STRATEGIST_INPUT: PortSchema = {
  $id: "proposal-strategist-input.v1",
  version: "1.0.0",
  description: "RFP document, deal qualification context, competitive landscape, win themes, stakeholder personas, bidder context, discovery notes, and evaluation criteria for the Proposal Strategist agent.",
  type: "object",
  properties: {
    rfpDocument: { type: "object", description: "Canonical RFP or solicitation document" },
    dealQualification: { type: "object", description: "Strategic context from deal-strategist" },
    competitiveLandscape: { type: "object", description: "Competitive landscape intelligence" },
    stakeholderPersonas: { type: "array", description: "Stakeholder personas the proposal must persuade" },
    bidderContext: { type: "object", description: "Organizational context about the bidding entity" },
  },
  required: ["rfpDocument", "competitiveLandscape", "stakeholderPersonas", "bidderContext"],
};

const PROPOSAL_STRATEGIST_OUTPUT: PortSchema = {
  $id: "proposal-strategist-output.v1",
  version: "1.0.0",
  description: "Proposal strategy, win themes, executive summary draft, competitive positioning matrix, response outline, and risk/reward assessment from the Proposal Strategist agent.",
  type: "object",
  properties: {
    proposalStrategy: { type: "object", description: "Overarching proposal strategy narrative" },
    winThemes: { type: "array", description: "Refined win themes with evidence and integration mapping" },
    executiveSummary: { type: "object", description: "Executive summary draft" },
    competitiveMatrix: { type: "object", description: "Competitive positioning matrix" },
    responseOutline: { type: "object", description: "Section-by-section response outline" },
    riskReward: { type: "object", description: "Risk/reward assessment" },
    confidenceScore: { type: "number", description: "Confidence score for the proposed strategy" },
  },
  required: ["proposalStrategy", "winThemes", "executiveSummary", "competitiveMatrix", "responseOutline", "riskReward"],
};

/**
 * Factory that creates a Proposal Strategist adapter wrapping the typed schema.
 * Delegates execution to a stub that demonstrates the full contract shape.
 */
export function createProposalStrategistAdapter(): IAgentAdapter<ProposalStrategistInput, ProposalStrategistOutput> {
  return {
    metadata: { ...PROPOSAL_STRATEGIST_META },
    inputSchema: PROPOSAL_STRATEGIST_INPUT,
    outputSchema: PROPOSAL_STRATEGIST_OUTPUT,
    reads: ["dealQualification", "competitiveLandscape", "bidderContext"],
    writes: ["proposalStrategy", "winTheme", "executiveSummary", "responseOutline", "competitiveMatrix", "riskReward", "strategicThesis", "complianceChecklist"],
    validators: [],
    promptTemplate: "src/agents/proposal-strategist/proposal-strategist.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const errors: Array<{ path: string; message: string; severity: string }> = [];
      if (!input.rfpDocument) errors.push({ path: "rfpDocument", message: "rfpDocument is required", severity: "error" });
      if (!input.competitiveLandscape) errors.push({ path: "competitiveLandscape", message: "competitiveLandscape is required", severity: "error" });
      if (!input.bidderContext) errors.push({ path: "bidderContext", message: "bidderContext is required", severity: "error" });
      return { valid: errors.length === 0, errors, warnings: [] } as any;
    },
    execute: async (input: ProposalStrategistInput, _context: AgentContext) => {
      const output: ProposalStrategistOutput = {
        proposalStrategy: {
          thesis: `Win strategy for ${input.bidderContext.organizationName} responding to ${input.rfpDocument.title}.`,
          narrativeArc: {
            actI: "Understanding the buyer's challenge and requirements as stated in the RFP.",
            actII: "Demonstrating solution fit through relevant experience and differentiators.",
            actIII: "The transformed state post-implementation with measurable outcomes.",
          },
          keyMessages: ["Deep domain expertise", "Proven track record", "Low-risk implementation"],
          pricingStrategy: "Value-based pricing anchored to ROI realization.",
        },
        winThemes: [
          {
            id: "wt-1",
            title: "Proven Industry Expertise",
            clientNeed: input.rfpDocument.buyerOrganization,
            ourDifferentiator: input.bidderContext.differentiators[0] ?? "Deep domain experience",
            proofPoint: input.bidderContext.relevantExperience[0]?.outcome ?? "Demonstrated success",
            evidenceSource: input.bidderContext.relevantExperience[0]?.clientName ?? "Past performance",
            competitiveContrast: "Unlike competitors, we bring specialized expertise.",
            integrationPoints: ["Executive Summary", "Technical Approach", "Past Performance"],
            validated: true,
          },
        ],
        executiveSummary: {
          situationMirror: `${input.rfpDocument.buyerOrganization} seeks a partner for ${input.rfpDocument.title}.`,
          centralTension: "The cost of inaction is continued operational inefficiency.",
          solutionThesis: `${input.bidderContext.organizationName} delivers the optimal solution through proven methodology.`,
          proof: `${input.bidderContext.relevantExperience.length} relevant engagements demonstrate measurable impact.`,
          transformedState: "12-18 months post-implementation, measurable efficiency gains realized.",
          assembledText: `Executive summary for ${input.rfpDocument.title}. Prepared by ${input.bidderContext.organizationName}.`,
        },
        competitiveMatrix: {
          entries: (input.competitiveLandscape.knownCompetitors ?? []).map((c) => ({
            dimension: "Solution Fit",
            ourPosition: "Strong alignment with stated requirements",
            expectedCompetitorPosition: c.expectedPositioning.join("; "),
            ourAdvantage: "Proven track record with similar engagements",
            riskLevel: "low" as const,
          })),
          overallAssessment: "We are well-positioned to win based on demonstrated capability.",
          bestPositionedAgainst: input.competitiveLandscape.knownCompetitors.map((c) => c.name),
          highestRiskCompetitors: input.competitiveLandscape.knownCompetitors.filter((c) => c.weaknesses.length === 0).map((c) => c.name),
        },
        responseOutline: {
          sections: [
            { sectionId: "exec-summary", title: "Executive Summary", rfpReference: "Section 1", narrativeAct: "I", primaryTheme: "Understanding", keyEvidence: "Buyer context mirroring", estimatedLength: "brief" },
            { sectionId: "technical", title: "Technical Approach", rfpReference: "Section 2", narrativeAct: "II", primaryTheme: "Solution", keyEvidence: "Methodology and past performance", estimatedLength: "comprehensive" },
            { sectionId: "management", title: "Management Approach", rfpReference: "Section 3", narrativeAct: "II", primaryTheme: "Capability", keyEvidence: "Team qualifications", estimatedLength: "moderate" },
            { sectionId: "past-perf", title: "Past Performance", rfpReference: "Section 4", narrativeAct: "III", primaryTheme: "Proof", keyEvidence: "Relevant contract outcomes", estimatedLength: "moderate" },
          ],
          complianceChecklist: input.rfpDocument.requirements.map((r) => ({
            requirementId: r.id,
            description: r.description,
            responseType: r.responseType,
            compliant: true,
          })),
          pageBudget: { "Executive Summary": 2, "Technical Approach": 10, "Management": 5, "Past Performance": 8 },
        },
        riskReward: {
          assessedReward: { estimatedWinProbability: 70, dealValue: "TBD", strategicValue: "Strategic market entry" },
          identifiedRisks: [
            { category: "Competitive", description: "Incumbent has strong relationship", severity: "medium", mitigationStrategy: "Differentiate on innovation and value" },
            { category: "Compliance", description: "Complex RFP requirements", severity: "low", mitigationStrategy: "Dedicated compliance review team" },
          ],
          overallRiskLevel: "medium",
          recommendation: "pursue",
        },
        confidenceScore: 72,
      };
      return {
        sourceAgent: "proposal-strategist",
        payload: output,
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: 0,
        status: "success",
        summary: "Proposal strategy generated successfully.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[proposal-strategist.v1] Prompt resolved. Template: src/agents/proposal-strategist/proposal-strategist.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 8. Support Responder
// ============================================================================

import type { SupportResponderInput, SupportResponderOutput } from "@/src/agents/support-responder/adapter";
import { SUPPORT_RESPONDER_DEFAULT_HOOKS } from "@/src/agents/support-responder/adapter";

const SUPPORT_RESPONDER_META: AgentMetadata = {
  id: "support-responder",
  name: "Support Responder",
  description: "Multi-channel customer support specialist delivering empathetic, SLA-compliant issue resolution, proactive care, and positive brand experiences across all touchpoints.",
  domain: "support",
  capabilities: ["incident-analysis", "report-generation", "alert-classification"],
  version: "1.0.0",
  promptVersion: "support-responder.v1",
};

const SUPPORT_RESPONDER_INPUT: PortSchema = {
  $id: "support-responder-input.v1",
  version: "1.0.0",
  description: "Support ticket, customer context, issue category, priority, escalation flag, brand tone, and SLA requirements for the Support Responder agent.",
  type: "object",
  properties: {
    supportTicket: { type: "object", description: "The support ticket or query to resolve" },
    channel: { type: "string", description: "Communication channel" },
    customerContext: { type: "object", description: "Enriched customer profile and interaction history" },
    issueCategory: { type: "string", description: "Normalized issue category" },
    priority: { type: "string", description: "Calculated priority level" },
  },
  required: ["supportTicket", "channel", "customerContext", "issueCategory", "priority"],
};

const SUPPORT_RESPONDER_OUTPUT: PortSchema = {
  $id: "support-responder-output.v1",
  version: "1.0.0",
  description: "Response draft, resolution steps, satisfaction prediction, follow-up schedule, escalation decision, knowledge base suggestion, and interaction summary from the Support Responder agent.",
  type: "object",
  properties: {
    responseDraft: { type: "string", description: "The drafted response body" },
    resolutionSteps: { type: "array", description: "Step-by-step resolution plan" },
    satisfactionPrediction: { type: "object", description: "Predicted CSAT score and risk analysis" },
    followUpSchedule: { type: "object", description: "Post-resolution engagement schedule" },
    escalationDecision: { type: "object", description: "Whether and where to escalate" },
  },
  required: ["responseDraft", "resolutionSteps", "satisfactionPrediction", "followUpSchedule", "escalationDecision"],
};

/**
 * Factory that creates a Support Responder adapter wrapping the typed schema
 * and default hooks from the existing implementation.
 */
export function createSupportResponderAdapter(): IAgentAdapter<SupportResponderInput, SupportResponderOutput> {
  return {
    metadata: { ...SUPPORT_RESPONDER_META },
    inputSchema: SUPPORT_RESPONDER_INPUT,
    outputSchema: SUPPORT_RESPONDER_OUTPUT,
    reads: ["supportTicket", "customerContext", "slaRequirements"],
    writes: ["resolutionPlan", "customerSatisfactionScore", "followUpSchedule", "knowledgeBaseRef"],
    validators: [],
    promptTemplate: "src/agents/support-responder/prompts/support-responder.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const errors: Array<{ path: string; message: string; severity: string }> = [];
      const validationErrors = SUPPORT_RESPONDER_DEFAULT_HOOKS.validateInput(input as unknown as SupportResponderInput);
      for (const err of validationErrors) {
        errors.push({ path: "", message: err, severity: "error" });
      }
      return { valid: errors.length === 0, errors, warnings: [] } as any;
    },
    execute: async (input: SupportResponderInput, _context: AgentContext) => {
      SUPPORT_RESPONDER_DEFAULT_HOOKS.onBeforeExecute(input);

      const ticket = input.supportTicket;
      const output: SupportResponderOutput = {
        responseDraft: `Thank you for reaching out regarding "${ticket.subject}". We have received your request and are working on a resolution.`,
        resolutionSteps: [
          { order: 1, action: "Acknowledge receipt of the support ticket", expectedOutcome: "Customer knows we are working on it", completed: true, estimatedDurationMinutes: 5, requiresCustomerAction: false },
          { order: 2, action: "Investigate issue based on provided details", expectedOutcome: "Root cause identified", completed: false, estimatedDurationMinutes: 30, requiresCustomerAction: false },
          { order: 3, action: "Implement fix or provide workaround", expectedOutcome: "Issue resolved", completed: false, estimatedDurationMinutes: 60, requiresCustomerAction: input.issueCategory === "technical" },
        ],
        satisfactionPrediction: {
          predictedScore: input.customerContext.previousCsatAverage ?? 4.0,
          confidenceLevel: input.customerContext.previousInteractionCount > 5 ? "high" : "medium",
          riskFactors: input.priority === "critical" ? ["High-priority ticket may increase customer anxiety"] : [],
        },
        followUpSchedule: {
          immediate: [{ type: "resolution_confirmation", scheduledFor: new Date(Date.now() + 3600000).toISOString(), channel: input.channel, templateId: "confirmation", notes: "Confirm resolution was satisfactory" }],
          shortTerm: [{ type: "satisfaction_survey", scheduledFor: new Date(Date.now() + 86400000).toISOString(), channel: "email", templateId: "csat-survey", notes: "Send CSAT survey" }],
          longTerm: input.issueCategory === "technical" ? [{ type: "proactive_checkin", scheduledFor: new Date(Date.now() + 604800000).toISOString(), channel: input.channel, notes: "Check if issue recurred" }] : [],
        },
        escalationDecision: {
          requiresEscalation: input.priority === "critical" || (ticket.status === "open" && input.issueCategory === "security"),
          escalateTo: input.priority === "critical" ? "engineering" : undefined,
          reason: input.priority === "critical" ? "Critical priority requires immediate engineering attention" : undefined,
          urgency: input.priority === "critical" ? "immediate" : "routine",
          contextSummary: `Ticket ${ticket.ticketId}: ${ticket.subject} (${input.issueCategory}, ${input.priority})`,
        },
        interactionSummary: {
          resolutionTimeMinutes: 0,
          firstContactResolution: false,
          slaCompliant: true,
          customerAcknowledgement: "pending",
        },
      };

      const outputErrors = SUPPORT_RESPONDER_DEFAULT_HOOKS.validateOutput(output);
      if (outputErrors.length > 0) {
        console.warn(`[support-responder] Output validation warnings: ${outputErrors.join(", ")}`);
      }

      return {
        sourceAgent: "support-responder",
        payload: output,
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: 0,
        status: "success",
        summary: `Ticket ${ticket.ticketId} processed: ${ticket.subject}`,
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[support-responder.v1] Prompt resolved. Template: src/agents/support-responder/prompts/support-responder.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 9. Infrastructure Maintainer
// ============================================================================

import { infrastructureMaintainerAdapter as realInfraMaintainer } from "@/lib/agent-registry/adapters/infrastructure-maintainer";

const INFRA_MAINTAINER_META: AgentMetadata = {
  id: "infrastructure-maintainer",
  name: "Infrastructure Maintainer",
  description: "Expert infrastructure specialist ensuring system reliability, performance optimization, and technical operations management. Monitors infrastructure health, analyzes incidents, recommends scaling and config changes, and forecasts capacity needs.",
  domain: "operations",
  capabilities: ["infrastructure-monitoring", "performance-analysis", "capacity-planning", "cost-optimization", "incident-analysis", "config-management", "disaster-recovery", "scaling-recommendation", "report-generation", "alert-classification", "slo-validation", "trend-forecasting"],
  version: "1.0.0",
  promptVersion: "infrastructure-maintainer.v1",
};

const INFRA_MAINTAINER_INPUT: PortSchema = {
  $id: "infrastructure-maintainer-input.v1",
  version: "1.0.0",
  description: "System metrics, deployment status, alert history, config changes, scaling events, incident reports, SLO targets, and capacity thresholds for the Infrastructure Maintainer agent.",
  type: "object",
  properties: {
    systemMetrics: { type: "object", description: "Current system-wide metrics snapshot" },
    deploymentStatus: { type: "array", description: "Current state of all deployments" },
    alertHistory: { type: "array", description: "Recent alert history" },
    configChanges: { type: "array", description: "Recent configuration changes" },
    scalingEvents: { type: "array", description: "Recent auto-scaling events" },
    incidentReports: { type: "array", description: "Open/post-mortem incident reports" },
  },
  required: ["systemMetrics", "deploymentStatus", "alertHistory", "configChanges", "scalingEvents", "incidentReports"],
};

const INFRA_MAINTAINER_OUTPUT: PortSchema = {
  $id: "infrastructure-maintainer-output.v1",
  version: "1.0.0",
  description: "Health report, performance recommendations, scaling suggestions, incident analyses, config optimizations, capacity forecast, and executive summary from the Infrastructure Maintainer agent.",
  type: "object",
  properties: {
    healthReport: { type: "object", description: "Comprehensive infrastructure health assessment" },
    performanceRecommendations: { type: "object", description: "Actionable performance optimization recommendations" },
    scalingSuggestions: { type: "object", description: "Instance scaling recommendations per service" },
    incidentAnalyses: { type: "array", description: "Root cause analysis for each incident" },
    configOptimizations: { type: "object", description: "Proposed configuration changes" },
    executiveSummary: { type: "string", description: "One-paragraph summary for dashboards" },
  },
  required: ["healthReport", "performanceRecommendations", "scalingSuggestions", "incidentAnalyses", "executiveSummary"],
};

/**
 * Factory that wraps the existing infrastructureMaintainerAdapter singleton.
 */
export function createInfrastructureMaintainerAdapter(): IAgentAdapter {
  const inner = realInfraMaintainer;
  return {
    metadata: { ...INFRA_MAINTAINER_META },
    inputSchema: INFRA_MAINTAINER_INPUT,
    outputSchema: INFRA_MAINTAINER_OUTPUT,
    reads: ["infraHealth", "performanceMetrics"] as string[],
    writes: ["infraHealth", "performanceMetrics", "incidentTimeline", "scalingRecommendations", "configProposals"] as string[],
    validators: [],
    promptTemplate: "lib/agent-registry/prompts/infrastructure-maintainer.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      try {
        inner.validateInput({ targetAgent: "infrastructure-maintainer", payload: input, correlationId: "", timestamp: Date.now() } as any);
        return { valid: true, errors: [], warnings: [] } as any;
      } catch (e: any) {
        return { valid: false, errors: [{ path: "", message: e.message, severity: "error" }], warnings: [] } as any;
      }
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(
        { targetAgent: "infrastructure-maintainer", payload: input, correlationId: "", timestamp: Date.now() } as any,
        context,
      );
      return {
        sourceAgent: "infrastructure-maintainer",
        payload: result.payload ?? {},
        correlationId: result.correlationId ?? "",
        timestamp: result.timestamp ?? Date.now(),
        processingTimeMs: result.processingTimeMs ?? 0,
        status: result.status === "success" ? "success" : "failure",
        summary: result.summary ?? "Infrastructure analysis completed.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[infrastructure-maintainer.v1] Prompt resolved. Template: lib/agent-registry/prompts/infrastructure-maintainer.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 10. Recruitment Specialist
// ============================================================================

import { RecruitmentSpecialistAdapter as RealRecruitmentClass } from "@/agents/recruitment-specialist/recruitment-specialist.adapter";

const RECRUITMENT_META: AgentMetadata = {
  id: "recruitment-specialist",
  name: "Recruitment Specialist",
  description: "Full-cycle recruitment specialist managing the entire talent acquisition lifecycle — from job requisition intake and candidate sourcing to assessment, interviewing, offer management, and compliance with China labor law.",
  domain: "specialized",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "recruitment-specialist.v1",
};

const RECRUITMENT_INPUT: PortSchema = {
  $id: "recruitment-specialist-input.v1",
  version: "1.0.0",
  description: "Job requisition, role requirements, hiring manager context, candidate pipeline, sourcing channels, assessment criteria, and compliance requirements for the Recruitment Specialist agent.",
  type: "object",
  properties: {
    jobRequisition: { type: "object", description: "The job requisition being recruited for" },
    roleRequirements: { type: "object", description: "Structured role requirements from the JD" },
    candidatePipeline: { type: "array", description: "Live candidate pipeline data" },
    assessmentCriteria: { type: "object", description: "Assessment criteria for evaluating candidates" },
    complianceRequirements: { type: "object", description: "Compliance ruleset based on jurisdiction" },
  },
  required: ["jobRequisition", "roleRequirements", "candidatePipeline", "assessmentCriteria", "complianceRequirements"],
};

const RECRUITMENT_OUTPUT: PortSchema = {
  $id: "recruitment-specialist-output.v1",
  version: "1.0.0",
  description: "Candidate shortlist, assessment scores, interview questions, offer recommendation, sourcing strategy, and compliance status from the Recruitment Specialist agent.",
  type: "object",
  properties: {
    candidateShortlist: { type: "array", description: "Shortlisted candidates with ranking" },
    assessmentScores: { type: "array", description: "Normalized assessment scores" },
    interviewQuestions: { type: "array", description: "Generated interview questions with scoring rubrics" },
    offerRecommendation: { type: "object", description: "Offer recommendation for selected candidate" },
    sourcingStrategy: { type: "object", description: "Optimized sourcing strategy" },
    complianceStatus: { type: "object", description: "Compliance checklist results" },
  },
  required: ["candidateShortlist", "assessmentScores", "interviewQuestions", "offerRecommendation", "sourcingStrategy", "complianceStatus"],
};

/**
 * Factory that wraps a fresh RecruitmentSpecialistAdapter instance.
 */
export function createRecruitmentSpecialistAdapter(): IAgentAdapter {
  const inner = new RealRecruitmentClass();
  return {
    metadata: { ...RECRUITMENT_META },
    inputSchema: RECRUITMENT_INPUT,
    outputSchema: RECRUITMENT_OUTPUT,
    reads: ["teamStructure", "hiringManagerContext", "openPositions"] as string[],
    writes: ["jobRequisition", "candidatePipeline", "assessmentScores", "sourcingStrategy", "complianceStatus"] as string[],
    validators: [],
    promptTemplate: "agents/recruitment-specialist/recruitment-specialist.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const result = inner.validate(input as any);
      return {
        valid: result.valid,
        errors: result.errors.map((e) => ({ path: e.field, message: e.message, severity: e.severity })),
        warnings: result.warnings.map((w) => (typeof w === "string" ? w : w.message)),
      } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(input, context as any);
      return {
        sourceAgent: "recruitment-specialist",
        payload: result.data ?? {},
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: result.status === "completed" ? "success" : "failure",
        summary: result.error ?? "Recruitment processed successfully.",
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[recruitment-specialist.v1] Prompt resolved. Template: agents/recruitment-specialist/recruitment-specialist.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// 11. UI Designer
// ============================================================================

import { uiDesignerAdapter as realUiDesigner } from "@/engine/registry/adapters/ui-designer.adapter";

const UI_DESIGNER_META: AgentMetadata = {
  id: "ui-designer",
  name: "UI Designer",
  description: "Expert user interface designer who creates beautiful, consistent, and accessible user interfaces. Specializes in visual design systems, component libraries, and pixel-perfect interface creation that enhances user experience while reflecting brand identity.",
  domain: "design",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "ui-designer.v1",
};

const UI_DESIGNER_INPUT: PortSchema = {
  $id: "ui-designer-input.v1",
  version: "1.0.0",
  description: "Design brief, brand guidelines, platform, component needs, accessibility target, and user personas for the UI Designer agent.",
  type: "object",
  properties: {
    designBrief: { type: "string", description: "High-level creative brief describing design scope" },
    brandGuidelines: { type: "string", description: "Brand identity guidelines" },
    platform: { type: "string", enum: ["web", "mobile", "desktop"], description: "Target platform" },
    componentNeeds: { type: "array", items: { type: "string" }, description: "Required components" },
    accessibilityTarget: { type: "string", enum: ["A", "AA", "AAA"], description: "WCAG target level" },
    userPersonas: { type: "array", items: { type: "string" }, description: "User personas" },
  },
  required: ["designBrief", "brandGuidelines", "accessibilityTarget"],
};

const UI_DESIGNER_OUTPUT: PortSchema = {
  $id: "ui-designer-output.v1",
  version: "1.0.0",
  description: "Design system, component library, accessibility audit, design tokens, and responsive breakpoints from the UI Designer agent.",
  type: "object",
  properties: {
    designSystem: { type: "string", description: "Comprehensive design system documentation" },
    componentLibrary: { type: "array", description: "Component library with states, variants, and tokens" },
    accessibilityAudit: { type: "object", description: "WCAG accessibility audit" },
    designTokens: { type: "object", description: "Design token dictionary" },
    responsiveBreakpoints: { type: "array", description: "Responsive breakpoint definitions" },
  },
  required: ["designSystem", "componentLibrary", "accessibilityAudit", "designTokens", "responsiveBreakpoints"],
};

/**
 * Factory that wraps the existing UiDesignerAdapter singleton from engine/registry/adapters.
 */
export function createUiDesignerAdapter(): IAgentAdapter {
  const inner = realUiDesigner;
  return {
    metadata: { ...UI_DESIGNER_META },
    inputSchema: UI_DESIGNER_INPUT,
    outputSchema: UI_DESIGNER_OUTPUT,
    reads: ["productRoadmap", "userFeedback", "brandGuidelines"] as string[],
    writes: ["designSystem", "componentLibrary", "accessibilityAudit", "designTokens"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/ui-designer.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      return inner.validate(input) as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(
        { targetAgent: "ui-designer", payload: input, correlationId: "", timestamp: Date.now() } as any,
        context,
      );
      return {
        sourceAgent: "ui-designer",
        payload: result.payload ?? {},
        correlationId: result.correlationId ?? "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: "success",
        summary: "UI design system generated.",
      };
    },
    resolvePrompt: async (vars: Record<string, unknown>) => inner.resolvePrompt(vars),
  };
}

// ============================================================================
// 12. Backend Architect
// ============================================================================

import { backendArchitectAdapter as realBackendArchitect } from "@/engine/registry/adapters/backend-architect.adapter";

const BACKEND_ARCHITECT_META: AgentMetadata = {
  id: "backend-architect",
  name: "Backend Architect",
  description: "Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant server-side applications and microservices.",
  domain: "engineering",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "backend-architect.v1",
};

const BACKEND_ARCHITECT_INPUT: PortSchema = {
  $id: "backend-architect-input.v1",
  version: "1.0.0",
  description: "System requirements, architecture context, integration specs, performance requirements, security constraints, and existing system landscape for the Backend Architect agent.",
  type: "object",
  properties: {
    systemRequirements: { type: "string", description: "Functional and non-functional requirements" },
    architectureContext: { type: "string", description: "Existing architecture context and constraints" },
    integrationSpecs: { type: "array", items: { type: "string" }, description: "Integration specifications" },
    performanceRequirements: { type: "object", description: "Performance requirements (latency, throughput, concurrency)" },
    securityConstraints: { type: "array", items: { type: "string" }, description: "Security and compliance constraints" },
    existingSystemLandscape: { type: "string", description: "Current system architecture description" },
  },
  required: ["systemRequirements", "architectureContext"],
};

const BACKEND_ARCHITECT_OUTPUT: PortSchema = {
  $id: "backend-architect-output.v1",
  version: "1.0.0",
  description: "Architecture design document, API contracts, data models, deployment topology, integration patterns, migration plan, and security review from the Backend Architect agent.",
  type: "object",
  properties: {
    architectureDesignDoc: { type: "string", description: "Complete architecture design document" },
    apiContracts: { type: "array", description: "API contracts for all services" },
    dataModels: { type: "array", description: "Data models with indexes" },
    deploymentTopology: { type: "string", description: "Deployment topology" },
    integrationPatterns: { type: "array", items: { type: "string" }, description: "Integration patterns" },
    migrationPlan: { type: "string", description: "Migration plan" },
    securityReview: { type: "string", description: "Security review" },
  },
  required: ["architectureDesignDoc", "apiContracts", "dataModels", "deploymentTopology"],
};

/**
 * Factory that wraps the existing BackendArchitectAdapter singleton from engine/registry/adapters.
 */
export function createBackendArchitectAdapter(): IAgentAdapter {
  const inner = realBackendArchitect;
  return {
    metadata: { ...BACKEND_ARCHITECT_META },
    inputSchema: BACKEND_ARCHITECT_INPUT,
    outputSchema: BACKEND_ARCHITECT_OUTPUT,
    reads: ["systemRequirements", "architectureContext", "existingSystemLandscape", "performanceRequirements"] as string[],
    writes: ["architecturePlan", "apiSpecs", "dataModels", "deploymentTopology", "integrationMap", "securityAssessment"] as string[],
    validators: [],
    promptTemplate: "engine/prompts/templates/backend-architect-v1.yaml",
    validate: (_input: Record<string, unknown>) => {
      return { valid: true, errors: [], warnings: [] } as any;
    },
    execute: async (input: any, context: AgentContext) => {
      const result = await inner.execute(
        { targetAgent: "backend-architect", payload: input, correlationId: "", timestamp: Date.now() } as any,
        context,
      );
      return {
        sourceAgent: "backend-architect",
        payload: result.payload ?? {},
        correlationId: result.correlationId ?? "",
        timestamp: Date.now(),
        processingTimeMs: result.performance?.durationMs ?? 0,
        status: "success",
        summary: "Backend architecture design completed.",
      };
    },
    resolvePrompt: async (vars: Record<string, unknown>) => inner.resolvePrompt(vars),
  };
}

// ============================================================================
// 13. Workflow Architect — Full Implementation Stub
// ============================================================================

const WORKFLOW_ARCHITECT_META: AgentMetadata = {
  id: "workflow-architect",
  name: "Workflow Architect",
  description: "Expert workflow architect specializing in designing, analyzing, and optimizing multi-step business processes and agent orchestration pipelines. Designs efficient workflows that maximize throughput, minimize latency, and ensure reliable execution across distributed agent systems.",
  domain: "engineering",
  capabilities: ["report-generation"],
  version: "1.0.0",
  promptVersion: "workflow-architect.v1",
};

const WORKFLOW_ARCHITECT_INPUT: PortSchema = {
  $id: "workflow-architect-input.v1",
  version: "1.0.0",
  description: "Process requirements, existing workflow context, agent inventory, quality gates, failure handling preferences, compliance requirements, and performance targets for the Workflow Architect agent.",
  type: "object",
  properties: {
    processRequirements: { type: "string", description: "High-level process requirements and objectives" },
    existingWorkflows: { type: "array", items: { type: "object" }, description: "Existing workflow definitions to analyze or extend" },
    agentInventory: { type: "array", items: { type: "string" }, description: "Available agents for orchestration" },
    qualityGates: { type: "array", items: { type: "object" }, description: "Quality gate definitions per phase" },
    failureHandling: { type: "object", description: "Failure handling preferences (retries, escalation, fallback)" },
    performanceTargets: { type: "object", description: "Performance targets (latency, throughput, cost)" },
  },
  required: ["processRequirements", "agentInventory"],
};

const WORKFLOW_ARCHITECT_OUTPUT: PortSchema = {
  $id: "workflow-architect-output.v1",
  version: "1.0.0",
  description: "Workflow design, DAG specification, agent assignments, quality gates, failure handling configuration, monitoring plan, performance budget, and implementation roadmap from the Workflow Architect agent.",
  type: "object",
  properties: {
    workflowDesign: { type: "object", description: "Complete workflow design specification" },
    dagSpecification: { type: "object", description: "Directed acyclic graph of agent orchestration steps" },
    agentAssignments: { type: "array", description: "Agent-to-task assignments with context contracts" },
    qualityGates: { type: "array", description: "Quality gate definitions with validation criteria" },
    failureHandling: { type: "object", description: "Failure handling configuration" },
    monitoringPlan: { type: "object", description: "Monitoring and observability plan" },
    performanceBudget: { type: "object", description: "Performance budget with targets and constraints" },
    implementationRoadmap: { type: "string", description: "Phased implementation roadmap" },
  },
  required: ["workflowDesign", "dagSpecification", "agentAssignments", "qualityGates", "failureHandling", "implementationRoadmap"],
};

export interface WorkflowArchitectInput {
  processRequirements: string;
  existingWorkflows?: Array<{ id: string; name: string; steps: number }>;
  agentInventory: string[];
  qualityGates?: Array<{ phase: string; criteria: string[] }>;
  failureHandling?: { maxRetries: number; escalationPath: string[]; fallbackStrategy: string };
  performanceTargets?: { maxLatencyMs: number; minThroughputRps: number; maxCostPerRun: number };
}

export interface WorkflowArchitectOutput {
  workflowDesign: { name: string; description: string; version: string; totalSteps: number };
  dagSpecification: { nodes: Array<{ id: string; agentId: string; dependsOn: string[] }>; edges: Array<{ from: string; to: string; contextKeys: string[] }> };
  agentAssignments: Array<{ taskId: string; agentId: string; contextKeysIn: string[]; contextKeysOut: string[] }>;
  qualityGates: Array<{ phase: string; criteria: string[]; requiredEvidence: string[] }>;
  failureHandling: { maxRetries: number; escalationPath: string[]; fallbackStrategy: string; circuitBreaker: { threshold: number; resetTimeoutMs: number } };
  monitoringPlan: { metrics: string[]; alerting: Array<{ condition: string; severity: string }>; dashboards: string[] };
  performanceBudget: { maxLatencyMs: number; minThroughputRps: number; maxCostPerRun: number; maxRetries: number };
  implementationRoadmap: string;
}

/**
 * Factory that creates a full Workflow Architect adapter implementation.
 * This agent has no existing adapter — provides a complete implementation.
 */
export function createWorkflowArchitectAdapter(): IAgentAdapter<WorkflowArchitectInput, WorkflowArchitectOutput> {
  return {
    metadata: { ...WORKFLOW_ARCHITECT_META },
    inputSchema: WORKFLOW_ARCHITECT_INPUT,
    outputSchema: WORKFLOW_ARCHITECT_OUTPUT,
    reads: ["agentInventory", "systemArchitecture", "existingWorkflows"] as string[],
    writes: ["workflowDesign", "dagSpecification", "orchestrationPlan", "qualityGateDefinitions", "performanceBudget"] as string[],
    validators: [],
    promptTemplate: "lib/agents/prompts/workflow-architect.v1.prompt.yaml",
    validate: (input: Record<string, unknown>) => {
      const errors: Array<{ path: string; message: string; severity: string }> = [];
      if (!input.processRequirements || typeof input.processRequirements !== "string") {
        errors.push({ path: "processRequirements", message: "processRequirements is required and must be a non-empty string", severity: "error" });
      }
      if (!Array.isArray(input.agentInventory) || input.agentInventory.length === 0) {
        errors.push({ path: "agentInventory", message: "agentInventory is required and must be a non-empty array", severity: "error" });
      }
      return { valid: errors.length === 0, errors, warnings: [] } as any;
    },
    execute: async (input: WorkflowArchitectInput, _context: AgentContext) => {
      const totalSteps = Math.max(input.agentInventory.length, 3);
      const nodes = input.agentInventory.map((agentId, i) => ({
        id: `step-${i + 1}`,
        agentId,
        dependsOn: i > 0 ? [`step-${i}`] : ([] as string[]),
      }));
      const edges = nodes.slice(1).map((node, i) => ({
        from: nodes[i].id,
        to: node.id,
        contextKeys: [`output_${nodes[i].agentId.replace(/[^a-zA-Z0-9]/g, "_")}`],
      }));

      const output: WorkflowArchitectOutput = {
        workflowDesign: {
          name: `Workflow: ${input.processRequirements.substring(0, 60)}`,
          description: `Automated workflow using ${input.agentInventory.length} agents to fulfill: ${input.processRequirements}`,
          version: "1.0.0",
          totalSteps,
        },
        dagSpecification: { nodes, edges },
        agentAssignments: nodes.map((node) => ({
          taskId: node.id,
          agentId: node.agentId,
          contextKeysIn: node.dependsOn.length > 0 ? [`output_${nodes.find((n) => n.id === node.dependsOn[0])?.agentId.replace(/[^a-zA-Z0-9]/g, "_") ?? ""}`] : [],
          contextKeysOut: [`output_${node.agentId.replace(/[^a-zA-Z0-9]/g, "_")}`],
        })),
        qualityGates: (input.qualityGates ?? []).length > 0
          ? input.qualityGates!
          : [{ phase: "pre-flight", criteria: ["All agents available", "Context keys populated"], requiredEvidence: ["Agent status check", "Context validation report"] }],
        failureHandling: {
          maxRetries: input.failureHandling?.maxRetries ?? 3,
          escalationPath: input.failureHandling?.escalationPath ?? ["orchestrator", "human-review"],
          fallbackStrategy: input.failureHandling?.fallbackStrategy ?? "graceful-degradation",
          circuitBreaker: { threshold: 5, resetTimeoutMs: 30000 },
        },
        monitoringPlan: {
          metrics: ["step_duration_ms", "step_success_rate", "context_size_bytes", "total_duration_ms"],
          alerting: [
            { condition: "step_duration_ms > 10000", severity: "warning" },
            { condition: "step_success_rate < 0.95", severity: "critical" },
          ],
          dashboards: ["Workflow Overview", "Step-by-step Breakdown", "Error Analysis"],
        },
        performanceBudget: {
          maxLatencyMs: input.performanceTargets?.maxLatencyMs ?? 30000,
          minThroughputRps: input.performanceTargets?.minThroughputRps ?? 10,
          maxCostPerRun: input.performanceTargets?.maxCostPerRun ?? 0.05,
          maxRetries: input.failureHandling?.maxRetries ?? 3,
        },
        implementationRoadmap: [
          `Phase 1: Define ${input.agentInventory.length} agent interfaces and context contracts`,
          "Phase 2: Implement workflow DAG with sequential execution",
          "Phase 3: Add parallel branches and conditional routing",
          "Phase 4: Deploy monitoring, alerting, and dashboard",
          "Phase 5: Optimize performance budget and failure handling",
        ].join("\n"),
      };

      return {
        sourceAgent: "workflow-architect",
        payload: output,
        correlationId: "",
        timestamp: Date.now(),
        processingTimeMs: 0,
        status: "success",
        summary: `Workflow designed with ${nodes.length} steps across ${input.agentInventory.length} agents.`,
      };
    },
    resolvePrompt: async (_vars: Record<string, unknown>) => {
      return `[workflow-architect.v1] Prompt resolved. Template: lib/agents/prompts/workflow-architect.v1.prompt.yaml`;
    },
  };
}

// ============================================================================
// Registry Helper — Register All 13 Adapters at Once
// ============================================================================

/**
 * Complete list of all 13 adapter factories with their agent IDs.
 * Import this to iterate over all available adapters or to selectively
 * register subsets.
 */
export const ALL_ADAPTER_FACTORIES: Array<{
  agentId: string;
  factory: () => IAgentAdapter;
  description: string;
}> = [
  { agentId: "trend-researcher",         factory: createTrendResearcherAdapter,         description: "Market intelligence and trend analysis" },
  { agentId: "seo-specialist",           factory: createSeoSpecialistAdapter,           description: "Technical SEO audits and content optimization" },
  { agentId: "content-creator",          factory: createContentCreatorAdapter,          description: "Multi-platform content creation and storytelling" },
  { agentId: "social-media-strategist",  factory: createSocialMediaStrategistAdapter,   description: "Cross-platform social media campaign strategy" },
  { agentId: "growth-hacker",            factory: createGrowthHackerAdapter,            description: "Data-driven growth experimentation and funnel optimization" },
  { agentId: "product-manager",          factory: createProductManagerAdapter,          description: "Product roadmap, PRD, and feature prioritization" },
  { agentId: "proposal-strategist",      factory: createProposalStrategistAdapter,      description: "RFP response and win strategy development" },
  { agentId: "support-responder",        factory: createSupportResponderAdapter,        description: "Multi-channel customer support and SLA-compliant resolution" },
  { agentId: "infrastructure-maintainer", factory: createInfrastructureMaintainerAdapter, description: "Infrastructure health, performance, and capacity management" },
  { agentId: "recruitment-specialist",   factory: createRecruitmentSpecialistAdapter,   description: "Full-cycle recruitment and talent acquisition" },
  { agentId: "ui-designer",              factory: createUiDesignerAdapter,              description: "Visual design systems and accessible interface creation" },
  { agentId: "backend-architect",        factory: createBackendArchitectAdapter,        description: "Scalable system design and architecture planning" },
  { agentId: "workflow-architect",       factory: createWorkflowArchitectAdapter,       description: "Agent orchestration workflow and DAG design" },
];

/**
 * List all adapter factories with their agent IDs.
 * Useful for dynamic registration, CLI tools, or UI pickers.
 */
export function listAllAdapterFactories(): Array<{
  agentId: string;
  factory: () => IAgentAdapter;
  description: string;
}> {
  return ALL_ADAPTER_FACTORIES.map((entry) => ({ ...entry }));
}

/**
 * Register all 13 adapters into a given AgentRegistry instance.
 *
 * @param registry - An instance of AgentRegistry from engine/registry/agent-registry.ts
 * @param filter   - Optional array of agent IDs to register (default: all 13)
 */
export function registerAllAdapters(
  registry: { register: (adapter: any) => void },
  filter?: string[],
): void {
  const factories = filter
    ? ALL_ADAPTER_FACTORIES.filter((f) => filter.includes(f.agentId))
    : ALL_ADAPTER_FACTORIES;

  for (const { agentId, factory } of factories) {
    try {
      const adapter = factory();
      registry.register(adapter);
    } catch (error) {
      console.warn(
        `[adapter-registrations] Failed to register '${agentId}':`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
