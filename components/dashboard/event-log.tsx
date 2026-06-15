"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ExecutionEventType } from "@/lib/execution-events/types";
import type { ExecutionEvent } from "@/lib/execution-events/types";
import { cx, formatTimestamp } from "@/lib/utils";

// ============================================================================
// Event type icon map
// ============================================================================

const EVENT_ICONS: Record<string, string> = {
  [ExecutionEventType.RUN_INITIALIZED]: "\uD83D\uDCCB",         // 📋
  [ExecutionEventType.NODE_STARTED]: "\u26A1",                  // ⚡
  [ExecutionEventType.NODE_COMPLETED]: "\u2705",                // ✅
  [ExecutionEventType.NODE_FAILED]: "\u274C",                   // ❌
  [ExecutionEventType.NODE_SKIPPED]: "\u23ED",                  // ⏭️
  [ExecutionEventType.NODE_RETRYING]: "\uD83D\uDD04",           // 🔄
  [ExecutionEventType.ROUTE_SELECTED]: "\uD83D\uDD00",          // 🔀
  [ExecutionEventType.SYNCHRONIZER_BARRIER]: "\uD83D\uDD17",    // 🔗
  [ExecutionEventType.SYNCHRONIZER_MERGED]: "\uD83D\uDD17",     // 🔗
  [ExecutionEventType.CONTEXT_UPDATED]: "\uD83D\uDCDD",         // 📝
  [ExecutionEventType.EXECUTION_COMPLETED]: "\uD83C\uDFC1",     // 🏁
  [ExecutionEventType.EXECUTION_FAILED]: "\uD83D\uDEAB",        // 🚫
  [ExecutionEventType.STATE_TRANSITION]: "\uD83D\uDD04",        // 🔄
  [ExecutionEventType.RUN_PAUSED]: "\u23F8",                   // ⏸
  [ExecutionEventType.RUN_RESUMED]: "\u25B6",                  // ▶
  [ExecutionEventType.RUN_CANCELLED]: "\uD83D\uDEAB",          // 🚫
};

const EVENT_COLORS: Record<string, string> = {
  [ExecutionEventType.RUN_INITIALIZED]: "text-blue-600 dark:text-blue-400",
  [ExecutionEventType.NODE_STARTED]: "text-blue-600 dark:text-blue-400",
  [ExecutionEventType.NODE_COMPLETED]: "text-green-600 dark:text-green-400",
  [ExecutionEventType.NODE_FAILED]: "text-red-600 dark:text-red-400",
  [ExecutionEventType.NODE_SKIPPED]: "text-gray-500 dark:text-gray-400",
  [ExecutionEventType.NODE_RETRYING]: "text-amber-600 dark:text-amber-400",
  [ExecutionEventType.CONTEXT_UPDATED]: "text-cyan-600 dark:text-cyan-400",
  [ExecutionEventType.ROUTE_SELECTED]: "text-indigo-600 dark:text-indigo-400",
  [ExecutionEventType.SYNCHRONIZER_BARRIER]: "text-purple-600 dark:text-purple-400",
  [ExecutionEventType.SYNCHRONIZER_MERGED]: "text-purple-600 dark:text-purple-400",
  [ExecutionEventType.EXECUTION_COMPLETED]: "text-green-600 dark:text-green-400",
  [ExecutionEventType.EXECUTION_FAILED]: "text-red-600 dark:text-red-400",
  [ExecutionEventType.STATE_TRANSITION]: "text-zinc-600 dark:text-zinc-400",
  [ExecutionEventType.RUN_PAUSED]: "text-amber-600 dark:text-amber-400",
  [ExecutionEventType.RUN_RESUMED]: "text-blue-600 dark:text-blue-400",
  [ExecutionEventType.RUN_CANCELLED]: "text-red-600 dark:text-red-400",
};

