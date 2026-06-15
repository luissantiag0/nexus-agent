// ============================================================================
// Nexus Agent Platform — Unified Agent Registry
// ============================================================================
// SINGLE canonical contract that supersedes ALL four parallel registry designs:
//   1. engine/types/adapter-interfaces.ts     (18 agent I/O schemas)
//   2. lib/agent-registry/types.ts            (original AgentAdapter)
//   3. lib/agents/registry/types.ts           (EnhancedAgentAdapter)
//   4. src/agents/registry.types.ts           (AgentSlot, lifecycle hooks)
//
// This file is the ONE source of truth for agent adapter contracts and
// registry management. Every adapter, runner, and orchestrator component
// MUST import from this file going forward.
// ============================================================================

// ============================================================================
// Identity & Versioning
// ============================================================================

/**
 * Unique identifier for an agent within the registry.
 * Convention: `{domain}-{name}` (e.g. "backend-architect", "seo-specialist").
 */
export type AgentId = string;

/**
 * Semantic version string for agent adapters and schemas (e.g. "1.0.0").
 */
export type SemVer = string;

// ============================================================================
// Agent Status — mirrors engine/types/agent-types.ts AgentStatus
// ============================================================================

/**
 * Runtime status of an agent execution.
 */
export type AgentStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "timed_out"
  | "circuit_broken"
  | "waiting";

// ============================================================================
// Agent Metadata
// ============================================================================

/**
 * Descriptive metadata for an agent adapter.
 * Registered with the orchestrator for discovery, routing, and observability.
 */
export interface AgentMetadata {
  /** Unique registry identifier (e.g. "backend-architect"). */
  id: AgentId;
  /** Human-readable display name (e.g. "Backend Architect"). */
  name: string;
  /** Brief description of the agent's purpose and domain. */
  description: string;
  /** Current adapter version (semver). */
  version: string;
  /** Original author or maintainer. */
  author?: string;
  /** Tags for discovery, filtering, and group indexing. */
  tags?: string[];
}

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Declarative input/output schema for an agent adapter port.
 * Uses a JSON Schema–compatible subset for runtime validation and codegen.
 */
export interface AgentSchema {
  /** Fully-qualified schema identifier (e.g. "backend-architect-input.v1"). */
  $id: string;
  /** Schema version for compatibility checking. */
  version: string;
  /** List of required property keys. */
  required?: string[];
  /** Property definitions keyed by name. */
  properties: Record<string, SchemaProperty>;
}

/**
 * A single property within an AgentSchema.
 */
export interface SchemaProperty {
  /** Expected type (string, number, boolean, object, array). */
  type: string;
  /** Human-readable description of this property. */
  description: string;
  /** Whether this property is required. */
  required?: boolean;
  /** Default value if not provided. */
  default?: unknown;
}

// ============================================================================
// Context Contract
// ============================================================================

/**
 * Declares the context keys an agent reads from and writes to the shared
 * execution context. The orchestrator uses this to validate data flow,
 * detect conflicts, and plan chaining topology.
 */
export interface ContextContract {
  /** Context keys this agent reads (but does not write). */
  readsFromContext: string[];
  /** Context keys this agent writes (produced outputs). */
  writesToContext: string[];
  /** Context keys that MUST be present before execution. */
  requiredContextKeys: string[];
  /** Context keys that MAY be present (optional enrichment). */
  optionalContextKeys: string[];
}

// ============================================================================
// Capabilities & Prompts
// ============================================================================

/**
 * A declarable capability that an agent adapter exposes.
 * Used for capability-based discovery and routing.
 */
export interface AgentCapability {
  /** Canonical name (e.g. "infrastructure-monitoring", "seo-audit"). */
  name: string;
  /** Human-readable description of what this capability provides. */
  description: string;
}

/**
 * Describes a versioned system prompt bound to an agent adapter.
 * Prompts are externalised so they can be updated without code changes.
 */
