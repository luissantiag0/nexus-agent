// ============================================================================
// Nexus Agent Platform — Context Snapshot Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContextSnapshotEntity,
  ContextSnapshotEntityCreate,
  UUID,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";

export class ContextSnapshotRepository extends BaseRepository<
  ContextSnapshotEntity,
  ContextSnapshotEntityCreate
> {
  constructor(client: SupabaseClient) {
    super(client, "context_snapshots", null);
  }

  /**
   * Get all context snapshots for a run, ordered by version.
   */
  async getSnapshotsByRun(
    tenantId: UUID,
    runId: UUID,
  ): Promise<ContextSnapshotEntity[]> {
    return this.find(
      {
        tenant_id: tenantId,
        run_id: runId,
      } as unknown as Partial<ContextSnapshotEntity>,
      {
        orderBy: { column: "version", ascending: true },
      },
    );
  }

  /**
   * Get the latest snapshot version for a run.
   */
  async getLatestVersion(
    tenantId: UUID,
    runId: UUID,
  ): Promise<number> {
    const snapshots = await this.find(
      {
        tenant_id: tenantId,
        run_id: runId,
      } as unknown as Partial<ContextSnapshotEntity>,
      {
        orderBy: { column: "version", ascending: false },
        limit: 1,
      },
    );

    return snapshots.length > 0 ? snapshots[0].version : 0;
  }

  /**
   * Get the latest snapshot for a run (full record).
   */
  async getLatest(
    tenantId: UUID,
    runId: UUID,
  ): Promise<ContextSnapshotEntity | null> {
    const snapshots = await this.getSnapshotsByRun(tenantId, runId);
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  /**
   * Get a specific version of a context snapshot.
   */
  async getByVersion(
    tenantId: UUID,
    runId: UUID,
    version: number,
  ): Promise<ContextSnapshotEntity | null> {
    const snapshots = await this.find(
      {
        tenant_id: tenantId,
        run_id: runId,
        version,
      } as unknown as Partial<ContextSnapshotEntity>,
    );

    return snapshots.length > 0 ? snapshots[0] : null;
  }
}
