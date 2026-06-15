// ============================================================================
// Example Workflows — Execution Engine v2 Primitive Demonstrations
// ============================================================================
// This file contains comprehensive example workflow definitions that
// demonstrate the full set of Execution Engine v2 primitives available
// in the WorkflowDefinition (user-facing) format.
//
// Primitives demonstrated:
//   - Agent nodes         (type: "agent")         — single agent invocation
//   - Conditional routers (type: "router")         — decision/branching nodes
//   - Parallel forks      (type: "parallel")       — fan-out execution
//   - Synchronizers       (type: "synchronizer")    — join parallel branches
//   - Conditional edges   (conditional_true/false)  — runtime-evaluated gates
//   - Edge conditions     (ComparisonCondition)     — structured conditions
//
// Each example includes:
//   1. ASCII art DAG diagram
//   2. Description of the workflow purpose
//   3. Expected execution order
//   4. Condition/routing logic explanation
//   5. A complete WorkflowDefinition object
//
// Usage:
//   import { createContentMarketingQualityGate } from "./examples/example-workflows";
//   const def = createContentMarketingQualityGate();
//   const result = compileToGraph(def);
//   const levels = buildExecutionPlan(result.graph!);
// ============================================================================

import type {
  WorkflowDefinition,
  WorkflowMeta,
  GraphDefinition,
  AgentNodeDefinition,
  ConditionalRouterDefinition,
  ParallelForkDefinition,
  SynchronizerDefinition,
  EdgeDefinition,
  ComparisonCondition,
  ComparisonOperator,
  MergeStrategyDefinition,
} from "../workflow-definition";

// ============================================================================
// EXAMPLE 1: Content Marketing with Conditional Quality Gate
// ============================================================================
// Demonstrates: agent node + conditional router + conditional edges
//
// DAG:
//   [Trend Researcher]
//          |
//          v
//   [Quality Gate]  (ConditionalRouter)
//      /        \
//     /          \
//    v            v
// [SEO Specialist] [Content Creator]
//    |              |
//    +------>-------+
//                  |
//                  v
//              (END)
//
// Description:
//   A Trend Researcher produces research data including a quality score.
//   The Quality Gate router evaluates content.qualityScore:
//     - IF qualityScore < 0.7 → route to SEO Specialist for optimization
//     - IF qualityScore >= 0.7 → route directly to Content Creator
//   After SEO optimization, the SEO Specialist passes results to
//   Content Creator for final content production.
//
// Expected execution order:
//   1. trend-researcher (agent)
//   2. quality-gate (router — evaluates qualityScore)
//   3a. seo-specialist (agent, only if qualityScore < 0.7)
//   3b. content-creator (agent, only if qualityScore >= 0.7)
//   4. (if seo-specialist ran) content-creator (agent)
//
// Routing logic:
//   The router uses a ComparisonCondition on context path
//   "research.qualityScore" with operator "lt" and value 0.7.
//   Route key "low_quality" maps next to seo-specialist.
//   Route key "high_quality" maps next to content-creator.
//   Conditional edges from the router reinforce which edges are
//   activated per route outcome.
// ============================================================================

