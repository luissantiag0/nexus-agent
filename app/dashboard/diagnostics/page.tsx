"use client";

import { useState } from "react";

/* ── Mock Diagnostics Data ── */

type ValidationIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  detail: string;
};

type DependencyEdge = {
  from: string;
  to: string;
  type: "depends" | "triggers";
};

type ContextPath = {
  path: string;
  readBy: string[];
  writtenBy: string[];
};

const validationIssues: ValidationIssue[] = [
  {
    id: "V001",
    severity: "error",
    message: "Missing adapter: deploy-frontend",
    detail:
      "The adapter module 'deploy-frontend' is registered but no adapter implementation file was found at adapters/deploy-frontend.ts.",
  },
  {
    id: "V002",
    severity: "warning",
    message: "Unused context path: alerts.legacy",
    detail:
      "The context path 'alerts.legacy' is written by the security-agent but no agent reads it. The path may be dead weight.",
  },
  {
    id: "V003",
    severity: "warning",
    message: "Missing prompt: code-review v1.2",
    detail:
      "Agent 'code-review' references prompt template 'code-review.v1.2' but the file prompts/code-review.v1.2.yaml does not exist.",
  },
  {
    id: "V004",
    severity: "info",
    message: "Deprecated capability: web-scrape",
    detail:
      "The capability 'web-scrape' used by trend-researcher is deprecated in favor of 'http-fetch'.",
  },
  {
    id: "V005",
    severity: "info",
    message: "Circular dependency detected (non-blocking)",
    detail:
      "Agent 'data-pipeline' and 'backend-architect' have a circular reference in their context contracts. Both agents write to paths the other reads.",
  },
];

const dependencyEdges: DependencyEdge[] = [
  { from: "trend-researcher", to: "data-pipeline", type: "depends" },
  { from: "data-pipeline", to: "backend-architect", type: "triggers" },
  { from: "security-scan", to: "code-review", type: "triggers" },
  { from: "code-review", to: "deploy-frontend", type: "depends" },
  { from: "backend-architect", to: "deploy-frontend", type: "depends" },
];

const contextPaths: ContextPath[] = [
  {
    path: "reports.trends",
    readBy: ["data-pipeline", "backend-architect"],
    writtenBy: ["trend-researcher"],
  },
  {
    path: "alerts.signals",
    readBy: ["security-scan"],
    writtenBy: ["trend-researcher"],
  },
  {
    path: "warehouse.curated",
    readBy: ["backend-architect", "code-review"],
    writtenBy: ["data-pipeline"],
  },
  {
    path: "deploy.history",
    readBy: ["backend-architect"],
    writtenBy: ["deploy-frontend"],
  },
];

/* ── Severity Icon ── */

