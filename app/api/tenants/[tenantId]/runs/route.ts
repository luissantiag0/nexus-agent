// ============================================================================
// GET /api/tenants/:tenantId/runs
// ============================================================================
// Returns a paginated, filterable list of runs for a tenant.
// Tenant is validated by middleware before reaching this handler.
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SupabaseClientFactory } from "@/lib/supabase/supabase-client";
import { RunRepository } from "@/lib/supabase/repositories/run.repository";
import { requireTenantId } from "@/lib/supabase/tenant-utils";
import { toRunDTO } from "@/lib/api/tenant-api-types";
import type { ApiError, PaginatedResponse, RunDTO } from "@/lib/api/tenant-api-types";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const VALID_STATUSES = new Set(["pending", "running", "completed", "failed", "cancelled", "partial"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const tenantId = requireTenantId(request.headers);
    const client = SupabaseClientFactory.getClient();
    const runRepo = new RunRepository(client);

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const rawStatus = searchParams.get("status");
    const status = rawStatus && VALID_STATUSES.has(rawStatus) ? (rawStatus as any) : undefined;

    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");
    const limit = Math.min(Math.max(1, rawLimit ? parseInt(rawLimit, 10) : 50), MAX_LIMIT);
    const offset = Math.max(0, rawOffset ? parseInt(rawOffset, 10) : 0);

    // Validate
    if (rawLimit !== null && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(
        { error: "Invalid limit parameter" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (rawOffset !== null && (isNaN(offset) || offset < 0)) {
      return NextResponse.json(
        { error: "Invalid offset parameter" } satisfies ApiError,
        { status: 400 },
      );
    }

    const { runs, total } = await runRepo.getRunsByTenant(tenantId, {
      status,
      limit,
      offset,
    });

    const dto: PaginatedResponse<RunDTO> = {
      data: runs.map(toRunDTO),
      total,
      hasMore: offset + limit < total,
      limit,
      offset,
    };

    return NextResponse.json(dto);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/tenants/:tenantId/runs]", message);
    return NextResponse.json(
      { error: "Failed to list runs", detail: message } satisfies ApiError,
      { status: 500 },
    );
  }
}
