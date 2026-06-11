// ============================================================================
// Context Propagation — How Context Flows Between Agents
// ============================================================================
// This module defines the context object that flows through the graph,
// the propagation rules for mapping context between agents, and the
// validation logic that ensures context integrity at every handoff.
// ============================================================================

import type { ContextMapping, ContextTransform, ConditionExpression } from "./agent-graph";

// ---------------------------------------------------------------------------
// AgentContext — The Runtime Execution Context
// ---------------------------------------------------------------------------

/**
 * The runtime context object that flows through the workflow graph.
 * Every agent node reads from and writes to this context.
 *
 * The context uses a dot-notation path system for nested access:
 *   context.get("lead.company.name")
 *   context.set("analysis.risk_score", 0.85)
 */
export class AgentContext {
  private data: Record<string, unknown>;
  private history: ContextHistoryEntry[];
  private maxHistorySize: number;

  constructor(initialData?: Record<string, unknown>, maxHistorySize = 1000) {
    this.data = initialData ? deepClone(initialData) : {};
    this.history = [];
    this.maxHistorySize = maxHistorySize;
  }

  // ---- Read Operations ----

  /**
   * Get a value from context by dot-notation path.
   * Returns undefined if path does not exist.
   */
  get<T = unknown>(path: string): T | undefined {
    return getByPath(this.data, path) as T | undefined;
  }

  /**
   * Get a value, throwing if it doesn't exist.
   */
  require<T = unknown>(path: string): T {
    const value = this.get<T>(path);
    if (value === undefined) {
      throw new ContextError(
        `Required context key "${path}" is missing`,
        "CONTEXT_KEY_MISSING",
        path
      );
    }
    return value;
  }

  /**
   * Get a value with type coercion.
   */
  getAs<T>(path: string, validator?: (value: unknown) => value is T): T | undefined {
    const value = this.get(path);
    if (value === undefined) return undefined;
    if (validator && !validator(value)) {
      throw new ContextError(
        `Context key "${path}" failed type validation`,
        "CONTEXT_TYPE_ERROR",
        path
      );
    }
    return value as T;
  }

  /**
   * Get a value or return a default.
   */
  getOrDefault<T>(path: string, defaultValue: T): T {
    const value = this.get<T>(path);
    return value !== undefined ? value : defaultValue;
  }

  // ---- Write Operations ----

  /**
   * Set a value in context by dot-notation path.
   * Creates intermediate objects as needed.
   */
  set(path: string, value: unknown): void {
    this.recordHistory("set", path, this.get(path));
    setByPath(this.data, path, deepClone(value));
  }

  /**
   * Delete a key from context.
   */
  delete(path: string): void {
    this.recordHistory("delete", path, this.get(path));
    deleteByPath(this.data, path);
  }

  /**
   * Merge an object into context at a given path.
   */
  merge(path: string, value: Record<string, unknown>): void {
    const existing = this.get<Record<string, unknown>>(path) || {};
    this.set(path, { ...existing, ...value });
  }

  /**
   * Push a value to an array at the given path.
   * Creates the array if it doesn't exist.
   */
  push(path: string, value: unknown): void {
    const arr = this.get<unknown[]>(path) || [];
    arr.push(deepClone(value));
    this.set(path, arr);
  }

  // ---- Bulk Operations ----

  /**
   * Apply multiple mappings from a source context to this context.
   * Used when ingesting output from an agent.
   */
  applyMappings(mappings: ContextMapping[], sourceContext: Record<string, unknown>): ContextApplyResult {
    const applied: string[] = [];
    const errors: ContextApplyError[] = [];

    for (const mapping of mappings) {
      try {
        const sourceValue = getByPath(sourceContext, mapping.source);

        if (sourceValue === undefined) {
          if (mapping.required) {
            errors.push({
              path: mapping.source,
              target: mapping.target,
              message: `Required source "${mapping.source}" is missing from agent output`,
              code: "REQUIRED_SOURCE_MISSING",
            });
            continue;
          }
          if (mapping.default !== undefined) {
            this.set(mapping.target, deepClone(mapping.default));
            applied.push(mapping.target);
            continue;
          }
          // Skip non-required missing mappings with no default
          continue;
        }

        let value = sourceValue;

        // Apply transforms
        if (mapping.transform) {
          value = applyTransform(value, mapping.transform);
        }

        this.set(mapping.target, value);
        applied.push(mapping.target);
      } catch (err) {
        errors.push({
          path: mapping.source,
          target: mapping.target,
          message: err instanceof Error ? err.message : String(err),
          code: "MAPPING_ERROR",
        });
      }
    }

    return { applied, errors };
  }

