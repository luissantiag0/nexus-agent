// ============================================================================
// Nexus Agent Platform — AgentRunner Adapter Interface
// Agent: @proposal-strategist
// Interface Version: 1.0.0
// Description: Transforms RFPs, competitive intel, and buyer personas into
//              winning proposal strategies — win theme development, narrative
//              architecture, executive summary crafting, competitive positioning,
//              and risk/reward assessment. Designed for the AgentRunner system.
// ============================================================================

// ============================================================================
// IAgentAdapter — Generic adapter contract for the AgentRunner system.
// Every agent adapter in the runtime must implement this interface.
// ============================================================================

/**
 * Generic adapter interface for the AgentRunner system.
 *
 * @typeParam TInput  - The typed input payload.
 * @typeParam TOutput - The typed output payload.
 */
export interface IAgentAdapter<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  /** Unique agent identifier (e.g. "@proposal-strategist"). */
  readonly agentId: string;

  /** Human-readable agent name. */
  readonly name: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Human-readable description of the agent's purpose. */
  readonly description: string;

  /** Context keys this adapter reads from shared state. */
  readonly readsContextKeys: string[];

  /** Context keys this adapter writes to shared state. */
  readonly writesContextKeys: string[];

  /**
   * Validate the raw input payload against the adapter's schema and business
   * rules. Called by the AgentRunner before `execute()`.
   * If validation fails (result.valid === false), the runner MUST reject
   * the execution.
   */
  validate(input: Record<string, unknown>): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   - The validated typed input payload.
   * @param context - The shared agent context store (key-value).
   * @returns       - An AgentResult wrapping the output with execution metadata.
   */
  execute(input: TInput, context: Record<string, unknown>): Promise<AgentResult<TOutput>>;
}

// ============================================================================
// Validation & Result Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Wraps the agent execution output with runtime metadata.
 * This is the return type of `IAgentAdapter.execute()`.
 */
export interface AgentResult<TOutput = unknown> {
  /** Unique execution run identifier. */
  runId: string;
  /** ISO-8601 timestamp of when execution started. */
  timestamp: string;
  /** Wall-clock execution duration in milliseconds. */
  durationMs: number;
  /** The typed output payload on success. */
  output: TOutput | null;
  /** Execution status. */
  status: "idle" | "running" | "completed" | "failed" | "timed_out";
  /** Error message if status is "failed" or "timed_out". */
  error?: string;
}

// ============================================================================
// Context Keys
// ============================================================================

/**
 * Canonical context keys that the @proposal-strategist agent reads
 * from the shared AgentContext store.
 */
export const PROPOSAL_STRATEGIST_READS: readonly string[] = [
  "trendReport",
  "competitiveLandscape",
  "productRoadmap",
] as const;

/**
 * Canonical context keys that the @proposal-strategist agent writes
 * to the shared AgentContext store after execution.
 */
export const PROPOSAL_STRATEGIST_WRITES: readonly string[] = [
  "proposalStrategy",
  "winTheme",
  "executiveSummary",
  "competitiveMatrix",
  "riskReward",
] as const;

// ============================================================================
// Input Schema — ProposalStrategistInput
// ============================================================================

/**
 * A single competitor profile with expected positioning.
 */
export interface CompetitorProfile {
  name: string;
  strengths: string[];
  weaknesses: string[];
  expectedPositioning: string[];
  incumbent?: boolean;
}

/**
 * A draft or candidate win theme (may be refined during execution).
 */
export interface WinThemeDraft {
  title: string;
  clientNeed: string;
  differentiator: string;
  proofPoint: string;
}

/**
 * A buyer stakeholder persona that the proposal must persuade.
 */
export interface BuyerPersona {
  role: string;
  title: string;
  primaryConcern: string;
  evaluationFocus: string[];
  decisionInfluence: "high" | "medium" | "low";
}

/**
 * A single RFP compliance or technical requirement.
 */
export interface RfpRequirement {
  id: string;
  section: string;
  description: string;
  responseType: "narrative" | "table" | "pricing" | "certification" | "attachment";
  mandatory: boolean;
  pageLimit?: number;
}

/**
 * Strategic context about the deal that shapes the proposal approach.
 */
export interface DealContext {
  buyerOrganization: string;
  opportunityValue: string;
  dealStage: string;
  decisionTimeline: string;
  knownEvaluationCriteria: string[];
  incumbentVendor?: string;
  pursuingTeam?: string;
}

