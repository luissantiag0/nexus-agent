// ============================================================================
// Nexus Agent Platform — @infrastructure-maintainer Execution Flow Examples
// ============================================================================
// This module documents three canonical execution patterns for the
// infrastructure-maintainer agent within the Agent Registry orchestrator:
//
//   1. Single Agent  — Direct invocation for health analysis
//   2. Chain         — Infrastructure issue triggers architecture remediation
//   3. Multi-Agent   — Incident report drives root-cause analysis
//
// Each flow includes typed context propagation, correlation IDs, and
// expected output structures.
// ============================================================================

import type {
  AgentInput,
  AgentOutput,
  AgentContext,
  ExecutionFlow,
} from "../types";
import type {
  InfrastructureMaintainerInput,
  InfrastructureMaintainerOutput,
  InfrastructureMaintainerContextKeys,
} from "../adapters/infrastructure-maintainer";

// ============================================================================
// FLOW 1: Single Agent — System Health Analysis
// ============================================================================
//
// Use case: Operations team needs a comprehensive health snapshot before
// a planned deployment window.
//
// Trigger: Scheduled cron job or manual ops request
// Agents:  @infrastructure-maintainer (standalone)
// Context: Reads infraHealth if available, writes comprehensive health report
// Output:  Exec summary + health report + recommendations

export const SINGLE_HEALTH_ANALYSIS_FLOW: ExecutionFlow = {
  id: "infrastructure-health-analysis.v1",
  type: "single",
  description:
    "Standalone infrastructure health analysis. The infrastructure-maintainer agent ingests current system metrics, deployment status, alert history, and incident reports, then produces a full health assessment with performance recommendations, scaling suggestions, and capacity forecast.",

  steps: [
    {
      sequence: 1,
      agentId: "support-infrastructure-maintainer",
      action: `Analyze system health, classify overall status (healthy/degraded/critical), identify performance bottlenecks, generate scaling suggestions, analyze incidents, propose config optimizations, and forecast capacity.`,
      inputContext: [],
      outputContext: [
        "infraHealth",
        "performanceMetrics",
        "incidentTimeline",
        "scalingRecommendations",
        "configProposals",
      ],
    },
  ],

  sharedContext: [
    "infraHealth",
    "performanceMetrics",
    "scalingRecommendations",
  ],

  expectedOutput: `InfrastructureHealthReport with per-service status breakdown, prioritized PerformanceRecommendation list, ScalingSuggestion per service with rationale, CapacityForecast with load growth projection, and executive summary.`,
};

// --------------------------------------------------------------------------
// Example: Single-Agent Invocation (for reference / testing)
// --------------------------------------------------------------------------

