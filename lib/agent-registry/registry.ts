// ============================================================================
// Nexus Agent Platform — Agent Registry
// ============================================================================
// Central registry for all agent adapters. The orchestrator uses this to
// look up agents by ID, validate inputs, execute workflows, and manage
// prompt templates.
//
// Each adapter must be registered here before it can be invoked.
// ============================================================================

import type { AgentAdapter, AgentMetadata, PromptTemplate } from "./types";
import { infrastructureMaintainerAdapter } from "./adapters/infrastructure-maintainer";

// ---------------------------------------------------------------------------
// Registry Store
// ---------------------------------------------------------------------------

class AgentRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private adapters = new Map<string, AgentAdapter<any, any, string>>();
  private prompts = new Map<string, PromptTemplate>();

  // ---- Adapter Management ------------------------------------------------

  /** Register an agent adapter. Throws if an adapter with the same ID already exists. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(adapter: AgentAdapter<any, any, string>): void {
    const id = adapter.metadata.id;
    if (this.adapters.has(id)) {
      throw new Error(`Agent adapter "${id}" is already registered. Use forceRegister() to override.`);
    }
    this.adapters.set(id, adapter);
  }

  /** Register or override an existing adapter. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forceRegister(adapter: AgentAdapter<any, any, string>): void {
    this.adapters.set(adapter.metadata.id, adapter);
  }

  /** Retrieve an adapter by agent ID. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAdapter(id: string): AgentAdapter<any, any, string> | undefined {
    return this.adapters.get(id);
  }

  /** Check if an adapter is registered. */
  hasAdapter(id: string): boolean {
    return this.adapters.has(id);
  }

  /** List all registered adapters with their metadata. */
  listAdapters(): AgentMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.metadata);
  }

  /** Remove an adapter from the registry. */
  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  // ---- Prompt Management -------------------------------------------------

  /** Register a prompt template. */
  registerPrompt(prompt: PromptTemplate): void {
    const id = prompt.id;
    if (this.prompts.has(id)) {
      throw new Error(`Prompt "${id}" is already registered.`);
    }
    this.prompts.set(id, prompt);
  }

  /** Retrieve a prompt by ID. */
  getPrompt(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /** Find a prompt by agent ID. Returns the latest version. */
  getPromptForAgent(agentId: string): PromptTemplate | undefined {
    const candidates = Array.from(this.prompts.values())
      .filter((p) => p.agentId === agentId)
      .sort((a, b) => b.id.localeCompare(a.id)); // latest first
    return candidates[0];
  }

  // ---- Bulk Operations ---------------------------------------------------

  /** Clear all adapters and prompts. */
  clear(): void {
    this.adapters.clear();
    this.prompts.clear();
  }

  /** Get registry stats. */
  stats(): { adapterCount: number; promptCount: number } {
    return {
      adapterCount: this.adapters.size,
      promptCount: this.prompts.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

export const agentRegistry = new AgentRegistry();

// ---------------------------------------------------------------------------
// Auto-Register Known Adapters
// ---------------------------------------------------------------------------

agentRegistry.register(infrastructureMaintainerAdapter);

// When more prompt templates are loaded from YAML at startup, they would be
// registered here or via a separate initialization path:
//
//   import infrastructureMaintainerPrompt from "./prompts/infrastructure-maintainer.v1.prompt.yaml";
//   agentRegistry.registerPrompt(infrastructureMaintainerPrompt);
