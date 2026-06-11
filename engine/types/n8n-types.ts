// ============================================================================
// Nexus Agent Platform — n8n Integration Types
// ============================================================================

// ============================================================================
// Nexus → n8n (Outbound)
// ============================================================================

/**
 * Payload sent from Nexus to n8n when a workflow execution triggers
 * an n8n webhook or when Nexus wants n8n to execute a workflow.
 */
export interface NexusToN8nPayload {
  /** Unique event identifier. */
  eventId: string;
  /** Event type for n8n routing. */
  eventType: N8nEventType;
  /** Source of the event. */
  source: "nexus-engine" | "nexus-agent" | "nexus-api";
  /** The agent or workflow that generated the event. */
  sourceId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Correlation ID for tracing across systems. */
  correlationId: string;
  /** The main payload data. */
  data: Record<string, unknown>;
  /** Metadata for routing/filtering. */
  meta: {
    /** n8n webhook ID to target (optional). */
    webhookId?: string;
    /** Workflow ID in n8n to trigger. */
    targetWorkflowId?: string;
    /** Priority for execution. */
    priority?: "low" | "normal" | "high" | "critical";
    /** Retry configuration. */
    retry?: {
      maxAttempts: number;
      backoffMs: number;
    };
  };
}

/**
 * Types of events Nexus emits to n8n.
 */
export type N8nEventType =
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.step.completed"
  | "agent.execution.completed"
  | "agent.execution.failed"
  | "context.snapshot.created"
  | "system.alert"
  | "system.metric.threshold"
  | "custom";

// ============================================================================
// n8n → Nexus (Inbound)
// ============================================================================

/**
 * Payload received by Nexus from an n8n webhook callback.
 */
export interface N8nToNexusPayload {
  /** n8n execution ID. */
  n8nExecutionId: string;
  /** n8n workflow ID. */
  n8nWorkflowId: string;
  /** Name of the n8n workflow. */
  n8nWorkflowName: string;
  /** Event type. */
  eventType: N8nCallbackEventType;
  /** ISO-8601 timestamp from n8n. */
  timestamp: string;
  /** Correlation ID (echoed back from Nexus request). */
  correlationId: string;
  /** Workflow output data. */
  data: Record<string, unknown>;
  /** n8n execution status. */
  status: "success" | "error" | "cancelled" | "timeout";
  /** Error details if status is "error". */
  error?: {
    message: string;
    stack?: string;
    nodeId?: string;
    nodeName?: string;
  };
  /** Execution metrics. */
  metrics?: {
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    nodeCount: number;
  };
}

export type N8nCallbackEventType =
  | "workflow.completed"
  | "workflow.error"
  | "node.success"
  | "node.error"
  | "manual.trigger";

// ============================================================================
// n8n Webhook Registration
// ============================================================================

/**
 * Spec for registering an n8n webhook endpoint in Nexus.
 */
export interface N8nWebhookRegistration {
  /** Unique path for this webhook (e.g., "agent-result"). */
  path: string;
  /** HTTP method. */
  method: "POST" | "GET";
  /** Description of what this webhook does. */
  description: string;
  /** Expected payload schema (JSON Schema). */
  expectedSchema: Record<string, unknown>;
  /** Agent or workflow to trigger on receipt. */
  triggerTarget: string;
  /** Authentication required. */
  auth: "none" | "api-key" | "signature";
  /** Rate limit for this webhook. */
  rateLimit?: {
    maxPerMinute: number;
    burstSize: number;
  };
}

// ============================================================================
// n8n Workflow Trigger Spec
// ============================================================================

/**
 * Specification for an n8n workflow trigger that Nexus understands.
 * This is exposed as configuration for n8n workflow developers.
 */
export interface N8nWorkflowTriggerSpec {
  /** The n8n webhook node ID in the workflow. */
  webhookId: string;
  /** HTTP method for the webhook. */
  httpMethod: "POST" | "GET";
  /** Path relative to the Nexus n8n webhook base URL. */
  path: string;
  /** Options for the webhook node. */
  options: {
    responseMode: "onReceived" | "lastNode" | "manual";
    responseData: string;
    rawBody: boolean;
    ignoreNoWebhook: boolean;
  };
  /** Input schema description. */
  inputSchema: Record<string, unknown>;
  /** Example payload for testing. */
  examplePayload: Record<string, unknown>;
}

// ============================================================================
// n8n Credential Schema
// ============================================================================

/**
 * Credentials Nexus provides to n8n for authenticated callbacks.
 */
export interface N8nCredentialSchema {
  name: string;
  type: "nexusApi";
  fields: Array<{
    name: string;
    type: "string" | "hidden" | "number";
    required: boolean;
    default?: unknown;
  }>;
  authentication: "apiKey" | "oauth2" | "none";
  testEndpoint: string;
}