export interface PromptVersion {
  /** Unique prompt identifier (e.g. "backend-architect.v1"). */
  id: string;
  /** Prompt version string (semver). */
  version: string;
  /** File path or module reference to the prompt template. */
  path: string;
  /** Whether this prompt version is compatible with the current adapter. */
  compatible: boolean;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of validating an input payload against an agent's schema and rules.
 */
export interface ValidationResult {
  /** True if no errors were found (warnings are acceptable). */
  valid: boolean;
  /** Error-level issues that block execution. */
  errors: ValidationIssue[];
  /** Warning-level issues that are informational only. */
  warnings: ValidationIssue[];
}

/**
 * A single validation issue — either an error or a warning.
 */
export interface ValidationIssue {
  /** Dot-notation path to the field that failed validation. */
  path: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Severity: "error" blocks execution; "warning" is advisory. */
  severity: "error" | "warning";
}

// ============================================================================
// Agent Input / Output Envelopes
// ============================================================================

/**
 * Every agent adapter receives a typed input payload inside a standard
 * runtime envelope that carries correlation and versioning metadata.
 */
export interface AgentInput<T = Record<string, unknown>> {
  /** Domain-specific input payload. */
  payload: T;
  /** Correlation ID for tracing across agent chains and graphs. */
  correlationId: string;
  /** Schema version this input was validated against. */
  schemaVersion: string;
  /** Optional caller-supplied metadata for telemetry or routing. */
  metadata?: Record<string, unknown>;
}

/**
 * Every agent adapter produces a typed output payload inside a standard
 * runtime envelope with execution provenance.
 */
export interface AgentOutput<T = Record<string, unknown>> {
  /** Domain-specific output payload. */
  payload: T;
  /** Schema identifier for the output contract. */
  schema: string;
  /** Schema version that produced this output. */
  schemaVersion: string;
  /** Correlation ID from the originating input. */
  correlationId: string;
  /** Unique execution ID for this invocation. */
  executionId: string;
  /** Version of the adapter that produced this output. */
  adapterVersion: string;
}

// ============================================================================
// Agent Result — Execution Outcome with Diagnostics
// ============================================================================

/**
 * Wraps the full result of an agent execution including status, timing,
 * diagnostics, and retry history. Returned by IAgentAdapter.execute() and
 * consumed by AgentRunner and the orchestrator.
 */
export interface AgentResult<TData = unknown> {
  /** Unique execution ID for this invocation. */
  executionId: string;
  /** The agent that produced this result (matches adapter.metadata.id). */
  agentId: AgentId;
  /** Final execution status. */
  status: AgentStatus;
  /** The typed output payload on success; null on failure. */
  data: TData | null;
  /** Human-readable error message if status is "failed". */
  error: string | null;
  /** Structured error details (stack trace, error codes, etc.). */
  errorDetails: Record<string, unknown> | null;
  /** Validation results produced during or after execution. */
  validation: ValidationResult | null;
  /** Timing and resource consumption metrics. */
  performance: AgentPerformance;
  /** Ephemeral metadata for telemetry, debugging, and extensibility. */
  meta: Record<string, unknown>;
}

/**
 * Timing and resource consumption metrics for a single agent execution.
 */
export interface AgentPerformance {
  /** ISO-8601 timestamp of when execution started. */
  startedAt: string;
  /** ISO-8601 timestamp of when execution completed. */
  completedAt: string;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** Approximate tokens consumed (LLM-based agents only). */
  tokensUsed?: number;
  /** Number of retry attempts made before success or exhaustion. */
  retryCount: number;
}

// ============================================================================
// Shared Execution Context
// ============================================================================

/**
 * The shared execution context passed between agents in a chain, graph,
 * or multi-agent workflow. Adapters declare their contract via ContextContract.
 */
export interface AgentContext {
  /** Unique identifier for this execution session. */
  sessionId: string;
  /** Arbitrary key-value store for inter-agent data flow. */
  data: Record<string, unknown>;
  /** Indexable access to individual context values. */
  [key: string]: unknown;
}

// ============================================================================
// THE CANONICAL ADAPTER INTERFACE
// ============================================================================

/**
 * IAgentAdapter — the SINGLE canonical contract every agent adapter must
 * implement. Supersedes ALL prior adapter contracts across the codebase.
 *
 * @typeParam TInput  - Shape of the adapter-specific input payload.
 * @typeParam TOutput - Shape of the adapter-specific output payload.
 * @typeParam TContext - Shape of the shared execution context (defaults to
 *                        Record<string, unknown> for broad compatibility).
 */
export interface IAgentAdapter<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>,
  TContext = Record<string, unknown>,
> {
  /** Stable agent metadata for registry indexing and discovery. */
  readonly metadata: AgentMetadata;

  /** Declarative input schema used for validation and documentation. */
  readonly inputSchema: AgentSchema;

  /** Declarative output schema used for validation and documentation. */
  readonly outputSchema: AgentSchema;

  /** Context contract declaring reads, writes, and requirements. */
  readonly contextContract: ContextContract;

  /** Prompt versions this adapter supports (for prompt resolution). */
  readonly supportedPrompts: PromptVersion[];

  /** Capabilities this adapter exposes (for capability-based discovery). */
  readonly capabilities: AgentCapability[];

  /**
   * Validate an input payload against this adapter's schema and business
   * rules. Called by the registry and runner BEFORE execution.
   *
   * @param input - The raw input payload to validate.
   * @returns A ValidationResult with errors and warnings.
   */
  validate(input: TInput): Promise<ValidationResult>;

  /**
   * Execute the agent's core logic with the given input and context.
   *
   * @param input  - The validated input envelope (payload + metadata).
   * @param context - The shared execution context for inter-agent data flow.
   * @returns An AgentResult wrapping the output payload and diagnostics.
   */
  execute(
    input: AgentInput<TInput>,
    context: AgentContext,
  ): Promise<AgentResult<TOutput>>;

  // --------------------------------------------------------------------------
  // Optional Lifecycle Hooks
  // --------------------------------------------------------------------------

  /**
   * Hook called BEFORE execution begins. Useful for preconditions,
   * context validation, telemetry, or resource acquisition.
   */
  onBefore?: (
    input: AgentInput<TInput>,
    context: AgentContext,
  ) => Promise<void>;

  /**
   * Hook called AFTER execution completes successfully, before the result
   * is returned. Useful for post-processing, logging, metrics emission,
   * or resource cleanup.
   */
  onAfter?: (
    output: AgentOutput<TOutput>,
    context: AgentContext,
  ) => Promise<void>;
}

// ============================================================================
// Registry Diagnostics Types
// ============================================================================

/**
 * A context key conflict detected during registry validation.
 * Identifies agents that contend for the same context keys without
 * proper producer/consumer relationships.
 */
export interface ContextConflict {
  /** The context key involved in the conflict. */
  key: string;
  /** Agent IDs that reference this key. */
  agents: string[];
  /** Type of conflict detected. */
  type:
    | "duplicate_write"       // Multiple agents claim to write the same key
    | "read_without_provider" // Agent reads a key no agent writes
    | "write_without_consumer"; // Agent writes a key no agent reads
}

/**
 * A dependency issue found during registry validation.
 */
export interface DependencyIssue {
  /** The agent ID with the issue. */
  agentId: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Severity: "error" will block execution; "warning" is advisory. */
  severity: "error" | "warning";
}

/**
 * Comprehensive diagnostics aggregated from the registry's contents.
 */
export interface RegistryDiagnostics {
  /** Total number of registered adapters. */
  totalAdapters: number;
  /** Number of adapters that have at least one prompt registered. */
  agentsWithPrompts: number;
  /** Number of adapters that expose a validate() implementation. */
  agentsWithValidators: number;
  /** All unique context keys read across all registered adapters. */
  uniqueContextReads: string[];
  /** All unique context keys written across all registered adapters. */
  uniqueContextWrites: string[];
  /** Context keys written by more than one adapter (potential conflict). */
  duplicateContextOwnership: string[];
  /** Context keys that are read but never written by any adapter. */
  orphanedContextKeys: string[];
}

/**
 * Comprehensive validation report for the entire registry.
 */
export interface RegistryValidationReport {
  /** Whether the registry passes all validation checks. */
  valid: boolean;
  /** Total number of registered agents. */
  totalAgents: number;
  /** List of all registered agent IDs. */
  registeredAgents: string[];
  /** Agent IDs whose prompt files could not be resolved. */
  missingPrompts: string[];
  /** Context key conflicts detected across agents. */
  contextConflicts: ContextConflict[];
  /** Dependency issues found across agents. */
  dependencyIssues: DependencyIssue[];
  /** Aggregated registry diagnostics. */
  diagnostics: RegistryDiagnostics;
}

// ============================================================================
// UNIFIED AGENT REGISTRY
// ============================================================================

/**
 * AgentRegistry — the single canonical registry for all agent adapters.
 *
 * Manages adapter lifecycle (register / unregister / lookup), provides
 * prompt resolution, context contract analysis, capability-based discovery,
 * and comprehensive registry validation.
 *
 * This class supersedes ALL prior registry implementations:
 *   - engine/registry/agent-registry.ts
 *   - lib/agent-registry/registry.ts
 *   - lib/agents/registry.ts
 */
export class AgentRegistry {
  /** Internal store of registered adapters keyed by agent ID. */
  private readonly adapters = new Map<AgentId, IAgentAdapter>();

