# Execution Flow Examples — @support-responder

This directory contains canonical execution flows demonstrating how the
@support-responder agent integrates into the Nexus Agent Orchestration Engine.

## Available Flows

| File | Pattern | Description |
|------|---------|-------------|
| `single-flow.ts` | **Single** | Standalone ticket resolution (chat channel) |
| `chain-flow.ts` | **Chain** | @customer-service triage → @support-responder resolution |
| `conditional-flow.ts` | **Conditional** | Satisfaction-gated recovery routing |

## Flow Legend

```
[Agent]   — agent invocation via orchestrator
(Input)   — typed AgentInput passed to the agent
(Output)  — typed AgentOutput returned by the agent
{Context} — AgentContext keys read/written in shared state
◇ Decision — branching gate evaluated by orchestrator
```
