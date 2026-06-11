// ============================================================================
// Support Responder — Validation Rules
// ============================================================================
// These rules are enforced by the Orchestrator's validation layer before the
// agent's output is committed to context or forwarded downstream. Rules are
// categorised by severity: BLOCKER (prevents acceptance), WARNING (flags for
// review), or INFO (advisory).
// ============================================================================

import type {
  SupportResponderInput,
  SupportResponderOutput,
  ResolutionStep,
  FollowUpAction,
  EscalationDecision,
} from "../adapter";

// ---------------------------------------------------------------------------
// Severity Levels
// ---------------------------------------------------------------------------

export type ValidationSeverity = "BLOCKER" | "WARNING" | "INFO";

export interface ValidationResult {
  readonly rule: string;
  readonly severity: ValidationSeverity;
  readonly passed: boolean;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationReport {
  readonly agentId: string;
  readonly promptVersion: string;
  readonly ticketId: string;
  readonly timestamp: string;
  readonly results: ValidationResult[];
  readonly summary: {
    readonly total: number;
    readonly blockers: number;
    readonly warnings: number;
    readonly infos: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly verdict: "ACCEPT" | "REVIEW" | "REJECT";
}

// ---------------------------------------------------------------------------
// Validator runner
// ---------------------------------------------------------------------------

export function validateSupportResponderOutput(
  input: SupportResponderInput,
  output: SupportResponderOutput,
): ValidationReport {
  const results: ValidationResult[] = [
    // — SLA Compliance —
    ...checkSlaCompliance(input, output),

    // — Response Completeness —
    ...checkResponseCompleteness(output),

    // — Resolution Steps —
    ...checkResolutionSteps(output.resolutionSteps),

    // — Satisfaction Prediction —
    ...checkSatisfactionPrediction(output),

    // — Escalation Decision —
    ...checkEscalationDecision(output.escalationDecision, input.escalationFlag),

    // — Follow-Up Schedule —
    ...checkFollowUpSchedule(output.followUpSchedule),

    // — Tone Appropriateness per Channel —
    ...checkToneAppropriateness(output.responseDraft, input.channel, input.brandTone),

    // — Knowledge Base Suggestion —
    ...checkKnowledgeBaseSuggestion(output.knowledgeBaseSuggestion),

    // — Interaction Summary —
    ...checkInteractionSummary(output.interactionSummary),
  ];

  const blockers = results.filter((r) => r.severity === "BLOCKER" && !r.passed).length;
  const warnings = results.filter((r) => r.severity === "WARNING" && !r.passed).length;
  const infos = results.filter((r) => r.severity === "INFO" && !r.passed).length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  let verdict: ValidationReport["verdict"] = "ACCEPT";
  if (blockers > 0) {
    verdict = "REJECT";
  } else if (warnings > 0) {
    verdict = "REVIEW";
  }

  return {
    agentId: "support-responder",
    promptVersion: "support-responder.v1",
    ticketId: input.supportTicket.ticketId,
    timestamp: new Date().toISOString(),
    results,
    summary: { total: results.length, blockers, warnings, infos, passed, failed },
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Rule: SLA Compliance Check
// ---------------------------------------------------------------------------

function checkSlaCompliance(
  input: SupportResponderInput,
  output: SupportResponderOutput,
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R1: First-response SLA must be met
  const slaDeadline = new Date(input.supportTicket.slaDeadline).getTime();
  const now = Date.now();

  if (output.interactionSummary.resolutionTimeMinutes >= 0) {
    const slaMinutes = input.slaRequirements?.firstResponseMinutes ?? 120;
    const firstResponseOnTime = now <= slaDeadline;
    rules.push({
      rule: "SLA-001",
      severity: "BLOCKER",
      passed: firstResponseOnTime,
      message: firstResponseOnTime
        ? `First response within SLA (${slaMinutes} min)`
        : `First response SLA breached — deadline was ${input.supportTicket.slaDeadline}`,
      details: {
        slaDeadline: input.supportTicket.slaDeadline,
        slaMinutes,
        actualResponseTimeMinutes: output.interactionSummary.resolutionTimeMinutes,
      },
    });
  }

  // R2: interactionSummary.slaCompliant must be accurate
  rules.push({
    rule: "SLA-002",
    severity: "BLOCKER",
    passed: typeof output.interactionSummary.slaCompliant === "boolean",
    message: output.interactionSummary.slaCompliant !== undefined
      ? `SLA compliance reported as: ${output.interactionSummary.slaCompliant}`
      : "slaCompliant field is missing or not a boolean",
  });

  // R3: Resolution time must not exceed resolution SLA
  if (input.slaRequirements?.resolutionHours && output.interactionSummary.resolutionTimeMinutes) {
    const resolutionMinutesLimit = input.slaRequirements.resolutionHours * 60;
    const withinResolutionSla =
      output.interactionSummary.resolutionTimeMinutes <= resolutionMinutesLimit;
    rules.push({
      rule: "SLA-003",
      severity: "BLOCKER",
      passed: withinResolutionSla,
      message: withinResolutionSla
        ? `Resolution within SLA (${input.slaRequirements.resolutionHours}h)`
        : `Resolution time (${output.interactionSummary.resolutionTimeMinutes}min) exceeds SLA (${resolutionMinutesLimit}min)`,
      details: {
        resolutionTimeMinutes: output.interactionSummary.resolutionTimeMinutes,
        slaLimitMinutes: resolutionMinutesLimit,
      },
    });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Response Completeness
// ---------------------------------------------------------------------------

function checkResponseCompleteness(output: SupportResponderOutput): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R4: responseDraft must exist and be non-empty
  rules.push({
    rule: "COMP-001",
    severity: "BLOCKER",
    passed: typeof output.responseDraft === "string" && output.responseDraft.trim().length > 0,
    message: output.responseDraft?.trim()
      ? "Response draft present"
      : "Response draft is empty or missing",
  });

  // R5: responseDraft must contain mandatory sections
  const draft = output.responseDraft ?? "";
  const hasAcknowledgment = /sorry|apologi|understand|thank\s+you/i.test(draft);
  const hasSolution = /(here'?s what|steps|fix|resolve|solution|credit|refund|reactivat)/i.test(draft);
  const hasNextSteps = /(next|going to|will|by|timeline|ETA|check|confirm)/i.test(draft);
  const hasClosing = /(best|regards|thank|let me know|anything else|sincerely)/i.test(draft);

  rules.push({
    rule: "COMP-002",
    severity: "WARNING",
    passed: hasAcknowledgment,
    message: hasAcknowledgment
      ? "Response includes customer acknowledgment"
      : "Response missing acknowledgment of customer's situation",
  });

  rules.push({
    rule: "COMP-003",
    severity: "BLOCKER",
    passed: hasSolution,
    message: hasSolution
      ? "Response includes solution description"
      : "Response missing solution or action taken",
  });

  rules.push({
    rule: "COMP-004",
    severity: "WARNING",
    passed: hasNextSteps,
    message: hasNextSteps
      ? "Response includes next steps / timeline"
      : "Response missing next steps or timeline for the customer",
  });

  rules.push({
    rule: "COMP-005",
    severity: "INFO",
    passed: hasClosing,
    message: hasClosing
      ? "Response includes professional closing"
      : "Response missing professional closing",
  });

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Resolution Steps Validity
// ---------------------------------------------------------------------------

function checkResolutionSteps(steps: ResolutionStep[]): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R6: At least one resolution step
  rules.push({
    rule: "STEP-001",
    severity: "BLOCKER",
    passed: Array.isArray(steps) && steps.length > 0,
    message: steps?.length > 0
      ? `Resolution plan has ${steps.length} steps`
      : "No resolution steps defined",
    details: { stepCount: steps?.length ?? 0 },
  });

  if (!Array.isArray(steps) || steps.length === 0) return rules;

  // R7: Steps must be sequentially ordered
  const orders = steps.map((s) => s.order);
  const isSequential = orders.every((o, i) => o === i + 1);
  rules.push({
    rule: "STEP-002",
    severity: "WARNING",
    passed: isSequential,
    message: isSequential
      ? "Steps are sequentially ordered"
      : "Steps are not sequentially ordered (expected 1..N)",
    details: { actualOrders: orders },
  });

  // R8: Each step must have an action and expected outcome
  const stepsWithMissingFields = steps.filter(
    (s) => !s.action?.trim() || !s.expectedOutcome?.trim(),
  );
  rules.push({
    rule: "STEP-003",
    severity: "BLOCKER",
    passed: stepsWithMissingFields.length === 0,
    message:
      stepsWithMissingFields.length === 0
        ? "All steps have action and expected outcome"
        : `${stepsWithMissingFields.length} step(s) missing action or expected outcome`,
    details: {
      problematicStepIndices: stepsWithMissingFields.map((s) => s.order),
    },
  });

  // R9: At least one completed step should exist (credibility)
  const hasCompletedStep = steps.some((s) => s.completed);
  rules.push({
    rule: "STEP-004",
    severity: "INFO",
    passed: hasCompletedStep,
    message: hasCompletedStep
      ? "At least one step marked as completed"
      : "No steps marked as completed — appears no action was taken",
  });

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Satisfaction Prediction Validity
// ---------------------------------------------------------------------------

function checkSatisfactionPrediction(output: SupportResponderOutput): ValidationResult[] {
  const rules: ValidationResult[] = [];
  const pred = output.satisfactionPrediction;

  // R10: Score must be in 1.0–5.0 range
  const validScore = typeof pred?.predictedScore === "number" &&
    pred.predictedScore >= 1.0 &&
    pred.predictedScore <= 5.0;
  rules.push({
    rule: "CSAT-001",
    severity: "BLOCKER",
    passed: validScore,
    message: validScore
      ? `Predicted CSAT score: ${pred.predictedScore}`
      : `Predicted CSAT score (${pred?.predictedScore}) is outside valid range 1.0–5.0`,
    details: { score: pred?.predictedScore },
  });

  // R11: Confidence level must be valid
  const validConfidence = ["low", "medium", "high"].includes(pred?.confidenceLevel ?? "");
  rules.push({
    rule: "CSAT-002",
    severity: "WARNING",
    passed: validConfidence,
    message: validConfidence
      ? `Confidence level: ${pred.confidenceLevel}`
      : `Invalid confidence level: ${pred?.confidenceLevel}`,
  });

  // R12: Low scores must include risk factors
  if (pred?.predictedScore != null && pred.predictedScore < 3.5) {
    const hasRiskFactors = Array.isArray(pred.riskFactors) && pred.riskFactors.length > 0;
    rules.push({
      rule: "CSAT-003",
      severity: "BLOCKER",
      passed: hasRiskFactors,
      message: hasRiskFactors
        ? `Risk factors documented for low CSAT (${pred.riskFactors.length} factors)`
        : "Low CSAT prediction (< 3.5) requires risk factors",
      details: { riskFactors: pred.riskFactors, score: pred.predictedScore },
    });

    // R13: Low scores must recommend an intervention
    const hasIntervention = typeof pred.recommendedIntervention === "string" &&
      pred.recommendedIntervention.trim().length > 0;
    rules.push({
      rule: "CSAT-004",
      severity: "WARNING",
      passed: hasIntervention,
      message: hasIntervention
        ? "Intervention recommended for low CSAT"
        : "Low CSAT prediction (< 3.5) should include a recommended intervention",
    });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Escalation Decision
// ---------------------------------------------------------------------------

function checkEscalationDecision(
  decision: EscalationDecision,
  escalationFlag?: SupportResponderInput["escalationFlag"],
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R14: escalationDecision is required
  rules.push({
    rule: "ESC-001",
    severity: "BLOCKER",
    passed: decision != null,
    message: decision ? "Escalation decision present" : "Escalation decision is missing",
  });

  if (!decision) return rules;

  // R15: If requiresEscalation is true, escalateTo must be specified
  if (decision.requiresEscalation) {
    const hasTarget = typeof decision.escalateTo === "string" && decision.escalateTo.trim().length > 0;
    rules.push({
      rule: "ESC-002",
      severity: "BLOCKER",
      passed: hasTarget,
      message: hasTarget
        ? `Escalation target specified: ${decision.escalateTo}`
        : "Escalation required but no escalateTo target specified",
    });

    // R16: Urgency must be set when escalating
    const validUrgency = ["routine", "urgent", "immediate"].includes(decision.urgency);
    rules.push({
      rule: "ESC-003",
      severity: "WARNING",
      passed: validUrgency,
      message: validUrgency
        ? `Escalation urgency: ${decision.urgency}`
        : `Escalation urgency must be 'routine', 'urgent', or 'immediate' — got '${decision.urgency}'`,
    });

    // R17: contextSummary must be provided when escalating
    const hasSummary = typeof decision.contextSummary === "string" &&
      decision.contextSummary.trim().length > 20;
    rules.push({
      rule: "ESC-004",
      severity: "WARNING",
      passed: hasSummary,
      message: hasSummary
        ? "Escalation context summary provided"
        : "Escalation context summary is too short or missing (minimum 20 chars)",
    });
  }

  // R18: If input had an escalationFlag, output should acknowledge it appropriately
  if (escalationFlag) {
    const acknowledgesEscalation = decision.contextSummary?.includes(escalationFlag.escalationReason?.slice(0, 20)) ?? false;
    rules.push({
      rule: "ESC-005",
      severity: "WARNING",
      passed: acknowledgesEscalation,
      message: acknowledgesEscalation
        ? "Output acknowledges upstream escalation context"
        : "Input had escalationFlag from upstream agent but output doesn't reference the escalation context",
    });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Follow-Up Schedule Completeness
// ---------------------------------------------------------------------------

function checkFollowUpSchedule(
  schedule: SupportResponderOutput["followUpSchedule"],
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R19: Schedule object must exist
  rules.push({
    rule: "FUP-001",
    severity: "BLOCKER",
    passed: schedule != null,
    message: schedule ? "Follow-up schedule present" : "Follow-up schedule is missing",
  });

  if (!schedule) return rules;

  // R20: At least one immediate follow-up action
  const hasImmediate = Array.isArray(schedule.immediate) && schedule.immediate.length > 0;
  rules.push({
    rule: "FUP-002",
    severity: "WARNING",
    passed: hasImmediate,
    message: hasImmediate
      ? `Immediate follow-up has ${schedule.immediate.length} action(s)`
      : "No immediate follow-up actions defined (within 24h)",
  });

  // R21: Each follow-up action must have required fields
  const allActions = [
    ...(schedule.immediate ?? []),
    ...(schedule.shortTerm ?? []),
    ...(schedule.longTerm ?? []),
  ];

  const invalidActions = allActions.filter(
    (a) => !a.type || !a.scheduledFor || !a.channel || !a.notes,
  );
  rules.push({
    rule: "FUP-003",
    severity: "BLOCKER",
    passed: invalidActions.length === 0,
    message:
      invalidActions.length === 0
        ? "All follow-up actions have required fields"
        : `${invalidActions.length} follow-up action(s) missing required fields (type, scheduledFor, channel, notes)`,
  });

  // R22: scheduledFor must be valid ISO 8601
  const invalidDates = allActions.filter((a) => isNaN(Date.parse(a.scheduledFor)));
  rules.push({
    rule: "FUP-004",
    severity: "WARNING",
    passed: invalidDates.length === 0,
    message:
      invalidDates.length === 0
        ? "All follow-up dates are valid ISO 8601"
        : `${invalidDates.length} follow-up action(s) have invalid scheduledFor dates`,
  });

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Tone Appropriateness per Channel
// ---------------------------------------------------------------------------

function checkToneAppropriateness(
  draft: string,
  channel: string,
  brandTone?: string,
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R23: Channel-based tone rules
  const channelRules: Record<string, RegExp[]> = {
    live_chat: [/\n{3,}/, /^Dear/i],                 // no long gaps, no "Dear"
    email: [/^Dear|^Hi\s/i],                          // should have salutation
    social_media: /(DM|private message|direct message)/i.test(draft)
      ? []
      : [/\bplease\b/i],                              // social should be polite, invite to DM
  };

  if (channel === "live_chat") {
    const hasLongParagraphs = (draft.match(/\n{3,}/g) ?? []).length > 0;
    rules.push({
      rule: "TONE-001",
      severity: "WARNING",
      passed: !hasLongParagraphs,
      message: hasLongParagraphs
        ? "Live chat response has long paragraph breaks — prefer shorter bursts"
        : "Live chat response uses appropriate paragraph length",
    });

    const hasDear = /^Dear/i.test(draft.trim());
    rules.push({
      rule: "TONE-002",
      severity: "INFO",
      passed: !hasDear,
      message: hasDear
        ? "Live chat response uses 'Dear' — 'Hi' or direct address is more appropriate"
        : "Live chat salutation is appropriate",
    });
  }

  if (channel === "email") {
    const hasSalutation = /^Dear\s|^Hi\s|^Hello\s/i.test(draft.trim());
    rules.push({
      rule: "TONE-003",
      severity: "INFO",
      passed: hasSalutation,
      message: hasSalutation
        ? "Email response has appropriate salutation"
        : "Email response missing salutation (Dear/Hi/Hello)",
    });

    const hasSignature = /(best|regards|sincerely|cheers|thank\s*you)/i.test(draft);
    rules.push({
      rule: "TONE-004",
      severity: "INFO",
      passed: hasSignature,
      message: hasSignature
        ? "Email response has signature block"
        : "Email response missing signature block",
    });
  }

  if (channel === "social_media") {
    const invitesPrivate = /(DM|private message|direct message|inbox)/i.test(draft);
    rules.push({
      rule: "TONE-005",
      severity: "WARNING",
      passed: invitesPrivate,
      message: invitesPrivate
        ? "Social media response invites private channel for sensitive details"
        : "Social media response should invite customer to private channel for account details",
    });
  }

  // R24: Brand tone alignment (basic heuristic)
  if (brandTone) {
    const toneKeywords = brandTone.toLowerCase();
    const draftLower = draft.toLowerCase();

    if (toneKeywords.includes("professional")) {
      const hasContractions = /\b(can't|don't|won't|it'll|that'll|gonna)\b/i.test(draft);
      rules.push({
        rule: "TONE-006",
        severity: "INFO",
        passed: !hasContractions,
        message: hasContractions
          ? "Brand tone is 'professional' but response uses contractions"
          : "Brand tone 'professional' — no contractions detected",
      });
    }

    if (toneKeywords.includes("luxury") || toneKeywords.includes("formal")) {
      const hasCasual = /\b(hey|ok|sure|no problem|yep)\b/i.test(draft);
      rules.push({
        rule: "TONE-007",
        severity: "WARNING",
        passed: !hasCasual,
        message: hasCasual
          ? "Brand tone is formal/luxury but response uses casual language"
          : "Brand tone 'formal/luxury' maintained",
      });
    }

    if (toneKeywords.includes("friendly") || toneKeywords.includes("warm")) {
      const hasWarm = /\b(thanks|appreciate|glad|happy to)\b/i.test(draft);
      rules.push({
        rule: "TONE-008",
        severity: "INFO",
        passed: hasWarm,
        message: hasWarm
          ? "Brand tone 'friendly/warm' reflected in language"
          : "Brand tone is 'friendly/warm' but response lacks warm language",
      });
    }
  }

  // R25: No blame language (universal)
  const blamePatterns = /(you didn't|you should have|you failed|your fault|you caused|you made|you're wrong)/i;
  const hasBlame = blamePatterns.test(draft);
  rules.push({
    rule: "TONE-009",
    severity: "BLOCKER",
    passed: !hasBlame,
    message: hasBlame
      ? "Response contains blame language — never blame the customer"
      : "No blame language detected",
  });

  // R26: Empathy acknowledgment (universal)
  const empathyPatterns = /(sorry|apologi|understand|frustrat|appreciate|i hear you|thank you for)/i;
  const hasEmpathy = empathyPatterns.test(draft);
  rules.push({
    rule: "TONE-010",
    severity: "WARNING",
    passed: hasEmpathy,
    message: hasEmpathy
      ? "Response includes empathy acknowledgment"
      : "Response missing empathy acknowledgment — open with understanding before solution",
  });

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Knowledge Base Suggestion
// ---------------------------------------------------------------------------

function checkKnowledgeBaseSuggestion(
  suggestion?: SupportResponderOutput["knowledgeBaseSuggestion"],
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R27: If suggestion exists, action must be valid
  if (suggestion) {
    const validAction = ["create", "update", "link_existing"].includes(suggestion.action);
    rules.push({
      rule: "KB-001",
      severity: "WARNING",
      passed: validAction,
      message: validAction
        ? `KB suggestion action: ${suggestion.action}`
        : `Invalid KB action: ${suggestion.action} (must be create/update/link_existing)`,
    });

    // R28: Article title required
    rules.push({
      rule: "KB-002",
      severity: "WARNING",
      passed: typeof suggestion.articleTitle === "string" &&
        suggestion.articleTitle.trim().length > 5,
      message: suggestion.articleTitle?.trim()?.length > 5
        ? "KB article title specified"
        : "KB article title is too short or missing",
    });

    // R29: Priority must be valid
    const validPriority = ["low", "medium", "high"].includes(suggestion.priority);
    rules.push({
      rule: "KB-003",
      severity: "INFO",
      passed: validPriority,
      message: validPriority
        ? `KB suggestion priority: ${suggestion.priority}`
        : `Invalid KB priority: ${suggestion.priority}`,
    });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Rule: Interaction Summary Completeness
// ---------------------------------------------------------------------------

function checkInteractionSummary(
  summary: SupportResponderOutput["interactionSummary"],
): ValidationResult[] {
  const rules: ValidationResult[] = [];

  // R30: resolutionTimeMinutes must be a non-negative number
  rules.push({
    rule: "SUM-001",
    severity: "BLOCKER",
    passed: typeof summary?.resolutionTimeMinutes === "number" &&
      summary.resolutionTimeMinutes >= 0,
    message: typeof summary?.resolutionTimeMinutes === "number"
      ? `Resolution time: ${summary.resolutionTimeMinutes} min`
      : "resolutionTimeMinutes is missing or invalid",
  });

  // R31: firstContactResolution must be boolean
  rules.push({
    rule: "SUM-002",
    severity: "INFO",
    passed: typeof summary?.firstContactResolution === "boolean",
    message: typeof summary?.firstContactResolution === "boolean"
      ? `First contact resolution: ${summary.firstContactResolution}`
      : "firstContactResolution is not a boolean",
  });

  // R32: slaCompliant must be boolean
  rules.push({
    rule: "SUM-003",
    severity: "WARNING",
    passed: typeof summary?.slaCompliant === "boolean",
    message: typeof summary?.slaCompliant === "boolean"
      ? `SLA compliant: ${summary.slaCompliant}`
      : "slaCompliant is not a boolean",
  });

  // R33: customerAcknowledgement must be valid
  const validAck = ["confirmed", "pending", "unreachable"].includes(
    summary?.customerAcknowledgement ?? "",
  );
  rules.push({
    rule: "SUM-004",
    severity: "WARNING",
    passed: validAck,
    message: validAck
      ? `Customer acknowledgement: ${summary.customerAcknowledgement}`
      : `Invalid customerAcknowledgement: ${summary.customerAcknowledgement}`,
  });

  return rules;
}

// ---------------------------------------------------------------------------
// Orchestrator Integration Hook
// ---------------------------------------------------------------------------

/**
 * How the orchestrator integrates validation:
 *
 * ```typescript
 * import { validateSupportResponderOutput } from "./validation/rules";
 * import type { SupportResponderInput, SupportResponderOutput } from "./adapter";
 *
 * function onAgentOutput(input: SupportResponderInput, output: SupportResponderOutput) {
 *   const report = validateSupportResponderOutput(input, output);
 *
 *   switch (report.verdict) {
 *     case "ACCEPT":
 *       // Commit to context, dispatch follow-ups, send response
 *       break;
 *
 *     case "REVIEW":
 *       // Log warnings, flag for human review, optionally auto-approve
 *       // if warnings are low-severity
 *       break;
 *
 *     case "REJECT":
 *       // Do NOT commit output. Log blocker rules to monitoring.
 *       // Re-invoke agent with retry (if retryable) or halt pipeline.
 *       break;
 *   }
 * }
 * ```
 */
