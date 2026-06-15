// ============================================================================
// Graph Validator — Comprehensive Test Scenarios
// ============================================================================
// This file defines test scenarios for both layers of graph validation:
//
//   Layer 1 — WorkflowDefinition Validation  (lib/engine/workflow-definition.ts)
//     validateDefinition() checks schema correctness: node types, required
//     fields, edge references, router/parallel structure.
//
//   Layer 2 — DAG Execution Validation  (lib/engine/workflow-execution.ts)
//     DagBuilder.validate() checks structural integrity: cycles, orphans,
//     duplicate IDs, self-loops, reachability, agent registry references.
//
// Each scenario provides graph data that can be fed into either layer,
// with an expected pass/fail outcome and the specific error code that
// should be produced on failure.
//
// Usage:
//   import { scenarios } from "./graph-validator-scenarios";
//   for (const s of scenarios) {
//     if (s.expectedToPass) {
//       expect(validateDefinition(s.toDefinition())).toBeValid();
//     } else {
//       expect(validateDefinition(s.toDefinition())).toFailWith(s.errorCode);
//     }
//   }
// ============================================================================

// ---------------------------------------------------------------------------
// Imports — types from both validation layers
// ---------------------------------------------------------------------------

// Layer 1: User-facing authoring format (YAML/JSON schema)
import type {
  WorkflowDefinition as UserWorkflowDefinition,
  GraphDefinition,
  WorkflowMeta,
  NodeDefinition,
  EdgeDefinition,
  AgentNodeDefinition,
  ConditionalRouterDefinition,
  ParallelForkDefinition,
  SynchronizerDefinition,
  SubworkflowNodeDefinition,
  RouteDefinition,
  ConditionExpressionDefinition,
  MergeStrategyDefinition,
} from "../../lib/engine/workflow-definition";

// Layer 2: Execution-layer compiled format (DagBuilder / ExecutionLoop)
import type {
  WorkflowDefinition as ExecutionWorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowMode,
  WorkflowConfig,
} from "../../lib/engine/workflow-execution";

// ---------------------------------------------------------------------------
// Scenario Type
// ---------------------------------------------------------------------------

/**
 * A single graph validator test scenario.
 *
 * Each scenario contains both the user-facing (authoring) representation and
 * the execution-layer representation of the same graph, so the same scenario
 * can be validated through both layers independently.
 *
 * Scenarios with `expectedToPass: true` exercise a valid graph structure.
 * Scenarios with `expectedToPass: false` exercise a specific validation error.
 */
export interface GraphValidatorScenario {
  /** Human-readable label for this scenario (used in test output / describe blocks) */
  label: string;

  /** Detailed description of what this scenario validates and why */
  description: string;

  /** Whether validation should pass (true) or fail (false) */
  expectedToPass: boolean;

  /**
   * Expected error code when `expectedToPass` is false.
   * Matches the `code` field in `ValidationIssue` / `CompilationError`.
   * When `expectedToPass` is true, this is undefined.
   */
  errorCode?: string;

  // -----------------------------------------------------------------------
  // Layer 1 — User-facing WorkflowDefinition (authoring format)
  // -----------------------------------------------------------------------

  /**
   * The workflow metadata section. Required for Layer 1 validation.
   */
  workflowMeta: WorkflowMeta;

  /**
   * The graph definition (nodes + edges + startAt).
   * This is what validateDefinition() checks.
   */
  graphDefinition: GraphDefinition;

  // -----------------------------------------------------------------------
  // Layer 2 — Execution-layer WorkflowDefinition (compiled format)
  // -----------------------------------------------------------------------

  /**
   * The execution-layer mode.
   * DagBuilder.validate() uses this for mode-specific checks
   * (e.g., SINGLE_AGENT must have exactly 1 node).
   */
  executionMode: WorkflowMode;

  /**
   * Flat list of execution nodes.
   * This is what DagBuilder.build() sorts topologically.
   */
  executionNodes: WorkflowNode[];

  /**
   * Typed edges between execution nodes.
   */
  executionEdges: WorkflowEdge[];

  /**
   * Execution config (parallelLimit, failBehavior, etc.).
   */
  executionConfig: WorkflowConfig;
}

// ---------------------------------------------------------------------------
// Helper Factories
// ---------------------------------------------------------------------------

/**
 * Build a complete user-facing WorkflowDefinition from a scenario's parts.
 * Can be fed directly into validateDefinition().
 */
export function toUserDefinition(scenario: GraphValidatorScenario): UserWorkflowDefinition {
  return {
    workflow: scenario.workflowMeta,
    graph: scenario.graphDefinition,
  };
}

/**
 * Build a complete execution-layer WorkflowDefinition from a scenario's parts.
 * Can be fed directly into DagBuilder.validate() or DagBuilder.build().
 */
export function toExecutionDefinition(scenario: GraphValidatorScenario): ExecutionWorkflowDefinition {
  return {
    workflowId: scenario.workflowMeta.id,
    name: scenario.workflowMeta.name,
    mode: scenario.executionMode,
    nodes: scenario.executionNodes,
    edges: scenario.executionEdges,
    config: scenario.executionConfig,
  };
}

// ---------------------------------------------------------------------------
// Shared Defaults
// ---------------------------------------------------------------------------

const defaultWorkflowMeta: WorkflowMeta = {
  id: "test-workflow",
  name: "Test Workflow",
  version: "1.0.0",
  description: "Test scenario for graph validation",
};

