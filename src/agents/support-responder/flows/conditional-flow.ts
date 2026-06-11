// ============================================================================
// Flow: Conditional — Satisfaction-Gated Recovery Routing
// ============================================================================
// Pattern:  Conditional branch based on satisfaction score threshold
// Trigger:  @support-responder predicts low CSAT or customer is unhappy
// Branch A: satisfaction_prediction.predictedScore >= threshold → resolve, close
// Branch B: satisfaction_prediction.predictedScore < threshold → route to
//           @customer-service for recovery (retention, goodwill, win-back)
// ============================================================================

/**
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  FLOW DIAGRAM                                                              │
 * │                                                                            │
 * │  @support-responder                                                         │
 * │   resolves ticket ──► output produced                                       │
 * │                          │                                                  │
 * │                          │                                                  │
 * │                     ┌────▼─────┐                                            │
 * │                     │ ◇ Check │                                            │
 * │                     │ CSAT >= │                                            │
 * │                     │ 3.5?    │                                            │
 * │                     └────┬─────┘                                            │
 * │                          │                                                  │
 * │           ┌──────────────┼──────────────┐                                  │
 * │           │ YES          │              │ NO                               │
 * │           ▼              │              ▼                                  │
 * │   ┌──────────────┐       │   ┌──────────────────┐                          │
 * │   │ Resolve &    │       │   │ Route to         │                          │
 * │   │ Close ticket │       │   │ @customer-service│                          │
 * │   │ Send survey  │       │   │ for recovery     │                          │
 * │   │ Close loop   │       │   │ (retention mode) │                          │
 * │   └──────────────┘       │   └────────┬─────────┘                          │
 * │                          │            │                                    │
 * │                          │            ▼                                    │
 * │                          │   ┌──────────────────┐                          │
 * │                          │   │ @customer-service                         │
 * │                          │   │ • Acknowledge     │                          │
 * │                          │   │ • Retention offer │                          │
 * │                          │   │ • Goodwill gesture│                          │
 * │                          │   │ • Win-back attempt│                          │
 * │                          │   └────────┬─────────┘                          │
 * │                          │            │                                    │
 * │                          │            ▼                                    │
 * │                          │   ┌──────────────────┐                          │
 * │                          │   │ Final resolution │                          │
 * │                          │   │ outcome logged   │                          │
 * │                          │   └──────────────────┘                          │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// Shared input (same for both branches)
// ============================================================================

const baseInput = {
  supportTicket: {
    ticketId: "TKT-63412",
    createdAt: "2026-06-11T08:15:00Z",
    updatedAt: "2026-06-11T08:15:00Z",
    status: "open",
    subject: "Account restricted without warning — lost access to my data",
    body:
      "I tried to log in this morning and my account is restricted. " +
      "I wasn't given any warning or email about this. I have important " +
      "documents saved in my workspace that I need for a client deadline today. " +
      "This is really unprofessional and I'm considering switching to a competitor.",
    channel: "email",
    priority: "high",
    issueCategory: "account",
    tags: ["account-restricted", "access", "data-access", "at-risk"],
    slaDeadline: "2026-06-11T10:15:00Z",
  },
  channel: "email",
  customerContext: {
    customerId: "CUST-3357",
    name: "James Whitfield",
    email: "james.w@designstudio.io",
    accountTier: "premium",
    lifetimeValue: 2400,
    tenureDays: 545,
    previousInteractionCount: 2,
    previousCsatAverage: 3.2,
    openTickets: 1,
    recentTicketIds: ["TKT-62900", "TKT-61880"],
    tags: ["premium", "design", "at-risk"],
    preferredChannel: "email",
    timezone: "America/New_York",
    emotion: {
      sentiment: "angry",
      intensity: 5,
      description:
        "Customer is furious. Account restriction was automated and " +
        "they were not notified. They're threatening to churn. This is a " +
        "retention-critical situation.",
    },
  },
  issueCategory: "account",
  priority: "high",
  brandTone:
    "Apologetic and contrite. Take full ownership of the error (automated " +
    "restriction without notice). Prioritise restoring access above all else. " +
    "Do NOT be defensive. Offer concrete goodwill.",
  slaRequirements: {
    firstResponseMinutes: 120,
    resolutionHours: 8,
    requiredCsatFloor: 3.5,
    escalationAfterMinutes: 60,
  },
};

// ============================================================================
// @support-responder output — predicted satisfaction is LOW
// ============================================================================

const lowCsatOutput = {
  responseDraft:
    "James — I am truly sorry. Restricting your account without any prior " +
    "notice is not the standard we hold ourselves to, and I completely " +
    "understand why you're angry, especially with a client deadline at stake.\n\n" +
    "I've just reactivated your account manually. You should have full access " +
    "to your workspace immediately. Here's what happened:\n\n" +
    "Our automated security system flagged a login attempt from a new device " +
    "and applied a restriction. The system should have sent you an email — " +
    "I've confirmed it did not, which is a bug we are fixing right now.\n\n" +
    "To make this right:\n" +
    "1. ✓ Your account is active — go ahead and access your documents.\n" +
    "2. ✓ I've added two months of premium credit ($60 value) to your account.\n" +
    "3. ✓ Your account has been whitelisted from automated restrictions.\n\n" +
    "I'd also like to set up a quick call with our Customer Success team to " +
    "make sure everything is fully sorted. Would you be open to that?\n\n" +
    "Again, I'm sorry for the disruption. Please let me know if there's " +
    "anything else I can do.",

  resolutionSteps: [
    {
      order: 1,
      action: "Manually reactivate customer account",
      expectedOutcome: "Account restriction removed",
      completed: true,
      estimatedDurationMinutes: 2,
      requiresCustomerAction: false,
    },
    {
      order: 2,
      action: "Investigate why notification email was not sent",
      expectedOutcome: "Bug identified in notification service",
      completed: true,
      estimatedDurationMinutes: 10,
      requiresCustomerAction: false,
    },
    {
      order: 3,
      action: "Apply two-month premium credit as goodwill",
      expectedOutcome: "$60 credit applied to account",
      completed: true,
      estimatedDurationMinutes: 2,
      requiresCustomerAction: false,
    },
    {
      order: 4,
      action: "Whitelist account from future automated restrictions",
      expectedOutcome: "No recurrence risk for this customer",
      completed: true,
      estimatedDurationMinutes: 3,
      requiresCustomerAction: false,
    },
  ],

  // ★ KEY FIELD — triggers the conditional branch
  satisfactionPrediction: {
    predictedScore: 2.8,                // < 3.5 threshold → triggers Branch B
    confidenceLevel: "high",
    riskFactors: [
      "Customer explicitly mentioned switching to a competitor",
      "Previous CSAT average is 3.2 (below baseline)",
      "Incident caused work disruption with client deadline",
      "No notification was sent (system bug) — erodes trust",
    ],
    recommendedIntervention:
      "Immediate retention outreach by Customer Service with in-person " +
      "follow-up. The credit alone is unlikely to restore trust. This " +
      "customer needs a human conversation.",
  },

  followUpSchedule: {
    immediate: [
      {
        type: "resolution_confirmation",
        scheduledFor: "2026-06-11T08:30:00Z",
        channel: "email",
        notes: "Confirmation that account is active and credit is applied",
      },
    ],
    shortTerm: [
      {
        type: "additional_assistance",
        scheduledFor: "2026-06-11T14:00:00Z",
        channel: "phone",
        notes:
          "Customer Success call to discuss the incident and ensure " +
          "full recovery. James expressed openness to a call.",
      },
    ],
    longTerm: [
      {
        type: "feedback_collection",
        scheduledFor: "2026-06-25T10:00:00Z",
        channel: "email",
        templateId: "retention-followup-v2",
        notes: "Check customer sentiment after the incident has cooled.",
      },
    ],
  },

  escalationDecision: {
    requiresEscalation: true,
    escalateTo: "customer-service",
    reason:
      "Customer satisfaction is critically low (2.8). Customer explicitly " +
      "threatened churn. Requires retention-focused human intervention " +
      "beyond what a support response can provide.",
    urgency: "urgent",
    contextSummary:
      "James Whitfield (premium, 18 months) had his account restricted by " +
      "an automated system without notification. Account reactivated, credit " +
      "applied, but CSAT predicted at 2.8/5.0. Customer mentioned switching " +
      "to competitor. Needs retention outreach and goodwill recovery.",
  },

  interactionSummary: {
    resolvedAt: "2026-06-11T08:28:00Z",
    resolutionTimeMinutes: 13,
    firstContactResolution: true,
    slaCompliant: true,
    customerAcknowledgement: "confirmed",
  },
};

// ============================================================================
// Conditional Branch Evaluation (Orchestrator Decision Gate)
// ============================================================================

/**
 * The orchestrator evaluates the condition AFTER @support-responder returns:
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  condition: output.satisfactionPrediction.predictedScore >= 3.5     │
 * │                                                                      │
 * │  RESULT: false (2.8 < 3.5)                                          │
 * │  → TRIGGER: conditional route to @customer-service for recovery      │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// The orchestrator constructs the following handoff to @customer-service:

interface CustomerServiceRecoveryInput {
  reason: "low_satisfaction" | "retention_risk" | "churn_threat";
  supportResponderContext: {
    ticketId: string;
    resolutionSteps: number;
    predictedScore: number;
    riskFactors: string[];
    recommendedIntervention: string;
  };
  customerDetails: {
    name: string;
    accountTier: string;
    lifetimeValue: number;
    emotion: string;
  };
  recoveryObjective:
    | "retention_call"
    | "goodwill_escalation"
    | "win_back_offer"
    | "csat_recovery";
}

const recoveryHandoff: CustomerServiceRecoveryInput = {
  reason: "churn_threat",
  supportResponderContext: {
    ticketId: "TKT-63412",
    resolutionSteps: 4,
    predictedScore: 2.8,
    riskFactors: lowCsatOutput.satisfactionPrediction.riskFactors,
    recommendedIntervention:
      lowCsatOutput.satisfactionPrediction.recommendedIntervention,
  },
  customerDetails: {
    name: "James Whitfield",
    accountTier: "premium",
    lifetimeValue: 2400,
    emotion: "angry -> appeased but not recovered",
  },
  recoveryObjective: "retention_call",
};

// ============================================================================
// Orchestrator Recovery Flow
// ============================================================================

/**
 * The orchestrator then:
 *
 * 1. Halts auto-close on ticket TKT-63412.
 * 2. Creates a recovery handoff payload from @support-responder's context.
 * 3. Invokes @customer-service with the recovery input (retention mode).
 * 4. @customer-service executes the recovery workflow:
 *    - Personal retention call with James (within 4 hours)
 *    - Offers additional goodwill if needed (e.g. 3 months credit)
 *    - Sets up a CSAT re-survey for 7 days post-recovery
 * 5. After recovery completes, orchestrator:
 *    - Updates context: customerSatisfactionScore → (reassessed)
 *    - If recovery successful: close ticket with updated score
 *    - If recovery fails: escalate to account management
 *
 * State transitions:
 *   Pre:   supportTicket.status === "resolved"
 *          customerSatisfactionScore === 2.8
 *   Gate:  score < threshold → recovery branch
 *   Mid:   customerSatisfactionScore → (pending reassessment)
 *   Post:  customerSatisfactionScore === 4.0+ (success)   OR
 *          escalated to account management (failure)
 */

// ============================================================================
// Branch A: Happy path (for reference — when CSAT is acceptable)
// ============================================================================

const highCsatOutput = {
  ...lowCsatOutput,
  satisfactionPrediction: {
    predictedScore: 4.5,
    confidenceLevel: "high",
    riskFactors: [],
  },
  escalationDecision: {
    requiresEscalation: false,
    urgency: "routine",
    contextSummary: "Resolved at Tier 1 with strong satisfaction outlook.",
  },
};

/**
 * When predictedScore >= 3.5:
 * → Orchestrator takes Branch A
 * → Resolves ticket normally
 * → Enqueues follow-up actions from followUpSchedule
 * → Dispatches KB suggestion (if any)
 * → Logs success metric to analytics
 */
