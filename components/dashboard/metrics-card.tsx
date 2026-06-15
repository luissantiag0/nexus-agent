"use client";

import { cx } from "@/lib/utils";

export interface MetricsCardProps {
  /** Title / label for the metric */
  title: string;
  /** The primary metric value */
  value: string | number;
  /** Optional subtitle displayed below the value */
  subtitle?: string;
  /** Trend direction indicator */
  trend?: "up" | "down" | "neutral";
  /** Optional icon displayed above or beside the value */
  icon?: React.ReactNode;
  /** Color theme */
  color?: "default" | "success" | "danger" | "warning";
}

const colorStyles: Record<string, string> = {
  default:
    "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800",
  success:
    "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50",
  danger:
    "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50",
  warning:
    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/50",
};

const valueColorStyles: Record<string, string> = {
  default: "text-zinc-900 dark:text-zinc-100",
  success: "text-green-700 dark:text-green-400",
  danger: "text-red-700 dark:text-red-400",
  warning: "text-yellow-700 dark:text-yellow-400",
};

const trendIcons: Record<string, string> = {
  up: "\u2191",
  down: "\u2193",
  neutral: "\u2192",
};

const trendColorStyles: Record<string, string> = {
  up: "text-green-600 dark:text-green-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-zinc-400 dark:text-zinc-500",
};

/**
 * MetricsCard — A compact card for displaying a single metric with
 * optional trend indicator and color theming.
 *
 * Features:
 * - Color-coded backgrounds (default, success, danger, warning)
 * - Trend direction arrow
 * - Optional icon and subtitle
 * - Accessible with proper heading structure
 */
export function MetricsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = "default",
}: MetricsCardProps) {
  return (
    <article
      className={cx(
        "relative flex flex-col gap-1.5 rounded-lg border p-4",
        colorStyles[color],
      )}
      aria-label={`${title}: ${value}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {title}
        </h3>
        {icon && (
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2">
        <span
          className={cx(
            "text-2xl font-semibold tracking-tight",
            valueColorStyles[color],
          )}
        >
          {value}
        </span>
        {trend && (
          <span
            className={cx(
              "text-sm font-medium",
              trendColorStyles[trend],
            )}
            aria-label={`Trend: ${trend}`}
          >
            {trendIcons[trend]}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </article>
  );
}