export function createSingleAgentInput(
  overrides?: Partial<InfrastructureMaintainerInput>,
): AgentInput<InfrastructureMaintainerInput> {
  return {
    targetAgent: "support-infrastructure-maintainer",
    correlationId: `health-single-${Date.now()}`,
    timestamp: Date.now(),
    source: "operations-scheduler",
    priority: "normal",
    payload: {
      systemMetrics: {
        cpuUtilizationPct: 72.5,
        memoryUtilizationPct: 81.3,
        latencyP50Ms: 45,
        latencyP95Ms: 180,
        latencyP99Ms: 420,
        requestRateRps: 1540,
        errorRatePct: 0.8,
        diskUsagePct: 67.2,
        networkInMbps: 310,
        networkOutMbps: 245,
        activeConnections: 230,
        queueDepth: 12,
      },
      deploymentStatus: [
        {
          serviceName: "web-api",
          currentVersion: "2.4.1",
          phase: "stable",
          healthStatus: "healthy",
          lastDeploymentTimestamp: Date.now() - 3_600_000,
        },
        {
          serviceName: "payment-svc",
          currentVersion: "1.9.8",
          phase: "canary",
          healthStatus: "degraded",
          lastDeploymentTimestamp: Date.now() - 900_000,
          canaryConfidence: 65,
        },
        {
          serviceName: "auth-service",
          currentVersion: "3.1.0",
          phase: "stable",
          healthStatus: "healthy",
          lastDeploymentTimestamp: Date.now() - 86_400_000,
        },
      ],
      alertHistory: [
        {
          alertId: "alert-cpu-001",
          severity: "warning",
          category: "performance",
          title: "High CPU on web-svc-01",
          description: "CPU utilization exceeded 80% for 5 minutes",
          timestamp: "2026-06-11T08:15:00Z",
          resolvedAt: "2026-06-11T08:45:00Z",
          affectedResource: "web-svc-01",
          triggerValue: 83.5,
          threshold: 80,
        },
        {
          alertId: "alert-mem-002",
          severity: "warning",
          category: "capacity",
          title: "Memory pressure on payment-svc",
          description: "Memory utilization at 87% on payment-svc canary instances",
          timestamp: "2026-06-11T09:00:00Z",
          affectedResource: "payment-svc",
          triggerValue: 87.2,
          threshold: 85,
        },
      ],
      configChanges: [
        {
          changeId: "cfg-001",
          targetResource: "web-api/connection_pool",
          changeType: "parameter_update",
          previousValue: "50",
          newValue: "100",
          initiatedBy: "auto-tuner",
          timestamp: "2026-06-10T22:00:00Z",
          approvalStatus: "auto",
        },
      ],
      scalingEvents: [
        {
          eventId: "scale-001",
          scalingGroupName: "payment-svc-asg",
          direction: "scale_up",
          delta: 2,
          instanceCountBefore: 4,
          instanceCountAfter: 6,
          reason: "Memory utilization above 85% threshold",
          timestamp: "2026-06-11T09:05:00Z",
        },
      ],
      incidentReports: [
        {
          incidentId: "inc-2026-06-10-001",
          severity: "SEV2",
          title: "Payment service degraded latency",
          timeline: [
            {
              timestamp: "2026-06-10T14:32:00Z",
              event: "P95 latency spiked to 3200ms on payment-svc",
              actor: "prometheus-alertmanager",
            },
            {
              timestamp: "2026-06-10T14:33:00Z",
              event: "Alert fired: HighLatency-payment-svc",
              actor: "alertmanager",
            },
            {
              timestamp: "2026-06-10T14:35:00Z",
              event: "Engineer acknowledged alert and began investigation",
              actor: "sre-oncall",
            },
            {
              timestamp: "2026-06-10T14:42:00Z",
              event: "Identified DB connection pool exhaustion from recent config change",
              actor: "sre-oncall",
            },
            {
              timestamp: "2026-06-10T14:45:00Z",
              event: "Rolled back connection pool config from 100 to 50",
              actor: "sre-oncall",
            },
            {
              timestamp: "2026-06-10T14:55:00Z",
              event: "Latency returned to normal (P95 < 200ms)",
              actor: "sre-oncall",
            },
          ],
          rootCauses: [
            "Connection pool size increase from 50 to 100 exhausted DB connections",
            "Canary deployment pushed config change without adequate canary analysis period",
          ],
          affectedServices: ["payment-svc", "web-api (downstream)"],
          impact: {
            downtimeMinutes: 23,
            usersAffected: 4500,
            errorBudgetConsumedPct: 3.2,
            financialImpactUsd: 12000,
          },
          resolution: [
            "Rolled back connection pool config to previous value",
            "Restarted affected payment-svc instances",
            "Verified all downstream services recovered",
          ],
          actionItems: [
            "Add connection pool change to canary analysis checklists",
            "Implement gradual connection pool scaling with max cap",
            "Add DB connection monitoring dashboard",
          ],
          startedAt: "2026-06-10T14:32:00Z",
          resolvedAt: "2026-06-10T14:55:00Z",
        },
      ],
      sloTargets: [
        { serviceName: "web-api", metric: "availability", targetPct: 99.95, windowDays: 30 },
        { serviceName: "web-api", metric: "latency_p99", targetPct: 500, windowDays: 30 },
        { serviceName: "payment-svc", metric: "availability", targetPct: 99.99, windowDays: 30 },
        { serviceName: "payment-svc", metric: "latency_p99", targetPct: 300, windowDays: 30 },
      ],
      capacityThresholds: {
        cpuScaleUpPct: 80,
        memoryScaleUpPct: 85,
        cpuScaleDownPct: 30,
        memoryScaleDownPct: 35,
        maxLatencyP99Ms: 500,
        maxErrorRatePct: 1.0,
        diskWarningPct: 80,
        diskCriticalPct: 90,
      },
      ...overrides,
    },
  };
}

