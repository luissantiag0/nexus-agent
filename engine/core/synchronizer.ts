// ============================================================================
// Nexus Agent Platform — Synchronizer Implementation
// ============================================================================
// Waits for multiple upstream nodes to complete, collects their context
// contributions, and merges them using a configurable merge strategy.
// Used by synchronizer-type graph nodes to synchronize parallel branches.
// ============================================================================

import type { AgentContext } from "@/engine/types/agent-types";
import {
  ContextMerger,
  type MergeConfig,
  type MergeSource,
  type MergeStrategy,
  DEFAULT_MERGE_CONFIG,
} from "./context-merger";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a Synchronizer node.
 */
export interface SynchronizerConfig {
  timeoutMs?: number;
  mergeConfig?: Partial<MergeConfig>;
  requireAll?: boolean;
}

/**
 * The result of a synchronization operation.
 */
export interface SynchronizerResult {
  mergedState: Record<string, unknown>;
  completedNodes: string[];
  timedOutNodes: string[];
  failedNodes: string[];
  syncDurationMs: number;
  success: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SYNCHRONIZER_CONFIG: Required<SynchronizerConfig> = {
  timeoutMs: 30_000,
  mergeConfig: DEFAULT_MERGE_CONFIG,
  requireAll: true,
};

// ============================================================================
// Synchronizer
// ============================================================================

export class Synchronizer {
  private merger: ContextMerger;
  private config: Required<SynchronizerConfig>;

  constructor(config?: SynchronizerConfig) {
    this.merger = new ContextMerger();
    this.config = {
      timeoutMs: config?.timeoutMs ?? DEFAULT_SYNCHRONIZER_CONFIG.timeoutMs,
      mergeConfig: {
        ...DEFAULT_MERGE_CONFIG,
        ...config?.mergeConfig,
      },
      requireAll: config?.requireAll ?? DEFAULT_SYNCHRONIZER_CONFIG.requireAll,
    };
  }

  /**
   * Wait for all upstream nodes to complete, then merge their context.
   */
  async waitForNodes(
    upstreamNodeIds: string[],
    getNodeResult: (nodeId: string) => Promise<Record<string, unknown> | null>,
    nodeStates: Map<string, string>,
    context: AgentContext,
  ): Promise<SynchronizerResult> {
    const startedAt = Date.now();
    const completedNodes: string[] = [];
    const timedOutNodes: string[] = [];
    const failedNodes: string[] = [];

    if (upstreamNodeIds.length === 0) {
      return {
        mergedState: {},
        completedNodes: [],
        timedOutNodes: [],
        failedNodes: [],
        syncDurationMs: 0,
        success: true,
      };
    }

    const deadline = Date.now() + this.config.timeoutMs;
    const pollIntervalMs = 10;

    while (Date.now() < deadline) {
      let allDone = true;

      for (const nodeId of upstreamNodeIds) {
        if (completedNodes.includes(nodeId) || failedNodes.includes(nodeId)) {
          continue;
        }

        const state = nodeStates.get(nodeId) ?? "pending";

        if (state === "completed") {
          completedNodes.push(nodeId);
        } else if (state === "failed" || state === "timed_out" || state === "circuit_broken") {
          failedNodes.push(nodeId);
          if (this.config.requireAll) {
            const syncDurationMs = Date.now() - startedAt;
            return {
              mergedState: {},
              completedNodes,
              timedOutNodes,
              failedNodes,
              syncDurationMs,
              success: false,
            };
          }
        } else {
          allDone = false;
        }
      }

      if (allDone) break;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    for (const nodeId of upstreamNodeIds) {
      if (!completedNodes.includes(nodeId) && !failedNodes.includes(nodeId)) {
        timedOutNodes.push(nodeId);
      }
    }

    const success =
      timedOutNodes.length === 0 &&
      (!this.config.requireAll || failedNodes.length === 0);

    const sources: MergeSource[] = [];
    for (const nodeId of completedNodes) {
      const nodeData = await getNodeResult(nodeId);
      if (nodeData && Object.keys(nodeData).length > 0) {
        sources.push({
          nodeId,
          data: nodeData,
          timestamp: new Date().toISOString(),
        });
      }
    }

    let mergedState: Record<string, unknown>;
    try {
      mergedState = this.merger.merge(sources, this.config.mergeConfig);
      const existingSnapshot = context.snapshot();
      mergedState = { ...existingSnapshot, ...mergedState };
    } catch {
      return {
        mergedState: {},
        completedNodes,
        timedOutNodes,
        failedNodes,
        syncDurationMs: Date.now() - startedAt,
        success: false,
      };
    }

    return {
      mergedState,
      completedNodes,
      timedOutNodes,
      failedNodes,
      syncDurationMs: Date.now() - startedAt,
      success,
    };
  }

  get requireAll(): boolean {
    return this.config.requireAll;
  }
}
