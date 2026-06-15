// ============================================================================
// Nexus Agent Platform — Registry Bootstrap System
// ============================================================================
// Entry point for initialising the agent registry at application startup.
// Orchestrates prompt loading, adapter discovery, registration, validation,
// and diagnostics reporting.
//
// Usage:
//   import { initializeDefaultRegistry } from "@/engine/registry/bootstrap";
//   const result = await initializeDefaultRegistry();
//
//   if (!result.success) {
//     console.error("Registry bootstrap failed:", result.errors);
//   }
// ============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import { PromptLoader, type LoadedPrompt } from "./prompt-loader";
import { AgentRegistry } from "./agent-registry";
import { AdapterLoader } from "./adapter-loader";
import type {
  AgentAdapter,
  AgentMetadata,
} from "@/lib/agents/registry/types";

// ============================================================================
// Well-Known Default Paths
// ============================================================================

/**
 * Default prompt file directories, relative to the project root.
 * Paths containing `*` are treated as wildcards and expanded by enumerating
 * subdirectories at runtime. All files are loaded; duplicate agentId+version
 * combos are deduplicated in the manifest.
 */
const DEFAULT_PROMPT_PATTERNS: string[] = [
  "./prompts/",
  "./app/agents/prompts/",
  "./lib/agent-registry/prompts/",
  "./lib/agents/prompts/",
  "./lib/agents/seo-specialist/prompts/",
  "./src/agents/*/prompts/",
  "./agents/*/prompts/",
];

/**
 * Default adapter file directories/glob patterns, relative to the project root.
 * Paths containing `*` are expanded by enumerating subdirectories at runtime.
 * Scanned for files that export AgentAdapter instances.
 */
const DEFAULT_ADAPTER_PATTERNS: string[] = [
  "./engine/registry/adapters/",
  "./lib/agent-registry/adapters/",
  "./lib/agents/adapters/",
  "./src/agents/*/",
  "./agents/*/",
];

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the registry bootstrap process.
 */
export interface BootstrapConfig {
  /** Directories to scan for .prompt.yaml files. */
  promptDirectories: string[];
  /** Directories to scan for adapter modules. */
  adapterDirectories: string[];
  /**
   * If true, bootstrap throws on critical failures.
   * If false, bootstrap collects errors and continues.
   * Default: true.
   */
  strictMode: boolean;
  /** If true, scans adapter directories for adapter modules. Default: true. */
  autoDiscoverAdapters: boolean;
  /** If true, scans prompt directories for prompt files. Default: true. */
  autoDiscoverPrompts: boolean;
  /**
   * If true, runs full registry validation after loading.
   * Validates each adapter-prompt pair for compatibility.
   * Default: true.
   */
  validateOnStartup: boolean;
  /** If true, collects and attaches diagnostic information. Default: true. */
  enableDiagnostics: boolean;
}

/**
 * Result of a full registry bootstrap operation.
 */
export interface BootstrapResult {
  /** Whether the bootstrap completed successfully (no critical errors). */
  success: boolean;
  /** The initialised AgentRegistry instance with registered adapters. */
  registry: AgentRegistry;
  /** The initialised PromptLoader with all discovered prompts. */
  promptLoader: PromptLoader;
  /** Detailed manifest of all discovered agents and their status. */
  adapterManifest: AdapterManifestEntry[];
  /** Full validation report (null if validateOnStartup is false). */
  validationReport: RegistryValidationReport | null;
  /** Total duration of the bootstrap process in milliseconds. */
  durationMs: number;
  /** Critical errors that occurred during bootstrap. */
  errors: string[];
  /** Non-critical warnings that occurred during bootstrap. */
  warnings: string[];
}

/**
 * Entry in the adapter manifest describing the status of one agent.
 */
