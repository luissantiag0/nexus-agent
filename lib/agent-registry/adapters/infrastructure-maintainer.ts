// ============================================================================
// Nexus Agent Platform — @infrastructure-maintainer Agent Adapter
// ============================================================================
// Agent ID: support-infrastructure-maintainer
// Prompt Version: infrastructure-maintainer.v1
// Domain: support
// Capabilities: infrastructure-monitoring, performance-analysis, capacity-planning,
//               cost-optimization, incident-analysis, config-management,
//               disaster-recovery, scaling-recommendation, report-generation,
//               alert-classification, slo-validation, trend-forecasting
// ============================================================================

import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentMetadata,
  AgentSchema,
  ValidationResult,
  ValidationRule,
} from "../types";

// ---------------------------------------------------------------------------
// AgentInput Schema
// ---------------------------------------------------------------------------

/**
 * Raw system metrics ingested from monitoring infrastructure
 * (Prometheus, CloudWatch, DataDog, etc.).
 */
export interface SystemMetrics {
  /** CPU utilization as percentage [0–100] */
  cpuUtilizationPct: number;
  /** Memory utilization as percentage [0–100] */
  memoryUtilizationPct: number;
  /** P50 latency in milliseconds */
  latencyP50Ms: number;
  /** P95 latency in milliseconds */
  latencyP95Ms: number;
  /** P99 latency in milliseconds */
  latencyP99Ms: number;
  /** Request rate (requests/second) */
  requestRateRps: number;
  /** Error rate as percentage of total requests [0–100] */
  errorRatePct: number;
  /** Disk usage as percentage [0–100] */
  diskUsagePct: number;
  /** Network inbound throughput (Mbps) */
  networkInMbps: number;
  /** Network outbound throughput (Mbps) */
  networkOutMbps: number;
  /** Active connection count */
  activeConnections: number;
  /** Queue depth (pending work items) */
  queueDepth: number;
}

/**
 * Deployment state for services under management.
 */
export interface DeploymentStatus {
  /** Service or deployment identifier */
  serviceName: string;
  /** Currently deployed version string */
  currentVersion: string;
  /** Target version if a deployment is in progress */
  targetVersion?: string;
  /** Deployment phase */
  phase: "stable" | "rolling" | "canary" | "blue-green" | "failed" | "rollback";
  /** Health of the deployment */
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  /** Timestamp of last successful deployment */
  lastDeploymentTimestamp: number;
  /** Deployment confidence score [0–100] if in canary */
  canaryConfidence?: number;
}

/**
 * A single alert or incident event.
 */
export interface AlertEvent {
  /** Unique alert ID */
  alertId: string;
  /** Alert severity classification */
  severity: "critical" | "warning" | "info";
  /** Alert category */
  category:
    | "availability"
    | "performance"
    | "capacity"
    | "security"
    | "cost"
    | "configuration"
    | "other";
  /** Brief alert title */
  title: string;
  /** Detailed description */
  description: string;
  /** ISO 8601 timestamp when the alert fired */
  timestamp: string;
  /** ISO 8601 timestamp when the alert was acknowledged */
  acknowledgedAt?: string;
  /** ISO 8601 timestamp when the alert was resolved */
  resolvedAt?: string;
  /** The affected service or resource */
  affectedResource: string;
  /** Metric value that triggered the alert */
  triggerValue?: number;
  /** Threshold that was breached */
  threshold?: number;
}

/**
 * Configuration change event tracked by the infrastructure.
 */
export interface ConfigChangeEvent {
  /** Change identifier */
  changeId: string;
  /** Service or resource whose config changed */
  targetResource: string;
  /** Type of change */
  changeType: "parameter_update" | "deployment" | "scaling" | "rollback" | "new_deployment";
  /** Previous config value (JSON-serialized) */
  previousValue: string;
  /** New config value (JSON-serialized) */
  newValue: string;
  /** Who or what initiated the change */
  initiatedBy: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Approval status */
  approvalStatus: "approved" | "pending" | "rejected" | "auto";
}

/**
 * A recorded auto-scaling event.
 */
