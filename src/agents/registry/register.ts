// ============================================================================
// Agent Registry — Adapter Registration
// ============================================================================
// All agent adapters are registered here. The orchestrator imports this
// module at startup to populate the registry with available agents.
// Each adapter must implement the AgentSlot interface from registry.types.ts.
// ============================================================================

import type { AgentSlot, AgentContext } from "../registry.types";

// ---------------------------------------------------------------------------
// Adapter Registry (in-memory store)
// ---------------------------------------------------------------------------

const adapterRegistry = new Map<string, AgentSlot>();

/**
 * Register an agent adapter by its @mention id.
 */
function register(slot: AgentSlot): void {
  if (adapterRegistry.has(slot.agentId)) {
    console.warn(`[AgentRegistry] Overwriting existing adapter: ${slot.agentId}`);
  }
  adapterRegistry.set(slot.agentId, slot);
  console.log(`[AgentRegistry] Registered: ${slot.agentId} v${slot.version}`);
}

/**
 * Retrieve a registered adapter by id.
 */
export function getAdapter(agentId: string): AgentSlot {
  const slot = adapterRegistry.get(agentId);
  if (!slot) {
    throw new Error(`[AgentRegistry] Agent '${agentId}' not registered`);
  }
  return slot;
}

/**
 * List all registered adapters.
 */
export function listAdapters(): Array<{ agentId: string; name: string; version: string }> {
  return Array.from(adapterRegistry.values()).map((s) => ({
    agentId: s.agentId,
    name: s.name,
    version: s.version,
  }));
}

// ---------------------------------------------------------------------------
// Register all adapters
// ---------------------------------------------------------------------------

export function registerAllAdapters(): void {
  // ── Support Responder ──────────────────────────────────────────────
  register({
    agentId: "support-responder",
    name: "Support Responder",
    description:
      "Multi-channel customer support specialist delivering empathetic, " +
      "SLA-compliant issue resolution and proactive customer care.",
    version: "1.0.0",
    promptVersion: "support-responder.v1",
    color: "#2563eb",
    emoji: "💬",
    inputKeys: [
      "supportTicket", "channel", "customerContext",
      "issueCategory", "priority", "escalationFlag",
      "brandTone", "slaRequirements",
    ],
    outputKeys: [
      "responseDraft", "resolutionSteps", "satisfactionPrediction",
      "followUpSchedule", "escalationDecision", "knowledgeBaseSuggestion",
      "interactionSummary",
    ],

    async execute(
      input: Record<string, unknown>,
      context: AgentContext,
    ): Promise<Record<string, unknown>> {
      // Input validation
      if (!input.supportTicket) {
        throw new Error("Input validation failed: supportTicket is required");
      }
      if (!input.customerContext) {
        throw new Error("Input validation failed: customerContext is required");
      }

      // The orchestrator will:
      // 1. Resolve prompt template (promptVersion → YAML file)
      // 2. Template variables from input + context
      // 3. Invoke the LLM with composed system + user messages
      // 4. Parse structured JSON output
      // 5. Validate output schema
      // 6. Write context keys to shared store
      //
      // This slot returns the input as the base for the runtime
      // to process through the LLM pipeline.
      return input;
    },

    dryRun(input: Record<string, unknown>): { valid: boolean; validationErrors: string[] } {
      const errors: string[] = [];

      if (!input.supportTicket) {
        errors.push("supportTicket is required");
      }
      if (!input.channel) {
        errors.push("channel is required");
      }
      if (!input.customerContext) {
        errors.push("customerContext is required");
      }
      if (!input.issueCategory) {
        errors.push("issueCategory is required");
      }
      if (!input.priority) {
        errors.push("priority is required");
      }

      return {
        valid: errors.length === 0,
        validationErrors: errors,
      };
    },
  });

  // ── Future agents will be registered here ─────────────────────────
  // register({
  //   agentId: "customer-service",
  //   name: "Customer Service",
  //   ...
  // });

  const count = adapterRegistry.size;
  console.log(`[AgentRegistry] Registration complete: ${count} agent(s) registered`);
  console.log(`[AgentRegistry] Active: ${listAdapters().map((a) => a.agentId).join(", ")}`);
}
