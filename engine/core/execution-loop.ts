// ============================================================================
// Nexus Agent Platform — ExecutionLoop
// ============================================================================
// The integrated top-level execution loop that orchestrates DAG execution
// with all new primitives:
//   - AgentGraph for DAG structure and topological ordering
//   - ExecutionStateMachine for per-node state management
//   - ExecutionHistory for comprehensive tracking
//   - GraphValidator for pre-execution validation
//   - ConditionalRouter for conditional branch routing
//   - Synchronizer + ContextMerger for parallel branch sync
//   - AgentRunner for standard node execution with retry logic
// ============================================================================

import type {
  AgentContext,
  GraphNode,
  GraphEdge,
  GraphResult,
  GraphNodeResult,
  GraphNodeType,
  RouteBranch,
  AgentResult,
  AgentStatus,
} from "@/engine/types/agent-types";
import type { AgentId } from "@/lib/agents/registry/types";
import { AgentRunner } from "./agent-runner";
import { ExecutionStateMachine, type NodeExecutionState } from "./execution-state-machine";
import { ExecutionHistory } from "./execution-history";
import { GraphValidator, type ValidationResult } from "./graph-validator";
import { ConditionalRouter, type RouterResult } from "./conditional-router";
import { ConditionEvaluator } from "./condition-evaluator";
import { Synchronizer, type SynchronizerResult } from "./synchronizer";
import { ContextMerger, type MergeStrategy } from "./context-merger";
import { v4 as uuid } from "uuid";

// ============================================================================
// Configuration
// ============================================================================

export interface ExecutionLoopConfig {
  /** Default timeout per node (ms). */
  nodeTimeoutMs: number;
  /** Default max retries per node. */
  maxRetries: number;
  /** Retry backoff strategy. */
  retryBackoff: "exponential" | "linear" | "fixed";
  /** Base retry delay (ms). */
  retryDelayMs: number;
  /** Whether to validate the graph before execution. */
  validateGraph: boolean;
  /** Whether to track execution history. */
  trackHistory: boolean;
}

export const DEFAULT_LOOP_CONFIG: ExecutionLoopConfig = {
  nodeTimeoutMs: 30_000,
  maxRetries: 3,
  retryBackoff: "exponential",
  retryDelayMs: 1_000,
  validateGraph: true,
  trackHistory: true,
};

// ============================================================================
// Topological Sort
// ============================================================================

interface TopoNode {
  id: string;
  inDegree: number;
  outgoing: string[];
}

