// ============================================================================
// Workflow Definition — Schema for YAML/JSON Workflow Files
// ============================================================================
// This module defines the serializable schema for workflow definition
// files (.workflow.yaml / .workflow.json). These files are the user-facing
// authoring format that gets compiled into AgentGraph and AgentChain objects
// at runtime.
// ============================================================================

import type {
  AgentName,
  ConditionExpression,
  ContextMapping,
  ContextTransform,
  ExecutionPolicy,
  NodeId,
  JoinPolicy,
  MergeStrategy,
} from "./agent-graph";

// ---------------------------------------------------------------------------
// Workflow Definition (Top-Level)
// ---------------------------------------------------------------------------

/**
 * A complete workflow definition that can be serialized to/from YAML or JSON.
 * This is the authoring format that users write. It gets compiled into
 * an AgentGraph at load time.
 */
export interface WorkflowDefinition {
  /** Schema version identifier */
  $schema?: string;
  /** Workflow metadata */
  workflow: WorkflowMeta;
  /**
   * Graph structure definition.
   * Exactly one of `graph` or `chain` must be specified.
   */
  graph?: GraphDefinition;
  /**
   * Chain structure definition (simplified linear workflow).
   * Exactly one of `graph` or `chain` must be specified.
   */
  chain?: ChainDefinition;
  /**
   * Shared node definitions that can be referenced by nodes in the graph.
   */
  shared?: Record<string, SharedNodeDefinition>;
}

// ---------------------------------------------------------------------------
// Workflow Metadata
// ---------------------------------------------------------------------------

/**
 * Top-level workflow metadata.
 */
export interface WorkflowMeta {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Description */
  description: string;
  /** Owner or owning team */
  owner?: string;
  /** SLA target in seconds */
  slaTargetSeconds?: number;
  /** Severity/criticality */
  severity?: "critical" | "high" | "medium" | "low";
  /** Categorization tags */
  tags?: string[];
  /** Creation date ISO string */
  created?: string;
  /** Last modified date ISO string */
  modified?: string;
  /** Documentation URL */
  documentationUrl?: string;
}

// ---------------------------------------------------------------------------
// Graph Definition (DAG)
// ---------------------------------------------------------------------------

/**
 * The graph definition section of a workflow file.
 * Defines a directed acyclic graph of agent executions.
 */
export interface GraphDefinition {
  /** Start node reference */
  startAt: NodeId;
  /** All nodes in the graph */
  nodes: Record<NodeId, NodeDefinition>;
  /** All edges between nodes */
  edges: EdgeDefinition[];
  /**
   * Default execution policy applied to all agent nodes
   * unless overridden at the node level.
   */
  defaultPolicy?: ExecutionPolicy;
}

// ---------------------------------------------------------------------------
// Node Definitions
// ---------------------------------------------------------------------------

/**
 * A node definition in the workflow file.
 * Discriminated by the `type` field.
 */
export type NodeDefinition =
  | AgentNodeDefinition
  | ConditionalRouterDefinition
  | ParallelForkDefinition
  | SynchronizerDefinition
  | SubworkflowNodeDefinition;

// --- Agent Node ---

export interface AgentNodeDefinition {
  type: "agent";
  /** The registered agent to invoke (e.g. "sales-outreach") */
  agent: AgentName;
  /** The instruction/prompt to execute */
  instruction: string;
  /** Human-readable label (defaults to agent name) */
  label?: string;
  /** Description */
  description?: string;
  /** Input context mappings */
  inputs?: ContextMappingDefinition[];
  /** Output context mappings */
  outputs?: ContextMappingDefinition[];
  /** Execution policy overrides */
  policy?: Partial<ExecutionPolicy>;
  /** Timeout in ms for this node */
  timeoutMs?: number;
  /** Maximum retries */
  maxRetries?: number;
}

// --- Conditional Router ---

export interface ConditionalRouterDefinition {
  type: "router";
  /** Human-readable label */
  label?: string;
  /** Description */
  description?: string;
  /** The condition expression to evaluate */
  condition: ConditionExpressionDefinition;
  /** Routes keyed by condition outcome */
  routes: Record<string, RouteDefinition>;
  /** Default route */
  defaultRoute?: RouteDefinition;
}