  /** Index: tag name -> set of agent IDs. */
  private readonly tagIndex = new Map<string, Set<AgentId>>();

  /** Index: capability name -> set of agent IDs. */
  private readonly capabilityIndex = new Map<string, Set<AgentId>>();

  /** Registered prompt templates keyed by prompt ID. */
  private readonly prompts = new Map<string, string>();

  // ========================================================================
  // Adapter Lifecycle
  // ========================================================================

  /**
   * Register an agent adapter into the registry.
   *
   * @param adapter - The adapter instance to register.
   * @throws Error if an adapter with the same ID is already registered.
   */
  register(adapter: IAgentAdapter): void {
    const id = adapter.metadata.id;

    if (this.adapters.has(id)) {
      throw new Error(
        `Agent adapter "${id}" is already registered. ` +
          `Use unregister() first or check for duplicate registrations.`,
      );
    }

    this.adapters.set(id, adapter);

    // Index by tags
    const tags = adapter.metadata.tags ?? [];
    for (const tag of tags) {
      let set = this.tagIndex.get(tag);
      if (!set) {
        set = new Set();
        this.tagIndex.set(tag, set);
      }
      set.add(id);
    }

    // Index by capabilities
    for (const cap of adapter.capabilities) {
      let set = this.capabilityIndex.get(cap.name);
      if (!set) {
        set = new Set();
        this.capabilityIndex.set(cap.name, set);
      }
      set.add(id);
    }
  }

