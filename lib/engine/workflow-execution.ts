// ============================================================================
// Workflow Execution — DAG Execution Plan & ExecutionLoop Types
// ============================================================================
// This module defines the runtime types and DAG builder that the ExecutionLoop
// consumes. These are the compiled, ready-to-execute representations derived
// from a WorkflowDefinition. The DAG builder produces ordered levels of
// parallel-executable nodes using Kahn's algorithm.
// ============================================================================

import type { AgentId } from "../agent-registry/types";
import { agentRegistry } from "../agent-registry/registry";

// ---------------------------------------------------------------------------
// Execution Primitives
// ---------------------------------------------------------------------------

/**
 * Identifies a single node within a workflow execution plan.
 */
export type ExecutionNodeId = string;

/**
 * Identifies a workflow execution instance.
 */
export type ExecutionId = string;

// ---------------------------------------------------------------------------
// Workflow Mode — topology of the execution plan
// ---------------------------------------------------------------------------

/**
 * The execution topology of a workflow.
 * - `SINGLE_AGENT`: a single agent node, no orchestration needed
 * - `CHAIN`: strictly sequential steps (each step depends on the prior)
 * - `DAG`: directed acyclic graph with potential parallelism
 */
export type WorkflowMode = "SINGLE_AGENT" | "CHAIN" | "DAG";

// ---------------------------------------------------------------------------
// WorkflowDefinition (execution-layer schema)
// ---------------------------------------------------------------------------

/**
 * A compiled workflow definition ready for consumption by the ExecutionLoop.
 *
 * Unlike the user-facing WorkflowDefinition in ./workflow-definition.ts (which
 * uses `graph.nodes: Record<NodeId, NodeDefinition>` and supports router/
 * parallel/synchronizer node types), this is the **execution-layer** format.
 * All higher-level node types (routers, forks, synchronizers) have been
 * compiled down to a flat set of agent execution nodes with typed edges.
 *
 * The ExecutionLoop iterates over `levels` (produced by topological sort):
 * each level is a set of nodes that can execute in parallel.
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier */
  workflowId: string;
  /** Human-readable name */
  name: string;
  /** Execution topology */
  mode: WorkflowMode;
  /** Flat list of all nodes in the workflow */
  nodes: WorkflowNode[];
  /** Directed edges between nodes */
  edges: WorkflowEdge[];
  /** Execution-level configuration */
  config: WorkflowConfig;
  /** Optional — pre-computed topological levels (populated by DagBuilder) */
  levels?: ExecutionNode[][];
}

// ---------------------------------------------------------------------------
// WorkflowNode — a single executable step in the plan
// ---------------------------------------------------------------------------

/**
 * A single executable node in the workflow plan.
 * Each node maps to one agent invocation with defined input/output contracts.
 */
export interface WorkflowNode {
  /** Unique identifier within the workflow */
  nodeId: ExecutionNodeId;
  /** The registered agent to invoke (must exist in agentRegistry) */
  agentId: AgentId;
  /** Human-readable description of this node's purpose */
  description: string;
  /**
   * Maps keys from the shared execution context to the agent's input fields.
   * Key = context path, Value = agent input parameter name.
   */
  inputMapping: Record<string, string>;
  /**
   * Maps the agent's output fields back to the shared execution context.
   * Key = agent output field name, Value = context path.
   */
  outputMapping: Record<string, string>;
  /** Maximum execution time in milliseconds before timeout */
  timeoutMs: number;
  /** Maximum number of retry attempts on transient failure */
  maxRetries: number;
}

// ---------------------------------------------------------------------------
// WorkflowEdge — typed dependency between two nodes
// ---------------------------------------------------------------------------

/**
 * A directed edge between two workflow nodes.
 * The edge type determines how the execution engine interprets the relationship.
 */
