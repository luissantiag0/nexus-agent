// ============================================================================
// Nexus Agent Platform — AgentGraph Implementation
// ============================================================================
// Executes agents as a Directed Acyclic Graph (DAG), automatically
// resolving topological order and executing independent branches in parallel.
// Supports conditional edges with data transforms.
// ============================================================================

import type {
  AgentGraph as IAgentGraph,
  GraphNode,
  GraphEdge,
  GraphResult,
  GraphNodeResult,
  AgentContext,
} from "@/engine/types/agent-types";
import type { AgentResult, AgentStatus } from "@/engine/types/agent-types";
import type { AgentId } from "@/lib/agents/registry/types";

import { AgentRunner, DEFAULT_RUNNER_CONFIG } from "./agent-runner";
import { v4 as uuid } from "uuid";

// ============================================================================
// Topological Sort for DAG
// ============================================================================

interface TopoNode {
  id: string;
  inDegree: number;
  outgoing: string[];
}

function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adj = new Map<string, TopoNode>();

  // Initialize all nodes
  for (const node of nodes) {
    adj.set(node.id, { id: node.id, inDegree: 0, outgoing: [] });
  }

  // Build adjacency
  for (const edge of edges) {
    const from = adj.get(edge.from);
    const to = adj.get(edge.to);
    if (from && to) {
      from.outgoing.push(edge.to);
      to.inDegree++;
    }
  }

  // Kahn's algorithm
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

  // Detect cycles
  if (order.length !== nodes.length) {
    throw new GraphCycleError("Graph contains a cycle — execution cannot proceed");
  }

  return order;
}

// ============================================================================
// Graph Error
// ============================================================================

export class GraphCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphCycleError";
  }
}

// ============================================================================
// AgentGraph Implementation
// ============================================================================

export class AgentGraph<
  TNodes extends readonly GraphNode[] = GraphNode[],
  TEdges extends readonly GraphEdge[] = GraphEdge[],