  /**
   * Remove an adapter from the registry by its agent ID.
   *
   * @param agentId - The ID of the adapter to remove.
   * @returns true if the adapter was found and removed; false otherwise.
   */
  unregister(agentId: string): boolean {
    const adapter = this.adapters.get(agentId);
    if (!adapter) return false;

    this.adapters.delete(agentId);

    // Remove from tag index
    const tags = adapter.metadata.tags ?? [];
    for (const tag of tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(agentId);
        if (set.size === 0) this.tagIndex.delete(tag);
      }
    }

    // Remove from capability index
    for (const cap of adapter.capabilities) {
      const set = this.capabilityIndex.get(cap.name);
      if (set) {
        set.delete(agentId);
        if (set.size === 0) this.capabilityIndex.delete(cap.name);
      }
    }

    return true;
  }

  // ========================================================================
  // Lookup
  // ========================================================================

  /**
   * Retrieve a registered adapter by its agent ID.
   *
   * @param agentId - The agent ID to look up.
   * @returns The adapter instance.
   * @throws Error if no adapter is registered with the given ID.
   */
  get(agentId: string): IAgentAdapter {
    const adapter = this.adapters.get(agentId);
    if (!adapter) {
      const available = this.listIds().join(", ");
      throw new Error(
        `Agent adapter "${agentId}" is not registered. ` +
          `Available agents: [${available}]`,
      );
    }
    return adapter;
  }

  /**
   * Check whether an adapter is registered under the given ID.
   *
   * @param agentId - The agent ID to check.
   * @returns true if registered; false otherwise.
   */
  has(agentId: string): boolean {
    return this.adapters.has(agentId);
  }

