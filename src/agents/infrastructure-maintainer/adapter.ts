// ============================================================================
// Nexus Agent Platform — Agent Registry Adapter
// Agent: @infrastructure-maintainer
// Interface Version: 1.0.0
// Description: System reliability and infrastructure optimisation specialist
//              ensuring 99.9%+ uptime, cost efficiency, and security compliance
//              across all technical operations.
// Dependencies: @monitoring-orchestrator (metrics), @incident-manager (alerts)
// ============================================================================

import type { AgentContext } from "../registry.types";

// ============================================================================
// IAgentAdapter — Generic adapter contract
// ============================================================================

/**
 * Generic agent adapter interface implemented by all registry agents.
 *
 * @typeParam TInput  - The typed input payload for this agent.
 * @typeParam TOutput - The typed output payload produced by this agent.
 */
export interface IAgentAdapter<TInput, TOutput> {
  /** Canonical agent identifier (e.g. "infrastructure-maintainer"). */
  readonly agentId: string;

  /** Human-readable agent display name. */
  readonly name: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /**
   * Validate input against schema constraints and business rules.
   * Called by the registry before `execute`; execution is rejected when
   * the result is not valid.
   */
  validate(input: TInput): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   - The validated input payload.
   * @param context - Shared execution context for cross-agent data flow.
   */
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
}

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * Execution status indicating the outcome of an agent run.
 */
export type ExecutionStatus = "completed" | "failed" | "validated";

/**
 * Wrapper returned by every agent execution containing the output payload,
 * timing information, and execution status.
 */
export interface AgentResult<TOutput> {
  /** Unique identifier for this execution run. */
  readonly runId: string;

  /** ISO-8601 timestamp of when execution completed. */
  readonly timestamp: string;

  /** Wall-clock execution duration in milliseconds. */
  readonly durationMs: number;

  /** The typed output payload when execution succeeds; null on failure. */
  readonly output: TOutput | null;

  /** Final execution disposition. */
  readonly status: ExecutionStatus;

  /** Human-readable error message when status is "failed". */
  readonly error?: string;
}

/**
 * Result of input validation performed before agent execution.
 */
export interface ValidationResult {
  /** Whether the input passes all validation rules. */
  readonly valid: boolean;

  /** Human-readable error messages describing validation failures. */
  readonly errors: string[];
}

// ============================================================================
// Input Schema — InfrastructureInput
// ============================================================================

/**
 * Current snapshot of system-level resource metrics.
 */
export interface SystemMetrics {
  /** CPU utilisation percentage (0–100). */
  readonly cpu: number;

  /** Memory utilisation percentage (0–100). */
  readonly memory: number;

  /** Average request latency in milliseconds. */
  readonly latency: number;

  /** Current error rate as a percentage of total requests (0–100). */
  readonly errorRate: number;

  /** Disk utilisation percentage (0–100). */
  readonly disk?: number;

  /** Inbound/outbound network throughput in Mbps. */
  readonly networkThroughput?: number;
}

/**
 * Status of a single deployment.
 */
export interface DeploymentStatus {
  /** Deployment identifier. */
  readonly id: string;

  /** Service or component name being deployed. */
  readonly service: string;

  /** Current phase of the deployment lifecycle. */
  readonly phase:
    | "provisioning"
    | "rolling_out"
    | "health_checking"
    | "completed"
    | "rolled_back"
    | "failed";

  /** ISO-8601 timestamp of when the deployment was initiated. */
  readonly startedAt: string;

  /** ISO-8601 timestamp of when the deployment reached its current phase. */
  readonly updatedAt: string;

  /** Version identifier being deployed (e.g. image tag, commit SHA). */
  readonly version: string;

  /** Deployment region or availability zone. */
  readonly region?: string;

  /** Error detail when phase is "failed". */
  readonly error?: string;
}

/**
 * A single alert event from the monitoring system.
 */
export interface AlertHistoryEntry {
  /** Unique alert identifier. */
  readonly id: string;

  /** Alert severity level. */
  readonly severity: "critical" | "warning" | "info";

  /** Human-readable alert title. */
  readonly title: string;

  /** ISO-8601 timestamp of when the alert fired. */
  readonly firedAt: string;

  /** ISO-8601 timestamp of when the alert was resolved (empty if still firing). */
  readonly resolvedAt?: string;

