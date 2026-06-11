// ============================================================================
// Nexus Agent Platform — Workflow Repository
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkflowEntity,
  WorkflowEntityCreate,
} from "@/engine/types/supabase-types";
import { BaseRepository } from "./base.repository";

export class WorkflowRepository extends BaseRepository<
  WorkflowEntity,
  WorkflowEntityCreate
> {
  constructor(client: SupabaseClient) {
    super(client, "workflows", null); // No soft delete for workflows
  }

  /**
   * Find a workflow by its logical workflow_id.
   */
  async findByWorkflowId(workflowId: string): Promise<WorkflowEntity | null> {
    return this.findOne({ workflow_id: workflowId } as Partial<WorkflowEntity>);
  }

  /**
   * Find all enabled workflows.
   */
  async findEnabled(): Promise<WorkflowEntity[]> {
    return this.find({ is_enabled: true } as Partial<WorkflowEntity>);
  }

  /**
   * Find workflows by mode.
   */
  async findByMode(mode: "chain" | "graph"): Promise<WorkflowEntity[]> {
    return this.find({ mode } as Partial<WorkflowEntity>);
  }

  /**
   * Enable a workflow.
   */
  async enable(id: string): Promise<WorkflowEntity | null> {
    return this.update(id, { is_enabled: true } as any);
  }

  /**
   * Disable a workflow.
   */
  async disable(id: string): Promise<WorkflowEntity | null> {
    return this.update(id, { is_enabled: false } as any);
  }
}
