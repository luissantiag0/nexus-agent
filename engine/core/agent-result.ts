// ============================================================================
// Nexus Agent Platform — AgentResult Implementation
// ============================================================================

import type { AgentResult, AgentStatus } from "@/engine/types/agent-types";
import type { AgentId, ValidationResult } from "@/lib/agents/registry/types";
import { v4 as uuid } from "uuid";

// ============================================================================
// AgentResultBuilder — Fluent builder for constructing AgentResult instances
// ============================================================================

export class AgentResultBuilder<TData = unknown> {
  private result: Partial<AgentResult<TData>> = {
    executionId: uuid(),
    agentId: "" as AgentId,
    status: "idle",
    data: null,
    error: null,
    errorDetails: null,
    validation: null,
    performance: {
      startedAt: new Date().toISOString(),
      completedAt: "",
      durationMs: 0,
      retryCount: 0,
    },
    meta: {},
  };

  constructor(agentId?: AgentId) {
    if (agentId) {
      this.result.agentId = agentId;
    }
  }

  withExecutionId(id: string): this {
    this.result.executionId = id;
    return this;
  }

  withAgentId(agentId: AgentId): this {
    this.result.agentId = agentId;
    return this;
  }

  withStatus(status: AgentStatus): this {
    this.result.status = status;
    return this;
  }

  withData(data: TData): this {
    this.result.data = data;
    this.result.status = "completed";
    return this;
  }

  withError(message: string, details?: Record<string, unknown>): this {
    this.result.status = "failed";
    this.result.error = message;
    this.result.errorDetails = details ?? null;
    return this;
  }

  withValidation(validation: ValidationResult | null): this {
    this.result.validation = validation;
    return this;
  }

  withPerformance(perf: Partial<AgentResult<TData>["performance"]>): this {
    this.result.performance = { ...this.result.performance!, ...perf };
    return this;
  }

  withMeta(meta: Record<string, unknown>): this {
    this.result.meta = { ...this.result.meta, ...meta };
    return this;
  }

  withRetryCount(count: number): this {
    this.result.performance!.retryCount = count;
    return this;
  }

  markStarted(): this {
    this.result.performance!.startedAt = new Date().toISOString();
    this.result.status = "running";
    return this;
  }

  markCompleted(): this {
    const now = new Date().toISOString();
    this.result.performance!.completedAt = now;
    if (this.result.status === "running") {
      this.result.status = "completed";
    }
    const start = new Date(this.result.performance!.startedAt).getTime();
    this.result.performance!.durationMs = Date.now() - start;
    return this;
  }

  markTimedOut(): this {
    this.result.status = "timed_out";
    this.result.error = "Execution timed out";
    this.markCompleted();
    return this;
  }

  markCircuitBroken(): this {
    this.result.status = "circuit_broken";
    this.result.error = "Circuit breaker is open — execution blocked";
    this.markCompleted();
    return this;
  }

  build(): AgentResult<TData> {
    if (!this.result.agentId) {
      throw new Error("AgentResult requires an agentId");
    }
    // Ensure completedAt is set
    if (!this.result.performance!.completedAt) {
      this.markCompleted();
    }
    return this.result as AgentResult<TData>;
  }

  // ========================================================================
  // Static helpers
  // ========================================================================

  static success<T>(agentId: AgentId, data: T, meta?: Record<string, unknown>): AgentResult<T> {
    return new AgentResultBuilder<T>(agentId)
      .withData(data)
      .withMeta(meta ?? {})
      .markCompleted()
      .build();
  }

  static failure<T = never>(
    agentId: AgentId,
    error: string,
    details?: Record<string, unknown>,
  ): AgentResult<T> {
    return new AgentResultBuilder<T>(agentId)
      .withError(error, details)
      .markCompleted()
      .build();
  }
}

// ============================================================================
// Result Helpers
// ============================================================================

/**
 * Type guard to check if an AgentResult is a success.
 */
export function isSuccess<T>(result: AgentResult<T>): result is AgentResult<T> & { data: T } {
  return result.status === "completed" && result.data !== null;
}

/**
 * Type guard to check if an AgentResult is a failure.
 */
export function isFailure<T>(result: AgentResult<T>): boolean {
  return result.status === "failed" || result.status === "timed_out" || result.status === "circuit_broken";
}

/**
 * Extract data from a result, throwing if it failed.
 */
export function unwrap<T>(result: AgentResult<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new AgentExecutionError(result);
}

// ============================================================================
// Custom Error
// ============================================================================

export class AgentExecutionError extends Error {
  constructor(public readonly result: AgentResult) {
    super(result.error ?? "Agent execution failed");
    this.name = "AgentExecutionError";
  }
}