  /** Alert source / monitoring component. */
  readonly source: string;

  /** Metric or event that triggered the alert. */
  readonly trigger: string;

  /** Current acknowledgement status. */
  readonly acknowledged: boolean;

  /** Team or individual assigned to the alert. */
  readonly assignedTo?: string;
}

/**
 * A post-incident report summarising root cause, impact, and remediation.
 */
export interface IncidentReport {
  /** Unique incident identifier. */
  readonly id: string;

  /** Incident severity classification. */
  readonly severity: "sev0" | "sev1" | "sev2" | "sev3";

  /** Human-readable incident title. */
  readonly title: string;

  /** ISO-8601 timestamp of when the incident was detected. */
  readonly detectedAt: string;

  /** ISO-8601 timestamp of when the incident was resolved. */
  readonly resolvedAt?: string;

  /** Duration in minutes between detection and resolution. */
  readonly timeToResolveMinutes?: number;

  /** Root cause summary. */
  readonly rootCause: string;

  /** Services or components affected. */
  readonly affectedServices: string[];

  /** List of action items to prevent recurrence. */
  readonly actionItems: string[];

  /** Customer impact description. */
  readonly customerImpact?: string;
}

/**
 * Thresholds that trigger capacity-related alerts or scaling decisions.
 */
export interface CapacityThresholds {
  /** CPU percentage threshold (1–100). */
  readonly cpuPercent: number;

  /** Memory percentage threshold (1–100). */
  readonly memoryPercent: number;

  /** Disk percentage threshold (1–100). */
  readonly diskPercent: number;

  /** Maximum acceptable request latency in milliseconds. */
  readonly maxLatencyMs: number;

  /** Error rate percentage threshold (0–100). */
  readonly maxErrorRate: number;
}

/**
 * A single service-level objective target.
 */
export interface SloTarget {
  /** Service or component name. */
  readonly service: string;

  /** SLO metric name (e.g. "availability", "latency_p99"). */
  readonly metric: string;

  /** Target value for the SLO period. */
  readonly target: number;

  /** Unit of measurement. */
  readonly unit: string;

  /** Duration of the SLO evaluation window (e.g. "30d"). */
  readonly window: string;

  /** Current actual value against the target. */
  readonly currentValue?: number;
}

/**
 * Complete input contract for @infrastructure-maintainer.
 *
 * Populated by the orchestrator from the monitoring system, CI/CD pipeline,
 * incident management platform, and SLO tracking service.
 */
export interface InfrastructureInput {
  /** Current snapshot of system resource metrics. */
  readonly systemMetrics: SystemMetrics;

  /** Recent deployment status entries (ordered newest-first). */
  readonly deploymentStatus: DeploymentStatus[];

  /** Historical alert events (ordered newest-first). */
  readonly alertHistory: AlertHistoryEntry[];

  /** Post-incident reports for recent or ongoing incidents. */
  readonly incidentReports: IncidentReport[];

  /** Capacity alerting thresholds (optional; system defaults used if absent). */
  readonly capacityThresholds?: CapacityThresholds;

  /** Active SLO targets to validate against. */
  readonly sloTargets: SloTarget[];
}

// ============================================================================
// Output Schema — InfrastructureOutput
// ============================================================================

/**
 * Overall health assessment for a component or the entire infrastructure.
 */
export interface HealthStatus {
  /** Aggregated health rating. */
  readonly status: "healthy" | "degraded" | "critical" | "down";

  /** Overall health score (0–100). */
  readonly score: number;

  /** Summary of what is driving the status. */
  readonly summary: string;

  /** Individual component health checks. */
  readonly checks: HealthCheck[];
}

/**
 * A single health check result for a component or subsystem.
 */
export interface HealthCheck {
  /** Component name (e.g. "api-gateway", "postgres-primary"). */
  readonly component: string;

  /** Health status of this component. */
  readonly status: "healthy" | "degraded" | "down";

  /** Measured value for the checked metric. */
  readonly value: number;

  /** Unit of measurement. */
  readonly unit: string;

  /** Threshold that was compared against. */
  readonly threshold: number;
}

/**
 * Aggregated performance metrics with trend analysis.
 */
export interface PerformanceMetrics {
  /** Average CPU utilisation across the fleet (0–100). */
  readonly avgCpuUtilization: number;

  /** Peak CPU utilisation in the window (0–100). */
  readonly peakCpuUtilization: number;

