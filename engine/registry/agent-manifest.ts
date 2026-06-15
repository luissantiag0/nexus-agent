// ============================================================================
// Nexus Agent Platform — Central Agent Manifest
// ============================================================================
// This is the SINGLE SOURCE OF TRUTH for all 13 Nexus agents.
//
// Every agent's identity, capabilities, context contracts, I/O schemas,
// prompt source, and adapter reference are defined here. The manifest is
// consumed by the orchestration engine, registry, tooling, and monitoring
// systems to build workflows, validate graphs, detect duplicate context
// ownership, and discover agents by capability or context key.
//
// The manifest is a `const` array so TypeScript can infer the exact
// literal types for compile-time validation.
// ============================================================================

// ============================================================================
// Manifest Entry Interface
// ============================================================================

export interface AgentManifestEntry {
  /** Canonical agent identifier — matches the agentId in adapters and pipelines. */
  agentId: string;

  /** Human-readable display name (with @mention prefix). */
  displayName: string;

  /** Semantic version of the agent adapter implementation. */
  version: string;

  /** One-paragraph description of the agent's role and domain. */
  description: string;

  /** Version of the system prompt template (e.g. "trend-researcher.v1"). */
  promptVersion: string;

  /**
   * Context keys this agent reads from the shared context store.
   * These are the *orchestration-level* paths used in pipeline
   * inputMapping / outputMapping (workflow-execution.ts).
   * Supports dot-notation for nested access.
   */
  contextReads: string[];

  /**
   * Context keys this agent writes to the shared context store.
   * These are the *orchestration-level* paths used in pipeline
   * inputMapping / outputMapping (workflow-execution.ts).
   */
  contextWrites: string[];

  /** High-level functional capabilities (for discovery and routing). */
  capabilities: string[];

  /**
   * JSON Schema-compatible input contract.
   * $id should match the agent's PortSchema.$id.
   */
  inputSchema: {
    $id: string;
    version: string;
    /** Required input field names. */
    required?: string[];
    properties: Record<string, { type: string; description: string }>;
  };

  /**
   * JSON Schema-compatible output contract.
   * $id should match the agent's PortSchema.$id.
   */
  outputSchema: {
    $id: string;
    version: string;
    properties: Record<string, { type: string; description: string }>;
  };

  /**
   * Path to the system prompt template file.
   * Relative to project root (e.g. "engine/prompts/templates/...").
   */
  promptSource: string;

  /**
   * Path to the adapter implementation module.
   * Relative to project root (e.g. "engine/registry/adapters/...").
   */
  adapterSource: string;
}

// ============================================================================
// AGENT_MANIFEST — All 13 Agents
// ============================================================================

