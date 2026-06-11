// ============================================================================
// Flow: Chain — Customer Service Triage → Support Responder Resolution
// ============================================================================
// Pattern:  2-agent sequential pipeline
// Trigger:  Customer submits a complex technical support ticket via email
// Agent 1:  @customer-service — triage, category detection, priority assignment
// Agent 2:  @support-responder — detailed resolution, response, follow-up
// Outcome:  Full lifecycle from intake to resolution with context carry-over
// ============================================================================

/**
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  FLOW DIAGRAM                                                              │
 * │                                                                            │
 * │ Customer        @customer-service     Orchestrator       @support-responder │
 * │  submits  ──►     triage ticket        resolves input     generate          │
 * │  email           categorize issue      chain context      resolution        │
 * │                  detect priority       validate          response draft     │
 * │                  assess emotion        handoff           resolution plan    │
 * │                       │                                   satisfaction      │
 * │                       │  output:                          prediction        │
 * │                       │  {category, priority,             follow-up         │
 * │                       │   emotion, escalationFlag}        escalation        │
 * │                       │                                   KB suggestion     │
 * │                       │                                   interaction       │
 * │                       ▼                                   summary           │
 * │                  Orchestrator bridges context ────────►                     │
 * │                  • enriches AgentInput with                                │
 * │                    customer-service output                                 │
 * │                  • passes supportTicket unchanged                          │
 * │                  • sets escalationFlag if triaged as urgent                │
 * │                                                                            │
 * │  ◄──── response ─────────────────────────────────────────────────────      │
 * │                                                                            │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// Step 1 — @customer-service triages the incoming ticket
// ============================================================================

interface CustomerServiceOutput {
  triageCategory: string;
  priority: "low" | "medium" | "high" | "critical";
  customerEmotion: { sentiment: string; intensity: number };
  escalationRecommendation: "tier1" | "tier2" | "tier3";
  routingSuggestion: string;
  triageNotes: string;
}

const customerServiceResult: CustomerServiceOutput = {
  triageCategory: "technical",
  priority: "high",
  customerEmotion: { sentiment: "frustrated", intensity: 4 },
  escalationRecommendation: "tier2",
  routingSuggestion: "Route to support-responder with technical escalation context",
  triageNotes:
    "Customer reports that the API integration stopped working after last night's " +
    "deploy. This is an enterprise customer experiencing production downtime. " +
    "Emotion is elevated but not hostile. Needs technical resolution with urgency.",
};

// ============================================================================
// Step 2 — Orchestrator bridges @customer-service output into
//          @support-responder AgentInput (enriched context)
// ============================================================================

const bridgedInput = {
  // Passed through: original ticket (unchanged)
  supportTicket: {
    ticketId: "TKT-77201",
    createdAt: "2026-06-11T14:02:00Z",
    updatedAt: "2026-06-11T14:02:00Z",
    status: "open",
    subject: "API integration broken after 2026-06-10 deploy",
    body:
      "Our production API calls to your platform started failing at " +
      "approximately 02:00 UTC on June 11. We are receiving HTTP 503 errors " +
      "on all authenticated endpoints. Our integration uses OAuth 2.0 with " +
      "client credentials flow. This is blocking our checkout process and " +
      "costing us revenue. Please provide an immediate fix.",
    channel: "email",
    priority: "high",                        // originally set; may be overridden
    issueCategory: "general_inquiry",         // originally generic
    tags: ["api", "production-down", "enterprise", "oauth"],
    slaDeadline: "2026-06-11T16:02:00Z",
  },

  // Bridged from customer-service triage
  channel: "email",                            // preserved from original
  customerContext: {
    customerId: "CUST-8912-ENTERPRISE",
    name: "Marcus Okonkwo",
    email: "marcus.okonkwo@acmecorp.com",
    accountTier: "enterprise",
    lifetimeValue: 120000,
    tenureDays: 730,
    previousInteractionCount: 12,
    previousCsatAverage: 4.2,
    openTickets: 2,
    recentTicketIds: ["TKT-77001", "TKT-75900"],
    tags: ["enterprise", "api-integration", "vip"],
    preferredChannel: "email",
    timezone: "Europe/London",
    emotion: {
      sentiment: "frustrated",
      intensity: 4,
      description:
        "Enterprise customer in production-down scenario. Revenue loss. " +
        "Requires urgent reassurance and clear ETA.",
    },
  },

  // Overridden by customer-service triage output
  issueCategory: "technical",                  // was "general_inquiry"
  priority: "critical",                        // upgraded from "high"

  // Escalation flag set by triage (escalationRecommendation was tier2)
  escalationFlag: {
    escalatedBy: "customer-service",
    escalatedAt: "2026-06-11T14:08:00Z",
    escalationReason:
      "Production-down scenario for enterprise customer. API integration " +
      "failure post-deploy. Requires technical troubleshooting with " +
      "engineering awareness.",
    targetTier: "tier2_technical",
    additionalContext: {
      triageNotes: customerServiceResult.triageNotes,
      deployWindow: "2026-06-10 23:00–02:00 UTC",
      affectedEndpoints: ["/api/v2/orders", "/api/v2/checkout"],
    },
  },

  brandTone:
    "Enterprise-grade: confident, technically precise, transparent about ETAs. " +
    "Acknowledge the severity and revenue impact. No vague promises — give " +
    "specific timelines or state what needs to be investigated. Use the " +
    "customer's name and reference their integration explicitly.",

  slaRequirements: {
    firstResponseMinutes: 60,          // enterprise SLA
    resolutionHours: 4,                // critical priority
    requiredCsatFloor: 4.0,            // enterprise CSAT target
    escalationAfterMinutes: 30,        // fast escalator for enterprise
  },
};

// ============================================================================
// Step 3 — @support-responder processes with escalation context
// ============================================================================

const chainOutput = {
  responseDraft:
    "Hi Marcus,\n\n" +
    "Thank you for immediately flagging this. I understand that a production " +
    "API outage is critical for your checkout flow, and I want to assure you " +
    "that we're treating this with the highest priority.\n\n" +
    "**Current Status:**\n" +
    "I've confirmed that the 503 errors on `/api/v2/orders` and `/api/v2/checkout` " +
    "are related to a dependency update that shipped in last night's deploy " +
    "(window: 2026-06-10 23:00–02:00 UTC). Our engineering team has identified " +
    "the root cause — a breaking change in the rate-limiting middleware — and " +
    "a fix is being rolled out now.\n\n" +
    "**Expected Resolution:**\n" +
    "- Fix deploy: 2026-06-11 15:30 UTC (within 90 minutes)\n" +
    "- Full recovery validation: 2026-06-11 16:00 UTC\n\n" +
    "**In the meantime:**\n" +
    "Your OAuth 2.0 client credentials flow itself is not affected — the issue " +
    "is at the gateway layer post-authentication. Tokens issued before the " +
    "deploy window remain valid. You do not need to rotate credentials.\n\n" +
    "I will personally monitor the rollout and send you a confirmation as soon " +
    "as the fix is verified in production. If you experience any further issues, " +
    "please reply directly to this email and I'll be on it immediately.\n\n" +
    "Best regards,\n" +
    "Support Responder | Nexus Agent Platform",

  resolutionSteps: [
    {
      order: 1,
      action: "Verify 503 error pattern across all authenticated endpoints",
      expectedOutcome: "Confirm scope of outage (orders + checkout)",
      completed: true,
      estimatedDurationMinutes: 5,
      requiresCustomerAction: false,
    },
    {
      order: 2,
      action: "Escalate to engineering with deploy window and endpoint details",
      expectedOutcome: "Engineering team engaged, root cause identified",
      completed: true,
      estimatedDurationMinutes: 5,
      requiresCustomerAction: false,
    },
    {
      order: 3,
      action: "Communicate ETA to customer with transparent status",
      expectedOutcome: "Customer receives first-response within 60-min SLA",
      completed: true,
      estimatedDurationMinutes: 5,
      requiresCustomerAction: false,
    },
    {
      order: 4,
      action: "Deploy rate-limiting middleware fix",
      expectedOutcome: "Fix rolled out to production",
      completed: false,
      estimatedDurationMinutes: 90,
      requiresCustomerAction: false,
    },
    {
      order: 5,
      action: "Verify API recovery and notify customer",
      expectedOutcome: "All endpoints responding 200; customer confirmed",
      completed: false,
      estimatedDurationMinutes: 30,
      requiresCustomerAction: true,
    },
  ],

  satisfactionPrediction: {
    predictedScore: 3.8,
    confidenceLevel: "medium",
    riskFactors: [
      "Outage duration exceeds customer's acceptable window",
      "Enterprise customer with revenue impact",
      "Fix requires engineering deploy (external dependency)",
    ],
    recommendedIntervention:
      "Post-resolution account review call with Customer Success Manager " +
      "to discuss SLA credits and prevention measures.",
  },

  followUpSchedule: {
    immediate: [
      {
        type: "resolution_confirmation",
        scheduledFor: "2026-06-11T16:00:00Z",
        channel: "email",
        notes: "Confirm fix verification with endpoint health check results",
      },
      {
        type: "additional_assistance",
        scheduledFor: "2026-06-11T16:30:00Z",
        channel: "email",
        notes: "Offer post-mortem summary and prevention plan",
      },
    ],
    shortTerm: [
      {
        type: "proactive_checkin",
        scheduledFor: "2026-06-13T10:00:00Z",
        channel: "email",
        notes: "Check that no residual issues have appeared after the fix",
      },
      {
        type: "feedback_collection",
        scheduledFor: "2026-06-14T14:00:00Z",
        channel: "phone",
        notes: "Enterprise account review call — discuss incident handling",
      },
    ],
    longTerm: [
      {
        type: "upsell_opportunity",
        scheduledFor: "2026-06-25T10:00:00Z",
        channel: "email",
        notes:
          "Based on this incident, suggest API reliability add-on " +
          "(redundant gateway, SLA-backed uptime guarantee).",
      },
    ],
  },

  escalationDecision: {
    requiresEscalation: true,
    escalateTo: "engineering",
    reason:
      "Root cause is a breaking change in rate-limiting middleware. " +
      "Requires engineering deployment to resolve.",
    urgency: "urgent",
    contextSummary:
      "Enterprise customer (AcmeCorp) experiencing production API outage " +
      "on /api/v2/orders and /api/v2/checkout post-2026-06-10 deploy. " +
      "Engineering engaged: fix being rolled out. Monitor and confirm recovery.",
  },

  knowledgeBaseSuggestion: {
    action: "create",
    articleTitle:
      "Post-deploy API 503 errors: rate-limiting middleware breaking changes",
    category: "technical",
    tags: ["api", "503", "deploy", "rate-limiting", "enterprise", "incident-response"],
    contentSummary:
      "Incident response guide for post-deploy 503 errors on authenticated " +
      "endpoints. Covers: diagnosis (check deploy window), affected endpoint " +
      "patterns, rate-limiting middleware recovery, customer communication " +
      "template for enterprise accounts.",
    relatedTicketIds: ["TKT-77201", "TKT-77001"],
    priority: "high",
  },

  interactionSummary: {
    resolvedAt: null,                              // pending fix deploy
    resolutionTimeMinutes: 120,                    // estimated total
    firstContactResolution: false,                 // requires engineering deploy
    slaCompliant: true,                            // first response within 60 min
    customerAcknowledgement: "pending",            // awaiting customer reply
  },
};

// ============================================================================
// Chain Handoff Logic (Orchestrator)
// ============================================================================

/**
 * After @customer-service produces triage output, the orchestrator:
 *
 * 1. Reads agent context: { supportTicket: ..., triageResult: ... }
 * 2. Builds the bridged AgentInput for @support-responder:
 *    - supportTicket ← from context (unchanged)
 *    - channel ← from context.supportTicket.channel
 *    - customerContext ← enriched with triage emotion assessment
 *    - issueCategory ← from customerService.triageCategory
 *    - priority ← upgraded by triage if needed
 *    - escalationFlag ← set if customerService.escalationRecommendation !== "tier1"
 *    - brandTone ← resolved by orchestrator from account tier
 *    - slaRequirements ← resolved by orchestrator from priority
 * 3. Invokes @support-responder with bridged input
 * 4. Writes to context:
 *    { resolutionPlan, customerSatisfactionScore, followUpSchedule, knowledgeBaseRef }
 */