// ============================================================================
// FLOW 2: Chain — Infrastructure Issue → Architecture Fix
// ============================================================================
//
// Use case: Infrastructure maintainer detects a systemic architectural issue
// (e.g., database connection pool exhaustion). It chains to the backend
// architect to design a permanent fix.
//
// Trigger: Alert fires → infrastructure maintainer identifies root cause
//          requires code/architecture change → chains to backend architect
// Agents:  @infrastructure-maintainer → @engineering-backend-architect
// Context: infrastructure-maintainer writes → backend-architect reads
// Output:  Infrastructure analysis + architectural remediation plan

export const CHAIN_INFRA_TO_ARCHITECT_FLOW: ExecutionFlow = {
  id: "infra-issue-to-arch-fix.v1",
  type: "chain",
  description:
    "Two-agent chain: infrastructure-maintainer identifies a systemic infrastructure issue during health analysis, then hands off to the backend-architect agent for a permanent architecture-level fix. The infra agent writes the incidentTimeline and scalingRecommendations context keys; the architect agent reads those to design the remediation.",

  steps: [
    {
      sequence: 1,
      agentId: "support-infrastructure-maintainer",
      action: `Analyze the current system metrics and incident reports. Identify the root cause of the payment-svc DB connection pool exhaustion incident. Produce an IncidentAnalysis with high-confidence root cause findings and write the incidentTimeline context key with all findings.`,
      inputContext: [],
      outputContext: [
        "infraHealth",
        "incidentTimeline",
        "performanceMetrics",
        "scalingRecommendations",
      ],
    },
    {
      sequence: 2,
      agentId: "engineering-backend-architect",
      action: `Read the incidentTimeline and scalingRecommendations from context. Design a permanent architecture fix for the DB connection pool exhaustion issue identified by infrastructure-maintainer. Produce a technical design document including: connection pooling strategy, circuit breaker pattern, gradual scaling algorithm, and canary analysis gate for config changes.`,
      inputContext: ["incidentTimeline", "scalingRecommendations", "infraHealth"],
      outputContext: [],
      condition: "context.data.incidentTimeline has root causes involving DB connection management",
    },
  ],

  sharedContext: [
    "infraHealth",
    "incidentTimeline",
    "scalingRecommendations",
  ],

  expectedOutput:
    "Step 1: IncidentAnalysis identifying DB connection pool config as root cause, with blast radius and recommendations. " +
    "Step 2: Technical architecture design from backend-architect including connection pool scaling algorithm, circuit breaker, and canary deployment gates.",
};

// --------------------------------------------------------------------------
// Example: Chain Flow Context Propagation
// --------------------------------------------------------------------------

/**
 * Creates the initial context for the chain flow.
 * The infra-health agent will populate the context keys that
 * the backend-architect reads.
 */
export function createChainFlowContext(): AgentContext {
  return {
    sessionId: `chain-infra-arch-${Date.now()}`,
    data: {
      // Initial context has limited data — infra-maintainer will populate
      infraHealth: null,
      incidentTimeline: null,
      scalingRecommendations: null,
    },
    audit: [],
    controls: {
      maxHops: 2,
      hopCount: 0,
      terminateAfter: false,
    },
  };
}

