# CustomerServiceAdapter — Execution Flow Examples

> **Graph Runtime**: AgentRunner → AgentChain → AgentGraph
> **Adapter**: `CustomerServiceAdapter` (id: `customer-service`)
> **Target Agent**: `@customer-service`

---

## 1. Single Execution: CustomerService Resolves a Support Ticket

A customer submits a billing question. The `@customer-service` agent handles it
entirely within one node — no chaining, no escalation.

### Graph Definition

```json
{
  "id": "support-single",
  "version": "1.0.0",
  "entryPoints": ["handle"],
  "nodes": [
    {
      "id": "handle",
      "adapter": "customer-service",
      "label": "Handle Customer Inquiry"
    }
  ],
  "edges": []
}
```

### Agent Input

```json
{
  "meta": {
    "traceId": "trace_abc123",
    "source": "trigger",
    "timestamp": "2026-06-11T10:00:00Z",
    "correlationId": "TKT-4521"
  },
  "payload": {
    "inquiry": {
      "type": "faq",
      "message": "What is your refund policy for items purchased online?",
      "channel": "chat",
      "attachments": []
    },
    "customer": {
      "name": "Sarah Chen",
      "id": "cust_8892",
      "email": "sarah.chen@example.com",
      "accountTier": "premium"
    },
    "business": {
      "name": "Acme Retail",
      "industry": "retail",
      "agentName": "Alex"
    }
  }
}
```

### Execution Steps

| Step | Action | Details |
|------|--------|---------|
| 1 | `readContext()` | Hydrates customer name, tier from context |
| 2 | `validateInput()` | Passes — FAQ type, non-empty message, valid channel |
| 3 | `validateContextIntegrity()` | Passes — business.name is present |
| 4 | Prompt engine resolves `customer-service.prompt.yaml` | Template rendered with: `{{business_name}}` = "Acme Retail", `{{customer_name}}` = "Sarah Chen", `{{inquiry_type}}` = "faq" |
| 5 | LLM invocation | System prompt + user message → structured JSON output |
| 6 | Output parsed & validated | Schema check: response.text exists, escalation.flag is boolean, resolution.status is valid |
| 7 | `writeContext()` | Persists: resolution status, response text, escalation flag, turn count |
| 8 | Returns `AgentOutput` | Success → graph ends |

### Agent Output

```json
{
  "payload": {
    "response": {
      "text": "Great question, Sarah! For online purchases, you have 30 days from delivery to return items in original condition. Since you're a Premium member, you also get free return shipping and a prepaid label. Would you like me to start a return for you?",
      "tone": "professional",
      "actions": [
        {
          "type": "info_provided",
          "status": "completed",
          "details": "Explained 30-day return policy with Premium benefits"
        }
      ]
    },
    "escalation": {
      "flag": false
    },
    "resolution": {
      "status": "resolved",
      "category": "faq",
      "confidence": 1.0,
      "requiresFollowUp": false
    },
    "retention": {
      "risk": "low",
      "attemptMade": false
    },
    "documentation": {
      "interactionSummary": "Answered refund policy inquiry for Premium customer Sarah Chen via live chat. Customer informed of 30-day window and free return shipping benefits.",
      "commitments": [],
      "caseId": "CASE-1718114400000"
    }
  },
  "meta": {
    "traceId": "trace_abc123",
    "source": "customer-service",
    "timestamp": "2026-06-11T10:00:12Z",
    "success": true,
    "durationMs": 1247
  }
}
```

---

## 2. Chained Execution: @customer-service → @support-responder

A customer has a technical issue that the customer service agent identifies as
requiring specialist support. It resolves the greeting, identifies the need for
escalation, then passes full context to the support-responder agent.

### Graph Definition

```json
{
  "id": "support-chained",
  "version": "1.0.0",
  "entryPoints": ["triage"],
  "nodes": [
    {
      "id": "triage",
      "adapter": "customer-service",
      "label": "Initial Triage & Greeting"
    },
    {
      "id": "resolve",
      "adapter": "support-support-responder",
      "label": "Technical Resolution"
    }
  ],
  "edges": [
    {
      "from": "triage",
      "to": "resolve",
      "label": "Escalate to specialist"
    }
  ]
}
```

### Input to `triage` Node

```json
{
  "meta": {
    "traceId": "trace_def456",
    "source": "trigger",
    "timestamp": "2026-06-11T14:30:00Z",
    "correlationId": "TKT-4525"
  },
  "payload": {
    "inquiry": {
      "type": "complaint",
      "message": "My account keeps logging me out and I keep getting an error message saying 'session expired'. I've tried everything and it's still broken.",
      "channel": "chat",
      "urgency": "high"
    },
    "customer": {
      "name": "James Miller",
      "id": "cust_1234",
      "email": "james.m@example.com",
      "accountTier": "standard"
    },
    "business": {
      "name": "CloudSync SaaS",
      "industry": "saas"
    }
  }
}
```

