// ============================================================================
// GET /api/runs/:runId/context — Get context snapshots for a run
// ============================================================================
// Returns the context snapshot history for an execution run. Each snapshot
// captures the writes performed by an agent at a specific version, along
// with an optional diff against the previous version.
//
// Query parameters:
//   version — filter to a specific snapshot version (optional); if omitted,
//             returns all snapshots for the run
//
// Response: { snapshots: ContextSnapshot[], currentVersion: number }
// 404      — if the run ID does not exist
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionStore } from "@/lib/execution-events/store";

export const dynamic = "force-dynamic";

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

    // Verify the run exists before querying snapshots
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

    // --- Parse optional version filter ---
    const searchParams = _request.nextUrl.searchParams;
    const rawVersion = searchParams.get("version");
    const version =
      rawVersion !== null ? parseInt(rawVersion, 10) : undefined;

    if (rawVersion !== null && (isNaN(version!) || version! < 1)) {
      return NextResponse.json(
        {
          error:
            "Invalid 'version' parameter. Must be a positive integer.",
        },
        { status: 400 },
      );
    }

    // --- Query store ---
    const result = executionStore.getSnapshots(runId, version);

    return NextResponse.json({
      snapshots: result.snapshots,
      currentVersion: result.currentVersion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`[GET /api/runs/:runId/context] ${message}`);
    return NextResponse.json(
      { error: "Failed to retrieve context snapshots", detail: message },
      { status: 500 },
    );
  }
}
