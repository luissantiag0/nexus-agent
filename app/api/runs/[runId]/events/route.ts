// ============================================================================
// GET /api/runs/:runId/events — Get events for a run
// ============================================================================
// Returns a filtered, paginated array of execution events for a specific
// run. Events are returned in chronological order (insertion order).
//
// Query parameters:
//   type    — filter by ExecutionEventType (e.g. "NODE_STARTED")
//   nodeId  — filter by the emitting node's ID
//   limit   — max items per page (default: 50, max: 500)
//   offset  — pagination offset (default: 0)
//
// Response: { events: ExecutionEvent[], total: number, hasMore: boolean }
// 404      — if the run ID does not exist
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";
import { ExecutionEventType } from "@/lib/execution-events/types";

export const dynamic = "force-dynamic";

/**
 * Max events per page to prevent excessive payload sizes.
 */
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

/**
 * Build a set of valid ExecutionEventType values for query validation.
 */
function getValidEventTypes(): Set<string> {
  return new Set(Object.values(ExecutionEventType));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    if (!runId || runId.trim().length === 0) {
      return NextResponse.json(
        { error: "runId is required" },
        { status: 400 },
      );
    }

    // Verify the run exists before querying events
    const run = executionStore.getRun(runId);
    if (!run) {
      return NextResponse.json(
        {
          error: "Run not found",
          code: "RUN_NOT_FOUND",
          detail: `No execution run exists with ID "${runId}".`,
        },
        { status: 404 },
      );
    }

    const searchParams = _request.nextUrl.searchParams;
    const validTypes = getValidEventTypes();

    // --- Parse and validate type filter ---
    const rawType = searchParams.get("type");
    const type =
      rawType && validTypes.has(rawType)
        ? (rawType as ExecutionEventType)
        : undefined;

    // --- Parse and validate nodeId filter ---
    const nodeId = searchParams.get("nodeId") || undefined;

    // --- Parse and validate pagination ---
    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");

    const limit = Math.min(
      Math.max(1, rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, rawOffset ? parseInt(rawOffset, 10) : 0);

    if (rawLimit !== null && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(
        { error: "Invalid 'limit' parameter. Must be a positive integer." },
        { status: 400 },
      );
    }
    if (rawOffset !== null && (isNaN(offset) || offset < 0)) {
      return NextResponse.json(
        {
          error: "Invalid 'offset' parameter. Must be a non-negative integer.",
        },
        { status: 400 },
      );
    }

    // --- Query store ---
    const result = executionStore.getEvents(runId, {
      type,
      nodeId,
      limit,
      offset,
    });

    return NextResponse.json({
      events: result.events,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`[GET /api/runs/:runId/events] ${message}`);
    return NextResponse.json(
      { error: "Failed to retrieve events", detail: message },
      { status: 500 },
    );
  }
}