function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adj = new Map<string, TopoNode>();

  for (const node of nodes) {
    adj.set(node.id, { id: node.id, inDegree: 0, outgoing: [] });
  }

  for (const edge of edges) {
    const from = adj.get(edge.from);
    const to = adj.get(edge.to);
    if (from && to) {
      from.outgoing.push(edge.to);
      to.inDegree++;
    }
  }

  const queue: string[] = [];
  const order: string[] = [];

  for (const [id, node] of adj) {
    if (node.inDegree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    const node = adj.get(current)!;
    for (const neighbor of node.outgoing) {
      const neighborNode = adj.get(neighbor)!;
      neighborNode.inDegree--;
      if (neighborNode.inDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new Error("Graph contains a cycle");
  }

  return order;
}

// ============================================================================
// ExecutionLoop
// ============================================================================

export class ExecutionLoop {
  readonly graphId: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly config: ExecutionLoopConfig;

  private readonly runners = new Map<string, AgentRunner>();
  private readonly adjacency: Map<string, string[]> = new Map();
  private readonly reverseAdj: Map<string, string[]> = new Map();
  private readonly validator: GraphValidator;
  private readonly conditionEvaluator: ConditionEvaluator;
  private readonly conditionalRouter: ConditionalRouter;
  private readonly synchronizer: Synchronizer;
  private readonly contextMerger: ContextMerger;

  // Per-execution state
  private history: ExecutionHistory | null = null;
  private stateMachines: Map<string, ExecutionStateMachine> | null = null;
  private executionId: string = "";

  constructor(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    config?: Partial<ExecutionLoopConfig>,
    graphId?: string,
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.config = { ...DEFAULT_LOOP_CONFIG, ...config };
    this.graphId = graphId ?? `loop-${uuid().slice(0, 8)}`;

    // Build adjacency maps
    for (const edge of edges) {
      const forward = this.adjacency.get(edge.from) ?? [];
      forward.push(edge.to);
      this.adjacency.set(edge.from, forward);

      const reverse = this.reverseAdj.get(edge.to) ?? [];
      reverse.push(edge.from);
      this.reverseAdj.set(edge.to, reverse);
    }

    // Initialize runners for standard nodes only
    for (const node of nodes) {
      const nodeType = node.type ?? "standard";
      if (nodeType === "standard") {
        this.runners.set(
          node.id,
          new AgentRunner(node.agent, {
            timeoutMs: node.timeoutMs ?? this.config.nodeTimeoutMs,
            maxRetries: node.maxRetries ?? this.config.maxRetries,
            retryBackoff: this.config.retryBackoff,
            retryDelayMs: this.config.retryDelayMs,
          }),
        );
      }
    }

    this.validator = new GraphValidator();
    this.conditionEvaluator = new ConditionEvaluator();
    this.conditionalRouter = new ConditionalRouter(this.conditionEvaluator);
    this.contextMerger = new ContextMerger();
    this.synchronizer = new Synchronizer();
  }

  // ========================================================================
  // Main Execution
  // ========================================================================

  /**
   * Execute the graph with full integration of all primitives.
   */
  async execute(context: AgentContext): Promise<GraphResult> {
    const startedAt = Date.now();
    this.executionId = context.plan?.id ?? uuid();
    this.stateMachines = new Map();
    this.history = new ExecutionHistory(this.executionId);

    // ── Phase 1: Validation ──────────────────────────────────────────
    if (this.config.validateGraph) {
      const validation = this.validator.validate(
        [...this.nodes] as GraphNode[],
        [...this.edges] as GraphEdge[],
      );
      if (!validation.valid) {
        const errorMsg = validation.errors.map((e) => e.message).join("; ");
        return {
          graphId: this.graphId,
          status: "failed",
          nodeResults: new Map(),
          executionOrder: [],
          totalDurationMs: Date.now() - startedAt,
          error: `Graph validation failed: ${errorMsg}`,
        };
      }
    }

    // ── Phase 2: Topological Sort ────────────────────────────────────
    let executionOrder: string[];
    try {
      executionOrder = topologicalSort([...this.nodes], [...this.edges]);
    } catch (error) {
      return {
        graphId: this.graphId,
        status: "failed",
        nodeResults: new Map(),
        executionOrder: [],
        totalDurationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Topological sort failed",
      };
    }

    // ── Phase 3: Initialize State Machines ────────────────────────────
    for (const node of this.nodes) {
      this.stateMachines.set(node.id, new ExecutionStateMachine("pending"));
    }

    // ── Phase 4: Execute Level by Level ───────────────────────────────
    const nodeResults = new Map<string, GraphNodeResult>();
    const completed = new Set<string>();
    const failed = new Set<string>();
    const skipped = new Set<string>();
    const routerSkipped = new Set<string>(); // Skipped by conditional router

    const levels = this.buildLevels(executionOrder);

    let finalStatus: GraphResult["status"] = "completed";
    let finalError: string | null = null;

    for (const level of levels) {
      // Execute all nodes in this level in parallel
      const promises = level.map((nodeId) => {
        // Check if this node was skipped by a conditional router
        if (routerSkipped.has(nodeId)) {
          return this.createSkippedResult(nodeId, context, completed, failed, "Skipped by conditional router");
        }

        const sm = this.stateMachines!.get(nodeId)!;
        if (!sm.canTransition("running")) {
          // Node is already in a terminal state; return existing
          return this.createSkippedResult(nodeId, context, completed, failed, `Node in state '${sm.currentState}'`);
        }

        return this.executeNode(nodeId, context, completed, failed, skipped, routerSkipped);
      });

      const levelResults = await Promise.all(promises);

      for (const result of levelResults) {
        nodeResults.set(result.nodeId, result);
        if (result.status === "completed") {
          completed.add(result.nodeId);
        } else if (result.status === "failed" || result.status === "timed_out" || result.status === "circuit_broken") {
          failed.add(result.nodeId);
        } else {
          skipped.add(result.nodeId);
        }
      }

      // Check for failures and propagate skip
      for (const result of levelResults) {
        if (result.status === "failed" || result.status === "timed_out" || result.status === "circuit_broken") {
          finalStatus = "failed";
          finalError = `Node ${result.nodeId} (${result.agentId}) failed: ${result.result?.error ?? result.error ?? "Unknown error"}`;

          this.markDownstreamSkipped(result.nodeId, skipped, failed);
          break;
        }
      }

      if (finalStatus === "failed") break;

      // After a level completes, handle any conditional_router skip propagation
      // for routes that were NOT selected
      this.propagateRouterSkips(routerSkipped, skipped, failed);
    }

    // ── Phase 5: Build Result ────────────────────────────────────────
    const totalDurationMs = Date.now() - startedAt;

    // Fill in missing node results for skipped/pending nodes
    for (const nodeId of executionOrder) {
      if (!nodeResults.has(nodeId)) {
        const node = this.nodes.find((n) => n.id === nodeId);
        nodeResults.set(nodeId, {
          nodeId,
          agentId: node?.agent?.metadata?.id ?? ("" as AgentId),
          status: "skipped",
          result: null,
          dependencies: this.reverseAdj.get(nodeId) ?? [],
          dependents: this.adjacency.get(nodeId) ?? [],
          startedAt: "",
          completedAt: null,
          durationMs: 0,
        });
      }
    }

    if (finalStatus === "completed" && skipped.size > 0) {
      finalStatus = "partial";
    }

    return {
      graphId: this.graphId,
      status: finalStatus,
      nodeResults,
      executionOrder,
      totalDurationMs,
      error: finalError,
    };
  }

  // ========================================================================
  // Node Execution
  // ========================================================================

  /**
   * Execute a single node based on its type.
   */
  private async executeNode(
    nodeId: string,
    context: AgentContext,
    completed: Set<string>,
    failed: Set<string>,
    skipped: Set<string>,
    routerSkipped: Set<string>,
  ): Promise<GraphNodeResult> {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return this.buildNodeResult(nodeId, "" as AgentId, "failed", null, {
        error: `Node '${nodeId}' not found`,
      });
    }

    const nodeType: GraphNodeType = node.type ?? "standard";
    const sm = this.stateMachines!.get(nodeId)!;

    // Record state in history
    if (this.config.trackHistory && this.history) {
      this.history.record({
        nodeId,
        agentId: node.agent?.metadata?.id ?? ("" as AgentId),
        state: sm.currentState,
        error: null,
        retryCount: 0,
      });
    }

    // ── Check dependencies ────────────────────────────────────────────
    const deps = this.reverseAdj.get(nodeId) ?? [];
    for (const dep of deps) {
      if (failed.has(dep) || routerSkipped.has(dep)) {
        return this.createSkippedResult(nodeId, context, completed, failed,
          `Dependency '${dep}' failed`);
      }
      if (skipped.has(dep)) {
        return this.createSkippedResult(nodeId, context, completed, failed,
          `Dependency '${dep}' was skipped`);
      }
    }

    // ── Handle by node type ────────────────────────────────────────────
    switch (nodeType) {
      case "conditional_router":
        return this.executeConditionalRouter(node, context, completed, failed, skipped, routerSkipped, sm);

      case "synchronizer":
        return this.executeSynchronizer(node, context, completed, failed, skipped, sm);

      default:
        return this.executeStandardNode(node, context, completed, failed, sm);
    }
  }

  // ========================================================================
  // Standard Node Execution
  // ========================================================================

  /**
   * Execute a standard agent node using AgentRunner with retry logic.
   */
  private async executeStandardNode(
    node: GraphNode,
    context: AgentContext,
    completed: Set<string>,
    failed: Set<string>,
    sm: ExecutionStateMachine,
  ): Promise<GraphNodeResult> {
    const nodeId = node.id;
    const startedAt = Date.now();

    try {
      // Start state machine
      sm.start();

      const runner = this.runners.get(nodeId);

      // Build input
      const input = node.inputMap(context);

      // Execute with AgentRunner (which handles retries, circuit breaker, rate limit)
      let result: AgentResult;
      if (runner) {
        result = await runner.run(input, context);
      } else {
        // Fallback: direct agent execution
        try {
          const agentResult = await node.agent.execute(input, context as any);
          result = {
            executionId: uuid(),
            agentId: node.agent.metadata.id,
            status: "completed",
            data: agentResult.payload as any,
            error: null,
            errorDetails: null,
            validation: null,
            performance: {
              startedAt: new Date(startedAt).toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startedAt,
              retryCount: 0,
            },
            meta: {},
          };
        } catch (err) {
          result = {
            executionId: uuid(),
            agentId: node.agent.metadata.id,
            status: "failed",
            data: null,
            error: err instanceof Error ? err.message : String(err),
            errorDetails: null,
            validation: null,
            performance: {
              startedAt: new Date(startedAt).toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startedAt,
              retryCount: 0,
            },
            meta: {},
          };
        }
      }

      // Map output on success
      if (result.status === "completed" && result.data !== null) {
        const output = {
          schema: runner?.adapter.outputSchema.$id ?? node.agent.metadata.id,
          schemaVersion: runner?.adapter.outputSchema.version ?? "1.0",
          payload: result.data as any,
          correlationId: input.correlationId,
          executionId: result.executionId,
          adapterVersion: runner?.adapter.metadata.version ?? "1.0",
        };
        node.outputMap(output as any, context);
      }

      // Update state machine
      const agentStatus = result.status;
      const finalStatus = this.mapAgentStatusToExecutionState(agentStatus);

      if (sm.canTransition(finalStatus)) {
        sm.transition(finalStatus);
      }

      // Update history
      if (this.config.trackHistory && this.history) {
        this.history.updateCompletion(nodeId, sm.currentState, result.error);
      }

      return this.buildNodeResult(nodeId, node.agent.metadata.id, agentStatus, result, {
        startedAt,
        error: result.error,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (sm.canTransition("failed")) {
        sm.transition("failed");
      }

      if (this.config.trackHistory && this.history) {
        this.history.updateCompletion(nodeId, "failed", errorMsg);
      }

      return this.buildNodeResult(nodeId, node.agent.metadata.id, "failed", null, {
        startedAt,
        error: errorMsg,
      });
    }
  }

  // ========================================================================
  // Conditional Router Execution
  // ========================================================================

  /**
   * Execute a conditional_router node: evaluate branches and select route.
   * Non-selected branches are marked for skip.
   */
  private async executeConditionalRouter(
    node: GraphNode,
    context: AgentContext,
    completed: Set<string>,
    failed: Set<string>,
    skipped: Set<string>,
    routerSkipped: Set<string>,
    sm: ExecutionStateMachine,
  ): Promise<GraphNodeResult> {
    const nodeId = node.id;
    const startedAt = Date.now();
    const routes: RouteBranch[] = node.routes ?? [];

    try {
      sm.start();

      // Evaluate branches
      const routerResult: RouterResult = await this.conditionalRouter.evaluateBranches(
        routes,
        context,
        // If a downstream edge exists to a node not listed in routes, it's the default
        this.findDefaultTarget(nodeId),
      );

      const selectedTarget = routerResult.selectedBranch?.targetNodeId ?? routerResult.defaultTarget;

      if (selectedTarget) {
        // All other potential targets should be skipped
        const allTargets = this.adjacency.get(nodeId) ?? [];
        for (const target of allTargets) {
          if (target !== selectedTarget) {
            routerSkipped.add(target);
          }
        }

        // Log the routing decision
        if (this.config.trackHistory && this.history) {
          this.history.updateCompletion(nodeId, "completed", null, {
            selectedTarget,
            explanation: routerResult.explanation,
            evaluations: routerResult.evaluations.map((e) => ({
              target: e.branch.targetNodeId,
              label: e.branch.label,
              matched: e.result,
            })),
          });
        }
      }

      sm.transition("completed");

      return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "completed", null, {
        startedAt,
        metadata: {
          routerResult: {
            selectedTarget,
            explanation: routerResult.explanation,
            branchCount: routes.length,
            matchedBranch: routerResult.selectedBranch?.label ?? null,
          },
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (sm.canTransition("failed")) {
        sm.transition("failed");
      }

      if (this.config.trackHistory && this.history) {
        this.history.updateCompletion(nodeId, "failed", errorMsg);
      }

      return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "failed", null, {
        startedAt,
        error: errorMsg,
      });
    }
  }

  // ========================================================================
  // Synchronizer Execution
  // ========================================================================

  /**
   * Execute a synchronizer node: wait for upstream nodes, merge their context.
   */
  private async executeSynchronizer(
    node: GraphNode,
    context: AgentContext,
    completed: Set<string>,
    failed: Set<string>,
    skipped: Set<string>,
    sm: ExecutionStateMachine,
  ): Promise<GraphNodeResult> {
    const nodeId = node.id;
    const startedAt = Date.now();

    try {
      sm.start();

      // Move to waiting state while upstream nodes complete
      if (sm.canTransition("waiting")) {
        sm.transition("waiting");
      }

      // Get upstream node IDs
      const upstreamNodeIds = this.reverseAdj.get(nodeId) ?? [];

      if (upstreamNodeIds.length === 0) {
        // Nothing to synchronize — complete immediately
        sm.transition("completed");
        return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "completed", null, {
          startedAt,
          metadata: { synchronized: true, upstreamCount: 0 },
        });
      }

      // Configure synchronizer
      const mergeStrategy: MergeStrategy = (node as any).mergeStrategy ?? "shallow";
      const timeoutMs = (node as any).synchronizerTimeoutMs ?? 30_000;
      const requireAll = (node as any).requireAllUpstream ?? true;

      this.synchronizer = new Synchronizer({
        timeoutMs,
        mergeConfig: { strategy: mergeStrategy },
        requireAll,
      });

      // Collect node results for context merging
      const getNodeResult = async (nid: string): Promise<Record<string, unknown> | null> => {
        // Get result from context (outputs are written there by outputMap)
        try {
          const snapshot = context.snapshot();
          if (snapshot && typeof snapshot === "object") {
            const data = (snapshot as Record<string, unknown>)[nid];
            if (data && typeof data === "object") {
              return data as Record<string, unknown>;
            }
          }
          return null;
        } catch {
          return null;
        }
      };

      // Build node state map
      const nodeStates = new Map<string, string>();
      for (const uid of upstreamNodeIds) {
        const upstreamSm = this.stateMachines!.get(uid);
        nodeStates.set(uid, upstreamSm?.currentState ?? "pending");
      }

      // Wait for upstream nodes and merge
      const syncResult: SynchronizerResult = await this.synchronizer.waitForNodes(
        upstreamNodeIds,
        getNodeResult,
        nodeStates,
        context,
      );

      if (syncResult.success) {
        // Apply merged state to context
        if (syncResult.mergedState) {
          const existingSnapshot = context.snapshot();
          const merged = { ...existingSnapshot, ...syncResult.mergedState };
          context.restore(merged as any);
        }

        if (sm.canTransition("running")) {
          sm.transition("running");
        }
        sm.transition("completed");

        if (this.config.trackHistory && this.history) {
          this.history.updateCompletion(nodeId, "completed", null, {
            upstreamCompleted: syncResult.completedNodes,
            mergeStrategy,
          });
        }

        return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "completed", null, {
          startedAt,
          metadata: {
            synchronized: true,
            upstreamCount: upstreamNodeIds.length,
            completedNodes: syncResult.completedNodes,
            failedNodes: syncResult.failedNodes,
            timedOutNodes: syncResult.timedOutNodes,
            mergeStrategy,
          },
        });
      } else {
        // Synchronization failed
        if (sm.canTransition("failed")) {
          sm.transition("failed");
        }

        const errorMsg = syncResult.failedNodes.length > 0
          ? `Upstream nodes failed: ${syncResult.failedNodes.join(", ")}`
          : syncResult.timedOutNodes.length > 0
            ? `Upstream nodes timed out: ${syncResult.timedOutNodes.join(", ")}`
            : "Synchronization failed";

        if (this.config.trackHistory && this.history) {
          this.history.updateCompletion(nodeId, "failed", errorMsg);
        }

        return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "failed", null, {
          startedAt,
          error: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (sm.canTransition("failed")) {
        sm.transition("failed");
      }

      if (this.config.trackHistory && this.history) {
        this.history.updateCompletion(nodeId, "failed", errorMsg);
      }

      return this.buildNodeResult(nodeId, node.agent?.metadata?.id ?? ("" as AgentId), "failed", null, {
        startedAt,
        error: errorMsg,
      });
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get the execution history (if tracking is enabled).
   */
  getHistory(): ExecutionHistory | null {
    return this.history;
  }

  /**
   * Get the state machine for a specific node.
   */
  getStateMachine(nodeId: string): ExecutionStateMachine | undefined {
    return this.stateMachines?.get(nodeId);
  }

  /**
   * Get the validation result for the current graph.
   */
  validate(): ValidationResult {
    return this.validator.validate(
      [...this.nodes] as GraphNode[],
      [...this.edges] as GraphEdge[],
    );
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Find the default target for a conditional router (the edge target
   * that isn't covered by a route).
   */
  private findDefaultTarget(nodeId: string): string | undefined {
    const outgoing = this.adjacency.get(nodeId) ?? [];
    const node = this.nodes.find((n) => n.id === nodeId);
    const routedTargets = new Set((node?.routes ?? []).map((r: RouteBranch) => r.targetNodeId));

    // The default target is the first outgoing edge target not in routes
    for (const target of outgoing) {
      if (!routedTargets.has(target)) {
        return target;
      }
    }

    return undefined;
  }

  /**
   * Build execution levels from topological order.
   */
  private buildLevels(topologicalOrder: string[]): string[][] {
    const levels: string[][] = [];
    const levelMap = new Map<string, number>();

    for (const nodeId of topologicalOrder) {
      const deps = this.reverseAdj.get(nodeId) ?? [];

      if (deps.length === 0) {
        levelMap.set(nodeId, 0);
        if (!levels[0]) levels[0] = [];
        levels[0].push(nodeId);
      } else {
        let maxDepLevel = 0;
        for (const dep of deps) {
          const depLevel = levelMap.get(dep) ?? 0;
          maxDepLevel = Math.max(maxDepLevel, depLevel);
        }
        const myLevel = maxDepLevel + 1;
        levelMap.set(nodeId, myLevel);
        if (!levels[myLevel]) levels[myLevel] = [];
        levels[myLevel].push(nodeId);
      }
    }

    return levels;
  }

  /**
   * Mark all downstream nodes as skipped.
   */
  private markDownstreamSkipped(
    nodeId: string,
    skipped: Set<string>,
    failed: Set<string>,
  ): void {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const downstream = this.adjacency.get(current) ?? [];
      for (const next of downstream) {
        if (!visited.has(next) && !failed.has(next)) {
          skipped.add(next);
          queue.push(next);
        }
      }
    }
  }

  /**
   * Propagate conditional router skip decisions downstream.
   */
  private propagateRouterSkips(
    routerSkipped: Set<string>,
    skipped: Set<string>,
    failed: Set<string>,
  ): void {
    const visited = new Set<string>();
    const queue = [...routerSkipped];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      skipped.add(current);
      routerSkipped.delete(current);

      const downstream = this.adjacency.get(current) ?? [];
      for (const next of downstream) {
        if (!visited.has(next) && !failed.has(next)) {
          // Only propagate if this is the ONLY path to the downstream node
          // (check if it has other non-skipped paths)
          const deps = this.reverseAdj.get(next) ?? [];
          const allPathsSkipped = deps.every(
            (d) => skipped.has(d) || routerSkipped.has(d) || visited.has(d),
          );
          if (allPathsSkipped) {
            queue.push(next);
          }
        }
      }
    }
  }

  /**
   * Create a skipped result for a node.
   */
  private async createSkippedResult(
    nodeId: string,
    _context: AgentContext,
    _completed: Set<string>,
    _failed: Set<string>,
    reason?: string,
  ): Promise<GraphNodeResult> {
    const node = this.nodes.find((n) => n.id === nodeId);
    const sm = this.stateMachines?.get(nodeId);

    if (sm && sm.canTransition("skipped")) {
      sm.transition("skipped");
    }

    if (this.config.trackHistory && this.history) {
      this.history.updateCompletion(nodeId, "skipped", reason ?? null);
    }

    return {
      nodeId,
      agentId: node?.agent?.metadata?.id ?? ("" as AgentId),
      status: "skipped",
      result: null,
      dependencies: this.reverseAdj.get(nodeId) ?? [],
      dependents: this.adjacency.get(nodeId) ?? [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
      error: reason ?? null,
    };
  }

  /**
   * Map an AgentResult status to an ExecutionStateMachine state.
   */
  private mapAgentStatusToExecutionState(status: AgentStatus): NodeExecutionState {
    switch (status) {
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      case "timed_out":
        return "timed_out";
      case "circuit_broken":
        return "circuit_broken";
      case "skipped":
        return "skipped";
      case "running":
        return "running";
      default:
        return "completed";
    }
  }

  /**
   * Build a GraphNodeResult from execution data.
   */
  private buildNodeResult(
    nodeId: string,
    agentId: AgentId | string,
    status: AgentStatus,
    result: AgentResult | null,
    opts: {
      startedAt?: number;
      error?: string | null;
      metadata?: Record<string, unknown>;
    } = {},
  ): GraphNodeResult {
    const now = Date.now();
    const started = opts.startedAt ?? now;

    return {
      nodeId,
      agentId: agentId as AgentId,
      status,
      result,
      dependencies: this.reverseAdj.get(nodeId) ?? [],
      dependents: this.adjacency.get(nodeId) ?? [],
      startedAt: new Date(started).toISOString(),
      completedAt: (status !== "running" && status !== "pending") ? new Date().toISOString() : null,
      durationMs: (status !== "running" && status !== "pending") ? now - started : 0,
      error: opts.error ?? result?.error ?? null,
    };
  }
}