### What Happens Inside the `triage` Node

The CustomerServiceAdapter determines this is an escalation:

1. **Read context**: Customer profile, account tier
2. **Determine escalation**: The inquiry is urgent and involves a technical issue
   the agent cannot resolve (session/authentication) → `escalation.flag = true`
3. **Set target agent**: `support-support-responder` (the specialist agent)
4. **Build escalation context**: Includes full customer data, inquiry details,
   and a summary of the interaction so far
5. **Write context**: Sets `customerService.escalation.*` keys so the graph
   router can conditionally route
6. **Return output** with `resolution.status = "escalated"`

### Output from `triage` Node (passed through context to `resolve`)

```json
{
  "payload": {
    "response": {
      "text": "I'm sorry you're dealing with that, James — repeated logouts are incredibly frustrating, especially when you're trying to get work done. I've documented everything you've described, and I'm going to connect you with our technical support team who can look at your account specifically and get this resolved. They'll have full context so you won't need to repeat yourself.",
      "tone": "empathetic",
      "actions": [
        {
          "type": "follow_up",
          "status": "actioned",
          "details": "Escalated to support-support-responder with full context"
        }
      ]
    },
    "escalation": {
      "flag": true,
      "reason": "Technical issue (session/authentication) beyond customer-service scope",
      "priority": "urgent",
      "targetAgent": "support-support-responder",
      "context": {
        "errorType": "session_expired",
        "attemptsMade": "multiple",
        "customerEmail": "james.m@example.com",
        "accountId": "cust_1234"
      }
    },
    "resolution": {
      "status": "escalated",
      "category": "complaint",
      "confidence": 0.88,
      "requiresFollowUp": true
    },
    "retention": {
      "risk": "medium",
      "attemptMade": false
    },
    "documentation": {
      "interactionSummary": "Customer reported persistent session expiration errors. Escalated to technical support for account-level investigation.",
      "commitments": [],
      "caseId": "CASE-1718123400000"
    },
    "suggestedNext": {
      "agent": "support-support-responder",
      "reason": "Technical issue (session/authentication) beyond customer-service scope",
      "context": {
        "errorType": "session_expired",
        "attemptsMade": "multiple",
        "customerEmail": "james.m@example.com",
        "accountId": "cust_1234"
      }
    }
  },
  "meta": {
    "traceId": "trace_def456",
    "source": "customer-service",
    "timestamp": "2026-06-11T14:30:18Z",
    "success": true,
    "durationMs": 2103
  }
}
```

### Context State After `triage`

The `writeContext()` call populates these keys for the downstream agent:

| Context Key | Value |
|-------------|-------|
| `customerService.resolution.status` | `"escalated"` |
| `customerService.escalation.flag` | `true` |
| `customerService.escalation.reason` | `"Technical issue..."` |
| `customerService.escalation.targetAgent` | `"support-support-responder"` |
| `customerService.suggestedNext.agent` | `"support-support-responder"` |
| `customerService.response.text` | `"I'm sorry you're dealing with that..."` |
| `customer.id` | `"cust_1234"` |
| `customer.name` | `"James Miller"` |
| `conversation.history` | `[{ role: "customer", text: "..." }, { role: "agent", text: "..." }]` |

### Input to `resolve` Node

The graph router sees `customerService.escalation.flag = true` and routes to
the `resolve` node. The `resolve` node's adapter (`support-support-responder`)
receives the full context enriched by `triage`.

```json
{
  "meta": {
    "traceId": "trace_def456",
    "source": "customer-service",
    "timestamp": "2026-06-11T14:30:18Z",
    "correlationId": "TKT-4525"
  },
  "payload": {
    "inquiry": {
      "type": "complaint",
      "message": "My account keeps logging me out and I keep getting an error message saying 'session expired'. I've tried everything and it's still broken.",
      "channel": "chat",
      "urgency": "high"
    },
    "customer": {
      "name": "James Miller",
      "id": "cust_1234",
      "email": "james.m@example.com",
      "accountTier": "standard"
    },
    "business": {
      "name": "CloudSync SaaS",
      "industry": "saas"
    },
    "escalation": {
      "reason": "Technical issue (session/authentication) beyond customer-service scope",
      "context": {
        "errorType": "session_expired",
        "attemptsMade": "multiple",
        "customerEmail": "james.m@example.com",
        "accountId": "cust_1234"
      }
    }
  }
}
```

---

