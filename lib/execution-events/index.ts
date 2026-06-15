// ============================================================================
// Nexus Agent Platform — Execution Events Module
// ============================================================================
// Barrel exports for the observability and execution tracing subsystem.
// ============================================================================

// --- Types ---
export type {
  ExecutionEvent,
  ExecutionRun,
  RunSummary,
  ContextSnapshot,
  EventFilter,
  SSEEvent,
} from "./types";

export { ExecutionEventType } from "./types";

// --- Emitter ---
export type { EventListener } from "./emitter";
export { RunEventEmitter } from "./emitter";

// --- Stream ---
export { ExecutionEventStream, executionEventStream } from "./stream";

// --- Store ---
export type { ExecutionStoreConfig } from "./store";
export { ExecutionStore, executionStore } from "./store";
