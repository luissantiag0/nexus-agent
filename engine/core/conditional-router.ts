// ============================================================================
// Nexus Agent Platform — ConditionalRouter Implementation
// ============================================================================
// Evaluates route branches and selects a target based on conditions.
// Each branch has a condition and a target node ID; the first matching
// branch (by priority) is selected. Supports default fallback routes.
// ============================================================================

import type { AgentContext } from "@/engine/types/agent-types";
import { ConditionEvaluator, type Condition } from "./condition-evaluator";

// ============================================================================
// Types
// ============================================================================

/**
 * A single route branch in a conditional router node.
 */
export interface RouteBranch {
  /** The target node ID to route to if this branch is selected. */
  targetNodeId: string;
  /** Condition that must be true for this branch to be selected. */
  condition: Condition;
  /** Priority (lower number = higher priority). Defaults to 100. */
  priority?: number;
  /** Optional human-readable label. */
  label?: string;
}

/**
 * The result of evaluating a single branch.
 */
export interface BranchEvaluation {
  /** The evaluated branch. */
  branch: RouteBranch;
  /** Whether the condition passed. */
  result: boolean;
  /** Index in the branches array. */
  index: number;
}

/**
 * The complete result of routing.
 */
export interface RouterResult {
  /** The selected branch, or null if none matched. */
  selectedBranch: RouteBranch | null;
  /** Evaluation results for all branches. */
  evaluations: BranchEvaluation[];
  /** Default target node ID if no branch matched. */
  defaultTarget: string | null;
  /** Human-readable explanation. */
  explanation: string;
}

// ============================================================================
// ConditionalRouter
// ============================================================================

export class ConditionalRouter {
  private evaluator: ConditionEvaluator;

  constructor(evaluator?: ConditionEvaluator) {
    this.evaluator = evaluator ?? new ConditionEvaluator();
  }

  /**
   * Evaluate all branches and select the first matching one (by priority).
   */
  async evaluateBranches(
    branches: RouteBranch[],
    context: AgentContext,
    defaultTarget?: string,
  ): Promise<RouterResult> {
    const sorted = [...branches].sort(
      (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
    );

    const evaluations: BranchEvaluation[] = [];
    let selectedBranch: RouteBranch | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const branch = sorted[i];
      let result: boolean;

      try {
        result = await this.evaluator.evaluate(branch.condition, context);
      } catch {
        result = false;
      }

      evaluations.push({ branch, result, index: i });

      if (result && selectedBranch === null) {
        selectedBranch = branch;
      }
    }

    const resolvedDefault = defaultTarget ?? null;

    const explanation = selectedBranch
      ? `Routed to '${selectedBranch.targetNodeId}'${selectedBranch.label ? ` (${selectedBranch.label})` : ""}`
      : resolvedDefault
        ? `No branch matched; using default route to '${resolvedDefault}'`
        : "No branch matched and no default route defined";

    return {
      selectedBranch,
      evaluations,
      defaultTarget: resolvedDefault,
      explanation,
    };
  }

  /**
   * Evaluate multiple independent route groups (fan-out routing).
   */
  async evaluateFanOut(
    groups: RouteBranch[][],
    context: AgentContext,
  ): Promise<RouterResult[]> {
    return Promise.all(
      groups.map((group) => this.evaluateBranches(group, context)),
    );
  }

  /**
   * Create a simple condition that always passes (for default routes).
   */
  static always(): Condition {
    return () => true;
  }

  /**
   * Create a condition that never passes.
   */
  static never(): Condition {
    return () => false;
  }
}
