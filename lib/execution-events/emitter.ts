// ============================================================================
// Nexus Agent Platform — Run Event Emitter
// ============================================================================
// Per-run event emitter that decouples the instrumentation hooks from the
// stream broadcast layer. Each run gets its own emitter instance so that
// listeners can be registered per-run without global fan-out overhead.
//
// The emitter implements a synchronous pub/sub pattern: when a hook function
// emits an event, all registered listeners are invoked immediately before
// returning. This ensures event ordering guarantees within a single run.
// ============================================================================

import type { ExecutionEvent, ExecutionEventType } from "./types";

// ---------------------------------------------------------------------------
// Listener type
// ---------------------------------------------------------------------------

/**
 * Callback invoked when an event is emitted.
 * Receives the fully constructed ExecutionEvent.
 */
export type EventListener = (event: ExecutionEvent) => void;

// ---------------------------------------------------------------------------
// RunEventEmitter
// ---------------------------------------------------------------------------

export class RunEventEmitter {
  private listeners = new Map<ExecutionEventType, Set<EventListener>>();
  private wildcardListeners = new Set<EventListener>();

  /**
   * Register a listener for a specific event type.
   * Returns an unsubscribe function.
   */
  on(type: ExecutionEventType, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Register a listener for ALL event types.
   * Returns an unsubscribe function.
   */
  onAny(listener: EventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Remove a specific listener for a given event type.
   */
  off(type: ExecutionEventType, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Remove all listeners for this emitter.
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Emit an event to all registered listeners.
   * Listeners are invoked synchronously in registration order.
   * Errors from individual listeners are caught and silently discarded
   * to prevent one faulty listener from breaking the event chain.
   */
  emit(event: ExecutionEvent): void {
    // Type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch {
          // Silently swallow listener errors to preserve event chain integrity
        }
      }
    }

    // Wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(event);
      } catch {
        // Silently swallow
      }
    }
  }

  /**
   * Number of registered listeners across all types.
   */
  listenerCount(): number {
    let count = this.wildcardListeners.size;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}
