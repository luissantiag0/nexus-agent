// ============================================================================
// Nexus Agent Platform — createPersistenceSystem()
// ============================================================================
// Factory function that assembles the complete persistence infrastructure:
//
//   PersistenceEventMapper
//     → PersistenceQueue (with FlushHandler wiring)
//       → PersistenceBatchWriter
//         → WriteHandlerMap (repository-backed handlers)
//     → PersistenceInstrumentation (wraps ExecutionHooks)
//
// The factory accepts handler implementations optionally — if omitted, the
// system runs in "buffered-only" mode where items are enqueued but never
// flushed to a database (useful for testing or when no DB is configured).
// ============================================================================

import { PersistenceQueue } from "./persistence-queue";
import type { PersistenceQueueEvents } from "./persistence-queue";
import type { PersistenceQueueConfig } from "./types";
import { PersistenceBatchWriter } from "./persistence-batch-writer";
import type { WriteHandlerMap } from "./persistence-batch-writer";
import { PersistenceEventMapper } from "./persistence-event-mapper";
import { PersistenceInstrumentation } from "./persistence-instrumentation";
import type { FlushHandler } from "./types";

// ---------------------------------------------------------------------------
// PersistenceSystem — assembled persistence infrastructure
// ---------------------------------------------------------------------------

export interface PersistenceSystem {
  /** The event mapper converts runtime events to queue items. */
  mapper: PersistenceEventMapper;
  /** The queue buffers and flushes items asynchronously. */
  queue: PersistenceQueue;
  /** The batch writer routes items to their write handlers. */
  batchWriter: PersistenceBatchWriter;
  /** Instrumentation wrapper — pass this to ExecutionLoop in place of raw hooks. */
  instrumentation: PersistenceInstrumentation;
  /** Start the queue timer. Call before the first execution. */
  start(): void;
  /** Stop the queue timer without draining. */
  stop(): void;
  /** Graceful shutdown: drain all pending items and release resources. */
  shutdown(): Promise<void>;
  /**
   * Set the tenant context for all subsequent persistence operations.
   * Delegates to instrumentation.setTenantId(). Must be called before
   * any execution run.
   */
  setTenantId(tenantId: string): void;
}

// ---------------------------------------------------------------------------
// createPersistenceSystem
// ---------------------------------------------------------------------------

export interface CreatePersistenceSystemOptions {
  /** Queue configuration overrides. */
  queueConfig?: Partial<PersistenceQueueConfig>;
  /** Queue lifecycle event callbacks. */
  queueEvents?: Partial<PersistenceQueueEvents>;
  /**
   * Write handler map for the batch writer.
   * If omitted, the queue runs in buffered-only mode (items are dropped
   * on flush). Provide at minimum `run:create`, `run:complete`, and
   * `event:create` handlers for useful persistence.
   */
  handlers?: WriteHandlerMap;
  /**
   * Optional custom flush handler that replaces the batch writer entirely.
   * Useful for testing or legacy integrations.
   */
  customFlushHandler?: FlushHandler;
  /**
   * The inner ExecutionHooks instance to wrap with persistence.
   * If omitted, you must call setInnerHooks() on the returned
   * instrumentation before use, or wrap it manually.
   */
  innerHooks?: import("@/lib/execution-events/execution-hooks").ExecutionHooks;
}

export function createPersistenceSystem(
  options: CreatePersistenceSystemOptions = {},
): PersistenceSystem {
  const mapper = new PersistenceEventMapper();
  const batchWriter = new PersistenceBatchWriter(options.handlers ?? {});

  // Build the flush handler: use custom if provided, otherwise delegate to batch writer
  const flushHandler: FlushHandler = options.customFlushHandler ?? (async (items) => {
    return batchWriter.writeBatch(items);
  });

  const queue = new PersistenceQueue(
    flushHandler,
    options.queueConfig,
    options.queueEvents,
  );

  // Create a no-op ExecutionHooks object if no inner hooks provided
  const noopHooks = createNoopHooks();

  const instrumentation = new PersistenceInstrumentation(
    options.innerHooks ?? noopHooks,
    queue,
  );

  return {
    mapper,
    queue,
    batchWriter,
    instrumentation,
    start: () => queue.start(),
    stop: () => queue.stop(),
    shutdown: async () => { await queue.shutdown(); },
    setTenantId: (tenantId: string) => { instrumentation.setTenantId(tenantId); },
  };
}

// ---------------------------------------------------------------------------
// No-op ExecutionHooks (used when no inner hooks provided)
// ---------------------------------------------------------------------------

function createNoopHooks(): import("@/lib/execution-events/execution-hooks").ExecutionHooks {
  const noop = (..._args: unknown[]) => {};
  return {
    onRunInitialized: noop as any,
    onNodeStarted: noop as any,
    onNodeCompleted: noop as any,
    onNodeFailed: noop as any,
    onNodeSkipped: noop as any,
    onNodeRetrying: noop as any,
    onContextUpdated: noop as any,
    onRouteSelected: noop as any,
    onSynchronizerBarrier: noop as any,
    onSynchronizerMerged: noop as any,
    onExecutionCompleted: noop as any,
    onExecutionFailed: noop as any,
    onStateTransition: noop as any,
  };
}
