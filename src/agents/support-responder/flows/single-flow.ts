// ============================================================================
// Flow: Single — Standalone Support Ticket Resolution
// ============================================================================
// Pattern:  Single agent invocation
// Trigger:  Customer submits support ticket via live chat
// Channel:  live_chat
// Priority: high (billing issue, premium customer)
// Outcome:  First-contact resolution with follow-up schedule
// ============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  FLOW DIAGRAM                                                          │
 * │                                                                         │
 * │  Customer                          Orchestrator          @support-     │
 * │   submits                            resolves             responder     │
 * │   chat ticket ───►   validate input ───►   invoke LLM ───►   generate   │
 * │                      │                  │    with v1     │   response   │
 * │                      │  ✓ schema       │    prompt       │   plan       │
 * │                      │  ✓ SLA check    │                 │   predict    │
 * │                      │  ✓ routing      │                 │   schedule   │
 * │                      │                 │                 │              │
 * │                      │                 ◄─────────────────              │
 * │                      │  write context                                   │
 * │                      │  {supportTicket, resolutionPlan,                 │
 * │                      │   customerSatisfactionScore,                     │
 * │                      │   followUpSchedule}                              │
 * │                      │                                                  │
 * │  ◄── response ──────│── delivered via chat                             │
 * │                      │                                                  │
 * │  24h later:          │                                                  │
 * │  ◄── survey ────────│── follow-up triggered                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// Input (what the orchestrator sends)
// ============================================================================

const input = {
  supportTicket: {
    ticketId: "TKT-56789",
    createdAt: "2026-06-11T09:23:00Z",
    updatedAt: "2026-06-11T09:23:00Z",
    status: "open",
    subject: "Double charge on my premium plan invoice",
    body: "Hi, I was charged $99 twice this month for my premium account. " +
          "My invoice #INV-2026-0610 shows two identical charges. " +
          "Please help resolve this. I've been a customer for 3 years.",
    channel: "live_chat",
    priority: "high",
    issueCategory: "billing",
    tags: ["billing", "double_charge", "premium"],
    slaDeadline: "2026-06-11T09:53:00Z",
  },
  channel: "live_chat",
  customerContext: {
    customerId: "CUST-4421",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    accountTier: "premium",
    lifetimeValue: 3580,
    tenureDays: 1095,
    previousInteractionCount: 4,
    previousCsatAverage: 4.8,
    openTickets: 1,
    recentTicketIds: ["TKT-56001", "TKT-55200", "TKT-54890"],
    tags: ["premium", "long_term", "advocate"],
    preferredChannel: "live_chat",
    timezone: "America/Los_Angeles",
    emotion: {
      sentiment: "frustrated",
      intensity: 3,
      description: "Customer is frustrated about billing error but remains polite",
    },
  },
  issueCategory: "billing",
  priority: "high",
  brandTone: "Professional yet warm. Respect the customer's tenure. " +
             "Use confident, reassuring language. Avoid defensiveness about billing.",
  slaRequirements: {
    firstResponseMinutes: 0.5,    // chat: 30-second SLA
    resolutionHours: 4,           // high-priority billing
    requiredCsatFloor: 3.5,
    escalationAfterMinutes: 15,   // auto-escalate if not resolved in 15 min
  },
};

// ============================================================================
// Output (what the agent returns)
// ============================================================================

