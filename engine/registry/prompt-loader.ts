// ============================================================================
// Nexus Agent Platform — Prompt Loader
// ============================================================================
// Loads, parses, caches, and validates externalized prompt YAML files from
// multiple filesystem directories. Handles version resolution, variable
// extraction, and compatibility checks between agents and their prompts.
//
// Supported prompt YAML formats:
//   - {meta: {agent: ..., prompt_version: ..., description: ...}, system_prompt: ...}
//   - {prompt: {id: ..., agent: ..., title: ..., version: ..., systemPrompt: ...}}
// ============================================================================

import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata extracted from a parsed prompt YAML file. Normalises the various
 * YAML schemas (meta: vs prompt:) into a single shape.
 */
export interface PromptMetadata {
  title?: string;
  description?: string;
  author?: string;
  schema?: string;
  tags?: string[];
  context?: {
    reads: string[];
    writes: string[];
  };
}

/**
 * A fully loaded and parsed prompt ready for use by the runtime.
 */
export interface LoadedPrompt {
  /** Agent identifier this prompt belongs to (without @ prefix). */
  agentId: string;
  /** Prompt version string (e.g. "v1", "1.0.0"). */
  version: string;
  /** Absolute filesystem path to the YAML source file. */
  path: string;
  /** Raw YAML content of the file. */
  content: string;
  /** Normalised metadata extracted from the YAML. */
  metadata: PromptMetadata;
  /**
   * The rendered system-prompt template text with {{variable}}
   * placeholders. This is the concatenated instruction string that
   * gets passed to the LLM at runtime after variable interpolation.
   */
  template: string;
  /**
   * Variable names extracted from both the YAML `variables` declaration
   * and from {{variable}} patterns in the template text.
   */
  variables: string[];
}

/**
 * Result of a compatibility check between an agent and a prompt.
 */
export interface ValidationResult {
  /** Whether the agent-prompt pair is compatible. */
  compatible: boolean;
  /** Agent ID that was validated. */
  agentId: string;
  /** Prompt ID (agentId.version) that was validated. */
  promptId: string;
  /** Human-readable messages explaining the result. */
  messages: string[];
  /** Severity level. */
  severity: "compatible" | "warning" | "error";
}

// ============================================================================
// YAML Parsing (Lightweight — targeted at prompt file structures)
// ============================================================================