/**
 * Input payload for the @proposal-strategist agent.
 */
export interface ProposalStrategistInput {
  /** RFP requirements extracted from the solicitation document. */
  rfpRequirements: RfpRequirement[];

  /** Candidate win themes (may be refined or expanded by the agent). */
  winThemes: WinThemeDraft[];

  /** Competitive landscape — known competitor profiles. */
  competitors: CompetitorProfile[];

  /** Organizational differentiators and proof-point assets. */
  differentiators: string[];

  /** Buyer stakeholder personas that must be addressed. */
  buyerPersonas: BuyerPersona[];

  /** Strategic deal context for shaping the proposal approach. */
  dealContext: DealContext;

  /** Optional: raw RFP text for reference (used if requirements are sparse). */
  rfpBody?: string;

  /** Optional: additional discovery notes or internal context. */
  discoveryNotes?: string;
}

// ============================================================================
// Output Schema — ProposalStrategistOutput
// ============================================================================

/**
 * Overarching proposal strategy including the narrative arc.
 */
export interface ProposalStrategy {
  /** Central thesis in 2–3 sentences. */
  thesis: string;
  /** Three-act narrative structure. */
  narrativeArc: {
    actI: string;   // Understanding the Challenge
    actII: string;  // The Solution Journey
    actIII: string; // The Transformed State
  };
  /** Key messages that must appear consistently throughout the proposal. */
  keyMessages: string[];
  /** Pricing narrative approach (value anchoring strategy). */
  pricingStrategy: string;
}

/**
 * A fully developed, testable win theme.
 */
export interface WinThemeFinal {
  id: string;
  title: string;
  clientNeed: string;
  ourDifferentiator: string;
  proofPoint: string;
  evidenceSource: string;
  /** How this differentiates from expected competitor claims. */
  competitiveContrast: string;
  /** Proposal sections where this theme must appear. */
  integrationPoints: string[];
  /** Passes specificity, provability, and uniqueness stress tests. */
  validated: boolean;
}

/**
 * Draft of the executive summary — the proposal's closing argument, placed first.
 */
export interface ExecutiveSummary {
  /** Opening that mirrors the buyer's situation in their own language. */
  situationMirror: string;
  /** Central tension: cost of inaction or opportunity at risk. */
  centralTension: string;
  /** Solution thesis that resolves the tension via win themes. */
  solutionThesis: string;
  /** Concrete evidence point (metric, case study, differentiator). */
  proof: string;
  /** Specific outcome 12–18 months post-implementation. */
  transformedState: string;
  /** Full assembled one-page text (~350–500 words). */
  assembledText: string;
}

/**
 * A single competitive positioning dimension.
 */
export interface CompetitiveMatrixEntry {
  dimension: string;
  ourPosition: string;
  expectedCompetitorPosition: string;
  ourAdvantage: string;
  riskLevel: "low" | "medium" | "high";
}

/**
 * Section-by-section response outline with win theme and evidence mapping.
 */
export interface ResponseOutline {
  /** Ordered proposal sections. */
  sections: ResponseSection[];
  /** Compliance checklist with strategic overlays. */
  complianceChecklist: ComplianceChecklistItem[];
  /** Estimated page budget per section. */
  pageBudget: Record<string, number>;
}

export interface ResponseSection {
  sectionId: string;
  title: string;
  rfpReference: string;
  narrativeAct: "I" | "II" | "III";
  primaryTheme: string;
  secondaryTheme?: string;
  keyEvidence: string;
  estimatedLength: "brief" | "moderate" | "comprehensive";
}

export interface ComplianceChecklistItem {
  requirementId: string;
  description: string;
  responseType: string;
  compliant: boolean;
  strategicEnhancement?: string;
}

/**
 * Risk/reward assessment for the proposed strategy.
 */
export interface RiskRewardAssessment {
  assessedReward: {
    estimatedWinProbability: number;
    dealValue: string;
    strategicValue: string;
  };
  identifiedRisks: Array<{
    category: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    mitigationStrategy: string;
  }>;
  overallRiskLevel: "low" | "medium" | "high";
  recommendation: "pursue" | "pursue-with-caution" | "no-bid";
}

/**
 * Output payload from the @proposal-strategist agent.
 */
export interface ProposalStrategistOutput {
  /** Overarching proposal strategy narrative. */
  proposalStrategy: ProposalStrategy;