export interface ScalingEvent {
  /** Scaling event ID */
  eventId: string;
  /** Scaling group / ASG name */
  scalingGroupName: string;
  /** Direction of the scaling action */
  direction: "scale_up" | "scale_down";
  /** Number of instances added or removed */
  delta: number;
  /** Instance count before the event */
  instanceCountBefore: number;
  /** Instance count after the event */
  instanceCountAfter: number;
  /** Reason for scaling */
  reason: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Structured incident report for post-mortem analysis.
 */
export interface IncidentReport {
  /** Unique incident identifier */
  incidentId: string;
  /** Incident severity */
  severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
  /** Incident title */
  title: string;
  /** Detailed timeline of events */
  timeline: IncidentTimelineEntry[];
  /** Identified root cause(s) */
  rootCauses: string[];
  /** Services or components affected */
  affectedServices: string[];
  /** Measured impact */
  impact: {
    /** Downtime in minutes */
    downtimeMinutes: number;
    /** Estimated number of users affected */
    usersAffected?: number;
    /** Error budget consumed as percentage */
    errorBudgetConsumedPct?: number;
    /** Estimated financial impact in dollars */
    financialImpactUsd?: number;
  };
  /** Actions taken to resolve */
  resolution: string[];
  /** Action items to prevent recurrence */
  actionItems: string[];
  /** ISO 8601 timestamps */
  startedAt: string;
  resolvedAt?: string;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  event: string;
  actor: string;
}

/**
 * Complete input payload for @infrastructure-maintainer.
 */
export interface InfrastructureMaintainerInput {
  /** Current system-wide metrics snapshot */
  systemMetrics: SystemMetrics;
  /** Current state of all deployments */
  deploymentStatus: DeploymentStatus[];
  /** Recent alert history (last N entries) */
  alertHistory: AlertEvent[];
  /** Recent configuration changes */
  configChanges: ConfigChangeEvent[];
  /** Recent scaling events */
  scalingEvents: ScalingEvent[];
  /** Open/post-mortem incident reports */
  incidentReports: IncidentReport[];
  /** SLO targets for the system */
  sloTargets?: SloTarget[];
  /** Capacity threshold overrides */
  capacityThresholds?: CapacityThresholds;
}

export interface SloTarget {
  /** Service or metric name */
  serviceName: string;
  /** SLO metric name */
  metric: string;
  /** Target value (e.g. 99.9) */
  targetPct: number;
  /** Compliance window in days */
  windowDays: number;
}

export interface CapacityThresholds {
  /** CPU threshold % for scale-up */
  cpuScaleUpPct?: number;
  /** Memory threshold % for scale-up */
  memoryScaleUpPct?: number;
  /** CPU threshold % for scale-down */
  cpuScaleDownPct?: number;
  /** Memory threshold % for scale-down */
  memoryScaleDownPct?: number;
  /** Max acceptable p99 latency in ms */
  maxLatencyP99Ms?: number;
  /** Max acceptable error rate % */
  maxErrorRatePct?: number;
  /** Disk warning threshold % */
  diskWarningPct?: number;
  /** Disk critical threshold % */
  diskCriticalPct?: number;
}

// ---------------------------------------------------------------------------
// AgentOutput Schema
// ---------------------------------------------------------------------------

/**
 * Comprehensive infrastructure health assessment.
 */
export interface InfrastructureHealthReport {
  /** Overall system health status */
  overallStatus: "healthy" | "degraded" | "critical" | "unknown";
  /** Per-service health breakdown */
  services: ServiceHealth[];
  /** Uptime percentage over the reporting window */
  uptimePct: number;
  /** Mean time to acknowledge (minutes) */
  mttaMinutes: number;
  /** Mean time to resolve (minutes) */
  mttrMinutes: number;
  /** Error budget remaining per SLO */
  errorBudgetRemaining: Record<string, number>;
}

export interface ServiceHealth {
  serviceName: string;
  status: "healthy" | "degraded" | "unhealthy";
  uptimePct: number;
  errorRatePct: number;
  avgLatencyMs: number;
}

/**
 * Actionable performance optimization recommendations.
 */
export interface PerformanceRecommendation {
  recommendations: RecommendationItem[];
}

export interface RecommendationItem {
  id: string;
  category: "compute" | "memory" | "storage" | "network" | "database" | "application" | "cost";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  /** Expected impact if implemented */
  expectedImpact: string;
  /** Effort estimate */
  effortEstimate: "minutes" | "hours" | "days" | "weeks";
  /** Link to relevant resources or runbooks */
  references?: string[];
}

/**
 * Scaling suggestions based on current and projected load.
 */
export interface ScalingSuggestion {
  services: ScalingServiceSuggestion[];
  globalForecast: CapacityForecast;
}

export interface ScalingServiceSuggestion {
  serviceName: string;
  currentInstances: number;
  recommendedInstances: number;
  direction: "scale_up" | "scale_down" | "no_change";
  rationale: string;
  urgency: "immediate" | "planned" | "monitor";
}

export interface CapacityForecast {
  /** Projected load growth over the forecast window */
  projectedLoadGrowthPct: number;
  /** Expected peak CPU in forecast window */
  forecastPeakCpuPct: number;
  /** Expected peak memory in forecast window */
  forecastPeakMemoryPct: number;
  /** Recommended buffer instances for headroom */
  recommendedBufferPct: number;
  /** Forecast confidence */
  confidence: "high" | "medium" | "low";
}

/**
 * Root cause analysis for an incident.
 */
export interface IncidentAnalysis {
  incidentId: string;
  title: string;
  severity: string;
  rootCausesIdentified: RootCause[];
  contributingFactors: string[];
  blastRadius: string[];
  recommendations: string[];
  blamelessPostMortem: string;
}

export interface RootCause {
  factor: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

/**
 * Configuration optimization proposals.
 */
export interface ConfigOptimizationProposal {
  proposals: ConfigProposal[];
}

export interface ConfigProposal {
  proposalId: string;
  targetResource: string;
  currentValue: string;
  proposedValue: string;
  rationale: string;
  risk: "low" | "medium" | "high";
  rollbackProcedure: string;
}

/**
 * Complete output payload from @infrastructure-maintainer.
 */
export interface InfrastructureMaintainerOutput {
  /** Generated health report */
  healthReport: InfrastructureHealthReport;
  /** Performance recommendations */
  performanceRecommendations: PerformanceRecommendation;
  /** Scaling suggestions */
  scalingSuggestions: ScalingSuggestion;
  /** Incident analyses */
  incidentAnalyses: IncidentAnalysis[];
  /** Config optimization proposals */
  configOptimizations: ConfigOptimizationProposal;
  /** Capacity forecast */
  capacityForecast: CapacityForecast;
  /** Summary suitable for dashboards or notifications */
  executiveSummary: string;
}

// ---------------------------------------------------------------------------
// AgentContext Keys
// ---------------------------------------------------------------------------

/**
 * Context keys managed by @infrastructure-maintainer.
 */
export type InfrastructureMaintainerContextKeys =
  | "infraHealth"
  | "performanceMetrics"
  | "incidentTimeline"
  | "scalingRecommendations"
  | "configProposals";

// ---------------------------------------------------------------------------
// Validation Rules
// ---------------------------------------------------------------------------

const METRIC_BOUNDARIES = {
  cpuUtilizationPct: { min: 0, max: 100 },
  memoryUtilizationPct: { min: 0, max: 100 },
  latencyP50Ms: { min: 0, max: 60_000 },
  latencyP95Ms: { min: 0, max: 60_000 },
  latencyP99Ms: { min: 0, max: 60_000 },
  errorRatePct: { min: 0, max: 100 },
  diskUsagePct: { min: 0, max: 100 },
};

/**
 * Metric boundary validation — ensures all numeric metrics fall within
 * physically / operationally possible ranges.
 */
function validateMetricBoundaries(
  metrics: SystemMetrics,
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const record = metrics as unknown as Record<string, unknown>;

  for (const [field, bounds] of Object.entries(METRIC_BOUNDARIES)) {
    const value = record[field];
    if (typeof value !== "number") {
      results.push({
        rule: "metric-boundary",
        passed: false,
        severity: "error",
        message: `Metric "${field}" must be a number, got ${typeof value}`,
        value,
      });
      continue;
    }
    if (value < bounds.min || value > bounds.max) {
      results.push({
        rule: "metric-boundary",
        passed: false,
        severity: "warning",
        message: `Metric "${field}" value ${value} is outside expected range [${bounds.min}, ${bounds.max}]`,
        value,
      });
    }
  }

  if (results.length === 0) {
    results.push({
      rule: "metric-boundary",
      passed: true,
      severity: "error",
      message: "All metric boundaries validated successfully",
    });
  }

  return results;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  warning: 3,
  info: 1,
};

/**
 * Alert severity classification — validates that severity labels follow
 * the expected taxonomy and checks for inconsistencies like a "info" alert
 * with extreme metric values.
 */
function validateAlertSeverity(
  alerts: AlertEvent[],
  systemMetrics: SystemMetrics,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const alert of alerts) {
    // Must be a known severity
    if (!(alert.severity in SEVERITY_ORDER)) {
      results.push({
        rule: "alert-severity",
        passed: false,
        severity: "error",
        message: `Alert "${alert.alertId}" has unknown severity "${alert.severity}". Must be one of: critical, warning, info`,
        value: alert.severity,
      });
      continue;
    }

    // Cross-check: if error rate is extreme but severity is "info", flag it
    if (
      alert.category === "availability" &&
      systemMetrics.errorRatePct > 10 &&
      alert.severity === "info"
    ) {
      results.push({
        rule: "alert-severity",
        passed: false,
        severity: "warning",
        message: `Alert "${alert.alertId}" classified as "info" but system error rate is ${systemMetrics.errorRatePct}% — possible severity misclassification`,
        value: { alertSeverity: alert.severity, systemErrorRate: systemMetrics.errorRatePct },
      });
    }
  }

