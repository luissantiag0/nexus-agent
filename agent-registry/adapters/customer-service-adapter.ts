// ============================================================================
// CustomerServiceAdapter — Agent Registry Adapter
// Handles: FAQs, complaints, account support, order inquiries, retention,
//          escalation routing, and general customer interactions.
// Graph role: Primary customer-facing agent in the support chain.
// ============================================================================

import type {
  AgentAdapter,
  AgentIdentity,
  AgentInput,
  AgentOutput,
  AgentContext,
  JSONValue,
  JSONObject,
} from '../core';

// ──────────────────────────────────────────────────────────────────────────────
// 1. AGENT IDENTITY
// ──────────────────────────────────────────────────────────────────────────────

export const CUSTOMER_SERVICE_IDENTITY: AgentIdentity = {
  id: 'customer-service',
  name: 'customerService',
  version: '1.0.0',
  displayName: 'Customer Service Agent',
  tags: [
    'support',
    'customer-service',
    'faq',
    'complaint',
    'account',
    'order',
    'retention',
    'escalation',
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. INPUT SCHEMA
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Categories of customer inquiries the adapter can handle.
 */
export const INQUIRY_TYPES = [
  'faq',
  'account',
  'order',
  'complaint',
  'retention',
  'escalation',
  'general',
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/**
 * Communication channels the adapter supports.
 */
export const COMMUNICATION_CHANNELS = [
  'phone',
  'chat',
  'email',
  'social',
  'sms',
] as const;

export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

/**
 * A single message in a conversation history.
 */
export interface MessageHistory {
  role: 'customer' | 'agent' | 'system';
  text: string;
  timestamp?: string;
}

/**
 * The customer profile data expected in the input.
 */
export interface CustomerProfile {
  name?: string;
  id?: string;
  email?: string;
  phone?: string;
  accountTier?: 'standard' | 'premium' | 'enterprise' | 'vip';
  accountCreatedAt?: string;
  lifetimeValue?: number;
  previousInteractions?: number;
  averageSatisfaction?: number; // 0–5
  tags?: string[]; // e.g. ["vip", "at-risk", "fraud-flagged"]
}

/**
 * Business context for this interaction.
 */
export interface BusinessContext {
  name: string;
  industry?:
    | 'retail'
    | 'saas'
    | 'hospitality'
    | 'finance'
    | 'telecom'
    | 'healthcare'
    | 'logistics'
    | 'general';
  department?: string;
  agentName?: string; // The human agent name (if branded)
  supportedLanguages?: string[];
}

/**
 * Inquiry payload — the core of the input.
 */
export interface CustomerServiceInquiry {
  /** Categorization of the issue */
  type: InquiryType;
  /** The customer's message verbatim */
  message: string;
  /** Communication channel */
  channel: CommunicationChannel;
  /** Optional attachments / links */
  attachments?: string[];
  /** Urgency level assessed by upstream routing */
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Complete input payload for the customer-service adapter.
 */
export interface CustomerServiceInput {
  /** The customer inquiry */
  inquiry: CustomerServiceInquiry;
  /** Customer profile (may be partial if not yet identified) */
  customer?: CustomerProfile;
  /** Business context */
  business: BusinessContext;
  /** Conversation history for ongoing threads */
  conversation?: {
    history: MessageHistory[];
    turnCount: number;
  };
  /** Knowledge base articles / policy references to inject */
  knowledgeBase?: {
    articles: Array<{
      id: string;
      title: string;
      content: string;
      relevance: number; // 0–1
    }>;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. OUTPUT SCHEMA
// ──────────────────────────────────────────────────────────────────────────────

/**
 * An action that the agent resolved as part of this turn.
 */
export interface ResolvedAction {
  type:
    | 'password_reset'
    | 'refund'
    | 'replacement'
    | 'credit'
    | 'exchange'
    | 'callback'
    | 'follow_up'
    | 'info_provided'
    | 'account_update'
    | 'subscription_change'
    | 'policy_exception';
  status: 'completed' | 'pending' | 'failed' | 'actioned';
  details: string;
  referenceId?: string;
}

/**
 * A commitment made to the customer.
 */
export interface Commitment {
  description: string;
  owner: string;
  deadline: string; // ISO-8601 or relative ("within 24h")
  status: 'open' | 'fulfilled' | 'breached';
  notified: boolean;
}

/**
 * Escalation information when the agent determines
 * the issue must be handled by another agent or team.
 */
export interface EscalationInfo {
  flag: true;
  reason: string;
  priority: 'immediate' | 'urgent' | 'standard';
  targetAgent: string; // adapter name
  targetTeam?: string;
  context: JSONObject; // Full context for the receiving agent
}

/**
 * No escalation (negative signal for conditional routing).
 */
export interface NoEscalation {
  flag: false;
}

/**
 * Resolution metadata.
 */
export interface ResolutionMetadata {
  /** How was this interaction concluded */
  status: 'resolved' | 'partially_resolved' | 'escalated' | 'unresolved';
  /** Primary category */
  category: InquiryType;
  /** Confidence in the resolution (0–1) */
  confidence: number;
  /** Does this ticket require follow-up? */
  requiresFollowUp: boolean;
  /** Follow-up scheduled time if applicable */
  followUpAt?: string;
}

/**
 * Retention attempt outcome.
 */
export interface RetentionOutcome {
  /** Risk level assessed */
  risk: 'low' | 'medium' | 'high';
  /** Was a retention attempt made? */
  attemptMade: boolean;
  /** If attempt was made, what was the outcome */
  outcome?: 'retained' | 'cancelled' | 'pending' | 'escalated';
  /** Reason code for cancellation if applicable */
  cancellationReason?: string;
  /** Offer extended (e.g., "20% discount for 3 months") */
  offerExtended?: string;
}

/**
 * Complete output payload from the customer-service adapter.
 */
export interface CustomerServiceOutput {
  /** The agent's response text to be delivered to the customer */
  response: {
    text: string;
    /** Tone label for downstream rendering */
    tone?: 'empathetic' | 'professional' | 'urgent' | 'appreciative' | 'neutral';
    /** Actions taken as part of this response */
    actions: ResolvedAction[];
  };

  /** Escalation signal — if flag=true, graph should conditionally route */
  escalation: EscalationInfo | NoEscalation;

  /** Resolution tracking */
  resolution: ResolutionMetadata;

  /** Retention analysis */
  retention: RetentionOutcome;

  /** Full documentation for downstream and audit */
  documentation: {
    interactionSummary: string;
    commitments: Commitment[];
    /** System-generated ticket/case id */
    caseId?: string;
    /** Hash or reference for audit trail */
    auditHash?: string;
  };

  /** Suggested follow-up action for the graph */
  suggestedNext?: {
    agent: string;
    reason: string;
    context: JSONObject;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. CONTEXT KEYS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Context keys the adapter READS from AgentContext.
 */
export const CUSTOMER_SERVICE_CONTEXT_READS = [
  'customer.name',
  'customer.id',
  'customer.email',
  'customer.accountTier',
  'customer.lifetimeValue',
  'customer.previousInteractions',
  'customer.averageSatisfaction',
  'customer.tags',
  'conversation.history',
  'conversation.turnCount',
  'business.name',
  'business.industry',
  'business.config',
  'knowledge.base.articles',
] as const;

/**
 * Context keys the adapter WRITES to AgentContext.
 */
export const CUSTOMER_SERVICE_CONTEXT_WRITES = [
  'customerService.resolution.status',
  'customerService.resolution.category',
  'customerService.resolution.confidence',
  'customerService.resolution.requiresFollowUp',
  'customerService.escalation.flag',
  'customerService.escalation.reason',
  'customerService.escalation.priority',
  'customerService.escalation.targetAgent',
  'customerService.response.text',
  'customerService.response.tone',
  'customerService.retention.risk',
  'customerService.retention.attemptMade',
  'customerService.retention.outcome',
  'customerService.documentation.interactionSummary',
  'customerService.documentation.commitments',
  'customerService.documentation.caseId',
  'customerService.suggestedNext',
  'customerService.turnCount',
] as const;

/**
 * Read context helper — safely extracts CustomerServiceInput
 * fields from AgentContext.
 */
export function readContext(context: AgentContext, input: CustomerServiceInput): void {
  // Merge context values into input (context overrides defaults)
  if (!input.customer) {
    input.customer = {};
  }
  input.customer.name ??= context.get<string>('customer.name');
  input.customer.id ??= context.get<string>('customer.id');
  input.customer.email ??= context.get<string>('customer.email');
  input.customer.accountTier ??= context.get<'standard' | 'premium' | 'enterprise' | 'vip'>(
    'customer.accountTier'
  );
  input.customer.lifetimeValue ??= context.get<number>('customer.lifetimeValue');
  input.customer.previousInteractions ??= context.get<number>('customer.previousInteractions');
  input.customer.averageSatisfaction ??= context.get<number>('customer.averageSatisfaction');
  input.customer.tags ??= context.get<string[]>('customer.tags');

  if (!input.conversation) {
    input.conversation = { history: [], turnCount: 0 };
  }
  input.conversation.history ??= context.get<MessageHistory[]>('conversation.history') ?? [];
  input.conversation.turnCount ??= context.get<number>('conversation.turnCount') ?? 0;

  if (!input.knowledgeBase) {
    input.knowledgeBase = { articles: [] };
  }
  input.knowledgeBase.articles ??=
    context.get<CustomerServiceInput['knowledgeBase']['articles']>('knowledge.base.articles') ?? [];
}

/**
 * Write context helper — persists CustomerServiceOutput
 * fields back into AgentContext.
 */
export function writeContext(context: AgentContext, output: CustomerServiceOutput): void {
  // Resolution
  context.set('customerService.resolution.status', output.resolution.status);
  context.set('customerService.resolution.category', output.resolution.category);
  context.set('customerService.resolution.confidence', output.resolution.confidence);
  context.set(
    'customerService.resolution.requiresFollowUp',
    output.resolution.requiresFollowUp
  );

  // Escalation
  context.set('customerService.escalation.flag', output.escalation.flag);
  if (output.escalation.flag) {
    const e = output.escalation as EscalationInfo;
    context.set('customerService.escalation.reason', e.reason);
    context.set('customerService.escalation.priority', e.priority);
    context.set('customerService.escalation.targetAgent', e.targetAgent);
  }

  // Response
  context.set('customerService.response.text', output.response.text);
  context.set('customerService.response.tone', output.response.tone ?? 'professional');

  // Retention
  context.set('customerService.retention.risk', output.retention.risk);
  context.set('customerService.retention.attemptMade', output.retention.attemptMade);
  context.set('customerService.retention.outcome', output.retention.outcome ?? null);

  // Documentation
  context.set('customerService.documentation.interactionSummary', output.documentation.interactionSummary);
  context.set('customerService.documentation.commitments', output.documentation.commitments as unknown as JSONValue);
  context.set('customerService.documentation.caseId', output.documentation.caseId ?? null);

  // Suggested next
  if (output.suggestedNext) {
    context.set('customerService.suggestedNext', output.suggestedNext as unknown as JSONValue);
  }

  // Increment turn count
  const currentTurn = context.get<number>('customerService.turnCount') ?? 0;
  context.set('customerService.turnCount', currentTurn + 1);

  // Append to conversation history
  const history = context.get<MessageHistory[]>('conversation.history') ?? [];
  history.push({ role: 'agent', text: output.response.text });
  context.set('conversation.history', history as unknown as JSONValue);
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. VALIDATION RULES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validate a raw value as a CustomerServiceInput.
 */
export function validateCustomerServiceInput(value: unknown): value is AgentInput<CustomerServiceInput> {
  if (!value || typeof value !== 'object') return false;

  const input = value as Record<string, unknown>;

  // Must have meta
  if (!input.meta || typeof input.meta !== 'object') return false;
  const meta = input.meta as Record<string, unknown>;
  if (typeof meta.traceId !== 'string' || typeof meta.source !== 'string') return false;

  // Must have payload
  if (!input.payload || typeof input.payload !== 'object') return false;
  const payload = input.payload as Record<string, unknown>;

  // payload.inquiry is required
  if (!payload.inquiry || typeof payload.inquiry !== 'object') return false;
  const inquiry = payload.inquiry as Record<string, unknown>;

  // inquiry.type must be a valid InquiryType
  if (!INQUIRY_TYPES.includes(inquiry.type as InquiryType)) return false;

  // inquiry.message must be a non-empty string
  if (typeof inquiry.message !== 'string' || inquiry.message.trim().length === 0) return false;

  // inquiry.channel must be a valid CommunicationChannel
  if (!COMMUNICATION_CHANNELS.includes(inquiry.channel as CommunicationChannel)) return false;

  // payload.business is required
  if (!payload.business || typeof payload.business !== 'object') return false;
  const business = payload.business as Record<string, unknown>;
  if (typeof business.name !== 'string' || business.name.trim().length === 0) return false;

  return true;
}

/**
 * Validate a raw value as a CustomerServiceOutput.
 */
export function validateCustomerServiceOutput(value: unknown): value is AgentOutput<CustomerServiceOutput> {
  if (!value || typeof value !== 'object') return false;

  const output = value as Record<string, unknown>;

  // Must have meta
  if (!output.meta || typeof output.meta !== 'object') return false;
  if (typeof (output.meta as Record<string, unknown>).traceId !== 'string') return false;

  // Must have payload
  if (!output.payload || typeof output.payload !== 'object') return false;
  const payload = output.payload as Record<string, unknown>;

  // payload.response is required
  if (!payload.response || typeof payload.response !== 'object') return false;
  const response = payload.response as Record<string, unknown>;
  if (typeof response.text !== 'string') return false;

  // payload.response.actions must be an array
  if (!Array.isArray(response.actions)) return false;

  // payload.escalation is required
  if (!payload.escalation || typeof payload.escalation !== 'object') return false;
  if (typeof (payload.escalation as Record<string, unknown>).flag !== 'boolean') return false;

  // payload.resolution is required
  if (!payload.resolution || typeof payload.resolution !== 'object') return false;
  const resolution = payload.resolution as Record<string, unknown>;
  if (!['resolved', 'partially_resolved', 'escalated', 'unresolved'].includes(resolution.status as string)) {
    return false;
  }

  // payload.retention is required
  if (!payload.retention || typeof payload.retention !== 'object') return false;

  // payload.documentation is required
  if (!payload.documentation || typeof payload.documentation !== 'object') return false;
  const doc = payload.documentation as Record<string, unknown>;
  if (typeof doc.interactionSummary !== 'string') return false;
  if (!Array.isArray(doc.commitments)) return false;

  return true;
}

/**
 * Context integrity check — verifies the context has all expected
 * read keys and writes are coherent.
 */
export function validateContextIntegrity(context: AgentContext): {
  valid: boolean;
  missingReadKeys: string[];
  issues: string[];
} {
  const issues: string[] = [];
  const missingReadKeys: string[] = [];

  // Check that at minimum the customer name is set if a customer object exists
  const customerId = context.get<string>('customer.id');
  const customerName = context.get<string>('customer.name');
  if (customerId && !customerName) {
    issues.push('customer.id present but customer.name is missing');
  }

  // Check business name is set
  const businessName = context.get<string>('business.name');
  if (!businessName) {
    missingReadKeys.push('business.name');
    issues.push('business.name is required but missing from context');
  }

  // If conversation history exists, validate it
  const history = context.get<unknown[]>('conversation.history');
  if (history && !Array.isArray(history)) {
    issues.push('conversation.history must be an array');
  }

  // Check turn count consistency
  const turnCount = context.get<number>('customerService.turnCount');
  if (turnCount !== undefined && (typeof turnCount !== 'number' || turnCount < 0)) {
    issues.push('customerService.turnCount must be a non-negative number');
  }

  return {
    valid: missingReadKeys.length === 0 && issues.length === 0,
    missingReadKeys,
    issues,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. ADAPTER IMPLEMENTATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * CustomerServiceAdapter — bridges the graph runtime with the
 * @customer-service LLM prompt workflow.
 *
 * Execution strategy:
 * 1. Hydrate input from AgentContext
 * 2. Validate input against schema
 * 3. Resolve the prompt template (YAML → rendered system prompt)
 * 4. Execute the LLM call (via platform LLM service)
 * 5. Parse structured output from LLM response
 * 6. Validate output against schema
 * 7. Persist context writes
 * 8. Return AgentOutput envelope
 */
export class CustomerServiceAdapter
  implements AgentAdapter<CustomerServiceInput, CustomerServiceOutput>
{
  readonly identity: AgentIdentity = CUSTOMER_SERVICE_IDENTITY;

  /**
   * Execute the customer-service agent.
   *
   * @param input  The agent input (trace metadata + payload)
   * @param context  Shared graph context
   * @returns AgentOutput with resolved CustomerServiceOutput payload
   */
  async execute(
    input: AgentInput<CustomerServiceInput>,
    context: AgentContext,
  ): Promise<AgentOutput<CustomerServiceOutput>> {
    const startTime = Date.now();

    try {
      // ── Step 1: Hydrate from context ──────────────────────────────────
      readContext(context, input.payload);

      // ── Step 2: Validate input ────────────────────────────────────────
      if (!validateCustomerServiceInput(input)) {
        return this.errorOutput(
          input,
          'INVALID_INPUT',
          'Input failed CustomerServiceInput schema validation',
          startTime,
        );
      }

      // ── Step 3: Context integrity check ───────────────────────────────
      const integrity = validateContextIntegrity(context);
      if (!integrity.valid) {
        // Non-fatal — log issues but continue
        console.warn('[CustomerServiceAdapter] Context integrity issues:', integrity.issues);
      }

      // ── Step 4: Resolve prompt + execute LLM ──────────────────────────
      // In production, this calls the platform's LLM service with the
      // rendered prompt template from customer-service.prompt.yaml.
      //
      // For now, the adapter delegates to the prompt engine:
      //
      //   const prompt = await loadPrompt('customer-service', '1.0.0');
      //   const rendered = prompt.render({
      //     customer_name: input.payload.customer?.name ?? 'Valued Customer',
      //     inquiry_type: input.payload.inquiry.type,
      //     inquiry_message: input.payload.inquiry.message,
      //     ...input.payload.business,
      //   });
      //   const llmResponse = await llmService.complete(rendered);
      //   const parsed = parseStructuredOutput<CustomerServiceOutput>(llmResponse);

      // ── Step 5: Construct resolved output ─────────────────────────────
      // This is a structured representation of what the LLM produces.
      // In a real implementation, the LLM returns JSON that maps directly
      // to CustomerServiceOutput.
      //
      // Here we construct a placeholder output demonstrating the shape.
      const output: CustomerServiceOutput = {
        response: {
          text: this.buildResponseText(input.payload),
          tone: this.inferTone(input.payload),
          actions: this.resolveActions(input.payload),
        },
        escalation: this.determineEscalation(input.payload),
        resolution: {
          status: 'resolved',
          category: input.payload.inquiry.type,
          confidence: 0.92,
          requiresFollowUp: false,
        },
        retention: {
          risk: this.assessRetentionRisk(input.payload),
          attemptMade: input.payload.inquiry.type === 'retention',
          outcome: input.payload.inquiry.type === 'retention' ? 'pending' : undefined,
        },
        documentation: {
          interactionSummary: `Handled ${input.payload.inquiry.type} inquiry from ${input.payload.customer?.name ?? 'customer'} via ${input.payload.inquiry.channel}.`,
          commitments: [],
          caseId: `CASE-${Date.now()}`,
        },
      };

      // If escalation is needed, set resolution accordingly
      if (output.escalation.flag) {
        output.resolution.status = 'escalated';
        output.suggestedNext = {
          agent: (output.escalation as EscalationInfo).targetAgent,
          reason: (output.escalation as EscalationInfo).reason,
          context: (output.escalation as EscalationInfo).context,
        };
      }

      // ── Step 6: Validate output ───────────────────────────────────────
      const agentOutput: AgentOutput<CustomerServiceOutput> = {
        payload: output,
        meta: {
          traceId: input.meta.traceId,
          source: this.identity.id,
          timestamp: new Date().toISOString(),
          success: true,
          durationMs: Date.now() - startTime,
        },
      };

      if (!validateCustomerServiceOutput(agentOutput)) {
        return this.errorOutput(
          input,
          'INVALID_OUTPUT',
          'Generated output failed CustomerServiceOutput schema validation',
          startTime,
        );
      }

      // ── Step 7: Persist to context ────────────────────────────────────
      writeContext(context, output);

      return agentOutput;
    } catch (err) {
      return this.errorOutput(
        input,
        'EXECUTION_ERROR',
        err instanceof Error ? err.message : 'Unknown execution error',
        startTime,
      );
    }
  }

  /**
   * Type guard for input validation.
   */
  validateInput(value: unknown): value is AgentInput<CustomerServiceInput> {
    return validateCustomerServiceInput(value);
  }

  /**
   * Type guard for output validation.
   */
  validateOutput(value: unknown): value is AgentOutput<CustomerServiceOutput> {
    return validateCustomerServiceOutput(value);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private buildResponseText(input: CustomerServiceInput): string {
    const name = input.customer?.name ?? 'there';
    const type = input.inquiry.type;

    const greetings: Record<InquiryType, string> = {
      faq: `Thanks for reaching out, ${name}! Let me answer your question about ${input.inquiry.message.slice(0, 40)}...`,
      account: `Hi ${name}, I'd be happy to help you with your account.`,
      order: `Let me look into that order for you, ${name}.`,
      complaint: `I'm really sorry to hear about your experience, ${name}. Let me make this right.`,
      retention: `${name}, I appreciate you being upfront with me. Let's talk about how we can make this work better for you.`,
      escalation: `${name}, I'm going to make sure you get the right support for this.`,
      general: `Hi ${name}! Thanks for contacting us. How can I help you today?`,
    };

    return greetings[type] ?? `Hello ${name}, how can I help you today?`;
  }

  private inferTone(input: CustomerServiceInput): CustomerServiceOutput['response']['tone'] {
    switch (input.inquiry.type) {
      case 'complaint':
        return 'empathetic';
      case 'retention':
        return 'appreciative';
      case 'escalation':
        return 'urgent';
      default:
        return 'professional';
    }
  }

  private resolveActions(input: CustomerServiceInput): ResolvedAction[] {
    // In production, the LLM determines actions from the conversation.
    // This is a heuristic based on inquiry type.
    const actions: ResolvedAction[] = [];

    switch (input.inquiry.type) {
      case 'account':
        actions.push({
          type: 'account_update',
          status: 'pending',
          details: `Processing account request for ${input.customer?.email ?? 'unknown'}`,
        });
        break;
      case 'order':
        actions.push({
          type: 'info_provided',
          status: 'completed',
          details: `Order lookup for ${input.customer?.id ?? 'unknown'}`,
        });
        break;
      case 'complaint':
        actions.push({
          type: 'follow_up',
          status: 'pending',
          details: 'Complaint logged for follow-up',
        });
        break;
    }

    return actions;
  }

  private determineEscalation(input: CustomerServiceInput): EscalationInfo | NoEscalation {
    // Escalation triggers based on platform rules.
    // In production, the LLM determines this from the conversation.

    // IMMEDIATE escalation triggers
    const message = input.inquiry.message.toLowerCase();
    const legalKeywords = ['lawsuit', 'attorney', 'lawyer', 'legal action', 'sue'];
    if (legalKeywords.some((kw) => message.includes(kw))) {
      return {
        flag: true,
        reason: 'Customer mentioned legal action — requires risk management escalation',
        priority: 'immediate',
        targetAgent: 'support-support-responder',
        targetTeam: 'Legal & Risk Management',
        context: {
          inquiryType: input.inquiry.type,
          customerMessage: input.inquiry.message,
          riskFlag: 'legal',
        },
      };
    }

    // URGENT escalation triggers
    if (input.inquiry.urgency === 'critical' || input.inquiry.urgency === 'high') {
      return {
        flag: true,
        reason: `High urgency inquiry requires specialist handling`,
        priority: 'urgent',
        targetAgent: 'support-support-responder',
        targetTeam: 'Senior Support',
        context: {
          inquiryType: input.inquiry.type,
          urgency: input.inquiry.urgency,
          customerMessage: input.inquiry.message,
        },
      };
    }

    // If retention attempt failed
    if (input.inquiry.type === 'retention') {
      return {
        flag: true,
        reason: 'Customer insisted on cancellation after retention attempt',
        priority: 'standard',
        targetAgent: 'support-support-responder',
        targetTeam: 'Retention Team',
        context: {
          inquiryType: 'retention',
          customerId: input.customer?.id,
          customerTier: input.customer?.accountTier,
        },
      };
    }

    return { flag: false };
  }

  private assessRetentionRisk(input: CustomerServiceInput): 'low' | 'medium' | 'high' {
    const message = input.inquiry.message.toLowerCase();
    const churnKeywords = ['cancel', 'leave', 'switch', 'competitor', 'unsubscribe', 'stop service'];

    const matches = churnKeywords.filter((kw) => message.includes(kw)).length;

    if (input.inquiry.type === 'retention') return 'high';
    if (matches >= 3) return 'high';
    if (matches >= 1) return 'medium';
    return 'low';
  }

  private errorOutput(
    input: AgentInput<CustomerServiceInput>,
    code: string,
    message: string,
    startTime: number,
  ): AgentOutput<CustomerServiceOutput> {
    return {
      payload: {
        response: { text: 'I apologize, but I encountered an issue processing your request.', actions: [] },
        escalation: { flag: true, reason: message, priority: 'immediate', targetAgent: 'support-support-responder', context: { error: { code, message } } },
        resolution: { status: 'unresolved', category: input.payload?.inquiry?.type ?? 'general', confidence: 0, requiresFollowUp: true },
        retention: { risk: 'low', attemptMade: false },
        documentation: { interactionSummary: `Error: ${code} — ${message}`, commitments: [] },
      },
      meta: {
        traceId: input.meta.traceId,
        source: this.identity.id,
        timestamp: new Date().toISOString(),
        success: false,
        error: { code, message },
        durationMs: Date.now() - startTime,
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. ADAPTER FACTORY
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Factory function for registering the adapter with the AgentRegistry.
 */
export function createCustomerServiceAdapter(): CustomerServiceAdapter {
  return new CustomerServiceAdapter();
}