// --- Parallel Fork ---

export interface ParallelForkDefinition {
  type: "parallel";
  /** Human-readable label */
  label?: string;
  /** Description */
  description?: string;
  /** Branches to execute in parallel */
  branches: ParallelBranchDefinition[];
  /** How to handle failures in branches */
  failureMode?: "fail_fast" | "wait_for_all" | "ignore_failures";
  /** Timeout for the entire parallel section in ms */
  timeoutMs?: number;
}

// --- Synchronizer ---

export interface SynchronizerDefinition {
  type: "synchronizer";
  /** Human-readable label */
  label?: string;
  /** Description */
  description?: string;
  /** Merge strategy */
  mergeStrategy: MergeStrategyDefinition;
}

// --- Subworkflow ---

export interface SubworkflowNodeDefinition {
  type: "subworkflow";
  /** Reference to another workflow definition */
  workflowRef: string;
  /** Human-readable label */
  label?: string;
  /** Input context mappings */
  inputs?: ContextMappingDefinition[];
  /** Output context mappings */
  outputs?: ContextMappingDefinition[];
  /** Failure mode */
  failureMode?: "propagate" | "absorb";
}

// ---------------------------------------------------------------------------
// Edge Definitions
// ---------------------------------------------------------------------------

/**
 * An edge definition between two nodes.
 */
export interface EdgeDefinition {
  /** Source node ID */
  from: NodeId;
  /** Target node ID */
  to: NodeId;
  /**
   * Edge type. Defaults to "sequential".
   * Use "conditional_true"/"conditional_false" for router outputs.
   * Use "data_dependency" for non-execution ordering constraints.
   */
  type?: "sequential" | "conditional_true" | "conditional_false" | "data_dependency" | "fallback" | "error";
  /** Optional label for observability */
  label?: string;
  /**
   * Condition for conditional edges.
   * Evaluated at runtime to determine traversal.
   */
  condition?: ConditionExpressionDefinition;
}

// ---------------------------------------------------------------------------
// Conditional Expressions (User-Friendly)
// ---------------------------------------------------------------------------

/**
 * A user-friendly condition expression format.
 */
export type ConditionExpressionDefinition =
  | StringCondition
  | ComparisonCondition
  | CompoundCondition;

/**
 * String shorthand: "context.lead.score > 50"
 * Parsed at load time into a ConditionExpression.
 */
export interface StringCondition {
  expression: string;
}

/**
 * Structured comparison condition.
 */
export interface ComparisonCondition {
  path: string;
  operator: ComparisonOperator;
  value: unknown;
  /**
   * Optional label describing this condition for observability.
   */
  label?: string;
}

export type ComparisonOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "matches"
  | "exists"
  | "not_exists"
  | "truthy"
  | "falsy";

/**
 * Compound condition with logical operators.
 */
export interface CompoundCondition {
  operator: "and" | "or" | "not";
  conditions: ConditionExpressionDefinition[];
}

// ---------------------------------------------------------------------------
// Route Definitions
// ---------------------------------------------------------------------------

/**
 * A routing target in a conditional router.
 */
export interface RouteDefinition {
  /** Target node to route to */
  next: NodeId;
  /** Optional context transformations to apply before routing */
  contextTransform?: ContextTransform[];
}

// ---------------------------------------------------------------------------
// Parallel Branch Definitions
// ---------------------------------------------------------------------------

/**
 * A parallel execution branch.
 */
export interface ParallelBranchDefinition {
  /** Branch label */
  label?: string;
  /** Ordered list of node IDs to execute in this branch */
  steps: NodeId[];
}

// ---------------------------------------------------------------------------
// Merge Strategy Definitions
// ---------------------------------------------------------------------------

/**
 * Strategies for merging parallel branch results.
 */
export type MergeStrategyDefinition =
  | { type: "merge_all"; namespace?: string }
  | { type: "pick_first"; fields: string[] }
  | { type: "pick_best"; field: string; criteria: "completeness" | "confidence" | "latest" }
  | { type: "concatenate"; field: string; separator?: string }
  | { type: "custom"; handler: string };

