import Link from "next/link";

/* ── Mock Data ── */

type Metric = {
  label: string;
  value: string;
  trend: { direction: "up" | "down" | "neutral"; label: string };
};

const metrics: Metric[] = [
  {
    label: "Total Runs",
    value: "1,247",
    trend: { direction: "up", label: "+12.5% this week" },
  },
  {
    label: "Success Rate (24h)",
    value: "94.2%",
    trend: { direction: "up", label: "+2.1% vs yesterday" },
  },
  {
    label: "Active Executions",
    value: "3",
    trend: { direction: "neutral", label: "No change" },
  },
  {
    label: "Total Agents",
    value: "18",
    trend: { direction: "up", label: "+2 new this month" },
  },
];

type Run = {
  id: string;
  agent: string;
  status: "completed" | "running" | "failed";
  time: string;
  duration: string;
};

const recentRuns: Run[] = [
  { id: "1283", agent: "trend-researcher", status: "completed", time: "2m ago", duration: "1.2s" },
  { id: "1282", agent: "data-pipeline", status: "running", time: "5m ago", duration: "—" },
  { id: "1281", agent: "security-scan", status: "failed", time: "8m ago", duration: "3.4s" },
  { id: "1280", agent: "code-review", status: "completed", time: "12m ago", duration: "5.1s" },
  { id: "1279", agent: "deploy-frontend", status: "completed", time: "18m ago", duration: "8.7s" },
];

/* ── Helpers ── */

function TrendBadge({ trend }: { trend: Metric["trend"] }) {
  const colorMap = {
    up: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50",
    down: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50",
    neutral: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50",
  };

  const arrowMap = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorMap[trend.direction]}`}
    >
      {arrowMap[trend.direction]}
      {trend.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Run["status"] }) {
  const styles = {
    completed:
      "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    running:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 animate-pulse-slow",
    failed: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  };

  const labels = {
    completed: "Completed",
    running: "Running",
    failed: "Failed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {status === "running" && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {labels[status]}
    </span>
  );
}

/* ── Metric Card ── */

function MetricCard({ label, value, trend }: Metric) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <div className="mt-2">
        <TrendBadge trend={trend} />
      </div>
    </div>
  );
}

/* ── Recent Runs Row ── */

function RecentRunRow({ run }: { run: Run }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <StatusBadge status={run.status} />
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">
          {run.agent}
        </span>
      </div>
      <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-mono text-gray-400 dark:text-gray-500">
          #{run.id}
        </span>
        <span>{run.time}</span>
        <span className="font-mono">{run.duration}</span>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your Nexus Agent Platform
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Recent Runs */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Recent Runs
          </h2>
          <Link
            href="/dashboard/runs"
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View All Runs &rarr;
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recentRuns.map((run) => (
            <RecentRunRow key={run.id} run={run} />
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Browse Agents
        </Link>
        <Link
          href="/dashboard/diagnostics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          View Diagnostics
        </Link>
      </div>
    </div>
  );
}
