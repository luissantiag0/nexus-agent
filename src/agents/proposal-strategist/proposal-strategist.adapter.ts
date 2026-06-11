// ============================================================================
// Nexus Agent Platform — Agent Registry Adapter
// Agent: @proposal-strategist
// Interface Version: 1.0.0
// Description: Transforms RFPs and sales opportunities into compelling win
//              narratives — developing win themes, competitive positioning,
//              and executive summaries that persuade evaluators.
// ============================================================================

import type { AgentContext, AgentLifecycleHooks } from "../registry.types";

// ---------------------------------------------------------------------------
// AgentInput Schema
// ---------------------------------------------------------------------------

/**
 * Input contract for the @proposal-strategist agent.
 *
 * The agent consumes an RFP document (or equivalent opportunity brief),
 * strategic context from @deal-strategist, competitive intelligence, and
 * stakeholder personas to produce a winning proposal strategy.
 */
export interface ProposalStrategistInput {
  /** The canonical RFP or solicitation document content */
  rfpDocument: RfpDocument;

  /** Strategic context and qualification output from @deal-strategist */
  dealQualification?: DealQualificationContext;

  /** Competitive landscape intelligence */
  competitiveLandscape: CompetitiveLandscape;

  /** Candidate win themes (may be refined by the agent) */
  candidateWinThemes?: WinThemeDraft[];

  /** Stakeholder / buyer personas this proposal must persuade */
  stakeholderPersonas: StakeholderPersona[];

  /** Organizational context about the bidding entity */
  bidderContext: BidderContext;

  /** Additional discovery notes or internal briefings */
  discoveryNotes?: string;

  /** Evaluation criteria weighting (if known from RFP or discovery) */
  evaluationCriteria?: EvaluationCriterion[];
}

/** Structured representation of an RFP or solicitation document */
export interface RfpDocument {
  id: string;
  title: string;
  buyerOrganization: string;
  issueDate: string;
  dueDate: string;
  /** Full RFP text or section-structured content */
  body: string;
  /** Explicit compliance requirements extracted from the RFP */
  requirements: RfpRequirement[];
  /** Evaluation criteria as stated in the RFP (if published) */
  statedCriteria?: string[];
  /** Attachments, appendices, or referenced documents */
  attachments?: string[];
}

/** A single compliance requirement extracted from the RFP */
export interface RfpRequirement {
  id: string;
  section: string;
  description: string;
  responseType: "narrative" | "table" | "pricing" | "certification" | "attachment";
  mandatory: boolean;
  pageLimit?: number;
}

/** Contextual output from @deal-strategist (MEDDPICC qualification, deal score) */
export interface DealQualificationContext {
  meddpiccScore: number;
  metrics?: string;
  economicBuyer?: string;
  decisionCriteria: string[];
  decisionProcess: string;
  paperProcess?: string;
  identifiedPain: string;
  champion?: string;
  competition: string[];
  dealVerdict: "Winning" | "Battling" | "Losing" | "Unknown";
  dealNotes?: string;
}

/** Intelligence about a specific competitor */
export interface CompetitorProfile {
  name: string;
  /** Perceived strengths from the buyer's perspective */
  strengths: string[];
  /** Perceived weaknesses or gaps */
  weaknesses: string[];
  /** Likely positioning or narrative themes expected from this competitor */
  expectedPositioning: string[];
  /** Historical win/loss record against this competitor (if known) */
  historicalRecord?: { wins: number; losses: number; totalMeetings: number };
}

/** Aggregated competitive landscape intelligence */
export interface CompetitiveLandscape {
  knownCompetitors: CompetitorProfile[];
  /** The "do nothing" / status quo competitor (often the most dangerous) */
  incumbent?: {
    name: string;
    relationshipStrength: "weak" | "moderate" | "strong";
    switchingCostAssessment: string;
  };
  /** Market trends the buyer may be considering */
  marketTrends?: string[];
}

/** A draft win theme (may be input as candidates or output as refined themes) */
export interface WinThemeDraft {
  title: string;
  clientNeed: string;
  differentiator: string;
  proofPoint: string;
}

/** A stakeholder or buyer persona this proposal must address */
export interface StakeholderPersona {
  role: string;
  title: string;
  primaryConcern: string;
  evaluationFocus: string[];
  decisionInfluence: "high" | "medium" | "low";
  communicationStyle?: string;
}

