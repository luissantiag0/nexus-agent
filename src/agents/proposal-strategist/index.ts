// ============================================================================
// Nexus Agent Platform — @proposal-strategist Agent Adapter
// ============================================================================
//
// The proposal-strategist agent transforms RFPs and sales opportunities into
// compelling win narratives — developing win themes, competitive positioning,
// and executive summaries that persuade evaluators.
//
// Usage in Agent Registry:
//   import { proposalStrategistAdapter } from "@/agents/proposal-strategist";
//   registry.register(proposalStrategistAdapter);
//
// Usage in pipelines:
//   const result = await registry.execute("proposal-strategist", input);
//
// ============================================================================

// Adapter Interface
export {
  // Re-export types
  type ProposalStrategistInput,
  type ProposalStrategistOutput,
  type ProposalStrategy,
  type WinThemeDraft,
  type WinThemeFinal,
  type ExecutiveSummaryDraft,
  type CompetitivePositioningMatrix,
  type CompetitivePositioningEntry,
  type ResponseOutline,
  type ResponseSection,
  type ComplianceChecklistItem,
  type RiskRewardAssessment,
  type RfpDocument,
  type RfpRequirement,
  type DealQualificationContext,
  type CompetitiveLandscape,
  type CompetitorProfile,
  type StakeholderPersona,
  type BidderContext,
  type PastPerformanceReference,
  type EvaluationCriterion,
  type ProposalStrategistAdapter,
  type ProposalStrategistDryRunResult,
  type ProposalStrategistContextKey,
  // Re-export constants
  PROPOSAL_STRATEGIST_CONTEXT_KEYS,
} from "./proposal-strategist.adapter";

// Validators
export {
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  validateInput,
  validateOutput,
  validateProposalStrategist,
  validateConsistency,
  validateRfpRequirementCoverage,
  validateResponseTypeCompliance,
  validateWinThemeDealAlignment,
  validateWinThemeQuality,
  validateCompetitivePositioning,
} from "./proposal-strategist.validators";

// Execution Flows
export {
  SINGLE_AGENT_FLOW_EXAMPLE,
  CHAINED_FLOW_EXAMPLE,
  MULTI_AGENT_FLOW_EXAMPLE,
} from "./proposal-strategist.flows";

// Registry Types
export type { AgentContext, AgentLifecycleHooks, AgentSlot } from "../registry.types";

// ============================================================================
// Canonical Adapter Instance
// ============================================================================

import type { AgentContext, AgentLifecycleHooks, AgentSlot } from "../registry.types";
import type { ProposalStrategistInput, ProposalStrategistOutput } from "./proposal-strategist.adapter";
import { validateInput, validateOutput } from "./proposal-strategist.validators";

/**
 * Canonical adapter instance ready for Agent Registry registration.
 *
 * In a production runtime, the `execute` method would invoke an LLM with
 * the versioned prompt template (proposal-strategist.v1.prompt.yaml) and
 * the provided input. For now, the adapter exposes the contract shape so
 * the registry can validate, route, and orchestrate without tight coupling
 * to the LLM backend.
 */
export const proposalStrategistAdapter: AgentSlot = {
  agentId: "proposal-strategist",
  name: "Proposal Strategist",
  description:
    "Strategic proposal architect who transforms RFPs and sales opportunities into compelling win narratives. Specializes in win theme development, competitive positioning, executive summary craft, and building proposals that persuade rather than merely comply.",
  version: "1.0.0",
  promptVersion: "proposal-strategist.v1",
  color: "#2563EB",
  emoji: "🏹",
  inputKeys: [
    "rfpDocument",
    "dealQualification",
    "competitiveLandscape",
    "candidateWinThemes",
    "stakeholderPersonas",
    "bidderContext",
    "discoveryNotes",
    "evaluationCriteria",
  ],
  outputKeys: [
    "proposalStrategy",
    "winTheme",
    "executiveSummary",
    "responseOutline",
    "competitiveMatrix",
    "riskReward",
    "complianceChecklist",
  ],

  async execute(
    input: Record<string, unknown>,
    _context: AgentContext,
  ): Promise<Record<string, unknown>> {
    // Type coercion (in production, the registry validates at the gate)
    const typedInput = input as unknown as ProposalStrategistInput;

    // Input validation
    const inputValidation = validateInput(typedInput);
    if (!inputValidation.valid) {
      throw new Error(
        `ProposalStrategist input validation failed:\n${inputValidation.errors
          .map((e) => `  - [${e.code}] ${e.message}`)
          .join("\n")}`,
      );
    }

    // In production, this calls the LLM backend with:
    //   1. The versioned prompt (proposal-strategist.v1.prompt.yaml)
    //   2. The typed input with variables injected
    //   3. The shared AgentContext for inter-agent state
    //
    // For now, this is a stub that returns a typed shell.
    throw new Error(
      "ProposalStrategist.execute() is not implemented in this context. " +
      "In production, this method loads the prompt template from " +
      "proposal-strategist.v1.prompt.yaml, injects the input variables, " +
      "and invokes the configured LLM backend. " +
      "See SINGLE_AGENT_FLOW_EXAMPLE for the expected input/output contract.",
    );
  },

  dryRun(input: Record<string, unknown>): { valid: boolean; validationErrors: string[] } {
    const typedInput = input as unknown as ProposalStrategistInput;
    const validation = validateInput(typedInput);
    return {
      valid: validation.valid,
      validationErrors: validation.errors.map((e) => `[${e.code}] ${e.message}`),
    };
  },
};