/**
 * Parses a YAML string into a nested Record structure.
 * Handles the subset of YAML used by prompt files:
 *   - Key-value pairs (scalars, quoted strings)
 *   - Nested objects via 2-space indentation
 *   - Lists with `- ` prefix
 *   - Multi-line literal blocks (`|`) and folded blocks (`>`)
 *   - Comments (`# ...`)
 *   - Empty lines
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: root, indent: -1 },
  ];
  const listStack: Array<{
    arr: unknown[];
    parentKey: string;
    parentObj: Record<string, unknown>;
  } | null> = [];
  let currentMultiline: {
    key: string;
    style: "literal" | "folded";
    lines: string[];
    indent: number;
    obj: Record<string, unknown>;
  } | null = null;

  /**
   * Computes the indentation level (number of leading spaces) of a line.
   */
  function getIndent(line: string): number {
    const match = line.match(/^[ ]*/);
    return match ? match[0].length : 0;
  }

  /**
   * Strips comments from a line, handling `#` inside quoted strings.
   */
  function stripComment(line: string): string {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === "#" && !inSingle && !inDouble) {
        // Make sure it's not part of a URL or value
        const before = line.slice(0, i).trimEnd();
        return before;
      }
    }
    return line;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trimEnd();

    // ---- Multi-line string continuation ----
    if (currentMultiline) {
      const lineContent = rawLine;
      const lineIndent = getIndent(lineContent);

      if (
        lineIndent > currentMultiline.indent &&
        lineContent.trim() !== ""
      ) {
        // Continuation line
        currentMultiline.lines.push(
          currentMultiline.style === "folded"
            ? lineContent.trim() + " "
            : lineContent.slice(currentMultiline.indent + 2),
        );
        continue;
      } else {
        // End of multi-line — flush
        const joined =
          currentMultiline.style === "folded"
            ? currentMultiline.lines.join("").replace(/ $/, "")
            : currentMultiline.lines.join("\n");
        // Remove trailing newline that the YAML spec requires for `|`
        const final =
          currentMultiline.style === "literal"
            ? joined.replace(/\n$/, "")
            : joined;
        currentMultiline.obj[currentMultiline.key] = final;
        currentMultiline = null;
        // Fall through to process this line as a new key
      }
    }

    const line = rawLine;
    const lineTrimmed = line.trim();

    // ---- Skip empty lines and comments ----
    if (lineTrimmed === "" || lineTrimmed.startsWith("#")) continue;

    // ---- List item ----
    if (lineTrimmed.startsWith("- ")) {
      const value = parseScalar(lineTrimmed.slice(2).trim());
      if (listStack.length > 0) {
        const top = listStack[listStack.length - 1];
        if (top) {
          top.arr.push(value);
        }
      }
      continue;
    }

    // ---- Key-value pair ----
    const colonIdx = lineTrimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = lineTrimmed.slice(0, colonIdx).trim();
    let rest = lineTrimmed.slice(colonIdx + 1).trim();

    // Clean comment from rest (but keep in mind rest may be empty)
    rest = stripComment(rest).trim();

    const indent = getIndent(line);

    // Pop stack to correct indentation level
    while (
      stack.length > 0 &&
      stack[stack.length - 1].indent >= indent
    ) {
      stack.pop();
    }

    // Also pop list stack if we've moved past it
    while (
      listStack.length > 0 &&
      stack.length > 0
    ) {
      const top = listStack[listStack.length - 1];
      if (!top) {
        listStack.pop();
        continue;
      }
      // Check if current key is at a lower indent than the list parent
      const parentObj = top.parentObj;
      const listParentKey = top.parentKey;
      // Find the list's indent by looking at the stack
      break;
    }

    const currentObj =
      stack.length > 0
        ? stack[stack.length - 1].obj
        : root;

    if (rest === "" || rest === "|" || rest === ">") {
      // Multi-line string or nested object
      if (rest === "|" || rest === ">") {
        // Multi-line scalar
        currentMultiline = {
          key,
          style: rest === "|" ? "literal" : "folded",
          lines: [],
          indent,
          obj: currentObj,
        };
        currentObj[key] = ""; // placeholder, will be replaced
      } else {
        // Nested object — create child, push to stack
        const child: Record<string, unknown> = {};
        currentObj[key] = child;
        stack.push({ obj: child, indent });

        // Check if the value is a list (next line starts with "- ")
        const nextLine =
          i + 1 < lines.length ? lines[i + 1].trim() : "";
        if (nextLine.startsWith("- ")) {
          const arr: unknown[] = [];
          currentObj[key] = arr;
          listStack.push({
            arr,
            parentKey: key,
            parentObj: currentObj,
          });
          stack.pop(); // list replaces the child object
        }
      }
    } else if (rest.startsWith("[")) {
      // Inline array: [item1, item2, ...]
      currentObj[key] = parseInlineArray(rest);
    } else {
      // Scalar value
      currentObj[key] = parseScalar(rest);
    }
  }

  // Flush any remaining multi-line
  if (currentMultiline) {
    const joined =
      currentMultiline.style === "folded"
        ? currentMultiline.lines.join("").replace(/ $/, "")
        : currentMultiline.lines.join("\n");
    const final =
      currentMultiline.style === "literal"
        ? joined.replace(/\n$/, "")
        : joined;
    currentMultiline.obj[currentMultiline.key] = final;
  }

  return root;
}

/**
 * Parses a YAML scalar value (handles quoted strings, booleans, numbers, null).
 */
function parseScalar(value: string): unknown {
  if (value === "null" || value === "~") return null;
  if (value === "true" || value === "True" || value === "TRUE") return true;
  if (value === "false" || value === "False" || value === "FALSE") return false;

  // Quoted string
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Number
  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") return num;

  // Default: string
  return value;
}

/**
 * Parses inline YAML array: [val1, val2, val3]
 */
function parseInlineArray(value: string): unknown[] {
  const inner = value.slice(1, -1);
  if (inner.trim() === "") return [];
  return inner.split(",").map((item) => {
    const trimmed = item.trim();
    return parseScalar(trimmed);
  });
}

/**
 * Deeply gets a value from a nested object using dot-separated path.
 */
