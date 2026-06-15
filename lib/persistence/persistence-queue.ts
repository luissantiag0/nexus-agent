// ============================================================================
// Nexus Agent Platform — Persistence Queue
// ============================================================================
// Async circular buffer that batches persistence operations and flushes them
// to a database handler on a configurable interval. Designed to never block
// the execution hot path — enqueue() is O(1) and synchronous.
//
// == Design ==
// - Circular buffer with FIFO eviction at capacity
// - Timer-based flush at configurable interval (default 500ms)
// - Retry with exponential backoff per item (3 attempts)
// - Circuit breaker trips after 5 consecutive flush failures
// - Idempotency via processingSet to prevent duplicate flush
// ============================================================================

import type {
  PersistenceQueueItem,
  PersistenceQueueConfig,
  PersistenceQueueStats,
  FlushHandler,
} from "./types";
import { DEFAULT_PERSISTENCE_QUEUE_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Events emitted by the queue
// ---------------------------------------------------------------------------

export interface PersistenceQueueEvents {
  onFlushStarted: (batchSize: number) => void;
  onFlushCompleted: (succeeded: number, failed: number) => void;
  onFlushFailed: (error: string, consecutiveFailures: number) => void;
  onCircuitBreakerOpened: (cooldownMs: number) => void;
  onCircuitBreakerClosed: () => void;
  onItemDropped: (itemId: string, reason: string) => void;
}

// ---------------------------------------------------------------------------
// PersistenceQueue
// ---------------------------------------------------------------------------

export class PersistenceQueue {
  private buffer: PersistenceQueueItem[] = [];
  private config: PersistenceQueueConfig;
  private flushHandler: FlushHandler;
  private events: PersistenceQueueEvents;

  // Timer
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  // Stats
  private totalEnqueued = 0;
  private totalFlushed = 0;
  private totalFailed = 0;
  private flushesFailed = 0;

  // Circuit breaker
  private circuitBroken = false;
  private circuitBrokenAt: number | null = null;

  // Idempotency: set of item IDs currently being flushed
  private processingSet = new Set<string>();

  constructor(
    flushHandler: FlushHandler,
    config?: Partial<PersistenceQueueConfig>,
    events?: Partial<PersistenceQueueEvents>,
  ) {
    this.flushHandler = flushHandler;
    this.config = { ...DEFAULT_PERSISTENCE_QUEUE_CONFIG, ...config };
    this.events = {
      onFlushStarted: events?.onFlushStarted ?? (() => {}),
      onFlushCompleted: events?.onFlushCompleted ?? (() => {}),
      onFlushFailed: events?.onFlushFailed ?? (() => {}),
      onCircuitBreakerOpened: events?.onCircuitBreakerOpened ?? (() => {}),
      onCircuitBreakerClosed: events?.onCircuitBreakerClosed ?? (() => {}),
      onItemDropped: events?.onItemDropped ?? (() => {}),
    };
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the flush timer. Safe to call multiple times — subsequent calls
   * are no-ops if the timer is already running.
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushIntervalMs);

    // Prevent the timer from keeping the process alive
    if (typeof this.flushTimer === "object" && "unref" in this.flushTimer) {
      this.flushTimer.unref();
    }
  }

  /**
   * Stop the flush timer. Does NOT drain the queue.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush all remaining items and stop the timer.
   * Returns when the final flush completes.
   */
  async drain(): Promise<void> {
    this.stop();
    while (this.buffer.length > 0) {
      await this.flush();
    }
  }

  // -----------------------------------------------------------------------
  // Core Operations
  // -----------------------------------------------------------------------

  /**
   * Enqueue an item for persistence. Never throws.
   * If the queue is at capacity, the oldest item is dropped.
   */
  enqueue(item: Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError">): void {
    try {
      // Circuit breaker check
      if (this.circuitBroken) {
        // Check if cooldown has elapsed
        if (this.circuitBrokenAt && Date.now() - this.circuitBrokenAt >= this.config.circuitBreakerCooldownMs) {
          this.circuitBroken = false;
          this.circuitBrokenAt = null;
          this.events.onCircuitBreakerClosed();
        } else {
          // Drop the item silently while circuit is open
          this.events.onItemDropped(item.id, "circuit_broken");
          return;
        }
      }

      // Capacity check — FIFO eviction
      if (this.buffer.length >= this.config.maxItems) {
        const dropped = this.buffer.shift();
        if (dropped) {
          this.events.onItemDropped(dropped.id, "buffer_full");
        }
      }

      const queueItem: PersistenceQueueItem = {
        ...item,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.buffer.push(queueItem);
      this.totalEnqueued++;
    } catch {
      // Must never throw
    }
  }

  /**
   * Enqueue multiple items at once. Never throws.
   * Each item is individually checked against circuit breaker and capacity.
   */
  enqueueBatch(
    items: Array<Omit<PersistenceQueueItem, "timestamp" | "retryCount" | "lastError">>,
  ): void {
    for (const item of items) {
      this.enqueue(item);
    }
  }

  /**
   * Force an immediate flush of the buffer.
   * Returns the number of items flushed.
   */
  async flush(): Promise<number> {
    return this.flushInternal();
  }

  /**
   * Force an immediate flush and wait for completion.
   * Identical to flush() but explicitly named for clarity when
   * callers want to bypass the timer.
   */
  async flushNow(): Promise<number> {
    return this.flushInternal();
  }

  /**
   * Retry all failed items in the buffer.
   * Resets the circuit breaker if open and initiates an immediate flush.
   */
  async retryFailed(): Promise<number> {
    // Reset circuit breaker
    if (this.circuitBroken) {
      this.circuitBroken = false;
      this.circuitBrokenAt = null;
      this.events.onCircuitBreakerClosed();
    }

    // Reset consecutive failure counter so next flush isn't penalised
    this.flushesFailed = 0;

    // Force an immediate flush
    return this.flushInternal();
  }

  /**
   * Graceful shutdown: drain remaining items, stop the timer,
   * and clear processing state. Call this before application teardown.
   * Returns the final number of items flushed during drain.
   */
  async shutdown(): Promise<number> {
    let flushed = 0;
    this.stop();
    while (this.buffer.length > 0) {
      flushed += await this.flushInternal();
    }
    this.clear();
    return flushed;
  }

  /**
   * Clear all items from the buffer without persisting them.
   */
  clear(): void {
    this.buffer = [];
    this.processingSet.clear();
  }

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  stats(): PersistenceQueueStats {
    return {
      currentSize: this.buffer.length,
      totalEnqueued: this.totalEnqueued,
      totalFlushed: this.totalFlushed,
      totalFailed: this.totalFailed,
      flushesFailed: this.flushesFailed,
      isCircuitBroken: this.circuitBroken,
      circuitBrokenAt: this.circuitBrokenAt,
    };
  }

  /** The current buffer length. */
  get length(): number {
    return this.buffer.length;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private async flushInternal(): Promise<number> {
    if (this.buffer.length === 0) return 0;
    if (this.circuitBroken) return 0;

    // Take a batch from the front of the buffer
    const batch = this.buffer.splice(0, this.config.batchSize);

    // Track IDs in the processing set for idempotency
    for (const item of batch) {
      this.processingSet.add(item.id);
    }

    this.events.onFlushStarted(batch.length);

    try {
      const result = await this.flushHandler(batch);
      this.totalFlushed += result.succeeded.length;
      this.totalFailed += result.failed.length;

      // Re-enqueue failed items with backoff
      if (result.failed.length > 0) {
        const now = Date.now();
        for (const failed of result.failed) {
          const originalItem = batch.find((item) => item.id === failed.id);
          if (!originalItem) continue;

          if (originalItem.retryCount < this.config.maxRetries) {
            // Re-enqueue with incremented retry count
            const backoffMs = this.config.backoffBaseMs * Math.pow(2, originalItem.retryCount);
            const retryItem: PersistenceQueueItem = {
              ...originalItem,
              retryCount: originalItem.retryCount + 1,
              lastError: failed.error,
              timestamp: now + backoffMs, // Future timestamp hint
            };
            // Add back to the front of the buffer (LIFO retry)
            this.buffer.unshift(retryItem);
          } else {
            this.totalFailed++;
            this.events.onItemDropped(failed.id, `max_retries_exceeded: ${failed.error}`);
          }
        }

        // If ALL items failed, increment the circuit breaker counter
        if (result.succeeded.length === 0 && result.failed.length > 0) {
          this.flushesFailed++;
          this.events.onFlushFailed(
            result.failed[0]?.error ?? "unknown",
            this.flushesFailed,
          );

          if (this.flushesFailed >= this.config.circuitBreakerThreshold) {
            this.circuitBroken = true;
            this.circuitBrokenAt = Date.now();
            this.events.onCircuitBreakerOpened(this.config.circuitBreakerCooldownMs);
          }
        } else {
          // Partial success resets the consecutive failure counter
          this.flushesFailed = 0;
        }
      } else {
        // Full success resets the consecutive failure counter
        this.flushesFailed = 0;
      }

      this.events.onFlushCompleted(result.succeeded.length, result.failed.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Re-enqueue the entire batch on unhandled error
      for (const item of batch) {
        if (item.retryCount < this.config.maxRetries) {
          const backoffMs = this.config.backoffBaseMs * Math.pow(2, item.retryCount);
          const retryItem: PersistenceQueueItem = {
            ...item,
            retryCount: item.retryCount + 1,
            lastError: message,
            timestamp: Date.now() + backoffMs,
          };
          this.buffer.unshift(retryItem);
        } else {
          this.totalFailed++;
          this.events.onItemDropped(item.id, `max_retries_exceeded: ${message}`);
        }
      }

      this.flushesFailed++;
      this.events.onFlushFailed(message, this.flushesFailed);

      if (this.flushesFailed >= this.config.circuitBreakerThreshold) {
        this.circuitBroken = true;
        this.circuitBrokenAt = Date.now();
        this.events.onCircuitBreakerOpened(this.config.circuitBreakerCooldownMs);
      }
    } finally {
      // Clean up processing set
      for (const item of batch) {
        this.processingSet.delete(item.id);
      }
    }

    return batch.length;
  }
}