## 3. Conditional Routing: escalation_flag-based Graph Fork

The graph branches based on the `escalation.flag` output. If true, route to
specialist. If false, the interaction is complete.

### Graph Definition with Conditional Edge

```json
{
  "id": "support-conditional",
  "version": "1.0.0",
  "entryPoints": ["customer-service"],
  "nodes": [
    {
      "id": "customer-service",
      "adapter": "customer-service",
      "label": "Customer Service Triage"
    },
    {
      "id": "specialist",
      "adapter": "support-support-responder",
      "label": "Specialist Resolution"
    },
    {
      "id": "analytics",
      "adapter": "support-analytics-reporter",
      "label": "Log Resolution Analytics"
    }
  ],
  "edges": [
    {
      "from": "customer-service",
      "to": "specialist",
      "condition": {
        "path": "payload.escalation.flag",
        "equals": true
      },
      "label": "Escalate to specialist"
    },
    {
      "from": "customer-service",
      "to": "analytics",
      "condition": {
        "path": "payload.escalation.flag",
        "equals": false
      },
      "label": "Log resolved ticket"
    },
    {
      "from": "specialist",
      "to": "analytics",
      "label": "Log post-escalation analytics"
    }
  ]
}
```

### Execution Scenarios

#### Scenario A: FAQ → No Escalation → Logged

```
customer-service (faq) ──[escalation.flag=false]──→ analytics-reporter
```

1. `customer-service` node: FAQ about shipping policy
2. Agent resolves immediately → `escalation.flag = false`
3. Graph evaluates condition on edge to `specialist`: `payload.escalation.flag ≠ true` → **not taken**
4. Graph evaluates condition on edge to `analytics`: `payload.escalation.flag = false` → **taken**
5. `analytics-reporter` node: Logs resolution, updates CSAT metrics

#### Scenario B: Complaint → Escalation → Specialist → Logged

```
customer-service (complaint) ──[escalation.flag=true]──→ specialist ──→ analytics-reporter
```

1. `customer-service` node: Complaint about defective product
2. Agent determines return exceeds authority → `escalation.flag = true`, `targetAgent = "support-support-responder"`
3. Graph evaluates condition on edge to `specialist`: `payload.escalation.flag = true` → **taken**
4. `specialist` node: Handles return authorization, processes replacement
5. After `specialist` completes, edge to `analytics-reporter` is unconditional → **taken**
6. `analytics-reporter` node: Logs escalated resolution, flags product quality issue

### Graph Router Pseudocode

```typescript
// Inside AgentRunner, after each node execution:
async function routeNext(node: AgentNode, output: AgentOutput, graph: AgentGraph): Promise<AgentNode[]> {
  const outgoingEdges = graph.edges.filter((e) => e.from === node.id);

  if (outgoingEdges.length === 0) {
    return []; // End of graph
  }

  const nextNodes: AgentNode[] = [];

  for (const edge of outgoingEdges) {
    if (edge.condition) {
      // Evaluate JSON path against output
      const value = resolveJsonPath(output, edge.condition.path);
      if (value === edge.condition.equals) {
        const target = graph.nodes.find((n) => n.id === edge.to);
        if (target) nextNodes.push(target);
      }
    } else {
      // Unconditional edge — always take
      const target = graph.nodes.find((n) => n.id === edge.to);
      if (target) nextNodes.push(target);
    }
  }

  return nextNodes;
}
```

### Context State Across the Graph

The shared `AgentContext` maintains continuity across all nodes:

```
AgentContext (shared, mutable)
├── customer.*              ← Written by upstream, read by all
├── business.*              ← Written by trigger, read by all
├── conversation.history    ← Appended by every agent
├── customerService.*       ← Written by customer-service node
│   ├── resolution.status    → Used by graph for routing
│   ├── escalation.flag      → Used by graph for conditional edges
│   ├── escalation.reason    → Read by specialist for context
│   └── response.text        → Used by downstream for continuity
└── supportResponder.*      ← Written by specialist node
    └── resolution.outcome   → Read by analytics node
```

---

## Summary: Flow Decision Matrix

| Inquiry Type | Typical `escalation.flag` | Route | Resolution Status |
|-------------|---------------------------|-------|-------------------|
| faq | `false` | → analytics-reporter (or end) | `resolved` |
| account | `false` (unless auth failure) | → end | `resolved` |
| order | `false` (unless damage dispute) | → end or specialist | `resolved` / `escalated` |
| complaint | `true` if beyond authority | → specialist | `escalated` / `partially_resolved` |
| retention | `true` if customer insists | → retention specialist | `escalated` |
| escalation | `true` (by definition) | → specialist | `escalated` |
| general | `false` | → end | `resolved` |
