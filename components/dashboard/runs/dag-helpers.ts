// ============================================================================
// DAG Display Helpers
// ============================================================================
// Converts ExecutionRun data (WorkflowNode[] + ExecutionEvent[]) into the
// format expected by the DAGViewer component, computing runtime node status
// from events and deriving topological layout from edges.
// ============================================================================

import type { ExecutionRun, ExecutionEvent } from "@/lib/execution-events/types";
import { ExecutionEventType } from "@/lib/execution-events/types";
import type { WorkflowNode, WorkflowEdge } from "@/lib/engine/workflow-execution";

// ============================================================================
// Types consumed by DAGViewer
// ============================================================================

export interface DagDisplayNode {
  nodeId: string;
  agentId: string;
  label: string;
  type: string;
  status: string;
  level: number;
  dependencies: string[];
  dependents: string[];
  description?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface DagDisplayEdge {
  from: string;
  to: string;
  type: string;
  label?: string;
  condition?: WorkflowEdge["condition"];
}

// ============================================================================
// Compute node status from events
// ============================================================================

function computeNodeStatus(nodeId: string, events: ExecutionEvent[]): string {
  // Find the latest relevant events for this node and determine status
  let started = false;
  let completed = false;
  let failed = false;
  let skipped = false;
  let retrying = false;

  for (const ev of events) {
    if (ev.nodeId !== nodeId) continue;
    switch (ev.type) {
      case ExecutionEventType.NODE_STARTED:
        started = true;
        break;
      case ExecutionEventType.NODE_COMPLETED:
        completed = true;
        break;
      case ExecutionEventType.NODE_FAILED:
        failed = true;
        break;
      case ExecutionEventType.NODE_SKIPPED:
        skipped = true;
        break;
      case ExecutionEventType.NODE_RETRYING:
        retrying = true;
        break;
    }
  }

  if (completed) return "completed";
  if (failed) return "failed";
  if (skipped) return "skipped";
  if (retrying) return "retrying";
  if (started) return "running";
  return "pending";
}

// ============================================================================
// Compute topological levels from edges (Kahn's algorithm)
// ============================================================================

function computeLevels(
  nodeIds: string[],
  edges: WorkflowEdge[],
): Map<string, number> {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
  }

  const levels = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;

    for (const neighbor of adjacency.get(current) ?? []) {
      const newLevel = currentLevel + 1;
      const existing = levels.get(neighbor);
      if (existing === undefined || newLevel > existing) {
        levels.set(neighbor, newLevel);
      }
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  return levels;
}

// ============================================================================
// Build dependencies/dependents maps from edges
// ============================================================================

function buildDependencyMaps(edges: WorkflowEdge[]): {
  dependencies: Map<string, string[]>;
  dependents: Map<string, string[]>;
} {
  const dependencies = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  for (const edge of edges) {
    const deps = dependencies.get(edge.to) ?? [];
    deps.push(edge.from);
    dependencies.set(edge.to, deps);

    const depsOf = dependents.get(edge.from) ?? [];
    depsOf.push(edge.to);
    dependents.set(edge.from, depsOf);
  }

  return { dependencies, dependents };
}

// ============================================================================
// Extract node timing info from events
// ============================================================================

function extractNodeTimestamps(
  nodeId: string,
  events: ExecutionEvent[],
): { startedAt?: number; completedAt?: number } {
  let startedAt: number | undefined;
  let completedAt: number | undefined;

  for (const ev of events) {
    if (ev.nodeId !== nodeId) continue;
    if (ev.type === ExecutionEventType.NODE_STARTED) {
      startedAt = ev.timestamp;
    }
    if (ev.type === ExecutionEventType.NODE_COMPLETED) {
      completedAt = ev.timestamp;
    }
  }

  return { startedAt, completedAt };
}

// ============================================================================
// Extract retry info from events
// ============================================================================

function extractRetryInfo(
  nodeId: string,
  events: ExecutionEvent[],
): { retryCount: number; maxRetries?: number } {
  let retryCount = 0;
  let maxRetries: number | undefined;

  for (const ev of events) {
    if (ev.nodeId !== nodeId) continue;
    if (ev.type === ExecutionEventType.NODE_RETRYING) {
      retryCount++;
      if (ev.data?.maxRetries != null) {
        maxRetries = ev.data.maxRetries as number;
      }
    }
  }

  return { retryCount, maxRetries };
}

// ============================================================================
// Main conversion function
// ============================================================================

export function buildDagDisplayData(
  run: ExecutionRun,
): { nodes: DagDisplayNode[]; edges: DagDisplayEdge[] } {
  const { dependencies, dependents } = buildDependencyMaps(run.edges);
  const levels = computeLevels(
    run.nodes.map((n) => n.nodeId),
    run.edges,
  );

  const nodes: DagDisplayNode[] = run.nodes.map((wn) => {
    const status = computeNodeStatus(wn.nodeId, run.events);
    const { startedAt, completedAt } = extractNodeTimestamps(wn.nodeId, run.events);
    const { retryCount, maxRetries } = extractRetryInfo(wn.nodeId, run.events);

    return {
      nodeId: wn.nodeId,
      agentId: wn.agentId,
      label: wn.description || wn.agentId,
      type: getNodeDisplayType(wn.nodeId, run.edges),
      status,
      level: levels.get(wn.nodeId) ?? 0,
      dependencies: dependencies.get(wn.nodeId) ?? [],
      dependents: dependents.get(wn.nodeId) ?? [],
      description: wn.description,
      startedAt,
      completedAt,
      duration: startedAt && completedAt ? completedAt - startedAt : undefined,
      retryCount,
      maxRetries,
    };
  });

  const edges: DagDisplayEdge[] = run.edges.map((we) => ({
    from: we.from,
    to: we.to,
    type: we.type,
    condition: we.condition,
  }));

  return { nodes, edges };
}

// ============================================================================
// Compute summary counts from events
// ============================================================================

export function computeRunSummary(run: ExecutionRun): {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  runningNodes: number;
  pendingNodes: number;
} {
  const totalNodes = run.nodes.length;
  let completedNodes = 0;
  let failedNodes = 0;
  let skippedNodes = 0;
  let runningNodes = 0;

  for (const node of run.nodes) {
    const status = computeNodeStatus(node.nodeId, run.events);
    switch (status) {
      case "completed":
        completedNodes++;
        break;
      case "failed":
        failedNodes++;
        break;
      case "skipped":
        skippedNodes++;
        break;
      case "running":
        runningNodes++;
        break;
    }
  }

  return {
    totalNodes,
    completedNodes,
    failedNodes,
    skippedNodes,
    runningNodes,
    pendingNodes: totalNodes - completedNodes - failedNodes - skippedNodes - runningNodes,
  };
}

// ============================================================================
// Determine node display type from edges
// ============================================================================

function getNodeDisplayType(nodeId: string, edges: WorkflowEdge[]): string {
  // If the node only has CONDITIONAL_TRUE/FALSE outgoing edges, it's a router
  const outgoing = edges.filter((e) => e.from === nodeId);
  if (outgoing.length > 0 && outgoing.every((e) => e.type.startsWith("CONDITIONAL"))) {
    return "conditional_router";
  }
  return "agent_node";
}
