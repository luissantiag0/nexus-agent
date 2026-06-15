// ============================================================================
// Nexus Agent Platform — Persistence Layer Types
// ============================================================================

// ---------------------------------------------------------------------------
// PersistenceQueue Operation Types
// ---------------------------------------------------------------------------

export type PersistenceOperation =
  | "run:create"
  | "run:update"
  | "run:complete"
  | "event:create"
  | "snapshot:create"
  | "node:create"
  | "node:update";

/**
 * A single item in the persistence queue.
 * Each item represents one pending write operation to the database.
 */
export interface PersistenceQueueItem {
  /** Unique idempotency key (UUID v4) */
  id: string;
  /** The type of operation to perform */
  operation: PersistenceOperation;
  /** The payload to persist */
  payload: Record<string, unknown>;
  /** Unix timestamp (ms) when the item was enqueued */
  timestamp: number;
  /** Number of retry attempts so far */
  retryCount: number;
  /** Last error message (if retried) */
  lastError?: string;
}

// ---------------------------------------------------------------------------
// PersistenceQueue Configuration
// ---------------------------------------------------------------------------

export interface PersistenceQueueConfig {
  /** Maximum items in the queue before blocking enqueue. Default: 5000 */
  maxItems: number;
  /** Number of items to flush per batch. Default: 100 */
  batchSize: number;
  /** Flush interval in milliseconds. Default: 500 */
  flushIntervalMs: number;
  /** Maximum retry attempts per item. Default: 3 */
  maxRetries: number;
  /** Base backoff delay in ms (doubles each retry). Default: 500 */
  backoffBaseMs: number;
  /** Consecutive failures before circuit breaker opens. Default: 5 */
  circuitBreakerThreshold: number;
  /** Circuit breaker cooldown in ms before retrying. Default: 30000 */
  circuitBreakerCooldownMs: number;
}

export const DEFAULT_PERSISTENCE_QUEUE_CONFIG: PersistenceQueueConfig = {
  maxItems: 5_000,
  batchSize: 100,
  flushIntervalMs: 500,
  maxRetries: 3,
  backoffBaseMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30_000,
};

// ---------------------------------------------------------------------------
// PersistenceQueue Stats
// ---------------------------------------------------------------------------

export interface PersistenceQueueStats {
  currentSize: number;
  totalEnqueued: number;
  totalFlushed: number;
  totalFailed: number;
  flushesFailed: number;
  isCircuitBroken: boolean;
  circuitBrokenAt: number | null;
}

// ---------------------------------------------------------------------------
// Persistence Flush Handler
// ---------------------------------------------------------------------------

/**
 * Callback invoked during a queue flush with a batch of items.
 * Implementations should persist the items to the database and return
 * a result indicating which items succeeded and which failed.
 */
export interface FlushResult {
  succeeded: string[];  // IDs of items that persisted successfully
  failed: Array<{ id: string; error: string }>;  // IDs of items that failed
}

export type FlushHandler = (items: PersistenceQueueItem[]) => Promise<FlushResult>;
