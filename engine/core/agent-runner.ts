// ============================================================================
// Nexus Agent Platform — AgentRunner Implementation
// ============================================================================
// The AgentRunner executes a single agent adapter with full lifecycle:
//   preCondition → validate → rateLimit → circuitCheck → execute → retry → postProcess
// It manages timeouts, retries with backoff, circuit breaking, and rate limiting.
// ============================================================================

import type {
  AgentRunner as IAgentRunner,
  AgentRunnerConfig,
  RunnerHealth,
} from "@/engine/types/agent-types";
import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentId,
  ValidationResult,
} from "@/lib/agents/registry/types";
import type { AgentContext } from "@/engine/types/agent-types";
import type { AgentResult } from "@/engine/types/agent-types";

import { AgentResultBuilder, AgentExecutionError } from "./agent-result";
import { CircuitBreaker, type CircuitBreakerConfig } from "./circuit-breaker";
import { SlidingWindowRateLimiter, type RateLimiterConfig } from "./rate-limiter";
import { v4 as uuid } from "uuid";

// ============================================================================
// Default Runner Configuration
// ============================================================================

export const DEFAULT_RUNNER_CONFIG: AgentRunnerConfig = {
  timeoutMs: 30_000,          // 30 seconds
  maxRetries: 3,
  retryBackoff: "exponential",
  retryDelayMs: 1_000,        // 1 second base delay
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60_000, // 1 minute
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,  // 1 minute
};

// ============================================================================
// AgentRunner Implementation
// ============================================================================

export class AgentRunner<TIn extends Record<string, unknown> = Record<string, unknown>,
  TOut extends Record<string, unknown> = Record<string, unknown>>
  implements IAgentRunner<TIn, TOut>
{
  readonly adapter: AgentAdapter<TIn, TOut>;
  readonly config: AgentRunnerConfig;

  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private lastExecutedAt: string | null = null;

  constructor(
    adapter: AgentAdapter<TIn, TOut>,
    config: Partial<AgentRunnerConfig> = {},
  ) {
    this.adapter = adapter;
    this.config = { ...DEFAULT_RUNNER_CONFIG, ...config };

    this.circuitBreaker = new CircuitBreaker(adapter.metadata.id, {
      failureThreshold: this.config.circuitBreakerThreshold,
      resetTimeoutMs: this.config.circuitBreakerResetMs,
      halfOpenSuccessThreshold: 2,
    });

    this.rateLimiter = new SlidingWindowRateLimiter(adapter.metadata.id, {
      maxExecutions: this.config.rateLimitMax,
      windowMs: this.config.rateLimitWindowMs,
    });
  }

  // ========================================================================
  // Primary Execution
  // ========================================================================

  async run(input: AgentInput<TIn>, context: AgentContext): Promise<AgentResult<TOut>> {
    const builder = new AgentResultBuilder<TOut>(this.adapter.metadata.id)
      .withExecutionId(uuid())
      .markStarted();

    try {
      // Step 1: Check circuit breaker
      if (!this.circuitBreaker.allowRequest()) {
        return builder.markCircuitBroken().build();
      }

      // Step 2: Check rate limiter
      if (!this.rateLimiter.allowRequest()) {
        return builder
          .withStatus("failed")
          .withError("Rate limit exceeded")
          .build();
      }

      // Step 3: Pre-execution hook
      if (this.adapter.onBefore) {
        await this.adapter.onBefore(input, context as any);
      }

      // Step 4: Execute with retry logic
      let lastError: Error | null = null;
      let result: AgentOutput<TOut> | null = null;

      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            builder.withRetryCount(attempt);
            await this.waitForBackoff(attempt);
          }

          result = await this.executeWithTimeout(input, context);
          lastError = null;
          break; // Success — exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          // Check if we should retry
          if (attempt < this.config.maxRetries) {
            continue;
          }
        }
      }

      // Step 5: Handle final result
      if (result !== null) {
        // Post-execution hook
        if (this.adapter.onAfter) {
          await this.adapter.onAfter(result, context as any);
        }

        // Validate output
        const validation = await this.validateOutput(result);

        this.circuitBreaker.recordSuccess();
        this.lastExecutedAt = new Date().toISOString();

        return builder
          .withData(result.payload as TOut)
          .withValidation(validation)
          .withMeta({
            schema: result.schema,
            schemaVersion: result.schemaVersion,
            correlationId: result.correlationId,
          })
          .markCompleted()
          .build();
      } else {
        // All retries failed
        this.circuitBreaker.recordFailure();
        this.lastExecutedAt = new Date().toISOString();

        return builder
          .withError(lastError?.message ?? "Execution failed after all retries")
          .withMeta({ lastError: lastError?.stack })
          .markCompleted()
          .build();
      }
    } catch (error) {
      // Unexpected error in runner itself
      this.circuitBreaker.recordFailure();
      return builder
        .withError(error instanceof Error ? error.message : "Unexpected runner error")
        .withMeta({ stack: error instanceof Error ? error.stack : undefined })
        .markCompleted()
        .build();
    }
  }

  // ========================================================================
  // Input Validation
  // ========================================================================

  async validate(input: AgentInput<TIn>): Promise<ValidationResult> {
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    // Validate schema version
    if (input.schemaVersion !== this.adapter.inputSchema.version) {
      warnings.push(`Input schema version mismatch: expected ${this.adapter.inputSchema.version}, got ${input.schemaVersion}`);
    }

    // Validate required fields from port schema
    if (this.adapter.inputSchema.required) {
      for (const field of this.adapter.inputSchema.required) {
        if (!(field in input.payload)) {
          errors.push({
            path: `payload.${field}`,
            message: `Required field '${field}' is missing`,
            severity: "error",
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ========================================================================
  // Health
  // ========================================================================

  health(): RunnerHealth {
    const circuitStats = this.circuitBreaker.getStats();
    const rateStats = this.rateLimiter.getStats();

    let status: RunnerHealth["status"] = "healthy";
    if (circuitStats.state === "open") status = "circuit_open";
    else if (rateStats.isRateLimited) status = "rate_limited";
    else if (circuitStats.state === "half_open") status = "degraded";

    return {
      agentId: this.adapter.metadata.id,
      status,
      circuitState: circuitStats.state,
      failureCount: circuitStats.failureCount,
      rateLimitRemaining: rateStats.remaining,
      lastExecutedAt: this.lastExecutedAt,
    };
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Execute the agent's adapter with a timeout.
   */
  private async executeWithTimeout(
    input: AgentInput<TIn>,
    context: AgentContext,
  ): Promise<AgentOutput<TOut>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${this.config.timeoutMs}ms`)),
        this.config.timeoutMs);
    });

    const executionPromise = this.adapter.execute(input, context as any);
    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Wait for the appropriate backoff duration before retrying.
   */
  private async waitForBackoff(attempt: number): Promise<void> {
    let delay = this.config.retryDelayMs;

    switch (this.config.retryBackoff) {
      case "exponential":
        delay = delay * Math.pow(2, attempt - 1);
        break;
      case "linear":
        delay = delay * attempt;
        break;
      case "fixed":
        // Keep base delay
        break;
    }

    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Validate the output against the adapter's validators.
   */
  private async validateOutput(output: AgentOutput<TOut>): Promise<ValidationResult> {
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    for (const validator of this.adapter.validators) {
      try {
        const result = await validator.validate(output.payload, {} as any);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (err) {
        warnings.push(`Validator '${validator.name}' threw: ${err}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