  if (results.length === 0) {
    results.push({
      rule: "alert-severity",
      passed: true,
      severity: "error",
      message: "All alert severities are valid",
    });
  }

  return results;
}

/**
 * SLO compliance checking — verifies whether current metrics meet the
 * defined SLO targets.
 */
function validateSloCompliance(
  systemMetrics: SystemMetrics,
  sloTargets?: SloTarget[],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!sloTargets || sloTargets.length === 0) {
    results.push({
      rule: "slo-compliance",
      passed: true,
      severity: "warning",
      message: "No SLO targets defined — compliance check skipped",
    });
    return results;
  }

  // Derived SLO metrics
  const actualAvailability = 100 - systemMetrics.errorRatePct;
  const actualP99 = systemMetrics.latencyP99Ms;

  for (const slo of sloTargets) {
    let compliant = false;
    let actualValue = 0;

    switch (slo.metric) {
      case "availability":
        compliant = actualAvailability >= slo.targetPct;
        actualValue = actualAvailability;
        break;
      case "latency_p99":
        // targetPct for latency is the % of requests under the threshold
        // We approximate using the p99 value against a threshold assumption
        compliant = actualP99 <= slo.targetPct;
        actualValue = actualP99;
        break;
      case "error_rate":
        compliant = systemMetrics.errorRatePct <= slo.targetPct;
        actualValue = systemMetrics.errorRatePct;
        break;
      default:
        results.push({
          rule: "slo-compliance",
          passed: false,
          severity: "warning",
          message: `Unknown SLO metric "${slo.metric}" for service "${slo.serviceName}"`,
          value: slo,
        });
        continue;
    }

    const margin = compliant
      ? (actualValue - slo.targetPct).toFixed(2)
      : (slo.targetPct - actualValue).toFixed(2);

    results.push({
      rule: "slo-compliance",
      passed: compliant,
      severity: compliant ? "error" : "warning",
      message: compliant
        ? `SLO "${slo.metric}" for "${slo.serviceName}": ${actualValue.toFixed(2)}% (target ${slo.targetPct}%) — compliant by ${margin}`
        : `SLO "${slo.metric}" for "${slo.serviceName}": ${actualValue.toFixed(2)}% (target ${slo.targetPct}%) — non-compliant, deficit ${margin}`,
      value: {
        service: slo.serviceName,
        metric: slo.metric,
        actual: actualValue,
        target: slo.targetPct,
        compliant,
      },
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Default Thresholds
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS: Required<CapacityThresholds> = {
  cpuScaleUpPct: 80,
  memoryScaleUpPct: 85,
  cpuScaleDownPct: 30,
  memoryScaleDownPct: 35,
  maxLatencyP99Ms: 2000,
  maxErrorRatePct: 1.0,
  diskWarningPct: 80,
  diskCriticalPct: 90,
};

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const infrastructureMaintainerAdapter: AgentAdapter<
  InfrastructureMaintainerInput,
  InfrastructureMaintainerOutput,
  InfrastructureMaintainerContextKeys
> = {
  metadata: {
    id: "support-infrastructure-maintainer",
    name: "Infrastructure Maintainer",
    description:
      "Expert infrastructure specialist ensuring system reliability, performance optimization, and technical operations management. Monitors infrastructure health, analyzes incidents, recommends scaling and config changes, and forecasts capacity needs.",
    domain: "support",
    capabilities: [
      "infrastructure-monitoring",
      "performance-analysis",
      "capacity-planning",
      "cost-optimization",
      "incident-analysis",
      "config-management",
      "disaster-recovery",
      "scaling-recommendation",
      "report-generation",
      "alert-classification",
      "slo-validation",
      "trend-forecasting",
    ],
    version: "1.0.0",
    requirements: [
      {
        resource: "infrastructure_metrics_read",
        justification: "Requires read access to Prometheus, CloudWatch, or equivalent metrics stores to analyze system health.",
      },
      {
        resource: "deployment_status_read",
        justification: "Requires read access to deployment pipeline state (CI/CD, k8s, etc.) to assess rolling/blue-green/canary health.",
      },
      {
        resource: "alert_manager_read",
        justification: "Requires read access to alert history for trend analysis and severity classification.",
      },
    ],
    promptVersion: "infrastructure-maintainer.v1",
  },

  schema: {
    input: [
      { path: "systemMetrics", label: "System Metrics", description: "Current CPU, memory, latency, error rates, etc.", type: "object", required: true },
      { path: "deploymentStatus", label: "Deployment Status", description: "State of all service deployments", type: "array", required: true },
      { path: "alertHistory", label: "Alert History", description: "Recent alert events for trend analysis", type: "array", required: true },
      { path: "configChanges", label: "Config Changes", description: "Recent configuration change events", type: "array", required: true },
      { path: "scalingEvents", label: "Scaling Events", description: "Recent auto-scaling actions", type: "array", required: true },
      { path: "incidentReports", label: "Incident Reports", description: "Open and post-mortem incident reports", type: "array", required: true },
      { path: "sloTargets", label: "SLO Targets", description: "Service-level objective targets", type: "array", required: false },
      { path: "capacityThresholds", label: "Capacity Thresholds", description: "Overrides for default capacity alert thresholds", type: "object", required: false },
    ],
    output: [
      { path: "healthReport", label: "Health Report", description: "Comprehensive infrastructure health assessment", type: "object", required: true },
      { path: "performanceRecommendations", label: "Performance Recommendations", description: "Actionable optimizations for compute, memory, storage, network, database", type: "object", required: true },
      { path: "scalingSuggestions", label: "Scaling Suggestions", description: "Instance scaling recommendations per service", type: "object", required: true },
      { path: "incidentAnalyses", label: "Incident Analyses", description: "Root cause analysis for each incident", type: "array", required: true },
      { path: "configOptimizations", label: "Config Optimizations", description: "Proposed configuration changes with rationale and rollback", type: "object", required: true },
      { path: "capacityForecast", label: "Capacity Forecast", description: "Projected load growth and peak estimates", type: "object", required: true },
      { path: "executiveSummary", label: "Executive Summary", description: "One-paragraph summary for dashboards or notifications", type: "string", required: true },
    ],
    context: {
      reads: [
        { key: "infraHealth", description: "Current infrastructure health snapshot from prior monitoring agents", type: "object", required: false },
      ],
      writes: [
        { key: "infraHealth", description: "Updated infrastructure health assessment including service-by-service status", type: "object", required: true },
        { key: "performanceMetrics", description: "Key performance indicators and optimization targets", type: "object", required: true },
        { key: "incidentTimeline", description: "Timeline of all analyzed incidents with root causes", type: "array", required: true },
        { key: "scalingRecommendations", description: "Recommended scaling actions per service", type: "object", required: true },
        { key: "configProposals", description: "Configuration change proposals with rollback plans", type: "array", required: true },
      ],
    },
    validation: [
      {
        rule: "metric-boundary",
        description: "All system metrics must be within physically valid ranges",
        severity: "warning",
        validate: (input: unknown) => {
          const cast = input as AgentInput<InfrastructureMaintainerInput>;
          const results = validateMetricBoundaries(cast.payload.systemMetrics);
          return results.every((r) => r.passed);
        },
        errorMessage: "One or more system metrics fall outside valid operational ranges",
      },
      {
        rule: "alert-severity",
        description: "Alert severity must follow the critical/warning/info taxonomy and be consistent with metric values",
        severity: "warning",
        validate: (input: unknown) => {
          const cast = input as AgentInput<InfrastructureMaintainerInput>;
          const results = validateAlertSeverity(cast.payload.alertHistory, cast.payload.systemMetrics);
          return results.every((r) => r.passed);
        },
        errorMessage: "Alert severity classification inconsistencies detected",
      },
      {
        rule: "slo-compliance",
        description: "Current metrics must meet defined SLO targets",
        severity: "warning",
        validate: (input: unknown) => {
          const cast = input as AgentInput<InfrastructureMaintainerInput>;
          const results = validateSloCompliance(cast.payload.systemMetrics, cast.payload.sloTargets);
          return results.every((r) => r.passed);
        },
        errorMessage: "One or more SLO targets are not being met by current metrics",
      },
    ] as ValidationRule[],
  },

  validateInput(input: unknown): asserts input is AgentInput<InfrastructureMaintainerInput> {
    const cast = input as Partial<AgentInput<InfrastructureMaintainerInput>>;

    if (!cast || typeof cast !== "object") {
      throw new Error("Input must be a non-null object");
    }
    if (typeof cast.targetAgent !== "string") {
      throw new Error("Input must contain a targetAgent string");
    }
    if (!cast.payload || typeof cast.payload !== "object") {
      throw new Error("Input must contain a payload object");
    }
    if (typeof cast.payload.systemMetrics !== "object" || cast.payload.systemMetrics === null) {
      throw new Error("Input payload must contain systemMetrics object");
    }
    if (!Array.isArray(cast.payload.deploymentStatus)) {
      throw new Error("Input payload must contain deploymentStatus array");
    }
    if (!Array.isArray(cast.payload.alertHistory)) {
      throw new Error("Input payload must contain alertHistory array");
    }

    // Run metric boundary validation
    const metricResults = validateMetricBoundaries(cast.payload.systemMetrics!);
    const metricFailures = metricResults.filter((r) => !r.passed);
    if (metricFailures.length > 0) {
      throw new Error(
        `Metric validation failed:\n${metricFailures.map((r) => `  - ${r.message}`).join("\n")}`,
      );
    }
  },

  validateContext(context: AgentContext): ValidationResult[] {
    const results: ValidationResult[] = [];
    const expectedKeys = ["infraHealth", "performanceMetrics"];

    for (const key of expectedKeys) {
      if (!(key in context.data)) {
        results.push({
          rule: "context-key-required",
          passed: false,
          severity: "warning",
          message: `Expected context key "${key}" not found. Some features may degrade gracefully.`,
        });
      }
    }

    if (results.length === 0) {
      results.push({
        rule: "context-key-required",
        passed: true,
        severity: "error",
        message: "All required context keys present",
      });
    }

    return results;
  },

  async execute(
    input: AgentInput<InfrastructureMaintainerInput>,
    context: AgentContext,
  ): Promise<AgentOutput<InfrastructureMaintainerOutput>> {
    const startTime = Date.now();

    // ---- validation phase ----
    this.validateInput(input);
    const contextValidation = this.validateContext(context);

    const metricValidation = validateMetricBoundaries(input.payload.systemMetrics);
    const severityValidation = validateAlertSeverity(input.payload.alertHistory, input.payload.systemMetrics);
    const sloValidation = validateSloCompliance(input.payload.systemMetrics, input.payload.sloTargets);

    const allValidations = [
      ...metricValidation,
      ...severityValidation,
      ...sloValidation,
      ...contextValidation,
    ];

    // ---- analysis phase ----
    const thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...(input.payload.capacityThresholds ?? {}),
    };

    // Health assessment
    const healthReport = analyzeHealth(input.payload, thresholds);
    const performanceRecommendations = generateRecommendations(input.payload, thresholds);
    const scalingSuggestions = generateScalingSuggestions(input.payload, thresholds);
    const incidentAnalyses = analyzeIncidents(input.payload.incidentReports);
    const configOptimizations = generateConfigProposals(input.payload.configChanges);
    const capacityForecast = forecastCapacity(input.payload);

    // ---- build output ----
    const output: InfrastructureMaintainerOutput = {
      healthReport,
      performanceRecommendations,
      scalingSuggestions,
      incidentAnalyses,
      configOptimizations,
      capacityForecast,
      executiveSummary: buildExecutiveSummary(healthReport, scalingSuggestions, sloValidation),
    };

    // ---- write context ----
    context.data["infraHealth"] = healthReport;
    context.data["performanceMetrics"] = {
      cpuAvg: input.payload.systemMetrics.cpuUtilizationPct,
      memoryAvg: input.payload.systemMetrics.memoryUtilizationPct,
      latencyP99: input.payload.systemMetrics.latencyP99Ms,
      errorRate: input.payload.systemMetrics.errorRatePct,
      recommendations: performanceRecommendations.recommendations.length,
    };
    context.data["incidentTimeline"] = incidentAnalyses.map((ia) => ({
      incidentId: ia.incidentId,
      rootCauses: ia.rootCausesIdentified,
      severity: ia.severity,
      timestamp: input.payload.incidentReports.find((r) => r.incidentId === ia.incidentId)?.startedAt,
    }));
    context.data["scalingRecommendations"] = scalingSuggestions.services;
    context.data["configProposals"] = configOptimizations.proposals;

    context.audit.push({
      agentId: "support-infrastructure-maintainer",
      action: "execute",
      timestamp: Date.now(),
      summary: output.executiveSummary,
    });

    // ---- determine overall status ----
    const hasFailures = allValidations.some((v) => !v.passed && v.severity === "error");
    const hasWarnings = allValidations.some((v) => !v.passed && v.severity === "warning");

    return {
      sourceAgent: "support-infrastructure-maintainer",
      payload: output,
      correlationId: input.correlationId,
      timestamp: Date.now(),
      processingTimeMs: Date.now() - startTime,
      status: hasFailures ? "failure" : hasWarnings ? "partial" : "success",
      summary: output.executiveSummary,
      warnings: allValidations
        .filter((v) => !v.passed)
        .map((v) => ({
          code: v.rule,
          message: v.message,
          severity: v.severity === "error" ? "error" : "warning",
        })),
      validation: allValidations,
    };
  },
};

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzeHealth(
  input: InfrastructureMaintainerInput,
  thresholds: Required<CapacityThresholds>,
): InfrastructureHealthReport {
  const { systemMetrics: m, deploymentStatus: d } = input;

  const services = d.map((dep) => {
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (dep.healthStatus === "unhealthy" || dep.phase === "failed") status = "unhealthy";
    else if (dep.healthStatus === "degraded") status = "degraded";

    return {
      serviceName: dep.serviceName,
      status,
      uptimePct: dep.healthStatus === "healthy" ? 99.95 : dep.healthStatus === "degraded" ? 99.5 : 95.0,
      errorRatePct: m.errorRatePct,
      avgLatencyMs: m.latencyP50Ms,
    };
  });

  // Overall status
  const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;

  let overallStatus: "healthy" | "degraded" | "critical" | "unknown";
  if (unhealthyCount > 0) overallStatus = "critical";
  else if (degradedCount > 0) overallStatus = "degraded";
  else if (m.errorRatePct > thresholds.maxErrorRatePct) overallStatus = "degraded";
  else overallStatus = "healthy";

  return {
    overallStatus,
    services,
    uptimePct: 100 - m.errorRatePct,
    mttaMinutes: 5, // placeholder — would come from actual tracking
    mttrMinutes: 45, // placeholder — would come from actual tracking
    errorBudgetRemaining: {},
  };
}

function generateRecommendations(
  input: InfrastructureMaintainerInput,
  thresholds: Required<CapacityThresholds>,
): PerformanceRecommendation {
  const { systemMetrics: m } = input;
  const recommendations: RecommendationItem[] = [];

  // CPU high
  if (m.cpuUtilizationPct > thresholds.cpuScaleUpPct) {
    recommendations.push({
      id: "cpu-high",
      category: "compute",
      priority: "high",
      title: "High CPU Utilization",
      description: `CPU at ${m.cpuUtilizationPct}% exceeds scale-up threshold of ${thresholds.cpuScaleUpPct}%. Consider adding compute capacity or optimizing workloads.`,
      expectedImpact: "Reduce CPU below 70%, improve p99 latency",
      effortEstimate: "hours",
    });
  }

  // Memory high
  if (m.memoryUtilizationPct > thresholds.memoryScaleUpPct) {
    recommendations.push({
      id: "memory-high",
      category: "memory",
      priority: "high",
      title: "High Memory Pressure",
      description: `Memory at ${m.memoryUtilizationPct}% exceeds threshold of ${thresholds.memoryScaleUpPct}%. Evaluate memory leaks or scale up instance size.`,
      expectedImpact: "Prevent OOM kills, reduce swap usage",
      effortEstimate: "hours",
    });
  }

  // Latency high
  if (m.latencyP99Ms > thresholds.maxLatencyP99Ms) {
    recommendations.push({
      id: "latency-high",
      category: "application",
      priority: "critical",
      title: "Elevated P99 Latency",
      description: `P99 latency at ${m.latencyP99Ms}ms exceeds SLO of ${thresholds.maxLatencyP99Ms}ms. Profile slow endpoints, check DB query performance, or add caching.`,
      expectedImpact: "Restore latency SLO compliance",
      effortEstimate: "hours",
    });
  }

  // Error rate high
  if (m.errorRatePct > thresholds.maxErrorRatePct) {
    recommendations.push({
      id: "error-rate-high",
      category: "application",
      priority: "critical",
      title: "Elevated Error Rate",
      description: `Error rate at ${m.errorRatePct}% exceeds threshold of ${thresholds.maxErrorRatePct}%. Investigate recent deployments, upstream dependencies, and error logs.`,
      expectedImpact: "Restore error budget, reduce user-impacting failures",
      effortEstimate: "hours",
    });
  }

  // Disk high
  if (m.diskUsagePct > thresholds.diskCriticalPct) {
    recommendations.push({
      id: "disk-critical",
      category: "storage",
      priority: "critical",
      title: "Critical Disk Space",
      description: `Disk at ${m.diskUsagePct}% exceeds critical threshold of ${thresholds.diskCriticalPct}%. Immediate cleanup or volume expansion required.`,
      expectedImpact: "Prevent service downtime due to disk-full conditions",
      effortEstimate: "minutes",
    });
  } else if (m.diskUsagePct > thresholds.diskWarningPct) {
    recommendations.push({
      id: "disk-warning",
      category: "storage",
      priority: "medium",
      title: "Disk Space Warning",
      description: `Disk at ${m.diskUsagePct}% nearing warning threshold of ${thresholds.diskWarningPct}%. Plan cleanup or expansion.`,
      expectedImpact: "Prevent escalation to critical disk condition",
      effortEstimate: "hours",
    });
  }

  return { recommendations };
}

function generateScalingSuggestions(
  input: InfrastructureMaintainerInput,
  thresholds: Required<CapacityThresholds>,
): ScalingSuggestion {
  const services: ScalingServiceSuggestion[] = input.deploymentStatus.map((dep) => {
    // This is a simplified heuristic — real implementation would use
    // historical metrics, trend analysis, and per-service auto-scaling configs.
    const cpuHigh = input.systemMetrics.cpuUtilizationPct > thresholds.cpuScaleUpPct;
    const cpuLow = input.systemMetrics.cpuUtilizationPct < thresholds.cpuScaleDownPct;
    const memHigh = input.systemMetrics.memoryUtilizationPct > thresholds.memoryScaleUpPct;
    const memLow = input.systemMetrics.memoryUtilizationPct < thresholds.memoryScaleDownPct;

    let direction: "scale_up" | "scale_down" | "no_change";
    let urgency: "immediate" | "planned" | "monitor";
    let rationale: string;

    if (cpuHigh || memHigh) {
      direction = "scale_up";
      urgency = "immediate";
      rationale = `${cpuHigh ? `CPU at ${input.systemMetrics.cpuUtilizationPct}%` : ""}${cpuHigh && memHigh ? " and " : ""}${memHigh ? `Memory at ${input.systemMetrics.memoryUtilizationPct}%` : ""} above scale-up threshold`;
    } else if (cpuLow && memLow) {
      direction = "scale_down";
      urgency = "planned";
      rationale = `Both CPU (${input.systemMetrics.cpuUtilizationPct}%) and Memory (${input.systemMetrics.memoryUtilizationPct}%) below scale-down thresholds — opportunity for cost savings`;
    } else {
      direction = "no_change";
      urgency = "monitor";
      rationale = "Current utilization within normal operating range";
    }

    return {
      serviceName: dep.serviceName,
      currentInstances: 4, // placeholder
      recommendedInstances: direction === "scale_up" ? 6 : direction === "scale_down" ? 3 : 4,
      direction,
      rationale,
      urgency,
    };
  });

  return {
    services,
    globalForecast: forecastCapacity(input),
  };
}

function analyzeIncidents(incidents: IncidentReport[]): IncidentAnalysis[] {
  return incidents.map((inc) => ({
    incidentId: inc.incidentId,
    title: inc.title,
    severity: inc.severity,
    rootCausesIdentified: inc.rootCauses.map((cause) => ({
      factor: cause,
      confidence: "medium" as const,
      evidence: [`Found in incident report: ${inc.incidentId}`],
    })),
    contributingFactors: inc.timeline
      .filter((t) => t.event.toLowerCase().includes("delay") || t.event.toLowerCase().includes("missed"))
      .map((t) => t.event),
    blastRadius: inc.affectedServices,
    recommendations: inc.actionItems,
    blamelessPostMortem: `Incident ${inc.incidentId} (${inc.severity}): ${inc.title}. Impact: ${inc.impact.downtimeMinutes} minutes downtime. Root causes identified: ${inc.rootCauses.join(", ")}. Resolution: ${inc.resolution.join("; ")}.`,
  }));
}

function generateConfigProposals(changes: ConfigChangeEvent[]): ConfigOptimizationProposal {
  const proposals: ConfigProposal[] = changes
    .filter((c) => c.approvalStatus === "pending" || c.approvalStatus === "auto")
    .map((c) => ({
      proposalId: `config-${c.changeId}`,
      targetResource: c.targetResource,
      currentValue: c.previousValue,
      proposedValue: c.newValue,
      rationale: `Change initiated by ${c.initiatedBy} — ${c.changeType} on ${c.targetResource}`,
      risk: c.changeType === "parameter_update" ? "low" : c.changeType === "scaling" ? "medium" : "high",
      rollbackProcedure: `Revert ${c.targetResource} to previous value: ${c.previousValue}`,
    }));

  return { proposals };
}

function forecastCapacity(input: InfrastructureMaintainerInput): CapacityForecast {
  const m = input.systemMetrics;
  // Simplified linear extrapolation — real implementation would use
  // time-series forecasting (e.g., ARIMA, Prophet).
  const loadGrowthPct = Math.max(0, (m.cpuUtilizationPct * 0.1).toFixed(1) as unknown as number);

  return {
    projectedLoadGrowthPct: loadGrowthPct,
    forecastPeakCpuPct: Math.min(100, m.cpuUtilizationPct * 1.2),
    forecastPeakMemoryPct: Math.min(100, m.memoryUtilizationPct * 1.15),
    recommendedBufferPct: 20,
    confidence: m.cpuUtilizationPct > 60 ? "high" : m.cpuUtilizationPct > 30 ? "medium" : "low",
  };
}

function buildExecutiveSummary(
  health: InfrastructureHealthReport,
  scaling: ScalingSuggestion,
  sloResults: ValidationResult[],
): string {
  const sloBreaches = sloResults.filter((r) => !r.passed);
  const scalingActions = scaling.services.filter((s) => s.direction !== "no_change");

  const parts: string[] = [
    `Infrastructure status: ${health.overallStatus.toUpperCase()}.`,
    `${health.services.length} services monitored, ${health.services.filter((s) => s.status !== "healthy").length} with degraded or unhealthy status.`,
    `Uptime: ${health.uptimePct.toFixed(2)}%.`,
  ];

  if (sloBreaches.length > 0) {
    parts.push(`${sloBreaches.length} SLO breach(es) detected.`);
  }

  if (scalingActions.length > 0) {
    const up = scalingActions.filter((s) => s.direction === "scale_up").length;
    const down = scalingActions.filter((s) => s.direction === "scale_down").length;
    parts.push(`Recommending ${up} scale-up(s) and ${down} scale-down(s).`);
  }

  return parts.join(" ");
}