> implements IAgentGraph<TNodes, TEdges>
{
  readonly nodes: TNodes;
  readonly edges: TEdges;
  readonly graphId: string;

  private readonly runners = new Map<string, AgentRunner>();
  private readonly adjacency: Map<string, string[]> = new Map();
  private readonly reverseAdj: Map<string, string[]> = new Map();
  private readonly conditions: Map<string, GraphEdge["condition"]> = new Map();
  private readonly transforms: Map<string, GraphEdge["transform"]> = new Map();

  constructor(
    nodes: TNodes,
    edges: TEdges,
    graphId?: string,
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.graphId = graphId ?? `graph-${uuid().slice(0, 8)}`;

    // Build adjacency maps
    for (const edge of edges) {
      // Forward adjacency
      const forward = this.adjacency.get(edge.from) ?? [];
      forward.push(edge.to);
      this.adjacency.set(edge.from, forward);

      // Reverse adjacency
      const reverse = this.reverseAdj.get(edge.to) ?? [];
      reverse.push(edge.from);
      this.reverseAdj.set(edge.to, reverse);

      // Store condition and transform
      if (edge.condition) this.conditions.set(`${edge.from}->${edge.to}`, edge.condition);
      if (edge.transform) this.transforms.set(`${edge.from}->${edge.to}`, edge.transform);
    }

    // Initialize runners
    for (const node of nodes) {
      this.runners.set(node.id, new AgentRunner(node.agent, {
        timeoutMs: node.timeoutMs ?? DEFAULT_RUNNER_CONFIG.timeoutMs,
        maxRetries: node.maxRetries ?? DEFAULT_RUNNER_CONFIG.maxRetries,
      }));
    }
  }

  // ========================================================================
  // Execution
  // ========================================================================

  async execute(context: AgentContext): Promise<GraphResult> {
    const startedAt = Date.now();

    // Compute topological order
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

    const nodeResults = new Map<string, GraphNodeResult>();
    let finalStatus: GraphResult["status"] = "completed";
    let finalError: string | null = null;

    // Track which nodes have been executed
    const completed = new Set<string>();
    const failed = new Set<string>();
    const skipped = new Set<string>();

    // Execute level by level (batch independent nodes)
    const levels = this.buildLevels(executionOrder);

    for (const level of levels) {
      // Execute all nodes in this level in parallel
      const promises = level.map((nodeId) =>
        this.executeNode(nodeId, context, completed, failed).then((result) => {
          nodeResults.set(nodeId, result);
          if (result.status === "completed") {
            completed.add(nodeId);
          } else if (result.status === "failed" || result.status === "timed_out") {
            failed.add(nodeId);
          } else {
            skipped.add(nodeId);
          }
          return result;
        }),
      );

      const levelResults = await Promise.all(promises);

      // Check for failures
      for (const result of levelResults) {
        if (result.status === "failed" || result.status === "timed_out" || result.status === "circuit_broken") {
          finalStatus = "failed";
          finalError = `Node ${result.nodeId} (${result.agentId}) failed: ${result.result?.error ?? "Unknown error"}`;

          // Skip downstream nodes if source failed
          this.markDownstreamSkipped(result.nodeId, skipped, failed);
          break;
        }
      }

      if (finalStatus === "failed") break;
    }

    const totalDurationMs = Date.now() - startedAt;

    // Build complete node results including skipped nodes
    for (const nodeId of executionOrder) {
      if (!nodeResults.has(nodeId)) {
        nodeResults.set(nodeId, {
          nodeId,
          agentId: this.getNodeAgentId(nodeId),
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

    // Update status for partial completion
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

  async executeSubgraph(tags: string[], context: AgentContext): Promise<GraphResult> {
    const filteredNodes = this.nodes.filter((node) =>
      node.tags?.some((t) => tags.includes(t)),
    );

    if (filteredNodes.length === 0) {
      return {
        graphId: `${this.graphId}-sub`,
        status: "completed",
        nodeResults: new Map(),
        executionOrder: [],
        totalDurationMs: 0,
        error: null,
      };
    }

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = this.edges.filter(
      (e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to),
    );

    const subGraph = new AgentGraph(filteredNodes, filteredEdges, `${this.graphId}-sub`);
    return subGraph.execute(context);
  }

  // ========================================================================
  // Private
  // ========================================================================

  private async executeNode(
    nodeId: string,
    context: AgentContext,
    completed: Set<string>,
    failed: Set<string>,
  ): Promise<GraphNodeResult> {
    const node = this.nodes.find((n) => n.id === nodeId)!;
    const runner = this.runners.get(nodeId)!;
    const startedAt = Date.now();

    try {
      // Check if all dependencies completed
      const deps = this.reverseAdj.get(nodeId) ?? [];
      for (const dep of deps) {
        if (failed.has(dep)) {
          return this.nodeResult(nodeId, node.agent.metadata.id, "skipped", null, startedAt, null);
        }
        if (!completed.has(dep)) {
          return this.nodeResult(nodeId, node.agent.metadata.id, "skipped", null, startedAt, "Dependency not completed");
        }

        // Apply conditional edge logic
        const edgeKey = `${dep}->${nodeId}`;
        const condition = this.conditions.get(edgeKey);
        if (condition && !condition(context)) {
          return this.nodeResult(nodeId, node.agent.metadata.id, "skipped", null, startedAt, "Edge condition not met");
        }

        // Apply data transform
        const transform = this.transforms.get(edgeKey);
        if (transform) {
          transform({}, context); // Transform operates on context
        }
      }

      // Map input and execute
      const input = node.inputMap(context);
      const result = await runner.run(input, context);

      // Map output on success
      if (result.status === "completed" && result.data !== null) {
        const output = {
          schema: runner.adapter.outputSchema.$id,
          schemaVersion: runner.adapter.outputSchema.version,
          payload: result.data as any,
          correlationId: input.correlationId,
          executionId: result.executionId,
          adapterVersion: runner.adapter.metadata.version,
        };
        node.outputMap(output as any, context);
      }

      return this.nodeResult(
        nodeId,
        node.agent.metadata.id,
        result.status,
        result,
        startedAt,
        result.error,
      );
    } catch (error) {
      return this.nodeResult(
        nodeId,
        node.agent.metadata.id,
        "failed",
        null,
        startedAt,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private nodeResult(
    nodeId: string,
    agentId: AgentId,
    status: AgentStatus,
    result: AgentResult | null,
    startedAt: number,
    error: string | null,
  ): GraphNodeResult {
    return {
      nodeId,
      agentId,
      status,
      result,
      dependencies: this.reverseAdj.get(nodeId) ?? [],
      dependents: this.adjacency.get(nodeId) ?? [],
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
    };
  }

  private getNodeAgentId(nodeId: string): AgentId {
    const node = this.nodes.find((n) => n.id === nodeId);
    return node?.agent.metadata.id ?? ("" as AgentId);
  }

  /**
   * Build execution levels: each level contains nodes that can run in parallel.
   */
  private buildLevels(topologicalOrder: string[]): string[][] {
    const levels: string[][] = [];
    const added = new Set<string>();
    const levelMap = new Map<string, number>();

    for (const nodeId of topologicalOrder) {
      const deps = this.reverseAdj.get(nodeId) ?? [];

      if (deps.length === 0) {
        // Root node — level 0
        levelMap.set(nodeId, 0);
        if (!levels[0]) levels[0] = [];
        levels[0].push(nodeId);
      } else {
        // Find max level of dependencies
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
   * Mark all downstream nodes as skipped when a node fails.
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
        if (!visited.has(next)) {
          skipped.add(next);
          failed.delete(next);
          queue.push(next);
        }
      }
    }
  }
}
