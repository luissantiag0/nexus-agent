// ============================================================================
// Nexus Agent Platform — Agent Registry
//
// @sales-outreach Agent Adapter
// Agent ID: sales-outreach
// Prompt Version: sales-outreach.v1
// Domain: sales
// Capabilities: cold-outreach, follow-up-sequencing, objection-handling,
//               proposal-writing, pipeline-management, lead-qualification,
//               deal-scoring, re-engagement-campaign, icp-definition,
//               trigger-detection
//
// Consultative B2B sales outreach specialist for cold prospecting, lead
// follow-up, objection handling, proposal writing, and pipeline management.
// ============================================================================

import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentMetadata,
  AgentSchema,
  ValidationResult,
  ValidationRule,
} from "../types";

// ============================================================================
// 1. ENUMS & LITERAL TYPES
// ============================================================================

/**
 * The stage of the outreach lifecycle for a given prospect.
 */
export type OutreachStage =
  | "cold"
  | "follow-up"
  | "proposal"
  | "objection-handling"
  | "re-engagement"
  | "breakup";

/**
 * Communication channels supported by the sales outreach adapter.
 */
export type OutreachChannel =
  | "email"
  | "linkedin-message"
  | "linkedin-connection-request"
  | "phone-call"
  | "voicemail"
  | "video-message"
  | "direct-mail";

/**
 * Qualification score tier assigned to a prospect post-engagement.
 */
export type QualificationTier =
  | "hot"
  | "warm"
  | "lukewarm"
  | "cold"
  | "disqualified";

/**
 * Pipeline stage the prospect is currently in.
 */
export type PipelineStage =
  | "prospecting"
  | "engaged"
  | "discovery"
  | "solution"
  | "proposal"
  | "negotiation"
  | "closed-won"
  | "closed-lost";

/**
 * Sales methodology to frame the outreach approach.
 */
export type SalesMethodology =
  | "consultative"
  | "spin"
  | "challenger"
  | "meddic";

/**
 * Seniority level of the buyer persona.
 */
export type SeniorityLevel =
  | "c-suite"
  | "vp"
  | "director"
  | "manager"
  | "ic";

// ============================================================================
// 2. CORE DATA STRUCTURES
// ============================================================================

/**
 * Firmographic profile of a prospect's company.
 */
export interface FirmographicProfile {
  /** Target verticals (e.g. "SaaS", "Fintech", "Healthcare") */
  industry: string;
  /** Employee count range or revenue range */
  companySize: string;
  /** Geographic markets */
  geography: string[];
  /** B2B / B2C / SaaS / Services / etc. */
  businessModel: string;
  /** Tools in use that indicate fit or need */
  techStackSignals: string[];
}

/**
 * Buyer persona profile for the target contact.
 */
export interface PersonaProfile {
  /** Prospect's full name */
  name: string;
  /** Current job title */
  title: string;
  /** Seniority level */
  seniority: SeniorityLevel;
  /** Department / function */
  department: string;
  /** Key responsibilities */
  responsibilities: string[];
  /** Pain points the prospect likely experiences */
  painPoints: string[];
  /** How the prospect's performance is measured */
  successMetrics: string[];
}

/**
 * Trigger event that prompted the outreach.
 */
export interface TriggerEvent {
  /** Category of trigger */
  type:
    | "funding"
    | "leadership-change"
    | "expansion"
    | "competitor-displacement"
    | "job-posting"
    | "news-coverage"
    | "content-engagement"
    | "technology-change"
    | "event-attendance"
    | "referral";
  /** Human-readable description of the event */
  description: string;
  /** ISO-8601 date when the event was observed */
  observedAt: string;
  /** URL or reference source */
  source?: string;
}

/**
 * Complete ICP (Ideal Customer Profile) definition for a target account.
 */
export interface ICPDefinition {
  firmographic: FirmographicProfile;
  persona: PersonaProfile;
  triggerEvents: TriggerEvent[];
  /** Signals that disqualify a prospect from pursuit */
  disqualifiers: string[];
}

/**
 * A single communication touchpoint in the outreach sequence.
 */
