# @deal-strategist — Execution Flow Examples

This document demonstrates three orchestration patterns for invoking the
**@deal-strategist** agent adapter within the Nexus Agent Runtime:

1. **Single Agent** — Direct invocation for deal scoring
2. **Chain** — @pipeline-analyst flags risk → @deal-strategist deep strategy
3. **Multi-Agent** — @proposal-strategist → @deal-strategist → @sales-outreach

---

## Flow 1: Single Agent — Score a New Opportunity

**Pattern**: Direct invocation. A sales rep or manager submits a new opportunity
for MEDDPICC qualification and deal strategy.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Input      │────▶│ @deal-strategist │────▶│   Output     │
│ (Opportunity)│     │   (qualify +     │     │ (Score + Win  │
│              │     │    score + plan)  │     │  Plan + Risk) │
└──────────────┘     └──────────────────┘     └──────────────┘
```

### Invocation

```typescript
import { DealStrategistAdapter } from "@/lib/agents/deal-strategist.adapter";

const adapter: DealStrategistAdapter = new DealStrategistLLMAdapter(/* config */);

const output = await adapter.execute({
  opportunity: {
    name: "Acme Corp — Enterprise Platform Expansion",
    displayValue: 450_000,
    currency: "USD",
    stage: "evaluation",
    closeDate: "2026-09-30",
    owner: "Sarah Chen",
    accountName: "Acme Corp",
    industry: "Manufacturing",
    region: "EMEA",
  },
  meddpicc: {
    metrics: {
      description: "Reduce production line downtime from 12% to 4% annually",
      currentValue: 12,
      targetValue: 4,
      unit: "percent",
      timeframe: "12 months",
      validatedByStakeholder: true,
    },
    economicBuyer: {
      name: "Klaus Mueller",
      title: "VP Global Operations",
      department: "Operations",
      accessLevel: "indirect",
      verified: true,
    },
    decisionCriteria: {
      criteria: [
        { name: "Implementation speed", weight: 0.30, ourPosition: "winning", confirmed: true },
        { name: "Total cost of ownership", weight: 0.25, ourPosition: "battling", confirmed: true },
        { name: "Integration depth", weight: 0.25, ourPosition: "winning", confirmed: true },
        { name: "Vendor reputation", weight: 0.20, ourPosition: "losing", confirmed: true },
      ],
    },
    decisionProcess: {
      steps: [
        "Technical evaluation (weeks 1-3)",
        "PoC with live data (weeks 4-6)",
        "Stakeholder review with ops committee (week 7)",
        "Final negotiation and signature (weeks 8-9)",
      ],
      approvalsRequired: ["VP Ops", "CFO", "IT Security"],
      procurementInvolved: true,
      validatedWithBuyer: true,
    },
    paperProcess: {
      legalReviewRequired: true,
      securityReviewRequired: true,
      dpaRequired: true,
      estimatedTimeline: "3-4 weeks",
      initiated: false,
    },
    identifiedPain: {
      description: "Unplanned downtime costs $2.4M annually in lost production and overtime",
      quantifiedAnnualCost: 2_400_000,
      validatedBy: ["VP Ops", "Plant Manager"],
      costOfInaction: "Continued revenue leakage and competitive disadvantage in production efficiency",
      linkedToInitiative: true,
    },
    champion: {
      name: "Dr. Helena Weber",
      title: "Director of Manufacturing Excellence",
      power: "high",
      access: "high",
      motivation: "high",
      tested: true,
      willBrokerEBMeeting: true,
      lastCoachingDate: "2026-06-05",
    },
    competition: {
      competitors: [
        {
          name: "FactoryOS Inc.",
          type: "direct",
          zones: { winning: ["implementation speed"], battling: ["TCO", "features"], losing: ["industry brand"] },
          isIncumbent: false,
          strength: 65,
        },
        {
          name: "Legacy On-Prem Solution (Incumbent)",
          type: "incumbent",
          zones: { winning: ["existing relationship"], battling: ["features"], losing: ["innovation", "speed"] },
          isIncumbent: true,
          strength: 75,
        },
        {
          name: "Internal Build Team",
          type: "internal-build",
          zones: { winning: ["customization"], battling: ["speed"], losing: ["TCO", "support"] },
          isIncumbent: false,
          strength: 30,
        },
      ],
      confirmedWithBuyer: true,
    },
    implementation: {
      expectedTimeline: "10-12 weeks phased rollout",
      complexity: "medium",
      discussed: true,
    },
    contract: {
      termMonths: 36,
      pricingModel: "subscription + implementation fee",
      initiated: true,
    },
  },
  stakeholders: [
    {
      name: "Klaus Mueller",
      title: "VP Global Operations",
      department: "Operations",
      influence: "decision-maker",
      sentiment: "supporter",
      engaged: true,
      lastEngagementDate: "2026-06-08",
    },
    {
      name: "Dr. Helena Weber",
      title: "Director of Manufacturing Excellence",
      department: "Operations",
      influence: "influencer",
      sentiment: "champion",
      engaged: true,
      lastEngagementDate: "2026-06-10",
    },
    {
      name: "Thomas Richter",
      title: "CFO",
      department: "Finance",
      influence: "decision-maker",
      sentiment: "neutral",
      engaged: false,
    },
    {
      name: "Anna Schmidt",
      title: "Head of IT Security",
      department: "IT",
      influence: "influencer",
      sentiment: "skeptic",
      engaged: false,
    },
  ],
  competitiveLandscape: {
    competitors: [
      {
        name: "FactoryOS Inc.",
        type: "direct",
        strengths: ["UI polish", "Startup agility", "Cloud-native"],
        weaknesses: ["European support limited", "No on-prem option"],
        positioning: "battling",
      },
      {
        name: "Legacy On-Prem Solution (Incumbent)",
        type: "incumbent",
        strengths: ["Deep integrations", "Known vendor", "Existing SLA"],
        weaknesses: ["Legacy architecture", "Slow release cycle"],
        positioning: "winning",
      },
    ],
  },
});
```

### Output (abridged)

```json
{
  "dealScore": 72,
  "meddpiccTotalScore": 29,
  "meddpiccCompletion": {
    "metrics": { "score": 4, "evidence": "12%→4% downtime reduction, $2.4M cost, validated by VP Ops and Plant Manager", "gap": "Need CFO sign-off on cost model" },
    "economicBuyer": { "score": 3, "evidence": "VP Ops identified as EB, champion will broker meeting", "gap": "No direct conversation with EB yet" },
    "decisionCriteria": { "score": 4, "evidence": "Weighted matrix shared by buyer, 2 of 4 criteria favor us", "gap": "Two criteria (TCO, reputation) favor competitors" },
    "decisionProcess": { "score": 4, "evidence": "4-step process mapped with timeline and approvals", "gap": "Security review timeline not confirmed" },
    "paperProcess": { "score": 1, "evidence": "Identified but not initiated", "gap": "HIGH RISK — 3-4 week procurement cycle not started" },
    "identifiedPain": { "score": 5, "evidence": "Quantified at $2.4M/yr, validated by two VPs, linked to operational initiative", "gap": "None" },
    "champion": { "score": 4, "evidence": "Director level, high power/access/motivation, tested, will broker EB", "gap": "Needs to introduce us to IT Security stakeholder" },
    "competition": { "score": 3, "evidence": "Three competitors mapped with zones, confirmed by buyer", "gap": "Need battlecard for FactoryOS Inc." }
  },
  "riskAssessment": {
    "level": "medium",
    "redFlags": [
      { "category": "Paper Process", "description": "Procurement and legal review not initiated. 3-4 week cycle could push close past deadline.", "severity": "high", "mitigation": "Initiate paper process immediately in parallel with evaluation" },
      { "category": "Access", "description": "Economic buyer (VP Ops) has only indirect engagement. No direct conversation.", "severity": "medium", "mitigation": "Champion to broker EB meeting within 7 days" }
    ],
    "earlyWarnings": [
      "IT Security stakeholder (Anna Schmidt) not yet engaged — potential blocker",
      "CFO (Thomas Richter) neutral sentiment and not yet engaged — budget risk"
    ],
    "assumptions": [
      "EB is VP Ops — not yet confirmed by direct conversation",
      "Competitive field confirmed — assumes buyer is sharing complete information",
      "Budget exists — not yet confirmed by CFO"
    ]
  },
  "winPlan": {
    "verdict": "BATTLING",
    "summary": "Strong pain alignment and champion depth, but paper process not started and EB access is indirect. Two competitive threats require active repositioning. Winnable with focused execution in the next 14 days.",
    "actions": [
      { "action": "Champion brokers direct EB meeting with VP Ops", "owner": "Sarah Chen (rep)", "deadline": "2026-06-18", "priority": "P0", "successCriteria": "Direct meeting scheduled with Klaus Mueller" },
      { "action": "Initiate paper process: send security questionnaire to IT Security", "owner": "Sarah Chen (rep)", "deadline": "2026-06-14", "priority": "P0", "successCriteria": "Security review initiated and timeline confirmed" },
      { "action": "Prepare competitive battlecard for FactoryOS Inc.", "owner": "Sales Engineering", "deadline": "2026-06-16", "priority": "P1", "successCriteria": "Battlecard deployed before next technical session" },
      { "action": "Engage CFO (Thomas Richter) with ROI model", "owner": "Sarah Chen (rep) + champion", "deadline": "2026-06-21", "priority": "P1", "successCriteria": "CFO review scheduled with business case" }
    ],
    "exitCriteria": [
      "EB meeting held with VP Ops confirming budget and timeline",
      "Paper process timeline fits within close date",
      "FactoryOS Inc. neutralized via competitive positioning",
      "CFO engaged with validated ROI case",
      "IT Security stakeholder moved from skeptic to neutral"
    ]
  },
  "competitivePositioning": [
    {
      "competitor": "FactoryOS Inc.",
      "positioning": "battling",
      "talkTracks": {
        "UI/UX": "Their UI is polished for simple flows. At your scale — 12 plants across 4 countries — you need a system that handles multi-entity complexity without workarounds.",
        "Cloud-native": "Cloud-native is valuable for speed. But your IT Security team requires on-prem fallback for production-critical systems — a requirement their architecture doesn't support."
      },
      "landmineQuestions": [
        "How are you handling data consolidation across your 12 plant entities today? What happens when you add a new plant?",
        "What are your IT Security requirements for production-critical system deployment?"
      ]
    },
    {
      "competitor": "Legacy On-Prem (Incumbent)",
      "positioning": "winning",
      "talkTracks": {
        "Existing relationship": "You've been with them for 5 years, and downtime is still at 12%. Their release cycle is 2x/year. Your plants need continuous improvement, not annual upgrades.",
        "Integration depth": "Their integrations are deep — but they were built for a world without Industry 4.0 standards. Modernizing on their platform means waiting for their roadmap."
      },
      "landmineQuestions": [
        "What has the incumbent done in the last 12 months to reduce your downtime?",
        "If you stay with them, what does the timeline look like for the features you actually need?"
      ]
    }
  ],
  "stakeholderAlignment": [
    { "name": "Klaus Mueller", "influence": "decision-maker", "sentiment": "supporter", "engagementLevel": "low", "recommendedAction": "Schedule direct EB meeting via champion" },
    { "name": "Dr. Helena Weber", "influence": "influencer", "sentiment": "champion", "engagementLevel": "high", "recommendedAction": "Leverage for EB introduction and internal selling" },
    { "name": "Thomas Richter", "influence": "decision-maker", "sentiment": "neutral", "engagementLevel": "none", "recommendedAction": "Engage with ROI model showing $1.8M annual savings" },
    { "name": "Anna Schmidt", "influence": "influencer", "sentiment": "skeptic", "engagementLevel": "none", "recommendedAction": "Early engagement with security architecture overview" }
  ],
  "verdict": "BATTLING",
  "confidence": 0.82
}
```

---

## Flow 2: Chain — Pipeline Risk Flagged → Deep Deal Strategy

**Pattern**: @pipeline-analyst scans the pipeline, identifies a deal with
declining velocity and incomplete MEDDPICC fields, then chains to
@deal-strategist for deep qualification and win planning.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ @pipeline-analyst│────▶│ @deal-strategist │────▶│    Output        │
│ (diagnoses risk) │     │  (deep strategy)  │     │ (full assessment)│
│                  │     │                   │     │                  │
│ Context written: │     │ Context read:     │     │ Context enriched:│
│ • dealScore: 45  │     │ • pipelineRiskFl. │     │ • dealScore: 72  │
│ • pipelineRisk.. │     │ • meddpiccMap     │     │ • meddpiccMap    │
│ • dealsRequirin. │     │                   │     │ • winPlan        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Orchestration Script

```typescript
import { PipelineAnalystAdapter } from "@/lib/agents/pipeline-analyst.adapter";
import { DealStrategistAdapter } from "@/lib/agents/deal-strategist.adapter";
import { OrchestrationContext } from "@/lib/runtime/orchestrator";