  /**
   * Extract a snapshot of context for passing to an agent.
   * Only includes paths specified in the input mappings.
   */
  extractForAgent(mappings: ContextMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const errors: ContextApplyError[] = [];

    for (const mapping of mappings) {
      const value = this.get(mapping.source);
      if (value === undefined) {
        if (mapping.required) {
          errors.push({
            path: mapping.source,
            target: mapping.target,
            message: `Required input "${mapping.source}" is missing from context`,
            code: "INPUT_MISSING",
          });
          continue;
        }
        if (mapping.default !== undefined) {
          setByPath(result, mapping.target, deepClone(mapping.default));
          continue;
        }
        continue;
      }

      let transformedValue = value;
      if (mapping.transform) {
        transformedValue = applyTransform(value, mapping.transform);
      }

      setByPath(result, mapping.target, deepClone(transformedValue));
    }

    if (errors.length > 0) {
      throw new ContextExtractionError(errors);
    }

    return result;
  }

  /**
   * Get the entire context as a plain object.
   */
  toJSON(): Record<string, unknown> {
    return deepClone(this.data);
  }

  /**
   * Get a subset of context by path prefixes.
   */
  subset(prefixes: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const prefix of prefixes) {
      const value = this.get(prefix);
      if (value !== undefined) {
        setByPath(result, prefix, deepClone(value));
      }
    }
    return result;
  }

  // ---- Query Operations ----

  /**
   * Check if a path exists in context.
   */
  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  /**
   * Search context for keys matching a pattern.
   */
  findKeys(pattern: string): string[] {
    const regex = new RegExp(pattern);
    return this.collectKeys(this.data, "").filter(k => regex.test(k));
  }

  /**
   * Evaluate a condition expression against the current context.
   */
  evaluateCondition(condition: ConditionExpression): boolean {
    const { path, operator, value } = condition;
    const contextValue = this.get(path);

    switch (operator) {
      case "eq": return contextValue === value;
      case "neq": return contextValue !== value;
      case "gt": return (contextValue as number) > (value as number);
      case "gte": return (contextValue as number) >= (value as number);
      case "lt": return (contextValue as number) < (value as number);
      case "lte": return (contextValue as number) <= (value as number);
      case "in": {
        if (!Array.isArray(value)) return false;
        return value.includes(contextValue);
      }
      case "not_in": {
        if (!Array.isArray(value)) return true;
        return !value.includes(contextValue);
      }
      case "contains": {
        if (typeof contextValue !== "string") return false;
        return contextValue.includes(String(value));
      }
      case "starts_with": {
        if (typeof contextValue !== "string") return false;
        return contextValue.startsWith(String(value));
      }
      case "ends_with": {
        if (typeof contextValue !== "string") return false;
        return contextValue.endsWith(String(value));
      }
      case "matches": {
        if (typeof contextValue !== "string") return false;
        return new RegExp(String(value)).test(contextValue);
      }
      case "exists": return contextValue !== undefined;
      case "not_exists": return contextValue === undefined;
      case "is_empty":
        return contextValue === undefined ||
          contextValue === null ||
          contextValue === "" ||
          (Array.isArray(contextValue) && contextValue.length === 0) ||
          (typeof contextValue === "object" && Object.keys(contextValue).length === 0);
      case "is_not_empty": return !this.evaluateCondition({ path, operator: "is_empty", value: null });
      case "truthy": return !!contextValue;
      case "falsy": return !contextValue;
      default: {
        const _exhaustive: never = operator;
        throw new ContextError(
          `Unknown condition operator: "${operator}"`,
          "UNKNOWN_OPERATOR",
          path
        );
      }
    }
  }

  // ---- History & Observability ----

  /**
   * Get the history of all context changes.
   */
  getHistory(): ContextHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get changes since a given index.
   */
  getChangesSince(historyIndex: number): ContextHistoryEntry[] {
    return this.history.slice(historyIndex);
  }

  /**
   * Current history size.
   */
  get historySize(): number {
    return this.history.length;
  }

  private recordHistory(action: string, path: string, previousValue: unknown): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      action,
      path,
      previousValue: previousValue !== undefined ? deepClone(previousValue) : undefined,
    });

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  private collectKeys(obj: Record<string, unknown>, prefix: string): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        keys.push(fullPath);
        keys.push(...this.collectKeys(value as Record<string, unknown>, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  }

  // ---- Serialization ----

  /**
   * Serialize context to a JSON-safe format.
   */
  serialize(): string {
    return JSON.stringify({
      data: this.data,
      history: this.history,
    });
  }

  /**
   * Deserialize context from a serialized string.
   */
  static deserialize(json: string): AgentContext {
    const parsed = JSON.parse(json);
    const ctx = new AgentContext(parsed.data);
    ctx.history = parsed.history || [];
    return ctx;
  }
}