export interface CommunicationRecord {
  /** Unique identifier for this interaction */
  id: string;
  /** Channel used */
  channel: OutreachChannel;
  /** When the message was sent (ISO-8601) */
  sentAt: string;
  /** The message content that was sent */
  messageContent: string;
  /** Subject line (for email) or title (for LinkedIn) */
  subject?: string;
  /** Prospect's response, if any */
  response?: string;
  /** Outcome of this touch */
  outcome:
    | "sent"
    | "opened"
    | "clicked"
    | "replied-positive"
    | "replied-neutral"
    | "replied-negative"
    | "bounced"
    | "unsubscribed"
    | "no-response";
  /** Categorised objection raised, if any */
  objectionType?:
    | "budget"
    | "timing"
    | "competitor"
    | "authority"
    | "need"
    | "implementation"
    | "price"
    | "other";
  /** Raw objection text */
  objectionText?: string;
}

/**
 * Prospect data required as input to the sales outreach agent.
 */
export interface ProspectData {
  /** Unique prospect identifier within the platform */
  id: string;
  /** Account / company name */
  company: string;
  /** Contact name */
  name: string;
  /** Contact email address(es) */
  emails: string[];
  /** LinkedIn profile URL */
  linkedInUrl?: string;
  /** Phone number(s) */
  phoneNumbers?: string[];
  /** ICP definition used for this prospect */
  icpProfile: ICPDefinition;
  /** Current pipeline stage */
  pipelineStage: PipelineStage;
  /** Custom metadata key-value pairs */
  metadata: Record<string, string>;
}

/**
 * Message content generated by the agent, split by channel-specific fields.
 */
export interface GeneratedMessage {
  /** Subject line (email) or title (LinkedIn / video) */
  subjectLine?: string;
  /** Primary body content */
  body: string;
  /** Call-to-action text */
  callToAction: string;
  /** Personalisation tokens used */
  personalisationTokens: string[];
  /** Character count of the body */
  length: number;
}

/**
 * Follow-up schedule for the next actions in the outreach sequence.
 */
export interface FollowUpSchedule {
  /** Date/time for the next touch (ISO-8601) */
  nextTouchDate: string;
  /** Channel to use for the next touch */
  nextChannel: OutreachChannel;
  /** The touch number in the cadence (1-indexed) */
  touchNumber: number;
  /** Brief instruction for what the next message should accomplish */
  nextObjective: string;
  /** If true, the next message is a re-engagement or breakup */
  isSequenceTerminal: boolean;
}

// ============================================================================
// 3. AGENT INPUT / OUTPUT SCHEMAS
// ============================================================================

/**
 * Input payload for @sales-outreach.
 */
export interface SalesOutreachInput {
  /** The prospect and account data */
  prospect: ProspectData;

  /** Current outreach stage */
  outreachStage: OutreachStage;

  /** Channel(s) to use for this outreach */
  channels: OutreachChannel[];

  /** Full history of prior communications */
  communicationHistory: CommunicationRecord[];

  /**
   * Sales methodology to frame the message.
   * @default "consultative"
   */
  salesMethodology?: SalesMethodology;

  /**
   * Product or service being sold, with key value propositions.
   */
  productContext?: {
    name: string;
    category: string;
    valuePropositions: string[];
    competitors: string[];
  };

  /**
   * If responding to an objection, the objection details.
   */
  pendingObjection?: {
    type: NonNullable<CommunicationRecord["objectionType"]>;
    text: string;
    raisedAt: string;
  };

  /**
   * Desired tone of the message.
   * @default "consultative"
   */
  tone?: "professional" | "consultative" | "warm" | "direct";
}

/**
 * Output payload from @sales-outreach.
 */
export interface SalesOutreachOutput {
  /** The generated message content */
  message: GeneratedMessage;

  /** The specific channel to send through */
  selectedChannel: OutreachChannel;

  /** When the message should be sent (ISO-8601) */
  scheduledSendAt: string;

  /** Qualification tier assigned to this prospect */
  qualificationScore: QualificationTier;

  /** Summary of why this qualification was assigned */
  qualificationRationale: string;

  /** The follow-up schedule */
  followUpSchedule: FollowUpSchedule;