export interface WorkflowEdge {
  /** Source node ID */
  from: ExecutionNodeId;
  /** Target node ID */
  to: ExecutionNodeId;
  /**
   * The nature of the dependency:
   * - `SEQUENTIAL`: strict ordering — "to" runs after "from" completes
   * - `CONDITIONAL_TRUE`: "to" runs only if "from" produced a truthy condition
   * - `CONDITIONAL_FALSE`: "to" runs only if "from" produced a falsy condition
   * - `DATA_DEPENDENCY`: "to" needs data from "from" but no strict ordering
   *   (the engine must ensure data availability without forcing sequential order)
   */
  type: "SEQUENTIAL" | "CONDITIONAL_TRUE" | "CONDITIONAL_FALSE" | "DATA_DEPENDENCY";
  /**
   * Optional condition expression evaluated at runtime.
   * Required for CONDITIONAL_TRUE / CONDITIONAL_FALSE edges.
   */
  condition?: {
    /** The context path or output field to evaluate */
    field: string;
    /** Comparison operator */
    operator: "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "EXISTS" | "NOT_EXISTS";
    /** Value to compare against (omitted for EXISTS / NOT_EXISTS) */
    value?: unknown;
  };
}

// ---------------------------------------------------------------------------
// WorkflowConfig — execution policy for the plan
// ---------------------------------------------------------------------------

/**
 * Execution-level configuration that governs how the ExecutionLoop processes
 * the workflow plan.
 */
export interface WorkflowConfig {
  /** Maximum number of nodes to execute concurrently within a level */
  parallelLimit: number;
  /**
   * Behavior when a node fails and retries are exhausted:
   * - `ABORT`: halt the entire workflow immediately
   * - `SKIP`: mark the node as failed, skip dependents, continue
   * - `CONTINUE`: mark the node as failed, continue dependents with degraded data
   */
  failBehavior: "ABORT" | "SKIP" | "CONTINUE";
  /** If true, persist context between workflow restarts */
  contextPersistence: boolean;
  /** If true, emit detailed tracing events for observability */
  tracingEnabled: boolean;
}

// ---------------------------------------------------------------------------
// ExecutionNode — runtime wrapper produced by DagBuilder
// ---------------------------------------------------------------------------

/**
 * A runtime execution node produced by the DagBuilder.
 * Wraps a WorkflowNode with computed metadata: depth level, dependency count,
 * and resolved agent adapter reference.
 */
export interface ExecutionNode {
  /** Reference to the original WorkflowNode */
  node: WorkflowNode;
  /** Topological depth level (0 = root, no dependencies) */
  level: number;
  /** Number of direct predecessor edges that must resolve before this runs */
  dependencyCount: number;
  /** IDs of all direct predecessor nodes */
  dependsOn: ExecutionNodeId[];
  /** IDs of all direct successor nodes */
  dependentNodes: ExecutionNodeId[];
  /** Set by the ExecutionLoop during runtime */
  status: ExecutionNodeStatus;
  /** Runtime error if execution failed */
  error?: string;
  /** Unix timestamp when execution started */
  startedAt?: number;
  /** Unix timestamp when execution completed */
  completedAt?: number;
}

/**
 * Runtime status of an execution node.
 */
export type ExecutionNodeStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "timed_out";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Result of validating a WorkflowDefinition.
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// DAG Builder
// ---------------------------------------------------------------------------

/**
 * DagBuilder compiles a WorkflowDefinition into an ordered set of
 * ExecutionNode levels, performing topological sort with cycle detection.
 *
 * The output is an array of levels, where each level is an array of
 * ExecutionNodes that can be executed in parallel.
 */
export class DagBuilder {
  private readonly registry: typeof agentRegistry;

  constructor(registry?: typeof agentRegistry) {
    this.registry = registry ?? agentRegistry;
  }

