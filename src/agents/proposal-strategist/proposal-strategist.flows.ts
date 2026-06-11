// ============================================================================
// Nexus Agent Platform — Execution Flow Examples
// Agent: @proposal-strategist
// Description: Canonical execution patterns demonstrating single-agent,
//              chained, and multi-agent orchestration flows.
// ============================================================================

import type { AgentContext } from "../registry.types";
import type {
  ProposalStrategistInput,
  ProposalStrategistOutput,
  WinThemeFinal,
  CompetitivePositioningEntry,
  ResponseSection,
  ComplianceChecklistItem,
} from "./proposal-strategist.adapter";

// ============================================================================
// Flow 1: Single Agent Execution
// ============================================================================
//
// Scenario: @proposal-strategist is invoked directly with an RFP document,
// competitive landscape, and buyer context to generate a complete proposal
// strategy in isolation.
//
// Trigger: A sales team uploads an RFP and requests a strategy assessment.
//
// ============================================================================

export const SINGLE_AGENT_FLOW_EXAMPLE = {
  id: "proposal-strategist.single.v1",
  name: "Single Agent — RFP Win Strategy Generation",
  description: "Standalone invocation of @proposal-strategist to generate a complete proposal strategy from an RFP.",
  agents: ["@proposal-strategist"],
  trigger: "RFP received from buyer; sales team requests initial strategy assessment",

  /** Example input that a user or pipeline would provide */
  exampleInput: {
    rfpDocument: {
      id: "RFP-2026-0042",
      title: "Enterprise Data Platform Modernization",
      buyerOrganization: "GlobalCorp Financial Services",
      issueDate: "2026-05-15",
      dueDate: "2026-07-30",
      body: "GlobalCorp seeks a partner to modernize its legacy data infrastructure...",
      requirements: [
        {
          id: "REQ-001",
          section: "Technical Approach",
          description: "Describe your approach to migrating 200+ legacy ETL pipelines",
          responseType: "narrative",
          mandatory: true,
          pageLimit: 10,
        },
        {
          id: "REQ-002",
          section: "Security & Compliance",
          description: "Provide SOC 2 Type II certification and data residency strategy",
          responseType: "certification",
          mandatory: true,
        },
        {
          id: "REQ-003",
          section: "Pricing",
          description: "Provide fixed-price and T&M pricing for 3-year engagement",
          responseType: "pricing",
          mandatory: true,
        },
      ],
      statedCriteria: [
        "Technical approach and methodology (35%)",
        "Past performance and experience (25%)",
        "Team qualifications (20%)",
        "Cost (20%)",
      ],
    },
    competitiveLandscape: {
      knownCompetitors: [
        {
          name: "MegaCloud Inc.",
          strengths: ["Brand recognition", "Full cloud suite", "Existing relationship"],
          weaknesses: ["High total cost of ownership", "Vendor lock-in concerns", "Generic implementation approach"],
          expectedPositioning: ["End-to-end platform", "Global scale", "Innovation leader"],
        },
        {
          name: "DataBridge Solutions",
          strengths: ["Financial services focus", "Lower price point", "Agile methodology"],
          weaknesses: ["Limited enterprise reference accounts", "Smaller support team"],
          expectedPositioning: ["Financial services expertise", "Speed to value", "Cost-effective"],
        },
      ],
      incumbent: {
        name: "LegacySys Corp (current incumbent)",
        relationshipStrength: "strong",
        switchingCostAssessment: "High — deeply embedded in existing workflows; 40+ integrations",
      },
    },
    stakeholderPersonas: [
      {
        role: "Chief Data Officer",
        title: "CDO",
        primaryConcern: "Data governance, regulatory compliance, risk reduction",
        evaluationFocus: ["Security architecture", "Compliance certifications", "Referenceable clients in financial services"],
        decisionInfluence: "high",
      },
      {
        role: "VP of Data Engineering",
        title: "VP, Data Engineering",
        primaryConcern: "Migration complexity, team upskilling, operational continuity",
        evaluationFocus: ["Migration methodology", "Training and enablement", "Support model"],
        decisionInfluence: "high",
      },
      {
        role: "IT Procurement Director",
        title: "Director, IT Procurement",
        primaryConcern: "Total cost of ownership, contract terms, vendor viability",
        evaluationFocus: ["Pricing transparency", "Contract flexibility", "Vendor financial stability"],
        decisionInfluence: "medium",
      },
    ],
    bidderContext: {
      organizationName: "Nexus Data Platforms",
      relevantExperience: [
        {
          clientName: "First Federal Bank",
          projectTitle: "Enterprise Data Platform Migration",
          year: 2024,
          contractValue: "$4.2M",
          outcome: "Migrated 180+ pipelines with zero data loss; 40% reduction in processing time",
          relevanceStatement: "Comparable scale and regulatory environment to GlobalCorp",
        },
      ],
      differentiators: [
        "Parallel workload staging methodology proven at Fortune 500 banks",
        "Zero-data-loss migration guarantee with insurance-backed SLA",
        "Dedicated financial services regulatory compliance team",
      ],
      availableCaseStudies: ["First Federal Bank Migration", "Meridian Insurance Data Consolidation"],
      pricingModel: "Fixed-price with consumption-based overage",
    },
    candidateWinThemes: [
      {
        title: "Risk-Mitigated Migration at Scale",
        clientNeed: "GlobalCorp cannot afford data loss or extended downtime during migration of 200+ critical pipelines",
        differentiator: "Parallel workload staging with real-time validation gates",
        proofPoint: "First Federal Bank: 180 pipelines migrated, zero data loss, 99.97% uptime",
      },
      {
        title: "Financial Services Compliance Built In",
        clientNeed: "Regulatory compliance is non-negotiable for GlobalCorp's data operations",
        differentiator: "Dedicated compliance team with financial services regulatory expertise embedded in delivery",
        proofPoint: "SOC 2 Type II, ISO 27001, FedRAMP In-Process — all maintained through migration",
      },
    ],
    evaluationCriteria: [
      { name: "Technical approach", weight: 35 },
      { name: "Past performance", weight: 25 },
      { name: "Team qualifications", weight: 20 },
      { name: "Cost", weight: 20 },
    ],
  } satisfies ProposalStrategistInput,

  /** Expected output shape (abbreviated; real output would contain full content) */
  exampleOutput: {
    proposalStrategy: {
      thesis:
        "GlobalCorp needs a migration partner who treats their regulatory environment and data integrity as non-negotiable constraints — not afterthoughts. Nexus Data Platforms' parallel staging methodology and financial services specialization make us the only bidder who can guarantee zero-data-loss migration at this scale.",
      narrativeArc: {
        actI:
          "GlobalCorp operates in one of the most regulated data environments in financial services. Their 200+ ETL pipelines represent decades of business logic — and their audit trail requirements mean any migration approach that risks data integrity is simply unacceptable.",
        actII:
          "Our parallel workload staging approach treats each pipeline as a validated migration unit. Pipelines are migrated in waves, with automated validation gates at each stage. The incumbent's environment remains operational until each wave is certified, eliminating downtime risk.",
        actIII:
          "Within 18 months, GlobalCorp will operate a modern data platform with 40% faster processing, fully auditable migration history, and a regulatory compliance posture that exceeds examiner expectations.",
      },
      keyMessages: [
        "Zero-data-loss migration is not a claim — it is a methodology with a track record",
        "Financial services regulation is our home environment, not an accommodation",
        "The incumbent's advantage (embedded relationships) is outweighed by the risk of staying on an aging platform",
      ],
      pricingStrategy:
        "Anchor on the $2.1M/year cost of current platform maintenance before presenting our pricing. Frame investment as risk reduction + efficiency gain, not cost.",
    },

    winThemes: [
      {
        id: "WT-001",
        title: "Zero-Data-Loss Migration at Enterprise Scale",
        clientNeed:
          "GlobalCorp's 200+ legacy ETL pipelines process $12B in daily transactions. Any data loss or extended downtime during migration is unacceptable.",
        ourDifferentiator:
          "Parallel workload staging with automated validation gates — pipelines migrate in certified waves; legacy environment stays live until each wave is verified.",
        proofPoint:
          "First Federal Bank: 180 pipelines migrated in 14 months, zero data loss events, 99.97% system uptime throughout.",
        evidenceSource: "First Federal Bank Case Study, 2024; SOC 2 Type II audit report",
        competitiveContrast:
          "Competitors typically use lift-and-shift or big-bang migration approaches that carry inherent rollback risk and extended downtime windows.",
        integrationPoints: ["Executive Summary", "Technical Approach §3.2", "Past Performance", "Pricing Rationale"],
        validated: true,
      },
      {
        id: "WT-002",
        title: "Regulatory Compliance as a Delivery Requirement, Not an Add-On",
        clientNeed:
          "GlobalCorp faces OCC, CFPB, and state-level regulatory scrutiny. Their data platform must maintain audit trails, data residency, and compliance certifications throughout and after migration.",
        ourDifferentiator:
          "Dedicated financial services compliance team embedded in delivery — not a separate review function. All migration waves pass through automated compliance validation gates.",
        proofPoint:
          "All three financial services clients maintained their regulatory posture through migration; two passed FDIC examinations during active migration periods.",
        evidenceSource: "Client audit outcomes; compliance team certifications",
        competitiveContrast:
          "Competitors typically treat compliance as a project milestone review, not an ongoing delivery constraint. This creates regulatory gaps during migration that examiners flag.",
        integrationPoints: ["Executive Summary", "Technical Approach §4.1", "Management Plan", "Risk Management"],
        validated: true,
      },
    ] satisfies WinThemeFinal[],

    executiveSummary: {
      situationMirror:
        "GlobalCorp Financial Services operates 200+ legacy ETL pipelines processing $12B in daily transactions. Your team has identified that the current platform cannot scale to meet your 2027 data volume projections, and the cost of maintenance — both financial and operational — is rising 18% year over year.",
      centralTension:
        "The cost of inaction is quantifiable: $2.1M annually in maintenance overhead, growing regulatory risk from an aging platform, and a widening gap between your data capabilities and your business ambitions. Yet a failed migration — data loss, extended downtime, or compliance gaps — would be far more costly than standing still.",
      solutionThesis:
        "Nexus Data Platforms' parallel staging migration methodology resolves this tension entirely. By migrating pipelines in validated waves while keeping the legacy environment live, we eliminate downtime risk. Our financial services compliance team — embedded in delivery, not reviewing from the sidelines — ensures your regulatory posture never wavers. This is the same approach that moved 180 pipelines for First Federal Bank with zero data loss and 99.97% uptime.",
      proof:
        "First Federal Bank, a Fortune 500 financial institution with comparable scale and regulatory requirements, completed a 180-pipeline migration in 14 months. Zero data loss events. Zero compliance findings during a concurrent FDIC examination. End state: 40% faster processing, $1.8M annual maintenance savings, and a platform ready for AI/ML workloads.",
      transformedState:
        "Eighteen months post-award, GlobalCorp will operate a modern data platform that processes 2.5x current volumes, passes regulatory examinations with no migration-related findings, and delivers $1.8M+ in annual savings — freeing budget for innovation rather than maintenance.",
      assembledText:
        "GlobalCorp Financial Services operates 200+ legacy ETL pipelines processing $12B in daily transactions.\n\n" +
        "The cost of inaction: $2.1M annually in maintenance overhead, growing regulatory risk, and widening capability gaps. Yet a failed migration would be worse than standing still.\n\n" +
        "Nexus Data Platforms' parallel staging methodology eliminates this tradeoff. We migrate in validated waves while keeping legacy systems live — zero downtime risk. Our financial services compliance team is embedded in delivery, not reviewing from the sidelines.\n\n" +
        "First Federal Bank: 180 pipelines, 14 months, zero data loss, 99.97% uptime, concurrent FDIC examination with zero findings.\n\n" +
        "Eighteen months post-award: 2.5x data volume capacity, $1.8M+ annual savings, exam-ready compliance posture, and a platform built for AI/ML.",
    },

    competitiveMatrix: {
      entries: [
        {
          dimension: "Migration risk management",
          ourPosition: "Parallel wave staging with automated validation gates; legacy environment preserved until wave certification",
          expectedCompetitorPosition: "Big-bang or phased cutover with rollback plans",
          ourAdvantage: "Zero-data-loss guarantee backed by methodology, not promises; incumbent can maintain operations throughout",
          riskLevel: "low",
        },
        {
          dimension: "Financial services compliance",
          ourPosition: "Dedicated compliance team embedded in delivery with automated compliance validation gates per migration wave",
          expectedCompetitorPosition: "Compliance as a project milestone review or separate workstream",
          ourAdvantage: "Compliance is not a review gate — it is a delivery constraint. This is the difference between passing an audit and being audit-ready throughout.",
          riskLevel: "low",
        },
        {
          dimension: "Migration speed",
          ourPosition: "14-month track record for 180-pipeline migration at comparable scale",
          expectedCompetitorPosition: "Faster timelines (MegaCloud may claim 8-10 months)",
          ourAdvantage: "Speed without risk is a differentiator; speed with risk is a liability. Our timeline is conservative because we validate continuously, which is what a regulated institution should value.",
          riskLevel: "medium",
        },
        {
          dimension: "Total cost of ownership",
          ourPosition: "Fixed-price migration with consumption-based overage; projected 40% TCO reduction post-migration",
          expectedCompetitorPosition: "Lower upfront pricing (DataBridge); higher long-term platform costs (MegaCloud)",
          ourAdvantage: "Our TCO model accounts for the full cost of regulatory compliance, training, and ongoing support — no hidden line items. The 40% reduction is auditable against First Federal Bank actuals.",
          riskLevel: "medium",
        },
      ] satisfies CompetitivePositioningEntry[],
      overallAssessment:
        "Nexus is best positioned on the dimensions that matter most to this buyer: risk mitigation and regulatory compliance. The competitive risk is highest on pricing perception (MegaCloud's brand premium vs. DataBridge's lower entry point), which must be addressed through a strong value anchoring narrative in the pricing section.",
      bestPositionedAgainst: ["DataBridge Solutions", "LegacySys Corp (incumbent)"],
      highestRiskCompetitors: ["MegaCloud Inc."],
    },

    responseOutline: {
      sections: [
        {
          sectionId: "EXEC",
          title: "Executive Summary",
          rfpReference: "Cover letter / opening",
          narrativeAct: "I",
          primaryTheme: "WT-001",
          secondaryTheme: "WT-002",
          keyEvidence: "First Federal Bank metrics",
          estimatedLength: "brief",
        },
        {
          sectionId: "TECH-3.2",
          title: "Migration Methodology — Parallel Staging Approach",
          rfpReference: "REQ-001",
          narrativeAct: "II",
          primaryTheme: "WT-001",
          keyEvidence: "Pipeline migration playbook, validation gate framework",
          microStoryOpportunity: "First Federal Bank migration weekend where a staggered cutover prevented a potential data incident",
          estimatedLength: "comprehensive",
        },
        {
          sectionId: "TECH-4.1",
          title: "Compliance Architecture",
          rfpReference: "REQ-002",
          narrativeAct: "II",
          primaryTheme: "WT-002",
          keyEvidence: "SOC 2 Type II, compliance team certifications",
          estimatedLength: "moderate",
        },
        {
          sectionId: "PAST",
          title: "Past Performance",
          rfpReference: "Evaluation criteria (25%)",
          narrativeAct: "III",
          primaryTheme: "WT-001",
          secondaryTheme: "WT-002",
          keyEvidence: "First Federal Bank, Meridian Insurance case studies",
          estimatedLength: "moderate",
        },
        {
          sectionId: "PRICING",
          title: "Pricing and Value Proposition",
          rfpReference: "REQ-003",
          narrativeAct: "III",
          primaryTheme: "WT-001",
          keyEvidence: "ROI calculator referencing First Federal Bank actuals",
          estimatedLength: "moderate",
        },
      ] satisfies ResponseSection[],
      complianceChecklist: [
        {
          requirementId: "REQ-001",
          description: "Describe your approach to migrating 200+ legacy ETL pipelines",
          responseType: "narrative",
          compliant: true,
          strategicEnhancement:
            "In addition to the methodology narrative, include a one-page visual of the wave staging process with callouts to the validation gate framework (reinforces WT-001)",
        },
        {
          requirementId: "REQ-002",
          description: "Provide SOC 2 Type II certification and data residency strategy",
          responseType: "certification",
          compliant: true,
          strategicEnhancement:
            "Frame certifications within the compliance-as-delivery narrative (reinforces WT-002); include a summary of how certifications were maintained during First Federal Bank migration",
        },
        {
          requirementId: "REQ-003",
          description: "Provide fixed-price and T&M pricing for 3-year engagement",
          responseType: "pricing",
          compliant: true,
          strategicEnhancement:
            "Precede pricing tables with a one-page value summary quantifying current maintenance cost ($2.1M/yr) and projected post-migration savings (40% TCO reduction)",
        },
      ] satisfies ComplianceChecklistItem[],
      pageBudget: {
        "Executive Summary": 1,
        "Technical Approach": 25,
        "Management Plan": 8,
        "Past Performance": 10,
        "Pricing Rationale": 5,
        "Appendices": 5,
        total: 54,
      },
    },

    riskReward: {
      assessedReward: {
        estimatedWinProbability: 62,
        dealValue: "$4.5M - $6.2M (3-year TCV)",
        strategicValue:
          "Financial services vertical anchor reference; enables expansion into 3 adjacent FS sub-verticals; builds regulatory compliance capability differentiator for future bids",
      },
      identifiedRisks: [
        {
          category: "Competitive",
          description: "MegaCloud's incumbent access and brand recognition may influence evaluation despite weaker migration methodology",
          severity: "high",
          mitigationStrategy:
            "Develop procurement-level financial comparison showing 3-year TCO for MegaCloud vs. Nexus. Arm champion to coach on evaluation criteria weighting.",
        },
        {
          category: "Stakeholder",
          description: "CDO is the primary decision-maker but we have limited direct access; our champion is in Data Engineering",
          severity: "medium",
          mitigationStrategy:
            "Request CDO briefing session before final proposal submission. Prepare executive summary that speaks directly to CDO's compliance and risk concerns.",
        },
        {
          category: "Pricing",
          description: "DataBridge may undercut on price, forcing a cost-focused evaluation that favors their lower entry point",
          severity: "medium",
          mitigationStrategy:
            "Anchor pricing conversation on TCO and risk reduction before presenting numbers. Quantify the cost of a failed migration (data loss, compliance findings, operational disruption) as context for our pricing.",
        },
      ],
      overallRiskLevel: "medium",
      recommendation: "pursue-with-caution",
    },

    confidenceScore: 72,
  } satisfies ProposalStrategistOutput,
};