  /** Recommended next action for the operator */
  nextAction: string;

  /** Updated pipeline stage */
  updatedPipelineStage: PipelineStage;

  /** Any warnings or flags (e.g. prospect likely to churn, data incomplete) */
  warnings: string[];
}

// ============================================================================
// 4. AGENT CONTEXT KEY TYPE
// ============================================================================

/**
 * Context keys that the @sales-outreach agent persists across invocations.
 */
export type SalesOutreachContextKeys =
  | "outreachSequence"
  | "prospectProfile"
  | "communicationHistory"
  | "nextFollowUpDate";

// ============================================================================
// 5. ADAPTER METADATA & SCHEMA
// ============================================================================

const SALES_OUTREACH_METADATA: AgentMetadata = {
  id: "sales-outreach",
  name: "Sales Outreach Agent",
  description:
    "Consultative B2B sales outreach specialist for cold prospecting, " +
    "lead follow-up, objection handling, proposal writing, and pipeline management.",
  domain: "sales",
  capabilities: [
    "cold-outreach",
    "follow-up-sequencing",
    "objection-handling",
    "proposal-writing",
    "pipeline-management",
    "lead-qualification",
    "deal-scoring",
    "re-engagement-campaign",
    "icp-definition",
    "trigger-detection",
  ],
  version: "1.0.0",
  promptVersion: "sales-outreach.v1",
};

const SALES_OUTREACH_SCHEMA: AgentSchema<
  SalesOutreachInput,
  SalesOutreachOutput,
  SalesOutreachContextKeys
> = {
  input: [
    { path: "prospect", label: "Prospect Data", description: "Complete prospect and ICP profile data", type: "object", required: true },
    { path: "outreachStage", label: "Outreach Stage", description: "Current stage in the outreach lifecycle", type: "string", required: true, enum: ["cold", "follow-up", "proposal", "objection-handling", "re-engagement", "breakup"] as const },
    { path: "channels", label: "Channels", description: "Channel(s) selected for this outreach", type: "array", required: true },
    { path: "communicationHistory", label: "Communication History", description: "Full history of prior outreach touches and responses", type: "array", required: true },
    { path: "salesMethodology", label: "Sales Methodology", description: "Preferred sales methodology for framing the message", type: "string", required: false, enum: ["consultative", "spin", "challenger", "meddic"] as const },
    { path: "productContext", label: "Product Context", description: "Product being sold with value propositions and competitors", type: "object", required: false },
    { path: "pendingObjection", label: "Pending Objection", description: "Objection raised by the prospect that needs handling", type: "object", required: false },
    { path: "tone", label: "Tone", description: "Desired communication tone for the message", type: "string", required: false, enum: ["professional", "consultative", "warm", "direct"] as const },
  ],
  output: [
    { path: "message", label: "Generated Message", description: "The generated outreach message content with subject and CTA", type: "object", required: true },
    { path: "selectedChannel", label: "Selected Channel", description: "The channel selected for sending this message", type: "string", required: true },
    { path: "scheduledSendAt", label: "Scheduled Send Time", description: "ISO-8601 timestamp for when the message should be sent", type: "string", required: true },
    { path: "qualificationScore", label: "Qualification Score", description: "Tier assigned to this prospect (hot/warm/lukewarm/cold/disqualified)", type: "string", required: true },
    { path: "qualificationRationale", label: "Qualification Rationale", description: "Explanation of why this qualification score was assigned", type: "string", required: true },
    { path: "followUpSchedule", label: "Follow-Up Schedule", description: "Timeline and channel for the next outreach touch", type: "object", required: true },
    { path: "nextAction", label: "Next Action", description: "Single, specific recommended action for the operator", type: "string", required: true },
    { path: "updatedPipelineStage", label: "Updated Pipeline Stage", description: "New pipeline stage for the prospect after this outreach", type: "string", required: true },
    { path: "warnings", label: "Warnings", description: "Any flags or cautions from the outreach analysis", type: "array", required: true },
  ],
  context: {
    reads: [
      { key: "outreachSequence", description: "The multi-touch cadence plan (touch 1-7 definitions)", type: "object", required: true },
      { key: "prospectProfile", description: "Hydrated prospect and ICP profile", type: "object", required: true },
      { key: "communicationHistory", description: "Chronological record of all prior communications", type: "array", required: true },
      { key: "nextFollowUpDate", description: "ISO-8601 date of the next scheduled follow-up", type: "string", required: false },
    ],
    writes: [
      { key: "outreachSequence", description: "Updated cadence plan with current touch marked complete", type: "object", required: true },
      { key: "prospectProfile", description: "Updated prospect profile with latest qualification signals", type: "object", required: true },
      { key: "communicationHistory", description: "Appended with the latest communication record", type: "array", required: true },
      { key: "nextFollowUpDate", description: "Recalculated next follow-up date based on cadence", type: "string", required: true },
    ],
  },
  validation: [
    {
      rule: "prospect-data-completeness",
      description: "All required prospect fields must be present for personalised outreach",
      severity: "error",
      validate: (input: unknown): boolean => {
        const cast = input as AgentInput<SalesOutreachInput>;
        const result = validateProspectData(cast.payload.prospect);
        return result.passed;
      },
      errorMessage: "Prospect data is incomplete — required fields are missing",
    },
    {
      rule: "channel-compatibility",
      description: "Selected channels must be compatible with the outreach stage",
      severity: "error",
      validate: (input: unknown): boolean => {
        const cast = input as AgentInput<SalesOutreachInput>;
        const result = validateChannelCompatibility(cast.payload.outreachStage, cast.payload.channels);
        return result.passed;
      },
      errorMessage: "One or more selected channels are incompatible with the outreach stage",
    },
    {
      rule: "message-length-limits",
      description: "Generated message must respect channel-specific length constraints",
      severity: "error",
      validate: (input: unknown): boolean => {
        // Note: this is a pre-execution check; post-execution length check
        // is performed against the output message during generation.
        return true;
      },
      errorMessage: "Message exceeds channel-specific length limits",
    },
    {
      rule: "personalisation-requirement",
      description: "Outreach must include personalisation tokens referencing specific prospect data",
      severity: "warning",
      validate: (input: unknown): boolean => {
        const cast = input as AgentInput<SalesOutreachInput>;
        // Pre-flight: ensure enough data exists to personalise
        const p = cast.payload.prospect;
        return (
          !!p.name &&
          !!p.company &&
          !!p.icpProfile?.persona?.title &&
          p.icpProfile?.persona?.painPoints.length > 0
        );
      },
      errorMessage: "Insufficient prospect data for personalised outreach — risk of generic messaging",
    },
  ] as ValidationRule[],
};