const EVENT_BG_COLORS: Record<string, string> = {
  [ExecutionEventType.NODE_STARTED]: "bg-blue-50/50 dark:bg-blue-950/10",
  [ExecutionEventType.NODE_COMPLETED]: "bg-green-50/50 dark:bg-green-950/10",
  [ExecutionEventType.NODE_FAILED]: "bg-red-50/50 dark:bg-red-950/10",
  [ExecutionEventType.NODE_SKIPPED]: "bg-gray-50/50 dark:bg-gray-900/10",
  [ExecutionEventType.NODE_RETRYING]: "bg-amber-50/50 dark:bg-amber-950/10",
  [ExecutionEventType.CONTEXT_UPDATED]: "bg-cyan-50/50 dark:bg-cyan-950/10",
  [ExecutionEventType.ROUTE_SELECTED]: "bg-indigo-50/50 dark:bg-indigo-950/10",
  [ExecutionEventType.SYNCHRONIZER_BARRIER]: "bg-purple-50/50 dark:bg-purple-950/10",
  [ExecutionEventType.SYNCHRONIZER_MERGED]: "bg-purple-50/50 dark:bg-purple-950/10",
  [ExecutionEventType.EXECUTION_COMPLETED]: "bg-green-50/50 dark:bg-green-950/10",
  [ExecutionEventType.EXECUTION_FAILED]: "bg-red-50/50 dark:bg-red-950/10",
  [ExecutionEventType.RUN_PAUSED]: "bg-amber-50/50 dark:bg-amber-950/10",
  [ExecutionEventType.RUN_RESUMED]: "bg-blue-50/50 dark:bg-blue-950/10",
  [ExecutionEventType.RUN_CANCELLED]: "bg-red-50/50 dark:bg-red-950/10",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  [ExecutionEventType.RUN_INITIALIZED]: "Run Initialized",
  [ExecutionEventType.NODE_STARTED]: "Node Started",
  [ExecutionEventType.NODE_COMPLETED]: "Node Completed",
  [ExecutionEventType.NODE_FAILED]: "Node Failed",
  [ExecutionEventType.NODE_SKIPPED]: "Node Skipped",
  [ExecutionEventType.NODE_RETRYING]: "Node Retrying",
  [ExecutionEventType.CONTEXT_UPDATED]: "Context Updated",
  [ExecutionEventType.ROUTE_SELECTED]: "Route Selected",
  [ExecutionEventType.SYNCHRONIZER_BARRIER]: "Synchronizer Barrier",
  [ExecutionEventType.SYNCHRONIZER_MERGED]: "Synchronizer Merged",
  [ExecutionEventType.EXECUTION_COMPLETED]: "Execution Completed",
  [ExecutionEventType.EXECUTION_FAILED]: "Execution Failed",
  [ExecutionEventType.STATE_TRANSITION]: "State Transition",
  [ExecutionEventType.RUN_PAUSED]: "Run Paused",
  [ExecutionEventType.RUN_RESUMED]: "Run Resumed",
  [ExecutionEventType.RUN_CANCELLED]: "Run Cancelled",
};

// ============================================================================
// Props
// ============================================================================

export interface EventLogProps {
  /** Ordered list of execution events */
  events: ExecutionEvent[];
  /** Whether to auto-scroll to bottom on new events */
  autoScroll?: boolean;
  /** Callback when an event is clicked — used to highlight a node in the DAG */
  onEventClick?: (event: ExecutionEvent) => void;
  /** Optional className for the container */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getEventDescription(event: ExecutionEvent): string {
  const { type, data } = event;
  switch (type) {
    case ExecutionEventType.RUN_INITIALIZED:
      return `Workflow initialized (mode: ${data?.mode ?? "?"})`;
    case ExecutionEventType.NODE_STARTED:
      return `Started execution`;
    case ExecutionEventType.NODE_COMPLETED:
      return `Completed in ${data?.durationMs ?? "?"}ms`;
    case ExecutionEventType.NODE_FAILED:
      return `Failed: ${data?.error ?? "unknown error"}`;
    case ExecutionEventType.NODE_SKIPPED:
      return `Skipped — ${data?.reason ?? "no reason"}`;
    case ExecutionEventType.NODE_RETRYING:
      return `Retrying (attempt ${data?.attempt ?? "?"})`;
    case ExecutionEventType.CONTEXT_UPDATED:
      return `Context updated by agent`;
    case ExecutionEventType.ROUTE_SELECTED:
      return `Route selected: "${data?.selectedBranch ?? "?"}"`;
    case ExecutionEventType.SYNCHRONIZER_BARRIER:
      return `Waiting for ${data?.missing ?? "?"} branches`;
    case ExecutionEventType.SYNCHRONIZER_MERGED:
      return `Merged parallel branches`;
    case ExecutionEventType.EXECUTION_COMPLETED:
      return `Execution completed in ${data?.totalDurationMs ?? "?"}ms`;
    case ExecutionEventType.EXECUTION_FAILED:
      return `Execution failed: ${data?.error ?? "unknown error"}`;
    case ExecutionEventType.STATE_TRANSITION:
      return `State transition → ${data?.to ?? "?"}`;
    case ExecutionEventType.RUN_PAUSED:
      return data?.reason ? `Paused: ${data.reason}` : "Paused";
    case ExecutionEventType.RUN_RESUMED:
      return "Resumed";
    case ExecutionEventType.RUN_CANCELLED:
      return data?.reason ? `Cancelled: ${data.reason}` : "Cancelled";
    default:
      return "";
  }
}

function formatEventTime(ts: number): string {
  const date = new Date(ts);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/** Group events by the second they occurred in. */
function groupEventsBySecond(
  events: ExecutionEvent[],
): Array<{ label: string; events: ExecutionEvent[] }> {
  const groups: Array<{ label: string; events: ExecutionEvent[] }> = [];
  let currentLabel = "";
  let currentBucket: ExecutionEvent[] = [];

  for (const event of events) {
    // Create a readable second-granularity label
    const d = new Date(event.timestamp);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    if (label !== currentLabel) {
      if (currentBucket.length > 0) {
        groups.push({ label: currentLabel, events: currentBucket });
      }
      currentLabel = label;
      currentBucket = [event];
    } else {
      currentBucket.push(event);
    }
  }
  if (currentBucket.length > 0) {
    groups.push({ label: currentLabel, events: currentBucket });
  }
  return groups;
}

// ============================================================================
// Component
// ============================================================================

export function EventLog({
  events,
  autoScroll = true,
  onEventClick,
  className,
}: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(autoScroll);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const prevLengthRef = useRef(events.length);

  // --- Auto-scroll logic ---
  useEffect(() => {
    if (isAutoScroll && scrollRef.current && events.length > prevLengthRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = events.length;
  }, [events.length, isAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!atBottom && isAutoScroll) {
      setIsAutoScroll(false);
    } else if (atBottom && !isAutoScroll) {
      setIsAutoScroll(true);
    }
  }, [isAutoScroll]);

  // --- Filter logic ---
  const filteredEvents = useMemo(() => {
    let result = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.nodeId?.toLowerCase().includes(q) ||
          ev.agentId?.toLowerCase().includes(q) ||
          ev.type.toLowerCase().includes(q) ||
          getEventDescription(ev).toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) {
      result = result.filter((ev) => typeFilter.has(ev.type));
    }
    return result;
  }, [events, searchQuery, typeFilter]);

  const groups = useMemo(() => groupEventsBySecond(filteredEvents), [filteredEvents]);

  const allTypes = useMemo(
    () => [...new Set(events.map((ev) => ev.type))],
    [events],
  );

  const toggleTypeFilter = useCallback((type: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: ExecutionEvent, e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onEventClick?.(event);
      }
    },
    [onEventClick],
  );