const pipelineAnalyst = new PipelineAnalystAdapter(/* config */);
const dealStrategist = new DealStrategistLLMAdapter(/* config */);

const context: Partial<OrchestrationContext> = {
  pipelineSnapshot: await loadPipelineSnapshot(),
  period: "Q3 2026",
};

// Step 1: Pipeline Analyst runs diagnostics
const pipelineReport = await pipelineAnalyst.execute({
  period: "Q3 2026",
  pipelineSnapshot: context.pipelineSnapshot!,
}, context);

// Step 2: Pipeline Analyst writes risk flags to context
context.dealsRequiringIntervention = pipelineReport.dealsRequiringIntervention;
context.pipelineRiskFlags = pipelineReport.dealsRequiringIntervention.map(d => ({
  dealName: d.dealName,
  riskCategory: d.riskSignal,
  severity: d.meddpiccScore < 3 ? "high" : "medium",
  description: `${d.dealName} flagged: ${d.riskSignal}, MEDDPICC ${d.meddpiccScore}/8`,
}));

// Step 3: Find the highest-risk deal and route to Deal Strategist
const highestRiskDeal = context.pipelineRiskFlags
  .sort((a, b) => b.severity.localeCompare(a.severity))[0];

const opportunityData = await loadOpportunityDetail(highestRiskDeal.dealName);