// ---------------------------------------------------------------------------
// Context Mapping Definitions
// ---------------------------------------------------------------------------

/**
 * A simplified context mapping entry for workflow files.
 */
export interface ContextMappingDefinition {
  /** Source field path */
  from: string;
  /** Target field path */
  to: string;
  /** Optional transformation */
  transform?: ContextTransformDefinition;
  /** Whether this mapping is required */
  required?: boolean;
  /** Default value if source is missing */
  default?: unknown;
}

/**
 * User-friendly context transform definition.
 */
export interface ContextTransformDefinition {
  type: string;
  /** Parameters keyed by name */
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Shared Node Definitions
// ---------------------------------------------------------------------------

/**
 * A reusable node definition that can be referenced from multiple places.
 */
export interface SharedNodeDefinition {
  /** The node definition to share */
  node: NodeDefinition;
  /** Description of when this shared node is used */
  usage?: string;
}

// ---------------------------------------------------------------------------
// Chain Definition (Simplified Linear)
// ---------------------------------------------------------------------------

/**
 * Simplified chain definition for sequential workflows.
 * Compiled into an AgentChain at load time.
 */
export interface ChainDefinition {
  /** Ordered list of steps */
  steps: ChainStepDefinition[];
  /** Global timeout in ms */
  timeoutMs?: number;
  /** Deadline ISO string */
  deadline?: string;
  /** Input contract */
  inputContract?: ContractDefinition;
  /** Output contract */
  outputContract?: ContractDefinition;
  /** Default retry config for all steps */
  defaultRetry?: RetryDefinition;
  /** Error handling */
  onFailure?: "abort" | "skip" | "continue";
}

/**
 * A step definition within a chain workflow.
 */
export interface ChainStepDefinition {
  /** Step identifier */
  id: string;
  /** Agent to execute */
  agent: AgentName;
  /** Instruction */
  instruction: string;
  /** Human-readable label */
  label?: string;
  /** Input mappings */
  inputs?: ContextMappingDefinition[];
  /** Output mappings */
  outputs?: ContextMappingDefinition[];
  /** Step timeout in ms */
  timeoutMs?: number;
  /** Retry config override */
  retry?: RetryDefinition;
  /** Skip condition */
  skipWhen?: SkipConditionDefinition;
  /** On failure behavior override */
  onFailure?: "retry" | "skip" | "abort";
}

/**
 * Retry configuration for chain steps.
 */
export interface RetryDefinition {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  retryOnTimeout?: boolean;
}

/**
 * Skip condition for chain steps.
 */
export interface SkipConditionDefinition {
  path: string;
  when: unknown[];
  message?: string;
}

/**
 * Context contract definition for chain boundaries.
 */
export interface ContractDefinition {
  required: Record<string, string>;
  optional?: Record<string, string>;
  additionalFields?: boolean;
}

// ---------------------------------------------------------------------------
// Workflow Compilation & Validation
// ---------------------------------------------------------------------------

/**
 * Result of compiling a WorkflowDefinition into an AgentGraph.
 */
export interface WorkflowCompilationResult {
  success: boolean;
  graph?: import("./agent-graph").AgentGraph;
  chain?: import("./agent-chain").AgentChain;
  errors: CompilationError[];
  warnings: CompilationWarning[];
}

/**
 * A compilation error — the workflow definition is invalid.
 */
export interface CompilationError {
  code: string;
  message: string;
  path?: string;  // JSON path to the problematic field
}

/**
 * A compilation warning — the workflow definition is valid but has issues.
 */
export interface CompilationWarning {
  code: string;
  message: string;
  path?: string;
}

/**
 * Parse a condition expression from its user-friendly string form.
 * Example: "context.lead.score > 50" -> { path: "lead.score", operator: "gt", value: 50 }
 */
export function parseConditionExpression(
  expr: ConditionExpressionDefinition
): import("./agent-graph").ConditionExpression {
  // If it's already a structured comparison, normalize it
  if ("path" in expr && "operator" in expr) {
    const comparison = expr as ComparisonCondition;
    return {
      path: comparison.path,
      operator: normalizeOperator(comparison.operator),
      value: comparison.value,
    };
  }

  // If it's a compound condition, we parse the string form
  if ("expression" in expr) {
    return parseStringExpression((expr as StringCondition).expression);
  }

  // Compound conditions are handled at a higher level
  throw new Error("Compound conditions must be preprocessed before parsing");
}

function parseStringExpression(expression: string): import("./agent-graph").ConditionExpression {
  // Pattern: context.<path> <operator> <value>
  const match = expression.match(/^context\.([^\s]+)\s+([^\s]+)\s+(.+)$/);
  if (!match) {
    throw new Error(`Cannot parse condition expression: "${expression}"`);
  }

  const [, path, opStr, valueStr] = match;
  const operator = normalizeOperator(opStr);
  const value = parseConditionValue(valueStr);

  return { path, operator, value };
}

function normalizeOperator(op: string): import("./agent-graph").ComparisonOperator {
  const operatorMap: Record<string, import("./agent-graph").ComparisonOperator> = {
    "==": "eq",
    "=": "eq",
    "eq": "eq",
    "equals": "eq",
    "!=": "neq",
    "neq": "neq",
    "not_equals": "neq",
    ">": "gt",
    "gt": "gt",
    "greater_than": "gt",
    ">=": "gte",
    "gte": "gte",
    ">=": "gte",
    "<": "lt",
    "lt": "lt",
    "less_than": "lt",
    "<=": "lte",
    "lte": "lte",
    "<=": "lte",
    "in": "in",
    "not_in": "not_in",
    "contains": "contains",
    "starts_with": "starts_with",
    "ends_with": "ends_with",
    "matches": "matches",
    "exists": "exists",
    "not_exists": "not_exists",
    "truthy": "truthy",
    "falsy": "falsy",
  };

  const normalized = operatorMap[op.toLowerCase()];
  if (!normalized) {
    throw new Error(`Unknown operator: "${op}". Supported operators: ${Object.keys(operatorMap).join(", ")}`);
  }
  return normalized;
}

function parseConditionValue(value: string): unknown {
  // Try number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  // Try boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  // Try null
  if (value.toLowerCase() === "null" || value.toLowerCase() === "nil") return null;
  // String — remove surrounding quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // Otherwise treat as string
  return value;
}

/**
 * Validate a WorkflowDefinition structure against the schema rules.
 */
export function validateDefinition(def: WorkflowDefinition): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Must have exactly one of graph or chain
  if (!def.graph && !def.chain) {
    errors.push({
      type: "error",
      code: "MISSING_STRUCTURE",
      message: "Workflow must define either a 'graph' or a 'chain' section.",
    });
  }

