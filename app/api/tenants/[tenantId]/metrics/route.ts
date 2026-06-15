// ============================================================================
// GET /api/tenants/:tenantId/metrics
// ============================================================================
// Returns aggregated execution metrics for a tenant:
//   - Total, completed, failed, active runs
//   - Average execution duration
//   - Total events and nodes
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SupabaseClientFactory } from "@/lib/supabase/supabase-client";
import { RunRepository } from "@/lib/supabase/repositories/run.repository";
import { EventRepository } from "@/lib/supabase/repositories/event.repository";
import { RunNodeRepository } from "@/lib/supabase/repositories/run-node.repository";
import { requireTenantId } from "@/lib/supabase/tenant-utils";
import type { ApiError, MetricsDTO } from "@/lib/api/tenant-api-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const tenantId = requireTenantId(request.headers);
    const client = SupabaseClientFactory.getClient();
    const runRepo = new RunRepository(client);
    const eventRepo = new EventRepository(client);
    const nodeRepo = new RunNodeRepository(client);

    // Gather metrics
    const statusCounts = await Promise.all([
      runRepo.countByStatus(tenantId, "completed"),
      runRepo.countByStatus(tenantId, "failed"),
      runRepo.countByStatus(tenantId, "running"),
      runRepo.countByStatus(tenantId, "pending"),
      runRepo.countByStatus(tenantId, "cancelled"),
      runRepo.countByStatus(tenantId, "partial"),
    ]);

    const totalEvents = await eventRepo.countByTenant(tenantId);

    const [
      completedCount,
      failedCount,
      runningCount,
      pendingCount,
      cancelledCount,
      partialCount,
    ] = statusCounts;

    const totalRunsCount =
      completedCount + failedCount + runningCount + pendingCount + cancelledCount + partialCount;

    // Compute average duration from completed runs
    let avgDurationMs: number | null = null;
    if (completedCount > 0) {
      const { runs } = await runRepo.getRunsByTenant(tenantId, {
        status: "completed",
        limit: 1000,
      });
      const durations = runs
        .map((r) => r.duration_ms)
        .filter((d): d is number => d !== null);
      if (durations.length > 0) {
        avgDurationMs = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      }
    }

    const dto: MetricsDTO = {
      totalRuns: totalRunsCount,
      completedRuns: completedCount,
      failedRuns: failedCount,
      activeRuns: runningCount + pendingCount,
      avgDurationMs,
      totalEvents,
      totalNodes: 0, // Computed per-request when needed
    };

    return NextResponse.json(dto);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/tenants/:tenantId/metrics]", message);
    return NextResponse.json(
      { error: "Failed to get metrics", detail: message } satisfies ApiError,
      { status: 500 },
    );
  }
}