// Step 4: Deal Strategist runs deep strategy, consuming risk flags from context
const dealStrategy = await dealStrategist.execute({
  opportunity: opportunityData.opportunity,
  meddpicc: opportunityData.meddpicc,
  stakeholders: opportunityData.stakeholders,
  competitiveLandscape: opportunityData.competitiveLandscape,
}, {
  // Context from Pipeline Analyst flows through
  pipelineRiskFlags: context.pipelineRiskFlags
    .filter(f => f.dealName === highestRiskDeal.dealName),
});

// Step 5: Enriched context available for downstream agents
context.dealScore = dealStrategy.dealScore;
context.meddpiccMap = dealStrategy.meddpiccCompletion;
context.winPlan = dealStrategy.winPlan;
context.verdict = dealStrategy.verdict;
```

### Context Handoff (pipeline-analyst → deal-strategist)

```
Context Key                    │ Written By            │ Read By
───────────────────────────────┼───────────────────────┼──────────────────
dealScore (initial: 45/100)    │ @pipeline-analyst     │ @deal-strategist
pipelineRiskFlags              │ @pipeline-analyst     │ @deal-strategist
dealsRequiringIntervention     │ @pipeline-analyst     │ — (consumed)
───────────────────────────────┼───────────────────────┼──────────────────
dealScore (updated: 72/100)    │ @deal-strategist      │ downstream agents
meddpiccMap                    │ @deal-strategist      │ downstream agents
winPlan                        │ @deal-strategist      │ downstream agents
competitivePositioning         │ @deal-strategist      │ downstream agents
stakeholderAlignment           │ @deal-strategist      │ downstream agents
riskAssessment                 │ @deal-strategist      │ downstream agents
verdict (BATTLING)             │ @deal-strategist      │ downstream agents
```

---

## Flow 3: Multi-Agent — Proposal → Qualify → Outreach

**Pattern**: @proposal-strategist drafts a proposal, @deal-strategist validates
the underlying deal, and @sales-outreach executes the engagement sequence
with an updated strategy.

```
┌──────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ @proposal-strategist │────▶│ @deal-strategist │────▶│ @sales-outreach  │
│ (drafts proposal)    │     │ (qualifies deal)  │     │ (executes seq.)  │
│                      │     │                   │     │                  │
│ Outputs:             │     │ Enriches context: │     │ Reads context:   │
│ • winThemeMatrix     │     │ • dealScore       │     │ • winPlan.actions│
│ • proposalBlueprint  │     │ • meddpiccMap     │     │ • competitivePos.│
│ • executiveSummary   │     │ • winPlan         │     │ • stakeholderAli.│
│                      │     │ • stakeholderAli. │     │ • riskAssessment │
└──────────────────────┘     └──────────────────┘     └──────────────────┘
```

### Orchestration Script

```typescript
import { ProposalStrategistAdapter } from "@/lib/agents/proposal-strategist.adapter";
import { DealStrategistAdapter } from "@/lib/agents/deal-strategist.adapter";
import { SalesOutreachAdapter } from "@/lib/agents/sales-outreach.adapter";
import { OrchestrationContext } from "@/lib/runtime/orchestrator";