  /** Refined, tested win themes with evidence and integration mapping. */
  winThemeFinal: WinThemeFinal[];

  /** Executive summary draft (one page, win themes surfaced). */
  executiveSummary: ExecutiveSummary;

  /** Competitive positioning matrix. */
  competitiveMatrix: CompetitiveMatrixEntry[];

  /** Section-by-section response outline with theme and evidence mapping. */
  responseOutline: ResponseOutline;

  /** Risk/reward assessment for go/no-go decision-making. */
  riskRewardAssessment: RiskRewardAssessment;
}

// ============================================================================
// ProposalStrategistAdapter — AgentRunner-compatible implementation
// ============================================================================

const DEFAULT_READS = [...PROPOSAL_STRATEGIST_READS];
const DEFAULT_WRITES = [...PROPOSAL_STRATEGIST_WRITES];

export class ProposalStrategistAdapter
  implements IAgentAdapter<ProposalStrategistInput, ProposalStrategistOutput>
{
  readonly agentId = "@proposal-strategist";
  readonly name = "Proposal Strategist";
  readonly version = "0.1.0";
  readonly description =
    "Transforms RFPs, competitive intel, and buyer personas into winning proposal " +
    "strategies — win theme development, narrative architecture, executive summary " +
    "crafting, competitive positioning, and risk/reward assessment.";
  readonly readsContextKeys: string[] = DEFAULT_READS;
  readonly writesContextKeys: string[] = DEFAULT_WRITES;

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validates the raw input payload before execution.
   *
   * Rules:
   * - RFP requirements must be non-empty (at least one requirement required).
   * - Buyer personas must be non-empty (at least one persona required).
   * - Deal context must be present and contain buyerOrganization,
   *   decisionTimeline, and knownEvaluationCriteria.
   */
  validate(input: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // ------------------------------------------------------------------
    // rfpRequirements: must be non-empty array
    // ------------------------------------------------------------------
    const rfpReqs = input["rfpRequirements"];
    if (!Array.isArray(rfpReqs) || rfpReqs.length === 0) {
      errors.push({
        field: "rfpRequirements",
        message:
          "rfpRequirements must be a non-empty array. At least one RFP requirement is needed " +
          "for the agent to build a compliance-grounded response outline.",
        severity: "error",
      });
    }

    // Validate individual requirement structure
    if (Array.isArray(rfpReqs) && rfpReqs.length > 0) {
      for (let i = 0; i < rfpReqs.length; i++) {
        const req = rfpReqs[i] as Record<string, unknown>;
        if (!req.id || typeof req.id !== "string") {
          errors.push({
            field: `rfpRequirements[${i}].id`,
            message: `Requirement at index ${i} is missing a string 'id' field.`,
            severity: "error",
          });
        }
        if (!req.description || typeof req.description !== "string") {
          errors.push({
            field: `rfpRequirements[${i}].description`,
            message: `Requirement at index ${i} is missing a string 'description' field.`,
            severity: "error",
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // buyerPersonas: must be non-empty array
    // ------------------------------------------------------------------
    const personas = input["buyerPersonas"];
    if (!Array.isArray(personas) || personas.length === 0) {
      errors.push({
        field: "buyerPersonas",
        message:
          "buyerPersonas must be a non-empty array. At least one buyer persona is required " +
          "for the agent to craft persuasive, audience-specific messaging.",
        severity: "error",
      });
    }

    if (Array.isArray(personas) && personas.length > 0) {
      for (let i = 0; i < personas.length; i++) {
        const p = personas[i] as Record<string, unknown>;
        if (!p.role || typeof p.role !== "string") {
          errors.push({
            field: `buyerPersonas[${i}].role`,
            message: `Persona at index ${i} is missing a string 'role' field.`,
            severity: "error",
          });
        }
        if (!p.primaryConcern || typeof p.primaryConcern !== "string") {
          errors.push({
            field: `buyerPersonas[${i}].primaryConcern`,
            message: `Persona at index ${i} is missing a string 'primaryConcern' field.`,
            severity: "error",
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // dealContext: must be present with required sub-fields
    // ------------------------------------------------------------------
    const dealCtx = input["dealContext"] as Record<string, unknown> | undefined;
    if (!dealCtx || typeof dealCtx !== "object" || Object.keys(dealCtx).length === 0) {
      errors.push({
        field: "dealContext",
        message:
          "dealContext is required and must be a non-empty object containing buyerOrganization, " +
          "decisionTimeline, and knownEvaluationCriteria.",
        severity: "error",
      });
    } else {
      if (!dealCtx.buyerOrganization || typeof dealCtx.buyerOrganization !== "string") {
        errors.push({
          field: "dealContext.buyerOrganization",
          message: "dealContext.buyerOrganization is required and must be a string.",
          severity: "error",
        });
      }
      if (!dealCtx.decisionTimeline || typeof dealCtx.decisionTimeline !== "string") {
        errors.push({
          field: "dealContext.decisionTimeline",
          message: "dealContext.decisionTimeline is required and must be a string (e.g. 'Q3 2026').",
          severity: "error",
        });
      }
      if (
        !Array.isArray(dealCtx.knownEvaluationCriteria) ||
        dealCtx.knownEvaluationCriteria.length === 0
      ) {
        errors.push({
          field: "dealContext.knownEvaluationCriteria",
          message:
            "dealContext.knownEvaluationCriteria must be a non-empty array of criteria strings.",
          severity: "error",
        });
      }
    }

    // ------------------------------------------------------------------
    // competitors: warnings if empty (optional but valuable)
    // ------------------------------------------------------------------
    const competitors = input["competitors"];
    if (!Array.isArray(competitors) || competitors.length === 0) {
      warnings.push({
        field: "competitors",
        message:
          "No competitors provided. The agent will generate positioning with assumed " +
          "competitive context, which may reduce differentiation clarity.",
        severity: "warning",
      });
    }

    // ------------------------------------------------------------------
    // differentiators: warnings if empty
    // ------------------------------------------------------------------
    const diff = input["differentiators"];
    if (!Array.isArray(diff) || diff.length === 0) {
      warnings.push({
        field: "differentiators",
        message:
          "No differentiators provided. The agent will infer differentiators from context, " +
          "but explicit differentiators improve win theme quality.",
        severity: "warning",
      });
    }

    // ------------------------------------------------------------------
    // winThemes: warnings if empty
    // ------------------------------------------------------------------
    const themes = input["winThemes"];
    if (!Array.isArray(themes) || themes.length === 0) {
      warnings.push({
        field: "winThemes",
        message:
          "No candidate win themes provided. The agent will generate themes from scratch, " +
          "which may require more context and produce less refined results.",
        severity: "warning",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings: warnings.map((w) => w.message),
    };
  }

  // ========================================================================
  // Execute
  // ========================================================================

  /**
   * Execute the Proposal Strategist agent.
   *
   * In production, this method:
   *  1. Reads the system prompt template
   *  2. Interpolates input fields + context keys into the prompt
   *  3. Calls the LLM with the constructed prompt
   *  4. Parses the structured output into ProposalStrategistOutput
   *  5. Writes context keys for downstream agents
   *  6. Returns an AgentResult with execution metadata
   */
  async execute(
    input: ProposalStrategistInput,
    context: Record<string, unknown>,
  ): Promise<AgentResult<ProposalStrategistOutput>> {
    const runId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const timestamp = new Date().toISOString();
    const startTime = performance.now();

    try {
      // ---- Resolve context inputs ----
      const trendReport = context["trendReport"] as Record<string, unknown> | undefined;
      const competitiveLandscape = context["competitiveLandscape"] as Record<string, unknown> | undefined;
      const productRoadmap = context["productRoadmap"] as Record<string, unknown> | undefined;

      // ---- Build the output ----
      // In production, this is the parsed LLM response.
      // The stub below returns a structurally complete but empty output
      // that passes the type contract.
      const output: ProposalStrategistOutput = {
        proposalStrategy: {
          thesis: `[Stub] Proposal strategy for ${input.dealContext.buyerOrganization}.`,
          narrativeArc: {
            actI: "[Stub] Act I — Understanding the buyer's challenge.",
            actII: "[Stub] Act II — Solution journey mapped to requirements.",
            actIII: "[Stub] Act III — Transformed state with quantified outcomes.",
          },
          keyMessages: input.winThemes.map((wt) => wt.title),
          pricingStrategy:
            "[Stub] Anchor pricing on cost of inaction before presenting investment.",
        },

        winThemeFinal: input.winThemes.map((wt, i) => ({
          id: `WT-${String(i + 1).padStart(3, "0")}`,
          title: wt.title,
          clientNeed: wt.clientNeed,
          ourDifferentiator: wt.differentiator,
          proofPoint: wt.proofPoint,
          evidenceSource: "Provided in input",
          competitiveContrast: "[Stub] Contrast with expected competitor positioning.",
          integrationPoints: ["Executive Summary", "Technical Approach", "Pricing"],
          validated: true,
        })),

        executiveSummary: {
          situationMirror:
            `[Stub] ${input.dealContext.buyerOrganization} faces [specific challenge] ` +
            `in their [relevant domain].`,
          centralTension:
            "[Stub] The cost of inaction is [quantified amount], yet the risk of a misstep is equally significant.",
          solutionThesis:
            "[Stub] Our approach resolves this tension by [win theme 1] and [win theme 2].",
          proof: "[Stub] [Similar client] achieved [measurable outcome] using the same methodology.",
          transformedState:
            `[Stub] Within 18 months, ${input.dealContext.buyerOrganization} will achieve [quantified future state].`,
          assembledText:
            `[Stub] Executive summary draft for ${input.dealContext.buyerOrganization}. ` +
            `This section will contain the full one-page persuasive narrative.`,
        },

        competitiveMatrix: input.competitors.map((c) => ({
          dimension: c.name,
          ourPosition: "[Stub] Our specific approach or capability.",
          expectedCompetitorPosition: c.expectedPositioning[0] ?? "[Stub] Expected competitor stance.",
          ourAdvantage: "[Stub] Why our approach delivers more value to this buyer.",
          riskLevel: "medium",
        })),

        responseOutline: {
          sections: [
            {
              sectionId: "EXEC",
              title: "Executive Summary",
              rfpReference: "Cover letter / opening",
              narrativeAct: "I",
              primaryTheme: "WT-001",
              keyEvidence: "Win theme proof points",
              estimatedLength: "brief",
            },
            {
              sectionId: "TECH",
              title: "Technical Approach",
              rfpReference: input.rfpRequirements[0]?.id ?? "REQ-001",
              narrativeAct: "II",
              primaryTheme: "WT-001",
              keyEvidence: "Methodology and differentiators",
              estimatedLength: "comprehensive",
            },
            {
              sectionId: "PRICING",
              title: "Pricing Rationale",
              rfpReference: "Pricing requirements",
              narrativeAct: "III",
              primaryTheme: "WT-001",
              keyEvidence: "ROI analysis and value anchoring",
              estimatedLength: "moderate",
            },
          ],
          complianceChecklist: input.rfpRequirements.map((req) => ({
            requirementId: req.id,
            description: req.description,
            responseType: req.responseType,
            compliant: true,
            strategicEnhancement:
              "[Stub] Strategic overlay reinforcing win themes.",
          })),
          pageBudget: {
            "Executive Summary": 1,
            "Technical Approach": 20,
            "Management Plan": 6,
            "Past Performance": 8,
            "Pricing Rationale": 4,
            Appendices: 4,
          },
        },

        riskRewardAssessment: {
          assessedReward: {
            estimatedWinProbability: 60,
            dealValue: input.dealContext.opportunityValue,
            strategicValue:
              "[Stub] Strategic value assessment based on market positioning and reference potential.",
          },
          identifiedRisks: [
            {
              category: "Competitive",
              description:
                "[Stub] Incumbent or well-funded competitor may match positioning or undercut pricing.",
              severity: "medium",
              mitigationStrategy:
                "[Stub] Develop procurement-level TCO comparison; arm champion with contrast data.",
            },
          ],
          overallRiskLevel: "medium",
          recommendation: "pursue-with-caution",
        },
      };

      // ---- Write context keys for downstream agents ----
      context["proposalStrategy"] = output.proposalStrategy;
      context["winTheme"] = output.winThemeFinal;
      context["executiveSummary"] = output.executiveSummary;
      context["competitiveMatrix"] = output.competitiveMatrix;
      context["riskReward"] = output.riskRewardAssessment;

      const durationMs = Math.round(performance.now() - startTime);

      return {
        runId,
        timestamp,
        durationMs,
        output,
        status: "completed",
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const message = err instanceof Error ? err.message : "Unknown execution error";

      return {
        runId,
        timestamp,
        durationMs,
        output: null,
        status: "failed",
        error: message,
      };
    }
  }
}

export default ProposalStrategistAdapter;
