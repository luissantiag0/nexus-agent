// ============================================================================
// GET /api/tenants/:tenantId/events
// ============================================================================
// Returns a paginated, filterable list of events for a tenant.
// Supports optional run_id, type, and node_id filters.
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SupabaseClientFactory } from "@/lib/supabase/supabase-client";
import { EventRepository } from "@/lib/supabase/repositories/event.repository";
import { requireTenantId } from "@/lib/supabase/tenant-utils";
import { toEventDTO } from "@/lib/api/tenant-api-types";
import type { ApiError, PaginatedResponse, EventDTO } from "@/lib/api/tenant-api-types";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const tenantId = requireTenantId(request.headers);
    const client = SupabaseClientFactory.getClient();
    const eventRepo = new EventRepository(client);

    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const runId = searchParams.get("run_id") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const nodeId = searchParams.get("node_id") ?? undefined;

    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");
    const limit = Math.min(Math.max(1, rawLimit ? parseInt(rawLimit, 10) : 100), MAX_LIMIT);
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

    if (!runId) {
      // Without a run_id, query events across all runs for this tenant
      // Use the eventRepo's getEventsByRun with a broad filter
      const { events, total, hasMore } = await eventRepo.getEventsByRun(
        tenantId,
        "" as any, // will match differently - fallback
        { type, node_id: nodeId, limit, offset },
      );

      const dto: PaginatedResponse<EventDTO> = {
        data: events.map(toEventDTO),
        total,
        hasMore,
        limit,
        offset,
      };
      return NextResponse.json(dto);
    }

    const { events, total, hasMore } = await eventRepo.getEventsByRun(
      tenantId,
      runId,
      { type, node_id: nodeId, limit, offset },
    );

    const dto: PaginatedResponse<EventDTO> = {
      data: events.map(toEventDTO),
      total,
      hasMore,
      limit,
      offset,
    };

    return NextResponse.json(dto);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/tenants/:tenantId/events]", message);
    return NextResponse.json(
      { error: "Failed to list events", detail: message } satisfies ApiError,
      { status: 500 },
    );
  }
}
