// ============================================================================
// Nexus Agent Platform — AgentRegistry Implementation
// ============================================================================

import type {
  AgentRegistry as IAgentRegistry,
  AgentAdapter,
  AgentMetadata,
  AgentId,
  ContextKey,
} from "@/lib/agents/registry/types";

// ============================================================================
// AgentRegistry Implementation
// ============================================================================

export class AgentRegistry implements IAgentRegistry {
  private readonly adapters = new Map<AgentId, AgentAdapter>();
  private readonly tagIndex = new Map<string, Set<AgentId>>();
  private readonly capabilityIndex = new Map<string, Set<AgentId>>();

  // ========================================================================
  // Registration
  // ========================================================================

  register(adapter: AgentAdapter): void {
    const id = adapter.metadata.id;

    if (this.adapters.has(id)) {
      throw new Error(`Agent '${id}' is already registered`);
    }

    this.adapters.set(id, adapter);

    // Index by tags
    for (const tag of adapter.metadata.tags) {
      const tagSet = this.tagIndex.get(tag) ?? new Set();
      tagSet.add(id);
      this.tagIndex.set(tag, tagSet);
    }

    // Index by capabilities
    for (const cap of adapter.metadata.capabilities) {
      const capSet = this.capabilityIndex.get(cap) ?? new Set();
      capSet.add(id);
      this.capabilityIndex.set(cap, capSet);
    }
  }

  /**
   * Unregister an adapter by ID.
   */
  unregister(id: AgentId): boolean {
    const adapter = this.adapters.get(id);
    if (!adapter) return false;

    this.adapters.delete(id);

    // Remove from tag index
    for (const tag of adapter.metadata.tags) {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(id);
        if (tagSet.size === 0) this.tagIndex.delete(tag);
      }
    }

    // Remove from capability index
    for (const cap of adapter.metadata.capabilities) {
      const capSet = this.capabilityIndex.get(cap);
      if (capSet) {
        capSet.delete(id);
        if (capSet.size === 0) this.capabilityIndex.delete(cap);
      }
    }

    return true;
  }

  // ========================================================================
  // Lookup
  // ========================================================================

  get(id: AgentId): AgentAdapter | undefined {
    return this.adapters.get(id);
  }

  list(tags?: string[]): AgentAdapter[] {
    if (!tags || tags.length === 0) {
      return Array.from(this.adapters.values());
    }

    // Intersection: agents that have ALL specified tags
    const sets = tags
      .map((tag) => this.tagIndex.get(tag))
      .filter((s): s is Set<AgentId> => s !== undefined);

    if (sets.length === 0) return [];

    const intersection = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      for (const id of intersection) {
        if (!sets[i].has(id)) {
          intersection.delete(id);
        }
      }
    }

    return Array.from(intersection)
      .map((id) => this.adapters.get(id))
      .filter((a): a is AgentAdapter => a !== undefined);
  }

  resolve(satisfies: ContextKey[]): AgentAdapter[] {
    if (satisfies.length === 0) return this.list();

    return Array.from(this.adapters.values()).filter((adapter) => {
      const writesSet = new Set(adapter.writes.map((k) => k.toString()));
      return satisfies.every((key) => writesSet.has(key.toString()));
    });
  }

  // ========================================================================
  // Queries
  // ========================================================================

  /** Find adapters by capability. */
  findByCapability(capability: string): AgentAdapter[] {
    const ids = this.capabilityIndex.get(capability);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.adapters.get(id))
      .filter((a): a is AgentAdapter => a !== undefined);
  }

  /** Find an adapter by name. */
  findByName(name: string): AgentAdapter | undefined {
    return Array.from(this.adapters.values()).find(
      (a) => a.metadata.name.toLowerCase() === name.toLowerCase(),
    );
  }

  /** Get all registered metadata. */
  getAllMetadata(): AgentMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.metadata);
  }

  /** Count registered adapters. */
  get count(): number {
    return this.adapters.size;
  }

  /** Get all available tags. */
  get tags(): string[] {
    return Array.from(this.tagIndex.keys());
  }

  /** Get all available capabilities. */
  get capabilities(): string[] {
    return Array.from(this.capabilityIndex.keys());
  }
}
