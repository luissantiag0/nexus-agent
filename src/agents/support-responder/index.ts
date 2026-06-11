// ============================================================================
// Support Responder Agent — Public API (barrel export)
// ============================================================================

export type {
  SupportChannel,
  PriorityLevel,
  IssueCategory,
  TicketStatus,
  CustomerEmotion,
  SupportTicket,
  CustomerContext,
  EscalationFlag,
  SlaRequirements,
  SupportResponderInput,
  ResolutionStep,
  SatisfactionPrediction,
  FollowUpAction,
  FollowUpSchedule,
  EscalationDecision,
  KnowledgeBaseSuggestion,
  InteractionSummary,
  SupportResponderOutput,
  SupportResponderDryRunResult,
  SupportResponderAdapter,
  SupportResponderContextKey,
} from "./adapter";

export {
  SUPPORT_RESPONDER_CONTEXT_KEYS,
  SUPPORT_RESPONDER_DEFAULT_HOOKS,
} from "./adapter";

export {
  validateSupportResponderOutput,
} from "./validation/rules";

export type {
  ValidationSeverity,
  ValidationResult,
  ValidationReport,
} from "./validation/rules";
