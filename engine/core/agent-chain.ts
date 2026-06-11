// ============================================================================
// Nexus Agent Platform — AgentChain Implementation
// ============================================================================
// Executes agents sequentially, passing context between steps.
// Supports preconditions, step-level timeouts/retries, and configurable
// failure modes (abort/skip/continue).
// ============================================================================

import type {
  AgentChain as IAgentChain,
  ChainStep,
  ChainResult,
  ChainStepResult,
  ChainFailureMode,
  AgentContext,
} from "@/engine/types/agent-types";
import type { AgentResult, AgentStatus } from "@/engine/types/agent-types";
import type { AgentId } from "@/lib/agents/registry/types";

import { AgentRunner, DEFAULT_RUNNER_CONFIG } from "./agent-runner";
import { v4 as uuid } from "uuid";

// ============================================================================
// AgentChain Implementation
// ============================================================================

export class AgentChain<TSteps extends readonly ChainStep[] = ChainStep[]>
  implements IAgentChain<TSteps>
{
  readonly steps: TSteps;
  readonly chainId: string;
  readonly failureMode: ChainFailureMode;

  private readonly runners = new Map<AgentId, AgentRunner>();
  private readonly results = new Map<number, AgentResult>();

  constructor(
    steps: TSteps,
    chainId?: string,
    failureMode: ChainFailureMode = "abort",
  ) {
    this.steps = steps;
    this.chainId = chainId ?? `chain-${uuid().slice(0, 8)}`;
    this.failureMode = failureMode;

    // Initialize runners for each unique agent
    for (const step of steps) {
      const agentId = step.agent.metadata.id;
      if (!this.runners.has(agentId)) {
        this.runners.set(agentId, new AgentRunner(step.agent, {
          timeoutMs: step.timeoutMs ?? DEFAULT_RUNNER_CONFIG.timeoutMs,
          maxRetries: step.maxRetries ?? DEFAULT_RUNNER_CONFIG.maxRetries,
        }));
      }
    }
  }

  // ========================================================================
  // Execution
  // ========================================================================

  async execute(context: AgentContext): Promise<ChainResult> {
    const startedAt = Date.now();
    const stepResults: ChainStepResult[] = [];
    let finalStatus: ChainResult["status"] = "completed";
    let finalError: string | null = null;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const agentId = step.agent.metadata.id;
      const stepStartedAt = Date.now();

      try {
        // Check precondition
        if (step.precondition && !step.precondition(context)) {
          // Skip this step
          stepResults.push(this.createStepResult(i, agentId, "skipped", null, 0, null));
          context.advanceStep();
          continue;
        }

        // Map input from context
        const input = step.inputMap(context);

        // Execute with runner
        const runner = this.runners.get(agentId)!;
        const result = await runner.run(input, context);

        const stepDuration = Date.now() - stepStartedAt;

        // Check result
        if (result.status === "completed" && result.data !== null) {
          // Map output to context
          const output = {
            schema: runner.adapter.outputSchema.$id,
            schemaVersion: runner.adapter.outputSchema.version,
            payload: result.data as any,
            correlationId: input.correlationId,
            executionId: result.executionId,
            adapterVersion: runner.adapter.metadata.version,
          };
          step.outputMap(output as any, context);

          stepResults.push(this.createStepResult(i, agentId, "completed", result, stepDuration, null));
          this.results.set(i, result);
        } else {
          // Step failed
          const errorMsg = result.error ?? "Unknown error";
          stepResults.push(this.createStepResult(i, agentId, result.status, result, stepDuration, errorMsg));
          this.results.set(i, result);

          if (this.failureMode === "abort") {
            finalStatus = "failed";
            finalError = `Step ${i} (${agentId}) failed: ${errorMsg}`;
            break;
          } else if (this.failureMode === "skip") {
            // Continue to next step
            continue;
          } else {
            // "continue" — record but keep going
            finalStatus = "partial";
            continue;
          }
        }

        // Advance step counter
        context.advanceStep();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const stepDuration = Date.now() - stepStartedAt;
        stepResults.push(this.createStepResult(i, agentId, "failed", null, stepDuration, errorMsg));

        if (this.failureMode === "abort") {
          finalStatus = "failed";
          finalError = `Step ${i} (${agentId}) threw: ${errorMsg}`;
          break;
        } else if (this.failureMode === "skip") {
          continue;
        } else {
          finalStatus = "partial";
          continue;
        }
      }
    }

    const totalDurationMs = Date.now() - startedAt;

    return {
      chainId: this.chainId,
      status: finalStatus,
      steps: stepResults,
      totalDurationMs,
      error: finalError,
    };
  }

  async executeUntil(stepIndex: number, context: AgentContext): Promise<ChainResult> {
    const steps = this.steps.slice(0, stepIndex + 1);
    const partialChain = new AgentChain(steps, `${this.chainId}-partial`, this.failureMode);
    return partialChain.execute(context);
  }

  getResults(): Map<number, AgentResult> {
    return new Map(this.results);
  }

  // ========================================================================
  // Private
  // ========================================================================

  private createStepResult(
    stepIndex: number,
    agentId: AgentId,
    status: AgentStatus,
    result: AgentResult | null,
    durationMs: number,
    error: string | null,
  ): ChainStepResult {
    return {
      stepIndex,
      agentId,
      status,
      result,
      durationMs,
      error,
    };
  }
}
