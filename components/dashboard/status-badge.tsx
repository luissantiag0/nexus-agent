"use client";

import { cx } from "@/lib/utils";

const statusConfig = {
  running: {
    label: "Running",
    container:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
    dot: "bg-blue-500",
    pulse: true,
  },
  completed: {
    label: "Completed",
    container:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/50",
    dot: "bg-green-500",
    pulse: false,
  },
  failed: {
    label: "Failed",
    container:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50",
    dot: "bg-red-500",
    pulse: false,
  },
  skipped: {
    label: "Skipped",
    container:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700/50",
    dot: "bg-gray-400",
    pulse: false,
  },
  partial: {
    label: "Partial",
    container:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800/50",
    dot: "bg-yellow-500",
    pulse: false,
  },
  pending: {
    label: "Pending",
    container:
      "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-500 dark:border-gray-700/50",
    dot: "bg-gray-300",
    pulse: false,
  },
} as const;

export type StatusBadgeStatus = keyof typeof statusConfig;

export interface StatusBadgeProps {
  /** The execution status value */
  status: StatusBadgeStatus;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show the animated pulse dot (for running state) */
  pulse?: boolean;
  /** Show the label text */
  showLabel?: boolean;
}

const sizeStyles: Record<string, string> = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
  lg: "px-3 py-1 text-sm gap-2",
};

const dotSizes: Record<string, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

/**
 * StatusBadge — A colored pill badge that indicates execution status.
 *
 * Features:
 * - Color-coded by status (blue=running, green=completed, red=failed, etc.)
 * - Animated pulse dot for the "running" state
 * - Three size variants (sm, md, lg)
 * - Accessible with proper aria-label
 */
export function StatusBadge({
  status,
  size = "md",
  pulse,
  showLabel = true,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const showPulse = pulse ?? config.pulse;

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border font-medium leading-none",
        config.container,
        sizeStyles[size],
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={cx(
          "inline-block shrink-0 rounded-full",
          dotSizes[size],
          config.dot,
          showPulse && "animate-pulse motion-reduce:animate-none",
        )}
        aria-hidden="true"
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
