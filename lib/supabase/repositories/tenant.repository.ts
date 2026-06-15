// ============================================================================
// Nexus Agent Platform — Tenant Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TenantEntity,
  TenantEntityCreate,
  TenantEntityUpdate,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";

export class TenantRepository extends BaseRepository<
  TenantEntity,
  TenantEntityCreate,
  TenantEntityUpdate
> {
  constructor(client: SupabaseClient) {
    super(client, "tenants", null);
  }

  /**
   * Find a tenant by its URL-friendly slug.
   */
  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.findOne({ slug } as Partial<TenantEntity>);
  }

  /**
   * Find an active tenant by slug.
   */
  async findActiveBySlug(slug: string): Promise<TenantEntity | null> {
    return this.findOne({
      slug,
      is_active: true,
    } as unknown as Partial<TenantEntity>);
  }

  /**
   * Get aggregated metrics for a tenant.
   */
  async getMetrics(tenantId: string): Promise<{
    totalRuns: number;
    activeRuns: number;
    completedRuns: number;
    failedRuns: number;
    totalNodes: number;
    totalEvents: number;
  }> {
    const { data, error } = await this.client.rpc("get_tenant_metrics", {
      p_tenant_id: tenantId,
    });

    if (error) {
      // Fallback: aggregate from individual queries
      const runs = this.client.from("runs").select("status", { count: "exact", head: true }).eq("tenant_id", tenantId);
      const events = this.client.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);

      const [runsResult, eventsResult] = await Promise.all([runs, events]);

      return {
        totalRuns: runsResult.count ?? 0,
        activeRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        totalNodes: 0,
        totalEvents: eventsResult.count ?? 0,
      };
    }

    return data as any;
  }
}