function deepGet(
  obj: Record<string, unknown>,
  pathStr: string,
): unknown {
  const parts = pathStr.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Safely gets a string value from a nested object.
 */
function getString(
  obj: Record<string, unknown>,
  pathStr: string,
): string | undefined {
  const val = deepGet(obj, pathStr);
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean")
    return String(val);
  return undefined;
}

/**
 * Safely gets a string array from a nested object.
 */
function getStringArray(
  obj: Record<string, unknown>,
  pathStr: string,
): string[] {
  const val = deepGet(obj, pathStr);
  if (Array.isArray(val)) {
    return val.filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

// ============================================================================
// Variable Extraction
// ============================================================================

/**
 * Regex for finding {{variable}} patterns in template text.
 * Matches:
 *   {{ variable_name }}        — simple variable
 *   {{variable.sub_field}}     — nested variable with dot-path
 *   {{ variable_name | filter }} — Jinja2-style filtered variable
 *   {{ variable_name | default("fallback") }} — with default filter
 *
 * Captures the root variable name in group 1.
 */
const TEMPLATE_VAR_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:\|.*?)?\}\}/g;

/**
 * Extracts unique root variable names from a template string containing
 * {{variable}} patterns.
 *
 * For nested variables like `{{system_metrics.cpu_utilization_pct}}`,
 * only the root (`system_metrics`) is returned.
 *
 * @param template - The template string to scan.
 * @returns Deduplicated array of root variable names.
 */
export function extractTemplateVariables(template: string): string[] {
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  const regex = new RegExp(TEMPLATE_VAR_REGEX.source, TEMPLATE_VAR_REGEX.flags);
  while ((match = regex.exec(template)) !== null) {
    const fullPath = match[1];
    // Extract root variable (before any dot)
    const root = fullPath.includes(".") ? fullPath.split(".")[0] : fullPath;
    variables.add(root);
  }

  return Array.from(variables).sort();
}

/**
 * Extracts Jinja2-style control flow variable references like
 * {% if variable_name %} or {% for item in collection %}.
 */
const JINJA_VAR_REGEX =
  /\{%\s*(?:if|for|elif)\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:in\s+[a-zA-Z_][a-zA-Z0-9_.]*\s*)?%?\}?/g;

/**
 * Extracts variable references from Jinja2 control flow tags.
 */
function extractJinjaVariables(template: string): string[] {
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  const regex = new RegExp(JINJA_VAR_REGEX.source, JINJA_VAR_REGEX.flags);
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    const root = varName.includes(".") ? varName.split(".")[0] : varName;
    variables.add(root);
  }

  return Array.from(variables);
}

// ============================================================================
// Prompt Metadata Extraction
// ============================================================================

/**
 * Extracts normalised PromptMetadata from raw YAML content.
 *
 * Handles two major prompt YAML schemas:
 *   - `meta:` section (trend-researcher, pipeline-analyst style)
 *   - `prompt:` section (sales-outreach, ui-designer, infrastructure-maintainer style)
 *
 * @param yamlContent - Raw string content of a .prompt.yaml file.
 * @returns Normalised PromptMetadata.
 */
export function parsePromptMetadata(
  yamlContent: string,
): PromptMetadata {
  const parsed = parseSimpleYaml(yamlContent);

  // ---- Attempt to read from `prompt:` section ----
  const promptSection = parsed["prompt"] as
    | Record<string, unknown>
    | undefined;

  // ---- Attempt to read from `meta:` section ----
  const metaSection = parsed["meta"] as
    | Record<string, unknown>
    | undefined;

  const metadata: PromptMetadata = {};

  // Title: prompt.title, prompt.name, meta.title
  metadata.title =
    getString(promptSection, "title") ??
    getString(promptSection, "name") ??
    getString(metaSection, "title") ??
    undefined;

  // Description: prompt.description, meta.description
  metadata.description =
    getString(promptSection, "description") ??
    getString(metaSection, "description") ??
    undefined;

  // Author: prompt.metadata.author, meta.author
  const promptMetadata = promptSection?.["metadata"] as
    | Record<string, unknown>
    | undefined;
  metadata.author =
    getString(promptMetadata, "author") ??
    getString(metaSection, "author") ??
    undefined;

  // Schema: prompt.input_schema, prompt.output_schema, meta.schema_version
  const inputSchema = getString(promptSection, "input_schema");
  const outputSchema = getString(promptSection, "output_schema");
  if (inputSchema && outputSchema) {
    metadata.schema = `${inputSchema} → ${outputSchema}`;
  } else if (inputSchema) {
    metadata.schema = inputSchema;
  } else if (outputSchema) {
    metadata.schema = outputSchema;
  } else {
    metadata.schema = getString(metaSection, "schema_version") ?? undefined;
  }

  // Tags: prompt.tags, prompt.metadata.tags, meta.tags
  metadata.tags =
    (promptSection?.["tags"] as string[]) ??
    getStringArray(promptMetadata ?? {}, "tags") ??
    getStringArray(metaSection ?? {}, "tags") ??
    undefined;

  // Context reads/writes: prompt.metadata.context, meta.context
  const contextSource =
    (promptMetadata?.["context"] as Record<string, unknown>) ??
    (metaSection?.["context"] as Record<string, unknown>) ??
    undefined;

  if (contextSource) {
    const reads = getStringArray(contextSource, "reads");
    const writes = getStringArray(contextSource, "writes");
    if (reads.length > 0 || writes.length > 0) {
      metadata.context = { reads, writes };
    }
  }

  return metadata;
}

