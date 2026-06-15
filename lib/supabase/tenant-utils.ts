// ============================================================================
// Nexus Agent Platform — Tenant Utilities
// ============================================================================
// Helpers for route handlers to extract tenant context from the request
// after middleware has resolved and injected the tenant ID header.
// ============================================================================

import type { TenantContext } from "@/middleware/tenant-middleware";
import { SupabaseClientFactory } from "./supabase-client";
import { TenantRepository } from "./repositories/tenant.repository";

/**
 * Extract the tenant ID from request headers (set by middleware).
 * Returns null if no tenant context is present.
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get("x-tenant-id") ?? null;
}

/**
 * Extract the full TenantContext from the request.
 * This queries the database for the tenant record.
 */
export async function getTenantContext(
  headers: Headers,
): Promise<TenantContext | null> {
  const tenantId = getTenantIdFromHeaders(headers);
  if (!tenantId) return null;

  const client = SupabaseClientFactory.getClient();
  const repo = new TenantRepository(client);
  const tenant = await repo.findById(tenantId);

  return {
    tenantId,
    tenant,
    source: tenant ? "header" : "none",
  };
}

/**
 * Require a tenant ID from headers, throwing if missing.
 * Use this in route handlers that absolutely require a tenant context.
 */
export function requireTenantId(headers: Headers): string {
  const tenantId = getTenantIdFromHeaders(headers);
  if (!tenantId) {
    throw new Error("Tenant ID is required but was not found in request headers");
  }
  return tenantId;
}