// ============================================================================
// Flow 2: Chained Execution
// ============================================================================
//
// Scenario: @deal-strategist qualifies an opportunity first, then passes its
//           MEDDPICC assessment to @proposal-strategist for proposal strategy
//           development. The chain ensures the proposal strategy is grounded
//           in validated qualification data.
//
// Pipeline: @deal-strategist → @proposal-strategist
//
// ============================================================================

export const CHAINED_FLOW_EXAMPLE = {
  id: "proposal-strategist.chain.deal-qualification.v1",
  name: "Chained — Deal Qualification → Proposal Strategy",
  description:
    "@deal-strategist qualifies the opportunity using MEDDPICC, then passes structured qualification data to @proposal-strategist for strategy generation.",
  agents: ["@deal-strategist", "@proposal-strategist"],
  pipeline: [
    {
      agent: "@deal-strategist",
      action: "Qualify opportunity with MEDDPICC scoring",
      outputContextKeys: [
        "dealAssessment.meddpiccScore",
        "dealAssessment.dealVerdict",
        "dealAssessment.identifiedPain",
        "dealAssessment.competitiveNotes",
        "dealAssessment.economicBuyer",
        "dealAssessment.decisionCriteria",
      ],
    },
    {
      agent: "@proposal-strategist",
      action: "Generate proposal strategy from RFP + deal qualification context",
      inputContextKeys: [
        "dealAssessment.*",     // All deal-strategist outputs
        "rfpDocument",          // Original RFP (from pipeline input)
        "competitiveLandscape", // Original competitive intel
        "stakeholderPersonas",  // Original stakeholder data
        "bidderContext",        // Original bidder context
      ],
      outputContextKeys: [
        "proposalStrategy",
        "winTheme",
        "executiveSummary",
        "responseOutline",
        "competitiveMatrix",
        "complianceChecklist",
      ],
    },
  ],
  description: `
    Step 1: @deal-strategist receives the raw opportunity data and scores it
    against MEDDPICC. It identifies that the deal score is 31/40 with a
    "Winning" verdict on technical criteria but "Battling" on pricing and
    stakeholder access. Key gaps: no direct EB access, paper process not
    initiated.

    Step 2: @proposal-strategist receives the RFP document AND the deal
    qualification output. It uses the MEDDPICC data to:
    - Weight win themes toward the identified pain ($2.1M/yr maintenance cost)
    - Address the EB access gap in stakeholder engagement strategy
    - Frame competitive positioning based on deal-strategist's competitive notes
    - Flag the uninitiated paper process as a timeline risk in the risk/reward
      assessment
  `,
  contextFlow: `
    AgentContext after @deal-strategist:
    {
      dealAssessment: {
        meddpiccScore: 31,
        dealVerdict: "Battling",
        identifiedPain: "$2.1M/yr in manual platform maintenance; growing regulatory risk from aging infrastructure",
        economicBuyer: "CDO (confirmed identity, no direct meeting scheduled)",
        decisionCriteria: ["Migration risk methodology", "Compliance posture", "TCO", "Team expertise"],
        competition: ["MegaCloud Inc. (direct)", "DataBridge Solutions (price challenger)", "LegacySys (incumbent)"],
        paperProcess: "Not discussed — HIGH RISK"
      }
    }

    AgentContext after @proposal-strategist:
    {
      ...dealAssessment,
      proposalStrategy: { ... },
      winTheme: [
        { id: "WT-001", title: "Zero-Data-Loss Migration at Enterprise Scale", ... },
        { id: "WT-002", title: "Regulatory Compliance as a Delivery Requirement", ... },
        { id: "WT-003", title: "Total Cost of Ownership Transparency", ... }
      ],
      executiveSummary: { ... },
      responseOutline: { ... },
      competitiveMatrix: { ... },
      complianceChecklist: [
        { requirementId: "REQ-001", compliant: true,
          strategicEnhancement: "Include validation gate diagram" },
        { requirementId: "REQ-003", compliant: true,
          strategicEnhancement: "Precede pricing with $2.1M/yr maintenance cost context from deal qual" }
      ]
    }
  `,
};

