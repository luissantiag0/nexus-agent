// ============================================================================
// Nexus Agent Platform — Persistence Wiring
// ============================================================================
// Factory functions that create WriteHandlerMap entries backed by
// the Supabase repository layer. This is the bridge between the
// generic PersistenceQueue/BatchWriter and the concrete repositories.
//
// Usage:
//   const handlers = createWriteHandlerMap(repos);
//   const system = createPersistenceSystem({ handlers });
// ============================================================================

import type { WriteHandlerMap } from "./persistence-batch-writer";
import type { PersistenceQueueItem } from "./types";
import type {
  RunRepository,
  RunNodeRepository,
  EventRepository,
  ContextSnapshotRepository,
} from "@/lib/supabase/repositories";

// ---------------------------------------------------------------------------
// Repository Bundle
// ---------------------------------------------------------------------------

export interface PersistenceRepositoryBundle {
  runRepo: RunRepository;
  runNodeRepo: RunNodeRepository;
  eventRepo: EventRepository;
  contextSnapshotRepo: ContextSnapshotRepository;
}

// ---------------------------------------------------------------------------
// Helper: extract tenant_id from item payload (all items carry one)
// ---------------------------------------------------------------------------

function extractTenantId(item: PersistenceQueueItem): string {
  const tid = item.payload.tenant_id as string | undefined;
  if (!tid) throw new Error("PersistenceQueueItem missing tenant_id in payload");
  return tid;
}

// ---------------------------------------------------------------------------
// createWriteHandlerMap
// ---------------------------------------------------------------------------

