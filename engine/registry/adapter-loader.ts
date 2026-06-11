// ============================================================================
// Nexus Agent Platform — Adapter Loader
// ============================================================================
// Dynamically discovers and loads all agent adapters from the filesystem
// or from pre-registered adapter modules.
// ============================================================================

import type { AgentAdapter, AgentId } from "@/lib/agents/registry/types";
import { AgentRegistry } from "./agent-registry";

// ============================================================================
// Adapter Module Interface
// ============================================================================

/**
 * An adapter module exports a default or named adapter instance.
 */
export interface AdapterModule {
  default?: AgentAdapter;
  adapter?: AgentAdapter;
  [key: string]: unknown;
}

// ============================================================================
// Adapter Loader
// ============================================================================

export class AdapterLoader {
  private readonly registry: AgentRegistry;
  private readonly loaded = new Set<AgentId>();

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  // ========================================================================
  // Loading Methods
  // ========================================================================

  /**
   * Load a single adapter instance into the registry.
   */
  loadAdapter(adapter: AgentAdapter): void {
    const id = adapter.metadata.id;
    if (this.loaded.has(id)) {
      throw new Error(`Adapter '${id}' is already loaded`);
    }
    this.registry.register(adapter);
    this.loaded.add(id);
  }

  /**
   * Load multiple adapters at once.
   */
  loadAdapters(adapters: AgentAdapter[]): void {
    for (const adapter of adapters) {
      this.loadAdapter(adapter);
    }
  }

  /**
   * Load adapters from a dynamic import of a module.
   */
  async loadFromModule(modulePath: string): Promise<AgentAdapter[]> {
    try {
      const mod: AdapterModule = await import(/* @vite-ignore */ modulePath);
      const adapters: AgentAdapter[] = [];

      if (mod.default && this.isAdapter(mod.default)) {
        adapters.push(mod.default);
      }

      if (mod.adapter && this.isAdapter(mod.adapter)) {
        adapters.push(mod.adapter);
      }

      // Check for exported adapter instances
      for (const [key, value] of Object.entries(mod)) {
        if (key !== "default" && key !== "adapter" && this.isAdapter(value)) {
          adapters.push(value);
        }
      }

      this.loadAdapters(adapters);
      return adapters;
    } catch (error) {
      throw new Error(
        `Failed to load adapters from '${modulePath}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load all adapters from a pre-imported map of modules.
   */
  loadFromMap(adapterMap: Record<string, AgentAdapter>): void {
    for (const [name, adapter] of Object.entries(adapterMap)) {
      try {
        this.loadAdapter(adapter);
      } catch (error) {
        console.warn(`Failed to load adapter '${name}':`, error);
      }
    }
  }

  // ========================================================================
  // Queries
  // ========================================================================

  /**
   * Get a list of all loaded adapter IDs.
   */
  getLoadedAdapters(): AgentId[] {
    return Array.from(this.loaded);
  }

  /**
   * Check if a specific adapter has been loaded.
   */
  isLoaded(id: AgentId): boolean {
    return this.loaded.has(id);
  }

  /**
   * Unload an adapter from the registry.
   */
  unloadAdapter(id: AgentId): boolean {
    const removed = this.registry.unregister(id);
    if (removed) {
      this.loaded.delete(id);
    }
    return removed;
  }

  /**
   * Reload all loaded adapters (useful for hot-reloading in development).
   */
  reloadAll(): void {
    // This is a placeholder — actual reload logic depends on the
    // module loading strategy (ESM HMR, chokidar watcher, etc.)
    console.warn("Adapter reload not yet implemented");
  }

  // ========================================================================
  // Type Guard
  // ========================================================================

  private isAdapter(value: unknown): value is AgentAdapter {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.metadata === "object" &&
      candidate.metadata !== null &&
      typeof (candidate as AgentAdapter).execute === "function" &&
      typeof (candidate as AgentAdapter).resolvePrompt === "function"
    );
  }
}