export const AGENT_MANIFEST = [
  // ==========================================================================
  // 1. @Trend Researcher
  // ==========================================================================
  {
    agentId: "trend-researcher",
    displayName: "@Trend Researcher",
    version: "1.0.0",
    description:
      "Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Provides actionable insights that drive product strategy and innovation decisions through comprehensive market research and predictive analysis.",
    promptVersion: "trend-researcher.v1",
    contextReads: [
      "campaign.brief",
      "campaign.goal",
      "market.industry",
      "market.segment",
      "audience.segment",
    ],
    contextWrites: [
      "research.trends",
      "research.topics",
      "research.audienceInsights",
      "research.marketTrends",
      "research.competitorAnalysis",
      "research.leadSignals",
      "research.icpRefinement",
    ],
    capabilities: [
      "market-research",
      "trend-analysis",
      "competitive-intelligence",
      "opportunity-assessment",
      "consumer-insights",
      "technology-scouting",
      "regulatory-intelligence",
      "weak-signal-detection",
    ],
    inputSchema: {
      $id: "trend-researcher-input.v1",
      version: "1.0.0",
      required: ["industry", "sources", "timeHorizon"],
      properties: {
        industry: {
          type: "string",
          description:
            "Target industry for trend analysis (e.g. 'fintech', 'healthcare', 'saas')",
        },
        competitors: {
          type: "array",
          description: "List of competitor names or identifiers to analyze",
        },
        sources: {
          type: "array",
          description:
            "Data sources for research (e.g. 'google-trends', 'semrush', 'crunchbase', 'patent-db')",
        },
        timeHorizon: {
          type: "string",
          description:
            "Forecast horizon: short (0-6mo), medium (6-18mo), long (18-36mo)",
        },
        geography: {
          type: "string",
          description: "Geographic market scope (e.g. 'global', 'north-america', 'eu')",
        },
        hypotheses: {
          type: "array",
          description: "Initial trend hypotheses to validate or refute through research",
        },
      },
    },
    outputSchema: {
      $id: "trend-researcher-output.v1",
      version: "1.0.0",
      properties: {
        trendReport: {
          type: "string",
          description:
            "Comprehensive trend analysis report with signals, pattern recognition, and forecasts",
        },
        competitiveLandscape: {
          type: "string",
          description:
            "Competitive positioning analysis with SWOT, market maps, and white-space identification",
        },
        opportunityMatrix: {
          type: "string",
          description:
            "Prioritized opportunity matrix mapping trends to market gaps with sizing",
        },
        recommendations: {
          type: "array",
          description:
            "Actionable strategic recommendations with implementation guidance",
        },
        sourceIndex: {
          type: "array",
          description:
            "Curated source index with credibility scoring for all referenced data",
        },
      },
    },
    promptSource: "engine/prompts/templates/trend-researcher-v1.yaml",
    adapterSource: "engine/registry/adapters/trend-researcher.adapter.ts",
  },

  // ==========================================================================
  // 2. @SEO Specialist
  // ==========================================================================
  {
    agentId: "seo-specialist",
    displayName: "@SEO Specialist",
    version: "1.0.0",
    description:
      "Search engine optimization specialist that analyzes keyword opportunities, search volume data, and competitive landscape. Produces actionable SEO recommendations including keyword strategy, content gap analysis, technical audit findings, and link-building opportunities.",
    promptVersion: "seo-specialist.v1",
    contextReads: [
      "research.topics",
      "research.trends",
      "campaign.targetKeywords",
    ],
    contextWrites: [
      "seo.keywords",
      "seo.searchVolume",
      "seo.contentGaps",
      "seo.optimizationTips",
    ],
    capabilities: [
      "seo-audit",
      "keyword-research",
      "technical-seo",
      "content-optimization",
      "link-building-strategy",
      "search-volume-analysis",
      "content-gap-identification",
    ],
    inputSchema: {
      $id: "seo-specialist-input.v1",
      version: "1.0.0",
      required: ["topics", "targetKeywords"],
      properties: {
        topics: {
          type: "array",
          description: "Content topics to analyze for keyword opportunities",
        },
        trends: {
          type: "array",
          description: "Current market trends to factor into keyword strategy",
        },
        targetKeywords: {
          type: "array",
          description: "Existing target keywords to evaluate and expand",
        },
        mode: {
          type: "string",
          description: "Analysis mode: 'audit', 'optimize', or 'brief-review'",
        },
        websiteContent: {
          type: "string",
          description: "Existing website or content for technical SEO audit",
        },
      },
    },
    outputSchema: {
      $id: "seo-specialist-output.v1",
      version: "1.0.0",
      properties: {
        keywords: {
          type: "array",
          description: "Prioritized keyword list with search volume and difficulty scores",
        },
        searchVolume: {
          type: "object",
          description: "Search volume data mapped to keywords and topics",
        },
        contentGaps: {
          type: "array",
          description: "Identified content gaps and opportunities in the competitive landscape",
        },
        optimizationTips: {
          type: "array",
          description: "Actionable SEO optimization recommendations",
        },
        seoAudit: {
          type: "object",
          description: "Technical SEO audit findings and recommendations",
        },
      },
    },
    promptSource: "lib/agents/seo-specialist/prompts/seo-specialist.v1.prompt.yaml",
    adapterSource: "agents/seo-specialist/seo-specialist.adapter.ts",
  },

  // ==========================================================================
  // 3. @Content Creator
  // ==========================================================================
  {
    agentId: "content-creator",
    displayName: "@Content Creator",
    version: "1.0.0",
    description:
      "Multi-platform content producer who crafts compelling written and visual content aligned with brand voice, SEO strategy, and audience preferences. Produces blog posts, social copy, newsletters, video scripts, and more with self-assessed quality scoring.",
    promptVersion: "content-creator.v1",
    contextReads: [
      "research.topics",
      "seo.keywords",
      "seo.optimizationTips",
      "campaign.tone",
      "campaign.format",
    ],
    contextWrites: [
      "content.body",
      "content.qualityScore",
      "content.revisionNotes",
      "content.headline",
    ],
    capabilities: [
      "content-creation",
      "copywriting",
      "brand-storytelling",
      "multi-platform-adaptation",
      "headline-generation",
      "quality-assessment",
      "seo-integration",
    ],
    inputSchema: {
      $id: "content-creator-input.v1",
      version: "1.0.0",
      required: ["contentBrief", "platform", "tone"],
      properties: {
        contentBrief: {
          type: "string",
          description: "High-level content brief describing the topic, goals, and constraints",
        },
        targetAudience: {
          type: "object",
          description: "Audience profile with demographics, interests, and pain points",
        },
        platform: {
          type: "string",
          description: "Target platform (e.g. 'blog', 'linkedin', 'twitter', 'email')",
        },
        brandGuidelines: {
          type: "object",
          description: "Brand voice profile with tone, values, and reading level",
        },
        keywords: {
          type: "object",
          description: "SEO keyword map with primary, secondary, and semantic keywords",
        },
        tone: {
          type: "string",
          description: "Desired tone for the content (e.g. 'professional', 'conversational')",
        },
        campaignGoals: {
          type: "array",
          description: "Campaign objectives this content should support",
        },
      },
    },
    outputSchema: {
      $id: "content-creator-output.v1",
      version: "1.0.0",
      properties: {
        content: {
          type: "string",
          description: "The full content body or draft",
        },
        headline: {
          type: "string",
          description: "Primary headline or title for the content",
        },
        qualityScore: {
          type: "number",
          description: "Self-assessed content quality score (0–1) used for quality gating",
        },
        revisionNotes: {
          type: "string",
          description: "Notes on revisions needed if quality score is below threshold",
        },
        metaDescription: {
          type: "string",
          description: "SEO meta description for the content",
        },
      },
    },
    promptSource: "lib/agents/prompts/content-creator.v1.prompt.yaml",
    adapterSource: "lib/agents/adapters/content-creator.adapter.ts",
  },

  // ==========================================================================
  // 4. @Social Media Strategist
  // ==========================================================================
  {
    agentId: "social-media-strategist",
    displayName: "@Social Media Strategist",
    version: "1.0.0",
    description:
      "Cross-platform social media strategist that creates platform-adapted content variants, builds content calendars, defines hashtag strategies, plans amplification tactics, and forecasts engagement metrics. Optimizes distribution across LinkedIn, Twitter/X, Instagram, Facebook, Reddit, and more.",
    promptVersion: "social-media-strategist.v1",
    contextReads: [
      "content.body",
      "content.headline",
      "research.audienceInsights",
      "campaign.platforms",
    ],
    contextWrites: [
      "distribution.strategy",
      "distribution.schedule",
      "distribution.platformContent",
      "distribution.engagementTargets",
    ],
    capabilities: [
      "social-media-strategy",
      "platform-content-adaptation",
      "content-calendaring",
      "hashtag-strategy",
      "amplification-planning",
      "engagement-forecasting",
      "community-engagement",
      "cross-platform-distribution",
    ],
    inputSchema: {
      $id: "social-media-strategist-input.v1",
      version: "1.0.0",
      required: ["platformTargets", "contentAssets", "campaignObjectives", "postingSchedule"],
      properties: {
        platformTargets: {
          type: "array",
          description: "Target social platforms (e.g. 'linkedin', 'twitter', 'instagram')",
        },
        contentAssets: {
          type: "array",
          description: "Content assets from upstream agents for platform adaptation",
        },
        campaignObjectives: {
          type: "array",
          description: "Campaign objectives (e.g. 'brand_awareness', 'lead_generation')",
        },
        audienceSegments: {
          type: "array",
          description: "Target audience segments with platform priorities",
        },
        postingSchedule: {
          type: "object",
          description: "Desired posting schedule constraints (start, end, frequency, timezone)",
        },
        engagementHistory: {
          type: "array",
          description: "Historical engagement data to inform strategy",
        },
        brandVoice: {
          type: "string",
          description: "Brand voice directive for content adaptation",
        },
      },
    },
    outputSchema: {
      $id: "social-media-strategist-output.v1",
      version: "1.0.0",
      properties: {
        postVariants: {
          type: "array",
          description: "Platform-adapted content variants with character counts and validation",
        },
        contentCalendar: {
          type: "array",
          description: "Scheduled content calendar with timing and platform assignments",
        },
        hashtagStrategy: {
          type: "array",
          description: "Per-platform hashtag strategy with tiered hashtag sets",
        },
        amplificationPlan: {
          type: "array",
          description: "Amplification tactics to extend organic reach",
        },
        engagementMetricsForecast: {
          type: "array",
          description: "Forecasted engagement metrics per platform",
        },
        postingCadenceSummary: {
          type: "array",
          description: "Cross-platform posting cadence summary with best times to post",
        },
      },
    },
    promptSource: "lib/agents/prompts/social-media-strategist.v1.prompt.yaml",
    adapterSource: "lib/agents/adapters/social-media-strategist.adapter.ts",
  },

  // ==========================================================================
  // 5. @Growth Hacker
  // ==========================================================================
  {
    agentId: "growth-hacker",
    displayName: "@Growth Hacker",
    version: "1.0.0",
    description:
      "Rapid user acquisition specialist using data-driven experimentation, viral loop development, funnel optimization, and scalable channel growth. Designs A/B test plans, prioritizes growth channels with ROI projections, and builds viral mechanics using the AARRR (Pirate Metrics) framework.",
    promptVersion: "growth-hacker.v1",
    contextReads: [
      "product.positioning",
      "product.valueProps",
      "research.leadSignals",
      "research.icpRefinement",
    ],
    contextWrites: [
      "growth.outreachStrategy",
      "growth.experiments",
      "growth.channels",
      "growth.conversionFunnel",
    ],
    capabilities: [
      "growth-strategy",
      "a-b-test-design",
      "viral-loop-development",
      "funnel-optimization",
      "channel-prioritization",
      "user-acquisition",
      "conversion-optimization",
      "aarrr-metrics-analysis",
    ],
    inputSchema: {
      $id: "growth-hacker-input.v1",
      version: "1.0.0",
      required: ["productSpec", "aarrrMetrics", "userSegments", "channelPerformance"],
      properties: {
        productSpec: {
          type: "object",
          description: "Product or feature specification for growth experimentation",
        },
        aarrrMetrics: {
          type: "object",
          description: "Current AARRR (Pirate Metrics) funnel metrics snapshot",
        },
        userSegments: {
          type: "array",
          description: "Target user segments with behavioral and demographic attributes",
        },
        channelPerformance: {
          type: "array",
          description: "Channel performance data from recent periods with ROAS data",
        },
        experimentHistory: {
          type: "array",
          description: "History of past growth experiments and their outcomes",
        },
        budgetConstraints: {
          type: "array",
          description: "Budget constraints per channel",
        },
        acquisitionTargets: {
          type: "object",
          description: "Acquisition targets for the growth period",
        },
        focusStages: {
          type: "array",
          description: "Funnel stages to focus on in priority order",
        },
      },
    },
    outputSchema: {
      $id: "growth-hacker-output.v1",
      version: "1.0.0",
      properties: {
        experiments: {
          type: "array",
          description: "Designed growth experiments with hypotheses, sample sizes, and tracking plans",
        },
        channelPriorities: {
          type: "array",
          description: "Prioritized channel ranking with budget allocation and ROI projections",
        },
        viralLoopDesign: {
          type: "object",
          description: "Viral loop mechanics with K-factor analysis and incentive structures",
        },
        funnelOptimizations: {
          type: "array",
          description: "AARRR funnel optimization recommendations per stage",
        },
        projectedImpact: {
          type: "object",
          description: "Projected impact summary of all recommended initiatives",
        },
        executiveSummary: {
          type: "string",
          description: "Summary suitable for dashboards or executive readout",
        },
      },
    },
    promptSource: "lib/agents/prompts/growth-hacker.v1.prompt.yaml",
    adapterSource: "engine/registry/adapters/growth-hacker.adapter.ts",
  },

  // ==========================================================================
  // 6. @Product Manager
  // ==========================================================================
  {
    agentId: "product-manager",
    displayName: "@Product Manager",
    version: "1.0.0",
    description:
      "Strategic product leader who translates market research, competitive intelligence, and business goals into clear product strategy. Defines product positioning, differentiators, value propositions, pricing strategy, and aligns cross-functional stakeholders around a shared product vision.",
    promptVersion: "product-manager.v1",
    contextReads: [
      "research.marketTrends",
      "research.competitorAnalysis",
      "campaign.product",
      "campaign.features",
    ],
    contextWrites: [
      "product.positioning",
      "product.differentiators",
      "product.valueProps",
      "product.pricingStrategy",
    ],
    capabilities: [
      "product-strategy",
      "roadmapping",
      "user-stories",
      "feature-prioritization",
      "stakeholder-management",
      "market-positioning",
      "pricing-strategy",
      "cross-functional-alignment",
    ],
    inputSchema: {
      $id: "product-manager-input.v1",
      version: "1.0.0",
      required: ["marketResearch", "product"],
      properties: {
        marketResearch: {
          type: "object",
          description: "Market research data including trends, competitive analysis, and lead signals",
        },
        marketTrends: {
          type: "array",
          description: "Current market trends and macro signals",
        },
        competitorAnalysis: {
          type: "object",
          description: "Competitive landscape analysis with SWOT and positioning",
        },
        product: {
          type: "string",
          description: "Product name or description for positioning",
        },
        features: {
          type: "array",
          description: "Product features to differentiate and prioritize",
        },
        campaignGoal: {
          type: "string",
          description: "Business goal the product strategy should support",
        },
      },
    },
    outputSchema: {
      $id: "product-manager-output.v1",
      version: "1.0.0",
      properties: {
        positioning: {
          type: "string",
          description: "Product positioning statement and market narrative",
        },
        differentiators: {
          type: "array",
          description: "Key product differentiators vs. competitive alternatives",
        },
        valueProps: {
          type: "array",
          description: "Prioritized value propositions for different buyer personas",
        },
        pricingStrategy: {
          type: "object",
          description: "Pricing strategy recommendations with tiering and packaging",
        },
        productSpec: {
          type: "string",
          description: "Product specification or PRD summary",
        },
        kpiDefinitions: {
          type: "array",
          description: "Success metrics and KPI definitions for the product initiative",
        },
      },
    },
    promptSource: "lib/agents/prompts/product-manager.v1.prompt.yaml",
    adapterSource: "lib/agents/adapters/product-manager.adapter.ts",
  },

  // ==========================================================================
  // 7. @Proposal Strategist
  // ==========================================================================
  {
    agentId: "proposal-strategist",
    displayName: "@Proposal Strategist",
    version: "1.0.0",
    description:
      "Transforms RFPs and sales opportunities into compelling win narratives. Develops win themes, competitive positioning strategies, executive summaries, and objection handling playbooks that persuade evaluators and differentiate the proposal from competitors.",
    promptVersion: "proposal-strategist.v1",
    contextReads: [
      "product.positioning",
      "product.differentiators",
      "product.valueProps",
      "growth.outreachStrategy",
      "research.marketTrends",
    ],
    contextWrites: [
      "sales.proposal",
      "sales.pitchDeck",
      "sales.closingStrategy",
      "sales.objectionHandling",
    ],
    capabilities: [
      "proposal-development",
      "win-theme-creation",
      "competitive-positioning",
      "executive-summary-crafting",
      "objection-handling",
      "pitch-deck-creation",
      "stakeholder-persona-mapping",
      "rfp-response",
    ],
    inputSchema: {
      $id: "proposal-strategist-input.v1",
      version: "1.0.0",
      required: ["rfpDocument", "competitiveLandscape", "bidderContext"],
      properties: {
        rfpDocument: {
          type: "object",
          description: "The canonical RFP or solicitation document content",
        },
        dealQualification: {
          type: "object",
          description: "Strategic context and qualification output from deal analysis",
        },
        competitiveLandscape: {
          type: "object",
          description: "Competitive landscape intelligence for the opportunity",
        },
        candidateWinThemes: {
          type: "array",
          description: "Candidate win themes that may be refined by the agent",
        },
        stakeholderPersonas: {
          type: "array",
          description: "Stakeholder or buyer personas this proposal must persuade",
        },
        bidderContext: {
          type: "object",
          description: "Organizational context about the bidding entity",
        },
        evaluationCriteria: {
          type: "array",
          description: "Evaluation criteria weighting from the RFP or discovery",
        },
      },
    },
    outputSchema: {
      $id: "proposal-strategist-output.v1",
      version: "1.0.0",
      properties: {
        proposal: {
          type: "string",
          description: "Full sales proposal narrative with win themes and compliance",
        },
        pitchDeck: {
          type: "string",
          description: "Pitch deck outline with slide-by-slide guidance",
        },
        closingStrategy: {
          type: "string",
          description: "Closing strategy with next steps and stakeholder engagement plan",
        },
        objectionHandling: {
          type: "array",
          description: "Objection handling playbook with responses for likely concerns",
        },
        winThemeSummary: {
          type: "array",
          description: "Summary of win themes with competitive differentiators",
        },
      },
    },
    promptSource: "src/agents/proposal-strategist/proposal-strategist.v1.prompt.yaml",
    adapterSource: "src/agents/proposal-strategist/proposal-strategist.adapter.ts",
  },

  // ==========================================================================
  // 8. @Support Responder
  // ==========================================================================
  {
    agentId: "support-responder",
    displayName: "@Support Responder",
    version: "1.0.0",
    description:
      "Customer-facing support agent that triages incoming incidents, gathers initial diagnostics, classifies severity, and produces empathetic, SLA-compliant, brand-aligned responses. Handles technical, billing, account, and general inquiries across email, chat, phone, and social channels.",
    promptVersion: "support-responder.v1",
    contextReads: [
      "incident.report",
      "incident.source",
      "incident.timestamp",
    ],
    contextWrites: [
      "incident.triageSummary",
      "incident.severity",
      "incident.affectedServices",
      "incident.initialLogs",
    ],
    capabilities: [
      "incident-triage",
      "severity-classification",
      "customer-response",
      "empathy-driven-communication",
      "sla-compliance",
      "multi-channel-support",
      "ticket-management",
      "escalation-handling",
    ],
    inputSchema: {
      $id: "support-responder-input.v1",
      version: "1.0.0",
      required: ["report", "source"],
      properties: {
        report: {
          type: "string",
          description: "Incident report or customer complaint description",
        },
        source: {
          type: "string",
          description: "Source channel of the incident (e.g. 'email', 'chat', 'phone')",
        },
        timestamp: {
          type: "string",
          description: "ISO 8601 timestamp of when the incident occurred",
        },
        customerHistory: {
          type: "object",
          description: "Customer context including account tier, tenure, previous interactions",
        },
        ticketDetails: {
          type: "object",
          description: "Support ticket details including ID, subject, status, priority",
        },
      },
    },
    outputSchema: {
      $id: "support-responder-output.v1",
      version: "1.0.0",
      properties: {
        triageSummary: {
          type: "string",
          description: "Triage summary with initial assessment and prioritized actions",
        },
        severity: {
          type: "string",
          description: "Classified incident severity (e.g. 'SEV1', 'SEV2', 'SEV3')",
        },
        affectedServices: {
          type: "array",
          description: "Systems or services affected by the incident",
        },
        initialLogs: {
          type: "string",
          description: "Initial diagnostic logs or error messages gathered during triage",
        },
        responseDraft: {
          type: "string",
          description: "Draft customer response with empathetic, brand-aligned messaging",
        },
      },
    },
    promptSource: "src/agents/support-responder/prompts/support-responder.v1.prompt.yaml",
    adapterSource: "src/agents/support-responder/support-responder.adapter.ts",
  },

  // ==========================================================================
  // 9. @Infrastructure Maintainer
  // ==========================================================================
  {
    agentId: "infrastructure-maintainer",
    displayName: "@Infrastructure Maintainer",
    version: "1.0.0",
    description:
      "Infrastructure reliability specialist ensuring system health, performance optimization, and technical operations management. Monitors infrastructure metrics, analyzes incidents, recommends scaling and configuration changes, validates SLO compliance, and forecasts capacity needs.",
    promptVersion: "infrastructure-maintainer.v1",
    contextReads: [
      "incident.triageSummary",
      "incident.severity",
      "incident.affectedServices",
      "incident.initialLogs",
    ],
    contextWrites: [
      "infra.rootCause",
      "infra.impactAnalysis",
      "infra.affectedResources",
      "infra.timeline",
      "infra.recommendations",
    ],
    capabilities: [
      "infrastructure-monitoring",
      "performance-analysis",
      "capacity-planning",
      "cost-optimization",
      "incident-analysis",
      "config-management",
      "disaster-recovery",
      "scaling-recommendation",
      "alert-classification",
      "slo-validation",
      "trend-forecasting",
    ],
    inputSchema: {
      $id: "infrastructure-maintainer-input.v1",
      version: "1.0.0",
      required: ["systemMetrics", "deploymentStatus", "alertHistory", "incidentReports"],
      properties: {
        systemMetrics: {
          type: "object",
          description: "Current CPU, memory, latency, error rates, and throughput metrics",
        },
        deploymentStatus: {
          type: "array",
          description: "State of all service deployments (stable, rolling, canary, etc.)",
        },
        alertHistory: {
          type: "array",
          description: "Recent alert events for trend analysis and severity classification",
        },
        configChanges: {
          type: "array",
          description: "Recent configuration change events with before/after values",
        },
        scalingEvents: {
          type: "array",
          description: "Recent auto-scaling actions with direction and delta",
        },
        incidentReports: {
          type: "array",
          description: "Open and post-mortem incident reports for root cause analysis",
        },
        sloTargets: {
          type: "array",
          description: "SLO targets for availability, latency, and error rate compliance",
        },
        capacityThresholds: {
          type: "object",
          description: "Overrides for default capacity alert thresholds",
        },
      },
    },
    outputSchema: {
      $id: "infrastructure-maintainer-output.v1",
      version: "1.0.0",
      properties: {
        rootCause: {
          type: "string",
          description: "Identified root cause of infrastructure incidents",
        },
        impactAnalysis: {
          type: "string",
          description: "Blast radius analysis including affected users, services, and error budget",
        },
        affectedResources: {
          type: "array",
          description: "Specific resources or services affected by the issue",
        },
        timeline: {
          type: "array",
          description: "Event timeline with timestamps and actions taken",
        },
        recommendations: {
          type: "array",
          description: "Actionable recommendations for remediation and prevention",
        },
        healthReport: {
          type: "object",
          description: "Comprehensive infrastructure health assessment",
        },
        capacityForecast: {
          type: "object",
          description: "Projected load growth and scaling needs",
        },
        executiveSummary: {
          type: "string",
          description: "One-paragraph summary for dashboards or notifications",
        },
      },
    },
    promptSource: "lib/agent-registry/prompts/infrastructure-maintainer.v1.prompt.yaml",
    adapterSource: "lib/agent-registry/adapters/infrastructure-maintainer.ts",
  },

  // ==========================================================================
  // 10. @Backend Architect
  // ==========================================================================
  {
    agentId: "backend-architect",
    displayName: "@Backend Architect",
    version: "1.0.0",
    description:
      "Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Produces architecture design documents, API contracts, data models, deployment topologies, integration patterns, migration plans, and security reviews.",
    promptVersion: "backend-architect.v1",
    contextReads: [
      "infra.rootCause",
      "infra.impactAnalysis",
      "infra.affectedResources",
      "infra.recommendations",
    ],
    contextWrites: [
      "resolution.fixPlan",
      "resolution.rollbackPlan",
      "resolution.validationSteps",
      "resolution.estimatedTimeToResolve",
      "resolution.postMortemNotes",
    ],
    capabilities: [
      "system-architecture-design",
      "database-schema-design",
      "api-contract-development",
      "deployment-topology-planning",
      "security-review",
      "migration-planning",
      "performance-optimization",
      "microservices-decomposition",
    ],
    inputSchema: {
      $id: "backend-architect-input.v1",
      version: "1.0.0",
      required: ["systemRequirements", "architectureContext"],
      properties: {
        systemRequirements: {
          type: "string",
          description: "Functional and non-functional requirements for the system",
        },
        architectureContext: {
          type: "string",
          description: "Existing architecture context and constraints",
        },
        integrationSpecs: {
          type: "array",
          description: "Integration specifications for external systems",
        },
        performanceRequirements: {
          type: "object",
          description: "Performance requirements including response times and throughput",
        },
        securityConstraints: {
          type: "array",
          description: "Security and compliance constraints",
        },
        existingSystemLandscape: {
          type: "string",
          description: "Description of the existing system landscape",
        },
        constraints: {
          type: "array",
          description: "Technical, business, or timeline constraints",
        },
      },
    },
    outputSchema: {
      $id: "backend-architect-output.v1",
      version: "1.0.0",
      properties: {
        architectureDesignDoc: {
          type: "string",
          description: "Complete architecture design document",
        },
        apiContracts: {
          type: "array",
          description: "API contracts for all services with versions",
        },
        dataModels: {
          type: "array",
          description: "Data models with entities, schemas, and indexes",
        },
        deploymentTopology: {
          type: "string",
          description: "Deployment topology diagram and infrastructure layout",
        },
        integrationPatterns: {
          type: "array",
          description: "Integration patterns for internal and external communication",
        },
        migrationPlan: {
          type: "string",
          description: "Migration plan if transitioning from legacy systems",
        },
        securityReview: {
          type: "string",
          description: "Security review findings and recommendations",
        },
        fixPlan: {
          type: "string",
          description: "Fix or remediation plan for the identified issues",
        },
        rollbackPlan: {
          type: "string",
          description: "Rollback strategy if the fix needs to be reversed",
        },
        validationSteps: {
          type: "array",
          description: "Steps to validate that the fix resolves the issue",
        },
        estimatedTimeToResolve: {
          type: "string",
          description: "Estimated time to implement and validate the fix",
        },
        postMortemNotes: {
          type: "string",
          description: "Post-mortem analysis notes for incident documentation",
        },
      },
    },
    promptSource: "engine/prompts/templates/backend-architect-v1.yaml",
    adapterSource: "engine/registry/adapters/backend-architect.adapter.ts",
  },

  // ==========================================================================
  // 11. @Recruitment Specialist
  // ==========================================================================
  {
    agentId: "recruitment-specialist",
    displayName: "@Recruitment Specialist",
    version: "1.0.0",
    description:
      "Full-cycle recruitment agent covering job requisition analysis, candidate sourcing across multiple channels, screening and assessment, interview coordination, offer management, and pipeline health analytics. Supports China-market platforms and compliance with local labor laws.",
    promptVersion: "recruitment-specialist.v1",
    contextReads: [
      "recruitment.jobRequisition",
      "recruitment.roleRequirements",
      "recruitment.hiringManagerContext",
      "recruitment.candidatePipeline",
    ],
    contextWrites: [
      "recruitment.candidateShortlist",
      "recruitment.assessmentResults",
      "recruitment.pipelineHealth",
      "recruitment.sourcingStrategy",
      "recruitment.offerRecommendation",
    ],
    capabilities: [
      "job-requisition-analysis",
      "candidate-sourcing",
      "candidate-screening",
      "interview-coordination",
      "offer-management",
      "pipeline-analytics",
      "compliance-monitoring",
      "multi-channel-sourcing",
    ],
    inputSchema: {
      $id: "recruitment-specialist-input.v1",
      version: "1.0.0",
      required: ["jobRequisition", "roleRequirements"],
      properties: {
        jobRequisition: {
          type: "object",
          description: "Job requisition including title, department, location, and hiring details",
        },
        roleRequirements: {
          type: "object",
          description: "Structured role requirements derived from the JD and hiring manager intake",
        },
        hiringManagerContext: {
          type: "object",
          description: "Context about the hiring manager and team dynamics",
        },
        candidatePipeline: {
          type: "object",
          description: "Live candidate pipeline data for pipeline health analysis",
        },
        sourcingChannels: {
          type: "array",
          description: "Preferred sourcing channels for candidate outreach",
        },
      },
    },
    outputSchema: {
      $id: "recruitment-specialist-output.v1",
      version: "1.0.0",
      properties: {
        candidateShortlist: {
          type: "array",
          description: "Prioritized shortlist of matched candidates with fit scores",
        },
        assessmentResults: {
          type: "array",
          description: "Assessment results across technical, domain, and soft skill dimensions",
        },
        pipelineHealth: {
          type: "object",
          description: "Pipeline health analysis with stage conversion rates and bottlenecks",
        },
        sourcingStrategy: {
          type: "object",
          description: "Recommended sourcing strategy with channel prioritization",
        },
        offerRecommendation: {
          type: "object",
          description: "Offer recommendation with salary benchmarking and negotiation guidance",
        },
      },
    },
    promptSource: "agents/recruitment-specialist/recruitment-specialist.v1.prompt.yaml",
    adapterSource: "agents/recruitment-specialist/recruitment-specialist.adapter.ts",
  },

  // ==========================================================================
  // 12. @UI Designer
  // ==========================================================================
  {
    agentId: "ui-designer",
    displayName: "@UI Designer",
    version: "1.0.0",
    description:
      "Expert user interface designer who creates beautiful, consistent, and accessible interfaces. Specializes in visual design systems, component libraries, design token generation, WCAG accessibility auditing, responsive breakpoint definitions, and pixel-perfect interface creation that reflects brand identity.",
    promptVersion: "ui-designer.v1",
    contextReads: [
      "productRoadmap",
      "userFeedback",
      "brandGuidelines",
    ],
    contextWrites: [
      "designSystem",
      "componentLibrary",
      "accessibilityAudit",
      "designTokens",
    ],
    capabilities: [
      "design-system-creation",
      "component-library-development",
      "design-token-generation",
      "accessibility-auditing",
      "responsive-design",
      "interactive-prototyping",
      "visual-hierarchy-design",
      "brand-consistency",
    ],
    inputSchema: {
      $id: "ui-designer-input.v1",
      version: "1.0.0",
      required: ["designBrief", "brandGuidelines", "accessibilityTarget"],
      properties: {
        designBrief: {
          type: "string",
          description: "High-level creative brief describing the design scope, objectives, and constraints",
        },
        brandGuidelines: {
          type: "string",
          description: "Brand identity guidelines including color palettes, typography, and tone",
        },
        platform: {
          type: "string",
          description: "Target platform: 'web', 'mobile', or 'desktop'",
        },
        componentNeeds: {
          type: "array",
          description: "List of components the design system must cover",
        },
        accessibilityTarget: {
          type: "string",
          description: "WCAG accessibility target level: 'A', 'AA', or 'AAA'",
        },
        userPersonas: {
          type: "array",
          description: "User persona descriptions for human-centred design decisions",
        },
      },
    },
    outputSchema: {
      $id: "ui-designer-output.v1",
      version: "1.0.0",
      properties: {
        designSystem: {
          type: "string",
          description: "Comprehensive design system documentation with foundations and guidelines",
        },
        componentLibrary: {
          type: "array",
          description: "Typed component library with states, variants, and design token mappings",
        },
        accessibilityAudit: {
          type: "object",
          description: "WCAG accessibility audit with compliance score, issues, and recommendations",
        },
        designTokens: {
          type: "object",
          description: "Design token dictionary including colors, typography, spacing, and shadows",
        },
        responsiveBreakpoints: {
          type: "array",
          description: "Responsive breakpoint definitions for mobile, tablet, desktop views",
        },
      },
    },
    promptSource: "lib/agents/prompts/ui-designer.v1.prompt.yaml",
    adapterSource: "engine/registry/adapters/ui-designer.adapter.ts",
  },

  // ==========================================================================
  // 13. @Workflow Architect
  // ==========================================================================
  {
    agentId: "workflow-architect",
    displayName: "@Workflow Architect",
    version: "1.0.0",
    description:
      "Designs and optimizes multi-agent workflow graphs for the Nexus orchestration engine. Analyzes business goals, decomposes them into agent-executable steps, builds DAG execution plans with parallel/serial node layouts, defines context contracts between agents, and validates pipeline topology for cycle-free execution.",
    promptVersion: "workflow-architect.v1",
    contextReads: [
      "campaign.goal",
      "campaign.brief",
      "workflow.constraints",
    ],
    contextWrites: [
      "workflow.definition",
      "workflow.graph",
      "workflow.executionStrategy",
      "workflow.contracts",
    ],
    capabilities: [
      "workflow-design",
      "dag-topology-optimization",
      "agent-graph-modeling",
      "context-contract-definition",
      "pipeline-validation",
      "parallel-execution-planning",
      "dependency-graph-analysis",
      "workflow-decomposition",
    ],
    inputSchema: {
      $id: "workflow-architect-input.v1",
      version: "1.0.0",
      required: ["workflowGoal", "availableAgents"],
      properties: {
        workflowGoal: {
          type: "string",
          description: "High-level goal the workflow should accomplish",
        },
        availableAgents: {
          type: "array",
          description: "List of available agent IDs that can be used in the workflow",
        },
        constraints: {
          type: "array",
          description: "Workflow constraints (e.g. parallelism limits, ordering requirements)",
        },
        existingWorkflows: {
          type: "array",
          description: "Existing workflow definitions to reference or compose with",
        },
        contextRequirements: {
          type: "array",
          description: "Required context keys the workflow must produce",
        },
      },
    },
    outputSchema: {
      $id: "workflow-architect-output.v1",
      version: "1.0.0",
      properties: {
        definition: {
          type: "object",
          description: "Complete workflow definition with nodes, edges, and config",
        },
        graph: {
          type: "object",
          description: "DAG graph representation with levels of parallel-executable nodes",
        },
        executionStrategy: {
          type: "string",
          description: "Recommended execution strategy (SINGLE_AGENT, CHAIN, or DAG)",
        },
        contracts: {
          type: "object",
          description: "Context contracts defining what each agent reads and writes",
        },
        validationReport: {
          type: "object",
          description: "Validation report including cycle detection and dependency analysis",
        },
      },
    },
    promptSource: "lib/agent-registry/prompts/workflow-architect.v1.prompt.yaml",
    adapterSource: "lib/agent-registry/adapters/workflow-architect.adapter.ts",
  },
] as const satisfies AgentManifestEntry[];

