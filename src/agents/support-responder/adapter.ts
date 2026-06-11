// ============================================================================
// Nexus Agent Platform — Agent Registry Adapter
// Agent: @support-responder
// Interface Version: 1.0.0
// Description: Multi-channel customer support specialist delivering
//              empathetic, SLA-compliant issue resolution, proactive care,
//              and positive brand experiences across all touchpoints.
// Dependencies: @customer-service (triage), @support-analytics-reporter (metrics)
// ============================================================================

import type { AgentContext, AgentLifecycleHooks } from "../registry.types";

// ---------------------------------------------------------------------------
// Enums & Literal Unions
// ---------------------------------------------------------------------------

export type SupportChannel =
  | "email"
  | "live_chat"
  | "phone"
  | "social_media"
  | "in_app_messaging";

export type PriorityLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type IssueCategory =
  | "technical"
  | "billing"
  | "account"
  | "feature_request"
  | "general_inquiry"
  | "complaint"
  | "retention"
  | "security";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_customer"
  | "resolved"
  | "closed"
  | "escalated";

export interface CustomerEmotion {
  readonly sentiment: "frustrated" | "confused" | "neutral" | "satisfied" | "angry" | "anxious";
  readonly intensity: 1 | 2 | 3 | 4 | 5;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// AgentInput Schema — what @support-responder receives
// ---------------------------------------------------------------------------

export interface SupportTicket {
  /** Unique ticket identifier */
  readonly ticketId: string;
  /** ISO 8601 creation timestamp */
  readonly createdAt: string;
  /** ISO 8601 last-updated timestamp */
  readonly updatedAt: string;
  /** Current lifecycle status */
  readonly status: TicketStatus;
  /** Customer-facing subject line */
  readonly subject: string;
  /** Full customer message body */
  readonly body: string;
  /** Files attached to the ticket */
  readonly attachments?: Array<{ filename: string; url: string; mimeType: string }>;
  /** Originating communication channel */
  readonly channel: SupportChannel;
  /** Calculated priority */
  readonly priority: PriorityLevel;
  /** Normalised issue category (from triage) */
  readonly issueCategory: IssueCategory;
  /** Classification tags */
  readonly tags: string[];
  /** ISO 8601 deadline for SLA compliance */
  readonly slaDeadline: string;
  /** Upstream agent that escalated this ticket, if any */
  readonly escalatedFrom?: string;
  /** Why the upstream agent escalated */
  readonly escalationReason?: string;
}

export interface CustomerContext {
  readonly customerId: string;
  readonly name: string;
  readonly email: string;
  readonly accountTier: "free" | "premium" | "enterprise";
  readonly lifetimeValue?: number;
  readonly tenureDays: number;
  readonly previousInteractionCount: number;
  readonly previousCsatAverage?: number;             // 1–5 scale
  readonly openTickets: number;
  readonly recentTicketIds: string[];
  readonly tags: string[];                           // e.g. "vip", "at_risk"
  readonly preferredChannel?: SupportChannel;
  readonly timezone: string;
  readonly emotion?: CustomerEmotion;
}

export interface EscalationFlag {
  readonly escalatedBy: string;                      // upstream agent id
  readonly escalatedAt: string;                      // ISO 8601
  readonly escalationReason: string;
  readonly targetTier: "tier2_technical" | "tier3_specialist" | "management" | "engineering";
  readonly additionalContext: Record<string, unknown>;
}

export interface SlaRequirements {
  readonly firstResponseMinutes: number;
  readonly resolutionHours: number;
  readonly requiredCsatFloor: number;                // 1–5, minimum acceptable
  readonly escalationAfterMinutes: number;
}

/**
 * Complete input contract for @support-responder.
 *
 * Filled by the orchestrator from the incoming support ticket, enriched
 * customer profile, @customer-service triage output, and SLA engine.
 */
export interface SupportResponderInput {
  /** The support ticket / query to resolve */
  readonly supportTicket: SupportTicket;

  /** Communication channel (may differ from ticket.channel if re-routed) */
  readonly channel: SupportChannel;

  /** Enriched customer profile & interaction history */
  readonly customerContext: CustomerContext;

  /** Normalised issue category (from @customer-service triage) */
  readonly issueCategory: IssueCategory;

  /** Calculated priority (from @customer-service or SLA engine) */
  readonly priority: PriorityLevel;

  /** Present when escalated from an upstream agent (e.g. @customer-service) */
  readonly escalationFlag?: EscalationFlag;

  /** Brand tone / voice instructions injected by the orchestrator */
  readonly brandTone?: string;

