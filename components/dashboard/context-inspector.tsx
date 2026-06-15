"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import type { ContextSnapshot } from "@/lib/execution-events/types";
import { cx, formatTimestamp } from "@/lib/utils";

// ============================================================================
// Props
// ============================================================================

export interface ContextInspectorProps {
  /** All context snapshots for the run, ordered by version */
  snapshots: ContextSnapshot[];
  /** Currently selected version index (0-based) */
  selectedVersion?: number;
  /** Callback when the selected snapshot version changes */
  onVersionChange?: (version: number) => void;
  /** Optional className for the container */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Resolve the full context state at a given snapshot version by merging
 *  all snapshots up to and including that version. */
function resolveContextState(
  snapshots: ContextSnapshot[],
  upToVersion: number,
): Map<string, { value: unknown; sourceAgent: string }> {
  const state = new Map<string, { value: unknown; sourceAgent: string }>();
  for (let i = 0; i <= upToVersion && i < snapshots.length; i++) {
    const snap = snapshots[i];
    for (const [key, value] of Object.entries(snap.writes)) {
      state.set(key, { value, sourceAgent: snap.agentId });
    }
  }
  return state;
}

/** Compute diffs between two versions of the context state. */
function computeDiffBetween(
  prevState: Map<string, { value: unknown; sourceAgent: string }>,
  currState: Map<string, { value: unknown; sourceAgent: string }>,
): Array<{ key: string; changeType: "added" | "modified" | "removed" }> {
  const diffs: Array<{ key: string; changeType: "added" | "modified" | "removed" }> = [];

  for (const [key] of currState) {
    if (!prevState.has(key)) {
      diffs.push({ key, changeType: "added" });
    }
  }

  for (const [key, prev] of prevState) {
    if (!currState.has(key)) {
      diffs.push({ key, changeType: "removed" });
    } else {
      const curr = currState.get(key)!;
      if (JSON.stringify(prev.value) !== JSON.stringify(curr.value)) {
        diffs.push({ key, changeType: "modified" });
      }
    }
  }

  return diffs;
}

/** Collect all unique agent namespaces from snapshots up to a version. */
function collectAgents(snapshots: ContextSnapshot[], upToVersion: number): string[] {
  const agents = new Set<string>();
  for (let i = 0; i <= upToVersion && i < snapshots.length; i++) {
    agents.add(snapshots[i].agentId);
  }
  return [...agents].sort();
}

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isExpandable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

function shouldTruncate(value: unknown, maxLen = 120): boolean {
  return formatValue(value).length > maxLen;
}

function formatMsTime(ts: number): string {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

// ============================================================================
// Sub-components
// ============================================================================

function JsonViewer({ data }: { data: unknown }) {
  const formatted = useMemo(() => formatValue(data), [data]);
  const [expanded, setExpanded] = useState(false);
  const truncated = shouldTruncate(data);

  if (!isExpandable(data)) {
    return (
      <code className="whitespace-pre-wrap break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {formatted}
      </code>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        aria-expanded={expanded}
      >
        {expanded ? "Collapse" : "Expand"}
      </button>
      {expanded || !truncated ? (
        <pre className="overflow-x-auto rounded bg-zinc-100 p-2 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <code>{formatted}</code>
        </pre>
      ) : (
        <code className="block truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
          {formatted.slice(0, 120)}\u2026
        </code>
      )}
    </div>
  );
}

function DiffBadge({ type }: { type: "added" | "modified" | "removed" }) {
  const styles = {
    added: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    modified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
    removed: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  };

  return (
    <span
      className={cx(
        "inline-block rounded px-1 py-0.5 text-[10px] font-semibold uppercase leading-none",
        styles[type],
      )}
    >
      {type}
    </span>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ContextInspector({
  snapshots,
  selectedVersion: externalVersion,
  onVersionChange,
  className,
}: ContextInspectorProps) {
  const [internalVersion, setInternalVersion] = useState(0);

  const effectiveVersion = externalVersion ?? internalVersion;
  const clampedVersion = Math.min(effectiveVersion, Math.max(0, snapshots.length - 1));
  const maxVersion = Math.max(0, snapshots.length - 1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [prevVersion, setPrevVersion] = useState<number>(-1);

  const agents = useMemo(() => collectAgents(snapshots, clampedVersion), [snapshots, clampedVersion]);

  const prevState = useMemo(
    () => (prevVersion >= 0 ? resolveContextState(snapshots, prevVersion) : new Map()),
    [snapshots, prevVersion],
  );
  const currState = useMemo(
    () => resolveContextState(snapshots, clampedVersion),
    [snapshots, clampedVersion],
  );

  const diffs = useMemo(
    () => (prevVersion >= 0 ? computeDiffBetween(prevState, currState) : []),
    [prevState, currState, prevVersion],
  );

  const handleVersionChange = useCallback(
    (version: number) => {
      setPrevVersion(clampedVersion);
      setInternalVersion(version);
      onVersionChange?.(version);
    },
    [clampedVersion, onVersionChange],
  );

  // --- Derive display entries ---
  const displayEntries = useMemo(() => {
    let entries: Array<{
      key: string;
      value: unknown;
      sourceAgent: string;
      changeType?: "added" | "modified" | "removed";
    }> = [];

    for (const [key, { value, sourceAgent }] of currState) {
      const diff = diffs.find((d) => d.key === key);
      entries.push({ key, value, sourceAgent, changeType: diff?.changeType });
    }

    if (selectedAgent) {
      entries = entries.filter((e) => e.sourceAgent === selectedAgent);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter((e) => e.key.toLowerCase().includes(q));
    }

    entries.sort((a, b) => {
      const aChanged = a.changeType ? 0 : 1;
      const bChanged = b.changeType ? 0 : 1;
      if (aChanged !== bChanged) return aChanged - bChanged;
      return a.key.localeCompare(b.key);
    });

    return entries;
  }, [currState, diffs, selectedAgent, searchQuery]);

  // --- Empty state ---
  if (snapshots.length === 0) {
    return (
      <div
        className={cx(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-200 p-8 text-center dark:border-zinc-800",
          className,
        )}
      >
        <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No context snapshots available.</p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Context Store
        </h3>
      </div>

      {/* Version slider */}
      <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            Snapshot v{clampedVersion}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {snapshots[clampedVersion]?.agentId
              ? `by ${snapshots[clampedVersion].agentId}`
              : ""}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxVersion}
          value={clampedVersion}
          onChange={(e) => handleVersionChange(Number(e.target.value))}
          className="w-full accent-blue-600 dark:accent-blue-400"
          aria-label={`Snapshot version ${clampedVersion} of ${maxVersion}`}
          aria-valuemin={0}
          aria-valuemax={maxVersion}
          aria-valuenow={clampedVersion}
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>v0</span>
          <span>v{maxVersion}</span>
        </div>
        <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {formatMsTime(snapshots[clampedVersion]?.timestamp ?? 0)}
        </div>
      </div>

      {/* Agent tabs + search */}
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {/* Search */}
        <div className="relative mb-2">
          <label htmlFor="ctx-search" className="sr-only">Search context keys</label>
          <input
            id="ctx-search"
            type="search"
            placeholder="Search keys\u2026"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>

        {/* Agent namespace tabs */}
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by agent namespace">
          <button
            type="button"
            role="tab"
            aria-selected={selectedAgent === null}
            onClick={() => setSelectedAgent(null)}
            className={cx(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
              selectedAgent === null
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                : "border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            All
          </button>
          {agents.map((agent) => (
            <button
              key={agent}
              type="button"
              role="tab"
              aria-selected={selectedAgent === agent}
              onClick={() => setSelectedAgent(agent === selectedAgent ? null : agent)}
              className={cx(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                selectedAgent === agent
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              )}
            >
              {agent}
            </button>
          ))}
        </div>

        {/* Diff info */}
        {diffs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Added: {diffs.filter((d) => d.changeType === "added").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              Modified: {diffs.filter((d) => d.changeType === "modified").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Removed: {diffs.filter((d) => d.changeType === "removed").length}
            </span>
          </div>
        )}
      </div>

      {/* Context entries */}
      <div className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/50">
        {displayEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {searchQuery || selectedAgent
                ? "No matching context keys."
                : "No context entries."}
            </p>
          </div>
        )}

        {displayEntries.map((entry) => (
          <div
            key={entry.key}
            className={cx(
              "px-3 py-2 transition-colors",
              entry.changeType === "added" && "bg-green-50/40 dark:bg-green-950/10",
              entry.changeType === "modified" && "bg-yellow-50/40 dark:bg-yellow-950/10",
              entry.changeType === "removed" && "bg-red-50/40 dark:bg-red-950/10",
            )}
          >
            {/* Key row */}
            <div className="mb-0.5 flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {entry.key}
              </code>
              {entry.changeType && <DiffBadge type={entry.changeType} />}
              <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                {entry.sourceAgent}
              </span>
            </div>

            {/* Value */}
            <div className="pl-0">
              <JsonViewer data={entry.value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