  /** Average memory utilisation across the fleet (0–100). */
  readonly avgMemoryUtilization: number;

  /** Peak memory utilisation in the window (0–100). */
  readonly peakMemoryUtilization: number;

  /** p50 / p95 / p99 latency in milliseconds. */
  readonly latencyMs: {
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
  };

  /** Current error rate percentage (0–100). */
  readonly errorRate: number;

  /** Period-over-period change direction. */
  readonly trend: "improving" | "stable" | "degrading";

  /** Normalised performance score (0–100). */
  readonly performanceScore: number;
}

/**
 * A single entry in the incident timeline, correlating alerts, reports,
 * and remediation actions into a chronological narrative.
 */
export interface IncidentTimelineEntry {
  /** Unique timeline entry identifier. */
  readonly id: string;

  /** ISO-8601 timestamp of the event. */
  readonly timestamp: string;

  /** Event type. */
  readonly type:
    | "alert_fired"
    | "alert_resolved"
    | "incident_detected"
    | "incident_resolved"
    | "deployment_started"
    | "deployment_completed"
    | "deployment_rolled_back"
    | "scaling_event"
    | "maintenance_window";

  /** Brief description of the event. */
  readonly description: string;

  /** Severity level (for alerts and incidents). */
  readonly severity?: "info" | "warning" | "critical";

  /** Reference to the source alert or incident identifier. */
  readonly sourceId?: string;
}

/**
 * A recommendation to scale infrastructure resources.
 */
export interface ScalingRecommendation {
  /** Target resource or service group. */
  readonly resource: string;

  /** Recommended action. */
  readonly action:
    | "scale_up"
    | "scale_down"
    | "scale_out"
    | "scale_in"
    | "resize"
    | "no_change";

  /** Rationale for the recommendation. */
  readonly reason: string;

  /** Projected cost impact of the change in USD/month. */
  readonly estimatedCostImpact: number;

  /** Computed priority for this recommendation. */
  readonly priority: "critical" | "high" | "medium" | "low";

  /** Confidence level based on signal strength. */
  readonly confidence: "high" | "medium" | "low";
}

/**
 * Forecast of future capacity requirements.
 */
export interface CapacityForecast {
  /** ISO-8601 timestamp when the forecast was generated. */
  readonly forecastDate: string;

  /** Forecast window duration (e.g. "30d", "90d"). */
  readonly window: string;

  /** Projected CPU headroom percentage (negative = deficit). */
  readonly projectedCpuHeadroom: number;

  /** Projected memory headroom percentage (negative = deficit). */
  readonly projectedMemoryHeadroom: number;

  /** Projected disk headroom percentage (negative = deficit). */
  readonly projectedDiskHeadroom: number;

  /** Expected growth rate of the most constrained resource (%/month). */
  readonly growthRatePercent: number;

  /** Recommendation: date by which capacity must be added. */
  readonly estimatedExhaustionDate?: string;

  /** Summary of the forecast. */
  readonly summary: string;
}

/**
 * Complete output contract from @infrastructure-maintainer.
 *
 * Contains the aggregated health assessment, computed performance metrics,
 * a correlated incident timeline, actionable scaling recommendations,
 * and a forward-looking capacity forecast.
 */
export interface InfrastructureOutput {
  /** Aggregated health assessment for the infrastructure. */
  readonly infraHealth: HealthStatus;

  /** Aggregated performance metrics with trend analysis. */
  readonly performanceMetrics: PerformanceMetrics;

  /** Chronological timeline of infrastructure events. */
  readonly incidentTimeline: IncidentTimelineEntry[];

  /** Prioritised scaling and resource optimisation recommendations. */
  readonly scalingRecommendations: ScalingRecommendation[];

  /** Forward-looking capacity forecast. */
  readonly capacityForecast: CapacityForecast;
}

// ============================================================================
// Context Keys
// ============================================================================

/**
 * Context keys that the @infrastructure-maintainer agent **reads** from the
 * shared AgentContext store. These are populated by upstream agents such as
 * @monitoring-orchestrator and @incident-manager.
 */
export const INFRASTRUCTURE_MAINTAINER_READ_KEYS = [
  "workflowMetrics",
  "errorRates",
  "deploymentState",
] as const satisfies readonly string[];