  /** SLA parameters for response-time and resolution-time targets */
  readonly slaRequirements?: SlaRequirements;
}

// ---------------------------------------------------------------------------
// AgentOutput Schema — what @support-responder produces
// ---------------------------------------------------------------------------

export interface ResolutionStep {
  readonly order: number;
  readonly action: string;
  readonly expectedOutcome: string;
  readonly completed: boolean;
  readonly estimatedDurationMinutes?: number;
  readonly requiresCustomerAction: boolean;
}

export interface SatisfactionPrediction {
  readonly predictedScore: number;                   // 1.0 – 5.0
  readonly confidenceLevel: "low" | "medium" | "high";
  readonly riskFactors: string[];
  readonly recommendedIntervention?: string;
}

export interface FollowUpAction {
  readonly type:
    | "satisfaction_survey"
    | "resolution_confirmation"
    | "additional_assistance"
    | "proactive_checkin"
    | "upsell_opportunity"
    | "feedback_collection";
  readonly scheduledFor: string;                     // ISO 8601
  readonly channel: SupportChannel;
  readonly templateId?: string;
  readonly notes: string;
}

export interface FollowUpSchedule {
  readonly immediate: FollowUpAction[];              // within 24h
  readonly shortTerm: FollowUpAction[];              // 2–7 days
  readonly longTerm: FollowUpAction[];               // 7–30 days
}

export interface EscalationDecision {
  readonly requiresEscalation: boolean;
  readonly escalateTo?: string;                      // agent-id or team name
  readonly reason?: string;
  readonly urgency: "routine" | "urgent" | "immediate";
  readonly contextSummary: string;
}

export interface KnowledgeBaseSuggestion {
  readonly action: "create" | "update" | "link_existing";
  readonly articleTitle: string;
  readonly category: string;
  readonly tags: string[];
  readonly contentSummary: string;
  readonly relatedTicketIds: string[];
  readonly priority: "low" | "medium" | "high";
}

export interface InteractionSummary {
  readonly resolvedAt?: string;                      // ISO 8601
  readonly resolutionTimeMinutes: number;
  readonly firstContactResolution: boolean;
  readonly slaCompliant: boolean;
  readonly customerAcknowledgement: "confirmed" | "pending" | "unreachable";
}

/**
 * Complete output contract from @support-responder.
 *
 * Contains the drafted response, resolution plan, satisfaction forecast,
 * post-resolution follow-up schedule, escalation decision, and any
 * knowledge-base contribution suggestions.
 */
export interface SupportResponderOutput {
  /** The drafted response body (tone- and channel-appropriate) */
  readonly responseDraft: string;

  /** Step-by-step resolution plan */
  readonly resolutionSteps: ResolutionStep[];

  /** Predicted customer satisfaction score and risk analysis */
  readonly satisfactionPrediction: SatisfactionPrediction;

  /** Post-resolution customer engagement schedule (3-tier timeline) */
  readonly followUpSchedule: FollowUpSchedule;

  /** Whether and where to escalate the ticket */
  readonly escalationDecision: EscalationDecision;

  /** Knowledge base contribution suggestion (if applicable) */
  readonly knowledgeBaseSuggestion?: KnowledgeBaseSuggestion;

  /** Resolution summary for downstream consumers and analytics */
  readonly interactionSummary: InteractionSummary;
}

// ---------------------------------------------------------------------------
// AgentContext Keys
// ---------------------------------------------------------------------------

/**
 * Context keys that the @support-responder agent reads from and writes to
 * in the shared AgentContext store during execution.
 *
 * Downstream agents (e.g. @customer-service for recovery, @analytics-reporter
 * for metrics) can read these keys to access resolution context without
 * re-executing the agent.
 */
export const SUPPORT_RESPONDER_CONTEXT_KEYS = {
  /** The original SupportTicket being handled */
  SUPPORT_TICKET: "supportTicket",
  /** Structured resolution plan (steps, completion progress, status) */
  RESOLUTION_PLAN: "resolutionPlan",
  /** Running customer satisfaction score (1.0–5.0) */
  CUSTOMER_SATISFACTION_SCORE: "customerSatisfactionScore",
  /** Post-resolution follow-up schedule */
  FOLLOW_UP_SCHEDULE: "followUpSchedule",
  /** Knowledge base article reference (if a KB write was performed) */
  KNOWLEDGE_BASE_REF: "knowledgeBaseRef",
} as const;

export type SupportResponderContextKey =
  (typeof SUPPORT_RESPONDER_CONTEXT_KEYS)[keyof typeof SUPPORT_RESPONDER_CONTEXT_KEYS];

// ---------------------------------------------------------------------------
// Dry-Run Result
// ---------------------------------------------------------------------------

export interface SupportResponderDryRunResult {
  valid: boolean;
  validationErrors: string[];
  estimatedOutputKeys: string[];
  estimatedSatisfactionRange: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Adapter Registration Interface
// ---------------------------------------------------------------------------

/**
 * The Agent Adapter that the Nexus Agent Registry uses to register and invoke
 * the @support-responder agent.
 *
 * Implement this interface to integrate the support-responder into the
 * Agent Registry runtime.
 */
export interface SupportResponderAdapter {
  /** Canonical agent identifier */
  readonly agentId: "support-responder";
  /** Human-readable agent name */
  readonly name: string;
  /** Semantic version of this adapter */
  readonly version: string;
  /** Prompt version identifier (resolves to prompts/support-responder.v*.yaml) */
  readonly promptVersion: string;

