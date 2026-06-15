// ============================================================================
// Nexus Agent Platform — GraphValidator Implementation
// ============================================================================
// Validates graph structure before execution: cycle detection, connectivity
// checks, node/edge integrity, and semantic validation for special node
// types (conditional_router, synchronizer).
// ============================================================================

import type {
  GraphNode,
  GraphEdge,
  GraphNodeType,
} from "@/engine/types/agent-types";

// ============================================================================
// Types
// ============================================================================

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  message: string;
  nodeId?: string;
  edgeId?: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const VALID_NODE_TYPES: GraphNodeType[] = [
  "standard",
  "conditional_router",
  "synchronizer",
];

// ============================================================================
// GraphValidator
// ============================================================================

export class GraphValidator {
  /**
   * Full graph validation. Checks nodes, edges, cycles, and connectivity.
   */
  validate(nodes: GraphNode[], edges: GraphEdge[]): ValidationResult {
    const issues: ValidationIssue[] = [];

    issues.push(...this.validateNodes(nodes));
    issues.push(...this.validateEdges(nodes, edges));
    issues.push(...this.validateNoCycles(nodes, edges));
    issues.push(...this.validateConnectivity(nodes, edges));
    issues.push(...this.validateSpecialNodes(nodes, edges));

    const errors = issues.filter((i) => i.type === "error");
    const warnings = issues.filter((i) => i.type === "warning");

    return {
      valid: errors.length === 0,
      issues,
      errors,
      warnings,
    };
  }

  // ========================================================================
  // Node Validation
  // ========================================================================

  validateNodes(nodes: GraphNode[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenIds = new Set<string>();

    for (const node of nodes) {
      if (!node.id) {
        issues.push({
          type: "error",
          message: "Node is missing required 'id' field",
          code: "NODE_MISSING_ID",
        });
        continue;
      }

      if (seenIds.has(node.id)) {
        issues.push({
          type: "error",
          message: `Duplicate node ID: '${node.id}'`,
          nodeId: node.id,
          code: "NODE_DUPLICATE_ID",
        });
      }
      seenIds.add(node.id);

      const nodeType: GraphNodeType = (node as any).type ?? "standard";
      if (!VALID_NODE_TYPES.includes(nodeType)) {
        issues.push({
          type: "warning",
          message: `Unknown node type '${nodeType}' on node '${node.id}'`,
          nodeId: node.id,
          code: "NODE_UNKNOWN_TYPE",
        });
      }

      if (nodeType === "standard" && !node.agent) {
        issues.push({
          type: "error",
          message: `Standard node '${node.id}' is missing required 'agent' field`,
          nodeId: node.id,
          code: "NODE_MISSING_AGENT",
        });
      }

      if (nodeType === "conditional_router") {
        const routes = (node as any).routes;
        if (!routes || !Array.isArray(routes) || routes.length === 0) {
          issues.push({
            type: "error",
            message: `Conditional router node '${node.id}' must have at least one route`,
            nodeId: node.id,
            code: "ROUTER_NO_ROUTES",
          });
        }
        if (routes && Array.isArray(routes)) {
          for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            if (!route.targetNodeId) {
              issues.push({
                type: "error",
                message: `Route ${i} on node '${node.id}' missing targetNodeId`,
                nodeId: node.id,
                code: "ROUTE_MISSING_TARGET",
              });
            }
            if (!route.condition) {
              issues.push({
                type: "error",
                message: `Route ${i} on node '${node.id}' missing condition`,
                nodeId: node.id,
                code: "ROUTE_MISSING_CONDITION",
              });
            }
          }
        }
      }

      if (nodeType === "synchronizer") {
        const mergeStrategy = (node as any).mergeStrategy;
        if (mergeStrategy && !["shallow", "deep", "overwrite"].includes(mergeStrategy)) {
          issues.push({
            type: "warning",
            message: `Invalid mergeStrategy '${mergeStrategy}' on synchronizer '${node.id}'`,
            nodeId: node.id,
            code: "SYNC_INVALID_MERGE",
          });
        }
      }
    }

    return issues;
  }

  // ========================================================================
  // Edge Validation
  // ========================================================================

