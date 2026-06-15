// ============================================================================
// Nexus Agent Platform — ConditionEvaluator Implementation
// ============================================================================
// Evaluates conditions against runtime context. Supports both function-based
// and rule-based conditions with combinators for AND/OR logic.
// Used by ConditionalRouter to determine execution branches.
// ============================================================================

import type { AgentContext } from "@/engine/types/agent-types";

// ============================================================================
// Types
// ============================================================================

/**
 * A condition function that takes the current context and returns
 * a boolean (or a promise that resolves to boolean).
 */
export type Condition = (context: AgentContext) => boolean | Promise<boolean>;

/**
 * A structured rule for evaluating context fields.
 */
export interface ConditionRule {
  /** The context field path to evaluate. */
  field: string;
  /** Comparison operator. */
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "exists" | "regex";
  /** Expected value (not required for "exists"). */
  value?: unknown;
}

/**
 * The result of evaluating a single condition.
 */
export interface ConditionEvaluation {
  /** The rule that was evaluated (null for function conditions). */
  rule: ConditionRule | null;
  /** Whether the condition passed. */
  result: boolean;
  /** Human-readable message. */
  message?: string;
}

// ============================================================================
// ConditionEvaluator
// ============================================================================

export class ConditionEvaluator {
  /**
   * Evaluate a single condition function against the context.
   */
  async evaluate(condition: Condition, context: AgentContext): Promise<boolean> {
    try {
      const result = condition(context);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  /**
   * Evaluate a structured rule against the context state.
   */
  evaluateRule(rule: ConditionRule, context: AgentContext): boolean {
    const value = this.resolveField(rule.field, context);

    switch (rule.operator) {
      case "eq":
        return value === rule.value;
      case "neq":
        return value !== rule.value;
      case "gt":
        return typeof value === "number" && typeof rule.value === "number"
          ? value > rule.value
          : false;
      case "gte":
        return typeof value === "number" && typeof rule.value === "number"
          ? value >= rule.value
          : false;
      case "lt":
        return typeof value === "number" && typeof rule.value === "number"
          ? value < rule.value
          : false;
      case "lte":
        return typeof value === "number" && typeof rule.value === "number"
          ? value <= rule.value
          : false;
      case "in":
        return Array.isArray(rule.value) && rule.value.includes(value);
      case "nin":
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case "exists":
        return value !== undefined;
      case "regex":
        return typeof value === "string" && typeof rule.value === "string"
          ? new RegExp(rule.value).test(value)
          : false;
      default:
        return false;
    }
  }

  /**
   * Evaluate multiple rules combined with AND/OR logic.
   */
  evaluateRules(
    rules: ConditionRule[],
    context: AgentContext,
    logic: "and" | "or" = "and",
  ): ConditionEvaluation[] {
    return rules.map((rule) => {
      let result: boolean;
      try {
        result = this.evaluateRule(rule, context);
      } catch {
        result = false;
      }
      return {
        rule,
        result,
        message: `Rule ${rule.field} ${rule.operator} ${JSON.stringify(rule.value)}: ${result}`,
      };
    });
  }

  /**
   * Check if a set of rules passes (all pass for AND, any pass for OR).
   */
  checkRules(rules: ConditionRule[], context: AgentContext, logic: "and" | "or" = "and"): boolean {
    const evaluations = this.evaluateRules(rules, context, logic);
    if (logic === "and") {
      return evaluations.every((e) => e.result);
    }
    return evaluations.some((e) => e.result);
  }

  /**
   * Combine multiple rules into a single condition function.
   */
  combine(rules: ConditionRule[], logic: "and" | "or" = "and"): Condition {
    return (context: AgentContext): boolean => {
      return this.checkRules(rules, context, logic);
    };
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Resolve a dot-notation field path against context state.
   */
  private resolveField(field: string, context: AgentContext): unknown {
    const state = context.snapshot();
    if (field in state) {
      return (state as Record<string, unknown>)[field];
    }

    if (context.raw && context.raw.has != null) {
      const rawValue = context.raw.get(field);
      if (rawValue !== undefined) return rawValue;
    }

    if (field.includes(".")) {
      const parts = field.split(".");
      let current: unknown = state;
      for (const part of parts) {
        if (current == null || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[part];
      }
      return current;
    }

    return undefined;
  }
}

export const conditionEvaluator = new ConditionEvaluator();
