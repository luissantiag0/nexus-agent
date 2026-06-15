// ============================================================================
// GET /api/runs — List execution runs
// ============================================================================
// Returns a paginated, filterable list of execution run summaries. The
// response excludes the full events and context snapshots arrays to keep
// list payloads small.
//
// Query parameters:
//   status  — filter by run status (e.g. "running", "completed", "failed")
//   limit   — max items per page (default: 50, max: 200)
//   offset  — pagination offset (default: 0)
//
// Response: { runs: RunSummary[], total: number }
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";

export const dynamic = "force-dynamic";

/**
 * Validated max limit to prevent abuse.
 */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

/**
 * Valid status values for filtering.
 */
const VALID_STATUSES = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // --- Parse and validate status filter ---
    const rawStatus = searchParams.get("status");
    const status =
      rawStatus && VALID_STATUSES.has(rawStatus) ? rawStatus : undefined;

    // --- Parse and validate pagination ---
    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");

    const limit = Math.min(
      Math.max(1, rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, rawOffset ? parseInt(rawOffset, 10) : 0);

    // Validate parsed numbers
    if (rawLimit !== null && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(
        { error: "Invalid 'limit' parameter. Must be a positive integer." },
        { status: 400 },
      );
    }
    if (rawOffset !== null && (isNaN(offset) || offset < 0)) {
      return NextResponse.json(
        { error: "Invalid 'offset' parameter. Must be a non-negative integer." },
        { status: 400 },
      );
    }

    // --- Query store ---
    const result = executionStore.listRuns({ status, limit, offset });

    return NextResponse.json({
      runs: result.runs,
      total: result.total,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/runs]", message);
    return NextResponse.json(
      { error: "Failed to list runs", detail: message },
      { status: 500 },
    );
  }
}