/**
 * Context keys that the @infrastructure-maintainer agent **writes** to the
 * shared AgentContext store. Downstream agents (e.g. @cost-optimiser,
 * @capacity-planner) consume these keys for further analysis.
 */
export const INFRASTRUCTURE_MAINTAINER_WRITE_KEYS = [
  "infraHealth",
  "performanceMetrics",
  "incidentTimeline",
  "scalingRecommendations",
  "capacityForecast",
] as const satisfies readonly string[];

export type InfrastructureMaintainerReadKey =
  (typeof INFRASTRUCTURE_MAINTAINER_READ_KEYS)[number];

export type InfrastructureMaintainerWriteKey =
  (typeof INFRASTRUCTURE_MAINTAINER_WRITE_KEYS)[number];

// ============================================================================
// Dry-Run Result
// ============================================================================

export interface InfrastructureMaintainerDryRunResult {
  readonly valid: boolean;
  readonly validationErrors: string[];
  readonly estimatedOutputKeys: string[];
  readonly estimatedScore: { min: number; max: number };
}

// ============================================================================
// Adapter Implementation
// ============================================================================

/**
 * Adapter for the @infrastructure-maintainer agent.
 *
 * Validates infrastructure inputs (system metrics, SLO targets) and executes
 * the agent's core analysis to produce health assessments, performance
 * metrics, incident timelines, scaling recommendations, and capacity forecasts.
 */