// ============================================================================
// Lookup Helpers
// ============================================================================

/**
 * Look up a manifest entry by agent ID.
 * Returns `undefined` if no agent matches.
 *
 * @example
 * const trend = getManifestEntry("trend-researcher");
 * console.log(trend?.displayName); // "@Trend Researcher"
 */
export function getManifestEntry(
  agentId: string,
): AgentManifestEntry | undefined {
  return AGENT_MANIFEST.find((entry) => entry.agentId === agentId);
}

/**
 * Find all agents that read from or write to a specific context key.
 * Useful for understanding which agents depend on a given piece of data.
 *
 * @example
 * const consumers = findAgentsByContextKey("research.trends");
 * // Returns agents that read or write "research.trends"
 */
export function findAgentsByContextKey(key: string): AgentManifestEntry[] {
  return AGENT_MANIFEST.filter(
    (entry) =>
      (entry.contextReads as readonly string[]).includes(key) ||
      (entry.contextWrites as readonly string[]).includes(key),
  );
}

/**
 * Find all agents that have a given capability.
 *
 * @example
 * const seoAgents = findAgentsByCapability("seo-audit");
 */
export function findAgentsByCapability(
  capability: string,
): AgentManifestEntry[] {
  return AGENT_MANIFEST.filter((entry) =>
    (entry.capabilities as readonly string[]).includes(capability),
  );
}

