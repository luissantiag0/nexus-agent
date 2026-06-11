// ============================================================================
// Nexus Agent Platform — Rate Limiter
// ============================================================================
// Sliding window rate limiter per agent to prevent abuse and ensure
// fair resource allocation across agents.
// ============================================================================

import type { AgentId } from "@/lib/agents/registry/types";

export interface RateLimiterConfig {
  /** Maximum number of executions allowed in the window. */
  maxExecutions: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimiterStats {
  currentCount: number;
  maxExecutions: number;
  windowMs: number;
  remaining: number;
  resetAt: string;
  isRateLimited: boolean;
}

// ============================================================================
// SlidingWindowRateLimiter
// ============================================================================

export class SlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly agentId: AgentId,
    private readonly config: RateLimiterConfig,
  ) {}

  /**
   * Check if a request is allowed under the current rate limit.
   * If allowed, records the request. Returns true if allowed.
   */
  allowRequest(): boolean {
    this.evictExpired();

    if (this.timestamps.length >= this.config.maxExecutions) {
      return false;
    }

    this.timestamps.push(Date.now());
    return true;
  }

  /**
   * Check if currently rate-limited without recording a request.
   */
  isRateLimited(): boolean {
    this.evictExpired();
    return this.timestamps.length >= this.config.maxExecutions;
  }

  /**
   * Get current statistics.
   */
  getStats(): RateLimiterStats {
    this.evictExpired();
    const now = Date.now();
    const oldestInWindow = now - this.config.windowMs;
    const remaining = Math.max(0, this.config.maxExecutions - this.timestamps.length);
    const resetAt = this.timestamps.length > 0
      ? new Date(this.timestamps[0] + this.config.windowMs).toISOString()
      : new Date(now + this.config.windowMs).toISOString();

    return {
      currentCount: this.timestamps.length,
      maxExecutions: this.config.maxExecutions,
      windowMs: this.config.windowMs,
      remaining,
      resetAt,
      isRateLimited: remaining === 0,
    };
  }

  /**
   * Reset the rate limiter (clear all timestamps).
   */
  reset(): void {
    this.timestamps.length = 0;
  }

  /**
   * Remove timestamps outside the current window.
   */
  private evictExpired(): void {
    const cutoff = Date.now() - this.config.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}

// ============================================================================
// Rate Limiter Registry
// ============================================================================

/**
 * Manages rate limiters for all agents.
 */
export class RateLimiterRegistry {
  private readonly limiters = new Map<AgentId, SlidingWindowRateLimiter>();

  getOrCreate(agentId: AgentId, config: RateLimiterConfig): SlidingWindowRateLimiter {
    let limiter = this.limiters.get(agentId);
    if (!limiter) {
      limiter = new SlidingWindowRateLimiter(agentId, config);
      this.limiters.set(agentId, limiter);
    }
    return limiter;
  }

  get(agentId: AgentId): SlidingWindowRateLimiter | undefined {
    return this.limiters.get(agentId);
  }

  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  /** Get summary of all rate limiter states. */
  summary(): Array<{ agentId: AgentId; isRateLimited: boolean; remaining: number }> {
    return Array.from(this.limiters.entries()).map(([id, limiter]) => {
      const stats = limiter.getStats();
      return {
        agentId: id,
        isRateLimited: stats.isRateLimited,
        remaining: stats.remaining,
      };
    });
  }
}