export interface AdapterManifestEntry {
  /** Agent identifier (e.g. "support-infrastructure-maintainer"). */
  agentId: string;
  /** Human-readable display name. */
  displayName: string;
  /** Adapter version (semver). */
  version: string;
  /** Prompt version this agent is bound to, or null if none found. */
  promptVersion: string | null;
  /** Context keys this agent reads from the shared context. */
  contextReads: string[];
  /** Context keys this agent writes to the shared context. */
  contextWrites: string[];
  /** Capability tags for routing and discovery. */
  capabilities: string[];
  /**
   * Registration status:
   *   - "registered"        — adapter + prompt both present
   *   - "missing_adapter"   — prompt exists but no adapter registered
   *   - "missing_prompt"    — adapter exists but no prompt found
   *   - "error"             — registration or validation error
   */
  status: "registered" | "missing_adapter" | "missing_prompt" | "error";
}

/**
 * Full validation report generated during bootstrap.
 */
export interface RegistryValidationReport {
  /** Total number of prompts discovered and loaded. */
  totalPrompts: number;
  /** Total number of adapters registered. */
  totalAdapters: number;
  /** Number of compatible adapter-prompt pairs. */
  compatiblePairs: number;
  /** Non-critical warnings per agent. */
  warnings: RegistryValidationIssue[];
  /** Critical errors per agent. */
  errors: RegistryValidationIssue[];
}

/**
 * A single validation issue (warning or error) for a specific agent.
 */
export interface RegistryValidationIssue {
  /** The agent this issue relates to. */
  agentId: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Optional prompt path for context. */
  promptPath?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Expands paths containing `*` wildcards by enumerating the parent
 * directory and replacing `*` with each child directory name.
 *
 * Non-wildcard paths are returned as-is.
 *
 * @param patterns - Array of directory paths, optionally containing `*`.
 * @param projectRoot - Root directory for relative path resolution.
 * @returns Expanded array of resolved absolute directory paths.
 */
function expandWildcardPaths(
  patterns: string[],
  projectRoot: string,
): string[] {
  const resolved: string[] = [];

  for (const pattern of patterns) {
    if (!pattern.includes("*")) {
      resolved.push(path.resolve(projectRoot, pattern));
      continue;
    }

    // Split on the first wildcard segment
    const starIndex = pattern.indexOf("*");
    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);

    const absPrefix = path.resolve(projectRoot, prefix);

    try {
      const entries = fs.readdirSync(absPrefix, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const expanded = path.join(
            absPrefix,
            entry.name,
            suffix,
          );
          resolved.push(expanded);
        }
      }
    } catch {
      // Directory doesn't exist — skip silently
    }
  }

  return resolved;
}

/**
 * Returns the default bootstrap configuration with well-known paths
 * resolved relative to the project root.
 */
function defaultConfig(
  projectRoot: string,
): BootstrapConfig {
  const expandedPrompts = expandWildcardPaths(
    DEFAULT_PROMPT_PATTERNS,
    projectRoot,
  );
  const expandedAdapters = expandWildcardPaths(
    DEFAULT_ADAPTER_PATTERNS,
    projectRoot,
  );

  return {
    promptDirectories: expandedPrompts,
    adapterDirectories: expandedAdapters,
    strictMode: true,
    autoDiscoverAdapters: true,
    autoDiscoverPrompts: true,
    validateOnStartup: true,
    enableDiagnostics: true,
  };
}

// ============================================================================
// Adapter Scanner
// ============================================================================

/**
 * Discovers adapter module files within the given directories.
 *
 * Looks for:
 *   1. Files matching `*.adapter.ts` or `*.adapter.tsx`
 *   2. Files matching `*.adapter.js` or `*.adapter.mjs`
 *   3. Direct `index.ts` files inside `adapters/` directories
 *
 * @param directories - Absolute paths to search for adapter files.
 * @returns Absolute paths to discovered adapter files.
 */
async function findAdapterFiles(
  directories: string[],
): Promise<string[]> {
  const results = new Set<string>();

  for (const dir of directories) {
    try {
      const stat = await fs.promises.stat(dir);
      if (!stat.isDirectory()) continue;
    } catch {
      // Directory doesn't exist — skip silently
      continue;
    }

    const files = await scanDirForAdapterFiles(dir);
    for (const file of files) {
      results.add(file);
    }
  }

  return Array.from(results).sort();
}

/**
 * Recursively scans a single directory for adapter files.
 */
