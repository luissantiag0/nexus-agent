// ============================================================================
// Nexus Agent Platform — Persistence Batch Writer
// ============================================================================
// Routes PersistenceQueueItem operations to the correct database write
// handler. Groups items by operation type for efficient batch inserts,
// then returns a FlushResult indicating which succeeded and which failed.
//
// == Design ==
// - Callers (the FlushHandler) pass an array of queue items
// - Items are grouped by operation type
// - Each group is dispatched to the matching write handler
// - Partial failures are tracked per-item
// - Never throws — all errors are captured in FlushResult
// ============================================================================

import type { PersistenceQueueItem, FlushResult } from "./types";

// ---------------------------------------------------------------------------
// Write Handler Interface
// ---------------------------------------------------------------------------

/**
 * Handles persistence of a routed batch of queue items for a single
 * operation type. Implementations write to the actual database.
 */
export interface BatchWriteHandler {
  (items: PersistenceQueueItem[]): Promise<FlushResult>;
}

/**
 * Collection of write handlers keyed by operation type.
 * If a handler is omitted for a given operation, those items are reported
 * as failed with "no_handler" error.
 */
export type WriteHandlerMap = Partial<
  Record<PersistenceQueueItem["operation"], BatchWriteHandler>
>;

// ---------------------------------------------------------------------------
// PersistenceBatchWriter
// ---------------------------------------------------------------------------

export class PersistenceBatchWriter {
  constructor(private readonly handlers: WriteHandlerMap) {}

  /**
   * Write a batch of items by routing each to its operation handler.
   * Items are grouped by operation type so handlers receive contiguous
   * batches suited for bulk inserts.
   */
  async writeBatch(items: PersistenceQueueItem[]): Promise<FlushResult> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    try {
      // Group items by operation
      const groups = this.groupByOperation(items);

      // Dispatch each group to its handler
      for (const [operation, group] of Array.from(groups.entries())) {
        const handler = this.handlers[operation];
        if (!handler) {
          // No handler registered — all items in group fail
          for (const item of group) {
            failed.push({ id: item.id, error: `no_handler:${operation}` });
          }
          continue;
        }

        try {
          const result = await handler(group);
          succeeded.push(...result.succeeded);
          failed.push(...result.failed);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          for (const item of group) {
            failed.push({ id: item.id, error: message });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const item of items) {
        failed.push({ id: item.id, error: message });
      }
    }

    return { succeeded, failed };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private groupByOperation(
    items: PersistenceQueueItem[],
  ): Map<PersistenceQueueItem["operation"], PersistenceQueueItem[]> {
    const groups = new Map<PersistenceQueueItem["operation"], PersistenceQueueItem[]>();
    for (const item of items) {
      const group = groups.get(item.operation) ?? [];
      group.push(item);
      groups.set(item.operation, group);
    }
    return groups;
  }
}
