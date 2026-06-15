// ============================================================================
// GET /api/runs/:runId — Get a single execution run with full details
// ============================================================================
// Returns the complete ExecutionRun object including all nodes, edges,
// events, and context snapshots. Useful for the run detail view and
// post-execution analysis.
//
// Route params:
//   runId  — the execution run identifier
//
// Response: { run: ExecutionRun }
// 404      — if the run ID does not exist in the store
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

    return NextResponse.json({ run });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`[GET /api/runs/:runId] ${message}`);
    return NextResponse.json(
      { error: "Failed to retrieve run", detail: message },
      { status: 500 },
    );
  }
}