async function scanDirForAdapterFiles(
  dir: string,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        if (entry.name === "node_modules") continue;
        if (entry.name === ".git") continue;
        // Don't recurse into nested dist/ or build output
        if (entry.name === "dist" || entry.name === ".next") continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        const name = entry.name;
        const isAdapterFile =
          name.endsWith(".adapter.ts") ||
          name.endsWith(".adapter.tsx") ||
          name.endsWith(".adapter.js") ||
          name.endsWith(".adapter.mjs");

        if (isAdapterFile) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

// ============================================================================
// Dynamic Adapter Import
// ============================================================================

/**
 * Attempts to dynamically import an adapter module from a file path.
 * Handles both ESM `import()` and provides safe error handling.
 *
 * @param filePath - Absolute path to the adapter module file.
 * @returns The imported adapter instance, or null if not found/valid.
 */
async function importAdapterFromFile(
  filePath: string,
): Promise<AgentAdapter | null> {
  try {
    // Dynamic import with file:// protocol for Windows compatibility
    const fileUrl = path.posix
      ? filePath.replace(/\\/g, "/")
      : filePath;
    const mod = await import(/* @vite-ignore */ fileUrl);

    // Try default export first (most common pattern)
    if (mod.default && isAdapterObject(mod.default)) {
      return mod.default as AgentAdapter;
    }

    // Try named exports
    if (mod.adapter && isAdapterObject(mod.adapter)) {
      return mod.adapter as AgentAdapter;
    }

    // Scan named exports for adapter objects
    for (const [key, value] of Object.entries(mod)) {
      if (
        key !== "default" &&
        key !== "adapter" &&
        isAdapterObject(value)
      ) {
        return value as AgentAdapter;
      }
    }

    // Look for exports ending in "Adapter" or "adapter"
    for (const [key, value] of Object.entries(mod)) {
      if (
        (key.endsWith("Adapter") || key.endsWith("adapter")) &&
        isAdapterObject(value)
      ) {
        return value as AgentAdapter;
      }
    }

    return null;
  } catch (error) {
    console.warn(
      `[Bootstrap] Failed to import adapter from '${filePath}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/**
 * Type guard: checks if a value looks like an AgentAdapter.
 * Duck-typing: must have a `metadata` object with at least `id` and `name`.
 */
function isAdapterObject(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  const meta = candidate["metadata"];

  if (typeof meta !== "object" || meta === null) return false;
  const metaObj = meta as Record<string, unknown>;

  return (
    typeof metaObj["id"] === "string" &&
    metaObj["id"].length > 0 &&
    typeof metaObj["name"] === "string" &&
    typeof candidate["execute"] === "function"
  );
}

// ============================================================================
// Manifest Builder
// ============================================================================

/**
 * Builds a comprehensive adapter manifest by cross-referencing the
 * AgentRegistry (loaded adapters) with the PromptLoader (discovered prompts).
 *
 * For each adapter in the registry, creates a manifest entry.
 * For each prompt without a corresponding adapter, creates a
 * "missing_adapter" entry.
 */
function buildAdapterManifest(
  registry: AgentRegistry,
  prompts: LoadedPrompt[],
  errors: string[],
): AdapterManifestEntry[] {
  const manifest: AdapterManifestEntry[] = [];
  const processedAgents = new Set<string>();

  // ---- Process registered adapters ----
  const allMetadata: AgentMetadata[] = registry.getAllMetadata();

  for (const meta of allMetadata) {
    processedAgents.add(meta.id);

    const matchingPrompts = prompts.filter(
      (p) => p.agentId === meta.id,
    );
    const latestPrompt =
      matchingPrompts.length > 0 ? matchingPrompts[0] : null;

    // Determine status
    let status: AdapterManifestEntry["status"] = "registered";
    if (!latestPrompt) {
      status = "missing_prompt";
    }

    manifest.push({
      agentId: meta.id,
      displayName: meta.name,
      version: meta.version,
      promptVersion: latestPrompt
        ? `${latestPrompt.agentId}.${latestPrompt.version}`
        : meta.promptVersion ?? null,
      contextReads: extractContextReads(meta),
      contextWrites: extractContextWrites(meta),
      capabilities: meta.capabilities ?? [],
      status,
    });
  }

  // ---- Process prompts without matching adapters ----
  for (const prompt of prompts) {
    if (!processedAgents.has(prompt.agentId)) {
      manifest.push({
        agentId: prompt.agentId,
        displayName: prompt.metadata.title ?? prompt.agentId,
        version: prompt.version,
        promptVersion: `${prompt.agentId}.${prompt.version}`,
        contextReads: prompt.metadata.context?.reads ?? [],
        contextWrites: prompt.metadata.context?.writes ?? [],
        capabilities: [],
        status: "missing_adapter",
      });
      processedAgents.add(prompt.agentId);
    }
  }

  return manifest.sort((a, b) => a.agentId.localeCompare(b.agentId));
}

/**
 * Extracts context read keys from adapter metadata.
 */
function extractContextReads(
  metadata: AgentMetadata,
): string[] {
  // EnhancedAgentAdapter has readsContextKeys; base AgentAdapter doesn't
  // For the manifest, return what's available or empty
  const enhanced = metadata as Record<string, unknown>;
  const reads = enhanced["readsContextKeys"] ?? enhanced["reads"];
  if (Array.isArray(reads)) {
    return reads.filter((r): r is string => typeof r === "string");
  }
  return [];
}

/**
 * Extracts context write keys from adapter metadata.
 */
function extractContextWrites(
  metadata: AgentMetadata,
): string[] {
  const enhanced = metadata as Record<string, unknown>;
  const writes = enhanced["writesContextKeys"] ?? enhanced["writes"];
  if (Array.isArray(writes)) {
    return writes.filter((w): w is string => typeof w === "string");
  }
  return [];
}

// ============================================================================
// Validator
// ============================================================================

/**
 * Runs full registry validation:
 *   1. Checks each registered adapter has a matching prompt
 *   2. Validates adapter-prompt compatibility
 *   3. Checks for duplicate agent IDs
 *   4. Verifies prompt template integrity
 *
 * @param registry - Initialised AgentRegistry with registered adapters.
 * @param promptLoader - Initialised PromptLoader with discovered prompts.
 * @returns A RegistryValidationReport.
 */
async function runRegistryValidation(
  registry: AgentRegistry,
  promptLoader: PromptLoader,
): Promise<RegistryValidationReport> {
  const allPrompts = promptLoader.listAll();
  const allMetadata = registry.getAllMetadata();

  const warningIssues: RegistryValidationIssue[] = [];
  const errorIssues: RegistryValidationIssue[] = [];

  // ---- Check adapter-prompt pairs ----
  for (const meta of allMetadata) {
    const matchingPrompts = allPrompts.filter(
      (p) => p.agentId === meta.id,
    );

    if (matchingPrompts.length === 0) {
      warningIssues.push({
        agentId: meta.id,
        message: `Adapter '${meta.id}' (v${meta.version}) has no matching prompt. The agent will operate without an externalized prompt template.`,
      });
      continue;
    }

    // Validate compatibility with the best-matching (latest) prompt
    const bestPrompt = matchingPrompts[0];
    const validationResult = promptLoader.validateCompatibility(
      meta.id,
      `${bestPrompt.agentId}.${bestPrompt.version}`,
    );

    if (!validationResult.compatible) {
      errorIssues.push({
        agentId: meta.id,
        message: `Adapter-prompt compatibility check failed:\n${validationResult.messages.join("\n")}`,
        promptPath: bestPrompt.path,
      });
    } else if (validationResult.severity === "warning") {
      for (const msg of validationResult.messages) {
        if (msg.startsWith("Warning:")) {
          warningIssues.push({
            agentId: meta.id,
            message: msg,
            promptPath: bestPrompt.path,
          });
        }
      }
    }
  }

  // ---- Check prompts without adapters ----
  const registeredIds = new Set(allMetadata.map((m) => m.id));
  for (const prompt of allPrompts) {
    if (!registeredIds.has(prompt.agentId)) {
      warningIssues.push({
        agentId: prompt.agentId,
        message: `Prompt '${prompt.agentId}.${prompt.version}' has no registered adapter. The prompt will be loaded but cannot be used until an adapter is registered.`,
        promptPath: prompt.path,
      });
    }
  }

  // ---- Check for empty templates ----
  for (const prompt of allPrompts) {
    if (!prompt.template || prompt.template.trim() === "") {
      errorIssues.push({
        agentId: prompt.agentId,
        message: `Prompt '${prompt.agentId}.${prompt.version}' has an empty template body at '${prompt.path}'.`,
        promptPath: prompt.path,
      });
    }
  }

  const compatiblePairs = allMetadata.filter((meta) => {
    const matchingPrompts = allPrompts.filter(
      (p) => p.agentId === meta.id,
    );
    if (matchingPrompts.length === 0) return false;
    const result = promptLoader.validateCompatibility(
      meta.id,
      `${matchingPrompts[0].agentId}.${matchingPrompts[0].version}`,
    );
    return result.compatible;
  }).length;

  return {
    totalPrompts: allPrompts.length,
    totalAdapters: allMetadata.length,
    compatiblePairs,
    warnings: warningIssues,
    errors: errorIssues,
  };
}

// ============================================================================
// Bootstrap Entry Point
// ============================================================================

/**
 * Initialises the Nexus Agent Registry with prompts, adapters, and
 * optional validation.
 *
 * This is the primary bootstrap entry point. It:
 *   1. Creates a PromptLoader with the configured directories
 *   2. Discovers all .prompt.yaml files
 *   3. Creates an AgentRegistry instance
 *   4. Optionally discovers and registers adapter modules
 *   5. Optionally runs full registry validation
 *   6. Builds a comprehensive adapter manifest
 *   7. Returns a BootstrapResult with diagnostics
 *
 * @param config - Partial BootstrapConfig; omitted fields use defaults.
 * @param projectRoot - Project root directory; defaults to CWD.
 * @returns A BootstrapResult describing the outcome.
 */
export async function initializeRegistry(
  config?: Partial<BootstrapConfig>,
  projectRoot?: string,
): Promise<BootstrapResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  const root = projectRoot ?? process.cwd();
  const resolvedRoot = path.resolve(root);

  // Merge provided config with defaults
  const defaults = defaultConfig(resolvedRoot);
  const finalConfig: BootstrapConfig = {
    promptDirectories: config?.promptDirectories ?? defaults.promptDirectories,
    adapterDirectories:
      config?.adapterDirectories ?? defaults.adapterDirectories,
    strictMode: config?.strictMode ?? defaults.strictMode,
    autoDiscoverAdapters:
      config?.autoDiscoverAdapters ?? defaults.autoDiscoverAdapters,
    autoDiscoverPrompts:
      config?.autoDiscoverPrompts ?? defaults.autoDiscoverPrompts,
    validateOnStartup:
      config?.validateOnStartup ?? defaults.validateOnStartup,
    enableDiagnostics:
      config?.enableDiagnostics ?? defaults.enableDiagnostics,
  };

  // Resolve all paths (in case partial config passed relative paths)
  finalConfig.promptDirectories = finalConfig.promptDirectories.map((d) =>
    path.resolve(resolvedRoot, d),
  );
  finalConfig.adapterDirectories = finalConfig.adapterDirectories.map((d) =>
    path.resolve(resolvedRoot, d),
  );

  // ---- Step 1: Create PromptLoader and discover prompts ----
  const promptLoader = new PromptLoader(finalConfig.promptDirectories);

  if (finalConfig.autoDiscoverPrompts) {
    try {
      await promptLoader.discover();
      const count = promptLoader.listAll().length;
      if (count === 0) {
        warnings.push(
          "No prompt files discovered. Check promptDirectories paths:\n" +
            finalConfig.promptDirectories
              .map((d) => `  - ${d}`)
              .join("\n"),
        );
      } else if (finalConfig.enableDiagnostics) {
        warnings.push(
          `Discovered ${count} prompt file(s) across ${finalConfig.promptDirectories.length} director(ies).`,
        );
      }
    } catch (error) {
      const msg = `Prompt discovery failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(msg);
      if (finalConfig.strictMode) {
        return buildErrorResult(
          errors,
          warnings,
          promptLoader,
          startTime,
        );
      }
    }
  }

  // ---- Step 2: Create AgentRegistry ----
  const registry = new AgentRegistry();

  // ---- Step 3: Discover and register adapters ----
  if (finalConfig.autoDiscoverAdapters) {
    try {
      const adapterFiles = await findAdapterFiles(
        finalConfig.adapterDirectories,
      );

      if (adapterFiles.length === 0) {
        warnings.push(
          "No adapter files discovered. Check adapterDirectories paths:\n" +
            finalConfig.adapterDirectories
              .map((d) => `  - ${d}`)
              .join("\n"),
        );
      } else if (finalConfig.enableDiagnostics) {
        warnings.push(
          `Found ${adapterFiles.length} potential adapter file(s).`,
        );
      }

      const adapterLoader = new AdapterLoader(registry);
      let loadedCount = 0;

      for (const filePath of adapterFiles) {
        try {
          const adapter = await importAdapterFromFile(filePath);
          if (adapter) {
            try {
              adapterLoader.loadAdapter(adapter);
              loadedCount++;
            } catch (regError) {
              const msg =
                `Duplicate or conflicting adapter in '${filePath}': ${
                  regError instanceof Error
                    ? regError.message
                    : String(regError)
                }`;
              errors.push(msg);
            }
          } else {
            warnings.push(
              `File '${filePath}' does not export a valid AgentAdapter.`,
            );
          }
        } catch (importError) {
          const msg =
            `Failed to import '${filePath}': ${
              importError instanceof Error
                ? importError.message
                : String(importError)
            }`;
          // Dynamic import errors are non-critical in auto-discover mode
          warnings.push(msg);
        }
      }

      if (finalConfig.enableDiagnostics) {
        warnings.push(
          `Registered ${loadedCount} adapter(s) from ${adapterFiles.length} file(s).`,
        );
      }
    } catch (error) {
      const msg = `Adapter discovery failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(msg);
      if (finalConfig.strictMode) {
        return buildErrorResult(
          errors,
          warnings,
          promptLoader,
          startTime,
          registry,
        );
      }
    }
  }

  // ---- Step 4: Run validation ----
  let validationReport: RegistryValidationReport | null = null;

  if (finalConfig.validateOnStartup) {
    try {
      validationReport = await runRegistryValidation(
        registry,
        promptLoader,
      );

      // Collect validation issues into the top-level warnings/errors
      for (const warn of validationReport.warnings) {
        warnings.push(`[${warn.agentId}] ${warn.message}`);
      }
      for (const err of validationReport.errors) {
        errors.push(`[${err.agentId}] ${err.message}`);
      }
    } catch (error) {
      const msg = `Registry validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(msg);
    }
  }

  // ---- Step 5: Build adapter manifest ----
  const allPrompts = promptLoader.listAll();
  const adapterManifest = buildAdapterManifest(
    registry,
    allPrompts,
    errors,
  );

  // ---- Step 6: Return result ----
  const durationMs = Math.round(performance.now() - startTime);

  return {
    success: errors.length === 0,
    registry,
    promptLoader,
    adapterManifest,
    validationReport,
    durationMs,
    errors,
    warnings,
  };
}

// ============================================================================
// Convenience: Default Registry
// ============================================================================

/**
 * Convenience function that initialises the registry using all default
 * well-known paths. Equivalent to calling `initializeRegistry({})` with
 * no overrides.
 *
 * Suitable for calling at application startup:
 *
 * ```typescript
 * // app/layout.tsx or server entry point
 * const { registry, promptLoader } = await initializeDefaultRegistry();
 * ```
 *
 * @returns A BootstrapResult with default configuration.
 */
export async function initializeDefaultRegistry(): Promise<BootstrapResult> {
  return initializeRegistry({});
}

// ============================================================================
// Error-Result Builder
// ============================================================================

/**
 * Builds a BootstrapResult when a critical error occurs early in the
 * bootstrap flow, before the full result can be constructed.
 */
function buildErrorResult(
  errors: string[],
  warnings: string[],
  promptLoader: PromptLoader,
  startTime: number,
  registry?: AgentRegistry,
): BootstrapResult {
  const durationMs = Math.round(performance.now() - startTime);
  const reg = registry ?? new AgentRegistry();

  return {
    success: false,
    registry: reg,
    promptLoader,
    adapterManifest: [],
    validationReport: null,
    durationMs,
    errors,
    warnings,
  };
}
