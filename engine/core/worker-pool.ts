// ============================================================================
// Nexus Agent Platform — Worker Pool
// ============================================================================
// Manages a pool of worker processes/threads for horizontally scaling
// agent execution across multiple CPU cores or machines.
// In production, this uses Bull/RabbitMQ queues across processes.
// For development, uses an in-process worker pool.
// ============================================================================

import type { AgentInput, AgentOutput, AgentId } from "@/lib/agents/registry/types";
import type { AgentContext, AgentResult, AgentRunnerConfig } from "@/engine/types/agent-types";
import { AgentRunner } from "./agent-runner";
import { EventEmitter } from "events";

// ============================================================================
// Worker Pool Events
// ============================================================================

export interface WorkerPoolEvents {
  "task:queued": (task: QueuedTask) => void;
  "task:started": (task: QueuedTask) => void;
  "task:completed": (task: QueuedTask, result: AgentResult) => void;
  "task:failed": (task: QueuedTask, error: Error) => void;
  "worker:started": (workerId: string) => void;
  "worker:stopped": (workerId: string) => void;
  "pool:drained": () => void;
  "pool:backpressure": (queueLength: number) => void;
}

// ============================================================================
// Types
// ============================================================================

export interface QueuedTask {
  taskId: string;
  agentId: AgentId;
  input: AgentInput;
  context: AgentContext;
  runner: AgentRunner;
  priority: number;
  enqueuedAt: string;
  startedAt?: string;
}

export interface WorkerPoolConfig {
  /** Number of concurrent workers. */
  concurrency: number;
  /** Maximum queue size before rejecting tasks. */
  maxQueueSize: number;
  /** Strategy for task selection from queue. */
  schedulingStrategy: "fifo" | "priority" | "round-robin";
  /** Default runner config for workers. */
  defaultRunnerConfig?: Partial<AgentRunnerConfig>;
}

// ============================================================================
// In-Process Worker Pool
// ============================================================================

export class InProcessWorkerPool extends EventEmitter {
  private workers: Set<string> = new Set();
  private queue: QueuedTask[] = [];
  private activeCount = 0;
  private readonly config: WorkerPoolConfig;
  private workerIdCounter = 0;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();
    this.config = {
      concurrency: 4,
      maxQueueSize: 1000,
      schedulingStrategy: "fifo",
      ...config,
    };

    // Initialize workers
    for (let i = 0; i < this.config.concurrency; i++) {
      const workerId = this.createWorker();
      this.workers.add(workerId);
    }
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Submit a task for execution.
   * Throws if queue is full.
   */
  async submit(
    taskId: string,
    agentId: AgentId,
    input: AgentInput,
    context: AgentContext,
    runner: AgentRunner,
    priority: number = 0,
  ): Promise<void> {
    if (this.queue.length >= this.config.maxQueueSize) {
      this.emit("pool:backpressure", this.queue.length);
      throw new WorkerPoolError(`Queue full (${this.queue.length}/${this.config.maxQueueSize})`);
    }

    const task: QueuedTask = {
      taskId,
      agentId,
      input,
      context,
      runner,
      priority,
      enqueuedAt: new Date().toISOString(),
    };

    this.queue.push(task);
    this.emit("task:queued", task);
    this.processNext();
  }

  /**
   * Get current pool statistics.
   */
  getStats(): WorkerPoolStats {
    return {
      activeWorkers: this.activeCount,
      totalWorkers: this.workers.size,
      queueLength: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      utilization: this.activeCount / this.workers.size,
    };
  }

  /**
   * Gracefully shut down the pool. Waits for active tasks to complete.
   */
  async shutdown(timeoutMs: number = 30_000): Promise<void> {
    const startTime = Date.now();
    while (this.activeCount > 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`Worker pool shutdown timed out (${this.activeCount} active workers)`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.queue = [];
    for (const workerId of this.workers) {
      this.emit("worker:stopped", workerId);
    }
    this.workers.clear();
    this.removeAllListeners();
  }

  // ========================================================================
  // Private
  // ========================================================================

  private createWorker(): string {
    const workerId = `worker-${++this.workerIdCounter}`;
    this.emit("worker:started", workerId);
    return workerId;
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.workers.size || this.queue.length === 0) return;

    this.activeCount++;

    // Select task based on scheduling strategy
    const taskIndex = this.selectTask();
    if (taskIndex === -1) {
      this.activeCount--;
      return;
    }

    const task = this.queue.splice(taskIndex, 1)[0];
    task.startedAt = new Date().toISOString();
    this.emit("task:started", task);

    try {
      const result = await task.runner.run(task.input, task.context);
      this.emit("task:completed", task, result);
    } catch (error) {
      this.emit("task:failed", task, error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      this.processNext(); // Process next in queue
    }

    if (this.queue.length === 0 && this.activeCount === 0) {
      this.emit("pool:drained");
    }
  }

  private selectTask(): number {
    switch (this.config.schedulingStrategy) {
      case "priority":
        return this.selectHighestPriority();
      case "round-robin":
        return 0; // FIFO — could be enhanced
      case "fifo":
      default:
        return 0;
    }
  }

  private selectHighestPriority(): number {
    let highestIdx = 0;
    let highestPriority = -Infinity;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > highestPriority) {
        highestPriority = this.queue[i].priority;
        highestIdx = i;
      }
    }

    return highestIdx;
  }
}

// ============================================================================
// Worker Pool Error
// ============================================================================

export class WorkerPoolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerPoolError";
  }
}

// ============================================================================
// Worker Pool Stats
// ============================================================================

export interface WorkerPoolStats {
  activeWorkers: number;
  totalWorkers: number;
  queueLength: number;
  maxQueueSize: number;
  utilization: number;
}