// ============================================================================
// FLOW 3: Multi-Agent — Incident Response → Root Cause Analysis
// ============================================================================
//
// Use case: A support ticket escalates to a SEV2 incident. The support
// responder triages and tags it for infrastructure analysis. The
// infrastructure maintainer performs deep root cause analysis and writes
// findings back to the shared context for the full incident report.
//
// Trigger: Customer reports service degradation via support ticket
// Agents:  @support-responder → @infrastructure-maintainer
// Context: support-responder writes incident summary →
//          infrastructure-maintainer reads and enriches with deep RCA
// Output:  Ticket → Incident Analysis → Remediation Plan → Summary Report
//
// This is a "multi-agent" flow because the two agents operate on the same
// shared context but with different specialized roles. The orchestrator
// ensures sequential execution.

export const MULTI_AGENT_INCIDENT_RESPONSE_FLOW: ExecutionFlow = {
  id: "incident-response-to-rca.v1",
  type: "multi-agent",
  description:
    "Multi-agent incident response: support-responder triages an incoming SEV2 customer complaint, enriches it with customer context and ticket history, then hands off to infrastructure-maintainer for deep root cause analysis using current system metrics, deployment status, and alert history. The infra agent writes the incidentTimeline and configProposals context keys, which the orchestrator uses to generate a comprehensive incident report.",

  steps: [
    {
      sequence: 1,
      agentId: "support-support-responder",
      action: `Receive and triage the incoming customer complaint about payment service degradation. Gather customer context, ticket history, and initial severity assessment. Write a structured incident summary to context. Determine if this requires infrastructure-level analysis based on the symptoms described.`,
      inputContext: [],
      outputContext: ["incidentTimeline"],
      condition: undefined,
    },
    {
      sequence: 2,
      agentId: "support-infrastructure-maintainer",
      action: `Read the incidentTimeline from Step 1. Cross-reference the customer-reported symptoms (high latency on payments) against current system metrics, deployment status, and alert history. Perform root cause analysis: identify whether the issue is caused by a recent config change, resource exhaustion, deployment regression, or external dependency. Produce IncidentAnalysis with confidence-rated root causes, contributing factors, blast radius, blameless post-mortem, and action items. Write findings back to incidentTimeline and configProposals.`,
      inputContext: ["incidentTimeline"],
      outputContext: [
        "infraHealth",
        "incidentTimeline",
        "performanceMetrics",
        "configProposals",
      ],
      condition: "Step 1 determined infrastructure-level investigation is required",
    },
  ],

  sharedContext: ["incidentTimeline", "infraHealth", "configProposals"],

  expectedOutput:
    "Step 1: support-responder writes a triaged incident summary with customer context, symptom description, and severity assessment. " +
    "Step 2: infrastructure-maintainer produces IncidentAnalysis with root causes, blast radius, contributing factors, action items, and a blameless post-mortem. Enriched incidentTimeline with infrastructure-level findings.",
};

// --------------------------------------------------------------------------
// Example: Multi-Agent Context with Incident Report Payload
// --------------------------------------------------------------------------

/**
 * Builds the input for the infrastructure maintainer in the multi-agent flow.
 * The support-responder has already triaged the incident and written the
 * timeline; this input includes the infrastructure data needed for RCA.
 */