export function createWriteHandlerMap(
  repos: PersistenceRepositoryBundle,
): WriteHandlerMap {
  const { runRepo, runNodeRepo, eventRepo, contextSnapshotRepo } = repos;

  // ── Run: Update (extracted so run:complete can delegate) ─────────────
  const handleRunUpdate = async (items: PersistenceQueueItem[]) => {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        const p = item.payload;
        const runId = p.runId as string;
        const tenantId = extractTenantId(item);

        const existing = await runRepo.findByRunId(tenantId, runId);
        if (!existing) {
          failed.push({ id: item.id, error: `Run not found: ${runId}` });
          continue;
        }

        await runRepo.update(existing.id, {
          status: p.status as any,
          completed_at: p.completedAt
            ? new Date(p.completedAt as number).toISOString()
            : undefined,
          duration_ms: p.durationMs as number | undefined,
          error: p.error as string | undefined,
          metadata: p.metadata as Record<string, unknown> | undefined,
        });
        succeeded.push(item.id);
      } catch (error) {
        failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { succeeded, failed };
  };

  return {
    // ── Run: Create ──────────────────────────────────────────────────────
    "run:create": async (items: PersistenceQueueItem[]) => {
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const item of items) {
        try {
          const p = item.payload;
          await runRepo.create({
            tenant_id: extractTenantId(item),
            run_id: p.runId as string,
            workflow_id: (p.workflowId as string) ?? "",
            workflow_name: (p.workflowName as string) ?? "",
            mode: (p.mode as any) ?? "DAG",
            status: (p.status as any) ?? "initialized",
            node_count: (p.nodeCount as number) ?? 0,
            edge_count: (p.edgeCount as number) ?? 0,
            started_at: p.startedAt
              ? new Date(p.startedAt as number).toISOString()
              : new Date().toISOString(),
            metadata: (p.metadata as Record<string, unknown>) ?? {},
          });
          succeeded.push(item.id);
        } catch (error) {
          failed.push({
            id: item.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { succeeded, failed };
    },

    // ── Run: Update ──────────────────────────────────────────────────────
    "run:update": handleRunUpdate,

    // ── Run: Complete ────────────────────────────────────────────────────
    "run:complete": async (items: PersistenceQueueItem[]) => {
      return handleRunUpdate(items);
    },

    // ── Node: Create ─────────────────────────────────────────────────────
    "node:create": async (items: PersistenceQueueItem[]) => {
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const item of items) {
        try {
          const p = item.payload;
          await runNodeRepo.create({
            tenant_id: extractTenantId(item),
            run_id: p.runId as string,
            node_id: p.nodeId as string,
            agent_id: (p.agentId as string) ?? "",
            label: (p.label as string) ?? "",
            type: (p.type as any) ?? "agent_node",
            status: (p.status as any) ?? "pending",
            level: (p.level as number) ?? 0,
            retry_count: (p.retryCount as number) ?? 0,
            max_retries: (p.maxRetries as number) ?? 0,
            started_at: p.startedAt
              ? new Date(p.startedAt as number).toISOString()
              : null,
          });
          succeeded.push(item.id);
        } catch (error) {
          failed.push({
            id: item.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { succeeded, failed };
    },

    // ── Node: Update ─────────────────────────────────────────────────────
    "node:update": async (items: PersistenceQueueItem[]) => {
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      // Group by (tenant_id, run_id) for batchUpsert
      const groups = new Map<string, typeof items>();
      for (const item of items) {
        const p = item.payload;
        const key = `${extractTenantId(item)}:${p.run_id as string}`;
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
      }

      for (const [key, group] of Array.from(groups.entries())) {
        try {
          const [tenantId, runId] = key.split(":");
          const nodes = group.map((item) => {
            const p = item.payload;
            return {
              node_id: p.nodeId as string,
              agent_id: p.agentId as string,
              status: p.status as string,
              level: p.level as number | undefined,
              error: p.error as string | null | undefined,
              retry_count: p.retryCount as number | undefined,
              started_at: p.startedAt
                ? new Date(p.startedAt as number).toISOString()
                : undefined,
              completed_at: p.completedAt
                ? new Date(p.completedAt as number).toISOString()
                : undefined,
              result: p.result as Record<string, unknown> | null | undefined,
            };
          });

          await runNodeRepo.batchUpsert(tenantId, runId as any, nodes);
          for (const item of group) succeeded.push(item.id);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          for (const item of group) failed.push({ id: item.id, error: msg });
        }
      }

      return { succeeded, failed };
    },

    // ── Event: Create ────────────────────────────────────────────────────
    "event:create": async (items: PersistenceQueueItem[]) => {
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      // Group by (tenant_id, run_id) for batch inserts
      const groups = new Map<string, typeof items>();
      for (const item of items) {
        const key = `${extractTenantId(item)}:${item.payload.runId as string}`;
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
      }

      for (const [key, group] of Array.from(groups.entries())) {
        try {
          const [tenantId, runId] = key.split(":");
          const events = group.map((item, i) => ({
            tenant_id: tenantId,
            run_id: runId,
            event_id: (item.payload.eventId as string) ?? item.id,
            type: (item.payload.eventType ?? item.payload.type ?? "unknown") as string,
            node_id: (item.payload.nodeId as string) ?? null,
            agent_id: (item.payload.agentId as string) ?? null,
            sequence: (item.payload.sequence as number) ?? i,
            payload: (item.payload.data ?? item.payload.payload ?? {}) as Record<string, unknown>,
            event_timestamp: item.payload.timestamp
              ? new Date(item.payload.timestamp as number).toISOString()
              : new Date().toISOString(),
          }));

          const count = await eventRepo.batchInsert(tenantId as any, runId as any, events as any);
          for (let i = 0; i < count; i++) succeeded.push(group[i].id);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          for (const item of group) failed.push({ id: item.id, error: msg });
        }
      }

      return { succeeded, failed };
    },

    // ── Snapshot: Create ─────────────────────────────────────────────────
    "snapshot:create": async (items: PersistenceQueueItem[]) => {
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const item of items) {
        try {
          const p = item.payload;
          await contextSnapshotRepo.create({
            tenant_id: extractTenantId(item),
            run_id: p.runId as string,
            version: (p.version as number) ?? 1,
            agent_id: (p.agentId as string) ?? "",
            writes: (p.writes as Record<string, unknown>) ?? {},
            diff: (p.diff as Record<string, { oldValue?: unknown; newValue?: unknown }>) ?? {},
            snapshot_timestamp: p.capturedAt
              ? new Date(p.capturedAt as number).toISOString()
              : new Date().toISOString(),
          });
          succeeded.push(item.id);
        } catch (error) {
          failed.push({
            id: item.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { succeeded, failed };
    },
  };
}