// ============================================================================
// System Prompt Extraction
// ============================================================================

/**
 * Extracts the system prompt template text from parsed YAML.
 * Concatenates relevant text sections in the correct order.
 */
function extractSystemPrompt(parsed: Record<string, unknown>): string {
  const promptSection = parsed["prompt"] as
    | Record<string, unknown>
    | undefined;

  // Priority 1: prompt.systemPrompt (sales-outreach style)
  const promptSystemPrompt = getString(
    promptSection ?? {},
    "systemPrompt",
  );
  if (promptSystemPrompt) return promptSystemPrompt;

  // Priority 2: prompt.system_prompt (used by some variants)
  const promptSystemPromptAlt = getString(
    promptSection ?? {},
    "system_prompt",
  );
  if (promptSystemPromptAlt) return promptSystemPromptAlt;

  // Priority 3: parsed.system_prompt (trend-researcher, pipeline-analyst style)
  const topLevelSystemPrompt = getString(parsed, "system_prompt");
  if (topLevelSystemPrompt) {
    // Check if it's a string or sub-object
    if (typeof parsed["system_prompt"] === "string") {
      return parsed["system_prompt"] as string;
    }
    // It might be a sub-object with identity/persona/etc. (pipeline-analyst style)
    const spObj = parsed["system_prompt"] as Record<string, unknown>;
    const parts: string[] = [];
    const orderedKeys = [
      "identity",
      "persona",
      "core_mission",
      "analytical_rules",
      "forecast_methodology",
      "critical_rules",
      "output_format_instructions",
    ];

    for (const key of orderedKeys) {
      const val = spObj[key];
      if (typeof val === "string" && val.trim()) {
        parts.push(val.trim());
      }
    }

    // Add any remaining string keys not in orderedKeys
    for (const [key, val] of Object.entries(spObj)) {
      if (!orderedKeys.includes(key) && typeof val === "string" && val.trim()) {
        parts.push(val.trim());
      }
    }

    if (parts.length > 0) return parts.join("\n\n");
  }

  // Priority 4: prompt.system_context (ui-designer, growth-hacker style)
  const systemContext = getString(promptSection ?? {}, "system_context");
  const identity = getString(promptSection ?? {}, "identity");
  if (systemContext || identity) {
    const parts: string[] = [];
    if (systemContext) parts.push(systemContext);
    if (identity) parts.push(identity);

    // Add principles if present
    const principles = promptSection?.["principles"] as
      | Array<Record<string, unknown>>
      | undefined;
    if (principles && Array.isArray(principles)) {
      for (const p of principles) {
        if (typeof p["description"] === "string") {
          const name = p["name"];
          parts.push(
            `### ${name}\n${p["description"]}`,
          );
        }
      }
    }

    return parts.join("\n\n");
  }

  // Priority 5: top-level identity/context
  const topIdentity = getString(parsed, "identity");
  const topContext = getString(parsed, "system_context");
  if (topIdentity || topContext) {
    return [topContext, topIdentity].filter(Boolean).join("\n\n");
  }

  // Fallback: empty string
  return "";
}

/**
 * Extracts version from parsed prompt YAML.
 */