/** Context about the bidding organization */
export interface BidderContext {
  organizationName: string;
  relevantExperience: PastPerformanceReference[];
  differentiators: string[];
  availableCaseStudies: string[];
  pricingModel?: string;
  /** Key personnel proposed for this engagement */
  proposedTeam?: { role: string; name: string; credentials: string[] }[];
}

/** A past performance reference or case study */
export interface PastPerformanceReference {
  clientName: string;
  projectTitle: string;
  year: number;
  contractValue?: string;
  outcome: string;
  relevanceStatement: string;
}

/** An evaluation criterion with known or estimated weighting */
export interface EvaluationCriterion {
  name: string;
  weight: number; // 0–100
  description?: string;
}

// ---------------------------------------------------------------------------
// AgentOutput Schema
// ---------------------------------------------------------------------------

/**
 * Output contract from the @proposal-strategist agent.
 *
 * Contains the full proposal strategy: refined win themes with integration
 * maps, the executive summary draft, a competitive positioning matrix,
 * the response outline (section-by-section), and a risk/reward assessment.
 */
export interface ProposalStrategistOutput {
  /** The overarching proposal strategy narrative */
  proposalStrategy: ProposalStrategy;

  /** Refined, tested win themes with evidence and integration mapping */
  winThemes: WinThemeFinal[];

  /** Executive summary draft (the proposal's closing argument, placed first) */
  executiveSummary: ExecutiveSummaryDraft;

  /** Competitive positioning matrix showing our stance vs. each competitor */
  competitiveMatrix: CompetitivePositioningMatrix;

  /** Section-by-section response outline with theme and evidence mapping */
  responseOutline: ResponseOutline;

  /** Risk/reward assessment for the proposal strategy */
  riskReward: RiskRewardAssessment;

  /** Confidence score for the proposed strategy */
  confidenceScore: number; // 0–100
}

/** Overarching strategy for the proposal */
export interface ProposalStrategy {
  /** Strategic thesis in 2-3 sentences */
  thesis: string;
  /** The narrative arc: Act I / Act II / Act III description */
  narrativeArc: {
    actI: string;   // Understanding the Challenge
    actII: string;  // The Solution Journey
    actIII: string; // The Transformed State
  };
  /** Key messages that must appear consistently throughout */
  keyMessages: string[];
  /** Pricing narrative approach (value anchoring strategy) */
  pricingStrategy: string;
}

/** A fully developed, testable win theme */
export interface WinThemeFinal {
  id: string;
  title: string;
  clientNeed: string;
  ourDifferentiator: string;
  proofPoint: string;
  evidenceSource: string;
  /** Explicit statement of how this differentiates from likely competitor claims */
  competitiveContrast: string;
  /** Proposal sections where this theme must appear */
  integrationPoints: string[];
  /** Stress-test result: does it pass specificity, provability, and uniqueness checks? */
  validated: boolean;
}

/** Draft of the executive summary — the most critical proposal section */
export interface ExecutiveSummaryDraft {
  /** Opening: mirrors the buyer's situation in their own language */
  situationMirror: string;
  /** Central tension: cost of inaction or opportunity at risk */
  centralTension: string;
  /** Solution thesis: resolves the tension via win themes */
  solutionThesis: string;
  /** Proof: concrete evidence point (metric, case study, differentiator) */
  proof: string;
  /** Transformed state: specific outcome 12-18 months post-implementation */
  transformedState: string;
  /** Full assembled executive summary text (one page, ~350-500 words) */
  assembledText: string;
}

/** Competitive positioning matrix entry for one dimension */
export interface CompetitivePositioningEntry {
  dimension: string;
  ourPosition: string;
  expectedCompetitorPosition: string;
  ourAdvantage: string;
  riskLevel: "low" | "medium" | "high";
}

/** Full competitive positioning matrix */
export interface CompetitivePositioningMatrix {
  entries: CompetitivePositioningEntry[];
  /** Summary of our overall competitive stance */
  overallAssessment: string;
  /** Competitors we are best positioned against */
  bestPositionedAgainst: string[];
  /** Competitors posing the highest risk */
  highestRiskCompetitors: string[];
}

