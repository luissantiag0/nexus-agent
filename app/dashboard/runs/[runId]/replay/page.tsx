"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ExecutionRun } from "@/lib/execution-events/types";
import { cx, formatDuration, formatTimestamp, truncate } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { StatusBadgeStatus } from "@/components/dashboard/status-badge";
import { DAGViewer } from "@/components/dashboard/dag/DAGViewer";
import { EventLog } from "@/components/dashboard/event-log";
import { ContextInspector } from "@/components/dashboard/context-inspector";
import { buildDagDisplayData } from "@/components/dashboard/runs/dag-helpers";

// ============================================================================
// Speed options
// ============================================================================

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

// ============================================================================
// Component
// ============================================================================

export default function ReplayPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Replay state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Fetch run data ---
  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/runs/${encodeURIComponent(runId)}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRun(data.run ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load run");
        setIsLoading(false);
      });

    return () => ctrl.abort();
  }, [runId]);

  // --- All events sorted ---
  const allEvents = useMemo(() => {
    if (!run) return [];
    return [...run.events].sort((a, b) => a.timestamp - b.timestamp);
  }, [run]);

  // --- Build DAG data for the current visible event range ---
  const visibleEvents = useMemo(
    () => allEvents.slice(0, currentEventIndex + 1),
    [allEvents, currentEventIndex],
  );

  // Build a synthetic run snapshot at the current time index
  const synRun = useMemo(() => {
    if (!run) return null;
    return {
      ...run,
      events: visibleEvents,
    } as ExecutionRun;
  }, [run, visibleEvents]);

  const dagData = useMemo(
    () => (synRun ? buildDagDisplayData(synRun) : { nodes: [], edges: [] }),
    [synRun],
  );

  // --- Context snapshot version matching current event ---
  const contextVersion = useMemo(() => {
    if (!run) return 0;
    for (let i = visibleEvents.length - 1; i >= 0; i--) {
      const ev = visibleEvents[i];
      if (ev.data?.contextSnapshotVersion != null) {
        return ev.data.contextSnapshotVersion as number;
      }
    }
    return Math.min(
      currentEventIndex,
      Math.max(0, run.contextSnapshots.length - 1),
    );
  }, [visibleEvents, currentEventIndex, run]);

  // --- Playback timer ---
  useEffect(() => {
    if (!isPlaying || scrubbing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.max(100, Math.round(1000 / speed));
    timerRef.current = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= allEvents.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, speed, allEvents.length, scrubbing]);

  const isAtEnd = currentEventIndex >= allEvents.length - 1;

  const handlePlayPause = useCallback(() => {
    if (isAtEnd) {
      setCurrentEventIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((v) => !v);
    }
  }, [isAtEnd]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentEventIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentEventIndex((prev) => Math.min(allEvents.length - 1, prev + 1));
  }, [allEvents.length]);

  const handleTimelineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentEventIndex(Number(e.target.value));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentEventIndex(0);
  }, []);

  // ================================================================
  // Loading state
  // ================================================================

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400" role="status">
          <span className="sr-only">Loading run data\u2026</span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading run data for replay\u2026</p>
      </div>
    );
  }

  // ================================================================
  // Error state
  // ================================================================

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center font-sans">
        <svg className="h-12 w-12 text-red-300 dark:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Failed to Load Run
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error ?? "Run not found."}
          </p>
        </div>
        <Link
          href="/dashboard/runs"
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Back to Runs
        </Link>
      </div>
    );
  }

  // ================================================================
  // Replay UI
  // ================================================================

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/runs" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          Runs
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <Link
          href={`/dashboard/runs/${encodeURIComponent(runId)}`}
          className="font-mono hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          {truncate(runId, 16)}
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300" aria-current="page">Replay</span>
      </nav>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={handlePlayPause}
          className={cx(
            "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isPlaying
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
              : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
          )}
          aria-label={isPlaying ? "Pause replay" : isAtEnd ? "Restart replay" : "Play replay"}
        >
          {isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleStepBack}
          disabled={currentEventIndex <= 0}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Step backward"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleStepForward}
          disabled={isAtEnd}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Step forward"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
          <span className="mr-1 text-xs text-zinc-500 dark:text-zinc-400">Speed:</span>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSpeed(opt)}
              className={cx(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                speed === opt
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              )}
              aria-pressed={speed === opt}
            >
              {opt}x
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          Event {currentEventIndex + 1} of {allEvents.length}
        </span>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Reset replay to start"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Timeline slider */}
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
          {formatTimestamp(new Date(allEvents[0]?.timestamp ?? run.startedAt).toISOString())}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, allEvents.length - 1)}
          value={currentEventIndex}
          onChange={handleTimelineChange}
          onMouseDown={() => setScrubbing(true)}
          onMouseUp={() => setScrubbing(false)}
          className="flex-1 accent-blue-600 dark:accent-blue-400"
          aria-label="Replay timeline"
          aria-valuemin={0}
          aria-valuemax={allEvents.length - 1}
          aria-valuenow={currentEventIndex}
        />
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
          {formatTimestamp(new Date(allEvents[allEvents.length - 1]?.timestamp ?? allEvents[0]?.timestamp ?? run.startedAt).toISOString())}
        </span>
      </div>

      {/* THREE-PANEL LAYOUT */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LEFT PANEL — DAG */}
        <div className="flex w-[320px] shrink-0 flex-col gap-4">
          <DAGViewer
            nodes={dagData.nodes}
            edges={dagData.edges}
            width={320}
            height={320}
          />

          {/* Progress */}
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Progress</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full bg-zinc-200 h-2 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${allEvents.length > 0 ? ((currentEventIndex + 1) / allEvents.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {allEvents.length > 0
                  ? Math.round(((currentEventIndex + 1) / allEvents.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* CENTER PANEL — Event log */}
        <div className="flex min-w-0 flex-1 flex-col">
          <EventLog
            events={visibleEvents}
            autoScroll={isPlaying}
            className="max-h-[calc(100vh-14rem)]"
          />
        </div>

        {/* RIGHT PANEL — Context inspector */}
        <div className="flex w-[380px] shrink-0 flex-col">
          <ContextInspector
            snapshots={run.contextSnapshots}
            selectedVersion={contextVersion}
            className="max-h-[calc(100vh-14rem)]"
          />
        </div>
      </div>
    </div>
  );
}