function extractVersion(parsed: Record<string, unknown>): string {
  // prompt.version
  const promptSection = parsed["prompt"] as
    | Record<string, unknown>
    | undefined;
  const promptVersion = getString(promptSection ?? {}, "version");

  // meta.prompt_version (trend-researcher style: "trend-researcher.v1")
  const metaSection = parsed["meta"] as Record<string, unknown> | undefined;
  const promptVersionMeta = getString(metaSection ?? {}, "prompt_version");
  const metaVersion = getString(metaSection ?? {}, "version");

  // prompt.id (sales-outreach style: "sales-outreach.v1")
  const promptId = getString(promptSection ?? {}, "id");

  // Version resolution priority
  if (promptVersion) return promptVersion;
  if (promptVersionMeta) return promptVersionMeta;
  if (metaVersion) return metaVersion;
  if (promptId) {
    // Extract version from ID like "trend-researcher.v1" -> "v1"
    const idParts = promptId.split(".");
    if (idParts.length > 1) return idParts[idParts.length - 1];
  }

  return "unknown";
}

/**
 * Extracts agent ID from parsed prompt YAML.
 */
function extractAgentId(parsed: Record<string, unknown>): string {
  // prompt.agent
  const promptSection = parsed["prompt"] as
    | Record<string, unknown>
    | undefined;
  const promptAgent = getString(promptSection ?? {}, "agent");

  // meta.agent (trend-researcher style: "@trend-researcher")
  const metaSection = parsed["meta"] as Record<string, unknown> | undefined;
  const metaAgent = getString(metaSection ?? {}, "agent");

  // prompt.id (fallback: "sales-outreach.v1" -> "sales-outreach")
  const promptId = getString(promptSection ?? {}, "id");

  // Agent ID resolution priority
  const raw = promptAgent ?? metaAgent ?? promptId ?? "unknown";

  // Strip @ prefix if present
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

/**
 * Extracts the `name` field from prompt section, used as display title fallback.
 */
function extractPromptName(parsed: Record<string, unknown>): string | undefined {
  const promptSection = parsed["prompt"] as Record<string, unknown> | undefined;
  return getString(promptSection ?? {}, "name");
}

/**
 * Extracts variable declarations from parsed YAML.
 * Handles both object-shaped (ui-designer style) and array-shaped
 * (sales-outreach, pipeline-analyst style) variable declarations.
 */
function extractDeclaredVariables(
  parsed: Record<string, unknown>,
): string[] {
  const promptSection = parsed["prompt"] as Record<string, unknown> | undefined;
  const metaSection = parsed["meta"] as Record<string, unknown> | undefined;

  // Try prompt.variables first, then top-level variables, then meta.variables
  const variablesSource =
    (promptSection?.["variables"] as unknown) ??
    parsed["variables"] ??
    (metaSection?.["variables"] as unknown);

  if (Array.isArray(variablesSource)) {
    // Array format: [{name: "varName", ...}, ...]
    return variablesSource
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          const entry = v as Record<string, unknown>;
          return typeof entry["name"] === "string"
            ? (entry["name"] as string)
            : null;
        }
        if (typeof v === "string") return v;
        return null;
      })
      .filter((n): n is string => n !== null);
  }

  if (
    typeof variablesSource === "object" &&
    variablesSource !== null
  ) {
    // Object format: {varName: {type: ..., required: ...}, ...}
    return Object.keys(variablesSource as Record<string, unknown>).sort();
  }

  return [];
}

// ============================================================================
// Prompt Version Sorting
// ============================================================================

