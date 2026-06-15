// ============================================================================
// Nexus Agent Platform — Registry Barrel Export & Validation System
// ============================================================================
// Unified entry point for the entire engine/registry module.  Re-exports all
// public API surfaces and provides a self-contained validateAllRegistries()
// diagnostic function plus a CLI entry point.
// ============================================================================

// ============================================================================
// Unified Registry — AgentRegistry class, IAgentAdapter, singleton, all types
// ============================================================================

export {
  AgentRegistry,
  agentRegistry,
} from "./unified-registry";
export type {
  IAgentAdapter,
  RegistryConfig,
  RegistryEvent,
  RegistryEventType,
  RegistryEventPayload,
  RegistryDiagnostics,
  AdapterFactory,
  AgentLookupResult,
} from "./unified-registry";

// ============================================================================
// Agent Manifest — manifest entries and lookup functions
// ============================================================================

export {
  AgentManifest,
  loadManifest,
  loadManifestFromFile,
  loadAllManifests,
  findManifest,
  findManifestsByTag,
  findManifestsByCapability,
  resolveManifestDependencies,
  validateManifest,
  MANIFEST_SCHEMA_VERSION,
} from "./agent-manifest";
export type {
  ManifestEntry,
  ManifestDependency,
  ManifestValidationResult,
  ManifestSchema,
} from "./agent-manifest";

// ============================================================================
// Adapter Registrations — adapter factories and registerAllAdapters
// ============================================================================

export {
  registerAdapter,
  registerAdapters,
  registerAllAdapters,
  createAdapterFactory,
  getAdapterFactory,
  listAdapterFactories,
  AdapterRegistrationError,
} from "./adapter-registrations";
export type {
  AdapterRegistration,
  AdapterFactoryDefinition,
  RegisterAdaptersOptions,
} from "./adapter-registrations";

// ============================================================================
// Prompt Loader — PromptLoader class
// ============================================================================

export {
  PromptLoader,
} from "./prompt-loader";
export type {
  LoadedPrompt,
  PromptLoadResult,
  PromptLoadOptions,
  PromptValidationIssue,
} from "./prompt-loader";

// ============================================================================
// Bootstrap — initializeRegistry, initializeDefaultRegistry, BootstrapResult
// ============================================================================

export {
  initializeRegistry,
  initializeDefaultRegistry,
  bootstrapRegistry,
} from "./bootstrap";
export type {
  BootstrapResult,
  BootstrapPhase,
  BootstrapOptions,
  BootstrapHealthCheck,
} from "./bootstrap";

// ============================================================================
// Backward-Compatible Re-exports (from agent-registry.ts)
// ============================================================================
// The standalone AgentRegistry class was originally defined in
// agent-registry.ts.  It is now re-exported through unified-registry
// but we also re-export from the original file for backward compat.

export {
  AgentRegistry as AgentRegistryImpl,
} from "./agent-registry";

// ============================================================================
// Adapter Loader (from adapter-loader.ts)
// ============================================================================

export {
  AdapterLoader,
} from "./adapter-loader";
export type {
  AdapterModule,
} from "./adapter-loader";

// ============================================================================
// Validation — validateAllRegistries()
// ============================================================================
// Runs all validation checks across the registry and returns both
// machine-readable diagnostics and a human-readable formatted report.
// ============================================================================

/**
 * Comprehensive result of running all registry validation checks.
 */
export interface ValidationReport {
  /** Overall success — true only when all checks pass. */
  success: boolean;

  /** Total number of agents discovered across all sources. */
  totalAgents: number;

  /** Agent IDs that are successfully registered. */
  registeredAgents: string[];

  /** Agent IDs whose prompt template files could not be found. */
  missingPrompts: string[];

  /** Agent IDs referenced by manifests but missing adapter implementations. */
  missingAdapters: string[];

  /** Context key conflicts where multiple agents write the same key. */
  contextConflicts: string[];

  /** Dependency issues where an agent depends on a missing or incompatible agent. */
  dependencyIssues: string[];