  /**
   * List ALL registered adapters.
   *
   * @returns An array of all registered IAgentAdapter instances.
   */
  list(): IAgentAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * List all registered agent IDs.
   *
   * @returns An array of agent ID strings.
   */
  listIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  // ========================================================================
  // Prompt Resolution
  // ========================================================================

  /**
   * Register a prompt template string for a given prompt ID.
   *
   * @param promptId - Unique prompt identifier (e.g. "backend-architect.v1").
   * @param template - The raw prompt template text.
   * @throws Error if a prompt with the same ID is already registered.
   */
  registerPrompt(promptId: string, template: string): void {
    if (this.prompts.has(promptId)) {
      throw new Error(`Prompt "${promptId}" is already registered.`);
    }
    this.prompts.set(promptId, template);
  }

  /**
   * Load a prompt template for a given agent ID and optional version.
   *
   * Resolution strategy:
   *   1. If `version` is specified, look for a PromptVersion in the adapter's
   *      supportedPrompts that has a matching version string.
   *   2. If no version is specified, use the FIRST compatible prompt from
   *      the adapter's supportedPrompts list.
   *   3. Resolve the prompt ID against registered prompt templates.
   *
   * @param agentId - The agent ID to load a prompt for.
   * @param version - Optional specific version to load.
   * @returns The resolved prompt template text.
   * @throws Error if the agent or prompt is not found, or if the prompt
   *         template has not been registered via registerPrompt().
   */
  async loadPrompt(agentId: string, version?: string): Promise<string> {
    const adapter = this.get(agentId);
    const prompts = adapter.supportedPrompts;

    if (!prompts || prompts.length === 0) {
      throw new Error(
        `Agent adapter "${agentId}" has no supported prompts defined.`,
      );
    }

    // Find the matching prompt version
    let targetPrompt: PromptVersion | undefined;

    if (version) {
      // Specific version requested
      targetPrompt = prompts.find((p) => p.version === version);
      if (!targetPrompt) {
        const available = prompts.map((p) => `${p.id}@${p.version}`).join(", ");
        throw new Error(
          `Prompt version "${version}" not found for agent "${agentId}". ` +
            `Available: [${available}]`,
        );
      }
    } else {
      // Use the first compatible prompt
      targetPrompt = prompts.find((p) => p.compatible) ?? prompts[0];
    }

    // Resolve the prompt template
    const template = this.prompts.get(targetPrompt.id);
    if (!template) {
      throw new Error(
        `Prompt template "${targetPrompt.id}" for agent "${agentId}" ` +
          `has not been registered. Call registerPrompt() first.`,
      );
    }

    return template;
  }

  // ========================================================================
  // Context Contract Analysis
  // ========================================================================

  /**
   * Resolve the full context contract for a given agent ID by combining
   * the adapter's declared contract with any inheritance or composition.
   *
   * @param agentId - The agent ID to resolve the contract for.
   * @returns The resolved ContextContract.
   */
  resolveContextContract(agentId: string): ContextContract {
    const adapter = this.get(agentId);
    return adapter.contextContract;
  }

  // ========================================================================
  // Metadata Queries
  // ========================================================================

  /**
   * Get the AgentMetadata for a registered adapter.
   *
   * @param agentId - The agent ID to get metadata for.
   * @returns The adapter's metadata.
   */
  getMetadata(agentId: string): AgentMetadata {
    return this.get(agentId).metadata;
  }