// ---------------------------------------------------------------------------
// Context History
// ---------------------------------------------------------------------------

/**
 * An entry in the context modification history.
 */
export interface ContextHistoryEntry {
  timestamp: string;
  action: "set" | "delete" | "merge" | "push" | "apply_mappings" | "clear";
  path: string;
  previousValue?: unknown;
}

// ---------------------------------------------------------------------------
// Context Transform Application
// ---------------------------------------------------------------------------

/**
 * Apply a context transformation to a value.
 */
export function applyTransform(value: unknown, transform: ContextTransform): unknown {
  switch (transform.type) {
    case "rename":
      // Rename is handled at the mapping level, not at value level
      return value;

    case "cast":
      return castValue(value, transform.params?.toType as string);

    case "template": {
      const template = transform.params?.template as string;
      if (typeof template !== "string") return value;
      return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        const val = getByPath(value as Record<string, unknown>, key.trim());
        return val !== undefined ? String(val) : `{{${key}}}`;
      });
    }

    case "pick": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
      const fields = transform.params?.fields as string[];
      if (!Array.isArray(fields)) return value;
      const result: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in (value as Record<string, unknown>)) {
          result[field] = (value as Record<string, unknown>)[field];
        }
      }
      return result;
    }

    case "omit": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
      const omitFields = transform.params?.fields as string[];
      if (!Array.isArray(omitFields)) return value;
      const result = { ...(value as Record<string, unknown>) };
      for (const field of omitFields) {
        delete result[field];
      }
      return result;
    }

    case "default":
      return value ?? transform.params?.value;

    case "coalesce": {
      const paths = transform.params?.paths as string[];
      if (!Array.isArray(paths)) return value;
      const obj = value as Record<string, unknown>;
      for (const p of paths) {
        const v = getByPath(obj, p);
        if (v !== undefined) return v;
      }
      return undefined;
    }

    case "aggregate": {
      if (!Array.isArray(value)) return value;
      const aggregator = transform.params?.aggregator as string;
      switch (aggregator) {
        case "sum": return value.reduce((s: number, v: unknown) => s + Number(v), 0);
        case "avg": {
          const sum = value.reduce((s: number, v: unknown) => s + Number(v), 0);
          return value.length > 0 ? sum / value.length : 0;
        }
        case "count": return value.length;
        case "join": return value.join(transform.params?.separator as string ?? ", ");
        default: return value;
      }
    }

    case "split": {
      if (typeof value !== "string") return value;
      const separator = transform.params?.separator as string;
      return value.split(separator || ",").map(s => s.trim());
    }

    case "format_date": {
      if (typeof value !== "string" && !(value instanceof Date)) return value;
      // Basic date formatting — extension point for format libraries
      const date = new Date(value as string);
      if (isNaN(date.getTime())) return value;
      const format = transform.params?.format as string;
      if (!format) return date.toISOString();
      // Simple format tokens
      return format
        .replace("YYYY", date.getFullYear().toString())
        .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
        .replace("DD", String(date.getDate()).padStart(2, "0"))
        .replace("HH", String(date.getHours()).padStart(2, "0"))
        .replace("mm", String(date.getMinutes()).padStart(2, "0"))
        .replace("ss", String(date.getSeconds()).padStart(2, "0"));
    }

    case "custom": {
      const handler = transform.params?.handler as string;
      if (!handler) return value;
      // Custom handlers are resolved by the runtime engine
      // This is an extension point
      throw new ContextError(
        `Custom transform handler "${handler}" must be registered in the engine`,
        "CUSTOM_TRANSFORM_NOT_REGISTERED",
        ""
      );
    }

    default: {
      const _exhaustive: never = transform.type;
      throw new ContextError(
        `Unknown transform type: "${transform.type}"`,
        "UNKNOWN_TRANSFORM",
        ""
      );
    }
  }
}

