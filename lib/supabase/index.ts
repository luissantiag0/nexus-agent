// ============================================================================
// Nexus Agent Platform — Supabase Module (Persistence Layer)
// ============================================================================

// -- Configuration --
export type { DbConfig } from "./db-config";
export { loadDbConfig } from "./db-config";

// -- Client --
export { SupabaseClientFactory, supabase } from "./supabase-client";

// -- Entity Types --
export type {
  UUID,
  Timestamp,
  TenantEntity,
  TenantEntityCreate,
  TenantEntityUpdate,
  AgentEntity,
  AgentEntityCreate,
  AgentEntityUpdate,
  AgentStatus,
  RunEntity,
  RunEntityCreate,
  RunEntityUpdate,
  RunStatus,
  RunMode,
  RunNodeEntity,
  RunNodeEntityCreate,
  RunNodeEntityUpdate,
  NodeStatus,
  NodeType,
  EventEntity,
  EventEntityCreate,
  ContextSnapshotEntity,
  ContextSnapshotEntityCreate,
  PaginationParams,
  RunFilterParams,
  EventFilterParams,
  TenantMetrics,
} from "./types";

// -- Repositories --
export {
  TenantRepository,
  AgentRepository,
  RunRepository,
  RunNodeRepository,
  EventRepository,
  ContextSnapshotRepository,
} from "./repositories";
