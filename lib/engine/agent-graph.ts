// ============================================================================
// AgentGraph (DAG) Execution Model
// ============================================================================
// This module defines the core DAG data structure for agent orchestration.
// Node types include agent execution nodes, conditional routers,
// parallel forks, and synchronizers. Edge types define flow control
// and data dependencies between nodes.
// ============================================================================

// ---------------------------------------------------------------------------
// Graph Primitives
// ---------------------------------------------------------------------------

/**
 * Unique identifier for a node within a workflow graph.
 * Convention: `<workflow-name>.<node-name>` e.g. `sales-qualification.outreach`
 */
export type NodeId = string;

/**
 * Unique identifier for an edge within a workflow graph.
 */
export type EdgeId = string;

/**
 * Unique identifier for a named agent registered in the agent registry.
 * Maps to the agent name from the agent registry.
 */
export type AgentName = string;

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all possible node types in the DAG.
 */
export type GraphNode =
  | AgentNode
  | ConditionalRouter
  | ParallelFork
  | Synchronizer
  | StartNode
  | EndNode
  | SubworkflowNode;

/**
 * Base fields shared by all node types.
 */
interface GraphNodeBase {
  /** Unique identifier for this node */
  id: NodeId;
  /** Human-readable label for observability */
  label: string;
  /** Detailed description of this node's purpose */
  description: string;
  /** Arbitrary metadata for tooling and observability */
  metadata?: Record<string, unknown>;
}

// --- Agent Node ---

/**
 * An agent execution node. Invokes a named agent with a specific
 * instruction payload and context mapping.
 */
export interface AgentNode extends GraphNodeBase {
  type: "agent_node";
  /** The registered agent to invoke */
  agent: AgentName;
  /** The instruction or prompt to execute */
  instruction: string;
  /**
   * Input specification: which context keys this agent consumes.
   * Maps context paths to the agent's expected input parameter names.
   */
  inputs: ContextMapping[];
  /**
   * Output specification: which context keys this agent produces.
   * Maps the agent's output fields to context paths.
   */
  outputs: ContextMapping[];
  /**
   * Execution policy for this agent step.
   */
  policy: ExecutionPolicy;
  /**
   * Optional timeout specific to this agent execution.
   * Overrides the workflow-level default if set.
   */
  timeoutMs?: number;
  /**
   * Maximum number of retry attempts on transient failure.
   */
  maxRetries?: number;
  /**
   * Backoff strategy for retries.
   */
  retryBackoff?: RetryBackoffStrategy;
}

// --- Conditional Router ---

/**
 * A decision node that evaluates a condition and routes to one of
 * two or more branches based on the result.
 */
export interface ConditionalRouter extends GraphNodeBase {
  type: "conditional_router";
  /**
   * The condition expression to evaluate.
   * Syntax: `context.<path> <operator> <value>`
   */
  condition: ConditionExpression;
  /**
   * Routes for each possible outcome.
   * The keys correspond to condition outcomes.
   * Use `true` / `false` for binary conditions, or named values for multi-way.
   */
  routes: Record<string, RouteTarget>;
  /**
   * Default route if no condition matches.
   */
  defaultRoute?: RouteTarget;
}

// --- Parallel Fork ---

/**
 * A fork node that fans out execution to multiple parallel branches.
 * All branches execute concurrently; the Synchronizer node collects results.
 */
export interface ParallelFork extends GraphNodeBase {
  type: "parallel_fork";
  /**
   * The branches to execute in parallel.
   * Each branch is a sequence of node IDs to execute.
   */
  branches: ParallelBranch[];
  /**
   * Policy for collecting results from all branches.
   */
  joinPolicy?: JoinPolicy;
}

/**
 * A single parallel execution branch.
 */
export interface ParallelBranch {
  /** Unique identifier for this branch */
  id: string;
  /** Label for observability */
  label: string;
  /** Ordered list of node IDs to execute in this branch */
  nodeIds: NodeId[];
}

/**
 * Policy for joining parallel branch results.
 */
export interface JoinPolicy {
  /**
   * How to handle branch failures:
   * - `fail_fast`: abort all branches as soon as any branch fails
   * - `wait_for_all`: wait for all branches to complete, then collect failures
   * - `ignore_failures`: proceed with successful results only
   */
  failureMode: "fail_fast" | "wait_for_all" | "ignore_failures";
  /**
   * Timeout for the entire parallel execution.
   * If exceeded, all running branches are cancelled.
   */
  timeoutMs?: number;
}

// --- Synchronizer ---