  // --- Clipboard copy ---
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, ev: ExecutionEvent) => {
      e.preventDefault();
      navigator.clipboard
        .writeText(JSON.stringify(ev, null, 2))
        .catch(() => { /* Clipboard write failed silently */ });
    },
    [],
  );

  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        {/* Search */}
        <div className="relative flex-1">
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input
            id="event-search"
            type="search"
            placeholder="Search events…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cx(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
            showFilters
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
              : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
          )}
          aria-label={showFilters ? "Hide event type filters" : "Show event type filters"}
          aria-expanded={showFilters}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>

        {/* Auto-scroll toggle */}
        <button
          type="button"
          onClick={() => setIsAutoScroll((v) => !v)}
          className={cx(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
            isAutoScroll
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
              : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
          )}
          aria-label={isAutoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
          aria-pressed={isAutoScroll}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isAutoScroll ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            )}
          </svg>
          {isAutoScroll ? "Pause" : "Auto"}
        </button>

        {/* Event count */}
        <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
          {filteredEvents.length}
        </span>
      </div>

      {/* Type filter dropdown */}
      {showFilters && (
        <div
          className="flex flex-wrap gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
          role="group"
          aria-label="Filter by event type"
        >
          {allTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleTypeFilter(type)}
              className={cx(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                typeFilter.has(type)
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  : "border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              )}
              aria-pressed={typeFilter.has(type)}
            >
              {EVENT_TYPE_LABELS[type] ?? type}
            </button>
          ))}
          {allTypes.length === 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">No event types</span>
          )}
        </div>
      )}

      {/* Event list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/50"
        role="log"
        aria-label="Execution event log"
        aria-live="polite"
        tabIndex={0}
      >
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery || typeFilter.size > 0
                ? "No events match the current filters."
                : "No events recorded yet."}
            </p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            {/* Time group header */}
            <div className="sticky top-0 border-b border-zinc-200 bg-zinc-100/80 px-3 py-1 text-[10px] font-medium text-zinc-500 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
              {group.label}
            </div>

            {group.events.map((event) => {
              const icon = EVENT_ICONS[event.type] ?? "\u2022";
              const colorClass = EVENT_COLORS[event.type] ?? "text-zinc-600";
              const bgClass = EVENT_BG_COLORS[event.type] ?? "";

              return (
                <div
                  key={event.id}
                  className={cx(
                    "flex cursor-pointer items-start gap-2 px-3 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                    bgClass,
                  )}
                  onClick={() => onEventClick?.(event)}
                  onContextMenu={(e) => handleContextMenu(e, event)}
                  onKeyDown={(e) => handleKeyDown(event, e)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${EVENT_TYPE_LABELS[event.type] ?? event.type} — ${getEventDescription(event)}`}
                  title="Right-click to copy event JSON"
                >
                  {/* Icon */}
                  <span className={cx("mt-0.5 shrink-0 text-xs leading-none", colorClass)} aria-hidden="true">
                    {icon}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                        {formatEventTime(event.timestamp)}
                      </span>
                      <span className={cx("text-[10px] font-semibold uppercase", colorClass)}>
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      {(event.nodeId ?? event.agentId) && (
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {event.agentId ?? event.nodeId}
                        </span>
                      )}
                      <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {getEventDescription(event)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scroll to bottom indicator */}
      {!isAutoScroll && events.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-center text-[11px] font-medium text-blue-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-blue-400 dark:hover:bg-zinc-800/50"
        >
          New events below — click to scroll to bottom
        </button>
      )}
    </div>
  );
}