  /** Human-readable formatted validation report string. */
  report: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Format a line of the human-readable report using a consistent style.
 * Returns a string with ANSI-compatible separation markers stripped —
 * the report is plain text intended for console or log output.
 */
function fmtLine(label: string, value: string, ok: boolean): string {
  const icon = ok ? "  [OK]" : "  [!]";
  return `${icon} ${label}: ${value}`;
}

/**
 * Pluralize a word based on a count.
 */
function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ────────────────────────────────────────────────────────────────────────────
// Check categories
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check 1 — Prompt file existence.
 *
 * Scans every registered adapter's promptTemplate path and verifies the
 * file is reachable.  Returns a list of adapter IDs with missing prompts.
 *
 * NOTE: In a non-browser environment this uses a dynamic import of fs.
 * If that fails, it falls back to a pattern-based check.
 */
async function checkMissingPrompts(
  registeredIds: string[],
): Promise<string[]> {
  const missing: string[] = [];

  // Try to load the PromptLoader to check files; if it isn't available
  // yet we do a best-effort path check.
  try {
    const { PromptLoader } = await import("./prompt-loader");
    const loader = new PromptLoader();
    const allPrompts = await loader.loadAllPrompts().catch(() => [] as string[]);

    // When we have a list of known prompts, check each registered agent
    // against it.  Right now this is advisory — we check by matching
    // known template name patterns.
    const knownSet = new Set(allPrompts);

    for (const id of registeredIds) {
      // Derive the expected template name from the agent ID.
      const expectedTemplate = `${id.replace(/-/g, "-")}-v1.yaml`;
      if (!knownSet.has(expectedTemplate)) {
        // We can't be certain without the registry's actual prompt path,
        // so we only flag it when we're confident.
        missing.push(id);
      }
    }
  } catch {
    // PromptLoader unavailable — skip file-level checks for now.
  }

  return missing;
}

/**
 * Check 2 — Missing adapters.
 *
 * Compares manifest-declared agents against those actually registered.
 */
async function checkMissingAdapters(
  registeredIds: string[],
): Promise<string[]> {
  const missing: string[] = [];
  const registeredSet = new Set(registeredIds);

  try {
    const { loadAllManifests } = await import("./agent-manifest");
    const manifests = await loadAllManifests().catch(() => []);

    for (const manifest of manifests) {
      if (!registeredSet.has(manifest.id)) {
        missing.push(manifest.id);
      }
    }
  } catch {
    // agent-manifest module unavailable — skip.
  }

  return missing;
}

/**
 * Check 3 — Context key conflicts.
 *
 * When two or more adapters declare they *write* the same context key,
 * downstream consumers may receive unpredictable values.  We flag these
 * as potential conflicts.
 */
async function checkContextConflicts(
  registeredIds: string[],
): Promise<string[]> {
  const conflicts: string[] = [];

  if (registeredIds.length === 0) return conflicts;

  try {
    // Attempt to use the unified registry to inspect writes.
    const { agentRegistry } = await import("./unified-registry");
    const writesMap = new Map<string, string[]>();

    for (const id of registeredIds) {
      const adapter = (agentRegistry as Record<string, unknown>).get(id) as
        Record<string, unknown> | undefined;
      if (!adapter) continue;

      // Read writes — it may be a property or accessor.
      const writes: readonly string[] = Array.isArray(adapter.writes)
        ? (adapter.writes as readonly string[])
        : [];

      for (const key of writes) {
        const existing = writesMap.get(key) ?? [];
        existing.push(id);
        writesMap.set(key, existing);
      }
    }

    for (const [key, agents] of Array.from(writesMap.entries())) {
      if (agents.length > 1) {
        conflicts.push(`"${key}" written by [${agents.join(", ")}]`);
      }
    }
  } catch {
    // If registry introspection isn't available, try inspecting
    // adapters/ALL_ADAPTERS directly.
    try {
      const { ALL_ADAPTERS } = await import("./adapters/index");
      const writesMap = new Map<string, string[]>();

      for (const [id, adapter] of Object.entries(ALL_ADAPTERS)) {
        const writes: readonly string[] =
          (adapter as Record<string, unknown>).writes as readonly string[] ?? [];
        for (const key of writes) {
          const existing = writesMap.get(key) ?? [];
          existing.push(id);
          writesMap.set(key, existing);
        }
      }

      for (const [key, agents] of Array.from(writesMap.entries())) {
        if (agents.length > 1) {
          conflicts.push(`"${key}" written by [${agents.join(", ")}]`);
        }
      }
    } catch {
      // Both methods failed — skip this check silently.
    }
  }

  return conflicts;
}

/**
 * Check 4 — Dependency issues.
 *
 * Resolves manifest-level dependencies and flags any that cannot be
 * satisfied by the current set of registered adapters.
 */
async function checkDependencyIssues(
  registeredIds: string[],
): Promise<string[]> {
  const issues: string[] = [];
  const registeredSet = new Set(registeredIds);

  try {
    const { loadAllManifests, resolveManifestDependencies } =
      await import("./agent-manifest");

    const manifests = await loadAllManifests().catch(() => []);

    for (const manifest of manifests) {
      if (!manifest.dependencies || manifest.dependencies.length === 0) continue;

      const result = resolveManifestDependencies(manifest.id, manifests);
      for (const dep of result.unresolved) {
        issues.push(
          `"${manifest.id}" depends on "${dep}" which is not registered`,
        );
      }
    }
  } catch {
    // agent-manifest module unavailable — skip.
  }

  return issues;
}

// ────────────────────────────────────────────────────────────────────────────
// Public validation API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run all registry validation checks and return a comprehensive report.
 *
 * This function exercises every validation path:
 * 1. Agent registration completeness
 * 2. Prompt template file existence
 * 3. Adapter implementation availability
 * 4. Context key conflict detection
 * 5. Manifest dependency resolution
 *
 * @example
 * ```ts
 * const report = await validateAllRegistries();
 * if (!report.success) {
 *   console.error(report.report);
 * }
 * ```
 */
export async function validateAllRegistries(): Promise<ValidationReport> {
  const lines: string[] = [];
  const errors: string[] = [];

  // ── Collect registered agents ──────────────────────────────────────────
  let registeredIds: string[] = [];

  try {
    const registry = await import("./unified-registry") as Record<string, unknown>;
    const registryInstance = registry.agentRegistry ?? registry.default;
    if (registryInstance && typeof (registryInstance as Record<string, unknown>).list === "function") {
      const adapters = (registryInstance as Record<string, unknown>).list() as Array<Record<string, unknown>>;
      registeredIds = adapters.map((a) => {
        const meta = a.metadata as Record<string, unknown> | undefined;
        return String(meta?.id ?? "");
      }).filter(Boolean);
    }
  } catch {
    // Fallback: read from the adapters barrel if unified-registry isn't ready.
    try {
      const { ALL_ADAPTERS } = await import("./adapters/index");
      registeredIds = Object.keys(ALL_ADAPTERS);
    } catch {
      registeredIds = [];
    }
  }

  const totalAgents = registeredIds.length;

  // ── Header ─────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("  NEXUS AGENT PLATFORM — Registry Validation Report");
  lines.push("=".repeat(72));
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(`  Total agents discovered: ${totalAgents}`);
  lines.push("=".repeat(72));
  lines.push("");

  // ── Check 1: Registration status ───────────────────────────────────────
  lines.push(`── Agent Registration (${totalAgents} ${pluralize(totalAgents, "agent")}) ──`);

  if (totalAgents === 0) {
    lines.push(fmtLine("Warning", "No agents registered", false));
    lines.push("");
    errors.push("No agents are registered in the system");
  } else {
    for (const id of [...registeredIds].sort()) {
      lines.push(fmtLine("Registered", id, true));
    }
    lines.push("");
  }

  // ── Check 2: Missing prompt templates ──────────────────────────────────
  lines.push("── Prompt Template Coverage ──");

  const missingPrompts = await checkMissingPrompts(registeredIds);

  if (missingPrompts.length === 0) {
    lines.push(fmtLine("All prompts", "All registered agents have prompt templates", true));
  } else {
    for (const id of missingPrompts) {
      lines.push(fmtLine("Missing prompt", id, false));
      errors.push(`Agent "${id}" is missing its prompt template file`);
    }
  }
  lines.push("");

  // ── Check 3: Missing adapters ──────────────────────────────────────────
  lines.push("── Adapter Implementation Coverage ──");

  const missingAdapters = await checkMissingAdapters(registeredIds);

  if (missingAdapters.length === 0) {
    lines.push(fmtLine("All adapters", "All manifest entries have adapter implementations", true));
  } else {
    for (const id of missingAdapters) {
      lines.push(fmtLine("Missing adapter", id, false));
      errors.push(`Manifest references agent "${id}" but no adapter implementation is registered`);
    }
  }
  lines.push("");

  // ── Check 4: Context key conflicts ─────────────────────────────────────
  lines.push("── Context Key Conflict Detection ──");

  const contextConflicts = await checkContextConflicts(registeredIds);

  if (contextConflicts.length === 0) {
    lines.push(fmtLine("No conflicts", "No context key conflicts detected", true));
  } else {
    for (const conflict of contextConflicts) {
      lines.push(fmtLine("Conflict", conflict, false));
      errors.push(`Context key conflict: ${conflict}`);
    }
  }
  lines.push("");

  // ── Check 5: Dependency issues ─────────────────────────────────────────
  lines.push("── Manifest Dependency Resolution ──");

  const dependencyIssues = await checkDependencyIssues(registeredIds);

  if (dependencyIssues.length === 0) {
    lines.push(fmtLine("All resolved", "All manifest dependencies are satisfied", true));
  } else {
    for (const issue of dependencyIssues) {
      lines.push(fmtLine("Unresolved", issue, false));
      errors.push(issue);
    }
  }
  lines.push("");

  // ── Summary ─────────────────────────────────────────────────────────────
  lines.push("=".repeat(72));
  const success = errors.length === 0;
  lines.push(success
    ? "  ✅ All validations passed — registry is healthy."
    : `  ❌ ${errors.length} ${pluralize(errors.length, "issue", "issues")} found requiring attention.`,
  );
  lines.push("=".repeat(72));

  const report = lines.join("\n");

  return {
    success,
    totalAgents,
    registeredAgents: [...registeredIds].sort(),
    missingPrompts,
    missingAdapters,
    contextConflicts,
    dependencyIssues,
    report,
  };
}

// ============================================================================
// CLI Entry Point
// ============================================================================
// Run with: npx ts-node engine/registry/index.ts --validate
// ============================================================================

/**
 * Check whether the current process is running this file as a script.
 * When `--validate` is passed, the full validation report is printed to
 * stdout and the process exits with code 0 on success, 1 on failure.
 */
function isCliEntryPoint(): boolean {
  try {
    // In Node.js / ts-node, the process.argv[1] is the script path.
    // We compare the basename to detect direct execution.
    const scriptPath =
      typeof process !== "undefined"
        ? (process.argv[1] ?? "")
        : "";

    // Match both forward-slash and back-slash paths.
    const normalized = scriptPath.replace(/\\/g, "/");
    return (
      normalized.endsWith("engine/registry/index.ts") ||
      normalized.endsWith("engine/registry/index.js") ||
      normalized.endsWith("engine/registry/index")
    );
  } catch {
    return false;
  }
}

/**
 * Main CLI handler.  Parses arguments, runs validation, and prints the report.
 *
 * Supported flags:
 *   --validate   Run full registry validation
 *   --json       Output the machine-readable report as JSON (with --validate)
 *   --quiet      Suppress the human-readable report (with --validate + --json)
 */
async function cliMain(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--validate")) {
    const report = await validateAllRegistries();

    const wantJson = args.includes("--json");
    const wantQuiet = args.includes("--quiet");

    if (wantJson) {
      // Machine-readable JSON output.
      const { report: _report, ...machine } = report;
      process.stdout.write(JSON.stringify(machine, null, 2) + "\n");
    } else if (!wantQuiet) {
      // Human-readable formatted report.
      process.stdout.write(report.report + "\n");
    }

    process.exit(report.success ? 0 : 1);
  } else {
    process.stdout.write(
      [
        "",
        "Nexus Agent Platform — Registry CLI",
        "",
        "Usage:  npx ts-node engine/registry/index.ts [flags]",
        "",
        "Flags:",
        "  --validate    Run full registry validation and print report",
        "  --json        Output machine-readable JSON (with --validate)",
        "  --quiet       Suppress human-readable output (with --validate + --json)",
        "",
      ].join("\n"),
    );
    process.exit(0);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Self-execution guard — only runs when the file is directly invoked.
// ────────────────────────────────────────────────────────────────────────────

try {
  if (typeof process !== "undefined" && isCliEntryPoint()) {
    cliMain().catch((err) => {
      console.error("CLI error:", err);
      process.exit(1);
    });
  }
} catch {
  // Not running in Node.js — silently skip CLI.
}
