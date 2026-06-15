// ============================================================================
// Nexus Agent Platform — Run Node Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RunNodeEntity,
  RunNodeEntityCreate,
  RunNodeEntityUpdate,
  UUID,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";

export class RunNodeRepository extends BaseRepository<
  RunNodeEntity,
  RunNodeEntityCreate,
  RunNodeEntityUpdate
> {
  constructor(client: SupabaseClient) {
    super(client, "run_nodes", null);
  }

  /**
   * Get all nodes for a run, ordered by level (topological order).
   */
  async getNodesByRun(
    tenantId: UUID,
    runId: UUID,
  ): Promise<RunNodeEntity[]> {
    return this.find(
      {
        tenant_id: tenantId,
        run_id: runId,
      } as unknown as Partial<RunNodeEntity>,
      {
        orderBy: { column: "level", ascending: true },
      },
    );
  }

  /**
   * Batch upsert nodes (create or update by node_id within a run).
   * Useful for the persistence queue flush where multiple nodes
   * arrive in a single batch.
   */
  async batchUpsert(
    tenantId: UUID,
    runId: UUID,
    nodes: Array<{
      node_id: string;
      agent_id?: string;
      status?: string;
      level?: number;
      error?: string | null;
      retry_count?: number;
      started_at?: string | null;
      completed_at?: string | null;
      result?: Record<string, unknown> | null;
    }>,
  ): Promise<number> {
    let updated = 0;
    for (const node of nodes) {
      const existing = await this.findOne({
        tenant_id: tenantId,
        run_id: runId,
        node_id: node.node_id,
      } as unknown as Partial<RunNodeEntity>);

      if (existing) {
        await this.update(existing.id, node as RunNodeEntityUpdate);
      } else {
        await this.create({
          tenant_id: tenantId,
          run_id: runId,
          node_id: node.node_id,
          agent_id: node.agent_id ?? "",
          status: (node.status ?? "pending") as any,
          level: node.level ?? 0,
          retry_count: node.retry_count ?? 0,
          max_retries: 0,
          started_at: node.started_at ?? null,
        } as RunNodeEntityCreate);
      }
      updated++;
    }
    return updated;
  }

  /**
   * Count nodes by status for a run.
   */
  async countByStatus(
    tenantId: UUID,
    runId: UUID,
    status: string,
  ): Promise<number> {
    const { count, error } = await this.client
      .from("run_nodes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("run_id", runId)
      .eq("status", status);

    if (error) return 0;
    return count ?? 0;
  }
}