/**
 * A synchronizer (join) node that waits for all parallel branches
 * to complete and merges their results back into a single execution path.
 */
export interface Synchronizer extends GraphNodeBase {
  type: "synchronizer";
  /**
   * How to merge results from multiple branches into the context.
   */
  mergeStrategy: MergeStrategy;
  /**
   * Which fork node this synchronizer joins.
   * Must match the ID of a ParallelFork node.
   */
  forkId: NodeId;
}

/**
 * Strategies for merging parallel branch results into context.
 */
export type MergeStrategy =
  | { type: "merge_all"; namespace?: string }
  | { type: "pick_first"; fields: string[] }
  | { type: "pick_best"; field: string; criteria: "completeness" | "confidence" | "latest" }
  | { type: "concatenate"; field: string; separator?: string }
  | { type: "custom"; handler: string };

// --- Start / End Nodes ---

/**
 * Virtual start node. Every graph must have exactly one.
 * Represents the entry point of the workflow.
 */
export interface StartNode extends GraphNodeBase {
  type: "start";
}

/**
 * Virtual end node. Every graph must have exactly one.
 * Represents the terminal state of the workflow.
 */
export interface EndNode extends GraphNodeBase {
  type: "end";
}

// --- Subworkflow Node ---

/**
 * A node that invokes another workflow definition as a sub-process.
 * Enables workflow composition and reuse.
 */
export interface SubworkflowNode extends GraphNodeBase {
  type: "subworkflow";
  /** Reference to the workflow definition to invoke */
  workflowRef: string;
  /** Context mapping for the subworkflow inputs */
  inputs: ContextMapping[];
  /** Context mapping for the subworkflow outputs */
  outputs: ContextMapping[];
  /**
   * How to handle failures in the subworkflow:
   * - `propagate`: fail this node with the subworkflow error
   * - `absorb`: treat failure as a normal output with an error field
   */
  failureMode: "propagate" | "absorb";
}

// ---------------------------------------------------------------------------
// Edge Types
// ---------------------------------------------------------------------------

/**
 * A directed edge between two nodes in the DAG.
 */
export interface GraphEdge {
  /** Unique identifier */
  id: EdgeId;
  /** Source node ID */
  sourceId: NodeId;
  /** Target node ID */
  targetId: NodeId;
  /** The type of relationship this edge represents */
  type: EdgeType;
  /** Label for observability and debugging */
  label?: string;
  /**
   * Optional condition for conditional edges.
   * Evaluated at runtime to determine if this edge should be traversed.
   */
  condition?: ConditionExpression;
  /**
   * Optional priority for tie-breaking when multiple edges match conditions.
   * Lower numbers have higher priority.
   */
  priority?: number;
}

/**
 * Edge type discriminator.
 */
export type EdgeType =
  | "sequential"
  | "conditional_true"
  | "conditional_false"
  | "data_dependency"
  | "fallback"
  | "error"
  | "timeout";

// ---------------------------------------------------------------------------
// Condition Expressions
// ---------------------------------------------------------------------------

/**
 * A parsed condition expression used in routers and conditional edges.
 */
export interface ConditionExpression {
  /** The context path to evaluate, e.g. "lead.score" or "analysis.risk_level" */
  path: string;
  /** The operator for comparison */
  operator: ComparisonOperator;
  /** The value to compare against */
  value: ConditionValue;
}

/**
 * Supported comparison operators for condition expressions.
 */
export type ComparisonOperator =
  | "eq"       // equals
  | "neq"      // not equals
  | "gt"       // greater than
  | "gte"      // greater than or equal
  | "lt"       // less than
  | "lte"      // less than or equal
  | "in"       // value in array
  | "not_in"   // value not in array
  | "contains" // string contains substring
  | "starts_with"
  | "ends_with"
  | "matches"  // regex match
  | "exists"   // context path exists
  | "not_exists"
  | "is_empty"
  | "is_not_empty"
  | "truthy"
  | "falsy";

/**
 * A value in a condition expression. Can be a literal or a context path reference.
 */
export type ConditionValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>
  | { $ref: string };  // Reference to another context path

// ---------------------------------------------------------------------------
// Route Targets
// ---------------------------------------------------------------------------

/**
 * Describes where execution should route next.
 */
export interface RouteTarget {
  /** Target node ID */
  nodeId: NodeId;
  /**
   * Optional context transformation to apply before routing.
   * Allows modifying context before entering the target node.
   */
  contextTransform?: ContextTransform[];
}

// ---------------------------------------------------------------------------
// Execution Policy
// ---------------------------------------------------------------------------