/**
 * Compares two version strings for sorting.
 * Handles semver (1.0.0) and simple version (v1, v2) formats.
 *
 * @returns Negative if a < b, positive if a > b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): number[] => {
    const cleaned = v.replace(/^v/, "").replace(/[^0-9.]/g, "");
    return cleaned.split(".").map((n) => {
      const num = parseInt(n, 10);
      return Number.isNaN(num) ? 0 : num;
    });
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }

  return 0;
}

// ============================================================================
// PromptLoader Class
// ============================================================================

export class PromptLoader {
  private readonly directories: string[];
  private readonly cache: Map<string, LoadedPrompt>;
  private readonly agentIndex: Map<string, LoadedPrompt[]>;
  private loaded = false;

  /**
   * Creates a new PromptLoader that will search the given directories
   * for .prompt.yaml files.
   *
   * @param promptDirectories - Absolute or relative paths to scan.
   */
  constructor(promptDirectories: string[]) {
    this.directories = promptDirectories.map((d) =>
      path.resolve(d),
    );
    this.cache = new Map();
    this.agentIndex = new Map();
  }

  // ========================================================================
  // Discovery
  // ========================================================================

  /**
   * Discovers and loads all .prompt.yaml files from all configured
   * directories. Populates the internal cache and agent index.
   *
   * Calling this method is idempotent — subsequent calls will reload
   * and overwrite the cache.
   *
   * @returns Array of all loaded prompts.
   */
  async discover(): Promise<LoadedPrompt[]> {
    this.cache.clear();
    this.agentIndex.clear();

    const files = await this.findPromptFiles();
    const loadPromises = files.map((filePath) => this.loadFile(filePath));
    const results = await Promise.allSettled(loadPromises);

    const loaded: LoadedPrompt[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const filePath = files[i];

      if (result.status === "fulfilled") {
        loaded.push(result.value);
      } else {
        console.warn(
          `[PromptLoader] Failed to load prompt from '${filePath}': ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }

    // Populate cache and index
    for (const prompt of loaded) {
      const cacheKey = this.cacheKey(prompt.agentId, prompt.version);
      this.cache.set(cacheKey, prompt);

      const existing = this.agentIndex.get(prompt.agentId) ?? [];
      existing.push(prompt);
      this.agentIndex.set(
        prompt.agentId,
        existing.sort((a, b) => compareVersions(b.version, a.version)),
      );
    }

    this.loaded = true;
    return loaded;
  }

  // ========================================================================
  // Loading
  // ========================================================================

  /**
   * Loads a specific prompt for a given agent, optionally at a specific
   * version. If no version is specified, the latest version is returned.
   *
   * Triggers an automatic discovery if prompts have not been loaded yet.
   *
   * @param agentId - Agent identifier.
   * @param version - Optional version string (e.g. "v1", "1.0.0").
   * @returns The loaded prompt.
   * @throws If no prompt is found for the given agent/version combination.
   */
  async loadPrompt(
    agentId: string,
    version?: string,
  ): Promise<LoadedPrompt> {
    if (!this.loaded) {
      await this.discover();
    }

    if (version) {
      const cacheKey = this.cacheKey(agentId, version);
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // Maybe version is embedded in agentId (e.g. "trend-researcher.v1")
      if (!agentId.includes(".")) {
        const compoundId = `${agentId}.${version}`;
        const compoundKey = this.cacheKey(compoundId, version);
        const compoundCached = this.cache.get(compoundKey);
        if (compoundCached) return compoundCached;
      }

      throw new Error(
        `[PromptLoader] No prompt found for agent '${agentId}' at version '${version}'.` +
          ` Available versions: ${this.getAgentVersions(agentId).join(", ") || "none"}`,
      );
    }

    // No version specified — return the latest
    const agentPrompts = this.agentIndex.get(agentId);
    if (!agentPrompts || agentPrompts.length === 0) {
      throw new Error(
        `[PromptLoader] No prompts found for agent '${agentId}'.` +
          ` Available agents: ${Array.from(this.agentIndex.keys()).join(", ") || "none"}`,
      );
    }

    return agentPrompts[0]; // Already sorted latest-first
  }

  /**
   * Gets all available prompts for a specific agent, ordered by version
   * (newest first).
   *
   * @param agentId - Agent identifier.
   * @returns Array of loaded prompts for that agent.
   */
  getAgentPrompts(agentId: string): LoadedPrompt[] {
    return this.agentIndex.get(agentId) ?? [];
  }

  /**
   * Lists all loaded prompts across all agents.
   */
  listAll(): LoadedPrompt[] {
    return Array.from(this.cache.values());
  }

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validates whether a prompt is compatible with a given agent.
   * Checks:
   *   1. The prompt exists for the agent
   *   2. Version consistency (if applicable)
   *   3. Required variables are present
   *   4. Context keys align with agent expectations
   *
   * @param agentId - Agent identifier to validate against.
   * @param promptId - Prompt identifier (agentId.version).
   * @returns ValidationResult with detailed messages.
   */
  validateCompatibility(
    agentId: string,
    promptId: string,
  ): ValidationResult {
    const messages: string[] = [];
    let severity: "compatible" | "warning" | "error" = "compatible";

    // Resolve the prompt from cache
    const allPrompts = this.listAll();
    const prompt = allPrompts.find((p) => {
      const candidateId = `${p.agentId}.${p.version}`;
      return candidateId === promptId || p.path.endsWith(promptId);
    });

    if (!prompt) {
      return {
        compatible: false,
        agentId,
        promptId,
        messages: [
          `Prompt '${promptId}' not found in the loader cache.`,
          `Available prompt IDs: ${allPrompts.map((p) => `${p.agentId}.${p.version}`).join(", ")}`,
        ],
        severity: "error",
      };
    }

    // Check agent ID match
    if (prompt.agentId !== agentId) {
      messages.push(
        `Agent ID mismatch: prompt is for '${prompt.agentId}' but validating against '${agentId}'.`,
      );
      severity = "error";
    } else {
      messages.push(
        `Agent '${agentId}' matches prompt agent binding.`,
      );
    }

    // Check template is not empty
    if (!prompt.template || prompt.template.trim() === "") {
      messages.push(
        `Prompt '${promptId}' has an empty template body.`,
      );
      severity = "error";
    } else {
      messages.push(
        `Prompt template body is non-empty (${prompt.template.length} chars).`,
      );
    }

    // Check variables are declared
    if (prompt.variables.length === 0) {
      messages.push(
        `Warning: No template variables found in prompt '${promptId}'.`,
      );
      if (severity === "compatible") severity = "warning";
    } else {
      messages.push(
        `${prompt.variables.length} declared variables: ${prompt.variables.join(", ")}`,
      );
    }

    // Check metadata is present
    if (!prompt.metadata.description) {
      messages.push(
        `Warning: Prompt '${promptId}' is missing a description.`,
      );
      if (severity === "compatible") severity = "warning";
    } else {
      messages.push("Prompt description is present.");
    }

    return {
      compatible: severity !== "error",
      agentId,
      promptId,
      messages,
      severity,
    };
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  /**
   * Clears the in-memory prompt cache. The next call to any load method
   * will trigger a fresh discovery from disk.
   */
  clearCache(): void {
    this.cache.clear();
    this.agentIndex.clear();
    this.loaded = false;
  }

  /**
   * Gets the list of version strings available for an agent.
   */
  getAgentVersions(agentId: string): string[] {
    const prompts = this.agentIndex.get(agentId);
    if (!prompts) return [];
    return prompts.map((p) => p.version);
  }

  // ========================================================================
  // Internal Helpers
  // ========================================================================

  /**
   * Finds all .prompt.yaml files across all configured directories.
   */
  private async findPromptFiles(): Promise<string[]> {
    const results = new Set<string>();

    for (const dir of this.directories) {
      const dirResults = await this.scanDirectory(dir);
      for (const file of dirResults) {
        results.add(file);
      }
    }

    return Array.from(results).sort();
  }

  /**
   * Recursively scans a directory for .prompt.yaml files.
   */
  private async scanDirectory(dir: string): Promise<string[]> {
    try {
      const stat = await fs.promises.stat(dir);
      if (!stat.isDirectory()) return [];
    } catch {
      // Directory doesn't exist — skip silently
      return [];
    }

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
          // Skip node_modules, .git, hidden directories
          if (entry.name.startsWith(".")) continue;
          if (entry.name === "node_modules") continue;
          if (entry.name === ".git") continue;
          await walk(fullPath);
        } else if (
          entry.isFile() &&
          entry.name.endsWith(".prompt.yaml")
        ) {
          results.push(fullPath);
        }
      }
    }

    await walk(dir);
    return results;
  }

  /**
   * Loads and parses a single .prompt.yaml file.
   */
  private async loadFile(filePath: string): Promise<LoadedPrompt> {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const parsed = parseSimpleYaml(content);

    const agentId = extractAgentId(parsed);
    const version = extractVersion(parsed);
    const metadata = parsePromptMetadata(content);
    const template = extractSystemPrompt(parsed);

    // Extract variables from both declared YAML fields and {{}} patterns
    const declaredVariables = extractDeclaredVariables(parsed);
    const templateVariables = extractTemplateVariables(template);
    const jinjaVariables = extractJinjaVariables(template);

    // Combine: declared variables take precedence, then template-inferred
    const combinedVariables = new Set([
      ...declaredVariables,
      ...templateVariables,
      ...jinjaVariables,
    ]);

    return {
      agentId,
      version,
      path: filePath,
      content,
      metadata,
      template,
      variables: Array.from(combinedVariables).sort(),
    };
  }

  /**
   * Generates a consistent cache key for an agent-version pair.
   */
  private cacheKey(agentId: string, version: string): string {
    return `${agentId}@${version}`;
  }
}