  if (def.graph && def.chain) {
    errors.push({
      type: "error",
      code: "AMBIGUOUS_STRUCTURE",
      message: "Workflow cannot define both 'graph' and 'chain'. Choose one structure type.",
    });
  }

  // Validate metadata
  if (!def.workflow?.id) {
    errors.push({
      type: "error",
      code: "MISSING_ID",
      message: "'workflow.id' is required.",
      path: "workflow.id",
    });
  }

  if (!def.workflow?.name) {
    errors.push({
      type: "error",
      code: "MISSING_NAME",
      message: "'workflow.name' is required.",
      path: "workflow.name",
    });
  }

  // Validate graph structure
  if (def.graph) {
    validateGraphStructure(def.graph, errors, warnings);
  }

  // Validate chain structure
  if (def.chain) {
    validateChainStructure(def.chain, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateGraphStructure(
  graph: GraphDefinition,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  const nodeIds = Object.keys(graph.nodes);

  if (nodeIds.length === 0) {
    errors.push({
      type: "error",
      code: "EMPTY_GRAPH",
      message: "Graph must contain at least one node.",
      path: "graph.nodes",
    });
    return;
  }

  // Check startAt references existing node
  if (!nodeIds.includes(graph.startAt)) {
    errors.push({
      type: "error",
      code: "INVALID_START",
      message: `graph.startAt references "${graph.startAt}" but no such node exists. Available nodes: ${nodeIds.join(", ")}`,
      path: "graph.startAt",
    });
  }

  // Validate each node
  for (const [id, nodeDef] of Object.entries(graph.nodes)) {
    if (!nodeDef.type) {
      errors.push({
        type: "error",
        code: "MISSING_NODE_TYPE",
        message: `Node "${id}" is missing the required 'type' field. Must be one of: agent, router, parallel, synchronizer, subworkflow.`,
        path: `graph.nodes.${id}.type`,
      });
    }

    // Agent-specific validation
    if (nodeDef.type === "agent") {
      const agentDef = nodeDef as AgentNodeDefinition;
      if (!agentDef.agent) {
        errors.push({
          type: "error",
          code: "MISSING_AGENT",
          message: `Agent node "${id}" is missing the required 'agent' field.`,
          path: `graph.nodes.${id}.agent`,
        });
      }
      if (!agentDef.instruction) {
        errors.push({
          type: "error",
          code: "MISSING_INSTRUCTION",
          message: `Agent node "${id}" is missing the required 'instruction' field.`,
          path: `graph.nodes.${id}.instruction`,
        });
      }
    }

    // Router-specific validation
    if (nodeDef.type === "router") {
      const routerDef = nodeDef as ConditionalRouterDefinition;
      if (!routerDef.condition) {
        errors.push({
          type: "error",
          code: "MISSING_CONDITION",
          message: `Router node "${id}" is missing the required 'condition' field.`,
          path: `graph.nodes.${id}.condition`,
        });
      }
      if (!routerDef.routes || Object.keys(routerDef.routes).length === 0) {
        errors.push({
          type: "error",
          code: "MISSING_ROUTES",
          message: `Router node "${id}" must have at least one route defined in 'routes'.`,
          path: `graph.nodes.${id}.routes`,
        });
      }
    }

    // Parallel-specific validation
    if (nodeDef.type === "parallel") {
      const parallelDef = nodeDef as ParallelForkDefinition;
      if (!parallelDef.branches || parallelDef.branches.length < 2) {
        errors.push({
          type: "error",
          code: "INVALID_BRANCHES",
          message: `Parallel node "${id}" must have at least 2 branches.`,
          path: `graph.nodes.${id}.branches`,
        });
      }
    }
  }

  // Validate edges reference existing nodes
  if (graph.edges) {
    for (let i = 0; i < graph.edges.length; i++) {
      const edge = graph.edges[i];
      if (edge.from && !nodeIds.includes(edge.from)) {
        errors.push({
          type: "error",
          code: "INVALID_EDGE_SOURCE",
          message: `Edge ${i} references source "${edge.from}" which does not exist.`,
          path: `graph.edges[${i}].from`,
        });
      }
      if (edge.to && !nodeIds.includes(edge.to)) {
        errors.push({
          type: "error",
          code: "INVALID_EDGE_TARGET",
          message: `Edge ${i} references target "${edge.to}" which does not exist.`,
          path: `graph.edges[${i}].to`,
        });
      }
    }
  } else {
    warnings.push({
      type: "warning",
      code: "NO_EDGES",
      message: "Graph has no edges defined. Nodes will not be connected.",
      path: "graph.edges",
    });
  }
}

function validateChainStructure(
  chain: ChainDefinition,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  if (!chain.steps || chain.steps.length === 0) {
    errors.push({
      type: "error",
      code: "EMPTY_CHAIN",
      message: "Chain must contain at least one step.",
      path: "chain.steps",
    });
    return;
  }

  const seenIds = new Set<string>();
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];

    if (!step.id) {
      errors.push({
        type: "error",
        code: "MISSING_STEP_ID",
        message: `Step at index ${i} is missing the required 'id' field.`,
        path: `chain.steps[${i}].id`,
      });
      continue;
    }

    if (seenIds.has(step.id)) {
      errors.push({
        type: "error",
        code: "DUPLICATE_STEP_ID",
        message: `Duplicate step ID "${step.id}" at index ${i}.`,
        path: `chain.steps[${i}].id`,
      });
    }
    seenIds.add(step.id);

    if (!step.agent) {
      errors.push({
        type: "error",
        code: "MISSING_AGENT",
        message: `Step "${step.id}" is missing the required 'agent' field.`,
        path: `chain.steps[${i}].agent`,
      });
    }

    if (!step.instruction) {
      errors.push({
        type: "error",
        code: "MISSING_INSTRUCTION",
        message: `Step "${step.id}" is missing the required 'instruction' field.`,
        path: `chain.steps[${i}].instruction`,
      });
    }
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// Compiler: WorkflowDefinition -> AgentGraph / AgentChain
// ---------------------------------------------------------------------------

/**
 * Compile a WorkflowDefinition into an executable AgentGraph.
 */
export function compileToGraph(def: WorkflowDefinition): WorkflowCompilationResult {
  if (!def.graph) {
    return {
      success: false,
      errors: [{ code: "NO_GRAPH", message: "Workflow definition has no 'graph' section" }],
      warnings: [],
    };
  }

  const errors: CompilationError[] = [];
  const warnings: CompilationWarning[] = [];

  try {
    const validation = validateDefinition(def);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => ({ code: e.code, message: e.message, path: e.path })),
        warnings: validation.warnings.map(w => ({ code: w.code, message: w.message, path: w.path })),
      };
    }

    // Build nodes map
    const nodes = new Map<string, import("./agent-graph").GraphNode>();
    for (const [id, nodeDef] of Object.entries(def.graph.nodes)) {
      nodes.set(id, compileNode(id, nodeDef, errors));
    }

    // Build edges map
    const edges = new Map<string, import("./agent-graph").GraphEdge>();
    if (def.graph.edges) {
      for (let i = 0; i < def.graph.edges.length; i++) {
        const edgeDef = def.graph.edges[i];
        const edgeId = `edge_${i}`;
        edges.set(edgeId, {
          id: edgeId,
          sourceId: edgeDef.from,
          targetId: edgeDef.to,
          type: edgeDef.type || "sequential",
          label: edgeDef.label,
          condition: edgeDef.condition
            ? parseConditionExpression(edgeDef.condition)
            : undefined,
        });
      }
    }

    // Determine start and end nodes
    const startNodeId = def.graph.startAt;

    // Find end nodes (nodes with no outgoing edges)
    const allTargets = new Set(edges.values().map(e => e.targetId));
    const endNodeId = findEndNode(nodes, edges, startNodeId);

    return {
      success: errors.length === 0,
      graph: {
        id: def.workflow.id,
        name: def.workflow.name,
        version: def.workflow.version,
        description: def.workflow.description,
        nodes,
        edges,
        startNodeId,
        endNodeId,
        metadata: {
          owner: def.workflow.owner,
          slaTargetSeconds: def.workflow.slaTargetSeconds,
          severity: def.workflow.severity,
          tags: def.workflow.tags,
          created: def.workflow.created,
          modified: def.workflow.modified,
        },
      },
      errors,
      warnings,
    };
  } catch (err) {
    errors.push({
      code: "COMPILATION_ERROR",
      message: err instanceof Error ? err.message : String(err),
    });
    return { success: false, errors, warnings };
  }
}