/** Section-by-section response outline */
export interface ResponseOutline {
  sections: ResponseSection[];
  complianceChecklist: ComplianceChecklistItem[];
  /** Estimated page allocation per section */
  pageBudget: Record<string, number>;
}

/** A single section within the response outline */
export interface ResponseSection {
  sectionId: string;
  title: string;
  rfpReference: string;
  narrativeAct: "I" | "II" | "III";
  primaryTheme: string;
  secondaryTheme?: string;
  keyEvidence: string;
  microStoryOpportunity?: string;
  estimatedLength: "brief" | "moderate" | "comprehensive";
}

/** A compliance requirement with response status and strategic overlay */
export interface ComplianceChecklistItem {
  requirementId: string;
  description: string;
  responseType: string;
  compliant: boolean;
  strategicEnhancement?: string;
}

/** Risk/reward assessment for the proposed strategy */
export interface RiskRewardAssessment {
  assessedReward: {
    estimatedWinProbability: number; // 0–100
    dealValue: string;
    strategicValue: string;
  };
  identifiedRisks: {
    category: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    mitigationStrategy: string;
  }[];
  overallRiskLevel: "low" | "medium" | "high";
  recommendation: "pursue" | "pursue-with-caution" | "no-bid";
}

// ---------------------------------------------------------------------------
// AgentContext Keys
// ---------------------------------------------------------------------------

/**
 * Context keys that the @proposal-strategist agent populates in the shared
 * AgentContext store during and after execution.
 *
 * Other agents (e.g., @content-creator, @sales-engineer) and downstream
 * processes can read these keys to access the proposal strategy without
 * re-executing the agent.
 */
export const PROPOSAL_STRATEGIST_CONTEXT_KEYS = {
  /** The complete ProposalStrategistOutput */
  PROPOSAL_STRATEGY: "proposalStrategy",
  /** The refined win themes array */
  WIN_THEME: "winTheme",
  /** The executive summary draft */
  EXECUTIVE_SUMMARY: "executiveSummary",
  /** The section-by-section response outline */
  RESPONSE_OUTLINE: "responseOutline",
  /** The competitive positioning matrix */
  COMPETITIVE_MATRIX: "competitiveMatrix",
  /** The risk/reward assessment */
  RISK_REWARD: "riskReward",
  /** The strategic thesis statement */
  STRATEGIC_THESIS: "strategicThesis",
  /** Compliance checklist with strategic overlays */
  COMPLIANCE_CHECKLIST: "complianceChecklist",
} as const;

export type ProposalStrategistContextKey =
  (typeof PROPOSAL_STRATEGIST_CONTEXT_KEYS)[keyof typeof PROPOSAL_STRATEGIST_CONTEXT_KEYS];

// ---------------------------------------------------------------------------
// Adapter Registration Interface
// ---------------------------------------------------------------------------

/**
 * The Agent Adapter that the Nexus Agent Registry uses to register and invoke
 * the @proposal-strategist agent.
 *
 * Implement this interface to integrate the proposal-strategist into the
 * Agent Registry runtime.
 */
export interface ProposalStrategistAdapter {
  /** Canonical agent identifier */
  readonly agentId: "proposal-strategist";
  /** Human-readable agent name */
  readonly name: string;
  /** Semantic version of this adapter */
  readonly version: string;
  /** Prompt version identifier */
  readonly promptVersion: string;

  /** Input schema type reference */
  readonly inputSchema: ProposalStrategistInput;
  /** Output schema type reference */
  readonly outputSchema: ProposalStrategistOutput;

  /** Lifecycle hooks for the Agent Registry */
  readonly hooks: AgentLifecycleHooks<ProposalStrategistInput, ProposalStrategistOutput>;

  /**
   * Execute the agent with the given input and context.
   * Called by the Agent Registry runtime to invoke the agent.
   */
  execute(input: ProposalStrategistInput, context: AgentContext): Promise<ProposalStrategistOutput>;

  /**
   * Dry-run the agent (validate input, estimate output structure, no actual execution).
   */
  dryRun(input: ProposalStrategistInput): ProposalStrategistDryRunResult;
}

/** Result of a dry-run validation */
export interface ProposalStrategistDryRunResult {
  valid: boolean;
  validationErrors: string[];
  estimatedOutputKeys: string[];
  estimatedConfidenceRange: { min: number; max: number };
}