function castValue(value: unknown, toType: string): unknown {
  switch (toType) {
    case "string": return String(value);
    case "number": {
      const n = Number(value);
      return isNaN(n) ? value : n;
    }
    case "boolean": {
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
      }
      return Boolean(value);
    }
    case "date": return new Date(value as string).toISOString();
    case "json":
      if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    default: return value;
  }
}

// ---------------------------------------------------------------------------
// Dot-Notation Path Utilities
// ---------------------------------------------------------------------------

/**
 * Get a nested value using dot notation.
 * Handles array indices: "items.0.name"
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (isNaN(index)) {
        // Array with named property (unusual but possible)
        current = (current as unknown as Record<string, unknown>)[part];
      } else {
        current = current[index];
      }
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a nested value using dot notation.
 * Creates intermediate objects/arrays as needed.
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const nextIsArrayIndex = /^\d+$/.test(nextPart);

    if (!(part in current)) {
      current[part] = nextIsArrayIndex ? [] : {};
    }

    const next = current[part];
    if (nextIsArrayIndex) {
      if (!Array.isArray(next)) {
        current[part] = [];
      }
    } else {
      if (typeof next !== "object" || next === null || Array.isArray(next)) {
        current[part] = {};
      }
    }

    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart) && Array.isArray(current)) {
    current[parseInt(lastPart, 10)] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Delete a nested value using dot notation.
 */
export function deleteByPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) return;
    current = current[parts[i]] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(lastPart, 10);
    if (!isNaN(index) && index >= 0 && index < current.length) {
      current.splice(index, 1);
    }
  } else {
    delete current[lastPart];
  }
}

// ---------------------------------------------------------------------------
// Context Validation
// ---------------------------------------------------------------------------

/**
 * Validate that context conforms to a contract.
 */
export function validateContext(
  context: AgentContext,
  contract: ContextContract
): ContextValidationResult {
  const errors: ContextValidationIssue[] = [];
  const warnings: ContextValidationIssue[] = [];

  // Required fields
  for (const [path, expectedType] of Object.entries(contract.required)) {
    const value = context.get(path);
    if (value === undefined) {
      errors.push({
        path,
        expectedType,
        actualType: "undefined",
        message: `Required field "${path}" is missing`,
        severity: "error",
      });
      continue;
    }
    const actualType = typeof value;
    if (expectedType !== "any" && actualType !== expectedType) {
      warnings.push({
        path,
        expectedType,
        actualType,
        message: `Field "${path}" expected type "${expectedType}" but got "${actualType}"`,
        severity: "warning",
      });
    }
  }

  // Optional fields
  if (contract.optional) {
    for (const [path, expectedType] of Object.entries(contract.optional)) {
      const value = context.get(path);
      if (value === undefined) continue;
      const actualType = typeof value;
      if (expectedType !== "any" && actualType !== expectedType) {
        warnings.push({
          path,
          expectedType,
          actualType,
          message: `Optional field "${path}" expected type "${expectedType}" but got "${actualType}"`,
          severity: "warning",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ContextContract {
  required: Record<string, string>;
  optional?: Record<string, string>;
  additionalFields?: boolean;
}

export interface ContextValidationResult {
  valid: boolean;
  errors: ContextValidationIssue[];
  warnings: ContextValidationIssue[];
}

export interface ContextValidationIssue {
  path: string;
  expectedType: string;
  actualType: string;
  message: string;
  severity: "error" | "warning";
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class ContextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly path: string
  ) {
    super(message);
    this.name = "ContextError";
  }
}

export class ContextExtractionError extends Error {
  constructor(
    public readonly errors: ContextApplyError[]
  ) {
    super(
      `Context extraction failed with ${errors.length} error(s): ` +
      errors.map(e => `[${e.code}] ${e.message}`).join("; ")
    );
    this.name = "ContextExtractionError";
  }
}

export interface ContextApplyError {
  path: string;
  target: string;
  message: string;
  code: string;
}

export interface ContextApplyResult {
  applied: string[];
  errors: ContextApplyError[];
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function deepClone<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as T;
  if (Array.isArray(value)) return value.map(deepClone) as unknown as T;
  const cloned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    cloned[key] = deepClone(val);
  }
  return cloned as T;
}