  /**
   * Build an execution plan from a WorkflowDefinition.
   *
   * Steps:
   * 1. Validate the definition (structure, agent IDs, cycles)
   * 2. Create ExecutionNode wrappers
   * 3. Topological sort into parallel-executable levels
   * 4. Return the ordered levels
   */
  build(definition: WorkflowDefinition): ExecutionNode[] {
    const validation = this.validate(definition);
    if (!validation.valid) {
      throw new Error(
        `WorkflowDefinition validation failed:\n  ${validation.errors.join("\n  ")}`
      );
    }

    // Build adjacency maps from edges
    const outgoing = new Map<ExecutionNodeId, ExecutionNodeId[]>();
    const incoming = new Map<ExecutionNodeId, ExecutionNodeId[]>();

    for (const node of definition.nodes) {
      outgoing.set(node.nodeId, []);
      incoming.set(node.nodeId, []);
    }

    for (const edge of definition.edges) {
      const fromList = outgoing.get(edge.from);
      if (fromList) {
        fromList.push(edge.to);
      }
      const toList = incoming.get(edge.to);
      if (toList) {
        toList.push(edge.from);
      }
    }

    // Create ExecutionNode wrappers
    const nodeMap = new Map<ExecutionNodeId, WorkflowNode>();
    for (const node of definition.nodes) {
      nodeMap.set(node.nodeId, node);
    }

    const executionNodes: ExecutionNode[] = definition.nodes.map((node) => {
      const deps = incoming.get(node.nodeId) ?? [];
      const dependents = outgoing.get(node.nodeId) ?? [];
      return {
        node,
        level: -1, // assigned by topologicalSort
        dependencyCount: deps.length,
        dependsOn: deps,
        dependentNodes: dependents,
        status: "pending",
      };
    });

    // Topological sort to assign levels
    const levels = this.topologicalSort(executionNodes, definition.edges);

    // Flatten levels back into node list with level assignments
    const nodeById = new Map<ExecutionNodeId, ExecutionNode>();
    for (const execNode of executionNodes) {
      nodeById.set(execNode.node.nodeId, execNode);
    }

    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      for (const execNode of levels[levelIdx]) {
        execNode.level = levelIdx;
      }
    }

