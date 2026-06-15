"use client";

import { useState, useMemo } from "react";

/* ── Mock Agent Data ── */

type AgentCapability = {
  name: string;
  type: "read" | "write" | "both";
};

type Agent = {
  id: string;
  name: string;
  version: string;
  status: "active" | "inactive" | "error";
  description: string;
  capabilities: AgentCapability[];
  reads: string[];
  writes: string[];
};

const agents: Agent[] = [
  {
    id: "trend-researcher",
    name: "Trend Researcher",
    version: "2.1.0",
    status: "active",
    description: "Analyzes market trends and research data sources.",
    capabilities: [
      { name: "web-scrape", type: "read" },
      { name: "data-analyze", type: "both" },
      { name: "report-generate", type: "write" },
    ],
    reads: ["market.feeds", "research.papers", "trends.history"],
    writes: ["reports.trends", "alerts.signals"],
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    version: "1.8.3",
    status: "active",
    description: "Orchestrates ETL workflows across data sources.",
    capabilities: [
      { name: "etl-execute", type: "both" },
      { name: "transform", type: "write" },
      { name: "validate", type: "read" },
    ],
    reads: ["sources.raw", "schema.registry"],
    writes: ["warehouse.curated", "metrics.quality"],
  },
  {
    id: "security-scan",
    name: "Security Scanner",
    version: "3.0.1",
    status: "active",
    description: "Scans code and dependencies for vulnerabilities.",
    capabilities: [
      { name: "vulnerability-scan", type: "read" },
      { name: "cve-lookup", type: "read" },
      { name: "report-generate", type: "write" },
    ],
    reads: ["code.repository", "deps.manifest", "cve.database"],
    writes: ["reports.security", "alerts.critical"],
  },
  {
    id: "code-review",
    name: "Code Reviewer",
    version: "2.0.0",
    status: "inactive",
    description: "Reviews pull requests for code quality and standards.",
    capabilities: [
      { name: "static-analysis", type: "read" },
      { name: "lint-check", type: "read" },
      { name: "review-post", type: "write" },
    ],
    reads: ["pr.diff", "code.patterns"],
    writes: ["review.comments", "quality.scores"],
  },
  {
    id: "deploy-frontend",
    name: "Frontend Deployer",
    version: "1.2.0",
    status: "error",
    description: "Handles frontend build and deployment pipeline.",
    capabilities: [
      { name: "build", type: "write" },
      { name: "deploy", type: "write" },
      { name: "health-check", type: "read" },
    ],
    reads: ["build.artifacts", "infra.status"],
    writes: ["deploy.history", "rollback.triggers"],
  },
  {
    id: "backend-architect",
    name: "Backend Architect",
    version: "2.3.0",
    status: "active",
    description: "Designs and validates backend service architectures.",
    capabilities: [
      { name: "schema-design", type: "both" },
      { name: "api-spec", type: "write" },
      { name: "load-test", type: "read" },
    ],
    reads: ["services.registry", "performance.metrics"],
    writes: ["architecture.proposals", "api.specs"],
  },
];

/* ── Status Badge ── */

function AgentStatusBadge({ status }: { status: Agent["status"] }) {
  const styles = {
    active: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    inactive: "bg-gray-50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    error: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  };

  const labels = { active: "Active", inactive: "Inactive", error: "Error" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === "active"
            ? "bg-green-500"
            : status === "error"
              ? "bg-red-500"
              : "bg-gray-400"
        }`}
      />
      {labels[status]}
    </span>
  );
}

/* ── Capability Badge ── */

function CapabilityBadge({
  name,
  type,
}: {
  name: string;
  type: AgentCapability["type"];
}) {
  const typeLabel = { read: "R", write: "W", both: "R/W" };
  const typeColor = {
    read: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50",
    write: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50",
    both: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/50",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${typeColor[type]}`}
    >
      <span className="font-mono text-[9px]">{typeLabel[type]}</span>
      {name}
    </span>
  );
}

/* ── Agent Card ── */

function AgentCard({ agent }: { agent: Agent }) {
  const [showContract, setShowContract] = useState(false);
  const totalAccess = agent.reads.length + agent.writes.length;

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {agent.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {agent.id}{" "}
            <span className="font-mono text-gray-400 dark:text-gray-500">
              v{agent.version}
            </span>
          </p>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {agent.capabilities.map((cap) => (
          <CapabilityBadge key={cap.name} name={cap.name} type={cap.type} />
        ))}
      </div>

      {/* Context Contract */}
      <div className="mt-3">
        <button
          onClick={() => setShowContract((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-expanded={showContract}
        >
          <svg
            className={`h-3 w-3 transition-transform ${showContract ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 4 10 8 6 12" />
          </svg>
          Context contract ({totalAccess} paths)
        </button>

        {showContract && (
          <div className="mt-2 space-y-2 animate-slide-in">
            {agent.reads.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
                  Reads
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {agent.reads.map((path) => (
                    <li
                      key={path}
                      className="font-mono text-[11px] text-gray-600 dark:text-gray-400"
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {agent.writes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
                  Writes
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {agent.writes.map((path) => (
                    <li
                      key={path}
                      className="font-mono text-[11px] text-gray-600 dark:text-gray-400"
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Search Input ── */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <line x1="12.5" y1="12.5" x2="17" y2="17" />
    </svg>
  );
}

/* ── Page ── */

export default function AgentsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.id.toLowerCase().includes(search.toLowerCase()) ||
          a.capabilities.some((c) =>
            c.name.toLowerCase().includes(search.toLowerCase())
          )
      ),
    [search]
  );

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Agents
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {agents.length} registered &middot; {activeCount} active
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents by name, ID, or capability…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
          aria-label="Search agents"
        />
      </div>

      {/* Agent Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No agents match your search.
        </p>
      )}
    </div>
  );
}
