// ============================================================================
// Nexus Agent Platform — ContextMerger Implementation
// ============================================================================
// Merges context contributions from multiple upstream nodes using
// configurable merge strategies: shallow, deep, overwrite.
// Used by Synchronizer nodes to combine parallel branch results.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * Merge strategy for combining context contributions.
 * - shallow:  First-level keys are merged (Object.assign style).
 * - deep:     Recursive deep merge of nested objects.
 * - overwrite: Later sources completely overwrite earlier ones.
 */
export type MergeStrategy = "shallow" | "deep" | "overwrite";

/**
 * Conflict resolution when multiple sources define the same key.
 */
export type ConflictResolution = "first_wins" | "last_wins" | "throw";

/**
 * Configuration for the merge operation.
 */
export interface MergeConfig {
  strategy: MergeStrategy;
  conflictResolution?: ConflictResolution;
}

/**
 * A single merge source contributed by a node execution.
 */
export interface MergeSource {
  nodeId: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MERGE_CONFIG: Required<MergeConfig> = {
  strategy: "shallow",
  conflictResolution: "last_wins",
};

// ============================================================================
// ContextMerger
// ============================================================================

export class ContextMerger {
  /**
   * Merge multiple context sources into a single object.
   */
  merge(
    sources: MergeSource[],
    config?: Partial<MergeConfig>,
  ): Record<string, unknown> {
    const cfg: Required<MergeConfig> = { ...DEFAULT_MERGE_CONFIG, ...config };

    switch (cfg.strategy) {
      case "shallow":
        return this.shallowMerge(sources, cfg.conflictResolution);
      case "deep":
        return this.deepMerge(sources, cfg.conflictResolution);
      case "overwrite":
        return this.overwriteMerge(sources);
      default:
        return this.shallowMerge(sources, cfg.conflictResolution);
    }
  }

  /**
   * Merge sources with existing state.
   */
  mergeWithState(
    existingState: Record<string, unknown>,
    sources: MergeSource[],
    config?: Partial<MergeConfig>,
  ): Record<string, unknown> {
    const merged = this.merge(sources, config);
    return { ...existingState, ...merged };
  }

  // ========================================================================
  // Strategy Implementations
  // ========================================================================

  private shallowMerge(
    sources: MergeSource[],
    conflictResolution: ConflictResolution,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (conflictResolution === "first_wins") {
      for (let i = sources.length - 1; i >= 0; i--) {
        const src = sources[i];
        for (const [key, value] of Object.entries(src.data)) {
          if (!(key in result)) {
            result[key] = value;
          }
        }
      }
    } else if (conflictResolution === "throw") {
      for (const src of sources) {
        for (const key of Object.keys(src.data)) {
          if (key in result) {
            throw new Error(
              `[ContextMerger] Conflict on key '${key}' from node '${src.nodeId}'`,
            );
          }
        }
        Object.assign(result, src.data);
      }
    } else {
      for (const src of sources) {
        Object.assign(result, src.data);
      }
    }

    return result;
  }

  private deepMerge(
    sources: MergeSource[],
    conflictResolution: ConflictResolution,
  ): Record<string, unknown> {
    let result: Record<string, unknown> = {};

    if (conflictResolution === "first_wins") {
      for (let i = sources.length - 1; i >= 0; i--) {
        result = this.deepMergeObjects(sources[i].data, result);
      }
    } else if (conflictResolution === "throw") {
      for (const src of sources) {
        this.checkConflicts(result, src.data, src.nodeId);
        result = this.deepMergeObjects(result, src.data);
      }
    } else {
      for (const src of sources) {
        result = this.deepMergeObjects(result, src.data);
      }
    }

    return result;
  }

  private overwriteMerge(sources: MergeSource[]): Record<string, unknown> {
    if (sources.length === 0) return {};
    const last = sources[sources.length - 1];
    return { ...last.data };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private deepMergeObjects(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        key in result &&
        result[key] !== null &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key] as object)
      ) {
        result[key] = this.deepMergeObjects(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private checkConflicts(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
    sourceNodeId: string,
  ): void {
    for (const key of Object.keys(incoming)) {
      if (key in existing) {
        throw new Error(
          `[ContextMerger] Conflict on key '${key}' from node '${sourceNodeId}'`,
        );
      }
    }
  }
}

export const contextMerger = new ContextMerger();
