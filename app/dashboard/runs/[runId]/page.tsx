import type { Metadata } from "next";
import Link from "next/link";
import type { ExecutionRun } from "@/lib/execution-events/types";
import { truncate } from "@/lib/utils";
import { RunDetailClient } from "./run-detail-client";

interface PageProps {
  params: Promise<{ runId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { runId } = await params;
  return {
    title: `Run ${truncate(runId, 12)} \u2014 Execution Dashboard`,
    description: `Detailed view of execution run ${runId}.`,
  };
}

// ============================================================================
// Server-side data fetching
// ============================================================================

interface RunApiResponse {
  run: ExecutionRun;
}

async function fetchRun(runId: string): Promise<ExecutionRun | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs/${encodeURIComponent(runId)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    const data: RunApiResponse = await res.json();
    return data.run ?? null;
  } catch (err) {
    throw new Error(
      `Failed to load run: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Page — Server Component
// ============================================================================

export default async function RunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  const run = await fetchRun(runId);

  // ================================================================
  // Not found state
  // ================================================================

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center font-sans">
        <svg
          className="h-12 w-12 text-zinc-300 dark:text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Run Not Found
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            The execution run{" "}
            <code className="font-mono text-xs">{truncate(runId, 24)}</code>{" "}
            does not exist or has expired.
          </p>
        </div>
        <Link
          href="/dashboard/runs"
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Runs
        </Link>
      </div>
    );
  }

  // ================================================================
  // Render client component with initial data
  // ================================================================

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500 dark:text-zinc-400">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href="/dashboard/runs"
              className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Runs
            </Link>
          </li>
          <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</li>
          <li
            className="truncate font-mono text-zinc-700 dark:text-zinc-300"
            aria-current="page"
          >
            {truncate(run.runId, 20)}
          </li>
        </ol>
      </nav>

      <RunDetailClient initialRun={run} />
    </div>
  );
}