/**
 * Build a complete context flow map.
 *
 * Returns a Map where keys are context paths (e.g. "research.trends") and
 * values are objects listing which agents *produce* the key (write) and
 * which *consume* it (read).
 *
 * This is essential for:
 * - Detecting duplicate context ownership (two agents writing the same key)
 * - Identifying missing providers (a key is read but never written)
 * - Visualizing data dependencies across the entire agent ecosystem
 * - Validating pipeline completeness before execution
 *
 * @example
 * const flow = getContextFlow();
 * const trends = flow.get("research.trends");
 * // trends = { producers: ["trend-researcher"], consumers: ["seo-specialist", "content-creator"] }
 */
export function getContextFlow(): Map<
  string,
  { producers: string[]; consumers: string[] }
> {
  const flow = new Map<string, { producers: string[]; consumers: string[] }>();

  for (const entry of AGENT_MANIFEST) {
    // Register writes (producers)
    for (const writeKey of entry.contextWrites) {
      const existing = flow.get(writeKey) ?? { producers: [], consumers: [] };
      if (!existing.producers.includes(entry.agentId)) {
        existing.producers.push(entry.agentId);
      }
      flow.set(writeKey, existing);
    }

    // Register reads (consumers)
    for (const readKey of entry.contextReads) {
      const existing = flow.get(readKey) ?? { producers: [], consumers: [] };
      if (!existing.consumers.includes(entry.agentId)) {
        existing.consumers.push(entry.agentId);
      }
      flow.set(readKey, existing);
    }
  }

  return flow;
}