/**
 * Execution policy for an agent node.
 */
export interface ExecutionPolicy {
  /**
   * Retry behavior on failure:
   * - `none`: do not retry, fail immediately
   * - `limited`: retry up to maxRetries times
   * - `exponential`: retry with exponential backoff
   * - `infinite`: retry indefinitely (use with caution, requires maxTimeout)
   */
  retry: "none" | "limited" | "exponential" | "infinite";
  /**
   * Maximum number of retry attempts (for limited/exponential).
   */
  maxRetries?: number;
  /**
   * Base delay in ms for backoff calculation.
   */
  backoffBaseMs?: number;
  /**
   * Maximum delay in ms for backoff.
   */
  backoffMaxMs?: number;
  /**
   * Backoff multiplier (default: 2 for exponential).
   */
  backoffMultiplier?: number;
  /**
   * Whether retries should be jittered to avoid thundering herd.
   */
  jitter?: boolean;
  /**
   * On permanent failure, what action to take:
   * - `abort`: abort the entire workflow
   * - `skip`: skip this node and continue
   * - `fallback`: route to a fallback node
   * - `mark_failed`: mark the step as failed but continue
   */
  onPermanentFailure: "abort" | "skip" | "fallback" | "mark_failed";
  /**
   * Fallback node ID (required when onPermanentFailure = "fallback").
   */
  fallbackNodeId?: NodeId;
  /**
   * Timeout for this node's execution in ms.
   */
  timeoutMs?: number;
}

/**
 * Retry backoff strategy specification.
 */
export interface RetryBackoffStrategy {
  /** Base delay in ms */
  baseMs: number;
  /** Multiplier per retry attempt */
  multiplier: number;
  /** Maximum delay in ms */
  maxMs: number;
  /** Whether to add random jitter */
  jitter: boolean;
}

// ---------------------------------------------------------------------------
// Context Mapping
// ---------------------------------------------------------------------------

/**
 * A mapping that transforms context keys between agents.
 * Defines how data flows into and out of an agent node.
 */
export interface ContextMapping {
  /**
   * Source path in the context object (e.g. "lead.company_name").
   * For inputs: the context path to read from.
   * For outputs: the agent's output field path.
   */
  source: string;
  /**
   * Target path in the context object (e.g. "sales_outreach.company").
   * For inputs: the agent's expected input parameter name.
   * For outputs: the context path to write to.
   */
  target: string;
  /**
   * Optional transformation to apply during mapping.
   */
  transform?: ContextTransform;
  /**
   * Whether this mapping is required.
   * If required and the source is missing, execution fails.
   */
  required?: boolean;
  /**
   * Default value if the source is missing and the mapping is not required.
   */
  default?: unknown;
}

/**
 * A transformation to apply to a context value during mapping.
 */
export interface ContextTransform {
  /** Type of transformation */
  type: TransformType;
  /** Parameters for the transformation */
  params?: Record<string, unknown>;
}

/**
 * Types of context value transformations.
 */
export type TransformType =
  | "rename"        // Rename the key (uses params.newName)
  | "cast"          // Cast to a type (uses params.toType: "string" | "number" | "boolean" | "date" | "json")
  | "template"      // String template interpolation (uses params.template: "Hello {{name}}")
  | "pick"          // Pick specific fields from an object (uses params.fields: string[])
  | "omit"          // Omit specific fields from an object (uses params.fields: string[])
  | "default"       // Apply default if null/undefined (uses params.value)
  | "coalesce"      // Take first non-null value from multiple paths (uses params.paths: string[])
  | "aggregate"     // Aggregate array values (uses params.aggregator: "sum" | "avg" | "count" | "join")
  | "split"         // Split string into array (uses params.separator)
  | "format_date"   // Format a date value (uses params.format)
  | "custom";       // Custom handler function reference (uses params.handler)

// ---------------------------------------------------------------------------
// Complete DAG Structure
// ---------------------------------------------------------------------------

/**
 * The complete AgentGraph (DAG) definition.
 * Represents a single workflow as a directed acyclic graph.
 */
export interface AgentGraph {
  /** Workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Description of what this workflow accomplishes */
  description: string;
  /** All nodes in the graph */
  nodes: Map<NodeId, GraphNode>;
  /** All edges in the graph */
  edges: Map<EdgeId, GraphEdge>;
  /** The start node (must be of type "start") */
  startNodeId: NodeId;
  /** The end node (must be of type "end") */
  endNodeId: NodeId;
  /** Workflow-level metadata */
  metadata?: WorkflowMetadata;
}