const proposalStrategist = new ProposalStrategistAdapter(/* config */);
const dealStrategist = new DealStrategistLLMAdapter(/* config */);
const salesOutreach = new SalesOutreachAdapter(/* config */);

const context: OrchestrationContext = {
  opportunity: { /* ... shared opportunity data ... */ },
};

// ── Phase 1: Proposal Strategist drafts win themes and architecture ──
const proposal = await proposalStrategist.execute({
  opportunity: context.opportunity,
  rfpContent: await loadRFP(),
  competitiveLandscape: await loadCompetitiveIntel(),
}, context);

// Write proposal artifacts to context
context.winThemeMatrix = proposal.winThemeMatrix;
context.proposalBlueprint = proposal.proposalBlueprint;
context.executiveSummary = proposal.executiveSummary;

// ── Phase 2: Deal Strategist qualifies the deal ──
const dealAssessment = await dealStrategist.execute({
  opportunity: context.opportunity,
  meddpicc: await loadMeddpiccData(),
  stakeholders: await loadStakeholderMap(),
  competitiveLandscape: await loadCompetitiveIntel(),
}, context);

// Write deal assessment to context for downstream consumption
context.dealScore = dealAssessment.dealScore;
context.meddpiccMap = dealAssessment.meddpiccCompletion;
context.winPlan = dealAssessment.winPlan;
context.competitivePositioning = dealAssessment.competitivePositioning;
context.stakeholderAlignment = dealAssessment.stakeholderAlignment;
context.riskAssessment = dealAssessment.riskAssessment;
context.verdict = dealAssessment.verdict;

