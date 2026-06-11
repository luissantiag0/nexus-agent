# Nexus Agent Platform — Unified Orchestration Plan

**Document Version**: 1.0.0
**Author**: @Agents Orchestrator
**Date**: 2026-06-11
**Status**: PLAN_APPROVED

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Module Dependency Map](#3-module-dependency-map)
4. [Agent Assignments — Who Builds What](#4-agent-assignments)
5. [Phased Execution Plan](#5-phased-execution-plan)
6. [Meta-Orchestration: How @Agents Orchestrator Fits](#6-meta-orchestration)
7. [Naming Conventions](#7-naming-conventions)
8. [Quality Gates & Validation Checkpoints](#8-quality-gates)
9. [Risk Register](#9-risk-register)
10. [Appendix: Agent Contact Cards](#10-appendix)

---

## 1. Executive Summary

This plan coordinates **18 agents** to build the **Nexus Agent Platform** — a production-grade Agent Orchestration Runtime Engine with 8 modules. The build follows a strict topological order resolved from module dependencies, with quality gates at every integration boundary.

**Build Phases (11 total):**
| Phase | Duration (est.) | Gate |
|-------|----------------|------|
| P0: Foundation | 0.5d | Directory structure verified |
| P1: Type System (M5) | 2d | Types compile, validation passes |
| P2: Agent Registry (M3) | 2d | All 18 agents loadable |
| P3: Supabase Layer (M6) | 3d | CRUD operations pass |
| P4: Agent Execution Engine (M1) | 4d | Single agent run green |
| P5: Core Orchestration Layer (M2) | 4d | Multi-agent pipeline runs |
| P6: Externalized Prompt System (M4) | 2d | Versioned prompts resolve |
| P7: n8n Integration (M7) | 2d | Webhook triggers pipeline |
| P8: UI Dashboard | 2d | Admin screens rendered |
| P9: Voice Layer (M8) | 0.5d | Stubs in place, gated off |
| P10: Integration & QA | 3d | Full-system smoke test |
| P11: Documentation & GTM | 2d | Docs shipped |

**Total estimated duration**: 23 days (sequential), ~14 days (parallelized)

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    M8: VOICE LAYER (INACTIVE)                     │
│      STT / TTS / LiveKit — All stubbed, Feature-Flag-Gated       │
├──────────────────────────────────────────────────────────────────┤
│                    M7: n8n INTEGRATION                            │
│      Webhook-Triggered Only — Zero Business Logic in n8n          │
├──────────────────────────────────────────────────────────────────┤
│                  M2: CORE ORCHESTRATION LAYER                     │
│  SingleAgentExec │ MultiAgentPipeline │ CondRouting │ CtxProp     │
├────────────────────┬──────────────────────┬───────────────────────┤
│   M1: EXEC ENGINE  │   M3: AGENT REGISTRY │  M4: PROMPT SYSTEM   │
│ AgentRunner        │  Parser+Loader       │  Versioned Registry  │
│ AgentChain (seq)   │  18 agents (frozen)  │  Template Engine     │
│ AgentGraph (DAG)   │  Validation+Cache    │  Agent Binding Layer │
│ AgentContext       │  No extension API    │  Hot-Reload Support  │
│ AgentResult        │                      │                      │
├────────────────────┴──────────────────────┴───────────────────────┤
│                     M5: STRICT TYPE SYSTEM                         │
│  AgentInput │ AgentOutput │ AgentContext │ GraphTypes │ RegistryT  │
│  Zod Runtime Validation │ Branded Types │ Discriminated Unions    │
├───────────────────────────────────────────────────────────────────┤
│                     M6: SUPABASE LAYER                             │
│  Repository Pattern │ Service Layer Separation │ Migrations        │
│  Row-Level Security │ Prepared Statements │ Connection Pool       │
├───────────────────────────────────────────────────────────────────┤
│                     P0: PROJECT FOUNDATION                         │
│  Monorepo Structure │ Configs │ ESLint │ Prettier │ Jest │ TS     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Dependency Map

### 3.1 Dependency Graph (topological order)

```
M5: Type System ─────────────────────────────────────────┐
    ├── M3: Agent Registry (depends: M5)                 │
    │   ├── M1: Exec Engine (depends: M5, M3)            │
    │   │   └── M2: Orchestration (depends: M1, M3, M5) │
    │   │       ├── M7: n8n Integration (dep: M2, M6)   │
    │   │       └── M8: Voice Layer (dep: nothing)      │
    │   └── M4: Prompt System (depends: M3, M5)          │
    └── M6: Supabase Layer (depends: M5)                  │
        └── (also feeds M7, M2 for persistence)           │
                                                          │
    P8: UI Dashboard (depends: M2, M6, M3)                │
    P10: Integration (depends: ALL)                       │
    P11: Docs/GTM (depends: ALL, runs parallel to P10)    │
```

### 3.2 Module Interface Contracts

| Contract | Provider | Consumer(s) | Shape |
|----------|----------|-------------|-------|
| `IAgentTypeDefs` | M5 | M1, M2, M3, M4, M6 | Types |
| `IAgentRegistration` | M3 | M1, M2, M4 | Record<AgentId, AgentMeta> |
| `IExecutionResult` | M1 | M2, M7 | { ok, output, context, trace } |
| `IOrchestrationHandle` | M2 | M7, P8 | { run, cancel, status, events } |
| `IPromptBinding` | M4 | M2 | { agentId, version, template } |
| `ISupabaseClient` | M6 | M2, M7, P8 | Repository interface |
| `IWebhookPayload` | M7 | M2 | { trigger, payload, source } |

### 3.3 Critical Integration Points (CIPs)

| CIP | Description | Validated By |
|-----|-------------|-------------|
| CIP-01 | M5 types compilable and importable by all consumers | P10 Integration Test |
| CIP-02 | M3 loads exactly 18 agents, rejects unknown IDs | M3 Unit Test |
| CIP-03 | M1 returns valid AgentResult for any registered agent | M1 Integration Test |
| CIP-04 | M2 routes context correctly through multi-agent chain | M2 E2E Test |
| CIP-05 | M4 prompts resolve with correct version for agent | M4 Integration Test |
| CIP-06 | M6 repositories return typed results matching M5 types | M6 Unit Test |
| CIP-07 | M7 webhook triggers M2 pipeline with correct payload | M7 Integration Test |
| CIP-08 | M8 stubs compile but never activate without flag | P10 Gate Check |
| CIP-09 | P8 UI reads from M6 and M3 simultaneously | P8 E2E Test |

---

## 4. Agent Assignments — Who Builds What

### 4.1 Primary Build Agent Assignments

Each module has a **Primary Builder** (writes code) and **Supporting Agents** (specs, review, content).

| Module | Primary Builder | Supporting Agents | QA Agent |
|--------|----------------|-------------------|----------|
| **P0: Foundation** | @Backend Architect | @Workflow Architect, @Product Manager | @Agents Orchestrator |
| **M5: Type System** | @Backend Architect | @Workflow Architect (graph types) | @EvidenceQA |
| **M3: Agent Registry** | @Backend Architect | @Workflow Architect (schema) | @EvidenceQA |
| **M6: Supabase Layer** | @Infrastructure Maintainer | @Backend Architect (schema review) | @API Tester |
| **M1: Exec Engine** | @Backend Architect | @Workflow Architect (DAG spec) | @EvidenceQA |
| **M2: Orchestration** | @Backend Architect | @Workflow Architect (routing spec) | @EvidenceQA |
| **M4: Prompt System** | @Backend Architect | @Product Manager, @Content Creator | @EvidenceQA |
| **M7: n8n Integration** | @Infrastructure Maintainer | @Workflow Architect (webhook spec) | @API Tester |
| **M8: Voice Layer** | @Infrastructure Maintainer | @Backend Architect (stub spec) | @EvidenceQA |
| **P8: UI Dashboard** | @UI Designer | @Pipeline Analyst (dashboard reqs) | @EvidenceQA |
| **P10: Integration** | @Agents Orchestrator | @TestingRealityChecker | @TestingRealityChecker |

### 4.2 Business Logic & Spec Input Agents

These agents do not write platform code. They produce requirements, content, and validation criteria that inform the builders.

| Agent | Contribution to Platform |
|-------|------------------------|
| @Product Manager | PRD for each module, acceptance criteria, prioritization |
| @Workflow Architect | Complete workflow trees for orchestration, DAG specs, handoff contracts, error recovery paths |
| @Trend Researcher | Back-compat requirements, ecosystem analysis, technology risk assessment |
| @Pipeline Analyst | Pipeline health metrics definitions, KPI schema, dashboard specifications |
| @Deal Strategist | Conditional routing business rules (if-then-else pipeline logic specs) |
| @Proposal Strategist | Output template schema, report formatting specs |
| @Sales Outreach | Agent interaction UX specs, user stories for pipeline creation |
| @Customer Service | Error message tone/branding, user-facing text specifications |
| @Support Responder | Failure recovery workflow specs, escalation procedure definitions |
| @Recruitment Specialist | Agent capability assessment framework, skill matching schema |
| @Growth Hacker | A/B pipeline routing specs, experimental pipeline patterns |
| @Content Creator | Documentation voice/tone specs, onboarding narrative |
| @SEO Specialist | URL structure spec for admin dashboard, doc site meta |
| @Social Media Strategist | Changelog/announcement content specifications |

### 4.3 Agent Level-of-Effort Estimates

| Agent | Estimated Hours | In Critical Path? |
|-------|----------------|-------------------|
| @Backend Architect | 80h (largest) | YES — blocks M1, M2, M3, M4, M5 |
| @Workflow Architect | 30h | YES — spec must precede M1, M2 |
| @Infrastructure Maintainer | 40h | YES — blocks M6, M7 |
| @UI Designer | 16h | No — parallel with P7+ |
| @Product Manager | 12h | No — up-front, completes early |
| @Content Creator | 8h | No — parallel with P10 |
| @Pipeline Analyst | 6h | No — parallel with P8 |
| All Other Agents | 2-4h each | No — async inputs |
| @Agents Orchestrator | Continuous | META — full duration |

---

## 5. Phased Execution Plan

### Phase 0: Project Foundation (0.5 day)

**Goal**: Create directory structure, tooling configuration, workspace setup.

**Trigger**: `@Agents Orchestrator` verifies workspace, spawns @Backend Architect.

**Deliverables**:
```
nexus-agent/
├── src/
│   ├── types/                    # M5: Strict Type System
│   ├── registry/                 # M3: Agent Registry
│   ├── engine/                   # M1: Agent Execution Engine
│   │   ├── runner/
│   │   ├── chain/
│   │   └── graph/
│   ├── orchestration/            # M2: Core Orchestration Layer
│   ├── prompts/                  # M4: Externalized Prompt System
│   ├── supabase/                 # M6: Supabase Layer
│   │   ├── repositories/
│   │   └── services/
│   ├── integrations/
│   │   ├── n8n/                  # M7: n8n Integration
│   │   └── voice/                # M8: Voice Layer (stubbed)
│   ├── ui/                       # P8: Admin Dashboard
│   ├── config/                   # Configuration
│   └── lib/                      # Shared utilities
├── project-specs/                # Specifications
├── project-tasks/                # Task lists
├── tests/                        # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                         # Documentation
├── .github/                      # CI/CD
│   └── workflows/
├── .env.example
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── package.json
```

**Quality Gate (P0-Q1)**: All directories exist, `npm run build` (or equivalent) succeeds with zero errors.

---

### Phase 1: Strict Type System — M5 (2 days)

**Primary Builder**: @Backend Architect
**Support**: @Workflow Architect (graph types review)

**Files to create**:
```
src/types/
├── index.ts                        # Barrel export
├── agent-input.types.ts            # AgentInput<TInput, TMetadata>
├── agent-output.types.ts           # AgentOutput<TOutput, TMetadata>
├── agent-context.types.ts          # AgentContext<TState, TMemory>
├── agent-meta.types.ts             # AgentId, AgentCapability, AgentStatus
├── execution-graph.types.ts        # DAG types: GraphNode, GraphEdge, Topology
├── pipeline.types.ts               # Pipeline, PipelineStep, RoutingRule
├── registry.types.ts               # AgentRegistration, RegistryEntry
├── prompt.types.ts                 # PromptVersion, PromptBinding, TemplateId
├── supabase.types.ts               # Repository types, Row types
├── webhook.types.ts                # WebhookPayload, WebhookResponse
├── voice.types.ts                  # VoiceConfig, STTResult, TTSPayload (stubs)
├── result.types.ts                 # Result<T, E> discriminated union
├── validation.ts                   # Zod schemas for all types
└── branded.ts                      # Branded types: AgentId, SessionId, TaskId
```

**Type Patterns**:
```typescript
// Branded types for type safety
type AgentId = string & { readonly __brand: 'AgentId' };
type SessionId = string & { readonly __brand: 'SessionId' };

// Discriminated union for results
type AgentResult<TOutput> =
  | { ok: true; output: TOutput; executionTimeMs: number; trace: TraceEvent[] }
  | { ok: false; error: AgentError; executionTimeMs: number; trace: TraceEvent[] };

// Zod schema for runtime validation
const AgentInputSchema = z.object({
  agentId: z.string().brand('AgentId'),
  task: z.string().min(1),
  context: z.record(z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Graph types for DAG
type GraphTopology = 'sequential' | 'parallel' | 'conditional' | 'fan-out-fan-in';
type GraphNode<TInput, TOutput> = {
  id: string;
  agentId: AgentId;
  input: TInput;
  dependsOn: string[];
};
type GraphEdge = {
  from: string;
  to: string;
  condition?: string; // expression string for conditional routing
};
```

**Quality Gate (M5-Q1)**: All types compile with `strict: true`. Zod validation schemas pass unit tests. Branded types prevent ID confusion at compile time.

**Dev-QA Loop**:
1. @Backend Architect implements types
2. @EvidenceQA validates: type correctness, Zod schema coverage, branded type usage
3. Loop if any type ambiguity found

---

### Phase 2: Agent Registry — M3 (2 days)

**Primary Builder**: @Backend Architect
**Support**: @Workflow Architect (registration schema)

**Files to create**:
```
src/registry/
├── index.ts                        # Barrel export
├── agent-registry.ts               # AgentRegistry class
├── agent-loader.ts                 # Loads 18 agents from .opencode/agents/
├── agent-parser.ts                 # Parses frontmatter + body
├── agent-validator.ts              # Validates against M5 types
├── agent-cache.ts                  # Lazy-load + hot-reload cache
├── registry.router.ts              # Query/filter API
└── __tests__/
    ├── agent-parser.test.ts
    ├── agent-loader.test.ts
    └── agent-registry.test.ts
```

**Critical Constraint**: The registry MUST load exactly these 18 agents and reject any attempt to register unknown agents:

1. Agents Orchestrator — `agents-orchestrator.md`
2. Customer Service — `customer-service.md`
3. Sales Outreach — `sales-outreach.md`
4. Pipeline Analyst — `sales-pipeline-analyst.md`
5. Deal Strategist — `sales-deal-strategist.md`
6. Proposal Strategist — `sales-proposal-strategist.md`
7. SEO Specialist — `marketing-seo-specialist.md`
8. Content Creator — `marketing-content-creator.md`
9. Social Media Strategist — `marketing-social-media-strategist.md`
10. Growth Hacker — `marketing-growth-hacker.md`
11. Product Manager — `product-manager.md`
12. Trend Researcher — `product-trend-researcher.md`
13. Workflow Architect — `specialized-workflow-architect.md`
14. Support Responder — `support-support-responder.md`
15. Infrastructure Maintainer — `support-infrastructure-maintainer.md`
16. Recruitment Specialist — `recruitment-specialist.md`
17. UI Designer — `design-ui-designer.md`
18. Backend Architect — `engineering-backend-architect.md`

**Registry Shape**:
```typescript
interface AgentRegistry {
  getAll(): AgentRegistration[];
  getById(id: AgentId): AgentRegistration | undefined;
  getByCapability(capability: string): AgentRegistration[];
  search(query: string): AgentRegistration[];
  refresh(): Promise<void>; // hot-reload
}
```

**Quality Gate (M3-Q1)**: `registry.getAll().length === 18`. `registry.getById('non-existent')` returns `undefined`. All agent frontmatter parses without errors.

**Dev-QA Loop**:
1. @Backend Architect implements loader + parser
2. @EvidenceQA validates: all 18 parse correctly, error on missing file, error on invalid frontmatter
3. Loop if any agent fails to parse

---

### Phase 3: Supabase Layer — M6 (3 days)

**Primary Builder**: @Infrastructure Maintainer
**Support**: @Backend Architect (schema design)

**Files to create**:
```
src/supabase/
├── index.ts                        # Barrel export
├── client.ts                       # Supabase client factory
├── migrations/
│   ├── 001_agent_executions.sql
│   ├── 002_pipeline_runs.sql
│   ├── 003_prompt_versions.sql
│   ├── 004_agent_registry_cache.sql
│   └── 005_webhook_logs.sql
├── repositories/
│   ├── agent-repository.ts         # AgentExecutionRepository
│   ├── pipeline-repository.ts      # PipelineRunRepository
│   ├── prompt-repository.ts        # PromptVersionRepository
│   └── webhook-repository.ts       # WebhookLogRepository
├── services/
│   ├── execution-service.ts        # Orchestrates repo operations
│   ├── pipeline-service.ts         # Pipeline CRUD + status
│   └── monitoring-service.ts       # Health checks, metrics
├── types.ts                        # M5-compatible DB types
└── __tests__/
    ├── repositories.test.ts
    └── services.test.ts
```

**Repository Pattern**:
```typescript
interface IRepository<TEntity, TId> {
  findById(id: TId): Promise<TEntity | null>;
  findAll(filter?: Partial<TEntity>): Promise<TEntity[]>;
  create(entity: Omit<TEntity, 'id' | 'createdAt'>): Promise<TEntity>;
  update(id: TId, changes: Partial<TEntity>): Promise<TEntity>;
  delete(id: TId): Promise<boolean>;
}
```

**Quality Gate (M6-Q1)**: All 5 migrations execute cleanly. Each repository passes CRUD tests against a real Supabase instance (test DB). Service layer returns typed results matching M5 types.

---

### Phase 4: Agent Execution Engine — M1 (4 days)

**Primary Builder**: @Backend Architect
**Support**: @Workflow Architect (DAG execution spec)

**Files to create**:
```
src/engine/
├── index.ts                        # Barrel export
├── runner/
│   ├── agent-runner.ts             # Single agent execution
│   ├── runner-context.ts           # Per-execution context
│   └── runner-options.ts           # Timeout, retry, hooks
├── chain/
│   ├── agent-chain.ts              # Sequential agent execution
│   ├── chain-step.ts               # Single step in chain
│   └── chain-builder.ts            # Fluent builder API
├── graph/
│   ├── agent-graph.ts              # DAG execution engine
│   ├── graph-topology.ts           # Topological sort
│   ├── graph-executor.ts           # Parallel + conditional execution
│   └── graph-validator.ts          # Cycle detection, validation
├── context/
│   ├── agent-context.ts            # Immutable context propagation
│   ├── context-builder.ts          # Builder pattern for context
│   └── context-merger.ts           # Merge strategies for parallel branches
├── result/
│   ├── agent-result.ts             # Typed result with trace
│   ├── result-collector.ts         # Aggregate results from graph
│   └── error.ts                    # AgentError hierarchy
└── __tests__/
    ├── runner.test.ts
    ├── chain.test.ts
    ├── graph.test.ts
    ├── context.test.ts
    └── result.test.ts
```

**Key Interfaces**:
```typescript
// Runner — single agent
interface IAgentRunner {
  run<TInput, TOutput>(
    agentId: AgentId,
    input: AgentInput<TInput>,
    options?: RunnerOptions
  ): Promise<AgentResult<TOutput>>;
}

// Chain — sequential execution
interface IAgentChain {
  add<TIn, TOut>(step: ChainStep<TIn, TOut>): IAgentChain;
  run(initialInput: unknown): Promise<ChainResult>;
}

// Graph — DAG execution
interface IAgentGraph {
  addNode<TIn, TOut>(node: GraphNode<TIn, TOut>): IAgentGraph;
  addEdge(edge: GraphEdge): IAgentGraph;
  execute(): Promise<GraphResult>;
}

// Context — immutable, propagatable
interface IAgentContext<TState extends Record<string, unknown>> {
  readonly state: TState;
  readonly sessionId: SessionId;
  readonly parentContextId?: string;
  readonly trace: TraceEvent[];
  branch(overrides?: Partial<TState>): IAgentContext<TState>;
  merge(...contexts: IAgentContext<any>[]): IAgentContext<TState>;
}
```

**Quality Gate (M1-Q1)**: Single runner executes any registered agent and returns valid `AgentResult`. Chain executes 3+ agents sequentially with context passing. Graph executes parallel branches (fan-out-fan-in) correctly. Cycle detection rejects invalid DAGs.

---

### Phase 5: Core Orchestration Layer — M2 (4 days)

**Primary Builder**: @Backend Architect
**Support**: @Workflow Architect (conditional routing specs, recovery workflows)

**Files to create**:
```
src/orchestration/
├── index.ts                        # Barrel export
├── single/
│   ├── single-agent-exec.ts        # Single agent with middleware
│   └── single-agent-options.ts     # Retry, timeout, hooks
├── pipeline/
│   ├── multi-agent-pipeline.ts     # Pipeline execution
│   ├── pipeline-builder.ts         # Fluent pipeline builder
│   ├── pipeline-step.ts            # Step definition with routing
│   └── pipeline-scheduler.ts       # Schedule/queue pipelines
├── routing/
│   ├── conditional-router.ts       # If-then-else routing
│   ├── switch-router.ts            # Multi-branch switch
│   ├── merge-router.ts             # Fan-in merge strategies
│   └── routing-rules.ts            # Rule engine for routing
├── propagation/
│   ├── context-propagator.ts       # Context propagation thru pipeline
│   ├── context-filter.ts           # Filter what propagates
│   └── context-transform.ts        # Transform context between steps
├── lifecycle/
│   ├── pipeline-lifecycle.ts       # Lifecycle hooks (before, after, error)
│   ├── pipeline-state.ts           # State machine (pending→running→done/failed)
│   └── pipeline-events.ts          # Event emitter for observability
├── middleware/
│   ├── logging-middleware.ts
│   ├── retry-middleware.ts
│   ├── timeout-middleware.ts
│   ├── validation-middleware.ts
│   └── monitoring-middleware.ts
└── __tests__/
    ├── single-agent.test.ts
    ├── multi-pipeline.test.ts
    ├── conditional-routing.test.ts
    ├── context-propagation.test.ts
    └── lifecycle.test.ts
```

**Conditional Routing**:
```typescript
type RoutingRule<TContext> = {
  condition: (context: IAgentContext<TContext>) => boolean | Promise<boolean>;
  then: PipelineStep<any, any>;
  otherwise?: PipelineStep<any, any>;
};

type PipelineTopology =
  | { type: 'sequential'; steps: PipelineStep[] }
  | { type: 'parallel'; branches: PipelineStep[]; merge: MergeStrategy }
  | { type: 'conditional'; rules: RoutingRule[]; default?: PipelineStep }
  | { type: 'fan-out-fan-in'; fanOut: PipelineStep; fanIn: PipelineStep };
```

**Quality Gate (M2-Q1)**: Pipeline with 3 sequential agents completes with correct context propagation. Conditional routing with 3 branching rules follows correct path. Error in one branch of parallel execution does not crash entire pipeline. Pipeline state machine transitions correctly.

---

### Phase 6: Externalized Prompt System — M4 (2 days)

**Primary Builder**: @Backend Architect
**Support**: @Product Manager (versioning spec), @Content Creator (prompt tone)

**Files to create**:
```
src/prompts/
├── index.ts                        # Barrel export
├── prompt-registry.ts              # Versioned prompt store
├── prompt-loader.ts                # Load prompts from files
├── prompt-resolver.ts              # Resolve agentId + version → prompt
├── prompt-compiler.ts              # Template compilation (Handlebars/Mustache)
├── prompt-version.ts               # Semantic versioning for prompts
├── prompt-hooks.ts                 # Before/after render hooks
├── templates/
│   ├── default/                    # Default prompt templates
│   │   ├── agent-execute.hbs
│   │   ├── agent-validate.hbs
│   │   └── pipeline-route.hbs
│   └── agents/                     # Per-agent prompt overrides
│       ├── agents-orchestrator/
│       │   └── v1.hbs
│       ├── backend-architect/
│       │   └── v1.hbs
│       └── ... (one per agent)
└── __tests__/
    ├── prompt-registry.test.ts
    ├── prompt-compiler.test.ts
    └── prompt-resolver.test.ts
```

**Versioning Scheme**: `{major}.{minor}.{patch}` — major for breaking template changes, minor for additions, patch for fixes.

**Quality Gate (M4-Q1)**: All 18 agents have at least one prompt version. Prompt resolution returns correct version. Template compilation with context produces valid output. Version pinning works (agent v1.0.0 always resolves to same template).

---

### Phase 7: n8n Integration — M7 (2 days)

**Primary Builder**: @Infrastructure Maintainer
**Support**: @Workflow Architect (webhook contract)

**Rule**: n8n contains ZERO business logic. It is a pure webhook relay.

**Files to create**:
```
src/integrations/n8n/
├── index.ts                        # Barrel export
├── webhook-handler.ts              # Receive n8n webhooks → trigger M2
├── webhook-validator.ts            # Validate hmac signature
├── webhook-router.ts               # Route to correct pipeline
├── webhook-response.ts             # Standardized response shapes
└── n8n-workflows/                  # Reference n8n workflow JSON exports
    ├── trigger-pipeline.json       # External trigger → POST to platform
    └── webhook-to-agent.json       # Generic webhook → agent execution
```

**Webhook Contract**:
```typescript
interface WebhookPayload {
  webhookId: string;                // n8n webhook ID
  pipelineId?: string;              // Target pipeline (optional — uses default)
  agentId?: AgentId;                // Single agent target
  input: Record<string, unknown>;   // The actual payload
  metadata?: {
    source: string;                 // e.g., 'n8n', 'slack', 'api'
    timestamp: string;              // ISO 8601
    idempotencyKey?: string;        // For dedup
  };
}

interface WebhookResponse {
  accepted: boolean;
  executionId?: string;             // M2 execution trace ID
  status: 'queued' | 'running' | 'rejected';
  reason?: string;
  estimatedCompletionMs?: number;
}
```

**Quality Gate (M7-Q1)**: Webhook endpoint receives payload, validates HMAC, triggers M2 pipeline, returns valid response. n8n workflow JSON exports are importable.

---

### Phase 8: UI Dashboard — P8 (2 days)

**Primary Builder**: @UI Designer
**Support**: @Pipeline Analyst (dashboard requirements)

**Files to create**:
```
src/ui/
├── pages/
│   ├── dashboard.tsx               # Main dashboard
│   ├── pipeline-builder.tsx        # Visual pipeline builder
│   ├── agent-detail.tsx            # Agent info + stats
│   ├── execution-history.tsx       # Execution logs
│   └── settings.tsx                # Configuration
├── components/
│   ├── agent-card.tsx
│   ├── pipeline-graph.tsx          # DAG visualization
│   ├── execution-timeline.tsx
│   ├── metrics-panel.tsx
│   └── webhook-config.tsx
├── hooks/
│   ├── use-agent-registry.ts
│   ├── use-pipeline-execution.ts
│   └── use-supabase.ts
└── styles/
    └── dashboard.css
```

**Quality Gate (P8-Q1)**: Dashboard loads agent list from M3. Pipeline builder creates a valid pipeline config. Execution history reads from M6.

---

### Phase 9: Voice Layer — M8 (0.5 day)

**Primary Builder**: @Infrastructure Maintainer

**Constraint**: All code behind a feature flag. No active functionality. Stubs only.

```typescript
// All stubs — inactive until Voice Phase 2 initiative
interface IVoiceLayer {
  readonly enabled: boolean;        // Always false for now
  stt?: STTEngine;                  // undefined
  tts?: TTSEngine;                  // undefined
  livekit?: LiveKitConfig;          // undefined
}
```

**Files to create**:
```
src/integrations/voice/
├── index.ts                        # Barrel export — empty unless flag
├── stt-stub.ts                     # STT stub
├── tts-stub.ts                     # TTS stub
├── livekit-stub.ts                 # LiveKit stub
├── voice-config.ts                 # Feature-flag gated config
└── types.ts                        # Voice types (from M5)
```

**Quality Gate (M8-Q1)**: Importing voice module does not throw. `voice.enabled === false`. No active subscriptions/connections created at import time.

---

### Phase 10: Integration & QA — P10 (3 days)

**Primary Builder**: @Agents Orchestrator (meta)
**QA Lead**: @TestingRealityChecker

**Validation Sequence**:
1. **CIP-01**: Run type checker across all modules — 0 type errors
2. **CIP-02**: Registry loads 18 agents, rejects unknown
3. **CIP-03**: AgentRunner executes all 18 agents successfully
4. **CIP-04**: Multi-agent pipeline routes context correctly
5. **CIP-05**: Prompt resolver returns correct versions
6. **CIP-06**: Supabase repositories return typed data
7. **CIP-07**: n8n webhook triggers orchestration pipeline
8. **CIP-08**: Voice stubs compile, never activate
9. **CIP-09**: UI reads from registry + Supabase

**Full Smoke Test**: Execute a pipeline that uses 3+ agents, persists to Supabase, triggers from n8n webhook, visualizes in UI.

---

### Phase 11: Documentation & Go-to-Market — P11 (2 days)

| Agent | Deliverable |
|-------|-------------|
| @Content Creator | Technical documentation, API reference, onboarding guide |
| @SEO Specialist | doc site SEO, URL structure, schema markup |
| @Social Media Strategist | Launch announcement, changelog |
| @Growth Hacker | Adoption strategy, onboarding funnel spec |
| @Customer Service + @Support Responder | Error message audit, user-facing text finalization |

---

## 6. Meta-Orchestration: How @Agents Orchestrator Fits

### 6.1 The Meta-Orchestration Pattern

The @Agents Orchestrator does **not** write any platform code. It operates one level above the build, acting as:

```
  ┌──────────────────────────────────────────────────────┐
  │           @Agents Orchestrator (META-LEVEL)           │
  │                                                        │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
  │  │  Plan    │→ │  Spawn   │→ │  QA Loop │→ │ Ship   │ │
  │  │  Phase   │  │  Builder │  │  Validate│  │ Phase  │ │
  │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
  │                                                        │
  │  Controls: Pipeline State, Retry Counter,              │
  │            Quality Gate Status, Agent Handoffs          │
  └────────────────────────────────────────────────────────┘
           │ spawns     │ validates     │ integrates
           ▼            ▼               ▼
  ┌──────────────────────────────────────────────────────┐
  │             BUILD-LEVEL AGENTS                        │
  │  @Backend Architect  @Infrastructure Maintainer        │
  │  @Workflow Architect  @UI Designer  @Content Creator   │
  │  ... (all 18 agents)                                  │
  └──────────────────────────────────────────────────────┘
```

### 6.2 Orchestrator State Machine

```
         ┌───────────┐
         │  INIT     │
         └─────┬─────┘
               ▼
         ┌───────────┐
         │ PLANNING  │
         └─────┬─────┘
               ▼
         ┌───────────┐     per-module      ┌───────────┐
         │ EXECUTING ├─────────────────────→│  QA GATE  │
         └─────┬─────┘                     └─────┬─────┘
               │                                  │
               │ (all modules complete)           │ PASS → next module
               ▼                                  │ FAIL → retry (max 3)
         ┌───────────┐                            │
         │INTEGRATION│←───────────────────────────┘
         └─────┬─────┘
               ▼
         ┌───────────┐
         │ COMPLETED │
         └───────────┘
```

### 6.3 Orchestrator's Runtime Role in the Platform

Once the platform is built, @Agents Orchestrator also runs **inside** the platform as Agent #1 in the registry (the `agents-orchestrator` agent). In this capacity:

- **Build-time**: @Agents Orchestrator operates as the meta-orchestrator (this plan)
- **Runtime**: @Agents Orchestrator is Agent #1, a pipeline manager agent that other pipelines can invoke

These two roles share a name but are distinct invocation contexts.

### 6.4 Error Escalation Ladder

| Failure Level | Action | Escalation Target |
|--------------|--------|-------------------|
| 1: Unit test fails | Loop back to builder with feedback | Same builder agent |
| 2: Quality gate fails (1-2 retries) | Increment retry, add context from previous attempt | Same builder agent + more QA context |
| 3: Quality gate fails (3rd retry) | Escalate, document failure pattern | @Agents Orchestrator re-plans |
| 4: Integration fails | Block pipeline, assess dependency chain | Full plan reassessment |

---

## 7. Naming Conventions

### 7.1 Directory Structure

```
src/
├── {module-name}/                   # kebab-case directory names
│   ├── index.ts                     # Barrel export (REQUIRED)
│   ├── {submodule-name}/            # kebab-case subdirectories
│   ├── {module-name}.ts             # kebab-case files for classes/services
│   ├── {module-name}.types.ts       # Types file (suffixed .types.ts)
│   ├── {module-name}.config.ts      # Config file (suffixed .config.ts)
│   ├── {module-name}.test.ts        # Test file (co-located)
│   └── __tests__/                   # Alternative: test directory
│       └── {module-name}.test.ts
```

### 7.2 File Naming

| Pattern | Example | When to Use |
|---------|---------|-------------|
| `kebab-case.ts` | `agent-runner.ts` | Services, classes, utilities |
| `kebab-case.types.ts` | `execution-graph.types.ts` | Type definitions, interfaces |
| `kebab-case.config.ts` | `supabase.config.ts` | Configuration files |
| `kebab-case.test.ts` | `agent-registry.test.ts` | Unit tests |
| `kebab-case.e2e.ts` | `pipeline-execution.e2e.ts` | E2E tests |
| `kebab-case.migration.ts` | `001_agent_executions.migration.ts` | Database migrations |
| `kebab-case.hbs` | `agent-execute.hbs` | Prompt templates |
| `kebab-case.router.ts` | `registry.router.ts` | Route definitions |

### 7.3 Class Naming (PascalCase)

| Pattern | Example |
|---------|---------|
| `{ModuleName}` | `AgentRegistry`, `SupabaseClient` |
| `{ModuleName}{Role}` | `AgentRunner`, `ChainBuilder`, `ContextPropagator` |
| `I{ModuleName}` | `IAgentRunner`, `IAgentRegistry` (interfaces) |
| `{ModuleName}Error` | `AgentError`, `RegistryError` (error classes) |
| `{ModuleName}Config` | `RunnerConfig`, `OrchestratorConfig` |
| `{ModuleName}Builder` | `PipelineBuilder`, `ContextBuilder` (builder pattern) |

### 7.4 Type/Interface Naming

| Pattern | Example |
|---------|---------|
| `I{Entity}` | `IAgentRunner`, `IAgentRegistry` |
| `{Entity}Type` | `AgentId`, `SessionId` (branded types) |
| `{Entity}Schema` | `AgentInputSchema` (Zod schemas) |
| `{Adjective}{Entity}` | `StrictAgentInput`, `SerializedAgentContext` |
| `T{Type}` | `TInput`, `TOutput` (generic type params) |

### 7.5 Function Naming (camelCase)

| Pattern | Example |
|---------|---------|
| `{verb}{Noun}` | `createAgent()`, `executePipeline()`, `resolvePrompt()` |
| `{noun}{Verb}` | `agentRegistry.getAll()`, `pipelineBuilder.addStep()` |
| `is{State}` | `isRunning()`, `isValidGraph()` (predicates) |
| `to{Format}` | `toJSON()`, `toSerialized()` (conversions) |
| `from{Source}` | `fromFile()`, `fromConfig()` (factories) |

### 7.6 Environment Variable Conventions

```
NEXUS_AGENT_<MODULE>_<KEY>
```

Examples:
- `NEXUS_AGENT_SUPABASE_URL`
- `NEXUS_AGENT_N8N_WEBHOOK_SECRET`
- `NEXUS_AGENT_LOG_LEVEL`
- `NEXUS_AGENT_VOICE_ENABLED=false`

### 7.7 Database Naming

| Convention | Example |
|------------|---------|
| `snake_case` tables | `agent_executions`, `pipeline_runs` |
| `snake_case` columns | `agent_id`, `execution_time_ms`, `created_at` |
| `{table}_pkey` primary key | `agent_executions_pkey` |
| `idx_{table}_{column}` index | `idx_agent_executions_agent_id` |
| `fk_{table}_{ref_table}` foreign key | `fk_pipeline_runs_agent_id` |

---

## 8. Quality Gates & Validation Checkpoints

### 8.1 Gate Matrix

| Gate ID | Module | Check | Passing Criteria | Validator |
|---------|--------|-------|-----------------|-----------|
| **G-P0** | P0 | Directory structure | All dirs exist, `npm run build` passes | @Agents Orchestrator |
| **G-M5-1** | M5 | Type compilation | `tsc --noEmit` with zero errors | @EvidenceQA |
| **G-M5-2** | M5 | Zod validation | All Zod schemas pass robust test cases | @EvidenceQA |
| **G-M3-1** | M3 | Agent count | Exactly 18 agents loaded | @EvidenceQA |
| **G-M3-2** | M3 | Agent parsing | All frontmatter parses, no errors | @EvidenceQA |
| **G-M3-3** | M3 | Reject unknown | Loading non-existent agent returns undefined/null | @EvidenceQA |
| **G-M6-1** | M6 | Migration execution | All 5 migrations apply/revert cleanly | @API Tester |
| **G-M6-2** | M6 | CRUD operations | Each repository passes insert/read/update/delete | @API Tester |
| **G-M6-3** | M6 | Type alignment | Repository returns match M5 type expectations | @EvidenceQA |
| **G-M1-1** | M1 | Single runner | Each agent executes, returns valid result | @EvidenceQA |
| **G-M1-2** | M1 | Chain execution | 3-agent chain passes context correctly | @EvidenceQA |
| **G-M1-3** | M1 | DAG execution | Fan-out-fan-in completes, parallel branches work | @EvidenceQA |
| **G-M1-4** | M1 | Cycle detection | Invalid DAG rejected with clear error | @EvidenceQA |
| **G-M2-1** | M2 | Pipeline state machine | All state transitions valid | @EvidenceQA |
| **G-M2-2** | M2 | Conditional routing | All branches reachable with correct conditions | @EvidenceQA |
| **G-M2-3** | M2 | Error isolation | Error in one branch doesn't kill others | @EvidenceQA |
| **G-M2-4** | M2 | Context propagation | Context flows correctly through pipeline | @EvidenceQA |
| **G-M4-1** | M4 | All agents have prompts | Each of 18 agents has >= 1 prompt version | @EvidenceQA |
| **G-M4-2** | M4 | Version resolution | Pinning returns consistent version | @EvidenceQA |
| **G-M4-3** | M4 | Template compilation | Templates compile with real context | @EvidenceQA |
| **G-M7-1** | M7 | Webhook receive | Endpoint returns 200 with valid payload | @API Tester |
| **G-M7-2** | M7 | Pipeline trigger | Webhook triggers M2 pipeline execution | @API Tester |
| **G-M7-3** | M7 | HMAC validation | Invalid signatures rejected with 401 | @API Tester |
| **G-M8-1** | M8 | Stub compilation | Voice layer compiles, `enabled === false` | @EvidenceQA |
| **G-P8-1** | P8 | Registry read | UI displays all 18 agents from M3 | @EvidenceQA |
| **G-P8-2** | P8 | Pipeline builder | UI creates valid pipeline config | @EvidenceQA |
| **G-INT-1** | P10 | Full smoke test | End-to-end pipeline execution works end-to-end | @TestingRealityChecker |
| **G-INT-2** | P10 | Performance | Single agent exec < 500ms, pipeline < 5s (with 3 agents) | @Performance Benchmarker |
| **G-INT-3** | P10 | No regression | All unit tests pass across ALL modules | @Test Results Analyzer |

### 8.2 Gate Assertion Levels

Each gate has a severity:

- **🔴 BLOCKER**: Pipeline cannot advance. Must be remediated before next phase.
- **🟡 WARNING**: Should be fixed but next phase can start in parallel (if independent).
- **🟢 INFO**: Nice-to-have, documented as tech debt.

### 8.3 Validation Artifacts

Each QA cycle produces:
1. **QA Report**: PASS/FAIL per test case, with screenshot evidence where applicable
2. **Coverage Report**: Line/branch/function coverage metrics
3. **Type Check Log**: `tsc --noEmit` output
4. **Trace Log**: Execution trace of pipeline tests

---

## 9. Risk Register

| Risk ID | Description | Probability | Impact | Mitigation |
|---------|-------------|-------------|--------|------------|
| R-01 | @Backend Architect is over-allocated (builds M5, M3, M1, M2, M4) | HIGH | CRITICAL | Parallelize M6 (Infrastructure) and spec work (Workflow, Product) while blocking on Backend Architect; consider splitting M2 submodules |
| R-02 | M5 type changes after M1/M2 start building | MEDIUM | HIGH | Strict interface-first contract. M5 outputs `.types.ts` files as the FIRST deliverable. M1/M2 build against types, not implementations. |
| R-03 | Agent frontmatter format inconsistencies in .opencode/agents/ | MEDIUM | MEDIUM | M3 parser must handle format variations gracefully; write adaptive parser before strict validator |
| R-04 | Supabase schema migrations conflict with M5 types | LOW | MEDIUM | M6 types.ts imports from M5; any schema change must go through M5 review |
| R-05 | n8n webhook contract changes | LOW | LOW | M7 webhook handler validates shape; contract defined in .types.ts |
| R-06 | Scope creep on Voice Layer | MEDIUM | LOW | M8 stubs only, everything behind feature flag. Voice expansion is a separate initiative. |
| R-07 | Agent count changes (registry frozen to 18) | LOW | MEDIUM | M3 unit test asserts exact count; any addition requires explicit spec change |
| R-08 | @Agents Orchestrator resource contention (meta + agent #1) | LOW | LOW | Build-time and runtime roles are separate contexts; documented in §6.3 |

---

## 10. Appendix: Agent Contact Cards

| # | Agent Name | File | Domain | Build Role |
|---|-----------|------|--------|-----------|
| 1 | @Agents Orchestrator | `agents-orchestrator.md` | Pipeline management | META — orchestrates all |
| 2 | @Customer Service | `customer-service.md` | Customer support | Spec: error messages, UX text |
| 3 | @Sales Outreach | `sales-outreach.md` | Sales outreach | Spec: agent spawn UX |
| 4 | @Pipeline Analyst | `sales-pipeline-analyst.md` | Pipeline analytics | Spec: metrics, dashboard KPIs |
| 5 | @Deal Strategist | `sales-deal-strategist.md` | Deal strategy | Spec: conditional routing rules |
| 6 | @Proposal Strategist | `sales-proposal-strategist.md` | Proposals | Spec: output template format |
| 7 | @SEO Specialist | `marketing-seo-specialist.md` | SEO | Doc site SEO, URL structure |
| 8 | @Content Creator | `marketing-content-creator.md` | Content | Documentation, onboarding |
| 9 | @Social Media Strategist | `marketing-social-media-strategist.md` | Social media | Launch announcements |
| 10 | @Growth Hacker | `marketing-growth-hacker.md` | Growth | A/B pipeline specs |
| 11 | @Product Manager | `product-manager.md` | Product | PRDs, acceptance criteria |
| 12 | @Trend Researcher | `product-trend-researcher.md` | Trends | Technology risk assessment |
| 13 | @Workflow Architect | `specialized-workflow-architect.md` | Workflows | DAG specs, handoff contracts |
| 14 | @Support Responder | `support-support-responder.md` | Support | Failure recovery specs |
| 15 | @Infrastructure Maintainer | `support-infrastructure-maintainer.md` | Infrastructure | Builder: M6, M7, M8 |
| 16 | @Recruitment Specialist | `recruitment-specialist.md` | Recruitment | Capability assessment schema |
| 17 | @UI Designer | `design-ui-designer.md` | UI design | Builder: P8 Dashboard |
| 18 | @Backend Architect | `engineering-backend-architect.md` | Backend | **Primary Builder**: M5, M3, M1, M2, M4 |

---

## Orchestrator Sign-Off

```
Pipeline Plan:     NEXUS-ORCHESTRATION-V1
Status:            APPROVED
Agent:             @Agents Orchestrator
Date:              2026-06-11
Next Action:       Execute Phase 0 — spawn @Backend Architect for P0 foundation
```

---

*End of Orchestration Plan*