const defaultConfig: WorkflowConfig = {
  parallelLimit: 4,
  failBehavior: "ABORT",
  contextPersistence: true,
  tracingEnabled: false,
};

const singleAgentConfig: WorkflowConfig = {
  parallelLimit: 1,
  failBehavior: "ABORT",
  contextPersistence: false,
  tracingEnabled: false,
};

// ---------------------------------------------------------------------------
// Helper: Build an agent node definition (Layer 1)
// ---------------------------------------------------------------------------

function agentDef(
  id: string,
  agentName: string,
  instruction: string,
  label?: string,
): NodeDefinition {
  return {
    type: "agent",
    agent: agentName,
    instruction,
    label: label ?? agentName,
  } as AgentNodeDefinition;
}

// ---------------------------------------------------------------------------
// Helper: Build an agent execution node (Layer 2)
// ---------------------------------------------------------------------------

function execNode(
  nodeId: string,
  agentId: string,
  description: string,
  timeoutMs: number = 30_000,
  maxRetries: number = 2,
): WorkflowNode {
  return {
    nodeId,
    agentId,
    description,
    inputMapping: {},
    outputMapping: {},
    timeoutMs,
    maxRetries,
  };
}

// ---------------------------------------------------------------------------
// ===========================================================================
// SCENARIOS — VALID WORKFLOWS (should PASS)
// ===========================================================================
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scenario 1 — Simple linear chain: A → B → C
// ---------------------------------------------------------------------------
// A basic sequential pipeline of three agent nodes. The most common workflow
// topology. Tests that a straightforward DAG with a single path is accepted.
// ---------------------------------------------------------------------------

