// ============================================================================
// Shared Utility Functions
// ============================================================================

/**
 * Merges class names, filtering out falsy values.
 * Lightweight alternative to clsx/classnames for this project.
 */
export function cx(...classes: Array<string | undefined | null | false | 0 | "">): string {
  return classes.filter(Boolean as unknown as (x: unknown) => x is string).join(" ");
}

// ============================================================================
// Date / Time Formatting
// ============================================================================

/**
 * Formats an ISO-8601 timestamp to a human-readable date-time string.
 */
export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "1.2s", "3m 45s", "1h 12m"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 0) return "—";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  if (seconds > 0) {
    return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
  }
  return `${ms}ms`;
}

/**
 * Truncates a string to a given max length, adding ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

/**
 * Formats a date for grouping purposes (e.g. "Today", "Yesterday", or date).
 */
export function formatDateGroup(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  } catch {
    return iso;
  }
}