  validateEdges(nodes: GraphNode[], edges: GraphEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const seenEdges = new Set<string>();

    for (const edge of edges) {
      const edgeId = `${edge.from}->${edge.to}`;

      if (seenEdges.has(edgeId)) {
        issues.push({
          type: "warning",
          message: `Duplicate edge: '${edgeId}'`,
          edgeId,
          code: "EDGE_DUPLICATE",
        });
      }
      seenEdges.add(edgeId);

      if (!nodeIds.has(edge.from)) {
        issues.push({
          type: "error",
          message: `Edge references unknown source node '${edge.from}'`,
          edgeId,
          code: "EDGE_UNKNOWN_FROM",
        });
      }
      if (!nodeIds.has(edge.to)) {
        issues.push({
          type: "error",
          message: `Edge references unknown target node '${edge.to}'`,
          edgeId,
          code: "EDGE_UNKNOWN_TO",
        });
      }
      if (edge.from === edge.to) {
        issues.push({
          type: "error",
          message: `Edge '${edgeId}' is a self-reference`,
          edgeId,
          code: "EDGE_SELF_REFERENCE",
        });
      }
    }

    return issues;
  }

  // ========================================================================
  // Cycle Detection
  // ========================================================================

  validateNoCycles(nodes: GraphNode[], edges: GraphEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const adj = new Map<string, string[]>();

    for (const id of nodeIds) adj.set(id, []);
    for (const edge of edges) {
      const list = adj.get(edge.from);
      if (list) list.push(edge.to);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();
    let cycleNodes: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      inStack.add(nodeId);

      for (const neighbor of adj.get(nodeId) ?? []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            cycleNodes.push(nodeId);
            return true;
          }
        } else if (inStack.has(neighbor)) {
          cycleNodes = [nodeId, neighbor];
          return true;
        }
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        cycleNodes = [];
        if (dfs(id)) {
          issues.push({
            type: "error",
            message: `Graph contains a cycle involving node '${cycleNodes[0]}'`,
            nodeId: cycleNodes[0],
            code: "GRAPH_CYCLE_DETECTED",
          });
          return issues;
        }
      }
    }

    return issues;
  }

  // ========================================================================
  // Connectivity Validation
  // ========================================================================

  validateConnectivity(nodes: GraphNode[], edges: GraphEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const hasIncoming = new Set<string>();
    const hasOutgoing = new Set<string>();

    for (const edge of edges) {
      if (nodeIds.has(edge.from)) hasOutgoing.add(edge.from);
      if (nodeIds.has(edge.to)) hasIncoming.add(edge.to);
    }

    for (const node of nodes) {
      if (!hasIncoming.has(node.id) && !hasOutgoing.has(node.id) && nodes.length > 1) {
        issues.push({
          type: "warning",
          message: `Node '${node.id}' is disconnected from the graph`,
          nodeId: node.id,
          code: "NODE_ORPHANED",
        });
      }
    }

    return issues;
  }

  // ========================================================================
  // Special Node Validation
  // ========================================================================

  validateSpecialNodes(nodes: GraphNode[], edges: GraphEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));

    for (const node of nodes) {
      const nodeType: GraphNodeType = (node as any).type ?? "standard";

      if (nodeType === "conditional_router") {
        const routes: Array<{ targetNodeId: string }> = (node as any).routes ?? [];
        for (const route of routes) {
          if (!nodeIds.has(route.targetNodeId)) {
            issues.push({
              type: "error",
              message: `Router '${node.id}' routes to unknown node '${route.targetNodeId}'`,
              nodeId: node.id,
              code: "ROUTER_TARGET_NOT_FOUND",
            });
          }
        }
      }

      if (nodeType === "synchronizer") {
        const incomingEdges = edges.filter((e) => e.to === node.id);
        if (incomingEdges.length === 0) {
          issues.push({
            type: "warning",
            message: `Synchronizer '${node.id}' has no incoming edges`,
            nodeId: node.id,
            code: "SYNC_NO_INPUTS",
          });
        }
      }
    }

    return issues;
  }
}

export const graphValidator = new GraphValidator();
