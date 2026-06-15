// ============================================================================
// Nexus Agent Platform — Execution Event Stream
// ============================================================================
// Manages Server-Sent Events (SSE) subscriber connections. Acts as the
// bridge between the instrumentation hooks layer (which produces events)
// and the SSE API routes (which stream them to connected clients).
//
// The stream supports two subscription modes:
//   1. Per-run:  subscriber receives events for a specific runId
//   2. Global:   subscriber receives events for ALL runs
//
// Both are served through a single ExecutionEventStream singleton.
// ============================================================================

import type { ExecutionEvent } from "./types";
import type { EventListener } from "./emitter";

// ---------------------------------------------------------------------------
// Subscriber types
// ---------------------------------------------------------------------------

/** Internal record for a per-run subscription. */
interface RunSubscriber {
  runId: string;
  listener: EventListener;
}

/** Internal record for a global subscription. */
interface GlobalSubscriber {
  listener: EventListener;
}

// ---------------------------------------------------------------------------
// ExecutionEventStream
// ---------------------------------------------------------------------------

export class ExecutionEventStream {
  /** Run-specific subscribers, keyed by runId -> Set of callbacks */
  private runSubs = new Map<string, Set<EventListener>>();
  /** Global subscribers that receive all events */
  private globalSubs = new Set<EventListener>();

  // -----------------------------------------------------------------------
  // Subscription management
  // -----------------------------------------------------------------------

  /**
   * Subscribe to events for a specific run.
   * Returns an unsubscribe function.
   */
  subscribe(runId: string, listener: EventListener): () => void {
    if (!this.runSubs.has(runId)) {
      this.runSubs.set(runId, new Set());
    }
    this.runSubs.get(runId)!.add(listener);

    return () => {
      const subs = this.runSubs.get(runId);
      if (subs) {
        subs.delete(listener);
        if (subs.size === 0) {
          this.runSubs.delete(runId);
        }
      }
    };
  }

  /**
   * Subscribe to ALL events across all runs.
   * Returns an unsubscribe function.
   */
  subscribeAll(listener: EventListener): () => void {
    this.globalSubs.add(listener);
    return () => {
      this.globalSubs.delete(listener);
    };
  }

  /**
   * Remove all subscribers for a specific run.
   */
  unsubscribeRun(runId: string): void {
    this.runSubs.delete(runId);
  }

  /**
   * Remove all subscribers (both run-specific and global).
   */
  unsubscribeAll(): void {
    this.runSubs.clear();
    this.globalSubs.clear();
  }

  // -----------------------------------------------------------------------
  // Publishing
  // -----------------------------------------------------------------------

  /**
   * Publish an event to all relevant subscribers.
   * Events are dispatched to:
   *   1. Run-specific subscribers for the event's runId
   *   2. Global subscribers (registered via subscribeAll)
   *
   * Errors from individual subscriber callbacks are caught and discarded
   * to protect the publisher from faulty subscribers.
   */
  publish(event: ExecutionEvent): void {
    // Run-specific subscribers
    const runListeners = this.runSubs.get(event.runId);
    if (runListeners) {
      for (const listener of runListeners) {
        try {
          listener(event);
        } catch {
          // Swallow subscriber errors
        }
      }
    }

    // Global subscribers
    for (const listener of this.globalSubs) {
      try {
        listener(event);
      } catch {
        // Swallow subscriber errors
      }
    }
  }

  // -----------------------------------------------------------------------
  // Introspection
  // -----------------------------------------------------------------------

  /**
   * Number of unique run IDs with active subscriptions.
   */
  subscribedRunCount(): number {
    return this.runSubs.size;
  }

  /**
   * Total number of subscriber callbacks (run-specific + global).
   */
  totalSubscriberCount(): number {
    let count = this.globalSubs.size;
    for (const subs of this.runSubs.values()) {
      count += subs.size;
    }
    return count;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Global singleton shared by SSE route handlers and the instrumentation
 * hooks layer. Import this to publish or subscribe to execution events.
 */
export const executionEventStream = new ExecutionEventStream();