export const linearChain: GraphValidatorScenario = {
  label: "VALID: Simple linear chain (A → B → C)",
  description:
    "Three agent nodes connected sequentially in a straight line. " +
    "This validates the most basic DAG topology: A feeds into B, B feeds into C. " +
    "All nodes are reachable, edges reference valid targets, and the graph is acyclic.",

  expectedToPass: true,

  // --- Layer 1 ---
  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "linear-chain-test",
    name: "Linear Chain Graph",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Execute step A"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Execute step B"),
      "node-c": agentDef("node-c", "infrastructure-maintainer", "Execute step C"),
    },
    edges: [
      { from: "node-a", to: "node-b", type: "sequential" },
      { from: "node-b", to: "node-c", type: "sequential" },
    ],
  },

  // --- Layer 2 ---
  executionMode: "CHAIN",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Execute step A"),
    execNode("node-b", "infrastructure-maintainer", "Execute step B"),
    execNode("node-c", "infrastructure-maintainer", "Execute step C"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
    { from: "node-b", to: "node-c", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 2 — DAG with parallel branches: A → B, A → C
// ---------------------------------------------------------------------------
// After node A completes, both B and C execute independently in parallel.
// Tests that a fan-out topology with multiple dependents is accepted.
// ---------------------------------------------------------------------------

export const dagParallelBranches: GraphValidatorScenario = {
  label: "VALID: DAG with parallel branches (A → B, A → C)",
  description:
    "A single source node fans out to two parallel successors. " +
    "Node A is the root; nodes B and C each depend only on A and can execute " +
    "concurrently. Validates fan-out / multi-child topology acceptance.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "parallel-branches-test",
    name: "DAG with Parallel Branches",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Research phase"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Analysis branch"),
      "node-c": agentDef("node-c", "infrastructure-maintainer", "Reporting branch"),
    },
    edges: [
      { from: "node-a", to: "node-b", type: "sequential" },
      { from: "node-a", to: "node-c", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Research phase"),
    execNode("node-b", "infrastructure-maintainer", "Analysis branch"),
    execNode("node-c", "infrastructure-maintainer", "Reporting branch"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
    { from: "node-a", to: "node-c", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig, parallelLimit: 4 },
};

// ---------------------------------------------------------------------------
// Scenario 3 — DAG with conditional router: Router → RouteA, Router → RouteB
// ---------------------------------------------------------------------------
// A conditional router evaluates an expression and routes execution down the
// matching path. Tests that router nodes with valid conditions and routes are
// accepted at both validation layers.
// ---------------------------------------------------------------------------

export const conditionalRouter: GraphValidatorScenario = {
  label: "VALID: DAG with conditional router (Router → RouteA, Router → RouteB)",
  description:
    "A conditional router node with a comparison condition and two routes. " +
    "After the router executes, exactly one route fires depending on the " +
    "evaluated condition. This scenario validates that a router with properly " +
    "defined conditions, routes, and conditional edges passes both layers.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "conditional-router-test",
    name: "Conditional Router Workflow",
  },
  graphDefinition: {
    startAt: "classifier",
    nodes: {
      classifier: {
        type: "router",
        label: "Intent Classifier",
        description: "Classifies the input intent and routes accordingly",
        condition: {
          expression: "context.query.intent == support",
        },
        routes: {
          support: { next: "support-agent" },
          sales: { next: "sales-agent" },
        },
        defaultRoute: { next: "support-agent" },
      } as ConditionalRouterDefinition,
      "support-agent": agentDef("support-agent", "infrastructure-maintainer", "Handle support ticket"),
      "sales-agent": agentDef("sales-agent", "infrastructure-maintainer", "Handle sales inquiry"),
    },
    edges: [
      { from: "classifier", to: "support-agent", type: "conditional_true", condition: { expression: "context.query.intent == support" } },
      { from: "classifier", to: "sales-agent", type: "conditional_true", condition: { expression: "context.query.intent == sales" } },
      { from: "classifier", to: "support-agent", type: "conditional_false", condition: { expression: "context.query.intent == unknown" } },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("classifier", "infrastructure-maintainer", "Classify intent and route"),
    execNode("support-agent", "infrastructure-maintainer", "Handle support ticket"),
    execNode("sales-agent", "infrastructure-maintainer", "Handle sales inquiry"),
  ],
  executionEdges: [
    { from: "classifier", to: "support-agent", type: "CONDITIONAL_TRUE", condition: { field: "query.intent", operator: "EQ", value: "support" } },
    { from: "classifier", to: "sales-agent", type: "CONDITIONAL_TRUE", condition: { field: "query.intent", operator: "EQ", value: "sales" } },
    { from: "classifier", to: "support-agent", type: "CONDITIONAL_FALSE", condition: { field: "query.intent", operator: "EQ", value: "unknown" } },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 4 — DAG with parallel fork + synchronizer
// ---------------------------------------------------------------------------
// A parallel fork splits execution across multiple branches, each running
// independently. A synchronizer node collects and merges the branch outputs.
// Tests that fork/join patterns with proper merge strategies are accepted.
// ---------------------------------------------------------------------------

export const parallelForkSynchronizer: GraphValidatorScenario = {
  label: "VALID: DAG with parallel fork + synchronizer",
  description:
    "A parallel fork node launches three concurrent branches. Each branch " +
    "contains a single agent. After all branches complete, a synchronizer " +
    "collects their outputs using a merge-all strategy. This validates that " +
    "the fork-join pattern common in parallel processing workflows is accepted.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "fork-join-test",
    name: "Parallel Fork + Synchronizer",
  },
  graphDefinition: {
    startAt: "fork",
    nodes: {
      fork: {
        type: "parallel",
        label: "Parallel Analysis",
        description: "Runs three analysis branches concurrently",
        branches: [
          { label: "Log Analysis", steps: ["log-analyzer"] },
          { label: "Metric Analysis", steps: ["metric-analyzer"] },
          { label: "Trace Analysis", steps: ["trace-analyzer"] },
        ],
        failureMode: "wait_for_all",
      } as ParallelForkDefinition,
      "log-analyzer": agentDef("log-analyzer", "infrastructure-maintainer", "Analyze log files"),
      "metric-analyzer": agentDef("metric-analyzer", "infrastructure-maintainer", "Analyze metrics"),
      "trace-analyzer": agentDef("trace-analyzer", "infrastructure-maintainer", "Analyze traces"),
      synchronizer: {
        type: "synchronizer",
        label: "Merge Results",
        description: "Merges outputs from all parallel branches",
        mergeStrategy: { type: "merge_all", namespace: "analysis" },
      } as SynchronizerDefinition,
    },
    edges: [
      { from: "fork", to: "log-analyzer", type: "sequential" },
      { from: "fork", to: "metric-analyzer", type: "sequential" },
      { from: "fork", to: "trace-analyzer", type: "sequential" },
      { from: "log-analyzer", to: "synchronizer", type: "sequential" },
      { from: "metric-analyzer", to: "synchronizer", type: "sequential" },
      { from: "trace-analyzer", to: "synchronizer", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("fork", "infrastructure-maintainer", "Parallel fork node"),
    execNode("log-analyzer", "infrastructure-maintainer", "Analyze log files"),
    execNode("metric-analyzer", "infrastructure-maintainer", "Analyze metrics"),
    execNode("trace-analyzer", "infrastructure-maintainer", "Analyze traces"),
    execNode("synchronizer", "infrastructure-maintainer", "Merge parallel results"),
  ],
  executionEdges: [
    { from: "fork", to: "log-analyzer", type: "SEQUENTIAL" },
    { from: "fork", to: "metric-analyzer", type: "SEQUENTIAL" },
    { from: "fork", to: "trace-analyzer", type: "SEQUENTIAL" },
    { from: "log-analyzer", to: "synchronizer", type: "SEQUENTIAL" },
    { from: "metric-analyzer", to: "synchronizer", type: "SEQUENTIAL" },
    { from: "trace-analyzer", to: "synchronizer", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig, parallelLimit: 4 },
};

// ---------------------------------------------------------------------------
// Scenario 5 — Complex workflow with all node types
// ---------------------------------------------------------------------------
// A sophisticated workflow that exercises every node type: agent, router,
// parallel fork, synchronizer, and subworkflow. Tests that heterogeneous
// graphs with mixed node types are accepted and structurally coherent.
// ---------------------------------------------------------------------------

export const complexAllNodeTypes: GraphValidatorScenario = {
  label: "VALID: Complex workflow with all node types",
  description:
    "A comprehensive workflow incorporating all five node types: a root agent " +
    "feeds into a conditional router, which splits to a parallel fork on one " +
    "branch and a subworkflow on another. The parallel fork's results are " +
    "collected by a synchronizer, which merges into a final agent. Validates " +
    "that heterogeneous graphs with complex interconnectivity are accepted.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "complex-all-types-test",
    name: "Complex Multi-Type Workflow",
  },
  graphDefinition: {
    startAt: "entry-agent",
    nodes: {
      "entry-agent": agentDef("entry-agent", "infrastructure-maintainer", "Ingest and classify request"),
      router: {
        type: "router",
        label: "Request Router",
        condition: { expression: "context.request.priority > 5" },
        routes: {
          high: { next: "parallel-fork" },
          low: { next: "sub-task" },
        },
        defaultRoute: { next: "sub-task" },
      } as ConditionalRouterDefinition,
      "parallel-fork": {
        type: "parallel",
        label: "Parallel Processing",
        branches: [
          { label: "Branch A", steps: ["branch-a-agent"] },
          { label: "Branch B", steps: ["branch-b-agent"] },
        ],
        failureMode: "fail_fast",
      } as ParallelForkDefinition,
      "branch-a-agent": agentDef("branch-a-agent", "infrastructure-maintainer", "Process branch A work"),
      "branch-b-agent": agentDef("branch-b-agent", "infrastructure-maintainer", "Process branch B work"),
      synchronizer: {
        type: "synchronizer",
        label: "Merge Branches",
        mergeStrategy: { type: "merge_all", namespace: "merged" },
      } as SynchronizerDefinition,
      "sub-task": {
        type: "subworkflow",
        workflowRef: "workflows/low-priority-handler",
        label: "Low Priority Handler",
        inputs: [{ from: "context.request", to: "request" }],
        outputs: [{ from: "result", to: "context.subResult" }],
        failureMode: "propagate",
      } as SubworkflowNodeDefinition,
      "final-agent": agentDef("final-agent", "infrastructure-maintainer", "Compile final output"),
    },
    edges: [
      { from: "entry-agent", to: "router", type: "sequential" },
      { from: "router", to: "parallel-fork", type: "conditional_true", condition: { expression: "context.request.priority > 5" } },
      { from: "router", to: "sub-task", type: "conditional_false", condition: { expression: "context.request.priority <= 5" } },
      { from: "parallel-fork", to: "branch-a-agent", type: "sequential" },
      { from: "parallel-fork", to: "branch-b-agent", type: "sequential" },
      { from: "branch-a-agent", to: "synchronizer", type: "sequential" },
      { from: "branch-b-agent", to: "synchronizer", type: "sequential" },
      { from: "synchronizer", to: "final-agent", type: "sequential" },
      { from: "sub-task", to: "final-agent", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("entry-agent", "infrastructure-maintainer", "Ingest and classify request"),
    execNode("router", "infrastructure-maintainer", "Route by priority"),
    execNode("parallel-fork", "infrastructure-maintainer", "Parallel fork"),
    execNode("branch-a-agent", "infrastructure-maintainer", "Process branch A"),
    execNode("branch-b-agent", "infrastructure-maintainer", "Process branch B"),
    execNode("synchronizer", "infrastructure-maintainer", "Merge branches"),
    execNode("sub-task", "infrastructure-maintainer", "Low priority subworkflow"),
    execNode("final-agent", "infrastructure-maintainer", "Compile final output"),
  ],
  executionEdges: [
    { from: "entry-agent", to: "router", type: "SEQUENTIAL" },
    { from: "router", to: "parallel-fork", type: "CONDITIONAL_TRUE", condition: { field: "request.priority", operator: "GT", value: 5 } },
    { from: "router", to: "sub-task", type: "CONDITIONAL_FALSE", condition: { field: "request.priority", operator: "GT", value: 5 } },
    { from: "parallel-fork", to: "branch-a-agent", type: "SEQUENTIAL" },
    { from: "parallel-fork", to: "branch-b-agent", type: "SEQUENTIAL" },
    { from: "branch-a-agent", to: "synchronizer", type: "SEQUENTIAL" },
    { from: "branch-b-agent", to: "synchronizer", type: "SEQUENTIAL" },
    { from: "synchronizer", to: "final-agent", type: "SEQUENTIAL" },
    { from: "sub-task", to: "final-agent", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig, parallelLimit: 4 },
};

// ---------------------------------------------------------------------------
// Scenario 6 — Single node workflow
// ---------------------------------------------------------------------------
// A workflow with exactly one agent node and no edges. Tests that the
// SINGLE_AGENT mode is accepted, and that zero-edge graphs are valid when
// there's only one node (no orphan concern).
// ---------------------------------------------------------------------------

export const singleNode: GraphValidatorScenario = {
  label: "VALID: Single node workflow",
  description:
    "A degenerate workflow containing exactly one agent node with no edges. " +
    "In SINGLE_AGENT mode, the execution engine bypasses orchestration entirely. " +
    "Validates that trivial single-node graphs are accepted by both layers.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "single-node-test",
    name: "Single Node Workflow",
  },
  graphDefinition: {
    startAt: "sole-agent",
    nodes: {
      "sole-agent": agentDef("sole-agent", "infrastructure-maintainer", "Execute single task"),
    },
    edges: [],
  },

  executionMode: "SINGLE_AGENT",
  executionNodes: [
    execNode("sole-agent", "infrastructure-maintainer", "Execute single task"),
  ],
  executionEdges: [],
  executionConfig: { ...singleAgentConfig },
};

// ---------------------------------------------------------------------------
// Scenario 7 — Workflow with conditional edges and quality gate
// ---------------------------------------------------------------------------
// A workflow with a quality gate that feeds back to the same node for
// revision when the quality threshold is not met. This is NOT a cycle at the
// DAG level because the "loop back" edge is conditional (CONDITIONAL_FALSE)
// on the same node — it creates a valid auto-revision pattern.
// Tests that properly gated conditional self-references are accepted.
// ---------------------------------------------------------------------------

export const conditionalEdgeQualityGate: GraphValidatorScenario = {
  label: "VALID: Conditional edges with self-revision quality gate",
  description:
    "A content creation workflow where the creator node has a conditional " +
    "output. If qualityScore >= 0.8 (CONDITIONAL_TRUE), execution proceeds " +
    "to the distribution agent. If qualityScore < 0.8 (CONDITIONAL_FALSE), " +
    "the creator node is re-invoked for revision. While this creates a " +
    "conditional self-loop, it is a valid pattern: the conditional edge " +
    "ensures only one path is taken per execution, so no true cycle exists. " +
    "Both layers should accept this as a valid quality-gate pattern.",

  expectedToPass: true,

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "quality-gate-test",
    name: "Quality Gate Workflow",
  },
  graphDefinition: {
    startAt: "content-creator",
    nodes: {
      "content-creator": agentDef("content-creator", "infrastructure-maintainer", "Create and self-review content"),
      distributor: agentDef("distributor", "infrastructure-maintainer", "Distribute approved content"),
    },
    edges: [
      {
        from: "content-creator",
        to: "distributor",
        type: "conditional_true",
        condition: { expression: "context.content.qualityScore >= 0.8" },
      },
      {
        from: "content-creator",
        to: "content-creator",
        type: "conditional_false",
        condition: { expression: "context.content.qualityScore < 0.8" },
      },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("content-creator", "infrastructure-maintainer", "Create and self-review content"),
    execNode("distributor", "infrastructure-maintainer", "Distribute approved content"),
  ],
  executionEdges: [
    {
      from: "content-creator",
      to: "distributor",
      type: "CONDITIONAL_TRUE",
      condition: { field: "content.qualityScore", operator: "GTE", value: 0.8 },
    },
    {
      from: "content-creator",
      to: "content-creator",
      type: "CONDITIONAL_FALSE",
      condition: { field: "content.qualityScore", operator: "LT", value: 0.8 },
    },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// ===========================================================================
// SCENARIOS — INVALID WORKFLOWS (should FAIL)
// ===========================================================================
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scenario 8 — Graph with cycle: A → B → C → A
// ---------------------------------------------------------------------------
// Error code: CYCLE_DETECTED
// A classic feedback cycle where three nodes form a loop. Kahn's algorithm
// and DFS cycle detection must both identify this as invalid because no
// topological ordering exists for a cycle.
// ---------------------------------------------------------------------------

export const cycleDetected: GraphValidatorScenario = {
  label: "INVALID: Graph with cycle (A → B → C → A)",
  description:
    "Three nodes arranged in a directed cycle: A depends on nothing, " +
    "B depends on A, C depends on B, and A depends on C. This creates an " +
    "irresolvable circular dependency. No topological ordering exists. " +
    "Both Kahn's algorithm (workflow-execution) and DFS cycle detection " +
    "must reject this graph with CYCLE_DETECTED.",

  expectedToPass: false,
  errorCode: "CYCLE_DETECTED",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "cycle-test",
    name: "Cyclic Graph",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Step A"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Step B"),
      "node-c": agentDef("node-c", "infrastructure-maintainer", "Step C"),
    },
    edges: [
      { from: "node-a", to: "node-b", type: "sequential" },
      { from: "node-b", to: "node-c", type: "sequential" },
      { from: "node-c", to: "node-a", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Step A"),
    execNode("node-b", "infrastructure-maintainer", "Step B"),
    execNode("node-c", "infrastructure-maintainer", "Step C"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
    { from: "node-b", to: "node-c", type: "SEQUENTIAL" },
    { from: "node-c", to: "node-a", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 9 — Graph with self-loop on agent node: A → A
// ---------------------------------------------------------------------------
// Error code: SELF_LOOP
// An agent node has an edge pointing to itself via a sequential edge.
// Self-loops create an unresolvable immediate cycle and are structurally
// invalid in any DAG. The validate() method in DagBuilder explicitly checks
// edge.from === edge.to and flags it.
// ---------------------------------------------------------------------------

export const selfLoop: GraphValidatorScenario = {
  label: "INVALID: Graph with self-loop on agent node (A → A)",
  description:
    "An agent node has a sequential edge targeting itself. This creates " +
    "an immediate cycle of length 1 that makes topological sort impossible. " +
    "The DagBuilder.validate() method has an explicit self-loop check " +
    "(edge.from === edge.to) that must produce SELF_LOOP.",

  expectedToPass: false,
  errorCode: "SELF_LOOP",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "self-loop-test",
    name: "Self-Loop Graph",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Step A"),
    },
    edges: [
      { from: "node-a", to: "node-a", type: "sequential" },
    ],
  },

  executionMode: "SINGLE_AGENT",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Step A"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-a", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...singleAgentConfig },
};

// ---------------------------------------------------------------------------
// Scenario 10 — Orphan nodes (nodes with no edges)
// ---------------------------------------------------------------------------
// Error code: ORPHAN_NODE
// A graph with 3 nodes where only 2 are connected by edges and the third is
// completely disconnected. In DAG mode with multiple nodes, every node must
// participate in the graph structure. The orphan check in DagBuilder.validate()
// scans all nodes against the set of node IDs referenced by any edge.
// ---------------------------------------------------------------------------

export const orphanNode: GraphValidatorScenario = {
  label: "INVALID: Orphan nodes (nodes with no edges)",
  description:
    "Three nodes exist but only two are connected by edges. The third node " +
    "('node-c') appears in the nodes list but is never referenced as a source " +
    "or target of any edge. The DagBuilder orphan check detects nodes whose " +
    "ID does not appear in any edge's 'from' or 'to' field when edges exist " +
    "and the node count exceeds 1.",

  expectedToPass: false,
  errorCode: "ORPHAN_NODE",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "orphan-test",
    name: "Graph with Orphan Node",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Step A"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Step B"),
      "node-c": agentDef("node-c", "infrastructure-maintainer", "Step C — orphaned"),
    },
    edges: [
      { from: "node-a", to: "node-b", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Step A"),
    execNode("node-b", "infrastructure-maintainer", "Step B"),
    execNode("node-c", "infrastructure-maintainer", "Step C — orphaned"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 11 — Router with no routes
// ---------------------------------------------------------------------------
// Error code: INVALID_ROUTER
// A conditional router node must define at least one route in its `routes`
// map. Without routes, the router has no valid targets and execution cannot
// proceed. validateDefinition() checks routes length and produces
// MISSING_ROUTES (canonicalized to INVALID_ROUTER).
// ---------------------------------------------------------------------------

export const invalidRouterNoRoutes: GraphValidatorScenario = {
  label: "INVALID: Router with no routes defined",
  description:
    "A conditional router node exists but its 'routes' object is empty. " +
    "The router cannot direct execution to any downstream node without at " +
    "least one route. validateDefinition() explicitly checks that " +
    "Object.keys(routerDef.routes).length > 0 and emits MISSING_ROUTES.",

  expectedToPass: false,
  errorCode: "INVALID_ROUTER",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "invalid-router-test",
    name: "Router Without Routes",
  },
  graphDefinition: {
    startAt: "broken-router",
    nodes: {
      "broken-router": {
        type: "router",
        label: "Broken Router",
        description: "Router with no routes — should fail validation",
        condition: { expression: "context.value > 10" },
        routes: {},
      } as ConditionalRouterDefinition,
      "downstream-agent": agentDef("downstream-agent", "infrastructure-maintainer", "Downstream step"),
    },
    edges: [],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("broken-router", "infrastructure-maintainer", "Router with no routes"),
    execNode("downstream-agent", "infrastructure-maintainer", "Downstream step"),
  ],
  executionEdges: [],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 12 — Synchronizer with missing upstream parallel fork
// ---------------------------------------------------------------------------
// Error code: INVALID_SYNCHRONIZER
// A synchronizer node collects and merges outputs from parallel branches.
// If no parallel fork exists upstream (or the upstream nodes are not
// configured as branches of a parallel fork), the synchronizer has nothing
// to merge. This validates that the graph structure correctly pairs
// synchronizers with their upstream parallel forks.
// ---------------------------------------------------------------------------

export const invalidSynchronizer: GraphValidatorScenario = {
  label: "INVALID: Synchronizer with missing upstream parallel fork",
  description:
    "A synchronizer node is defined but no parallel fork exists in the graph " +
    "to provide the branches it's meant to synchronize. The synchronizer " +
    "receives inputs from multiple upstream agents, but those agents were " +
    "never launched as parallel branches — they are connected via regular " +
    "sequential edges from different sources. The synchronizer should only " +
    "be preceded by branches of a parallel fork. This structural mismatch " +
    "produces INVALID_SYNCHRONIZER.",

  expectedToPass: false,
  errorCode: "INVALID_SYNCHRONIZER",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "invalid-sync-test",
    name: "Synchronizer Without Fork",
  },
  graphDefinition: {
    startAt: "source-a",
    nodes: {
      "source-a": agentDef("source-a", "infrastructure-maintainer", "Source A"),
      "source-b": agentDef("source-b", "infrastructure-maintainer", "Source B"),
      synchronizer: {
        type: "synchronizer",
        label: "Orphan Synchronizer",
        description: "Synchronizer with no parallel fork upstream",
        mergeStrategy: { type: "merge_all", namespace: "results" },
      } as SynchronizerDefinition,
    },
    edges: [
      // source-a and source-b feed into synchronizer, but there's no
      // parallel fork that launched them as concurrent branches
      { from: "source-a", to: "synchronizer", type: "sequential" },
      { from: "source-b", to: "synchronizer", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("source-a", "infrastructure-maintainer", "Source A"),
    execNode("source-b", "infrastructure-maintainer", "Source B"),
    execNode("synchronizer", "infrastructure-maintainer", "Orphan synchronizer"),
  ],
  executionEdges: [
    { from: "source-a", to: "synchronizer", type: "SEQUENTIAL" },
    { from: "source-b", to: "synchronizer", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 13 — Edge referencing non-existent target node
// ---------------------------------------------------------------------------
// Error code: INVALID_EDGE_TARGET
// An edge's `to` field points to a node ID that does not exist in the
// graph's node map. Both validateDefinition() and DagBuilder.validate()
// check that every edge target exists in the node set and produce
// INVALID_EDGE_TARGET when violated.
// ---------------------------------------------------------------------------

export const invalidEdgeTarget: GraphValidatorScenario = {
  label: "INVALID: Edge references non-existent target node",
  description:
    "An edge defines a transition to a node ID ('phantom-node') that is " +
    "not present in the graph's nodes collection. Both validation layers " +
    "check that edge targets exist in the node set. This scenario triggers " +
    "INVALID_EDGE_TARGET at the definition layer and a similar error at " +
    "the execution layer.",

  expectedToPass: false,
  errorCode: "INVALID_EDGE_TARGET",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "invalid-edge-target-test",
    name: "Edge to Non-Existent Node",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Step A"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Step B"),
    },
    edges: [
      { from: "node-a", to: "node-b", type: "sequential" },
      // phantom-node does NOT exist in the nodes map
      { from: "node-b", to: "phantom-node", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Step A"),
    execNode("node-b", "infrastructure-maintainer", "Step B"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
    { from: "node-b", to: "phantom-node", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 14 — Duplicate node IDs
// ---------------------------------------------------------------------------
// Error code: DUPLICATE_NODE
// Two nodes share the same nodeId in the execution-layer definition.
// DagBuilder.validate() explicitly checks for duplicate nodeIds and rejects
// them. Duplicate IDs create ambiguity in adjacency maps, cycle detection,
// and execution planning.
// ---------------------------------------------------------------------------

export const duplicateNodeId: GraphValidatorScenario = {
  label: "INVALID: Duplicate node IDs",
  description:
    "The execution layer contains two nodes with the identical nodeId " +
    "'duplicate-agent'. DagBuilder.validate() iterates nodes and checks " +
    "for duplicates using a Set. When a duplicate is found, it appends " +
    "an error message containing 'Duplicate nodeId'. The canonical error " +
    "code is DUPLICATE_NODE.",

  expectedToPass: false,
  errorCode: "DUPLICATE_NODE",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "duplicate-node-test",
    name: "Duplicate Node IDs",
  },
  graphDefinition: {
    startAt: "duplicate-agent",
    nodes: {
      // In a Record<NodeId, NodeDefinition>, keys are unique by definition,
      // so Layer 1 cannot have true duplicates. This scenario targets the
      // execution-layer check in DagBuilder where nodes is an array.
      "duplicate-agent": agentDef("duplicate-agent", "infrastructure-maintainer", "First occurrence"),
    },
    edges: [],
  },

  executionMode: "DAG",
  executionNodes: [
    // Array-based — two entries with the same nodeId
    execNode("duplicate-agent", "infrastructure-maintainer", "First occurrence"),
    execNode("duplicate-agent", "infrastructure-maintainer", "Second occurrence — duplicate"),
  ],
  executionEdges: [],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 15 — Empty graph (zero nodes)
// ---------------------------------------------------------------------------
// Error code: EMPTY_GRAPH
// A graph definition with no nodes. Without nodes, there is nothing to
// execute. validateDefinition() checks nodeIds.length === 0 and emits
// EMPTY_GRAPH. DagBuilder.validate() also checks nodes.length === 0.
// ---------------------------------------------------------------------------

export const emptyGraph: GraphValidatorScenario = {
  label: "INVALID: Empty graph (zero nodes)",
  description:
    "The graph definition declares zero nodes in its nodes map. " +
    "validateDefinition() explicitly checks for empty node lists and " +
    "produces EMPTY_GRAPH. Similarly, DagBuilder.validate() requires " +
    "at least one node. A workflow with no nodes is structurally invalid " +
    "at both layers.",

  expectedToPass: false,
  errorCode: "EMPTY_GRAPH",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "empty-graph-test",
    name: "Empty Graph",
  },
  graphDefinition: {
    startAt: "nonexistent",
    nodes: {},
    edges: [],
  },

  executionMode: "DAG",
  executionNodes: [],
  executionEdges: [],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 16 — Router with invalid condition expression
// ---------------------------------------------------------------------------
// Error code: INVALID_CONDITION
// A router node has a malformed condition expression that cannot be parsed.
// The parseConditionExpression() function attempts to match the string
// against a regex pattern. If the expression does not match
// "context.<path> <operator> <value>", it throws an error.
// Validation should catch this and report INVALID_CONDITION.
// ---------------------------------------------------------------------------

export const invalidConditionExpression: GraphValidatorScenario = {
  label: "INVALID: Router with invalid condition expression",
  description:
    "A conditional router node has a condition expression that does not " +
    "match the expected format 'context.<path> <operator> <value>'. " +
    "The expression 'garbage === %% invalid' cannot be parsed by " +
    "parseStringExpression(), which uses a strict regex. At the definition " +
    "layer, this should surface as a condition parse error. The canonical " +
    "error code is INVALID_CONDITION.",

  expectedToPass: false,
  errorCode: "INVALID_CONDITION",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "invalid-condition-test",
    name: "Invalid Router Condition",
  },
  graphDefinition: {
    startAt: "bad-router",
    nodes: {
      "bad-router": {
        type: "router",
        label: "Bad Router",
        description: "Router with an unparseable condition expression",
        condition: {
          // This expression does not match the expected pattern
          // "context.<path> <operator> <value>" and will fail the regex
          expression: "garbage === %% invalid",
        },
        routes: {
          fallback: { next: "cleanup-agent" },
        },
      } as ConditionalRouterDefinition,
      "cleanup-agent": agentDef("cleanup-agent", "infrastructure-maintainer", "Fallback handler"),
    },
    edges: [
      { from: "bad-router", to: "cleanup-agent", type: "conditional_true", condition: { expression: "garbage === %% invalid" } },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("bad-router", "infrastructure-maintainer", "Bad condition router"),
    execNode("cleanup-agent", "infrastructure-maintainer", "Fallback handler"),
  ],
  executionEdges: [
    { from: "bad-router", to: "cleanup-agent", type: "CONDITIONAL_TRUE", condition: { field: "garbage", operator: "EQ", value: "%% invalid" } },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario 17 — Graph with unreachable nodes
// ---------------------------------------------------------------------------
// Error code: UNREACHABLE_NODE
// A graph where one or more nodes cannot be reached by traversing edges
// from the start node. In the user-facing definition, startAt defines the
// entry point. A connectivity analysis starting from startAt should visit
// all nodes. If a node is not reachable via any path from startAt, it is
// unreachable — it will never execute. This differs from an orphan node
// (no edges at all): an unreachable node may have incoming edges, but those
// edges come from other unreachable nodes, not from the main graph.
// ---------------------------------------------------------------------------

export const unreachableNode: GraphValidatorScenario = {
  label: "INVALID: Graph with unreachable nodes",
  description:
    "Four nodes exist but one ('isolated-node') is disconnected from the " +
    "main graph. The main chain A → B → C is reachable from startAt (node-a). " +
    "The isolated node has its own internal edge (D → E) but neither D nor E " +
    "has any connection to the main graph component. Unreachable nodes will " +
    "never execute because no path from startAt reaches them. This violates " +
    "the graph connectivity invariant.",

  expectedToPass: false,
  errorCode: "UNREACHABLE_NODE",

  workflowMeta: {
    ...defaultWorkflowMeta,
    id: "unreachable-test",
    name: "Graph with Unreachable Nodes",
  },
  graphDefinition: {
    startAt: "node-a",
    nodes: {
      "node-a": agentDef("node-a", "infrastructure-maintainer", "Step A — root"),
      "node-b": agentDef("node-b", "infrastructure-maintainer", "Step B"),
      "node-c": agentDef("node-c", "infrastructure-maintainer", "Step C"),
      "node-d": agentDef("node-d", "infrastructure-maintainer", "Step D — unreachable"),
      "node-e": agentDef("node-e", "infrastructure-maintainer", "Step E — unreachable"),
    },
    edges: [
      // Main connected component (reachable from node-a)
      { from: "node-a", to: "node-b", type: "sequential" },
      { from: "node-b", to: "node-c", type: "sequential" },
      // Isolated subgraph (not connected to the main component)
      { from: "node-d", to: "node-e", type: "sequential" },
    ],
  },

  executionMode: "DAG",
  executionNodes: [
    execNode("node-a", "infrastructure-maintainer", "Step A — root"),
    execNode("node-b", "infrastructure-maintainer", "Step B"),
    execNode("node-c", "infrastructure-maintainer", "Step C"),
    execNode("node-d", "infrastructure-maintainer", "Step D — unreachable"),
    execNode("node-e", "infrastructure-maintainer", "Step E — unreachable"),
  ],
  executionEdges: [
    { from: "node-a", to: "node-b", type: "SEQUENTIAL" },
    { from: "node-b", to: "node-c", type: "SEQUENTIAL" },
    { from: "node-d", to: "node-e", type: "SEQUENTIAL" },
  ],
  executionConfig: { ...defaultConfig },
};

// ---------------------------------------------------------------------------
// Scenario Index — Complete collection of all scenarios
// ---------------------------------------------------------------------------

/**
 * Complete array of all graph validator test scenarios.
 *
 * Ordered by category:
 *   - VALID (should pass):   scenarios [0..6]  (linearChain through conditionalEdgeQualityGate)
 *   - INVALID (should fail): scenarios [7..16] (cycleDetected through unreachableNode)
 *
 * Each scenario includes both Layer 1 (authoring format) and Layer 2
 * (execution format) representations of the same graph structure.
 */
export const scenarios: GraphValidatorScenario[] = [
  // ===== VALID — should PASS =====
  linearChain,
  dagParallelBranches,
  conditionalRouter,
  parallelForkSynchronizer,
  complexAllNodeTypes,
  singleNode,
  conditionalEdgeQualityGate,

  // ===== INVALID — should FAIL =====
  cycleDetected,
  selfLoop,
  orphanNode,
  invalidRouterNoRoutes,
  invalidSynchronizer,
  invalidEdgeTarget,
  duplicateNodeId,
  emptyGraph,
  invalidConditionExpression,
  unreachableNode,
];

// ---------------------------------------------------------------------------
// Categorized Accessors
// ---------------------------------------------------------------------------

/** All scenarios expected to pass validation. */
export const validScenarios: GraphValidatorScenario[] = scenarios.filter((s) => s.expectedToPass);

/** All scenarios expected to fail validation. */
export const invalidScenarios: GraphValidatorScenario[] = scenarios.filter((s) => !s.expectedToPass);

/** Look up a scenario by its label. */
export function findScenario(label: string): GraphValidatorScenario | undefined {
  return scenarios.find((s) => s.label === label);
}

/** Look up scenarios by error code. */
export function findByErrorCode(code: string): GraphValidatorScenario[] {
  return scenarios.filter((s) => s.errorCode === code);
}