/**
 * Workflow-level metadata for observability and governance.
 */
export interface WorkflowMetadata {
  /** Owner or owning team */
  owner?: string;
  /** SLA target in seconds */
  slaTargetSeconds?: number;
  /** Severity/criticality level */
  severity?: "critical" | "high" | "medium" | "low";
  /** Tags for categorization */
  tags?: string[];
  /** Created date ISO string */
  created?: string;
  /** Last modified date ISO string */
  modified?: string;
}

// ---------------------------------------------------------------------------
// Cycle Detection & Topological Sort
// ---------------------------------------------------------------------------

/**
 * Result of a cycle detection operation.
 */
export interface CycleDetectionResult {
  /** Whether the graph contains at least one cycle */
  hasCycle: boolean;
  /** All detected cycles, each represented as an ordered list of node IDs */
  cycles: NodeId[][];
  /** Forward references in edge definitions (nodes referenced but not defined) */
  unresolvedReferences: NodeId[];
}

/**
 * Result of a topological sort operation.
 */
export interface TopologicalSortResult {
  /** Ordered list of node IDs in topological order */
  sorted: NodeId[];
  /** Whether the sort was successful (false if cycles were detected) */
  success: boolean;
  /** Any error messages */
  errors: string[];
}

/**
 * Validates the graph structure and detects cycles using DFS-based
 * cycle detection (Kahn's algorithm variant).
 *
 * Returns the topological sort if no cycles exist, or reports cycles.
 */
export function detectCycles(graph: AgentGraph): CycleDetectionResult {
  const adjacency = new Map<NodeId, NodeId[]>();
  const allNodeIds = new Set(graph.nodes.keys());
  const referencedIds = new Set<NodeId>();

  // Build adjacency list
  for (const edge of graph.edges.values()) {
    referencedIds.add(edge.sourceId);
    referencedIds.add(edge.targetId);

    if (!adjacency.has(edge.sourceId)) {
      adjacency.set(edge.sourceId, []);
    }
    adjacency.get(edge.sourceId)!.push(edge.targetId);

    // Also track edges via condition - ensure conditional edge targets are referenced
    if (edge.condition) {
      referencedIds.add(edge.targetId);
    }
  }

  // Find forward references (nodes referenced in edges but not defined)
  const unresolvedReferences: NodeId[] = [];
  for (const id of referencedIds) {
    if (!allNodeIds.has(id)) {
      unresolvedReferences.push(id);
    }
  }

  // DFS-based cycle detection
  const WHITE = 0; // Not visited
  const GRAY = 1;  // In current DFS path
  const BLACK = 2; // Fully explored

  const color = new Map<NodeId, number>();
  const cycles: NodeId[][] = [];

  for (const id of allNodeIds) {
    color.set(id, WHITE);
  }

  function dfs(nodeId: NodeId, path: NodeId[]): void {
    color.set(nodeId, GRAY);
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) {
        continue; // Skip unreferenced nodes
      }
      if (color.get(neighbor) === GRAY) {
        // Found a cycle — extract it from the path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
      } else if (color.get(neighbor) === WHITE) {
        dfs(neighbor, [...path]);
      }
    }

    color.set(nodeId, BLACK);
  }

  for (const id of allNodeIds) {
    if (color.get(id) === WHITE) {
      dfs(id, []);
    }
  }

  return {
    hasCycle: cycles.length > 0,
    cycles,
    unresolvedReferences,
  };
}

/**
 * Performs a topological sort on the graph using Kahn's algorithm.
 * Returns null if cycles are detected (use detectCycles first).
 */