    return executionNodes;
  }

  /**
   * Topological sort using Kahn's algorithm.
   *
   * Returns levels (arrays of ExecutionNode), where each level contains
   * nodes that can execute in parallel (no dependencies between them).
   *
   * Algorithm:
   * 1. Compute in-degree for each node
   * 2. Queue all nodes with in-degree 0 (these form level 0)
   * 3. Process level by level:
   *    a. Pop all nodes in the current queue
   *    b. For each, decrement in-degree of dependents
   *    c. Dependents that reach in-degree 0 go into the next level's queue
   * 4. If any nodes remain unprocessed, they form a cycle
   */
  topologicalSort(
    nodes: ExecutionNode[],
    edges: WorkflowEdge[]
  ): ExecutionNode[][] {
    const nodeById = new Map<ExecutionNodeId, ExecutionNode>();
    for (const node of nodes) {
      nodeById.set(node.node.nodeId, node);
    }

    // Build adjacency list and in-degree map
    const adjacency = new Map<ExecutionNodeId, ExecutionNodeId[]>();
    const inDegree = new Map<ExecutionNodeId, number>();

    for (const node of nodes) {
      adjacency.set(node.node.nodeId, []);
      inDegree.set(node.node.nodeId, 0);
    }

    for (const edge of edges) {
      const adj = adjacency.get(edge.from);
      if (adj) {
        adj.push(edge.to);
      }
      const deg = inDegree.get(edge.to);
      if (deg !== undefined) {
        inDegree.set(edge.to, deg + 1);
      }
    }

    // Collect all nodes with in-degree 0 (roots)
    const queue: ExecutionNodeId[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const levels: ExecutionNode[][] = [];
    let processedCount = 0;

    while (queue.length > 0) {
      const currentLevel: ExecutionNode[] = [];
      const levelSize = queue.length;

      // Process all nodes currently in the queue (they form one level)
      for (let i = 0; i < levelSize; i++) {
        const nodeId = queue.shift()!;
        const execNode = nodeById.get(nodeId);
        if (execNode) {
          currentLevel.push(execNode);
        }
        processedCount++;

        // Decrement in-degree for all dependents
        const dependents = adjacency.get(nodeId) ?? [];
        for (const dependentId of dependents) {
          const newDegree = (inDegree.get(dependentId) ?? 1) - 1;
          inDegree.set(dependentId, newDegree);
          if (newDegree === 0) {
            queue.push(dependentId);
          }
        }
      }

      levels.push(currentLevel);
    }

    // If not all nodes were processed, a cycle exists.
    // The remaining nodes (in-degree > 0) are part of a cycle.
    if (processedCount < nodes.length) {
      const unprocessed: ExecutionNodeId[] = [];
      for (const [nodeId, degree] of inDegree.entries()) {
        if (degree > 0) {
          unprocessed.push(nodeId);
        }
      }
      throw new Error(
        `Cycle detected in workflow graph. Unprocessed nodes: ${unprocessed.join(", ")}`
      );
    }

    return levels;
  }

  /**
   * Validate a WorkflowDefinition for structural correctness.
   *
   * Checks:
   * 1. workflowId is present and non-empty
   * 2. At least one node exists
   * 3. All agentIds exist in the agent registry
   * 4. All edge references point to existing nodes
   * 5. No duplicate node IDs
   * 6. All nodes are reachable (graph connectivity)
   * 7. Cycle detection via DFS
   */
  validate(definition: WorkflowDefinition): WorkflowValidationResult {
    const errors: string[] = [];

    // --- 1. workflowId ---
    if (!definition.workflowId || definition.workflowId.trim().length === 0) {
      errors.push("workflowId is required and must be a non-empty string");
    }

    // --- 2. Nodes ---
    if (!definition.nodes || definition.nodes.length === 0) {
      errors.push("Workflow must have at least one node");
      return { valid: false, errors };
    }

    // --- 3. Duplicate node IDs ---
    const nodeIds = new Set<ExecutionNodeId>();
    for (const node of definition.nodes) {
      if (nodeIds.has(node.nodeId)) {
        errors.push(`Duplicate nodeId: "${node.nodeId}"`);
      }
      nodeIds.add(node.nodeId);
    }

    // --- 4. Agent IDs exist in registry ---
    for (const node of definition.nodes) {
      if (!node.agentId || node.agentId.trim().length === 0) {
        errors.push(`Node "${node.nodeId}" has an empty or missing agentId`);
        continue;
      }
      if (!this.registry.hasAdapter(node.agentId)) {
        errors.push(
          `Node "${node.nodeId}" references agentId "${node.agentId}" which is not registered in the agent registry. ` +
          `Registered agents: [${this.registry.listAdapters().map((a) => a.id).join(", ")}]`
        );
      }
    }

    // --- 5. Edge validation ---
    if (!definition.edges) {
      errors.push("Workflow must have an edges array (can be empty)");
      return { valid: false, errors };
    }

    for (let i = 0; i < definition.edges.length; i++) {
      const edge = definition.edges[i];
      if (!nodeIds.has(edge.from)) {
        errors.push(
          `Edge [${i}] references source "${edge.from}" which does not exist in nodes. ` +
          `Available nodeIds: [${Array.from(nodeIds).join(", ")}]`
        );
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(
          `Edge [${i}] references target "${edge.to}" which does not exist in nodes. ` +
          `Available nodeIds: [${Array.from(nodeIds).join(", ")}]`
        );
      }
      if (edge.from === edge.to) {
        errors.push(`Edge [${i}] is a self-loop: "${edge.from}" -> "${edge.to}"`);
      }

      // Conditional edges must have a condition
      if (
        (edge.type === "CONDITIONAL_TRUE" || edge.type === "CONDITIONAL_FALSE") &&
        !edge.condition
      ) {
        errors.push(
          `Edge [${i}] is of type "${edge.type}" but has no condition defined`
        );
      }
    }

    // --- 6. Mode validation ---
    if (!["SINGLE_AGENT", "CHAIN", "DAG"].includes(definition.mode)) {
      errors.push(
        `Invalid mode "${definition.mode}". Must be one of: SINGLE_AGENT, CHAIN, DAG`
      );
    }

    // Mode-specific validation
    if (definition.mode === "SINGLE_AGENT" && definition.nodes.length !== 1) {
      errors.push(
        `SINGLE_AGENT mode requires exactly 1 node, but found ${definition.nodes.length}`
      );
    }

    // --- 7. Config validation ---
    if (!definition.config) {
      errors.push("Workflow must have a config section");
    } else {
      if (definition.config.parallelLimit < 1) {
        errors.push("config.parallelLimit must be >= 1");
      }
      if (!["ABORT", "SKIP", "CONTINUE"].includes(definition.config.failBehavior)) {
        errors.push(
          `Invalid config.failBehavior "${definition.config.failBehavior}". Must be one of: ABORT, SKIP, CONTINUE`
        );
      }
    }

    // --- 8. Cycle detection via DFS ---
    if (definition.edges.length > 0) {
      const cycleErrors = this.detectCycles(definition.nodes, definition.edges);
      errors.push(...cycleErrors);
    }

    // --- 9. Orphan check: nodes with no incoming AND no outgoing edges ---
    //    (only warn if > 1 node and not all nodes are isolated)
    if (definition.nodes.length > 1) {
      const hasEdges = definition.edges.length > 0;
      if (hasEdges) {
        const connectedNodes = new Set<ExecutionNodeId>();
        for (const edge of definition.edges) {
          connectedNodes.add(edge.from);
          connectedNodes.add(edge.to);
        }
        const orphaned = definition.nodes
          .filter((n) => !connectedNodes.has(n.nodeId))
          .map((n) => n.nodeId);
        if (orphaned.length > 0) {
          errors.push(
            `Nodes are not connected to any edge (orphans): ${orphaned.join(", ")}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // -------------------------------------------------------------------------
  // Private: DFS Cycle Detection
  // -------------------------------------------------------------------------

  /**
   * Detect cycles using depth-first search.
   * Returns an error message per detected cycle.
   */
  private detectCycles(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[] {
    const errors: string[] = [];

    // Build adjacency list
    const adjacency = new Map<ExecutionNodeId, ExecutionNodeId[]>();
    for (const node of nodes) {
      adjacency.set(node.nodeId, []);
    }
    for (const edge of edges) {
      const list = adjacency.get(edge.from);
      if (list) {
        list.push(edge.to);
      }
    }

    // DFS state
    const WHITE = 0; // Not visited
    const GRAY = 1;  // In current DFS path
    const BLACK = 2; // Fully explored

    const color = new Map<ExecutionNodeId, number>();
    for (const node of nodes) {
      color.set(node.nodeId, WHITE);
    }

    const cycles: ExecutionNodeId[][] = [];

    for (const node of nodes) {
      if (color.get(node.nodeId) === WHITE) {
        this.dfsVisit(node.nodeId, adjacency, color, [], cycles);
      }
    }

    for (const cycle of cycles) {
      errors.push(
        `Cycle detected: ${cycle.join(" -> ")} -> ${cycle[0]}`
      );
    }

    return errors;
  }

  private dfsVisit(
    nodeId: ExecutionNodeId,
    adjacency: Map<ExecutionNodeId, ExecutionNodeId[]>,
    color: Map<ExecutionNodeId, number>,
    path: ExecutionNodeId[],
    cycles: ExecutionNodeId[][]
  ): void {
    color.set(nodeId, GRAY);
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) {
        continue; // Skip nodes not in the graph
      }
      if (color.get(neighbor) === GRAY) {
        // Found a cycle — extract it from the current path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
      } else if (color.get(neighbor) === WHITE) {
        this.dfsVisit(neighbor, adjacency, color, [...path], cycles);
      }
    }

    color.set(nodeId, BLACK);
  }
}

// ---------------------------------------------------------------------------
// Pipeline Factories
// ---------------------------------------------------------------------------

/**
 * Create a Content Marketing pipeline WorkflowDefinition.
 *
 * Nodes:
 *   1. @Trend Researcher  — identifies trending topics and market signals
 *   2. @SEO Specialist    — analyzes keyword opportunities and search data
 *   3. @Content Creator   — produces written/visual content
 *   4. @Social Media Strategist — optimizes distribution across channels
 *
 * Edges:
 *   SEQUENTIAL between each step (1->2, 2->3, 3->4)
 *   CONDITIONAL_FALSE from Content Creator back to itself for quality revision
 *   (if quality check fails, content must be revised before proceeding)
 */
export function createContentMarketingPipeline(): WorkflowDefinition {
  return {
    workflowId: "pipeline-content-marketing",
    name: "Content Marketing Pipeline",
    mode: "DAG",
    nodes: [
      {
        nodeId: "trend-researcher",
        agentId: "trend-researcher",
        description: "Researches trending topics, audience interests, and market signals to inform content strategy",
        inputMapping: {
          "campaign.brief": "brief",
          "market.industry": "industry",
          "audience.segment": "targetAudience",
        },
        outputMapping: {
          "trends": "research.trends",
          "topics": "research.topics",
          "audienceInsights": "research.audienceInsights",
        },
        timeoutMs: 30_000,
        maxRetries: 2,
      },
      {
        nodeId: "seo-specialist",
        agentId: "seo-specialist",
        description: "Analyzes keyword opportunities, search volume, and competitive landscape for SEO optimization",
        inputMapping: {
          "research.topics": "topics",
          "research.trends": "trends",
          "campaign.targetKeywords": "targetKeywords",
        },
        outputMapping: {
          "keywords": "seo.keywords",
          "searchVolume": "seo.searchVolume",
          "contentGaps": "seo.contentGaps",
          "optimizationTips": "seo.optimizationTips",
        },
        timeoutMs: 30_000,
        maxRetries: 2,
      },
      {
        nodeId: "content-creator",
        agentId: "content-creator",
        description: "Produces high-quality written content based on research and SEO insights",
        inputMapping: {
          "research.topics": "topics",
          "seo.keywords": "keywords",
          "seo.optimizationTips": "optimizationTips",
          "campaign.tone": "tone",
          "campaign.format": "format",
        },
        outputMapping: {
          "content": "content.body",
          "qualityScore": "content.qualityScore",
          "revisionNotes": "content.revisionNotes",
          "headline": "content.headline",
        },
        timeoutMs: 60_000,
        maxRetries: 3,
      },
      {
        nodeId: "social-media-strategist",
        agentId: "social-media-strategist",
        description: "Creates distribution strategy, platform-specific adaptations, and posting schedule",
        inputMapping: {
          "content.body": "contentBody",
          "content.headline": "headline",
          "research.audienceInsights": "audienceInsights",
          "campaign.platforms": "platforms",
        },
        outputMapping: {
          "strategy": "distribution.strategy",
          "schedule": "distribution.schedule",
          "platformContent": "distribution.platformContent",
          "engagementTargets": "distribution.engagementTargets",
        },
        timeoutMs: 30_000,
        maxRetries: 2,
      },
    ],
    edges: [
      {
        from: "trend-researcher",
        to: "seo-specialist",
        type: "SEQUENTIAL",
      },
      {
        from: "seo-specialist",
        to: "content-creator",
        type: "SEQUENTIAL",
      },
      {
        from: "content-creator",
        to: "social-media-strategist",
        type: "CONDITIONAL_TRUE",
        condition: {
          field: "content.qualityScore",
          operator: "GTE",
          value: 0.8,
        },
      },
      {
        from: "content-creator",
        to: "content-creator",
        type: "CONDITIONAL_FALSE",
        condition: {
          field: "content.qualityScore",
          operator: "LT",
          value: 0.8,
        },
      },
    ],
    config: {
      parallelLimit: 1,
      failBehavior: "ABORT",
      contextPersistence: true,
      tracingEnabled: true,
    },
  };
}

/**
 * Create a Sales pipeline WorkflowDefinition.
 *
 * Nodes:
 *   1. @Trend Researcher  — identifies market trends and lead signals
 *   2. @Product Manager   — aligns product positioning with market data
 *   3. @Growth Hacker     — designs outreach and conversion experiments
 *   4. @Proposal Strategist — crafts the final proposal and pitch
 *
 * Edges: SEQUENTIAL between each step (1->2, 2->3, 3->4)
 */
export function createSalesPipeline(): WorkflowDefinition {
  return {
    workflowId: "pipeline-sales",
    name: "Sales Pipeline",
    mode: "CHAIN",
    nodes: [
      {
        nodeId: "trend-researcher",
        agentId: "trend-researcher",
        description: "Researches market trends, competitor activity, and lead signals in the target segment",
        inputMapping: {
          "campaign.brief": "brief",
          "market.segment": "segment",
          "campaign.goal": "goal",
        },
        outputMapping: {
          "marketTrends": "research.marketTrends",
          "competitorAnalysis": "research.competitorAnalysis",
          "leadSignals": "research.leadSignals",
          "icpRefinement": "research.icpRefinement",
        },
        timeoutMs: 30_000,
        maxRetries: 2,
      },
      {
        nodeId: "product-manager",
        agentId: "product-manager",
        description: "Aligns product positioning, differentiators, and value props with market research",
        inputMapping: {
          "research.marketTrends": "marketTrends",
          "research.competitorAnalysis": "competitorAnalysis",
          "campaign.product": "product",
          "campaign.features": "features",
        },
        outputMapping: {
          "positioning": "product.positioning",
          "differentiators": "product.differentiators",
          "valueProps": "product.valueProps",
          "pricingStrategy": "product.pricingStrategy",
        },
        timeoutMs: 30_000,
        maxRetries: 2,
      },
      {
        nodeId: "growth-hacker",
        agentId: "growth-hacker",
        description: "Designs outreach campaigns, A/B test plans, and conversion optimization experiments",
        inputMapping: {
          "product.positioning": "positioning",
          "product.valueProps": "valueProps",
          "research.leadSignals": "leadSignals",
          "research.icpRefinement": "icpRefinement",
        },
        outputMapping: {
          "outreachStrategy": "growth.outreachStrategy",
          "experiments": "growth.experiments",
          "channels": "growth.channels",
          "conversionFunnel": "growth.conversionFunnel",
        },
        timeoutMs: 45_000,
        maxRetries: 3,
      },
      {
        nodeId: "proposal-strategist",
        agentId: "proposal-strategist",
        description: "Crafts the final sales proposal, pitch deck, and closing strategy",
        inputMapping: {
          "product.positioning": "positioning",
          "product.differentiators": "differentiators",
          "product.valueProps": "valueProps",
          "growth.outreachStrategy": "outreachStrategy",
          "research.marketTrends": "marketTrends",
        },
        outputMapping: {
          "proposal": "sales.proposal",
          "pitchDeck": "sales.pitchDeck",
          "closingStrategy": "sales.closingStrategy",
          "objectionHandling": "sales.objectionHandling",
        },
        timeoutMs: 60_000,
        maxRetries: 2,
      },
    ],
    edges: [
      {
        from: "trend-researcher",
        to: "product-manager",
        type: "SEQUENTIAL",
      },
      {
        from: "product-manager",
        to: "growth-hacker",
        type: "SEQUENTIAL",
      },
      {
        from: "growth-hacker",
        to: "proposal-strategist",
        type: "SEQUENTIAL",
      },
    ],
    config: {
      parallelLimit: 1,
      failBehavior: "ABORT",
      contextPersistence: true,
      tracingEnabled: true,
    },
  };
}

/**
 * Create an Incident Response pipeline WorkflowDefinition.
 *
 * Nodes:
 *   1. @Support Responder — triages the incident, gathers initial data
 *   2. @Infrastructure Maintainer — diagnoses infrastructure root cause
 *   3. @Backend Architect — designs and applies the fix
 *
 * Edges: SEQUENTIAL between each step (1->2, 2->3)
 */
export function createIncidentPipeline(): WorkflowDefinition {
  return {
    workflowId: "pipeline-incident-response",
    name: "Incident Response Pipeline",
    mode: "CHAIN",
    nodes: [
      {
        nodeId: "support-responder",
        agentId: "support-responder",
        description: "Triages incoming incident, gathers initial diagnostics, and classifies severity",
        inputMapping: {
          "incident.report": "report",
          "incident.source": "source",
          "incident.timestamp": "timestamp",
        },
        outputMapping: {
          "triageSummary": "incident.triageSummary",
          "severity": "incident.severity",
          "affectedServices": "incident.affectedServices",
          "initialLogs": "incident.initialLogs",
        },
        timeoutMs: 15_000,
        maxRetries: 2,
      },
      {
        nodeId: "infrastructure-maintainer",
        agentId: "infrastructure-maintainer",
        description: "Analyzes infrastructure metrics, logs, and alerts to identify root cause",
        inputMapping: {
          "incident.triageSummary": "triageSummary",
          "incident.severity": "severity",
          "incident.affectedServices": "affectedServices",
          "incident.initialLogs": "initialLogs",
        },
        outputMapping: {
          "rootCause": "infra.rootCause",
          "impactAnalysis": "infra.impactAnalysis",
          "affectedResources": "infra.affectedResources",
          "timeline": "infra.timeline",
          "recommendations": "infra.recommendations",
        },
        timeoutMs: 45_000,
        maxRetries: 3,
      },
      {
        nodeId: "backend-architect",
        agentId: "backend-architect",
        description: "Designs the fix, validates against architecture constraints, and produces deployment plan",
        inputMapping: {
          "infra.rootCause": "rootCause",
          "infra.impactAnalysis": "impactAnalysis",
          "infra.affectedResources": "affectedResources",
          "infra.recommendations": "recommendations",
        },
        outputMapping: {
          "fixPlan": "resolution.fixPlan",
          "rollbackPlan": "resolution.rollbackPlan",
          "validationSteps": "resolution.validationSteps",
          "estimatedTimeToResolve": "resolution.estimatedTimeToResolve",
          "postMortemNotes": "resolution.postMortemNotes",
        },
        timeoutMs: 60_000,
        maxRetries: 2,
      },
    ],
    edges: [
      {
        from: "support-responder",
        to: "infrastructure-maintainer",
        type: "SEQUENTIAL",
      },
      {
        from: "infrastructure-maintainer",
        to: "backend-architect",
        type: "SEQUENTIAL",
      },
    ],
    config: {
      parallelLimit: 1,
      failBehavior: "ABORT",
      contextPersistence: true,
      tracingEnabled: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Utility: Build a complete DAG execution plan from a definition
// ---------------------------------------------------------------------------

/**
 * Convenience function that validates and builds a full execution plan:
 *   WorkflowDefinition -> ExecutionNode[][] (parallel-executable levels)
 *
 * This is the primary entry point for the ExecutionLoop to consume.
 *
 * @param definition - The workflow definition
 * @param registry   - Optional agent registry (defaults to global singleton)
 * @returns Array of levels, each level is an array of parallel-executable ExecutionNodes
 * @throws If validation fails or cycles are detected
 */
export function buildExecutionPlan(
  definition: WorkflowDefinition,
  registry?: typeof agentRegistry
): ExecutionNode[][] {
  const builder = new DagBuilder(registry);
  const nodes = builder.build(definition);
  const levels = builder.topologicalSort(nodes, definition.edges);
  return levels;
}
