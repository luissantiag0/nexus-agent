// ============================================================================
// Nexus Agent Platform — Next.js Middleware (Root)
// ============================================================================
// 1. Refreshes Supabase auth session (cookie rotation for SSR)
// 2. Resolves active tenant for tenant-scoped routes
// Non-tenant routes pass through with session only.
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SupabaseClientFactory } from "@/lib/supabase/supabase-client";
import { TenantResolver } from "@/middleware/tenant-middleware";
import { updateSession } from "@/utils/supabase/middleware";

// ---------------------------------------------------------------------------
// Routes that require tenant resolution
// ---------------------------------------------------------------------------

const TENANT_ROUTES = ["/api/tenants/"];

function requiresTenant(pathname: string): boolean {
  return TENANT_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsTenant = requiresTenant(pathname);

  // ── Step 1: Resolve tenant (if needed) ──────────────────────────────
  // Run BEFORE auth refresh so tenant headers are on the request when
  // the Supabase cookie response is built.
  let tenantId: string | undefined;
  let tenantResponseHeaders: Record<string, string> = {};

  if (needsTenant) {
    try {
      const client = SupabaseClientFactory.getClient();
      const resolver = new TenantResolver(client);
      const result = await resolver.resolve(request.headers, pathname);

      if (result.status && result.error) {
        return NextResponse.json(
          {
            error: result.error,
            code: "TENANT_NOT_FOUND",
            tenantId: result.context.tenantId || undefined,
          },
          { status: result.status },
        );
      }

      tenantId = result.context.tenantId;
      tenantResponseHeaders = result.responseHeaders;

      // Inject tenant ID into request headers for downstream handlers
      if (tenantId) {
        request.headers.set("x-tenant-id", tenantId);
      }
    } catch (error) {
      console.error("[TenantMiddleware] Error:", error);
      return NextResponse.json(
        { error: "Internal server error during tenant resolution" },
        { status: 500 },
      );
    }
  }

  // ── Step 2: Refresh Supabase auth session ───────────────────────────
  // The updateSession helper handles cookie rotation and returns a
  // response with refreshed session cookies. Because tenant headers
  // were set on request above, any setAll callback will capture them.
  let response = await updateSession(request);

  // ── Step 3: Apply tenant response headers ────────────────────────────
  if (tenantId) {
    response.headers.set("x-tenant-id", tenantId);
  }
  for (const [key, value] of Object.entries(tenantResponseHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Matcher: run on all API routes, dashboard pages, and auth routes
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
  ],
};
