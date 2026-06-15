// ============================================================================
// Nexus Agent Platform — Agent Repository (Tenant-Aware)
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentEntity,
  AgentEntityCreate,
  AgentEntityUpdate,
} from "../types";
import { BaseRepository } from "@/engine/supabase/repositories/base.repository";

export class AgentRepository extends BaseRepository<
  AgentEntity,
  AgentEntityCreate,
  AgentEntityUpdate
> {
  constructor(client: SupabaseClient) {
    super(client, "agents");
  }

  /**
   * Find an agent by its logical agent_id within a tenant.
   */
  async findByAgentId(
    tenantId: string,
    agentId: string,
  ): Promise<AgentEntity | null> {
    return this.findOne({
      tenant_id: tenantId,
      agent_id: agentId,
    } as unknown as Partial<AgentEntity>);
  }

  /**
   * Find all active agents for a tenant.
   */
  async findActiveByTenant(tenantId: string): Promise<AgentEntity[]> {
    return this.find({
      tenant_id: tenantId,
      status: "active",
    } as unknown as Partial<AgentEntity>);
  }

  /**
   * Register a new agent or reactivate a soft-deleted one.
   */
  async registerAgent(
    data: AgentEntityCreate,
  ): Promise<AgentEntity> {
    const existing = await this.findByAgentId(data.tenant_id, data.agent_id);
    if (existing) {
      if (existing.deleted_at) {
        return (await this.update(existing.id, {
          deleted_at: null,
          status: data.status ?? "active",
          version: data.version ?? existing.version,
        } as AgentEntityUpdate))!;
      }
      return existing;
    }
    return this.create(data);
  }
}