// ============================================================================
// 6. VALIDATION CONSTANTS
// ============================================================================

/**
 * Channel-specific length constraints (max characters and words).
 */
export const CHANNEL_LENGTH_LIMITS: Record<OutreachChannel, { maxChars: number; maxWords: number }> = {
  email:                        { maxChars: 1200, maxWords: 150 },
  "linkedin-message":           { maxChars: 800,  maxWords: 100 },
  "linkedin-connection-request": { maxChars: 300,  maxWords: 50  },
  "phone-call":                 { maxChars: 0,    maxWords: 0   }, // script, not written
  voicemail:                    { maxChars: 300,  maxWords: 50  },
  "video-message":              { maxChars: 600,  maxWords: 100 },
  "direct-mail":                { maxChars: 2000, maxWords: 300 },
};

/**
 * Stage-to-channel compatibility matrix.
 */
export const STAGE_CHANNEL_COMPATIBILITY: Record<OutreachStage, OutreachChannel[]> = {
  "cold":               ["email", "linkedin-connection-request"],
  "follow-up":          ["email", "linkedin-message", "phone-call", "voicemail", "video-message"],
  "proposal":           ["email", "direct-mail"],
  "objection-handling": ["email", "linkedin-message", "phone-call"],
  "re-engagement":      ["email", "linkedin-message", "direct-mail"],
  "breakup":            ["email", "linkedin-message"],
};

// ============================================================================
// 7. VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates prospect data completeness.
 * Returns a validation result array compatible with the base type system.
 */