function SeverityIcon({
  severity,
}: {
  severity: ValidationIssue["severity"];
}) {
  const colors = {
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  };

  return (
    <svg
      className={`h-4 w-4 shrink-0 mt-0.5 ${colors[severity]}`}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      {severity === "error" && (
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7.25 4.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V4.5zM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      )}
      {severity === "warning" && (
        <path d="M8.964.686a1 1 0 0 0-1.928 0L.574 12.564a1 1 0 0 0 .964 1.436h13.924a1 1 0 0 0 .964-1.436L8.964.686zM8 4.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V5.25A.75.75 0 0 1 8 4.5zM8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      )}
      {severity === "info" && (
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7.25 4.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V4.5zM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
      )}
    </svg>
  );
}

/* ── Validation Issue Row ── */

function ValidationIssueRow({
  issue,
  defaultOpen,
}: {
  issue: ValidationIssue;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const severityLabel = {
    error: "Error",
    warning: "Warning",
    info: "Info",
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
        aria-expanded={open}
      >
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                issue.severity === "error"
                  ? "text-red-600 dark:text-red-400"
                  : issue.severity === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {severityLabel[issue.severity]}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {issue.message}
            </span>
          </div>
          {open && (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 animate-slide-in">
              {issue.detail}
            </p>
          )}
        </div>
        <svg
          className={`mt-1 h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>
    </div>
  );
}

/* ── Dependency Graph (visual representation) ── */

function DependencyGraph({ edges }: { edges: DependencyEdge[] }) {
  const agents = Array.from(
    new Set(edges.flatMap((e) => [e.from, e.to]))
  );

  const inbound = (id: string) => edges.filter((e) => e.to === id);
  const outbound = (id: string) => edges.filter((e) => e.from === id);

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const inEdges = inbound(agent);
        const outEdges = outbound(agent);

        return (
          <div key={agent} className="animate-slide-in">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
              {/* Agent Name */}
              <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {agent}
              </span>

              {/* Inbound / Dependencies */}
              {inEdges.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] text-gray-400">depends on</span>
                  <div className="flex gap-1">
                    {inEdges.map((e) => (
                      <span
                        key={`${e.from}-${e.to}`}
                        className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        {e.from}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Outbound / Triggers */}
              {outEdges.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400">triggers</span>
                  <div className="flex gap-1">
                    {outEdges.map((e) => (
                      <span
                        key={`${e.from}-${e.to}`}
                        className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                      >
                        {e.to}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Context Flow Table ── */

function ContextFlowTable({ paths }: { paths: ContextPath[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <th className="px-4 py-2.5 font-medium">Context Path</th>
            <th className="px-4 py-2.5 font-medium">Read By</th>
            <th className="px-4 py-2.5 font-medium">Written By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {paths.map((cp) => (
            <tr
              key={cp.path}
              className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
            >
              <td className="px-4 py-3">
                <code className="font-mono text-xs text-gray-900 dark:text-gray-100">
                  {cp.path}
                </code>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {cp.readBy.map((agent) => (
                    <span
                      key={agent}
                      className="inline-flex rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {cp.writtenBy.map((agent) => (
                    <span
                      key={agent}
                      className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Summary Stat ── */

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${color}`}>
        {value}
      </p>
    </div>
  );
}

/* ── Page ── */

export default function DiagnosticsPage() {
  const errors = validationIssues.filter((i) => i.severity === "error").length;
  const warnings = validationIssues.filter((i) => i.severity === "warning").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Diagnostics
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Registry validation, context flows, and dependency analysis
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Errors"
          value={String(errors)}
          color="text-red-600 dark:text-red-400"
        />
        <SummaryStat
          label="Warnings"
          value={String(warnings)}
          color="text-amber-600 dark:text-amber-400"
        />
        <SummaryStat
          label="Agents Analyzed"
          value="6"
          color="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Registry Validation */}
      <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h16v12H4z" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <line x1="4" y1="8" x2="20" y2="8" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Registry Validation Report
            </h2>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {validationIssues.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No issues found — registry is valid.
            </p>
          ) : (
            validationIssues.map((issue) => (
              <ValidationIssueRow key={issue.id} issue={issue} />
            ))
          )}
        </div>
      </section>

      {/* Context Flow */}
      <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" />
              <path d="M10 6v4l3 3" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Context Flow
            </h2>
          </div>
        </div>
        <div className="p-2">
          <ContextFlowTable paths={contextPaths} />
        </div>
      </section>

      {/* Dependency Graph */}
      <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="2" />
              <circle cx="14" cy="6" r="2" />
              <circle cx="10" cy="14" r="2" />
              <line x1="7.5" y1="7.5" x2="9.5" y2="12.5" />
              <line x1="12.5" y1="7.5" x2="10.5" y2="12.5" />
              <line x1="6" y1="8" x2="6" y2="10" />
              <line x1="14" y1="8" x2="14" y2="10" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Dependency Graph
            </h2>
          </div>
        </div>
        <div className="px-5 py-4">
          <DependencyGraph edges={dependencyEdges} />
        </div>
      </section>
    </div>
  );
}
