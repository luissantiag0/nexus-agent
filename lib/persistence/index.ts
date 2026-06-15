// ============================================================================
// Nexus Agent Platform — Persistence Module
// ============================================================================

// -- Types --
export type {
  PersistenceOperation,
  PersistenceQueueItem,
  PersistenceQueueConfig,
  PersistenceQueueStats,
  FlushResult,
  FlushHandler,
} from "./types";
export { DEFAULT_PERSISTENCE_QUEUE_CONFIG } from "./types";

// -- Record Types --
export type {
  RunNodeRecord,
  RunEventRecord,
  ContextSnapshotRecord,
} from "./persistence-records";

// -- Queue --
export type { PersistenceQueueEvents } from "./persistence-queue";
export { PersistenceQueue } from "./persistence-queue";

// -- Batch Writer --
export type { BatchWriteHandler, WriteHandlerMap } from "./persistence-batch-writer";
export { PersistenceBatchWriter } from "./persistence-batch-writer";

// -- Event Mapper --
export { PersistenceEventMapper } from "./persistence-event-mapper";

// -- Instrumentation --
export { PersistenceInstrumentation } from "./persistence-instrumentation";

// -- Factory --
export type { PersistenceSystem, CreatePersistenceSystemOptions } from "./create-persistence-system";
export { createPersistenceSystem } from "./create-persistence-system";

// -- Wiring (repository-backed handlers) --
export type { PersistenceRepositoryBundle } from "./persistence-wiring";
export { createWriteHandlerMap } from "./persistence-wiring";
