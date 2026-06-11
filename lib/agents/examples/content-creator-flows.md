# @content-creator — Execution Flow Examples

This document demonstrates how the Content Creator agent adapter integrates into the Nexus Agent Orchestration Engine across three execution modes: **single**, **chain**, and **multi-agent (DAG)**.

---

## 1. Single Agent Execution

**Scenario**: The marketing team needs a long-form blog post about productivity tools for remote teams, without upstream dependencies. The Content Creator generates the complete asset from a brief.

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Orchestrator                                                             │
│                                                                           │
│  AgentInput<ContentCreatorInput>                                          │
│  ┌───────────────────────────────────────────────────────────────┐       │
│  │ contentBrief: "Write a blog post about top 10 productivity    │       │
│  │               tools for remote teams in 2026"                 │       │
│  │ targetAudience: { demographics, psychographics, behavior }    │       │
│  │ platform: { name: "blog", maxChars: 8000, ... }              │       │
│  │ brandGuidelines: { tone: "professional", forbiddenPhrases,   │       │
│  │                    requiredPhrases, readingLevel, pronouns }  │       │
│  │ keywords: { primary: ["productivity tools remote teams"],    │       │
│  │             density: 1.2 }                                    │       │
│  │ tone: "inspiring and practical"                               │       │
│  │ campaignGoals: { primary: "consideration", KPIs: [...] }     │       │
│  │ contentType: "long-form-blog"                                 │       │
│  │ wordCount: { min: 1500, max: 2500, ideal: 2000 }             │       │
│  │ callToAction: { primary: "Download the Free Guide", ... }    │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                           │                                                │
│                           ▼                                                │
│  ┌───────────────────────────────────────────────────────────────┐       │
│  │           Agent Registry — @content-creator                    │       │
│  │                                                                 │       │
│  │  1. resolvePrompt({ content_brief, target_audience, platform,  │       │
│  │     brand_voice, keywords, tone, campaign_goals,               │       │
│  │     call_to_action, platform_writing_guide })                  │       │
│  │                                                                 │       │
│  │  2. Execute LLM call with system prompt                        │       │
│  │     (lib/agents/prompts/content-creator.v1.prompt.yaml)        │       │
│  │                                                                 │       │
│  │  3. Parse structured JSON output into ContentCreatorOutput     │       │
│  │                                                                 │       │
│  │  4. Run validators:                                             │       │
│  │     ├─ brandVoiceConsistencyRule        (error)                 │       │
│  │     ├─ platformCharacterLimitRule       (error)                 │       │
│  │     ├─ keywordDensityBoundsRule         (warning)               │       │
│  │     ├─ headlineSufficiencyRule          (warning)               │       │
│  │     ├─ metaDescriptionValidityRule      (warning)               │       │
│  │     └─ contentRelevanceCheckRule        (warning)               │       │
│  │                                                                 │       │
│  │  5. Write context keys:                                          │       │
│  │     ├─ contentDraft                                            │       │
│  │     ├─ headlineOptions                                         │       │
│  │     ├─ contentScore                                            │       │
│  │     ├─ platformFormat                                          │       │
│  │     ├─ brandAlignment                                          │       │
│  │     └─ seoAnalysis                                             │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                           │                                                │
│                           ▼                                                │
│  AgentOutput<ContentCreatorOutput>                                        │
│  ┌───────────────────────────────────────────────────────────────┐       │
│  │ contentDraft: "The modern remote team juggles an average of   │       │
│  │   11 SaaS tools daily. Here's how to cut that in half..."     │       │
│  │ headlineOptions: [                                             │       │
│  │   { headline: "10 Productivity Tools...",     pCTR: 0.042 }   │       │
│  │   { headline: "Cut Your Tool Stack in Half",  pCTR: 0.071 }   │       │
│  │   { headline: "The Remote Team Stack Guide",  pCTR: 0.038 }   │       │
│  │   ...                                                        │       │
│  │ ]                                                             │       │
│  │ metaDescription: "Discover the top 10 productivity tools for  │       │
│  │   remote teams in 2026. From async communication to..."       │       │
│  │ ctaCopy: "Download the Free Comparison Guide"                 │       │
│  │ platformFormat: { platform: "blog", characterCount: 7482,    │       │
│  │   hashtags: [], mediaSuggestions: [{ type: "infographic" }],  │       │
│  │   formattingApplied: ["H2 sections", "bullet points",         │       │
│  │     "comparison table"] }                                     │       │
│  │ contentScore: { overall: 86, dimensions: { relevance: 92,    │       │
│  │   engagement: 78, readability: 88, brandAlignment: 95,        │       │
│  │   seoOptimization: 84, originality: 79 } }                    │       │
│  │ brandAlignment: { score: 95, violations: [], warnings: [],    │       │
│  │   recommendations: ["Consider adding more brand-specific      │       │
│  │     examples in section 4"] }                                 │       │
│  │ seoAnalysis: { keywordDensity: 1.3, readabilityScore: 72,    │       │
│  │   keywordPlacements: [{ term: "productivity tools remote      │       │
│  │     teams", count: 4, prominence: "early" }],                 │       │
│  │   suggestedImprovements: ["Add FAQ schema for rich results"] }│       │
│  └───────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Orchestrator Invocation (JSON)

```jsonc
// POST /api/nexus/agents/execute
{
  "agentId": "content-creator",
  "input": {
    "schema": "content-creator-input.v1",
    "schemaVersion": "1.0.0",
    "payload": {
      "contentBrief": "Write a blog post about the top 10 productivity tools for remote teams in 2026.",
      "targetAudience": {
        "demographics": { "ageRange": [25, 45] },
        "psychographics": {
          "interests": ["remote work", "productivity", "SaaS tools"],
          "painPoints": ["too many tools", "team collaboration", "time management"],
          "goals": ["improve team efficiency", "reduce context switching"],
          "contentPreferences": ["how-to guides", "comparison posts", "listicles"]
        },
        "platformBehavior": {
          "activeTimes": ["09:00", "12:00", "15:00"],
          "engagementType": "sharing",
          "devicePreference": "both"
        }
      },
      "platform": {
        "name": "blog",
        "maxChars": 8000,
        "maxHashtags": 0,
        "allowMarkdown": true,
        "allowHtml": false,
        "imageRequired": true,
        "linkFormat": "inline"
      },
      "brandGuidelines": {
        "tone": "professional",
        "values": ["innovation", "efficiency", "trust"],
        "forbiddenPhrases": ["game-changer", "revolutionary", "supercharge"],
        "requiredPhrases": [],
        "readingLevel": "intermediate",
        "pronouns": "second-person",
        "sentenceStructure": "mixed"
      },
      "keywords": {
        "primary": ["productivity tools remote teams"],
        "secondary": ["remote work software", "team collaboration tools"],
        "longTail": ["best productivity tools for distributed teams 2026"],
        "intent": "commercial",
        "targetDensity": 1.2,
        "competitorGapTerms": ["async communication", "digital workspace"]
      },
      "tone": "inspiring and practical",
      "campaignGoals": {
        "primary": "consideration",
        "secondary": ["awareness"],
        "kpis": ["page views", "time on page", "email signups"],
        "targetAudienceActions": ["download comparison guide", "subscribe to newsletter"]
      },
      "contentType": "long-form-blog",
      "wordCount": { "min": 1500, "max": 2500, "ideal": 2000 },
      "referenceUrls": [
        "https://example.com/blog/remote-work-trends-2026",
        "https://example.com/competitor/productivity-guide"
      ],
      "callToAction": {
        "primary": "Download the Free Comparison Guide",
        "secondary": "Subscribe for weekly productivity tips",
        "url": "https://example.com/guides/productivity-tools"
      }
    },
    "correlationId": "ctx-20260611-a1b2c3d4"
  }
}
```

### Output Summary

```jsonc
{
  "schema": "content-creator-output.v1",
  "schemaVersion": "1.0.0",
  "payload": {
    "contentDraft": "The modern remote team juggles an average of 11 SaaS tools daily. Here's how to cut that in half without sacrificing productivity.\n\n## Why Your Tool Stack Is Costing You More Than You Think\n\n... [2000 word blog post with H2 sections, comparison table, statistics] ...\n\n## Make the Smart Choice Today\n\nYour toolkit should work for you, not the other way around. Download our free comparison guide to find the perfect productivity stack for your remote team.\n\n[Download the Free Comparison Guide](#)",
    "headlineOptions": [
      { "headline": "10 Productivity Tools That Remote Teams Actually Use in 2026", "length": 62, "includesKeyword": true, "emotionalAppeal": "social proof", "predictedCTR": 0.042 },
      { "headline": "Cut Your Tool Stack in Half: The Remote Team Productivity Playbook", "length": 68, "includesKeyword": false, "emotionalAppeal": "utility", "predictedCTR": 0.071 },
      { "headline": "The Remote Team Stack Guide: 10 Tools We Actually Recommend", "length": 59, "includesKeyword": true, "emotionalAppeal": "authority", "predictedCTR": 0.038 },
      { "headline": "Stop Hoarding SaaS: 10 Productivity Tools That Earn Their Keep", "length": 61, "includesKeyword": true, "emotionalAppeal": "challenge", "predictedCTR": 0.055 },
      { "headline": "From Chaos to Clarity: Building the Perfect Remote Tech Stack", "length": 60, "includesKeyword": false, "emotionalAppeal": "transformation", "predictedCTR": 0.049 },
      { "headline": "11 Tools → 5: How Top Remote Teams Streamlined Their Stack", "length": 58, "includesKeyword": false, "emotionalAppeal": "curiosity", "predictedCTR": 0.063 }
    ],
    "metaDescription": "Discover the top 10 productivity tools for remote teams in 2026. From async communication to project management — find the perfect stack for your distributed team.",
    "ctaCopy": "Download the Free Comparison Guide",
    "platformFormat": {
      "platform": "blog",
      "body": "The modern remote team juggles an average of 11 SaaS tools daily...",
      "characterCount": 7482,
      "hashtags": [],
      "mentions": [],
      "mediaSuggestions": [
        { "type": "infographic", "description": "Side-by-side comparison chart of top 10 tools with pricing and key features", "altText": "Comparison chart of top 10 productivity tools for remote teams ranked by features and pricing" },
        { "type": "image", "description": "Featured hero image showing a distributed team collaborating across time zones", "altText": "Illustration of a distributed remote team collaborating across different time zones" }
      ],
      "linkPlacement": { "url": "https://example.com/guides/productivity-tools", "anchor": "Download the Free Comparison Guide", "position": "end" },
      "formattingApplied": ["H2 sections", "bullet points", "numbered list", "comparison table", "blockquote", "bold emphasis"]
    },
    "contentScore": {
      "overall": 86,
      "dimensions": { "relevance": 92, "engagement": 78, "readability": 88, "brandAlignment": 95, "seoOptimization": 84, "originality": 79 },
      "predictedKPIs": { "estimatedReads": 4500, "estimatedShares": 320, "estimatedClickThrough": 840, "estimatedConversion": 95 }
    },
    "brandAlignment": {
      "score": 95,
      "violations": [],
      "warnings": ["Phrase 'game-changer' was avoided per brand guidelines — replaced with 'transformative'"],
      "recommendations": [
        "Consider adding more brand-specific case studies in Section 4",
        "The required phrase 'innovation' appears only once — consider a second mention in the conclusion"
      ]
    },
    "seoAnalysis": {
      "keywordDensity": 1.3,
      "keywordPlacements": [
        { "term": "productivity tools remote teams", "count": 4, "prominence": "early" },
        { "term": "remote work software", "count": 3, "prominence": "mid" },
        { "term": "team collaboration tools", "count": 2, "prominence": "mid" },
        { "term": "best productivity tools for distributed teams 2026", "count": 1, "prominence": "late" }
      ],
      "readabilityScore": 72,
      "suggestedImprovements": [
        "Add FAQ schema for the comparison section to target rich results",
        "Consider adding an anchor link table of contents for better scannability",
        "Break up the 3-paragraph intro into shorter scannable sentences"
      ]
    },
    "variants": [
      "Variant A: Listicle format (10 items with detailed reviews)",
      "Variant B: Comparison format (side-by-side feature matrix with winner callouts)"
    ]
  },
  "performance": {
    "startedAt": "2026-06-11T10:00:00.000Z",
    "completedAt": "2026-06-11T10:00:14.567Z",
    "tokensUsed": 7234,
    "steps": 7
  }
}
```

---

## 2. Chain Execution

**Scenario**: @seo-specialist identifies target keywords and competitor gaps → @content-creator produces SEO-optimized content that ranks.

### Flow Diagram

```
┌──────────────────────┐     ┌──────────────────────────┐
│ @seo-specialist      │     │ @content-creator         │
│                       │     │                          │
│  Writes to context:   │────►│  Reads from context:     │
│  ├─ seoAudit          │     │  ├─ keywordMap (new)     │
│  ├─ keywordMap        │     │  ├─ contentOptimizations │
│  ├─ contentOptimiz.   │     │  └─ seoAudit.summary     │
│  ├─ technicalFixes    │     │                          │
│  └─ linkOpportunities │     │  Also receives direct    │
│                       │     │  input: contentBrief,    │
│                       │     │  brandGuidelines, etc.   │
│                       │     │                          │
│                       │     │  Writes to context:      │
│                       │     │  ├─ contentDraft         │
│                       │     │  ├─ headlineOptions      │
│                       │     │  ├─ contentScore         │
│                       │     │  ├─ platformFormat       │
│                       │     │  ├─ brandAlignment       │
│                       │     │  └─ seoAnalysis          │
└──────────────────────┘     └──────────────────────────┘
```

### Orchestrator Plan (JSON)

```jsonc
{
  "planId": "chain-20260611-b2c3d4e5",
  "executionMode": "chain",
  "chain": ["seo-specialist", "content-creator"],
  "contextSeeds": {
    "brandGuidelines": {
      "tone": "professional",
      "values": ["innovation", "efficiency", "trust"],
      "forbiddenPhrases": ["game-changer", "revolutionary"],
      "readingLevel": "intermediate",
      "pronouns": "second-person",
      "sentenceStructure": "mixed"
    }
  },
  "steps": [
    {
      "agentId": "seo-specialist",
      "input:payload": {
        "pageContent": "Existing blog content about remote work productivity...",
        "targetKeywords": [
          { "keyword": "productivity tools remote teams", "searchVolume": 4200, "keywordDifficulty": 48, "intent": "commercial" },
          { "keyword": "remote work software", "searchVolume": 3800, "keywordDifficulty": 52, "intent": "commercial" },
          { "keyword": "team collaboration tools", "searchVolume": 2800, "keywordDifficulty": 41, "intent": "informational" }
        ],
        "mode": "optimize"
      }
    },
    {
      "agentId": "content-creator",
      "input:payload": {
        // keywordMap, contentOptimizations, seoAudit populated from context
        "contentBrief": "Write a blog post about the top 10 productivity tools for remote teams in 2026. Incorporate the SEO keyword strategy from the audit.",
        "targetAudience": { /* ... audience profile ... */ },
        "platform": { "name": "blog", "maxChars": 8000, "maxHashtags": 0, "allowMarkdown": true, "allowHtml": false, "imageRequired": true, "linkFormat": "inline" },
        // brandGuidelines from context seed
        // keywords from seo-specialist keywordMap
        "tone": "inspiring and practical",
        "campaignGoals": { "primary": "consideration", "secondary": ["awareness"], "kpis": ["organic traffic", "time on page", "conversion"], "targetAudienceActions": ["download guide"] },
        "contentType": "long-form-blog",
        "wordCount": { "min": 1500, "max": 2500, "ideal": 2000 },
        "callToAction": { "primary": "Download the Free Comparison Guide", "url": "https://example.com/guides/productivity-tools" }
      }
    }
  ]
}
```

### Context State Flow

| Step | Agent | Context Writes |
|------|-------|---------------|
| 0 | _(seed)_ | `brandGuidelines` |
| 1 | @seo-specialist | `seoAudit`, `keywordMap`, `contentOptimizations`, `technicalFixes`, `linkOpportunities` |
| 2 | @content-creator | `contentDraft`, `headlineOptions`, `contentScore`, `platformFormat`, `brandAlignment`, `seoAnalysis` |

### Key Integration Points

1. **@seo-specialist** produces a `keywordMap` with target keywords, search intent classification, and competitor gap terms. It also writes `contentOptimizations` with specific on-page recommendations (title tag format, meta description structure, heading hierarchy).

2. **@content-creator** reads those outputs and incorporates them:
   - Uses `keywordMap.primary` as the primary SEO keyword — ensures it appears in first 100 words, at least one H2, the meta description, and final paragraph
   - Uses `contentOptimizations` suggestions to shape the content structure (e.g., if the SEO specialist recommends FAQ sections, the creator adds them)
   - Integrates `keywordMap.competitorGapTerms` as differentiation points in the content
   - Writes its own `seoAnalysis` for cross-validation

3. **Validation handshake**: The @content-creator's `seoAnalysis.keywordDensity` is compared against the @seo-specialist's `keywordMap` targets. If density is off-target, downstream human reviewer gets an alert.

---

## 3. Multi-Agent Execution (DAG)

**Scenario**: Full content campaign pipeline — @trend-researcher identifies market opportunities → @seo-specialist optimizes keyword strategy → @content-creator produces the asset → @social-media-strategist plans distribution.

### Flow Diagram

```
                            ┌─────────────────────┐
                            │ @trend-researcher   │
                            │  Writes:            │
                            │  ├─ marketTrends    │
                            │  ├─ contentGaps     │
                            │  └─ audienceInsights│
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ @seo-specialist     │
                            │  Reads:             │
                            │  ├─ marketTrends    │
                            │  ├─ contentGaps     │
                            │  └─ audienceInsights│
                            │                     │
                            │  Writes:            │
                            │  ├─ keywordMap      │
                            │  ├─ contentOptimiz. │
                            │  └─ seoAudit        │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ @content-creator    │
                            │  Reads:             │
                            │  ├─ keywordMap      │
                            │  ├─ contentOptimiz. │
                            │  ├─ marketTrends    │
                            │  └─ audienceInsights│
                            │                     │
                            │  Writes:            │
                            │  ├─ contentDraft    │
                            │  ├─ headlineOptions │
                            │  ├─ platformFormat  │
                            │  └─ contentScore    │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ @social-media       │
                            │  -strategist        │
                            │  Reads:             │
                            │  ├─ contentDraft    │
                            │  ├─ headlineOptions │
                            │  └─ platformFormat  │
                            │                     │
                            │  Writes:            │
                            │  ├─ postVariants    │
                            │  ├─ contentCalendar │
                            │  ├─ hashtagStrategy │
                            │  └─ amplification   │
                            └─────────────────────┘
```

### Orchestrator Plan (JSON)

```jsonc
{
  "planId": "dag-20260611-c3d4e5f6",
  "executionMode": "dag",
  "steps": [
    // ---- Phase 1: Research ----
    {
      "id": "step-1",
      "agentId": "trend-researcher",
      "dependsOn": [],
      "input:payload": {
        "researchQuery": "Remote work productivity trends 2026",
        "markets": ["North America", "Europe"],
        "timeHorizon": "6 months",
        "outputRequirements": ["market trends", "content gaps", "audience insights"]
      }
    },

    // ---- Phase 2: SEO Strategy (depends on research) ----
    {
      "id": "step-2",
      "agentId": "seo-specialist",
      "dependsOn": ["step-1"],
      "input:payload": {
        "mode": "brief-review",
        "pageContent": "(empty — new content creation)",
        "targetKeywords": [
          { "keyword": "productivity tools remote teams", "searchVolume": 4200, "keywordDifficulty": 48, "intent": "commercial" },
          { "keyword": "async communication tools", "searchVolume": 3400, "keywordDifficulty": 38, "intent": "informational" },
          { "keyword": "distributed team management", "searchVolume": 2900, "keywordDifficulty": 44, "intent": "commercial" }
        ],
        "contentBrief": "Write a comprehensive guide to the productivity tool landscape for remote teams, informed by latest market trends."
      }
    },

    // ---- Phase 3: Content Creation (depends on SEO + research) ----
    {
      "id": "step-3",
      "agentId": "content-creator",
      "dependsOn": ["step-1", "step-2"],
      "input:payload": {
        // context: marketTrends, contentGaps, audienceInsights from step-1
        // context: keywordMap, contentOptimizations, seoAudit from step-2
        "contentBrief": "Produce a comprehensive blog post about productivity tools for remote teams based on trend research and SEO keyword strategy.",
        "targetAudience": {
          "demographics": { "ageRange": [25, 45] },
          "psychographics": {
            "interests": ["remote work", "productivity", "SaaS"],
            "painPoints": ["tool fatigue", "async collaboration", "time management"],
            "goals": ["optimize tool stack", "improve team velocity"],
            "contentPreferences": ["comparison guides", "research reports", "listicles"]
          },
          "platformBehavior": {
            "activeTimes": ["09:00", "14:00"],
            "engagementType": "sharing",
            "devicePreference": "both"
          }
        },
        "platform": { "name": "blog", "maxChars": 10000, "maxHashtags": 0, "allowMarkdown": true, "allowHtml": false, "imageRequired": true, "linkFormat": "inline" },
        // brandGuidelines from context seed
        // keywords populated from seo-specialist keywordMap
        "tone": "authoritative and data-driven",
        "campaignGoals": {
          "primary": "consideration",
          "secondary": ["awareness", "conversion"],
          "kpis": ["organic traffic", "engagement rate", "lead generation"],
          "targetAudienceActions": ["download research report", "book consultation"]
        },
        "contentType": "long-form-blog",
        "wordCount": { "min": 2500, "max": 4000, "ideal": 3000 },
        "callToAction": {
          "primary": "Download the 2026 Remote Work Productivity Report",
          "url": "https://example.com/reports/remote-productivity-2026"
        }
      }
    },

    // ---- Phase 4: Distribution (depends on content) ----
    {
      "id": "step-4",
      "agentId": "social-media-strategist",
      "dependsOn": ["step-3"],
      "input:payload": {
        // context: contentDraft, headlineOptions from step-3
        "platformTargets": ["linkedin", "twitter"],
        "contentAssets": [
          {
            "id": "asset-001",
            "type": "blog_post",
            "title": "The State of Remote Work Productivity in 2026",
            // body and keyTakeaways populated from contentDraft
          }
        ],
        "campaignObjectives": ["thought_leadership", "lead_generation"],
        "audienceSegments": [
          {
            "id": "seg-1",
            "name": "CTOs & Engineering Leaders",
            "description": "Decision-makers at mid-to-large tech companies",
            "platformPriorities": { "linkedin": 1, "twitter": 2 }
          },
          {
            "id": "seg-2",
            "name": "Remote Team Managers",
            "description": "People leaders at distributed companies",
            "platformPriorities": { "linkedin": 1, "twitter": 1 }
          }
        ],
        "postingSchedule": {
          "startDate": "2026-06-18",
          "endDate": "2026-07-18",
          "frequencyPerWeek": { "linkedin": 3, "twitter": 10 },
          "timezone": "America/New_York"
        },
        "engagementHistory": []
      }
    }
  ]
}
```

### Context State Flow

| Step | Agent | Reads | Writes |
|------|-------|-------|--------|
| 1 | @trend-researcher | _(none)_ | `marketTrends`, `contentGaps`, `audienceInsights` |
| 2 | @seo-specialist | `marketTrends`, `contentGaps`, `audienceInsights` | `keywordMap`, `contentOptimizations`, `seoAudit` |
| 3 | @content-creator | `keywordMap`, `contentOptimizations`, `seoAudit`, `marketTrends`, `audienceInsights`, `brandGuidelines` | `contentDraft`, `headlineOptions`, `contentScore`, `platformFormat`, `brandAlignment`, `seoAnalysis` |
| 4 | @social-media-strategist | `contentDraft`, `headlineOptions`, `platformFormat` | `postVariants`, `contentCalendar`, `hashtagStrategy`, `amplificationPlan`, `engagementPlan` |

### Cross-Agent Contract Verification

After execution, the orchestrator runs these cross-agent validations:

```typescript
// lib/agents/validation/cross-agent-validators.ts

export const seoConsistencyRule: ValidationRule<ContentCreatorOutput> = {
  id: "cross-agent.seo-keyword-consistency",
  name: "SEO Keyword Consistency (SEO → Content)",
  description: "Ensures the content creator's keyword density matches the SEO specialist's target range.",
  severity: "warning",
  validate(output: ContentCreatorOutput, context?: AgentContext): ValidationResult {
    const keywordMap = context?.get("keywordMap") as Record<string, unknown> | undefined;
    const errors: Array<{ path: string; message: string; severity: "error" | "warning"; code?: string }> = [];
    const warnings: string[] = [];

    if (!keywordMap) {
      warnings.push("No keywordMap found in context — SEO consistency check skipped.");
      return { valid: true, errors, warnings };
    }

    const actualDensity = output.seoAnalysis.keywordDensity;
    // Target density range from SEO specialist (default: 0.5%–2.5%)
    const targetMin = 0.5;
    const targetMax = 2.5;

    if (actualDensity < targetMin) {
      warnings.push(
        `Content keyword density (${actualDensity}%) is below SEO target (${targetMin}%–${targetMax}%). ` +
        `Consider adding more primary keyword instances.`
      );
    } else if (actualDensity > targetMax) {
      warnings.push(
        `Content keyword density (${actualDensity}%) exceeds SEO target (${targetMin}%–${targetMax}%). ` +
        `Risk of keyword stuffing. Consider reducing primary keyword frequency.`
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

export const brandVoiceCrossCheckRule: ValidationRule<ContentCreatorOutput> = {
  id: "cross-agent.brand-voice-consistency",
  name: "Brand Voice Cross-Check",
  description: "Validates that content passes brand voice constraints defined earlier in the pipeline.",
  severity: "error",
  validate(output: ContentCreatorOutput, context?: AgentContext): ValidationResult {
    const brandGuidelines = context?.get("brandGuidelines") as Record<string, unknown> | undefined;
    const errors: Array<{ path: string; message: string; severity: "error" | "warning"; code?: string }> = [];
    const warnings: string[] = [];

    if (!brandGuidelines) {
      warnings.push("No brand guidelines found in context — brand voice check skipped.");
      return { valid: true, errors, warnings };
    }

    const alignment = output.brandAlignment;
    if (alignment.violations.length > 0) {
      for (const violation of alignment.violations) {
        errors.push({
          path: "brandAlignment.violations",
          message: `Brand voice violation detected: ${violation}`,
          severity: "error",
          code: "CROSS_AGENT_BRAND_VIOLATION",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

export const headlinePlatformFitRule: ValidationRule<ContentCreatorOutput> = {
  id: "cross-agent.headline-platform-fit",
  name: "Headline Platform Fit",
  description: "Validates that headline options respect platform character limits before handoff to social strategist.",
  severity: "warning",
  validate(output: ContentCreatorOutput): ValidationResult {
    const errors: Array<{ path: string; message: string; severity: "error" | "warning"; code?: string }> = [];
    const warnings: string[] = [];
    const format = output.platformFormat;

    for (const headline of output.headlineOptions) {
      if (headline.length > format.characterCount * 0.1) { // Headline > 10% of total content
        warnings.push(
          `Headline "${headline.headline.slice(0, 40)}..." is ${headline.length} chars — ` +
          `long relative to platform max (${format.characterCount} chars). ` +
          `May need truncation for social distribution.`
        );
      }
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};
```

---

## Summary

| Mode | Agents | Use Case |
|------|--------|----------|
| **Single** | @content-creator alone | Generate a blog post, social copy, or email from a brief |
| **Chain** | @seo-specialist → @content-creator | SEO keyword strategy feeds directly into content creation |
| **Multi-agent (DAG)** | @trend-researcher → @seo-specialist → @content-creator → @social-media-strategist | Full campaign lifecycle: research → SEO → create → distribute |

### Adapter Registration

```typescript
// lib/agents/registry/index.ts
import { contentCreatorAdapter } from "./content-creator";
import { seoSpecialistAdapter } from "../seo-specialist/seo-specialist.adapter";
import { socialMediaStrategistAdapter } from "../adapters/social-media-strategist.adapter";
// ... other adapters

const registry = getRegistry();
registry.register(contentCreatorAdapter);
registry.register(seoSpecialistAdapter);
registry.register(socialMediaStrategistAdapter);
// ...
```

### Pipeline Execution

```typescript
// Example: Single execution
const singleResult = await registry.execute({
  agent: "content-creator",
  input: { /* ContentCreatorInput */ },
});

// Example: Chain execution (SEO → Content)
const chainResults = await registry.chain([
  { agent: "seo-specialist", input: { /* SeoSpecialistInput */ } },
  { agent: "content-creator", input: { /* ContentCreatorInput */ } },
]);

// Example: DAG execution (full campaign)
const dagResults = await registry.dag([
  // Phase 1: Research
  [{ agent: "trend-researcher", input: { /* ... */ } }],
  // Phase 2: SEO
  [{ agent: "seo-specialist", input: { /* ... */ } }],
  // Phase 3: Content
  [{ agent: "content-creator", input: { /* ... */ } }],
  // Phase 4: Distribution
  [{ agent: "social-media-strategist", input: { /* ... */ } }],
]);
```