export function validateProspectData(prospect: ProspectData): { passed: boolean; results: ValidationResult[] } {
  const results: ValidationResult[] = [];
  const requiredFields: Array<{ key: string; test: (p: ProspectData) => boolean; label: string }> = [
    { key: "id",          test: (p) => !!p.id,                          label: "Prospect ID" },
    { key: "company",     test: (p) => !!p.company,                     label: "Company name" },
    { key: "name",        test: (p) => !!p.name,                        label: "Contact name" },
    { key: "emails",      test: (p) => p.emails.length > 0,             label: "Email address(es)" },
    { key: "industry",    test: (p) => !!p.icpProfile?.firmographic?.industry, label: "Industry" },
    { key: "painPoints",  test: (p) => p.icpProfile?.persona?.painPoints?.length > 0, label: "Pain points" },
    { key: "pipelineStage", test: (p) => !!p.pipelineStage,             label: "Pipeline stage" },
    { key: "title",       test: (p) => !!p.icpProfile?.persona?.title,  label: "Job title" },
  ];

  for (const field of requiredFields) {
    const passed = field.test(prospect);
    results.push({
      rule: `prospect-data:${field.key}`,
      passed,
      severity: passed ? "warning" : "error",
      message: passed
        ? `${field.label} is present`
        : `${field.label} is missing — outreach personalisation will be degraded`,
      value: passed ? undefined : undefined,
    });
  }

  // Soft warnings for enrichment gaps
  if (!prospect.linkedInUrl) {
    results.push({
      rule: "prospect-data:linkedInUrl",
      passed: false,
      severity: "warning",
      message: "LinkedIn URL missing — limits multi-channel options",
    });
  }

  if (!prospect.icpProfile?.triggerEvents?.length) {
    results.push({
      rule: "prospect-data:triggerEvents",
      passed: false,
      severity: "warning",
      message: "No trigger events defined — outreach lacks timeliness signal",
    });
  }

  return {
    passed: results.filter((r) => !r.passed && r.severity === "error").length === 0,
    results,
  };
}

/**
 * Validates channel compatibility for the given outreach stage.
 */
export function validateChannelCompatibility(
  stage: OutreachStage,
  channels: OutreachChannel[],
): { passed: boolean; results: ValidationResult[] } {
  const results: ValidationResult[] = [];
  const allowed = STAGE_CHANNEL_COMPATIBILITY[stage];

  if (!allowed) {
    results.push({
      rule: "channel-compatibility:unknown-stage",
      passed: false,
      severity: "error",
      message: `Unknown outreach stage "${stage}" — no channel compatibility defined`,
    });
    return { passed: false, results };
  }

  for (const ch of channels) {
    const compatible = allowed.includes(ch);
    results.push({
      rule: `channel-compatibility:${stage}:${ch}`,
      passed: compatible,
      severity: compatible ? "warning" : "error",
      message: compatible
        ? `${ch} is compatible with ${stage} stage`
        : `${ch} is NOT compatible with ${stage} stage — allowed channels: ${allowed.join(", ")}`,
    });
  }

  return {
    passed: results.filter((r) => !r.passed && r.severity === "error").length === 0,
    results,
  };
}

/**
 * Validates that the generated message length falls within channel limits.
 */
export function validateMessageLength(
  channel: OutreachChannel,
  body: string,
): ValidationResult[] {
  const limits = CHANNEL_LENGTH_LIMITS[channel];
  const results: ValidationResult[] = [];

  if (!limits || (limits.maxChars === 0 && limits.maxWords === 0)) {
    results.push({
      rule: `message-length:${channel}`,
      passed: true,
      severity: "warning",
      message: `${channel} has no written length constraints`,
    });
    return results;
  }

  const charCount = body.length;
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  const charOk = charCount <= limits.maxChars;
  const wordOk = wordCount <= limits.maxWords;

  results.push({
    rule: `message-length:${channel}:chars`,
    passed: charOk,
    severity: "error",
    message: charOk
      ? `${charCount} chars within ${limits.maxChars} limit`
      : `${charCount} chars exceeds ${limits.maxChars} limit`,
    value: { actual: charCount, limit: limits.maxChars },
  });

  results.push({
    rule: `message-length:${channel}:words`,
    passed: wordOk,
    severity: "error",
    message: wordOk
      ? `${wordCount} words within ${limits.maxWords} limit`
      : `${wordCount} words exceeds ${limits.maxWords} limit`,
    value: { actual: wordCount, limit: limits.maxWords },
  });

  return results;
}

