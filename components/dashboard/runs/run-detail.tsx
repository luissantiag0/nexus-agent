"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { ExecutionRun, ExecutionEvent } from "@/lib/execution-events/types";
import { cx, formatDuration, formatTimestamp, truncate } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { StatusBadgeStatus } from "@/components/dashboard/status-badge";
import { DAGViewer } from "@/components/dashboard/dag/DAGViewer";
import { EventLog } from "@/components/dashboard/event-log";
import { ContextInspector } from "@/components/dashboard/context-inspector";
import {
  buildDagDisplayData,
  computeRunSummary,
} from "@/components/dashboard/runs/dag-helpers";

// ============================================================================
// Types
// ============================================================================

export interface RunDetailProps {
  /** The initial run data fetched from the server */
  initialRun: ExecutionRun;
}

// ============================================================================
// SSE Connection Hook
// ============================================================================

function useSSE(runId: string) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [reconnectCount, setReconnectCount] = useState(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState("connecting");

    try {
      const es = new EventSource(`/api/runs/${encodeURIComponent(runId)}/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (mountedRef.current) {
          setConnectionState("connected");
          setReconnectCount(0);
        }
      };

      es.onmessage = (msg) => {
        if (!mountedRef.current) return;
        try {
          const event: ExecutionEvent = JSON.parse(msg.data);
          if (event && event.id) {
            setEvents((prev) => [...prev, event]);
          }
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        es.close();
        setConnectionState("error");
        setReconnectCount((c) => c + 1);

        const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch {
      setConnectionState("error");
    }
  }, [runId, reconnectCount]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return { events, connectionState, reconnectCount };
}

// ============================================================================
// Component
// ============================================================================

export function RunDetail({ initialRun }: RunDetailProps) {
  const { events: liveEvents, connectionState, reconnectCount } = useSSE(initialRun.runId);

  // --- Merge initial events + live events ---
  const allEvents = useMemo(() => {
    const seen = new Set<string>();
    const merged: ExecutionEvent[] = [];

    for (const ev of [...initialRun.events, ...liveEvents]) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        merged.push(ev);
      }
    }

    merged.sort((a, b) => a.timestamp - b.timestamp);
    return merged;
  }, [initialRun.events, liveEvents]);

  // --- Build a merged run object that updates with live events ---
  const liveRun: ExecutionRun = useMemo(
    () => ({
      ...initialRun,
      events: allEvents,
    }),
    [initialRun, allEvents],
  );

  // --- DAG display data ---
  const dagData = useMemo(() => buildDagDisplayData(liveRun), [liveRun]);

  // --- Run summary ---
  const summary = useMemo(() => computeRunSummary(liveRun), [liveRun]);

  // --- Determine run status ---
  const runStatus = useMemo(() => {
    if (liveRun.status === "failed") return "failed" as const;
    if (liveRun.status === "completed") return "completed" as const;
    if (liveRun.status === "running") return "running" as const;
    if (allEvents.some((e) => e.type === "EXECUTION_FAILED")) return "failed" as const;
    if (allEvents.some((e) => e.type === "EXECUTION_COMPLETED")) return "completed" as const;
    if (allEvents.some((e) => e.type === "NODE_STARTED")) return "running" as const;
    return (liveRun.status ?? "pending") as StatusBadgeStatus;
  }, [liveRun.status, allEvents]);

  // --- Duration ---
  const totalDurationMs = useMemo(() => {
    if (liveRun.durationMs != null) return liveRun.durationMs;
    if (allEvents.length < 2) return null;
    return allEvents[allEvents.length - 1].timestamp - allEvents[0].timestamp;
  }, [liveRun.durationMs, allEvents]);

  // --- Three-panel state ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [contextVersion, setContextVersion] = useState(
    initialRun.contextSnapshots.length > 0 ? initialRun.contextSnapshots.length - 1 : 0,
  );

  // --- Pause / resume ---
  const displayEvents = useMemo(
    () => (paused ? allEvents : allEvents),
    [allEvents, paused],
  );

  // --- Event click -> highlight node ---
  const handleEventClick = useCallback((event: ExecutionEvent) => {
    if (event.nodeId) {
      setSelectedNodeId(event.nodeId);
    } else if (event.agentId) {
      // Find a node with matching agent ID
      const node = dagData.nodes.find((n) => n.agentId === event.agentId);
      if (node) setSelectedNodeId(node.nodeId);
    }
  }, [dagData.nodes]);

  // --- Export ---
  const handleExport = useCallback(() => {
    const data = JSON.stringify({ run: initialRun, liveEvents }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run-${truncate(initialRun.runId, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [initialRun, liveEvents]);

  // ================================================================
  // Render
  // ================================================================

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Connection lost banner */}
      {connectionState === "error" && (
        <div
          className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
          role="alert"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>
            Connection lost. Reconnecting{reconnectCount > 0 ? ` (attempt ${reconnectCount})` : ""}\u2026
          </span>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <StatusBadge status={runStatus as StatusBadgeStatus} size="lg" pulse />

        <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(totalDurationMs)}
          </span>

          <span className="text-zinc-300 dark:text-zinc-700">|</span>

          <span className="text-green-600 dark:text-green-400">
            {summary.completedNodes} completed
          </span>
          <span className={cx(summary.failedNodes > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-500")}>
            {summary.failedNodes} failed
          </span>
          <span className="text-zinc-500 dark:text-zinc-500">
            {summary.skippedNodes} skipped
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              paused
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
            aria-label={paused ? "Resume live updates" : "Pause live updates"}
          >
            {paused ? "\u25B6 Resume" : "\u23F8 Pause"}
          </button>

          <Link
            href={`/dashboard/runs/${encodeURIComponent(initialRun.runId)}/replay`}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Replay
          </Link>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Export run as JSON"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* THREE-PANEL LAYOUT */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LEFT PANEL — DAG + Node list */}
        <div className="flex w-[320px] shrink-0 flex-col gap-4">
          {/* DAG Viewer */}
          <DAGViewer
            nodes={dagData.nodes}
            edges={dagData.edges}
            selectedNodeId={selectedNodeId}
            onNodeClick={setSelectedNodeId}
            width={320}
            height={280}
          />

          {/* Node list sidebar */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nodes</h3>
            </div>
            <div className="max-h-[320px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/50">
              {dagData.nodes.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No nodes in this run.
                </div>
              )}
              {dagData.nodes.map((node) => {
                const isSelected = node.nodeId === selectedNodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => setSelectedNodeId(node.nodeId)}
                    className={cx(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30",
                      isSelected && "bg-blue-50 dark:bg-blue-950/20",
                    )}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    <StatusBadge status={node.status as StatusBadgeStatus} size="sm" showLabel={false} />
                    <span className={cx(
                      "flex-1 truncate font-medium",
                      isSelected ? "text-blue-700 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300",
                    )}>
                      {node.label}
                    </span>
                    <code className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                      {node.agentId}
                    </code>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER PANEL — Event log */}
        <div className="flex min-w-0 flex-1 flex-col">
          <EventLog
            events={displayEvents}
            autoScroll={!paused}
            onEventClick={handleEventClick}
            className="max-h-[calc(100vh-13rem)]"
          />
        </div>

        {/* RIGHT PANEL — Context inspector */}
        <div className="flex w-[380px] shrink-0 flex-col">
          <ContextInspector
            snapshots={initialRun.contextSnapshots}
            selectedVersion={contextVersion}
            onVersionChange={setContextVersion}
            className="max-h-[calc(100vh-13rem)]"
          />
        </div>
      </div>
    </div>
  );
}
