# Nexus Agent Platform

Multi-agent orchestration runtime with DAG-based execution, agent registry, and context propagation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   WorkflowEngine                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  AgentChain  │  │  AgentGraph  │  │  WorkflowDefinition│  │
│  │  (Sequential)│  │  (DAG/Parallel)│  │  (YAML/JSON)     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐ │
│  │                 AgentRunner                              │ │
│  │  validate → rateLimit → circuitCheck → execute → retry  │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │                 AgentRegistry                             │ │
│  │    18 adapters · tag indexing · capability resolution    │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │              ContextStore (NexusAgentContext)             │ │
│  │  versioned snapshots · dot-notation paths · deep merge  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

- **AgentRunner** — Single-agent lifecycle: validate → rate-limit → circuit-break → execute → retry (exponential backoff, max 2 retries)
- **ContextStore** — Typed key-value store with versioned snapshots, dot-notation path access, and full modification history
- **ExecutionLoop** — Routes WorkflowDefinitions to either Chain (sequential) or Graph (DAG) execution
- **AgentGraph (DAG)** — Kahn topological sort → parallel levels → conditional edges → skip propagation on failure
- **WorkflowEngine** — Top-level orchestrator: register workflows → validate → execute (sync/async) → worker pool

## Implemented Agents

| ID | Name | Domain |
|---|---|---|
| `backend-architect` | Backend Architect | Engineering |
| `frontend-developer` | Frontend Developer | Engineering |
| `senior-developer` | Senior Developer | Engineering |
| `ai-engineer` | AI Engineer | Engineering |
| `devops-automator` | DevOps Automator | Engineering |
| `security-engineer` | Security Engineer | Engineering |
| `data-engineer` | Data Engineer | Engineering |
| `sre` | Site Reliability Engineer | Engineering |
| `code-reviewer` | Code Reviewer | Engineering |
| `ui-designer` | UI Designer | Design |
| `ux-architect` | UX Architect | Design |
| `brand-guardian` | Brand Guardian | Design |
| `content-creator` | Content Creator | Marketing |
| `seo-specialist` | SEO Specialist | Marketing |
| `product-manager` | Product Manager | Product |
| `project-manager` | Project Manager | Product |
| `api-tester` | API Tester | Testing |
| `agents-orchestrator` | Agents Orchestrator | Core |

## DAG Execution

The engine supports three execution modes:

### Parallel Branches
Independent nodes at the same topological level execute concurrently. Example:

```
Trend Researcher ──┬──► SEO Specialist ──► Content Creator ──┐
                   │                                          │
                   └──► Growth Hacker ────────────────────────┼──► Product Manager ──► Proposal Strategist
                                                              │
                                        Social Media Strategist
```

### Conditional Routing
Edges support conditions evaluated against the runtime context. A Quality Check node can route to revision or direct-to-publish based on a quality score threshold.

### Failure Handling
- **Retry:** Max 2 retries with exponential backoff (2s → 4s) + jitter
- **SKIP propagation:** When a node fails after all retries, all downstream dependents are automatically SKIPPED
- **Circuit breaker:** Opens after 5 consecutive failures, resets after 60s
- **Rate limiter:** Sliding window, 100 executions/minute per agent

## Example Execution Flow

```
Content Marketing Pipeline (DAG mode):
1. @Trend Researcher → market signals, trends, competitive landscape
2. @SEO Specialist (parallel with step 3) → keyword map, SEO brief
3. @Growth Hacker (parallel with step 2) → growth experiments, channel priorities
4. @Content Creator → content draft, headlines, quality score
5. @Social Media Strategist → platform strategy, posting schedule
6. @Product Manager → roadmap, go-to-market plan, success metrics
```

## How to Run Locally

```bash
# Install dependencies
npm install

# Run Next.js dev server (includes the engine)
npm run dev

# Run DAG execution simulation (standalone)
node scripts/dag-simulation.mjs

# Build for production
npm run build
```

## Project Structure

```
engine/
├── core/              # AgentRunner, ContextStore, AgentGraph, WorkflowEngine
├── registry/          # AgentRegistry, adapter loader, 18 adapter implementations
├── types/             # TypeScript interfaces for all domains
├── supabase/          # Repository pattern implementations
├── n8n/               # Webhook trigger definitions
├── voice/             # STT/TTS/LiveKit stubs
├── config/            # Configuration profiles
├── api/               # API route handlers
├── cache/             # Cache layer
├── queue/             # Queue layer
└── prompts/           # Prompt template paths

lib/
├── engine/            # WorkflowDefinition, DagBuilder, context propagation
├── agent-registry/    # Type system, flows, adapters
└── agents/            # Registry types and base adapters

workflows/             # Example workflow YAML/JSON definitions
prompts/               # Externalized versioned prompt templates
scripts/               # Utility scripts (DAG simulation)
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js 16 (App Router)
- **State:** In-memory ContextStore with history tracking
- **Orchestration:** Kahn topological sort, level-based parallel execution
- **Resilience:** Exponential backoff retry, circuit breaker, rate limiter

## License

MIT