export function createMultiAgentInput(
  incidentCorrelationId: string,
): AgentInput<InfrastructureMaintainerInput> {
  return {
    targetAgent: "support-infrastructure-maintainer",
    correlationId: incidentCorrelationId,
    timestamp: Date.now(),
    source: "support-support-responder",
    priority: "high",
    payload: {
      systemMetrics: {
        cpuUtilizationPct: 91.2,
        memoryUtilizationPct: 94.7,
        latencyP50Ms: 320,
        latencyP95Ms: 2800,
        latencyP99Ms: 5400,
        requestRateRps: 2100,
        errorRatePct: 4.7,
        diskUsagePct: 72.0,
        networkInMbps: 410,
        networkOutMbps: 380,
        activeConnections: 890,
        queueDepth: 156,
      },
      deploymentStatus: [
        {
          serviceName: "payment-svc",
          currentVersion: "1.9.9",
          phase: "rolling",
          healthStatus: "unhealthy",
          lastDeploymentTimestamp: Date.now() - 1_800_000,
        },
      ],
      alertHistory: [
        {
          alertId: "alert-latency-099",
          severity: "critical",
          category: "performance",
          title: "Critical latency spike on payment-svc",
          description: "P99 latency exceeded 2000ms for 3 minutes",
          timestamp: "2026-06-11T10:15:00Z",
          affectedResource: "payment-svc",
          triggerValue: 5400,
          threshold: 2000,
        },
        {
          alertId: "alert-error-023",
          severity: "critical",
          category: "availability",
          title: "Elevated error rate on payment-svc",
          description: "Error rate at 4.7% exceeds critical threshold of 1%",
          timestamp: "2026-06-11T10:16:00Z",
          affectedResource: "payment-svc",
          triggerValue: 4.7,
          threshold: 1.0,
        },
      ],
      configChanges: [
        {
          changeId: "cfg-042",
          targetResource: "payment-svc/db_max_connections",
          changeType: "parameter_update",
          previousValue: "50",
          newValue: "200",
          initiatedBy: "deployment-pipeline",
          timestamp: "2026-06-11T09:45:00Z",
          approvalStatus: "auto",
        },
      ],
      scalingEvents: [
        {
          eventId: "scale-042",
          scalingGroupName: "payment-svc-asg",
          direction: "scale_up",
          delta: 4,
          instanceCountBefore: 6,
          instanceCountAfter: 10,
          reason: "Error rate breach — emergency scaling",
          timestamp: "2026-06-11T10:17:00Z",
        },
      ],
      incidentReports: [
        {
          incidentId: "inc-2026-06-11-002",
          severity: "SEV1",
          title: "Payment service outage — elevated errors and latency",
          timeline: [
            {
              timestamp: "2026-06-11T10:12:00Z",
              event: "Customer reports failed payments via support chat",
              actor: "support-responder",
            },
            {
              timestamp: "2026-06-11T10:14:00Z",
              event: "Support ticket created, severity SEV2 (upgraded to SEV1 upon metric review)",
              actor: "support-responder",
            },
            {
              timestamp: "2026-06-11T10:15:00Z",
              event: "Alertmanager fires critical latency and error alerts",
              actor: "alertmanager",
            },
          ],
          rootCauses: [],
          affectedServices: ["payment-svc", "web-api", "order-svc"],
          impact: {
            downtimeMinutes: 8,
            usersAffected: 12000,
            errorBudgetConsumedPct: 12.5,
            financialImpactUsd: 45000,
          },
          resolution: [],
          actionItems: [],
          startedAt: "2026-06-11T10:12:00Z",
        },
      ],
      sloTargets: [
        { serviceName: "payment-svc", metric: "availability", targetPct: 99.99, windowDays: 30 },
        { serviceName: "payment-svc", metric: "error_rate", targetPct: 1.0, windowDays: 30 },
      ],
    },
  };
}

// ============================================================================
// Flow Registry — Canonical Flow Reference
// ============================================================================

/**
 * Registry of all canonical execution flows for the infrastructure-maintainer
 * agent. The orchestrator looks up flows by ID to understand agent chains
 * and context propagation requirements.
 */
export const INFRASTRUCTURE_MAINTAINER_FLOWS: Record<string, ExecutionFlow> = {
  "infrastructure-health-analysis.v1": SINGLE_HEALTH_ANALYSIS_FLOW,
  "infra-issue-to-arch-fix.v1": CHAIN_INFRA_TO_ARCHITECT_FLOW,
  "incident-response-to-rca.v1": MULTI_AGENT_INCIDENT_RESPONSE_FLOW,
};