export class InfrastructureMaintainerAdapter
  implements IAgentAdapter<InfrastructureInput, InfrastructureOutput>
{
  readonly agentId = "infrastructure-maintainer";
  readonly name = "Infrastructure Maintainer";
  readonly version = "1.0.0";

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validate that the input contains all required fields:
   * - `systemMetrics` with `cpu`, `memory`, `latency`, `errorRate`
   * - A non-empty `sloTargets` array
   */
  validate(input: InfrastructureInput): ValidationResult {
    const errors: string[] = [];

    // --- systemMetrics presence ---
    if (!input.systemMetrics) {
      errors.push("systemMetrics is required");
    } else {
      if (input.systemMetrics.cpu == null) {
        errors.push("systemMetrics.cpu is required");
      }
      if (input.systemMetrics.memory == null) {
        errors.push("systemMetrics.memory is required");
      }
      if (input.systemMetrics.latency == null) {
        errors.push("systemMetrics.latency is required");
      }
      if (input.systemMetrics.errorRate == null) {
        errors.push("systemMetrics.errorRate is required");
      }
    }

    // --- sloTargets ---
    if (!input.sloTargets || input.sloTargets.length === 0) {
      errors.push("sloTargets must be a non-empty array");
    }

    return { valid: errors.length === 0, errors };
  }

  // ========================================================================
  // Execution
  // ========================================================================

  /**
   * Execute the infrastructure-maintainer agent.
   *
   * Performs health assessment, computes performance metrics, correlates
   * the incident timeline, generates scaling recommendations, and produces
   * a capacity forecast — all derived from the input payload and shared
   * context.
   *
   * The shared context is read for `workflowMetrics`, `errorRates`, and
   * `deploymentState` and written with the output fields so that downstream
   * agents can consume them without re-executing this agent.
   */
  async execute(
    input: InfrastructureInput,
    context: AgentContext,
  ): Promise<AgentResult<InfrastructureOutput>> {
    const runId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const startedAt = Date.now();

    try {
      // --- Read context keys from upstream agents ---
      const workflowMetrics: Record<string, unknown> | undefined =
        context.workflowMetrics as Record<string, unknown> | undefined;
      const errorRates: Record<string, number> | undefined =
        context.errorRates as Record<string, number> | undefined;
      const deploymentState: Record<string, unknown> | undefined =
        context.deploymentState as Record<string, unknown> | undefined;

      // --- Core analysis (stub — integrate with actual infrastructure engine) ---
      const infraHealth = this.assessHealth(input, workflowMetrics);
      const performanceMetrics = this.computePerformance(input, errorRates);
      const incidentTimeline = this.buildIncidentTimeline(input);
      const scalingRecommendations = this.generateScalingRecommendations(
        input,
        deploymentState,
      );
      const capacityForecast = this.forecastCapacity(input, performanceMetrics);

      const output: InfrastructureOutput = {
        infraHealth,
        performanceMetrics,
        incidentTimeline,
        scalingRecommendations,
        capacityForecast,
      };

      // --- Write output to context for downstream agents ---
      context.infraHealth = output.infraHealth;
      context.performanceMetrics = output.performanceMetrics;
      context.incidentTimeline = output.incidentTimeline;
      context.scalingRecommendations = output.scalingRecommendations;
      context.capacityForecast = output.capacityForecast;

      return {
        runId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        output,
        status: "completed",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        runId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        output: null,
        status: "failed",
        error: message,
      };
    }
  }

  // ========================================================================
  // Dry-Run
  // ========================================================================

  /**
   * Dry-run the adapter: validate input shape and estimate output structure
   * without performing the full analysis.
   */
  dryRun(input: InfrastructureInput): InfrastructureMaintainerDryRunResult {
    const validation = this.validate(input);

    if (!validation.valid) {
      return {
        valid: false,
        validationErrors: validation.errors,
        estimatedOutputKeys: [],
        estimatedScore: { min: 0, max: 0 },
      };
    }

    return {
      valid: true,
      validationErrors: [],
      estimatedOutputKeys: [
        "infraHealth",
        "performanceMetrics",
        "incidentTimeline",
        "scalingRecommendations",
        "capacityForecast",
      ],
      estimatedScore: { min: 40, max: 100 },
    };
  }

  // ========================================================================
  // Private — Core analysis stubs
  // ========================================================================

  /**
   * Evaluate overall infrastructure health from system metrics and alert history.
   */
  private assessHealth(
    input: InfrastructureInput,
    _workflowMetrics?: Record<string, unknown>,
  ): HealthStatus {
    const { systemMetrics, alertHistory, incidentReports } = input;

    // Count open critical alerts and Sev0/Sev1 incidents
    const openCriticalAlerts = alertHistory.filter(
      (a) => !a.resolvedAt && a.severity === "critical",
    ).length;
    const openCriticalIncidents = incidentReports.filter(
      (i) => !i.resolvedAt && (i.severity === "sev0" || i.severity === "sev1"),
    ).length;

    // Compute a raw health score from system metrics
    const cpuHealth = Math.max(0, 100 - systemMetrics.cpu);
    const memoryHealth = Math.max(0, 100 - systemMetrics.memory);
    const latencyHealth = systemMetrics.latency < 200 ? 100
      : systemMetrics.latency < 500 ? 70
      : systemMetrics.latency < 1000 ? 40
      : 10;
    const errorHealth = Math.max(0, 100 - systemMetrics.errorRate * 10);

    const score = Math.round(
      (cpuHealth + memoryHealth + latencyHealth + errorHealth) / 4 -
      openCriticalAlerts * 5 -
      openCriticalIncidents * 10,
    );

    const clamped = Math.max(0, Math.min(100, score));

    let status: HealthStatus["status"];
    if (clamped >= 80) status = "healthy";
    else if (clamped >= 50) status = "degraded";
    else if (clamped >= 25) status = "critical";
    else status = "down";

    // Build per-component check entries from alerts and incidents
    const checks: HealthCheck[] = [
      {
        component: "cpu",
        status: systemMetrics.cpu < 80 ? "healthy" : systemMetrics.cpu < 95 ? "degraded" : "down",
        value: systemMetrics.cpu,
        unit: "%",
        threshold: 80,
      },
      {
        component: "memory",
        status: systemMetrics.memory < 80 ? "healthy" : systemMetrics.memory < 95 ? "degraded" : "down",
        value: systemMetrics.memory,
        unit: "%",
        threshold: 80,
      },
      {
        component: "latency",
        status: systemMetrics.latency < 200 ? "healthy" : systemMetrics.latency < 1000 ? "degraded" : "down",
        value: systemMetrics.latency,
        unit: "ms",
        threshold: 200,
      },
      {
        component: "error_rate",
        status: systemMetrics.errorRate < 1 ? "healthy" : systemMetrics.errorRate < 5 ? "degraded" : "down",
        value: systemMetrics.errorRate,
        unit: "%",
        threshold: 1,
      },
    ];

    return {
      status,
      score: clamped,
      summary: openCriticalIncidents > 0
        ? `${openCriticalIncidents} critical incident(s) in progress — immediate attention required`
        : openCriticalAlerts > 0
          ? `${openCriticalAlerts} unresolved critical alert(s)`
          : "All systems nominal",
      checks,
    };
  }

  /**
   * Compute aggregated performance metrics with trend analysis.
   */
  private computePerformance(
    input: InfrastructureInput,
    _errorRates?: Record<string, number>,
  ): PerformanceMetrics {
    const { systemMetrics } = input;

    const perfScore = Math.round(
      (Math.max(0, 100 - systemMetrics.cpu) +
        Math.max(0, 100 - systemMetrics.memory) +
        (systemMetrics.latency < 200 ? 100 : systemMetrics.latency < 500 ? 70 : systemMetrics.latency < 1000 ? 40 : 10) +
        Math.max(0, 100 - systemMetrics.errorRate * 10)) / 4,
    );

    return {
      avgCpuUtilization: Math.round(systemMetrics.cpu * 0.85),
      peakCpuUtilization: systemMetrics.cpu,
      avgMemoryUtilization: Math.round(systemMetrics.memory * 0.9),
      peakMemoryUtilization: systemMetrics.memory,
      latencyMs: {
        p50: Math.round(systemMetrics.latency * 0.5),
        p95: Math.round(systemMetrics.latency * 1.5),
        p99: Math.round(systemMetrics.latency * 2),
      },
      errorRate: systemMetrics.errorRate,
      trend: perfScore >= 70 ? "stable" : perfScore >= 40 ? "degrading" : "degrading",
      performanceScore: perfScore,
    };
  }

  /**
   * Correlate alert history, incident reports, and deployment events into a
   * chronological timeline sorted newest-first.
   */
  private buildIncidentTimeline(input: InfrastructureInput): IncidentTimelineEntry[] {
    const entries: IncidentTimelineEntry[] = [];

    for (const alert of input.alertHistory) {
      entries.push({
        id: `alert-${alert.id}`,
        timestamp: alert.firedAt,
        type: "alert_fired",
        description: alert.title,
        severity: alert.severity,
        sourceId: alert.id,
      });
      if (alert.resolvedAt) {
        entries.push({
          id: `alert-resolved-${alert.id}`,
          timestamp: alert.resolvedAt,
          type: "alert_resolved",
          description: `${alert.title} — resolved`,
          severity: alert.severity,
          sourceId: alert.id,
        });
      }
    }

    for (const incident of input.incidentReports) {
      entries.push({
        id: `incident-${incident.id}`,
        timestamp: incident.detectedAt,
        type: "incident_detected",
        description: incident.title,
        severity: incident.severity === "sev0" ? "critical" : "warning",
        sourceId: incident.id,
      });
      if (incident.resolvedAt) {
        entries.push({
          id: `incident-resolved-${incident.id}`,
          timestamp: incident.resolvedAt,
          type: "incident_resolved",
          description: `${incident.title} — resolved after ${incident.timeToResolveMinutes ?? "?"}m`,
          severity: incident.severity === "sev0" ? "critical" : "warning",
          sourceId: incident.id,
        });
      }
    }

    for (const deployment of input.deploymentStatus) {
      const type = deployment.phase === "rolled_back"
        ? ("deployment_rolled_back" as const)
        : deployment.phase === "completed"
          ? ("deployment_completed" as const)
          : deployment.phase === "failed"
            ? ("deployment_started" as const)
            : ("deployment_started" as const);
      entries.push({
        id: `deploy-${deployment.id}`,
        timestamp: deployment.startedAt,
        type,
        description: `Deployment ${deployment.id} of ${deployment.service}@${deployment.version}: ${deployment.phase}`,
        severity: deployment.phase === "failed" || deployment.phase === "rolled_back"
          ? "critical" as const
          : "info" as const,
        sourceId: deployment.id,
      });
    }

    // Sort newest-first
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries;
  }

  /**
   * Generate scaling recommendations based on current utilisation and optional
   * deployment state context.
   */
  private generateScalingRecommendations(
    input: InfrastructureInput,
    _deploymentState?: Record<string, unknown>,
  ): ScalingRecommendation[] {
    const recommendations: ScalingRecommendation[] = [];
    const { systemMetrics, capacityThresholds } = input;

    const cpuThreshold = capacityThresholds?.cpuPercent ?? 80;
    const memThreshold = capacityThresholds?.memoryPercent ?? 80;
    const latThreshold = capacityThresholds?.maxLatencyMs ?? 500;

    // CPU-based recommendation
    if (systemMetrics.cpu > cpuThreshold) {
      recommendations.push({
        resource: "compute",
        action: "scale_out",
        reason: `CPU utilisation at ${systemMetrics.cpu}% exceeds threshold of ${cpuThreshold}%`,
        estimatedCostImpact: 250,
        priority: systemMetrics.cpu > 95 ? "critical" : "high",
        confidence: "high",
      });
    } else if (systemMetrics.cpu < 20) {
      recommendations.push({
        resource: "compute",
        action: "scale_in",
        reason: `CPU utilisation at ${systemMetrics.cpu}% is below 20% — consider rightsizing`,
        estimatedCostImpact: -180,
        priority: "medium",
        confidence: "medium",
      });
    }

    // Memory-based recommendation
    if (systemMetrics.memory > memThreshold) {
      recommendations.push({
        resource: "memory",
        action: "scale_up",
        reason: `Memory utilisation at ${systemMetrics.memory}% exceeds threshold of ${memThreshold}%`,
        estimatedCostImpact: 120,
        priority: systemMetrics.memory > 95 ? "critical" : "high",
        confidence: "high",
      });
    }

    // Latency-based recommendation
    if (systemMetrics.latency > latThreshold) {
      recommendations.push({
        resource: "application",
        action: "scale_out",
        reason: `Average latency ${systemMetrics.latency}ms exceeds threshold of ${latThreshold}ms — add instances to distribute load`,
        estimatedCostImpact: 300,
        priority: "high",
        confidence: "medium",
      });
    }

    // Error-rate based recommendation
    if (systemMetrics.errorRate > 5) {
      recommendations.push({
        resource: "application",
        action: "resize",
        reason: `Error rate at ${systemMetrics.errorRate}% requires investigation before scaling decisions`,
        estimatedCostImpact: 0,
        priority: "critical",
        confidence: "high",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        resource: "all",
        action: "no_change",
        reason: "All metrics within acceptable thresholds — no scaling action required",
        estimatedCostImpact: 0,
        priority: "low",
        confidence: "high",
      });
    }

    return recommendations;
  }

  /**
   * Produce a forward-looking capacity forecast by extrapolating current
   * utilisation trends.
   */
  private forecastCapacity(
    input: InfrastructureInput,
    metrics: PerformanceMetrics,
  ): CapacityForecast {
    const { systemMetrics } = input;

    const growthRate = 3.5; // % per month (baseline estimate)
    const windowMonths = 3;

    const projectedCpu = systemMetrics.cpu * (1 + (growthRate * windowMonths) / 100);
    const projectedMem = systemMetrics.memory * (1 + (growthRate * windowMonths) / 100);

    const cpuHeadroom = Math.round(100 - projectedCpu);
    const memHeadroom = Math.round(100 - projectedMem);

    // Estimate exhaustion: months until threshold breached
    const exhaustionThreshold = 85;
    const monthsUntilCpuExhaustion = cpuHeadroom <= 0
      ? 0
      : (exhaustionThreshold - systemMetrics.cpu) / growthRate;
    const monthsUntilMemExhaustion = memHeadroom <= 0
      ? 0
      : (exhaustionThreshold - systemMetrics.memory) / growthRate;

    const earliestExhaustion = Math.min(
      monthsUntilCpuExhaustion || Infinity,
      monthsUntilMemExhaustion || Infinity,
    );

    const exhaustionDate = earliestExhaustion < Infinity
      ? new Date(Date.now() + earliestExhaustion * 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const constrained = cpuHeadroom < memHeadroom ? "CPU" : "memory";

    return {
      forecastDate: new Date().toISOString(),
      window: "90d",
      projectedCpuHeadroom: cpuHeadroom,
      projectedMemoryHeadroom: memHeadroom,
      projectedDiskHeadroom: 75,
      growthRatePercent: growthRate,
      estimatedExhaustionDate: exhaustionDate,
      summary: exhaustionDate
        ? `${constrained} capacity projected to reach ${exhaustionThreshold}% threshold by approximately ${new Date(exhaustionDate).toLocaleDateString()}. Recommended to plan capacity addition within ${Math.round(earliestExhaustion)} months.`
        : `All resources have adequate headroom. ${constrained} is the most constrained resource at ${constrained === "CPU" ? cpuHeadroom : memHeadroom}% projected headroom over ${windowMonths} months.`,
    };
  }
}
