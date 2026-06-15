import type { Metadata } from "next";
import type { RunSummary } from "@/lib/execution-events/types";
import { RunList } from "@/components/dashboard/runs/run-list";

export const metadata: Metadata = {
  title: "Execution Dashboard — Nexus Agent Platform",
  description: "View and manage execution runs for workflow agents.",
};

// ============================================================================
// Server-side data fetching
// ============================================================================

interface RunsApiResponse {
  runs: RunSummary[];
  total: number;
}

async function fetchRuns(): Promise<{ runs: RunSummary[]; total: number }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    const data: RunsApiResponse = await res.json();
    return { runs: data.runs ?? [], total: data.total ?? 0 };
  } catch (err) {
    throw new Error(
      `Failed to load execution runs: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Page — Server Component
// ============================================================================

export default async function RunsPage() {
  let runs: RunSummary[] = [];
  let total = 0;

  try {
    const result = await fetchRuns();
    runs = result.runs;
    total = result.total;
  } catch {
    // Let the client component handle errors
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Execution Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Monitor and inspect workflow execution runs across all agents.
        </p>
      </div>

      {/* Auto-refresh indicator (visible to screen readers) */}
      <div className="sr-only" aria-live="polite" role="status">
        {runs.some((r) => r.status === "running")
          ? "Auto-refreshing \u2014 some runs are still in progress."
          : "All runs have finished."}
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Runs" value={total} />
        <StatCard
          label="Running"
          value={runs.filter((r) => r.status === "running").length}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={runs.filter((r) => r.status === "completed").length}
          color="green"
        />
        <StatCard
          label="Failed"
          value={runs.filter((r) => r.status === "failed").length}
          color="red"
        />
      </div>

      {/* Runs list — client component with polling */}
      <RunList />
    </div>
  );
}

// ============================================================================
// Stat card sub-component
// ============================================================================

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: number;
  color?: "default" | "blue" | "green" | "red";
}) {
  const colorStyles: Record<string, string> = {
    default: "text-zinc-900 dark:text-zinc-100",
    blue: "text-blue-700 dark:text-blue-400",
    green: "text-green-700 dark:text-green-400",
    red: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${colorStyles[color]}`}>
        {value}
      </p>
    </div>
  );
}