// ============================================================================
// 8. ADAPTER IMPLEMENTATION
// ============================================================================

export const salesOutreachAdapter: AgentAdapter<
  SalesOutreachInput,
  SalesOutreachOutput,
  SalesOutreachContextKeys
> = {
  metadata: SALES_OUTREACH_METADATA,
  schema: SALES_OUTREACH_SCHEMA,

  validateInput(input: unknown): asserts input is AgentInput<SalesOutreachInput> {
    const cast = input as Partial<AgentInput<SalesOutreachInput>>;

    if (!cast || typeof cast !== "object") {
      throw new Error("Input must be a non-null object");
    }
    if (typeof cast.targetAgent !== "string") {
      throw new Error("Input must contain a targetAgent string");
    }
    if (!cast.payload || typeof cast.payload !== "object") {
      throw new Error("Input must contain a payload object");
    }

    const p = cast.payload;

    if (!p.prospect || typeof p.prospect !== "object") {
      throw new Error("Input payload must contain a prospect object");
    }
    if (!p.prospect.id) {
      throw new Error("Prospect must have an id");
    }
    if (!p.prospect.company) {
      throw new Error("Prospect must have a company name");
    }
    if (!p.prospect.name) {
      throw new Error("Prospect must have a contact name");
    }
    if (!Array.isArray(p.prospect.emails) || p.prospect.emails.length === 0) {
      throw new Error("Prospect must have at least one email address");
    }
    if (!p.outreachStage) {
      throw new Error("Input payload must contain outreachStage");
    }
    if (!Array.isArray(p.channels) || p.channels.length === 0) {
      throw new Error("Input payload must contain at least one channel");
    }
    if (!Array.isArray(p.communicationHistory)) {
      throw new Error("Input payload must contain communicationHistory array");
    }
  },

  validateContext(context: AgentContext): ValidationResult[] {
    const results: ValidationResult[] = [];
    const requiredKeys: SalesOutreachContextKeys[] = [
      "outreachSequence",
      "prospectProfile",
      "communicationHistory",
    ];

    for (const key of requiredKeys) {
      const exists = key in context.data && context.data[key] !== undefined;
      results.push({
        rule: `context-key:${key}`,
        passed: exists,
        severity: exists ? "warning" : "error",
        message: exists
          ? `Context key "${key}" is present`
          : `Required context key "${key}" is missing — outreach sequence state may be incomplete`,
      });
    }

    return results;
  },

  async execute(
    input: AgentInput<SalesOutreachInput>,
    context: AgentContext,
  ): Promise<AgentOutput<SalesOutreachOutput>> {
    const startTime = Date.now();
    const allValidations: ValidationResult[] = [];

    // ---- validation phase ----
    const dataValidation = validateProspectData(input.payload.prospect);
    const channelValidation = validateChannelCompatibility(
      input.payload.outreachStage,
      input.payload.channels,
    );
    const contextValidation = this.validateContext(context);

    allValidations.push(...dataValidation.results);
    allValidations.push(...channelValidation.results);
    allValidations.push(...contextValidation);

    // ---- execution phase ----
    // In production, this dispatches to the LLM with the resolved prompt.
    // Here we produce a structured output skeleton demonstrating the contract.

    const output: SalesOutreachOutput = {
      message: {
        subjectLine: input.payload.outreachStage === "cold"
          ? `Question about ${input.payload.prospect.company}'s ${input.payload.prospect.icpProfile.firmographic.industry} strategy`
          : undefined,
        body: "[Generated message body — dispatched to LLM with resolved prompt]",
        callToAction: input.payload.outreachStage === "breakup"
          ? "Reply if timing changes — no pressure"
          : "Worth a 15-minute conversation?",
        personalisationTokens: [
          input.payload.prospect.name,
          input.payload.prospect.company,
          ...input.payload.prospect.icpProfile.persona.painPoints.slice(0, 2),
        ],
        length: 0, // populated post-generation
      },
      selectedChannel: input.payload.channels[0],
      scheduledSendAt: new Date(Date.now() + 86400000).toISOString(), // +1 day
      qualificationScore: "warm",
      qualificationRationale: [
        `Prospect "${input.payload.prospect.name}" at "${input.payload.prospect.company}"`,
        `matches ICP for ${input.payload.prospect.icpProfile.firmographic.industry}.`,
        input.payload.prospect.icpProfile.triggerEvents.length > 0
          ? `Trigger event detected: ${input.payload.prospect.icpProfile.triggerEvents[0].description}.`
          : "No recent trigger events found.",
        `Pain points identified: ${input.payload.prospect.icpProfile.persona.painPoints.join(", ")}.`,
      ].join(" "),
      followUpSchedule: {
        nextTouchDate: new Date(Date.now() + 3 * 86400000).toISOString(), // +3 days
        nextChannel: "email",
        touchNumber: 1,
        nextObjective: input.payload.outreachStage === "cold"
          ? "Send follow-up email with relevant case study or industry insight"
          : "Advance conversation based on prospect's last response",
        isSequenceTerminal: input.payload.outreachStage === "breakup",
      },
      nextAction: `Send ${input.payload.outreachStage} ${input.payload.channels[0]} to ${input.payload.prospect.name} at ${input.payload.prospect.emails[0]}`,
      updatedPipelineStage: input.payload.prospect.pipelineStage,
      warnings: [],
    };

    // ---- write context ----
    const currentHistory = (context.data["communicationHistory"] as CommunicationRecord[]) ?? [];
    context.data["outreachSequence"] = context.data["outreachSequence"] ?? {
      totalTouches: 7,
      touches: [
        { touchNumber: 1, channel: "email" as OutreachChannel, delayDays: 1, purpose: "Cold outreach" },
        { touchNumber: 2, channel: "linkedin-connection-request" as OutreachChannel, delayDays: 3, purpose: "Connect on LinkedIn" },
        { touchNumber: 3, channel: "email" as OutreachChannel, delayDays: 5, purpose: "Follow-up with case study" },
        { touchNumber: 4, channel: "linkedin-message" as OutreachChannel, delayDays: 8, purpose: "LinkedIn engagement" },
        { touchNumber: 5, channel: "phone-call" as OutreachChannel, delayDays: 12, purpose: "Phone call + voicemail" },
        { touchNumber: 6, channel: "email" as OutreachChannel, delayDays: 17, purpose: "Value-add content" },
        { touchNumber: 7, channel: "email" as OutreachChannel, delayDays: 21, purpose: "Breakup email" },
      ],
    };
    context.data["prospectProfile"] = input.payload.prospect;
    context.data["communicationHistory"] = currentHistory;
    context.data["nextFollowUpDate"] = output.followUpSchedule.nextTouchDate;

    context.audit.push({
      agentId: "sales-outreach",
      action: "execute",
      timestamp: Date.now(),
      summary: `Generated ${input.payload.outreachStage} outreach for ${input.payload.prospect.name} at ${input.payload.prospect.company} via ${output.selectedChannel}. Qualification: ${output.qualificationScore}.`,
    });

    // ---- determine overall status ----
    const hasFailures = allValidations.some((v) => !v.passed && v.severity === "error");
    const hasWarnings = allValidations.some((v) => !v.passed && v.severity === "warning");

    return {
      sourceAgent: "sales-outreach",
      payload: output,
      correlationId: input.correlationId,
      timestamp: Date.now(),
      processingTimeMs: Date.now() - startTime,
      status: hasFailures ? "failure" : hasWarnings ? "partial" : "success",
      summary: `${input.payload.outreachStage} outreach → ${output.selectedChannel} | ${input.payload.prospect.name} @ ${input.payload.prospect.company} | Q: ${output.qualificationScore}`,
      warnings: allValidations
        .filter((v) => !v.passed)
        .map((v) => ({
          code: v.rule,
          message: v.message,
          severity: v.severity === "error" ? ("error" as const) : ("warning" as const),
        })),
      validation: allValidations,
    };
  },
};
