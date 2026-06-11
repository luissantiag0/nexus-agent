// ============================================================================
// Nexus Agent Platform — Agent Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentEntity,
  AgentEntityCreate,
  AgentEntityUpdate,
} from "@/engine/types/supabase-types";
import { BaseRepository } from "./base.repository";

export class AgentRepository extends BaseRepository<
  AgentEntity,
  AgentEntityCreate,
  AgentEntityUpdate
> {
  constructor(client: SupabaseClient) {
    super(client, "agents");
  }

  /**
   * Find an agent by its logical agent_id (e.g., "backend-architect").
   */
  async findByAgentId(agentId: string): Promise<AgentEntity | null> {
    return this.findOne({ agent_id: agentId } as Partial<AgentEntity>);
  }

  /**
   * Find all active agents.
   */
  async findActive(): Promise<AgentEntity[]> {
    return this.find({ status: "active" } as Partial<AgentEntity>);
  }

  /**
   * Find agents by tag.
   */
  async findByTag(tag: string): Promise<AgentEntity[]> {
    const all = await this.findAll();
    return all.filter((agent) => {
      const metadata = agent.metadata as Record<string, unknown> | undefined;
      const tags = metadata?.tags as string[] | undefined;
      return tags?.includes(tag) ?? false;
    });
  }

  /**
   * Archive an agent (soft delete).
   */
  async archive(id: string): Promise<boolean> {
    return this.delete(id, true);
  }
}
