// ============================================================================
// Nexus Agent Platform — Run Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RunEntity,
  RunEntityCreate,
  RunEntityUpdate,
  RunFilterParams,
  RunStatus,
  UUID,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";
import type { QueryOptions } from "@/engine/types/supabase-types";

export class RunRepository extends BaseRepository<
  RunEntity,
  RunEntityCreate,
  RunEntityUpdate
> {
  constructor(client: SupabaseClient) {
    super(client, "runs", null);
  }

  /**
   * Find a run by its runtime run_id scoped to a tenant.
   */
  async findByRunId(
    tenantId: string,
    runId: string,
  ): Promise<RunEntity | null> {
    return this.findOne({
      tenant_id: tenantId,
      run_id: runId,
    } as unknown as Partial<RunEntity>);
  }

  /**
   * List runs for a tenant with optional filtering and pagination.
   */
  async getRunsByTenant(
    tenantId: UUID,
    filters?: RunFilterParams,
  ): Promise<{ runs: RunEntity[]; total: number }> {
    const criteria: Record<string, unknown> = { tenant_id: tenantId };

    if (filters?.status) {
      criteria.status = filters.status;
    }
    if (filters?.workflow_id) {
      criteria.workflow_id = filters.workflow_id;
    }

    const all = await this.find(criteria as Partial<RunEntity>, {
      orderBy: { column: "created_at", ascending: false },
    });

    const total = all.length;
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const page = all.slice(offset, offset + limit);

    return { runs: page, total };
  }

  /**
   * Get a run with its nodes eagerly loaded (two queries).
   */
  async getRunWithNodes(
    tenantId: UUID,
    runId: UUID,
  ): Promise<{ run: RunEntity | null; nodes: any[] }> {
    const [run, nodesResult] = await Promise.all([
      this.findById(runId),
      this.client
        .from("run_nodes")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("run_id", runId)
        .order("level", { ascending: true }),
    ]);

    return {
      run: run && run.tenant_id === tenantId ? run : null,
      nodes: (nodesResult.data ?? []) as any[],
    };
  }

  /**
   * Count runs by status for a tenant (fast aggregation).
   */
  async countByStatus(
    tenantId: UUID,
    status: RunStatus,
  ): Promise<number> {
    const { count, error } = await this.client
      .from("runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", status);

    if (error) return 0;
    return count ?? 0;
  }
}