// ============================================================================
// Flow 3: Multi-Agent Orchestration
// ============================================================================
//
// Scenario: A full strategic response pipeline where @trend-researcher
//           identifies market intelligence, @content-creator develops
//           proof-point assets, and @proposal-strategist synthesizes
//           everything into the proposal strategy.
//
// Pipeline: @trend-researcher → @content-creator → @proposal-strategist
//
// ============================================================================

export const MULTI_AGENT_FLOW_EXAMPLE = {
  id: "proposal-strategist.multi-agent.strategic-response.v1",
  name: "Multi-Agent — Research → Content → Proposal Strategy",
  description:
    "A coordinated multi-agent pipeline where @trend-researcher provides market intelligence, @content-creator develops proof-point assets (case studies, whitepapers), and @proposal-strategist synthesizes everything into a complete proposal strategy.",
  agents: ["@trend-researcher", "@content-creator", "@proposal-strategist"],
  pipeline: [
    {
      agent: "@trend-researcher",
      action: "Research market trends and buyer context",
      input: {
        buyer: "GlobalCorp Financial Services",
        industry: "Financial Services",
        focusAreas: ["Data platform modernization trends", "Regulatory technology landscape", "Cloud migration in FS"],
      },
      outputContextKeys: [
        "marketIntelligence.industryTrends",
        "marketIntelligence.regulatoryUpdates",
        "marketIntelligence.competitorMoves",
        "marketIntelligence.buyerSignals",
      ],
    },
    {
      agent: "@content-creator",
      action: "Create proof-point assets and case study narratives",
      input: {
        briefType: "Case study and whitepaper development",
        audience: "Financial services CDOs and data engineering leaders",
        keyMessages: [
          "Zero-data-loss migration at enterprise scale",
          "Regulatory compliance embedded in delivery",
        ],
        sourceMaterial: {
          caseStudy: "First Federal Bank migration",
          metrics: ["180 pipelines", "99.97% uptime", "40% faster processing", "$1.8M annual savings"],
        },
      },
      outputContextKeys: [
        "contentAssets.caseStudies",
        "contentAssets.whitepaperDraft",
        "contentAssets.keyMessageFraming",
        "contentAssets.executiveSummaryDraft",
      ],
    },
    {
      agent: "@proposal-strategist",
      action: "Synthesize research and content into complete proposal strategy",
      inputContextKeys: [
        "marketIntelligence.*",
        "contentAssets.*",
        "rfpDocument",
        "competitiveLandscape",
        "stakeholderPersonas",
        "bidderContext",
      ],
      outputContextKeys: [
        "proposalStrategy",
        "winTheme",
        "executiveSummary",
        "responseOutline",
        "competitiveMatrix",
        "complianceChecklist",
        "riskReward",
      ],
    },
  ],
  description: `
    Phase 1 — @trend-researcher:
    Researches the financial services data platform market. Identifies three
    key trends: (1) OCC is increasing scrutiny on data lineage and audit
    trails for large banks, (2) competitor MegaCloud is pushing a
    "zero-touch migration" narrative in their recent campaigns, (3) GlobalCorp
    executives have been publicly discussing AI/ML readiness at conferences.
    This intelligence is written into marketIntelligence context keys.

    Phase 2 — @content-creator:
    Using the market intel, the content creator develops:
    - A refined First Federal Bank case study emphasizing regulatory outcomes
      (timely given OCC scrutiny trend)
    - A whitepaper draft on "Regulatory-Compliant Data Migration at Scale"
    - Framed key messages that counter MegaCloud's "zero-touch" narrative with
      Nexus's "validated wave" methodology
    These assets are written into contentAssets context keys.

    Phase 3 — @proposal-strategist:
    Synthesizes everything into a final proposal strategy:
    - Uses trend researcher's OCC intel to strengthen compliance win theme
    - Uses content creator's reframed case study as proof point in executive summary
    - Adjusts competitive positioning to address MegaCloud's "zero-touch"
      narrative with a specific contrast dimension in the matrix
    - The whitepaper becomes a value-added appendix that reinforces expertise
  `,
  contextFlow: `
    AgentContext after @trend-researcher:
    {
      marketIntelligence: {
        industryTrends: [
          "OCC increasing data lineage and audit trail scrutiny for Tier 1 banks",
          "Cloud migration in FS shifting from 'lift-and-shift' to 'replatform-with-compliance'",
          "AI/ML readiness driving next-gen data platform investments"
        ],
        competitorMoves: [
          "MegaCloud launching 'zero-touch migration' campaign targeting FS CDOs"
        ],
        buyerSignals: [
          "GlobalCorp CDO spoke at FinTech Summit on AI/ML strategy — signals data platform upgrade is strategic priority"
        ]
      }
    }

    AgentContext after @content-creator:
    {
      ...marketIntelligence,
      contentAssets: {
        caseStudies: {
          firstFederalBank: {
            title: "Zero Data Loss, Zero Compliance Findings: First Federal Bank's 180-Pipeline Migration",
            narrative: "[Full case study with regulatory emphasis]",
            metrics: { pipelines: 180, uptime: "99.97%", savings: "$1.8M/yr" }
          }
        },
        whitepaperDraft: "Regulatory-Compliant Data Migration at Scale: A Framework for Financial Services",
        keyMessageFraming: {
          zeroDataLoss: { primary: "Validated wave migration", counter: "vs. 'zero-touch' (which means zero validation)" }
        }
      }
    }

    AgentContext after @proposal-strategist:
    {
      ...marketIntelligence,
      ...contentAssets,
      proposalStrategy: { ... },
      winTheme: [ /* 3 themes strengthened by research + content */ ],
      executiveSummary: { ... },
      responseOutline: { ... },
      competitiveMatrix: { /* includes specific counter to MegaCloud zero-touch narrative */ },
      complianceChecklist: [ ... ],
      riskReward: { ... }
    }
  `,
};
