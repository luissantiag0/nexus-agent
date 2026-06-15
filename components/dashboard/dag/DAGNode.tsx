"use client";

import React, { useCallback } from "react";
import type { ExecutionRunNode } from "@/lib/execution-events/event-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DAGNodeProps {
  /** The execution run node data */
  node: ExecutionRunNode;
  /** Whether this node is currently selected/active */
  isActive: boolean;
  /** Callback when the node is clicked */
  onClick?: (nodeId: string) => void;
  /** Inline style for positioning (set by the layout engine) */
  style?: React.CSSProperties;
  /** Callback when mouse enters the node area */
  onMouseEnter?: (nodeId: string, event: React.MouseEvent) => void;
  /** Callback when mouse leaves the node area */
  onMouseLeave?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: {
    border: "border-zinc-300 dark:border-zinc-600",
    bg: "bg-white dark:bg-zinc-800",
    dot: "bg-zinc-400 dark:bg-zinc-500",
    label: "Pending",
    pulse: false,
  },
  running: {
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    dot: "bg-blue-500",
    label: "Running",
    pulse: true,
  },
  completed: {
    border: "border-emerald-400 dark:border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    label: "Completed",
    pulse: false,
  },
  succeeded: {
    border: "border-emerald-400 dark:border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    label: "Completed",
    pulse: false,
  },
  failed: {
    border: "border-red-400 dark:border-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    dot: "bg-red-500",
    label: "Failed",
    pulse: false,
  },
  skipped: {
    border: "border-dashed border-zinc-400 dark:border-zinc-500",
    bg: "bg-zinc-50 dark:bg-zinc-800/60",
    dot: "bg-zinc-400 dark:bg-zinc-500",
    label: "Skipped",
    pulse: false,
  },
  timed_out: {
    border: "border-amber-400 dark:border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    dot: "bg-amber-500",
    label: "Timed Out",
    pulse: false,
  },
} as const;

const NODE_TYPE_ICONS: Record<string, string> = {
  agent_node: "A",
  conditional_router: "?",
  parallel_fork: "F",
  synchronizer: "J",
  start: ">",
  end: "■",
  subworkflow: "S",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DAGNode({
  node,
  isActive,
  onClick,
  style,
  onMouseEnter,
  onMouseLeave,
}: DAGNodeProps) {
  const config = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending;

  const handleClick = useCallback(() => {
    onClick?.(node.nodeId);
  }, [node.nodeId, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(node.nodeId);
      }
    },
    [node.nodeId, onClick]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      onMouseEnter?.(node.nodeId, e);
    },
    [node.nodeId, onMouseEnter]
  );

  const agentInitial = node.agentId
    ? node.agentId.charAt(0).toUpperCase()
    : "?";

  const durationText =
    node.duration != null
      ? formatDuration(node.duration)
      : node.startedAt != null && node.completedAt != null
        ? formatDuration(node.completedAt - node.startedAt)
        : null;

  const hasRetried = (node.retryCount ?? 0) > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${node.label} — ${node.agentId} — Status: ${config.label}${node.error ? ` — Error: ${node.error}` : ""}`}
      aria-pressed={isActive}
      className={[
        "group relative flex flex-col rounded-xl border-2 px-4 py-3",
        "font-sans select-none cursor-pointer",
        "transition-all duration-200 ease-in-out",
        "min-h-[5.5rem] w-[13.75rem]",
        "shadow-sm hover:shadow-md",
        config.border,
        config.bg,
        isActive ? "ring-2 ring-violet-500/50 dark:ring-violet-400/60 shadow-lg" : "",
        config.pulse ? "animate-dag-pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Agent icon circle */}
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "text-xs font-semibold leading-none",
            "text-white",
            node.status === "failed" || node.status === "timed_out"
              ? "bg-red-500"
              : node.status === "running"
                ? "bg-blue-500"
                : node.status === "completed" || node.status === "succeeded"
                  ? "bg-emerald-500"
                  : node.status === "skipped"
                    ? "bg-zinc-400 dark:bg-zinc-500"
                    : "bg-zinc-400 dark:bg-zinc-500",
          ].join(" ")}
          aria-hidden="true"
        >
          {NODE_TYPE_ICONS[node.type] ?? agentInitial}
        </span>

        {/* Agent name + label */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {node.label}
          </span>
          <span className="truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            {node.agentId}
          </span>
        </div>
      </div>

      {/* Bottom row: status badge + metadata */}
      <div className="mt-auto flex items-center gap-2 pt-2">
        {/* Status dot */}
        <span className="flex items-center gap-1.5">
          <span
            className={[
              "inline-block h-2 w-2 rounded-full",
              config.dot,
              config.pulse ? "animate-pulse" : "",
            ].join(" ")}
            aria-hidden="true"
          />
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {config.label}
          </span>
        </span>

        {/* Duration badge */}
        {durationText != null && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {durationText}
          </span>
        )}

        {/* Retry indicator */}
        {hasRetried && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            title={`Retried ${node.retryCount} time${node.retryCount! > 1 ? "s" : ""}`}
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {node.retryCount}
          </span>
        )}
      </div>

      {/* Error indicator */}
      {node.error && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}

      {/* Dependencies count badge (debug info, shown on hover) */}
      {node.dependencies.length > 0 && !isActive && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[8px] font-medium text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-700 dark:text-zinc-400">
          {node.dependencies.length}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

// Default export for dynamic imports
export default DAGNode;