  /**
   * Get metadata for ALL registered adapters.
   *
   * @returns An array of all agent metadata objects.
   */
  getAllMetadata(): AgentMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.metadata);
  }

  // ========================================================================
  // Capability-Based Discovery
  // ========================================================================

  /**
   * Find all registered adapters that declare a specific capability.
   *
   * @param capabilityName - The capability name to search for
   *   (e.g. "infrastructure-monitoring").
   * @returns An array of adapters that declare the matching capability.
   */
  findByCapability(capabilityName: string): IAgentAdapter[] {
    const ids = this.capabilityIndex.get(capabilityName);
    if (!ids || ids.size === 0) return [];

    return Array.from(ids)
      .map((id) => this.adapters.get(id))
      .filter((a): a is IAgentAdapter => a !== undefined);
  }

  /**
   * Find adapters by tag.
   *
   * @param tag - The tag to search for.
   * @returns An array of adapters with the matching tag.
   */
  findByTag(tag: string): IAgentAdapter[] {
    const ids = this.tagIndex.get(tag);
    if (!ids || ids.size === 0) return [];

    return Array.from(ids)
      .map((id) => this.adapters.get(id))
      .filter((a): a is IAgentAdapter => a !== undefined);
  }

  /**
   * Find an adapter by its human-readable name (case-insensitive).
   *
   * @param name - The display name to search for.
   * @returns The first adapter with a matching name, or undefined.
   */
  findByName(name: string): IAgentAdapter | undefined {
    const lowerName = name.toLowerCase();
    return Array.from(this.adapters.values()).find(
      (a) => a.metadata.name.toLowerCase() === lowerName,
    );
  }

  /**
   * Resolve adapters that write a given set of context keys.
   * Useful for chain planning — finds agents that can produce needed data.
   *
   * @param contextKeys - The context keys the agent must write.
   * @returns Adapters whose context contract includes ALL specified keys.
   */
  resolveByWrites(contextKeys: string[]): IAgentAdapter[] {
    if (contextKeys.length === 0) return this.list();

    return Array.from(this.adapters.values()).filter((adapter) => {
      const writes = new Set(adapter.contextContract.writesToContext);
      return contextKeys.every((key) => writes.has(key));
    });
  }

  // ========================================================================
  // Registry-Wide Validation
  // ========================================================================

  /**
   * Validate the entire registry, detecting context conflicts,
   * missing prompts, dependency issues, and orphaned context keys.
   *
   * @returns A comprehensive RegistryValidationReport.
   */
  validate(): RegistryValidationReport {
    const adapterEntries = Array.from(this.adapters.entries());
    const registeredAgents = adapterEntries.map(([id]) => id);
    const totalAgents = adapterEntries.length;

    // ── Collect all context contracts ──────────────────────────────────
    const allReads: Map<string, Set<AgentId>> = new Map();
    const allWrites: Map<string, Set<AgentId>> = new Map();

    for (const [id, adapter] of adapterEntries) {
      const contract = adapter.contextContract;

      for (const key of contract.readsFromContext) {
        let set = allReads.get(key);
        if (!set) {
          set = new Set();
          allReads.set(key, set);
        }
        set.add(id);
      }

      for (const key of contract.writesToContext) {
        let set = allWrites.get(key);
        if (!set) {
          set = new Set();
          allWrites.set(key, set);
        }
        set.add(id);
      }
    }

    // ── Detect context conflicts ──────────────────────────────────────
    const contextConflicts: ContextConflict[] = [];

    // Duplicate writes: keys written by more than one adapter
    for (const [key, writers] of Array.from(allWrites.entries())) {
      if (writers.size > 1) {
        contextConflicts.push({
          key,
          agents: Array.from(writers),
          type: "duplicate_write",
        });
      }
    }

    // Reads without provider: keys read but never written
    for (const [key, readers] of Array.from(allReads.entries())) {
      if (!allWrites.has(key)) {
        contextConflicts.push({
          key,
          agents: Array.from(readers),
          type: "read_without_provider",
        });
      }
    }

    // Writes without consumer: keys written but never read
    for (const [key, writers] of Array.from(allWrites.entries())) {
      if (!allReads.has(key)) {
        contextConflicts.push({
          key,
          agents: Array.from(writers),
          type: "write_without_consumer",
        });
      }
    }

    // ── Detect missing prompts ─────────────────────────────────────────
    const missingPrompts: string[] = [];

    for (const [id, adapter] of adapterEntries) {
      for (const prompt of adapter.supportedPrompts) {
        if (!this.prompts.has(prompt.id)) {
          missingPrompts.push(`${id}:${prompt.id}`);
        }
      }
    }

    // ── Detect dependency issues ──────────────────────────────────────
    const dependencyIssues: DependencyIssue[] = [];

    for (const [id, adapter] of adapterEntries) {
      const contract = adapter.contextContract;

      // Check that required context keys are provided by SOME adapter
      for (const key of contract.requiredContextKeys) {
        if (!allWrites.has(key)) {
          dependencyIssues.push({
            agentId: id,
            message: `Required context key "${key}" has no provider in the registry.`,
            severity: "error",
          });
        }
      }

      // Check that capability index is populated
      if (adapter.capabilities.length === 0) {
        dependencyIssues.push({
          agentId: id,
          message: `Agent "${id}" declares zero capabilities — discovery may be limited.`,
          severity: "warning",
        });
      }

      // Check for prompt coverage
      if (!adapter.supportedPrompts || adapter.supportedPrompts.length === 0) {
        dependencyIssues.push({
          agentId: id,
          message: `Agent "${id}" has no supported prompts — loadPrompt() will fail.`,
          severity: "warning",
        });
      }
    }

    // ── Aggregate diagnostics ──────────────────────────────────────────
    const uniqueContextReads = Array.from(allReads.keys()).sort();
    const uniqueContextWrites = Array.from(allWrites.keys()).sort();
    const duplicateContextOwnership = Array.from(allWrites.entries())
      .filter(([, writers]) => writers.size > 1)
      .map(([key]) => key)
      .sort();
    const orphanedContextKeys = Array.from(allReads.keys())
      .filter((key) => !allWrites.has(key))
      .sort();

    const agentsWithValidators = adapterEntries.filter(([, a]) =>
      typeof a.validate === "function",
    ).length;

    const diagnostics: RegistryDiagnostics = {
      totalAdapters: totalAgents,
      agentsWithPrompts: adapterEntries.filter(
        ([, a]) => a.supportedPrompts && a.supportedPrompts.length > 0,
      ).length,
      agentsWithValidators,
      uniqueContextReads,
      uniqueContextWrites,
      duplicateContextOwnership,
      orphanedContextKeys,
    };

    // ── Overall validity ───────────────────────────────────────────────
    const valid =
      contextConflicts.filter((c) => c.type !== "write_without_consumer")
        .length === 0 &&
      dependencyIssues.filter((d) => d.severity === "error").length === 0;

    return {
      valid,
      totalAgents,
      registeredAgents,
      missingPrompts,
      contextConflicts,
      dependencyIssues,
      diagnostics,
    };
  }

  // ========================================================================
  // Bulk Operations & Statistics
  // ========================================================================

  /**
   * Get the current count of registered adapters.
   */
  get count(): number {
    return this.adapters.size;
  }

  /**
   * Get all unique tag names across all registered adapters.
   */
  get tags(): string[] {
    return Array.from(this.tagIndex.keys()).sort();
  }

  /**
   * Get all unique capability names across all registered adapters.
   */
  get capabilities(): string[] {
    return Array.from(this.capabilityIndex.keys()).sort();
  }

  /**
   * Clear all adapters, prompts, and indexes from the registry.
   * Useful for testing, hot-reload, or resetting state.
   */
  clear(): void {
    this.adapters.clear();
    this.tagIndex.clear();
    this.capabilityIndex.clear();
    this.prompts.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global singleton AgentRegistry instance.
 *
 * Import this anywhere in the Nexus Agent Platform to access a single
 * shared registry:
 *
 * ```typescript
 * import { agentRegistry } from "@/engine/registry/unified-registry";
 * agentRegistry.register(myAdapter);
 * const adapter = agentRegistry.get("backend-architect");
 * ```
 */
export const agentRegistry = new AgentRegistry();

// ============================================================================
// BACKWARD-COMPATIBLE TYPE ALIASES
// ============================================================================

/**
 * @deprecated Use `IAgentAdapter` instead. Maintained for backward
 * compatibility with code that imports `AgentAdapter` from older modules.
 *
 * ```typescript
 * // Before (old):
 * import type { AgentAdapter } from "@/lib/agents/registry/types";
 * // After (new):
 * import type { IAgentAdapter as AgentAdapter } from "@/engine/registry/unified-registry";
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type AgentAdapter = IAgentAdapter;

/**
 * @deprecated Use `AgentRegistry` directly instead. Maintained for backward
 * compatibility with code that imports `IRegistry` from older modules.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type IRegistry = AgentRegistry;