function compileNode(
  id: string,
  nodeDef: NodeDefinition,
  errors: CompilationError[]
): import("./agent-graph").GraphNode {
  const base = {
    id,
    label: nodeDef.label || id,
    description: nodeDef.description || "",
  };

  switch (nodeDef.type) {
    case "agent": {
      const agentDef = nodeDef as AgentNodeDefinition;
      return {
        ...base,
        type: "agent_node",
        agent: agentDef.agent,
        instruction: agentDef.instruction,
        inputs: (agentDef.inputs || []).map(normalizeMapping),
        outputs: (agentDef.outputs || []).map(normalizeMapping),
        policy: compilePolicy(agentDef.policy),
        timeoutMs: agentDef.timeoutMs,
        maxRetries: agentDef.maxRetries,
      } as import("./agent-graph").AgentNode;
    }

    case "router": {
      const routerDef = nodeDef as ConditionalRouterDefinition;
      const routes: Record<string, import("./agent-graph").RouteTarget> = {};
      for (const [key, routeDef] of Object.entries(routerDef.routes)) {
        routes[key] = {
          nodeId: routeDef.next,
          contextTransform: routeDef.contextTransform,
        };
      }
      return {
        ...base,
        type: "conditional_router",
        condition: parseConditionExpression(routerDef.condition),
        routes,
        defaultRoute: routerDef.defaultRoute
          ? { nodeId: routerDef.defaultRoute.next, contextTransform: routerDef.defaultRoute.contextTransform }
          : undefined,
      } as import("./agent-graph").ConditionalRouter;
    }

    case "parallel": {
      const parallelDef = nodeDef as ParallelForkDefinition;
      return {
        ...base,
        type: "parallel_fork",
        branches: parallelDef.branches.map((b, i) => ({
          id: `${id}_branch_${i}`,
          label: b.label || `Branch ${i + 1}`,
          nodeIds: b.steps,
        })),
        joinPolicy: {
          failureMode: parallelDef.failureMode || "fail_fast",
          timeoutMs: parallelDef.timeoutMs,
        },
      } as import("./agent-graph").ParallelFork;
    }

    case "synchronizer": {
      const syncDef = nodeDef as SynchronizerDefinition;
      return {
        ...base,
        type: "synchronizer",
        mergeStrategy: syncDef.mergeStrategy,
        forkId: "", // resolved during edge analysis
      } as import("./agent-graph").Synchronizer;
    }

    case "subworkflow": {
      const subDef = nodeDef as SubworkflowNodeDefinition;
      return {
        ...base,
        type: "subworkflow",
        workflowRef: subDef.workflowRef,
        inputs: (subDef.inputs || []).map(normalizeMapping),
        outputs: (subDef.outputs || []).map(normalizeMapping),
        failureMode: subDef.failureMode || "propagate",
      } as import("./agent-graph").SubworkflowNode;
    }

    default:
      errors.push({
        code: "UNKNOWN_NODE_TYPE",
        message: `Node "${id}" has unknown type "${(nodeDef as any).type}".`,
        path: `graph.nodes.${id}.type`,
      });
      throw new Error(`Unknown node type: ${(nodeDef as any).type}`);
  }
}

