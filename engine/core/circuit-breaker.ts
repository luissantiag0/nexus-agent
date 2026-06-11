// ============================================================================
// Nexus Agent Platform — Circuit Breaker
// ============================================================================
// Implements the circuit breaker pattern to prevent cascading failures
// when an agent repeatedly fails. States: CLOSED → OPEN → HALF_OPEN → CLOSED
// ============================================================================

import type { AgentId } from "@/lib/agents/registry/types";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit. */
  failureThreshold: number;
  /** Time (ms) to wait before transitioning from OPEN to HALF_OPEN. */
  resetTimeoutMs: number;
  /** Number of successful probes in HALF_OPEN state to close the circuit. */
  halfOpenSuccessThreshold: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  halfOpenAttempts: number;
}

// ============================================================================
// CircuitBreaker — Per-agent circuit breaker
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private openedAt: string | null = null;
  private halfOpenAttempts = 0;
  private halfOpenSuccesses = 0;

  constructor(
    private readonly agentId: AgentId,
    private readonly config: CircuitBreakerConfig,
  ) {}

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Check if the circuit allows execution.
   * Throws if circuit is OPEN. Returns true if CLOSED or HALF_OPEN.
   */
  allowRequest(): boolean {
    if (this.state === "closed") return true;

    if (this.state === "open") {
      const elapsed = Date.now() - new Date(this.openedAt!).getTime();
      if (elapsed >= this.config.resetTimeoutMs) {
        this.transitionTo("half_open");
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited requests
    if (this.halfOpenAttempts < this.config.halfOpenSuccessThreshold) {
      this.halfOpenAttempts++;
      return true;
    }

    return false;
  }

  /**
   * Record a successful execution.
   */
  recordSuccess(): void {
    this.lastSuccessAt = new Date().toISOString();
    this.successCount++;

    if (this.state === "half_open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenSuccessThreshold) {
        this.transitionTo("closed");
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
      }
    } else if (this.state === "closed") {
      // Reset failure count on consecutive success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed execution.
   */
  recordFailure(): void {
    this.lastFailureAt = new Date().toISOString();
    this.failureCount++;

    if (this.state === "half_open") {
      // A single failure in half-open re-opens the circuit
      this.transitionTo("open");
      this.openedAt = new Date().toISOString();
    } else if (this.state === "closed" && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo("open");
      this.openedAt = new Date().toISOString();
    }
  }

  /**
   * Manually reset the circuit breaker to closed state.
   */
  reset(): void {
    this.transitionTo("closed");
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
    this.openedAt = null;
  }

  /**
   * Get current state and statistics.
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Get the current state.
   */
  getState(): CircuitState {
    return this.state;
  }

  // ========================================================================
  // Private
  // ========================================================================

  private transitionTo(newState: CircuitState): void {
    const prev = this.state;
    this.state = newState;
    if (newState === "open") {
      this.openedAt = new Date().toISOString();
    }
    if (newState === "closed") {
      this.openedAt = null;
    }
  }
}

// ============================================================================
// Circuit Breaker Registry
// ============================================================================

/**
 * Manages circuit breakers for all agents in the system.
 */
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<AgentId, CircuitBreaker>();

  getOrCreate(agentId: AgentId, config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(agentId);
    if (!breaker) {
      breaker = new CircuitBreaker(agentId, config);
      this.breakers.set(agentId, breaker);
    }
    return breaker;
  }

  get(agentId: AgentId): CircuitBreaker | undefined {
    return this.breakers.get(agentId);
  }

  getAll(): Map<AgentId, CircuitBreaker> {
    return new Map(this.breakers);
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /** Get health summary of all circuit breakers. */
  healthSummary(): Array<{ agentId: AgentId; state: CircuitState; failureCount: number }> {
    return Array.from(this.breakers.entries()).map(([id, breaker]) => ({
      agentId: id,
      state: breaker.getState(),
      failureCount: breaker.getStats().failureCount,
    }));
  }
}
