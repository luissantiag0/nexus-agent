// ============================================================================
// Nexus Agent Platform — Core Runtime Types
// AgentRunner → AgentChain → AgentGraph
// JSON-only I/O with shared AgentContext
// ============================================================================

/**
 * JSON-serializable value constraint.
 * All data flowing through the graph must be JSON-serializable.
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Strictly typed JSON object.
 */
export type JSONObject = { [key: string]: JSONValue };

// ─── Agent Identity ──────────────────────────────────────────────────────────

/**
 * Every registered agent has a unique identity in the graph.
 */
export interface AgentIdentity {
  /** kebab-case unique id (e.g. "customer-service") */
  readonly id: string;
  /** camelCase adapter class name (e.g. "customerService") */
  readonly name: string;
  /** Semantic version of this agent's adapter */
  readonly version: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Free-form tags for routing and discovery */
  readonly tags: string[];
}

// ─── Agent Input / Output ────────────────────────────────────────────────────

/**
 * Standard input envelope for every agent invocation.
 * The `payload` carries agent-specific data; the `meta` carries
 * routing and tracing information from the graph runner.
 */
export interface AgentInput<TPayload extends JSONObject = JSONObject> {
  /** Agent-specific payload */
  payload: TPayload;
  /** Routing and trace metadata */
  meta: {
    /** Unique trace/session identifier */
    traceId: string;
    /** Agent node ID that produced this input (or "trigger") */
    source: string;
    /** Timestamp (ISO-8601) */
    timestamp: string;
    /** Optional correlation / case / ticket id */
    correlationId?: string;
  };
}

/**
 * Standard output envelope for every agent invocation.
 */
export interface AgentOutput<TPayload extends JSONObject = JSONObject> {
  /** Agent-specific payload */
  payload: TPayload;
  /** Execution metadata */
  meta: {
    /** Unique trace/session identifier */
    traceId: string;
    /** Agent node ID that produced this output */
    source: string;
    /** Timestamp (ISO-8601) */
    timestamp: string;
    /** Did the agent complete without unrecoverable error? */
    success: boolean;
    /** Error information if success === false */
    error?: {
      code: string;
      message: string;
      details?: JSONObject;
    };
    /** Duration in milliseconds */
    durationMs: number;
  };
}

// ─── Agent Context ───────────────────────────────────────────────────────────

/**
 * Shared mutable context passed through the graph.
 * All values MUST be JSON-serializable.
 * The context is the single source of truth for inter-agent state.
 */
export interface AgentContext {
  /** Retrieve a value by key path (e.g. "customer.name") */
  get<T extends JSONValue = JSONValue>(key: string): T | undefined;
  /** Set a value at key path. Overwrites existing. */
  set(key: string, value: JSONValue): void;
  /** Remove a key from context */
  delete(key: string): void;
  /** Check if a key exists */
  has(key: string): boolean;
  /** Snapshot the entire context as a flat JSON object */
  snapshot(): Record<string, JSONValue>;
  /** Merge a partial object into context at a given prefix */
  merge(prefix: string, values: JSONObject): void;
}

// ─── Agent Adapter ───────────────────────────────────────────────────────────

/**
 * Every agent adapter in the platform implements this interface.
 * Adapters are the bridge between the graph runtime (AgentRunner/AgentChain)
 * and the agent's specific execution logic (LLM, function, or sub-graph).
 */
export interface AgentAdapter<
  TInput extends JSONObject = JSONObject,
  TOutput extends JSONObject = JSONObject,
> {
  /** Agent identity metadata */
  readonly identity: AgentIdentity;

  /**
   * Execute the agent with the given input and context.
   * Must return a valid AgentOutput. Must not throw —
   * capture errors in `meta.error` and set `meta.success = false`.
   */
  execute(input: AgentInput<TInput>, context: AgentContext): Promise<AgentOutput<TOutput>>;

  /**
   * Validate that an unknown value conforms to this adapter's
   * input schema. Useful for graph-level pre-validation.
   */
  validateInput(value: unknown): value is AgentInput<TInput>;

  /**
   * Validate that an unknown value conforms to this adapter's
   * output schema. Useful for graph-level post-validation.
   */
  validateOutput(value: unknown): value is AgentOutput<TOutput>;
}

// ─── Graph Types ─────────────────────────────────────────────────────────────

/**
 * A single node in the agent graph.
 */
export interface AgentNode {
  /** Unique node id within the graph */
  id: string;
  /** The adapter name this node executes */
  adapter: string;
  /** Label for human-readable routing */
  label?: string;
  /** Configuration passed to the adapter on each execution */
  config?: JSONObject;
}

/**
 * A directed edge between two agent nodes.
 */
export interface AgentEdge {
  /** Source node id */
  from: string;
  /** Target node id */
  to: string;
  /**
   * Optional condition expression evaluated against
   * the output of `from`. If absent, always routes.
   * Expressed as a JSON path + comparator.
   */
  condition?: {
    /** JSON path in the output payload (e.g. "escalation.flag") */
    path: string;
    /** Expected value */
    equals: JSONValue;
  };
}

/**
 * A complete agent graph definition.
 */
export interface AgentGraph {
  /** Unique graph id */
  id: string;
  /** Version of this graph definition */
  version: string;
  /** All nodes in the graph */
  nodes: AgentNode[];
  /** All edges in the graph */
  edges: AgentEdge[];
  /** Starting node id(s) */
  entryPoints: string[];
}

// ─── Agent Registry ──────────────────────────────────────────────────────────

/**
 * Registry of all available agent adapters.
 * The AgentRunner resolves adapters by name from this registry.
 */
export interface AgentRegistry {
  register(adapter: AgentAdapter<JSONObject, JSONObject>): void;
  resolve(name: string): AgentAdapter<JSONObject, JSONObject>;
  list(): AgentIdentity[];
}
