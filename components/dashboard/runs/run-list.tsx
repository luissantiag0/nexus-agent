"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RunSummary } from "@/lib/execution-events/types";
import { cx, formatDuration, formatTimestamp, truncate } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { StatusBadgeStatus } from "@/components/dashboard/status-badge";

// ============================================================================
// Types
// ============================================================================

interface RunListResponse {
  runs: RunSummary[];
  total: number;
}

// ============================================================================
// Component
// ============================================================================

export function RunList() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // --- Fetch runs ---
  const fetchRuns = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const url = statusFilter === "all"
        ? "/api/runs"
        : `/api/runs?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: RunListResponse = await res.json();
      if (mountedRef.current) {
        setRuns(data.runs ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [statusFilter]);

  // --- Initial fetch ---
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    const ctrl = new AbortController();
    fetchRuns(ctrl.signal);
    return () => {
      mountedRef.current = false;
      ctrl.abort();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRuns]);

  // --- Poll while any run is running ---
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");

    if (hasRunning && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        const ctrl = new AbortController();
        fetchRuns(ctrl.signal);
      }, 5000);
    }

    if (!hasRunning && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [runs, fetchRuns]);

  const handleRowClick = useCallback(
    (runId: string) => {
      router.push(`/dashboard/runs/${encodeURIComponent(runId)}`);
    },
    [router],
  );

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    const ctrl = new AbortController();
    fetchRuns(ctrl.signal);
  }, [fetchRuns]);

  // ================================================================
  // Loading state
  // ================================================================

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading runs" role="status">
        <div className="sr-only">Loading execution runs\u2026</div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="ml-auto h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    );
  }

  // ================================================================
  // Error state
  // ================================================================

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Failed to load runs</h3>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  // ================================================================
  // Empty state
  // ================================================================

  if (runs.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
        <svg className="h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No execution runs</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            When workflows are executed, their runs will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ================================================================
  // Table layout
  // ================================================================

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          aria-label="Filter by status"
        >
          <option value="all">All runs</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
          {runs.length} of {total} runs
        </span>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              {["Run ID", "Workflow", "Status", "Duration", "Nodes", "Started"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800/50 dark:bg-zinc-900/30">
            {runs.map((run) => (
              <tr
                key={run.runId}
                onClick={() => handleRowClick(run.runId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRowClick(run.runId);
                }}
                className="cursor-pointer transition-colors hover:bg-zinc-50 focus:bg-blue-50 focus:outline-none dark:hover:bg-zinc-800/30 dark:focus:bg-blue-950/20"
                tabIndex={0}
                role="button"
                aria-label={`View run ${truncate(run.runId, 12)}`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {truncate(run.runId, 12)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {run.workflowName ?? run.workflowId}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={run.status as StatusBadgeStatus} size="sm" />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatDuration(run.durationMs)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                  {run.nodeCount}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
                  {formatTimestamp(new Date(run.startedAt).toISOString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