export function createContentMarketingQualityGate(): WorkflowDefinition {
  const workflowMeta: WorkflowMeta = {
    id: "example-content-marketing-quality-gate",
    name: "Content Marketing with Quality Gate",
    version: "1.0.0",
    description:
      "Trend Researcher produces research with a quality score, " +
      "then a ConditionalRouter gates on qualityScore: low quality " +
      "routes to SEO Specialist for optimization before Content " +
      "Creator; high quality routes directly to Content Creator.",
    owner: "workflow-architect",
    slaTargetSeconds: 180,
    severity: "medium",
    tags: ["example", "content-marketing", "conditional-routing"],
    created: "2026-06-15",
    modified: "2026-06-15",
  };

  const qualityGateCondition: ComparisonCondition = {
    path: "research.qualityScore",
    operator: "lt" as ComparisonOperator,
    value: 0.7,
    label: "qualityScore < 0.7 → needs SEO optimization",
  };

  const nodes: GraphDefinition["nodes"] = {
    "trend-researcher": {
      type: "agent",
      agent: "trend-researcher",
      label: "Trend Researcher",
      description:
        "Researches trending topics, audience interests, and market " +
        "signals. Produces a qualityScore that rates topic viability.",
      instruction:
        "Research current trends in the given industry and target " +
        "audience. Return a ranked list of topics with a qualityScore " +
        "(0.0–1.0) indicating topic viability.",
      inputs: [
        { from: "campaign.brief", to: "brief", required: true },
        { from: "market.industry", to: "industry", required: true },
        { from: "audience.segment", to: "targetAudience", required: true },
      ],
      outputs: [
        { from: "trends", to: "research.trends" },
        { from: "topics", to: "research.topics" },
        { from: "qualityScore", to: "research.qualityScore" },
        { from: "audienceInsights", to: "research.audienceInsights" },
      ],
      policy: {
        retry: "limited",
        maxRetries: 2,
        backoffBaseMs: 1000,
        backoffMaxMs: 10000,
        onPermanentFailure: "abort",
      },
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "quality-gate": {
      type: "router",
      label: "Quality Gate",
      description:
        "Evaluates the content quality score from Trend Researcher. " +
        "Routes to SEO Specialist if score < 0.7 (needs optimization), " +
        "or directly to Content Creator if score >= 0.7.",
      condition: qualityGateCondition,
      routes: {
        low_quality: {
          next: "seo-specialist",
          contextTransform: [
            {
              type: "template",
              params: {
                template: "Optimize this content: qualityScore = {{research.qualityScore}}",
              },
            },
          ],
        },
        high_quality: {
          next: "content-creator",
          contextTransform: [
            {
              type: "template",
              params: {
                template: "Quality score is {{research.qualityScore}} — proceed directly to content creation",
              },
            },
          ],
        },
      },
      defaultRoute: {
        next: "content-creator",
      },
    } satisfies ConditionalRouterDefinition,

    "seo-specialist": {
      type: "agent",
      agent: "seo-specialist",
      label: "SEO Specialist",
      description:
        "Analyzes low-quality research and performs SEO optimization: " +
        "keyword research, content gap analysis, and optimization tips " +
        "to improve the content quality score.",
      instruction:
        "The research topics have a low quality score. Perform SEO " +
        "optimization: identify high-value keywords, analyze content " +
        "gaps, and provide actionable optimization tips to improve " +
        "quality and search ranking.",
      inputs: [
        { from: "research.topics", to: "topics", required: true },
        { from: "research.trends", to: "trends" },
        { from: "research.qualityScore", to: "currentQualityScore" },
        { from: "campaign.targetKeywords", to: "targetKeywords" },
      ],
      outputs: [
        { from: "keywords", to: "seo.keywords" },
        { from: "searchVolume", to: "seo.searchVolume" },
        { from: "contentGaps", to: "seo.contentGaps" },
        { from: "optimizationTips", to: "seo.optimizationTips" },
      ],
      policy: {
        retry: "limited",
        maxRetries: 3,
        backoffBaseMs: 2000,
        backoffMaxMs: 30000,
        onPermanentFailure: "abort",
      },
      timeoutMs: 45_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,

    "content-creator": {
      type: "agent",
      agent: "content-creator",
      label: "Content Creator",
      description:
        "Produces the final written content. If SEO Specialist ran " +
        "first, consumes their keyword and optimization data. Otherwise " +
        "uses only the raw research data.",
      instruction:
        "Produce high-quality written content based on the research " +
        "topics and any SEO optimization data available. Follow the " +
        "specified tone and format. Deliver a polished final piece.",
      inputs: [
        { from: "research.topics", to: "topics", required: true },
        { from: "research.trends", to: "trends" },
        { from: "research.audienceInsights", to: "audienceInsights" },
        { from: "seo.keywords", to: "keywords", required: false },
        { from: "seo.optimizationTips", to: "optimizationTips", required: false },
        { from: "seo.contentGaps", to: "contentGaps", required: false },
        { from: "campaign.tone", to: "tone" },
        { from: "campaign.format", to: "format" },
      ],
      outputs: [
        { from: "content", to: "content.body" },
        { from: "headline", to: "content.headline" },
        { from: "qualityScore", to: "content.finalQualityScore" },
      ],
      policy: {
        retry: "limited",
        maxRetries: 3,
        backoffBaseMs: 2000,
        backoffMaxMs: 30000,
        onPermanentFailure: "abort",
      },
      timeoutMs: 60_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,
  };

  const edges: EdgeDefinition[] = [
    // Sequential: Trend Researcher → Quality Gate
    {
      from: "trend-researcher",
      to: "quality-gate",
      type: "sequential",
      label: "research results → evaluate quality",
    },
    // Conditional: Quality Gate → SEO Specialist (qualityScore < 0.7 → low quality)
    {
      from: "quality-gate",
      to: "seo-specialist",
      type: "conditional_true",
      condition: qualityGateCondition,
      label: "qualityScore < 0.7 → optimize",
    },
    // Conditional: Quality Gate → Content Creator (qualityScore >= 0.7 → high quality)
    {
      from: "quality-gate",
      to: "content-creator",
      type: "conditional_false",
      condition: qualityGateCondition,
      label: "qualityScore >= 0.7 → create directly",
    },
    // Sequential: SEO Specialist → Content Creator (after optimization)
    {
      from: "seo-specialist",
      to: "content-creator",
      type: "sequential",
      label: "optimized keywords → final content",
    },
  ];

  const graph: GraphDefinition = {
    startAt: "trend-researcher",
    nodes,
    edges,
    defaultPolicy: {
      retry: "limited",
      maxRetries: 2,
      backoffBaseMs: 1000,
      backoffMaxMs: 15000,
      backoffMultiplier: 2,
      jitter: true,
      onPermanentFailure: "abort",
    },
  };

  return {
    $schema: "https://nexus-agent.io/schemas/workflow-v2.schema.json",
    workflow: workflowMeta,
    graph,
  };
}

// ============================================================================
// EXAMPLE 2: Parallel Research with Synchronization
// ============================================================================
// Demonstrates: agent node + parallel fork + synchronizer + merge strategy
//
// DAG:
//   [PARALLEL FORK]
//     /         \
//    v           v
// [Trend Researcher] [SEO Specialist]
//    |                 |
//    +-------++--------+
//            |
//         [SYNCHRONIZER]
//            |
//            v
//     [Content Creator]
//            |
//            v
//         (END)
//
// Description:
//   Trend Researcher and SEO Specialist execute IN PARALLEL.
//   A Synchronizer node waits for both to complete, then merges
//   their results using the "merge_all" strategy (namespaced).
//   The merged context is passed to Content Creator, which now
//   has both trending insights AND SEO keyword data available.
//
// Expected execution order:
//   1. parallel-research (fork — fans out)
//   2a. trend-researcher (agent, Branch 1)
//   2b. seo-specialist   (agent, Branch 2)
//   (Both 2a and 2b run concurrently.)
//   3. sync-research (synchronizer — waits for both branches,
//      then merges results under namespace "combined_research")
//   4. content-creator (agent — uses merged context)
//
// Merge strategy:
//   - Type: "merge_all" with namespace "combined_research"
//   - All output fields from both branches are merged into the
//     context under the "combined_research" namespace
//   - In case of field name conflicts, the branch outputs are
//     nested under their respective branch origin paths
// ============================================================================

export function createParallelResearchWithSync(): WorkflowDefinition {
  const workflowMeta: WorkflowMeta = {
    id: "example-parallel-research-sync",
    name: "Parallel Research with Synchronization",
    version: "1.0.0",
    description:
      "Trend Researcher and SEO Specialist run in parallel. " +
      "A Synchronizer joins their results using merge_all strategy. " +
      "Content Creator receives the merged research context.",
    owner: "workflow-architect",
    slaTargetSeconds: 120,
    severity: "medium",
    tags: ["example", "parallel", "synchronizer", "research"],
    created: "2026-06-15",
    modified: "2026-06-15",
  };

  const nodes: GraphDefinition["nodes"] = {
    "parallel-research": {
      type: "parallel",
      label: "Parallel Research",
      description:
        "Fans out to Trend Researcher (Branch 1) and SEO Specialist " +
        "(Branch 2) for concurrent execution.",
      branches: [
        {
          label: "Trend Research",
          steps: ["trend-researcher"],
        },
        {
          label: "SEO Analysis",
          steps: ["seo-specialist"],
        },
      ],
      failureMode: "wait_for_all",
      timeoutMs: 120_000,
    } satisfies ParallelForkDefinition,

    "trend-researcher": {
      type: "agent",
      agent: "trend-researcher",
      label: "Trend Researcher",
      description:
        "Researches trending topics, audience interests, and market " +
        "signals. Runs in parallel with SEO Specialist.",
      instruction:
        "Research current trends and audience interests in the target " +
        "industry. Return trending topics with audience insights.",
      inputs: [
        { from: "campaign.brief", to: "brief", required: true },
        { from: "market.industry", to: "industry", required: true },
        { from: "audience.segment", to: "targetAudience", required: true },
      ],
      outputs: [
        { from: "trends", to: "research.trends" },
        { from: "topics", to: "research.topics" },
        { from: "audienceInsights", to: "research.audienceInsights" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "seo-specialist": {
      type: "agent",
      agent: "seo-specialist",
      label: "SEO Specialist",
      description:
        "Analyzes keyword opportunities and search data. Runs in " +
        "parallel with Trend Researcher.",
      instruction:
        "Analyze keyword opportunities, search volume, and " +
        "competitor content gaps for the target industry and audience.",
      inputs: [
        { from: "market.industry", to: "industry", required: true },
        { from: "audience.segment", to: "targetAudience" },
        { from: "campaign.targetKeywords", to: "targetKeywords" },
      ],
      outputs: [
        { from: "keywords", to: "seo.keywords" },
        { from: "searchVolume", to: "seo.searchVolume" },
        { from: "contentGaps", to: "seo.contentGaps" },
        { from: "optimizationTips", to: "seo.optimizationTips" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "sync-research": {
      type: "synchronizer",
      label: "Sync Research Results",
      description:
        "Waits for both Trend Researcher and SEO Specialist to " +
        "complete, then merges their results under a combined namespace.",
      mergeStrategy: {
        type: "merge_all",
        namespace: "combined_research",
      } satisfies MergeStrategyDefinition,
    } satisfies SynchronizerDefinition,

    "content-creator": {
      type: "agent",
      agent: "content-creator",
      label: "Content Creator",
      description:
        "Produces final content using the merged parallel research " +
        "results — both trending insights AND SEO keyword data.",
      instruction:
        "Using the combined research data (trends, topics, SEO " +
        "keywords, and content gaps), produce high-quality content " +
        "that is both trending-relevant and SEO-optimized.",
      inputs: [
        { from: "combined_research", to: "researchData", required: true },
        { from: "campaign.tone", to: "tone" },
        { from: "campaign.format", to: "format" },
      ],
      outputs: [
        { from: "content", to: "content.body" },
        { from: "headline", to: "content.headline" },
      ],
      timeoutMs: 60_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,
  };

  const edges: EdgeDefinition[] = [
    // Parallel fork → Synchronizer establishes fork-join pairing
    {
      from: "parallel-research",
      to: "sync-research",
      type: "sequential",
      label: "fork → join (wait for all branches)",
    },
    // Synchronizer → Content Creator (continues after merge)
    {
      from: "sync-research",
      to: "content-creator",
      type: "sequential",
      label: "merged research → content creation",
    },
  ];

  const graph: GraphDefinition = {
    startAt: "parallel-research",
    nodes,
    edges,
    defaultPolicy: {
      retry: "limited",
      maxRetries: 2,
      backoffBaseMs: 1000,
      backoffMaxMs: 15000,
      backoffMultiplier: 2,
      jitter: true,
      onPermanentFailure: "abort",
    },
  };

  return {
    $schema: "https://nexus-agent.io/schemas/workflow-v2.schema.json",
    workflow: workflowMeta,
    graph,
  };
}

// ============================================================================
// EXAMPLE 3: Multi-Route Conditional Pipeline (Incident Response)
// ============================================================================
// Demonstrates: agent node + conditional router with 3 named routes +
//               parallel fan-out from one route + synchronizer
//
// DAG:
//   [Support Responder]
//          |
//          v
//   [Triage Router]  (ConditionalRouter — 3 routes)
//      /       |        \
//     /        |         \
//    v         v          v
// [Infra]  [Backend]  [PARALLEL RESPONSE]
//    |         |      /       |        \
//    |         |     v        v         v
//    |         |  [Infra] [Backend] [Support]
//    |         |     |        |         |
//    +----+----+-----+--------+---------+
//         |        |
//         v        v
//   [Sync Response]
//         |
//         v
//   [Escalation Manager]
//         |
//         v
//      (END)
//
// Description:
//   Support Responder triages an incident and produces a severity
//   classification. The Triage Router evaluates severity:
//     - "low"      → route to Infrastructure Maintainer only
//     - "medium"   → route to Backend Architect only
//     - "critical" → route to ALL three in parallel via a ParallelFork
//   A Synchronizer collects results from whichever branch(es) ran,
//   then the Escalation Manager produces the final resolution plan.
//
// Expected execution order:
//   1. support-responder (agent — triages incident)
//   2. triage-router (router — evaluates severity)
//   3a. [if severity=low] infra-maintainer (agent)
//   3b. [if severity=medium] backend-architect (agent)
//   3c. [if severity=critical] parallel-response (fork)
//         - infra-maintainer (agent, Branch 1)
//         - backend-architect (agent, Branch 2)
//         - support-responder (agent, Branch 3 — proactive measures)
//   4. sync-response (synchronizer — joins all active branches)
//   5. escalation-manager (agent — final resolution plan)
//
// Routing logic:
//   Three named routes in the router's routes record:
//     - "low":       next = infra-maintainer
//     - "medium":    next = backend-architect
//     - "critical":  next = parallel-response (parallel fork node)
//   Each route also has a conditional edge from the router.
//   The conditions are independent ComparisonCondition checks against
//   context.incident.severity using the "eq" operator.
// ============================================================================

export function createMultiRouteIncidentPipeline(): WorkflowDefinition {
  const workflowMeta: WorkflowMeta = {
    id: "example-multi-route-incident",
    name: "Multi-Route Incident Response Pipeline",
    version: "1.0.0",
    description:
      "Incident response pipeline with a 3-way conditional router. " +
      "Routes: low (Infra only), medium (Backend only), " +
      "critical (ALL three in parallel: Infra, Backend, Support).",
    owner: "workflow-architect",
    slaTargetSeconds: 300,
    severity: "critical",
    tags: ["example", "incident-response", "multi-route", "conditional"],
    created: "2026-06-15",
    modified: "2026-06-15",
  };

  // --- Condition definitions (reusable across routes and edges) ---

  const severityLowCondition: ComparisonCondition = {
    path: "incident.severity",
    operator: "eq" as ComparisonOperator,
    value: "low",
    label: "severity == 'low'",
  };

  const severityMediumCondition: ComparisonCondition = {
    path: "incident.severity",
    operator: "eq" as ComparisonOperator,
    value: "medium",
    label: "severity == 'medium'",
  };

  const severityCriticalCondition: ComparisonCondition = {
    path: "incident.severity",
    operator: "eq" as ComparisonOperator,
    value: "critical",
    label: "severity == 'critical'",
  };

  const nodes: GraphDefinition["nodes"] = {
    "support-responder": {
      type: "agent",
      agent: "support-responder",
      label: "Support Responder",
      description:
        "Triages incoming incident, gathers initial diagnostics, " +
        "and classifies severity as low, medium, or critical.",
      instruction:
        "Triage the incoming incident report. Gather initial logs, " +
        "identify affected services, and classify severity as " +
        "'low', 'medium', or 'critical'.",
      inputs: [
        { from: "incident.report", to: "report", required: true },
        { from: "incident.source", to: "source", required: true },
        { from: "incident.timestamp", to: "timestamp", required: true },
      ],
      outputs: [
        { from: "triageSummary", to: "incident.triageSummary" },
        { from: "severity", to: "incident.severity" },
        { from: "affectedServices", to: "incident.affectedServices" },
        { from: "initialLogs", to: "incident.initialLogs" },
      ],
      timeoutMs: 15_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "triage-router": {
      type: "router",
      label: "Triage Router",
      description:
        "Evaluates incident.severity and routes to the appropriate " +
        "response team. Three named routes: low, medium, critical.",
      condition: {
        path: "incident.severity",
        operator: "in" as ComparisonOperator,
        value: ["low", "medium", "critical"],
        label: "severity is one of: low, medium, critical",
      },
      routes: {
        low: {
          next: "infra-maintainer",
          contextTransform: [
            {
              type: "template",
              params: {
                template:
                  "Low severity incident {{incident.id}}: " +
                  "routing to Infrastructure Maintainer",
              },
            },
          ],
        },
        medium: {
          next: "backend-architect",
          contextTransform: [
            {
              type: "template",
              params: {
                template:
                  "Medium severity incident {{incident.id}}: " +
                  "routing to Backend Architect",
              },
            },
          ],
        },
        critical: {
          next: "parallel-response",
          contextTransform: [
            {
              type: "template",
              params: {
                template:
                  "CRITICAL incident {{incident.id}}: " +
                  "routing to ALL teams in parallel",
              },
            },
          ],
        },
      },
      defaultRoute: {
        next: "infra-maintainer",
      },
    } satisfies ConditionalRouterDefinition,

    "infra-maintainer": {
      type: "agent",
      agent: "infrastructure-maintainer",
      label: "Infrastructure Maintainer",
      description:
        "Analyzes infrastructure metrics, logs, and alerts to " +
        "diagnose the root cause of the incident.",
      instruction:
        "Analyze the infrastructure metrics and logs for the " +
        "affected services. Identify the root cause and provide " +
        "a detailed impact analysis and remediation recommendations.",
      inputs: [
        { from: "incident.triageSummary", to: "triageSummary", required: true },
        { from: "incident.severity", to: "severity", required: true },
        { from: "incident.affectedServices", to: "affectedServices", required: true },
        { from: "incident.initialLogs", to: "initialLogs" },
      ],
      outputs: [
        { from: "rootCause", to: "infra.rootCause" },
        { from: "impactAnalysis", to: "infra.impactAnalysis" },
        { from: "affectedResources", to: "infra.affectedResources" },
        { from: "timeline", to: "infra.timeline" },
        { from: "recommendations", to: "infra.recommendations" },
      ],
      timeoutMs: 45_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,

    "backend-architect": {
      type: "agent",
      agent: "backend-architect",
      label: "Backend Architect",
      description:
        "Designs the fix, validates against architecture " +
        "constraints, and produces a deployment plan.",
      instruction:
        "Design a fix for the incident based on the diagnostics. " +
        "Validate the fix against architecture constraints and " +
        "produce a deployment plan with rollback steps.",
      inputs: [
        { from: "incident.triageSummary", to: "triageSummary", required: true },
        { from: "incident.severity", to: "severity", required: true },
        { from: "incident.affectedServices", to: "affectedServices", required: true },
        { from: "incident.initialLogs", to: "initialLogs" },
      ],
      outputs: [
        { from: "fixPlan", to: "resolution.fixPlan" },
        { from: "rollbackPlan", to: "resolution.rollbackPlan" },
        { from: "validationSteps", to: "resolution.validationSteps" },
        { from: "estimatedTimeToResolve", to: "resolution.estimatedTimeToResolve" },
      ],
      timeoutMs: 60_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "parallel-response": {
      type: "parallel",
      label: "Parallel Critical Response",
      description:
        "For CRITICAL incidents, all three teams respond in " +
        "parallel: Infrastructure Maintainer, Backend Architect, " +
        "and Support Responder (proactive measures).",
      branches: [
        {
          label: "Infrastructure Diagnosis",
          steps: ["infra-maintainer"],
        },
        {
          label: "Backend Architecture Fix",
          steps: ["backend-architect"],
        },
        {
          label: "Proactive Support",
          steps: ["support-proactive"],
        },
      ],
      failureMode: "wait_for_all",
      timeoutMs: 180_000,
    } satisfies ParallelForkDefinition,

    "support-proactive": {
      type: "agent",
      agent: "support-responder",
      label: "Support (Proactive)",
      description:
        "In critical incidents, Support Responder takes proactive " +
        "measures: user communication, status page updates, and " +
        "escalation notifications.",
      instruction:
        "This is a CRITICAL incident requiring immediate proactive " +
        "measures. Draft user-facing communications, update the " +
        "status page, and send escalation notifications to on-call " +
        "engineering leadership.",
      inputs: [
        { from: "incident.triageSummary", to: "triageSummary", required: true },
        { from: "incident.severity", to: "severity", required: true },
        { from: "incident.affectedServices", to: "affectedServices", required: true },
      ],
      outputs: [
        { from: "communicationDraft", to: "proactive.communicationDraft" },
        { from: "statusUpdate", to: "proactive.statusUpdate" },
        { from: "escalationLog", to: "proactive.escalationLog" },
      ],
      timeoutMs: 15_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "sync-response": {
      type: "synchronizer",
      label: "Sync Response Results",
      description:
        "Waits for all active response branches to complete and " +
        "merges their results. In low/medium cases, this joins " +
        "a single branch. In critical cases, it joins all three.",
      mergeStrategy: {
        type: "merge_all",
        namespace: "response",
      } satisfies MergeStrategyDefinition,
    } satisfies SynchronizerDefinition,

    "escalation-manager": {
      type: "agent",
      agent: "proposal-strategist",
      label: "Escalation Manager",
      description:
        "Produces the final resolution plan and post-mortem " +
        "documentation from all response data.",
      instruction:
        "Review all response data from the incident resolution " +
        "efforts. Produce a comprehensive resolution report " +
        "including root cause, actions taken, and post-mortem notes.",
      inputs: [
        { from: "response", to: "responseData", required: true },
      ],
      outputs: [
        { from: "resolutionReport", to: "final.resolutionReport" },
        { from: "postMortem", to: "final.postMortem" },
        { from: "actionItems", to: "final.actionItems" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,
  };

  const edges: EdgeDefinition[] = [
    // Sequential: Support Responder → Triage Router
    {
      from: "support-responder",
      to: "triage-router",
      type: "sequential",
      label: "triage results → evaluate severity",
    },

    // Route: low severity → Infrastructure Maintainer only
    {
      from: "triage-router",
      to: "infra-maintainer",
      type: "conditional_true",
      condition: severityLowCondition,
      label: "severity=low → infrastructure",
    },

    // Route: medium severity → Backend Architect only
    {
      from: "triage-router",
      to: "backend-architect",
      type: "conditional_true",
      condition: severityMediumCondition,
      label: "severity=medium → backend",
    },

    // Route: critical severity → all three in parallel
    {
      from: "triage-router",
      to: "parallel-response",
      type: "conditional_true",
      condition: severityCriticalCondition,
      label: "severity=critical → parallel response",
    },

    // Parallel response sync
    {
      from: "parallel-response",
      to: "sync-response",
      type: "sequential",
      label: "parallel response → join results",
    },

    // Single-branch paths also converge at synchronizer
    // (data_dependency because the infra/backend nodes don't always
    //  run — only when routed. The synchronizer handles the wait.)
    {
      from: "infra-maintainer",
      to: "sync-response",
      type: "data_dependency",
      label: "infra results → join",
    },
    {
      from: "backend-architect",
      to: "sync-response",
      type: "data_dependency",
      label: "backend results → join",
    },
    {
      from: "support-proactive",
      to: "sync-response",
      type: "data_dependency",
      label: "proactive support results → join",
    },

    // Synchronizer → Escalation Manager (final step)
    {
      from: "sync-response",
      to: "escalation-manager",
      type: "sequential",
      label: "merged response → resolution plan",
    },
  ];

  const graph: GraphDefinition = {
    startAt: "support-responder",
    nodes,
    edges,
    defaultPolicy: {
      retry: "limited",
      maxRetries: 2,
      backoffBaseMs: 1000,
      backoffMaxMs: 30000,
      backoffMultiplier: 2,
      jitter: true,
      onPermanentFailure: "abort",
    },
  };

  return {
    $schema: "https://nexus-agent.io/schemas/workflow-v2.schema.json",
    workflow: workflowMeta,
    graph,
  };
}

// ============================================================================
// EXAMPLE 4: Full Marketing Campaign DAG
// ============================================================================
// Demonstrates: ALL primitives combined in a single workflow —
//   agent + parallel + synchronizer + router + conditional edges
//
// DAG:
//   [PARALLEL RESEARCH FORK]
//     /                    \
//    v                      v
// [Trend Researcher]  [Growth Hacker]
//    |                      |
//    +---------++-----------+
//              |
//       [SYNC RESEARCH]
//              |
//              v
//      [SEO QUALITY ROUTER]
//        /               \
//       /                 \
//      v                   v
// [SEO Specialist]   [Content Creator]
//      |                   |
//      +-------++----------+
//               |
//               v
//    [PARALLEL DISTRIBUTION FORK]
//      /                   \
//     v                     v
// [Social Media]     [Product Manager]
//      |                     |
//      +---------++----------+
//                |
//         [SYNC DISTRIBUTION]
//                |
//                v
//     [Proposal Strategist]
//                |
//                v
//             (END)
//
// Description:
//   A complete marketing campaign workflow using all Execution Engine
//   v2 primitives:
//
//   1. PARALLEL FORK + SYNCHRONIZER:
//      Trend Researcher and Growth Hacker run concurrently. Their
//      results are merged by a synchronizer.
//
//   2. CONDITIONAL ROUTER:
//      The merged research is evaluated for SEO readiness. If the
//      seoScore is below 50, the SEO Specialist optimizes before
//      Content Creator produces. Otherwise, Content Creator proceeds
//      directly.
//
//   3. PARALLEL FORK + SYNCHRONIZER (second):
//      Social Media Strategist and Product Manager run concurrently
//      on the content output. Results are merged.
//
//   4. FINAL AGENT:
//      Proposal Strategist produces the final go-to-market proposal.
//
// Expected execution order:
//   1. parallel-research (fork)
//   2a. trend-researcher (agent, Branch 1)
//   2b. growth-hacker    (agent, Branch 2)
//   3. sync-research (synchronizer — merges research + growth data)
//   4. seo-quality-router (router — evaluates seoScore)
//   5a. [if seoScore < 50] seo-specialist (agent)
//   5b. [if seoScore >= 50] content-creator (agent)
//   6. (if seo-specialist ran) content-creator (agent)
//   7. parallel-distribution (fork)
//   8a. social-media-strategist (agent, Branch 1)
//   8b. product-manager (agent, Branch 2)
//   9. sync-distribution (synchronizer)
//   10. proposal-strategist (agent)
//
// Routing logic:
//   seo-quality-router evaluates context.combined.seoScore:
//     - IF seoScore < 50 → route to seo-specialist THEN content-creator
//     - IF seoScore >= 50 → route directly to content-creator
// ============================================================================

export function createFullMarketingCampaignDAG(): WorkflowDefinition {
  const workflowMeta: WorkflowMeta = {
    id: "example-full-marketing-campaign",
    name: "Full Marketing Campaign DAG",
    version: "1.0.0",
    description:
      "Complete marketing campaign workflow demonstrating all " +
      "Execution Engine v2 primitives: parallel research fork, " +
      "research synchronizer, SEO quality router with conditional " +
      "edge routing, parallel distribution fork, distribution " +
      "synchronizer, and final proposal generation.",
    owner: "workflow-architect",
    slaTargetSeconds: 300,
    severity: "high",
    tags: ["example", "marketing", "full-dag", "all-primitives"],
    created: "2026-06-15",
    modified: "2026-06-15",
  };

  // --- Condition definitions ---

  const seoScoreLowCondition: ComparisonCondition = {
    path: "combined.seoScore",
    operator: "lt" as ComparisonOperator,
    value: 50,
    label: "seoScore < 50 → needs SEO optimization",
  };

  const seoScoreHighCondition: ComparisonCondition = {
    path: "combined.seoScore",
    operator: "gte" as ComparisonOperator,
    value: 50,
    label: "seoScore >= 50 → proceed directly",
  };

  const nodes: GraphDefinition["nodes"] = {
    // ========================================================================
    // PHASE 1: PARALLEL RESEARCH
    // ========================================================================

    "parallel-research": {
      type: "parallel",
      label: "Parallel Research",
      description:
        "Fans out to Trend Researcher (trends, audience) and " +
        "Growth Hacker (outreach, conversion experiments) in parallel.",
      branches: [
        {
          label: "Trend & Audience Research",
          steps: ["trend-researcher"],
        },
        {
          label: "Growth & Outreach Analysis",
          steps: ["growth-hacker"],
        },
      ],
      failureMode: "wait_for_all",
      timeoutMs: 120_000,
    } satisfies ParallelForkDefinition,

    "trend-researcher": {
      type: "agent",
      agent: "trend-researcher",
      label: "Trend Researcher",
      description:
        "Researches trending topics, audience interests, and market " +
        "signals. Runs in parallel with Growth Hacker.",
      instruction:
        "Research current trends, audience interests, and market " +
        "signals for the campaign's industry and target audience.",
      inputs: [
        { from: "campaign.brief", to: "brief", required: true },
        { from: "market.industry", to: "industry", required: true },
        { from: "audience.segment", to: "targetAudience", required: true },
      ],
      outputs: [
        { from: "trends", to: "research.trends" },
        { from: "topics", to: "research.topics" },
        { from: "audienceInsights", to: "research.audienceInsights" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "growth-hacker": {
      type: "agent",
      agent: "growth-hacker",
      label: "Growth Hacker",
      description:
        "Designs outreach campaigns, A/B test plans, and " +
        "conversion experiments. Runs in parallel with Trend " +
        "Researcher.",
      instruction:
        "Design outreach campaigns and conversion optimization " +
        "experiments for the target audience and industry. Identify " +
        "the best channels and messaging strategies.",
      inputs: [
        { from: "campaign.brief", to: "brief", required: true },
        { from: "market.industry", to: "industry", required: true },
        { from: "audience.segment", to: "targetAudience", required: true },
        { from: "campaign.goal", to: "goal", required: true },
      ],
      outputs: [
        { from: "outreachStrategy", to: "growth.outreachStrategy" },
        { from: "experiments", to: "growth.experiments" },
        { from: "channels", to: "growth.channels" },
        { from: "conversionFunnel", to: "growth.conversionFunnel" },
      ],
      timeoutMs: 45_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,

    "sync-research": {
      type: "synchronizer",
      label: "Sync Research",
      description:
        "Joins Trend Researcher and Growth Hacker results into " +
        "a combined research context under namespace 'combined'.",
      mergeStrategy: {
        type: "merge_all",
        namespace: "combined",
      } satisfies MergeStrategyDefinition,
    } satisfies SynchronizerDefinition,

    // ========================================================================
    // PHASE 2: CONDITIONAL SEO QUALITY GATE + CONTENT CREATION
    // ========================================================================

    "seo-quality-router": {
      type: "router",
      label: "SEO Quality Router",
      description:
        "Evaluates the combined seoScore from research results. " +
        "If below 50, routes through SEO Specialist first. " +
        "Otherwise routes directly to Content Creator.",
      condition: {
        expression: "context.combined.seoScore >= 50",
      },
      routes: {
        needs_optimization: {
          next: "seo-specialist",
          contextTransform: [
            {
              type: "template",
              params: {
                template:
                  "seoScore is {{combined.seoScore}} (< 50). " +
                  "Routing to SEO Specialist for optimization.",
              },
            },
          ],
        },
        ready_to_create: {
          next: "content-creator",
          contextTransform: [
            {
              type: "template",
              params: {
                template:
                  "seoScore is {{combined.seoScore}} (>= 50). " +
                  "Routing directly to Content Creator.",
              },
            },
          ],
        },
      },
      defaultRoute: {
        next: "content-creator",
      },
    } satisfies ConditionalRouterDefinition,

    "seo-specialist": {
      type: "agent",
      agent: "seo-specialist",
      label: "SEO Specialist",
      description:
        "Optimizes content for search when the seoScore is low. " +
        "Provides keyword recommendations and content gap analysis.",
      instruction:
        "The campaign's SEO score is below threshold. Perform " +
        "deep keyword research, content gap analysis, and provide " +
        "optimization recommendations to improve search performance.",
      inputs: [
        { from: "research.topics", to: "topics", required: true },
        { from: "research.trends", to: "trends" },
        { from: "combined", to: "combinedResearch", required: true },
        { from: "campaign.targetKeywords", to: "targetKeywords" },
      ],
      outputs: [
        { from: "keywords", to: "seo.keywords" },
        { from: "searchVolume", to: "seo.searchVolume" },
        { from: "contentGaps", to: "seo.contentGaps" },
        { from: "optimizationTips", to: "seo.optimizationTips" },
      ],
      timeoutMs: 45_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,

    "content-creator": {
      type: "agent",
      agent: "content-creator",
      label: "Content Creator",
      description:
        "Produces the final content. If SEO Specialist ran first, " +
        "incorporates keyword and optimization data. Otherwise uses " +
        "the raw research and growth data directly.",
      instruction:
        "Produce high-quality campaign content. If SEO data is " +
        "available, incorporate keywords and optimization tips. " +
        "Use the growth data (channels, experiments) to inform " +
        "content format and structure.",
      inputs: [
        { from: "research.topics", to: "topics", required: true },
        { from: "research.trends", to: "trends" },
        { from: "research.audienceInsights", to: "audienceInsights" },
        { from: "growth.outreachStrategy", to: "outreachStrategy" },
        { from: "growth.channels", to: "channels" },
        { from: "seo.keywords", to: "keywords", required: false },
        { from: "seo.optimizationTips", to: "optimizationTips", required: false },
        { from: "campaign.tone", to: "tone" },
        { from: "campaign.format", to: "format" },
      ],
      outputs: [
        { from: "content", to: "content.body" },
        { from: "headline", to: "content.headline" },
      ],
      timeoutMs: 60_000,
      maxRetries: 3,
    } satisfies AgentNodeDefinition,

    // ========================================================================
    // PHASE 3: PARALLEL DISTRIBUTION
    // ========================================================================

    "parallel-distribution": {
      type: "parallel",
      label: "Parallel Distribution",
      description:
        "Fans out to Social Media Strategist (distribution planning) " +
        "and Product Manager (product alignment) in parallel.",
      branches: [
        {
          label: "Social Media Strategy",
          steps: ["social-media-strategist"],
        },
        {
          label: "Product Alignment",
          steps: ["product-manager"],
        },
      ],
      failureMode: "wait_for_all",
      timeoutMs: 90_000,
    } satisfies ParallelForkDefinition,

    "social-media-strategist": {
      type: "agent",
      agent: "social-media-strategist",
      label: "Social Media Strategist",
      description:
        "Creates distribution strategy, platform-specific content " +
        "adaptations, and posting schedule.",
      instruction:
        "Using the campaign's core content, create a distribution " +
        "strategy. Tailor content for each platform, plan the " +
        "posting schedule, and set engagement targets.",
      inputs: [
        { from: "content.body", to: "contentBody", required: true },
        { from: "content.headline", to: "headline", required: true },
        { from: "growth.channels", to: "channels", required: true },
        { from: "research.audienceInsights", to: "audienceInsights" },
        { from: "campaign.platforms", to: "platforms", required: true },
      ],
      outputs: [
        { from: "strategy", to: "distribution.strategy" },
        { from: "schedule", to: "distribution.schedule" },
        { from: "platformContent", to: "distribution.platformContent" },
        { from: "engagementTargets", to: "distribution.engagementTargets" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "product-manager": {
      type: "agent",
      agent: "product-manager",
      label: "Product Manager",
      description:
        "Aligns product positioning, differentiators, and value " +
        "propositions with the campaign content.",
      instruction:
        "Review the campaign content and align it with product " +
        "positioning, key differentiators, and value propositions. " +
        "Ensure the content accurately represents product features " +
        "and market positioning.",
      inputs: [
        { from: "content.body", to: "contentBody", required: true },
        { from: "research.trends", to: "marketTrends" },
        { from: "growth.conversionFunnel", to: "conversionFunnel" },
        { from: "campaign.product", to: "product", required: true },
        { from: "campaign.features", to: "features" },
      ],
      outputs: [
        { from: "positioning", to: "product.positioning" },
        { from: "differentiators", to: "product.differentiators" },
        { from: "valueProps", to: "product.valueProps" },
        { from: "pricingStrategy", to: "product.pricingStrategy" },
      ],
      timeoutMs: 30_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,

    "sync-distribution": {
      type: "synchronizer",
      label: "Sync Distribution",
      description:
        "Joins Social Media Strategist and Product Manager results " +
        "into a comprehensive campaign context.",
      mergeStrategy: {
        type: "merge_all",
        namespace: "campaign",
      } satisfies MergeStrategyDefinition,
    } satisfies SynchronizerDefinition,

    // ========================================================================
    // PHASE 4: FINAL PROPOSAL
    // ========================================================================

    "proposal-strategist": {
      type: "agent",
      agent: "proposal-strategist",
      label: "Proposal Strategist",
      description:
        "Produces the final go-to-market proposal, pitch deck, " +
        "and closing strategy using all campaign data.",
      instruction:
        "Using all campaign data (research, growth, content, " +
        "distribution, product alignment), produce the final " +
        "go-to-market proposal. Include the pitch deck, " +
        "closing strategy, and objection handling notes.",
      inputs: [
        { from: "campaign", to: "campaignData", required: true },
        { from: "combined", to: "combinedResearch", required: true },
        { from: "content", to: "content", required: true },
        { from: "distribution", to: "distribution" },
        { from: "product", to: "product" },
        { from: "seo", to: "seo", required: false },
      ],
      outputs: [
        { from: "proposal", to: "final.proposal" },
        { from: "pitchDeck", to: "final.pitchDeck" },
        { from: "closingStrategy", to: "final.closingStrategy" },
        { from: "objectionHandling", to: "final.objectionHandling" },
      ],
      timeoutMs: 60_000,
      maxRetries: 2,
    } satisfies AgentNodeDefinition,
  };

  const edges: EdgeDefinition[] = [
    // ========================================================================
    // PHASE 1 EDGES: Parallel Research → Synchronize
    // ========================================================================
    {
      from: "parallel-research",
      to: "sync-research",
      type: "sequential",
      label: "research fork → join results",
    },

    // ========================================================================
    // PHASE 2 EDGES: synchronized research → router → content creation
    // ========================================================================
    {
      from: "sync-research",
      to: "seo-quality-router",
      type: "sequential",
      label: "merged research → evaluate SEO readiness",
    },
    {
      from: "seo-quality-router",
      to: "seo-specialist",
      type: "conditional_true",
      condition: seoScoreLowCondition,
      label: "seoScore < 50 → optimize SEO first",
    },
    {
      from: "seo-quality-router",
      to: "content-creator",
      type: "conditional_false",
      condition: seoScoreLowCondition,
      label: "seoScore >= 50 → create content directly",
    },
    {
      from: "seo-specialist",
      to: "content-creator",
      type: "sequential",
      label: "SEO keywords → final content production",
    },

    // ========================================================================
    // PHASE 3 EDGES: content → parallel distribution → sync
    // ========================================================================
    {
      from: "content-creator",
      to: "parallel-distribution",
      type: "sequential",
      label: "content → distribution planning",
    },
    {
      from: "parallel-distribution",
      to: "sync-distribution",
      type: "sequential",
      label: "distribution fork → join results",
    },

    // ========================================================================
    // PHASE 4 EDGES: distribution sync → final proposal
    // ========================================================================
    {
      from: "sync-distribution",
      to: "proposal-strategist",
      type: "sequential",
      label: "full campaign data → final proposal",
    },
  ];

  const graph: GraphDefinition = {
    startAt: "parallel-research",
    nodes,
    edges,
    defaultPolicy: {
      retry: "limited",
      maxRetries: 2,
      backoffBaseMs: 1000,
      backoffMaxMs: 15000,
      backoffMultiplier: 2,
      jitter: true,
      onPermanentFailure: "abort",
    },
  };

  return {
    $schema: "https://nexus-agent.io/schemas/workflow-v2.schema.json",
    workflow: workflowMeta,
    graph,
  };
}

// ============================================================================
// WORKFLOW REGISTRY
// ============================================================================
// Central index of all example workflows. Use this to discover, enumerate,
// or dynamically load examples.
// ============================================================================

/**
 * Registry entry for a single example workflow.
 */
export interface ExampleWorkflowEntry {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Key primitives demonstrated */
  primitives: string[];
  /** Factory function that produces the WorkflowDefinition */
  factory: () => WorkflowDefinition;
  /** Expected number of nodes in the graph */
  nodeCount: number;
  /** Expected number of edges in the graph */
  edgeCount: number;
}

/**
 * Complete workflow registry — all example workflows indexed by ID.
 */
export const EXAMPLE_WORKFLOW_REGISTRY: Record<string, ExampleWorkflowEntry> = {
  "example-content-marketing-quality-gate": {
    id: "example-content-marketing-quality-gate",
    name: "Content Marketing with Quality Gate",
    description:
      "Trend Researcher → ConditionalRouter on qualityScore → " +
      "SEO Specialist (if < 0.7) or Content Creator (if >= 0.7).",
    primitives: ["agent", "router", "conditional_true", "conditional_false"],
    factory: createContentMarketingQualityGate,
    nodeCount: 4,
    edgeCount: 4,
  },
  "example-parallel-research-sync": {
    id: "example-parallel-research-sync",
    name: "Parallel Research with Synchronization",
    description:
      "Trend Researcher and SEO Specialist in parallel → " +
      "Synchronizer (merge_all) → Content Creator.",
    primitives: ["agent", "parallel", "synchronizer", "merge_all"],
    factory: createParallelResearchWithSync,
    nodeCount: 5,
    edgeCount: 2,
  },
  "example-multi-route-incident": {
    id: "example-multi-route-incident",
    name: "Multi-Route Incident Response Pipeline",
    description:
      "Support Responder → 3-way ConditionalRouter (low/medium/critical) → " +
      "single branch or parallel fan-out → Synchronizer → Escalation Manager.",
    primitives: [
      "agent",
      "router",
      "multi-route",
      "parallel",
      "synchronizer",
      "conditional_edge",
    ],
    factory: createMultiRouteIncidentPipeline,
    nodeCount: 9,
    edgeCount: 7,
  },
  "example-full-marketing-campaign": {
    id: "example-full-marketing-campaign",
    name: "Full Marketing Campaign DAG",
    description:
      "Complete campaign: parallel research → sync → SEO router → " +
      "content creator → parallel distribution → sync → proposal. " +
      "Demonstrates ALL v2 primitives in a single workflow.",
    primitives: [
      "agent",
      "parallel",
      "synchronizer",
      "router",
      "conditional_true",
      "conditional_false",
      "multi-stage",
    ],
    factory: createFullMarketingCampaignDAG,
    nodeCount: 13,
    edgeCount: 8,
  },
};

/**
 * Get a list of all registered example workflow entries.
 */
export function listExampleWorkflows(): ExampleWorkflowEntry[] {
  return Object.values(EXAMPLE_WORKFLOW_REGISTRY);
}

/**
 * Get a specific example workflow entry by ID.
 */
export function getExampleWorkflow(
  id: string
): ExampleWorkflowEntry | undefined {
  return EXAMPLE_WORKFLOW_REGISTRY[id];
}

/**
 * Build all example workflows and return the compiled results.
 * Useful for batch validation and testing.
 */
export function buildAllExamples(): Array<{
  entry: ExampleWorkflowEntry;
  definition: WorkflowDefinition;
}> {
  return listExampleWorkflows().map((entry) => ({
    entry,
    definition: entry.factory(),
  }));
}