export function topologicalSort(graph: AgentGraph): TopologicalSortResult {
  const errors: string[] = [];

  // Build in-degree map
  const inDegree = new Map<NodeId, number>();
  for (const id of graph.nodes.keys()) {
    inDegree.set(id, 0);
  }

  // Also ensure referenced but possibly undefined edge targets have in-degree entries
  const adjacency = new Map<NodeId, NodeId[]>();
  for (const edge of graph.edges.values()) {
    if (!adjacency.has(edge.sourceId)) {
      adjacency.set(edge.sourceId, []);
    }
    adjacency.get(edge.sourceId)!.push(edge.targetId);

    if (!inDegree.has(edge.targetId)) {
      inDegree.set(edge.targetId, 0);
      errors.push(`Node "${edge.targetId}" referenced in edges but not defined in nodes`);
    }
    if (!inDegree.has(edge.sourceId)) {
      errors.push(`Node "${edge.sourceId}" referenced in edges but not defined in nodes`);
    }

    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
  }

  // Collect start nodes (in-degree = 0)
  const queue: NodeId[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  if (queue.length === 0) {
    return { sorted: [], success: false, errors: ["No root nodes found — graph is cyclic or disconnected"] };
  }

  // Process nodes
  const sorted: NodeId[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check if all nodes were sorted
  const sortedSet = new Set(sorted);
  const unsorted: NodeId[] = [];
  for (const id of graph.nodes.keys()) {
    if (!sortedSet.has(id)) {
      unsorted.push(id);
    }
  }

  if (unsorted.length > 0) {
    errors.push(`Cycle detected: ${unsorted.length} nodes could not be sorted (${unsorted.join(", ")})`);
    return { sorted, success: false, errors };
  }

  return { sorted, success: true, errors };
}

/**
 * Get all direct predecessor nodes of a given node.
 */
export function getPredecessors(graph: AgentGraph, nodeId: NodeId): GraphNode[] {
  const predecessors: GraphNode[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.targetId === nodeId) {
      const node = graph.nodes.get(edge.sourceId);
      if (node) {
        predecessors.push(node);
      }
    }
  }
  return predecessors;
}

/**
 * Get all direct successor nodes of a given node.
 */
export function getSuccessors(graph: AgentGraph, nodeId: NodeId): GraphNode[] {
  const successors: GraphNode[] = [];
  for (const edge of graph.edges.values()) {
    if (edge.sourceId === nodeId) {
      const node = graph.nodes.get(edge.targetId);
      if (node) {
        successors.push(node);
      }
    }
  }
  return successors;
}

/**
 * Get all predecessors with their edge information.
 */
export function getPredecessorsWithEdges(
  graph: AgentGraph,
  nodeId: NodeId
): Array<{ node: GraphNode; edge: GraphEdge }> {
  const result: Array<{ node: GraphNode; edge: GraphEdge }> = [];
  for (const edge of graph.edges.values()) {
    if (edge.targetId === nodeId) {
      const node = graph.nodes.get(edge.sourceId);
      if (node) {
        result.push({ node, edge });
      }
    }
  }
  return result;
}

/**
 * Build a DOT-compatible graph description for visualization.
 */
export function toDOT(graph: AgentGraph): string {
  const lines: string[] = [];
  lines.push(`digraph "${graph.name}" {`);
  lines.push(`  rankdir=TB;`);
  lines.push(`  node [shape=box, style=rounded];`);

  // Node declarations
  for (const [id, node] of graph.nodes) {
    const label = node.label.replace(/"/g, '\\"');
    switch (node.type) {
      case "start":
        lines.push(`  "${id}" [label="${label}", shape=ellipse, style=filled, fillcolor="#86efac"];`);
        break;
      case "end":
        lines.push(`  "${id}" [label="${label}", shape=ellipse, style=filled, fillcolor="#fca5a5"];`);
        break;
      case "agent_node":
        lines.push(`  "${id}" [label="${label}\\n(${(node as AgentNode).agent})", style=filled, fillcolor="#bfdbfe"];`);
        break;
      case "conditional_router":
        lines.push(`  "${id}" [label="${label}\\n[decision]", shape=diamond, style=filled, fillcolor="#fde68a"];`);
        break;
      case "parallel_fork":
        lines.push(`  "${id}" [label="${label}\\n[fork]", shape=invtrapezium, style=filled, fillcolor="#c4b5fd"];`);
        break;
      case "synchronizer":
        lines.push(`  "${id}" [label="${label}\\n[join]", shape=trapezium, style=filled, fillcolor="#a5f3fc"];`);
        break;
      case "subworkflow":
        lines.push(`  "${id}" [label="${label}\\n[sub:${(node as SubworkflowNode).workflowRef}]", shape=box, style="rounded,dashed"];`);
        break;
    }
  }

  // Edge declarations
  for (const edge of graph.edges.values()) {
    const label = edge.label ? ` [label="${edge.label}"]` : edge.condition
      ? ` [label="${edge.condition.path} ${edge.condition.operator} ${JSON.stringify(edge.condition.value)}"]`
      : "";
    const style = edge.type === "data_dependency"
      ? ` [style=dashed]`
      : edge.type === "conditional_true"
        ? ` [style=bold]`
        : edge.type === "error"
          ? ` [color=red]`
          : "";
    lines.push(`  "${edge.sourceId}" -> "${edge.targetId}"${label}${style};`);
  }

  lines.push("}");
  return lines.join("\n");
}
