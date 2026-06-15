// ============================================================================
// Nexus Agent Platform — Tenant Middleware
// ============================================================================
// Resolves the active tenant from the incoming request and injects it
// into the request lifecycle for downstream handlers and repositories.
//
// Resolution order:
//   1. x-tenant-id header (explicit tenant UUID)
//   2. x-tenant-slug header (tenant slug, looked up via TenantRepository)
//   3. URL path parameter /api/tenants/:tenantId/*
//
// The resolved tenant ID is set as:
//   - x-tenant-id response header (for downstream propagation)
//   - request.tenant property (for route handlers)
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantEntity } from "@/lib/supabase/types";
import { TenantRepository } from "@/lib/supabase/repositories/tenant.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantContext {
  /** The resolved tenant ID (UUID). */
  tenantId: string;
  /** The resolved tenant record (may be null if not found). */
  tenant: TenantEntity | null;
  /** The resolution method used. */
  source: "header" | "slug" | "path" | "none";
}

export interface TenantResolutionResult {
  context: TenantContext;
  /** Set this header on the response for downstream propagation. */
  responseHeaders: Record<string, string>;
  /** HTTP status if the request should be rejected (404). */
  status?: number;
  /** Error message if the request should be rejected. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Request extension (for typed access in route handlers)
// ---------------------------------------------------------------------------

declare module "next/server" {
  interface NextRequest {
    tenant?: TenantContext;
  }
}

// ---------------------------------------------------------------------------
// TenantResolver
// ---------------------------------------------------------------------------

export class TenantResolver {
  private repo: TenantRepository;

  constructor(client: SupabaseClient) {
    this.repo = new TenantRepository(client);
  }

  /**
   * Resolve tenant from a request. Returns the resolution result
   * with context, response headers, and potential error status.
   */
  async resolve(
    headers: Headers,
    pathname: string,
  ): Promise<TenantResolutionResult> {
    // 1. Try x-tenant-id header (explicit UUID)
    const headerTenantId = headers.get("x-tenant-id");
    if (headerTenantId) {
      const tenant = await this.repo.findById(headerTenantId);
      if (tenant && tenant.is_active) {
        return {
          context: { tenantId: tenant.id, tenant, source: "header" },
          responseHeaders: { "x-tenant-id": tenant.id },
        };
      }
      return {
        context: { tenantId: headerTenantId, tenant: null, source: "header" },
        responseHeaders: {},
        status: 404,
        error: `Tenant not found or inactive: ${headerTenantId}`,
      };
    }

    // 2. Try x-tenant-slug header
    const headerSlug = headers.get("x-tenant-slug");
    if (headerSlug) {
      const tenant = await this.repo.findActiveBySlug(headerSlug);
      if (tenant) {
        return {
          context: { tenantId: tenant.id, tenant, source: "slug" },
          responseHeaders: { "x-tenant-id": tenant.id },
        };
      }
      return {
        context: { tenantId: headerSlug, tenant: null, source: "slug" },
        responseHeaders: {},
        status: 404,
        error: `Tenant not found by slug: ${headerSlug}`,
      };
    }

    // 3. Try URL path: /api/tenants/:tenantId/*
    const pathMatch = pathname.match(/^\/api\/tenants\/([^/]+)/);
    if (pathMatch) {
      const pathTenantId = pathMatch[1];
      // Try as UUID first, then as slug
      const byId = await this.repo.findById(pathTenantId);
      if (byId && byId.is_active) {
        return {
          context: { tenantId: byId.id, tenant: byId, source: "path" },
          responseHeaders: { "x-tenant-id": byId.id },
        };
      }
      const bySlug = await this.repo.findActiveBySlug(pathTenantId);
      if (bySlug) {
        return {
          context: { tenantId: bySlug.id, tenant: bySlug, source: "path" },
          responseHeaders: { "x-tenant-id": bySlug.id },
        };
      }
      return {
        context: { tenantId: pathTenantId, tenant: null, source: "path" },
        responseHeaders: {},
        status: 404,
        error: `Tenant not found: ${pathTenantId}`,
      };
    }

    // No tenant resolution method matched
    return {
      context: { tenantId: "", tenant: null, source: "none" },
      responseHeaders: {},
    };
  }
}

// ---------------------------------------------------------------------------
// Tenant Middleware Error
// ---------------------------------------------------------------------------

export class TenantMiddlewareError extends Error {
  public readonly status: number;
  public readonly context: TenantContext;

  constructor(message: string, status: number, context: TenantContext) {
    super(message);
    this.name = "TenantMiddlewareError";
    this.status = status;
    this.context = context;
  }
}