function normalizeMapping(mapping: ContextMappingDefinition): ContextMapping {
  return {
    source: mapping.from,
    target: mapping.to,
    transform: mapping.transform
      ? { type: mapping.transform.type as any, params: mapping.transform.params }
      : undefined,
    required: mapping.required,
    default: mapping.default,
  };
}

function compilePolicy(
  partial?: Partial<import("./agent-graph").ExecutionPolicy>
): import("./agent-graph").ExecutionPolicy {
  return {
    retry: partial?.retry ?? "limited",
    maxRetries: partial?.maxRetries ?? 2,
    backoffBaseMs: partial?.backoffBaseMs ?? 1000,
    backoffMaxMs: partial?.backoffMaxMs ?? 30000,
    backoffMultiplier: partial?.backoffMultiplier ?? 2,
    jitter: partial?.jitter ?? true,
    onPermanentFailure: partial?.onPermanentFailure ?? "abort",
    timeoutMs: partial?.timeoutMs,
  };
}

function findEndNode(
  nodes: Map<string, import("./agent-graph").GraphNode>,
  edges: Map<string, import("./agent-graph").GraphEdge>,
  startNodeId: string
): string {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges.values()) {
    if (!outgoing.has(edge.sourceId)) {
      outgoing.set(edge.sourceId, []);
    }
    outgoing.get(edge.sourceId)!.push(edge.targetId);
  }

  // Find terminal nodes
  const terminalNodes: string[] = [];
  for (const id of nodes.keys()) {
    if (!outgoing.has(id) || outgoing.get(id)!.length === 0) {
      terminalNodes.push(id);
    }
  }

  if (terminalNodes.length === 1) {
    return terminalNodes[0];
  }

  // If multiple terminal nodes, create a synthetic end node
  // In practice, the engine should handle this more gracefully
  return terminalNodes[0] || startNodeId;
}
