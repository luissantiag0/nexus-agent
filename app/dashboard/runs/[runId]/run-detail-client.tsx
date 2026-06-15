"use client";

import type { ExecutionRun } from "@/lib/execution-events/event-types";
import { RunDetail } from "@/components/dashboard/runs/run-detail";

/**
 * RunDetailClient — Client Component wrapper for the run detail view.
 *
 * This file exists as the client boundary for the hybrid server/client page.
 * The parent `page.tsx` (Server Component) fetches initial data and passes it
 * here. This component handles live SSE updates, interactivity, and
 * three-panel state management via the <RunDetail> component.
 *
 * Separating the client entry point from the server page allows Next.js to
 * properly tree-shake client-side JavaScript from the server payload.
 */
export function RunDetailClient({ initialRun }: { initialRun: ExecutionRun }) {
  return <RunDetail initialRun={initialRun} />;
}
