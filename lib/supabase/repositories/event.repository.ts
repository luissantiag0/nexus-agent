// ============================================================================
// Nexus Agent Platform — Event Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EventEntity,
  EventEntityCreate,
  EventFilterParams,
  UUID,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";

export class EventRepository extends BaseRepository<
  EventEntity,
  EventEntityCreate
> {
  constructor(client: SupabaseClient) {
    super(client, "events", null);
  }

  /**
   * Get events for a run with optional filtering by type and node.
   */
  async getEventsByRun(
    tenantId: UUID,
    runId: UUID,
    filters?: EventFilterParams,
  ): Promise<{ events: EventEntity[]; total: number; hasMore: boolean }> {
    let query = this.client
      .from("events")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("run_id", runId)
      .order("sequence", { ascending: true });

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.node_id) {
      query = query.eq("node_id", filters.node_id);
    }

    const limit = filters?.limit ?? 100;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    const events = (data ?? []) as EventEntity[];
    const total = count ?? events.length;

    return {
      events,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Batch insert events (used by persistence queue flush).
   * Returns the number of inserted events.
   */
  async batchInsert(
    tenantId: UUID,
    runId: UUID,
    events: EventEntityCreate[],
  ): Promise<number> {
    const records = events.map((e, i) => ({
      ...e,
      tenant_id: tenantId,
      run_id: runId,
      sequence: e.sequence ?? i,
    }));

    const created = await this.createBatch(records);
    return created.length;
  }

  /**
   * Get the latest event sequence number for a run.
   */
  async getMaxSequence(
    tenantId: UUID,
    runId: UUID,
  ): Promise<number> {
    const { data, error } = await this.client
      .from("events")
      .select("sequence")
      .eq("tenant_id", tenantId)
      .eq("run_id", runId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return 0;
    return (data as any).sequence ?? 0;
  }

  /**
   * Count events for a tenant (aggregation).
   */
  async countByTenant(tenantId: UUID): Promise<number> {
    const { count, error } = await this.client
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (error) return 0;
    return count ?? 0;
  }
}
