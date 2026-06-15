"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DAGLegendProps {
  /** Optional class name for the outer container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DAGLegend({ className = "" }: DAGLegendProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-start gap-x-6 gap-y-2 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/80 backdrop-blur-sm",
        "font-sans",
        className,
      ].join(" ")}
    >
      {/* Status colors */}
      <LegendSection title="Node Status">
        <LegendItem
          color="bg-zinc-400"
          label="Pending"
          border="border-zinc-300 dark:border-zinc-600"
        />
        <LegendItem
          color="bg-blue-500"
          label="Running"
          pulse
          border="border-blue-400 dark:border-blue-500"
        />
        <LegendItem
          color="bg-emerald-500"
          label="Completed"
          border="border-emerald-400 dark:border-emerald-500"
        />
        <LegendItem
          color="bg-red-500"
          label="Failed"
          border="border-red-400 dark:border-red-500"
        />
        <LegendItem
          color="bg-amber-500"
          label="Timed Out"
          border="border-amber-400 dark:border-amber-500"
        />
        <LegendItem
          color="bg-zinc-400"
          label="Skipped"
          dashed
          border="border-zinc-400 dark:border-zinc-500 border-dashed"
        />
      </LegendSection>

      {/* Separator */}
      <div className="hidden h-8 w-px self-center bg-zinc-200 dark:bg-zinc-700 md:block" />

      {/* Edge types */}
      <LegendSection title="Edge Types">
        <LegendEdgeItem color="bg-zinc-500" label="Sequential" />
        <LegendEdgeItem color="bg-blue-500" label="Conditional (true)" />
        <LegendEdgeItem color="bg-orange-500" label="Conditional (false)" dashed />
        <LegendEdgeItem color="bg-violet-500" label="Data Dependency" dotted />
      </LegendSection>

      {/* Separator */}
      <div className="hidden h-8 w-px self-center bg-zinc-200 dark:bg-zinc-700 md:block" />

      {/* Node types */}
      <LegendSection title="Node Types">
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 text-[8px] font-bold text-white">
            A
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">Agent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 text-[8px] font-bold text-white">
            ?
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">Router</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 text-[8px] font-bold text-white">
            F
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">Fork</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 text-[8px] font-bold text-white">
            J
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">Join</span>
        </div>
      </LegendSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function LegendSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {children}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  border,
  pulse = false,
  dashed = false,
}: {
  color: string;
  label: string;
  border: string;
  pulse?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Mini node representation */}
      <span
        className={[
          "inline-flex h-4 w-6 items-center justify-center rounded border",
          border ?? "border-zinc-300 dark:border-zinc-600",
          dashed ? "border-dashed" : "border-solid",
        ].join(" ")}
      >
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            color,
            pulse ? "animate-pulse" : "",
          ].join(" ")}
        />
      </span>
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
    </div>
  );
}

function LegendEdgeItem({
  color,
  label,
  dashed = false,
  dotted = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  dotted?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Mini edge representation */}
      <svg
        className="h-3 w-6"
        viewBox="0 0 24 12"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="6"
          x2="18"
          y2="6"
          stroke="currentColor"
          strokeWidth={2}
          className={color.replace("bg-", "text-")}
          strokeDasharray={
            dashed ? "4 3" : dotted ? "2 3" : undefined
          }
        />
        <polygon
          points="18,2 24,6 18,10"
          fill="currentColor"
          className={color.replace("bg-", "text-")}
        />
      </svg>
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
    </div>
  );
}

// Default export for dynamic imports
export default DAGLegend;