const output = {
  responseDraft:
    "Hi Sarah — thanks for reaching out, and I'm really sorry about the confusion " +
    "with the double charge on your premium plan. That's absolutely not the " +
    "experience we want for a loyal customer like you.\n\n" +
    "I've looked into your account and confirmed that the second charge of $99 " +
    "on invoice #INV-2026-0610 was processed in error. Here's what I'm doing right now:\n\n" +
    "1. **Refund initiated** — $99 has been credited back to your original payment method.\n" +
    "2. **You'll see it in 3–5 business days** depending on your bank.\n" +
    "3. **I've also added a one-month premium credit** ($99) to your account as an apology.\n\n" +
    "You should see the credit reflected in your billing page within the hour.\n\n" +
    "Is there anything else I can help you with today?",

  resolutionSteps: [
    {
      order: 1,
      action: "Identify duplicate charges on invoice #INV-2026-0610",
      expectedOutcome: "Confirm that two $99 charges exist",
      completed: true,
      estimatedDurationMinutes: 2,
      requiresCustomerAction: false,
    },
    {
      order: 2,
      action: "Initiate refund for duplicate $99 charge",
      expectedOutcome: "Refund ticket created in billing system",
      completed: true,
      estimatedDurationMinutes: 3,
      requiresCustomerAction: false,
    },
    {
      order: 3,
      action: "Apply one-month premium credit as goodwill gesture",
      expectedOutcome: "$99 credit added to account",
      completed: true,
      estimatedDurationMinutes: 2,
      requiresCustomerAction: false,
    },
    {
      order: 4,
      action: "Notify customer of resolution and credit timeline",
      expectedOutcome: "Sarah confirms satisfaction",
      completed: false,
      estimatedDurationMinutes: 1,
      requiresCustomerAction: true,
    },
  ],

  satisfactionPrediction: {
    predictedScore: 4.7,
    confidenceLevel: "high",
    riskFactors: [
      "Refund timing depends on bank processing (3–5 days)",
    ],
    recommendedIntervention: "Proactive check-in on day 3 if refund not yet visible",
  },

  followUpSchedule: {
    immediate: [
      {
        type: "resolution_confirmation",
        scheduledFor: "2026-06-11T10:00:00Z",
        channel: "in_app_messaging",
        notes: "Follow-up message confirming refund and credit are processing",
      },
    ],
    shortTerm: [
      {
        type: "proactive_checkin",
        scheduledFor: "2026-06-14T10:00:00Z",
        channel: "email",
        notes: "Check if refund has appeared in Sarah's account. Offer further assistance if not.",
      },
    ],
    longTerm: [
      {
        type: "satisfaction_survey",
        scheduledFor: "2026-06-18T10:00:00Z",
        channel: "email",
        templateId: "post-resolution-csat-v2",
        notes: "Send CSAT survey after resolution is fully settled",
      },
    ],
  },

  escalationDecision: {
    requiresEscalation: false,
    urgency: "routine",
    contextSummary:
      "Billing issue resolved at Tier 1. Refund initiated and goodwill credit applied. " +
      "No escalation needed.",
  },

  knowledgeBaseSuggestion: {
    action: "update",
    articleTitle: "How billing credits and refunds are processed",
    category: "billing",
    tags: ["refund", "credit", "billing", "premium"],
    contentSummary:
      "Add section covering double-charge handling: detection, refund workflow, " +
      "goodwill credit policy, and expected timelines.",
    relatedTicketIds: ["TKT-56789", "TKT-56001"],
    priority: "medium",
  },

  interactionSummary: {
    resolvedAt: "2026-06-11T09:32:00Z",
    resolutionTimeMinutes: 9,
    firstContactResolution: true,
    slaCompliant: true,
    customerAcknowledgement: "confirmed",
  },
};

// ============================================================================
// Orchestrator Decision Table
// ============================================================================

/**
 * After output validation, the orchestrator:
 *
 * | Condition                                    | Action                              |
 * |----------------------------------------------|-------------------------------------|
 * | output.interactionSummary.slaCompliant === true | Log SLA pass, no action needed     |
 * | output.escalationDecision.requiresEscalation  | Route to tier2_technical            |
 * | output.knowledgeBaseSuggestion is present     | Dispatch KB creation/update job     |
 * | followUpSchedule actions exist                | Enqueue follow-up tasks in scheduler|
 * | satisfactionPrediction.predictedScore < 3.5   | Triggers conditional recovery flow  |
 */