  /** Reference type for the input schema */
  readonly inputSchema: SupportResponderInput;
  /** Reference type for the output schema */
  readonly outputSchema: SupportResponderOutput;

  /** Lifecycle hooks for the Agent Registry runtime */
  readonly hooks: AgentLifecycleHooks<SupportResponderInput, SupportResponderOutput>;

  /**
   * Execute the agent with the given input and context.
   * Called by the Agent Registry runtime.
   *
   * The runtime will:
   * 1. Resolve the prompt template (promptVersion → YAML file)
   * 2. Template variables from input + context
   * 3. Invoke the LLM
   * 4. Parse structured JSON output
   * 5. Call validateOutput hook
   * 6. Write context keys to shared store
   */
  execute(
    input: SupportResponderInput,
    context: AgentContext,
  ): Promise<SupportResponderOutput>;

  /**
   * Dry-run the agent: validate input shape, estimate output structure,
   * and check for obvious issues — without actual LLM invocation.
   */
  dryRun(input: SupportResponderInput): SupportResponderDryRunResult;
}

// ---------------------------------------------------------------------------
// Default Hooks Implementation
// ---------------------------------------------------------------------------

/**
 * Pre-built lifecycle hooks that can be used directly or overridden.
 * These implement the standard validation and instrumentation logic
 * expected by the Agent Registry for the @support-responder agent.
 */
export const SUPPORT_RESPONDER_DEFAULT_HOOKS: AgentLifecycleHooks<
  SupportResponderInput,
  SupportResponderOutput
> = {
  validateInput(input: SupportResponderInput): string[] {
    const errors: string[] = [];

    if (!input.supportTicket?.ticketId) {
      errors.push("supportTicket.ticketId is required");
    }
    if (!input.supportTicket?.body?.trim()) {
      errors.push("supportTicket.body is required");
    }
    if (!input.customerContext?.customerId) {
      errors.push("customerContext.customerId is required");
    }
    if (!["email", "live_chat", "phone", "social_media", "in_app_messaging"].includes(input.channel)) {
      errors.push(`channel must be one of: email, live_chat, phone, social_media, in_app_messaging`);
    }

    return errors;
  },

  validateOutput(output: SupportResponderOutput): string[] {
    const errors: string[] = [];

    if (!output.responseDraft?.trim()) {
      errors.push("responseDraft is required and must be non-empty");
    }
    if (!Array.isArray(output.resolutionSteps) || output.resolutionSteps.length === 0) {
      errors.push("resolutionSteps must contain at least one step");
    }
    if (output.satisfactionPrediction?.predictedScore == null) {
      errors.push("satisfactionPrediction.predictedScore is required");
    } else if (output.satisfactionPrediction.predictedScore < 1 || output.satisfactionPrediction.predictedScore > 5) {
      errors.push("satisfactionPrediction.predictedScore must be between 1.0 and 5.0");
    }
    if (!output.followUpSchedule) {
      errors.push("followUpSchedule is required");
    }
    if (output.escalationDecision?.requiresEscalation && !output.escalationDecision.escalateTo) {
      errors.push("escalationDecision.escalateTo is required when requiresEscalation is true");
    }

    return errors;
  },

  onBeforeExecute(input: SupportResponderInput): void {
    console.log(
      `[support-responder] Executing ticket ${input.supportTicket.ticketId} ` +
      `(priority: ${input.priority}, channel: ${input.channel})`,
    );
  },

  onAfterExecute(_output: SupportResponderOutput, context: AgentContext): void {
    console.log(`[support-responder] Execution complete. Context keys updated: ${Object.keys(context).join(", ")}`);
  },

  onError(error: Error, input: SupportResponderInput): void {
    console.error(
      `[support-responder] Error processing ticket ${input.supportTicket.ticketId}: ${error.message}`,
    );
  },
};