// ── Phase 3: Sales Outreach executes engagement sequence ──
// The outreach agent reads the win plan and stakeholder alignment
// from context to tailor its outreach sequence.

const outreachSequence = await salesOutreach.execute({
  prospect: {
    company: context.opportunity.accountName,
    stakeholders: context.stakeholderAlignment
      .filter(s => s.engagementLevel === "low" || s.engagementLevel === "none")
      .map(s => ({
        name: s.name,
        title: s.name, // would be enriched from stakeholder map
        sentiment: s.sentiment,
        recommendedAction: s.recommendedAction,
      })),
  },
  context: {
    dealScore: context.dealScore,
    keyMessages: context.winThemeMatrix?.themes.map(t => t.statement) ?? [],
    competitivePositioning: context.competitivePositioning,
    priorityActions: context.winPlan?.actions ?? [],
    riskFlags: context.riskAssessment?.redFlags ?? [],
  },
}, context);
```

### Context Flow (Multi-Agent)

```
Context Key                    │ Phase 1 (Proposal)   │ Phase 2 (Deal Strat) │ Phase 3 (Outreach)
───────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────
winThemeMatrix                 │ WRITTEN              │ READ                 │ REFERENCED
proposalBlueprint              │ WRITTEN              │ —                    │ —
executiveSummary               │ WRITTEN              │ —                    │ —
───────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────
dealScore                      │ —                    │ WRITTEN              │ READ
meddpiccMap                    │ —                    │ WRITTEN              │ — (persisted for audit)
winPlan                        │ —                    │ WRITTEN              │ READ (actions)
competitivePositioning         │ —                    │ WRITTEN              │ READ (talk tracks)
stakeholderAlignment           │ —                    │ WRITTEN              │ READ (who to engage)
riskAssessment                 │ —                    │ WRITTEN              │ READ (avoid pitfalls)
verdict                        │ —                    │ WRITTEN              │ READ (urgency calibration)
───────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────
outreachSequence               │ —                    │ —                    │ WRITTEN
```

### Outcome

After the multi-agent pipeline completes, the following artifacts are available:

| Artifact | Source Agent | Consumer |
|---|---|---|
| Win Theme Matrix | @proposal-strategist | Proposal document, Sales outreach messaging |
| Executive Summary Draft | @proposal-strategist | Buyer-facing proposal |
| MEDDPICC Completion Map | @deal-strategist | Pipeline review, Forecast call |
| Win Plan (actions) | @deal-strategist | Rep task list, Manager coaching |
| Competitive Positioning | @deal-strategist | Battlecards, Demo talking points |
| Stakeholder Alignment | @deal-strategist | Outreach priority, Meeting planning |
| Risk Assessment | @deal-strategist | Forecast adjustment, Escalation |
| Outreach Sequence | @sales-outreach | Automated cadence execution |

---

## Cross-Agent Context Contract

### Keys written by @deal-strategist

| Key | Type | Description | Consumed By |
|---|---|---|---|
| `dealScore` | `number (0-100)` | Overall deal health score | @pipeline-analyst, @sales-coach, @sales-outreach |
| `meddpiccMap` | `MeddpiccCompletionMap` | Per-element scores + gaps | @pipeline-analyst, @sales-coach |
| `winPlan` | `WinPlan` | Actions, milestones, exit criteria | @sales-outreach, @sales-coach |
| `competitivePositioning` | `CompetitivePositioningEntry[]` | Per-competitor strategy | @sales-engineer, @sales-outreach |
| `stakeholderAlignment` | `StakeholderAlignmentEntry[]` | Influence × sentiment × engagement | @sales-outreach, @account-strategist |
| `riskAssessment` | `RiskAssessment` | Red flags + early warnings | @pipeline-analyst, @sales-coach |
| `verdict` | `DealVerdict` | COMMIT / BATTLING / VULNERABLE / AT_RISK / DISQUALIFY | @pipeline-analyst (forecast) |

### Keys read by @deal-strategist

| Key | Type | Source | Purpose |
|---|---|---|---|
| `pipelineRiskFlags` | `Array<{dealName, riskCategory, severity, description}>` | @pipeline-analyst | Pre-populated risk context for assessment |
| `winThemeMatrix` | `WinThemeMatrix` | @proposal-strategist | Proposal win themes inform competitive positioning |

---

## Error Recovery Patterns

| Scenario | Detection | Recovery |
|---|---|---|
| MEDDPICC input has <3 fields populated | `scoreMeddpiccCompleteness()` returns low count | Return `VALIDATION_ERROR` with specific field guidance |
| Deal value exceeds $100M | `validateDealValue()` returns warning | Continue with flag, request value verification |
| Stakeholder influence is invalid | `validateStakeholderRoles()` returns error | Reject input, require valid enum value |
| LLM output fails to parse as `DealStrategistOutput` | JSON parse error | Retry with stricter schema constraints (max 2 retries) |
| Empty competitor list | Completeness scoring flags it | Treat "do nothing" as default competitor |
| Context missing for chain flow | `pipelineRiskFlags` absent | Assess deal without upstream data (lower confidence) |
