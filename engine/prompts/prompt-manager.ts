// ============================================================================
// Nexus Agent Platform — Prompt Manager
// ============================================================================
// Manages externalized, versioned prompt templates (YAML) with caching,
// variable interpolation, and template validation.
// ============================================================================

import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "js-yaml";

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  /** Unique template identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Semantic version of this template. */
  version: string;
  /** Template description. */
  description: string;
  /** The raw template content with {{variable}} placeholders. */
  template: string;
  /** Expected variables that must be provided during interpolation. */
  variables: string[];
  /** Template metadata. */
  meta?: {
    author?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

// ============================================================================
// Prompt Manager
// ============================================================================

export class PromptManager {
  private readonly cache = new Map<string, PromptTemplate>();
  private readonly templatesDir: string;
  private cacheEnabled = true;

  constructor(templatesDir: string = "engine/prompts/templates") {
    this.templatesDir = templatesDir;
  }

  // ========================================================================
  // Template Loading
  // ========================================================================

  /**
   * Load a single template from a YAML file.
   */
  async loadTemplate(templatePath: string): Promise<PromptTemplate> {
    const resolvedPath = path.resolve(this.templatesDir, templatePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    const parsed = yaml.load(content) as Record<string, unknown>;

    const template: PromptTemplate = {
      id: String(parsed.id ?? path.basename(templatePath, ".yaml")),
      name: String(parsed.name ?? "Unnamed Template"),
      version: String(parsed.version ?? "1.0.0"),
      description: String(parsed.description ?? ""),
      template: String(parsed.template ?? ""),
      variables: Array.isArray(parsed.variables) ? parsed.variables.map(String) : [],
      meta: parsed.meta as PromptTemplate["meta"],
    };

    if (this.cacheEnabled) {
      this.cache.set(template.id, template);
    }

    return template;
  }

  /**
   * Load all templates from the templates directory.
   */
  async loadAllTemplates(): Promise<PromptTemplate[]> {
    const files = await fs.readdir(this.templatesDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    const templates: PromptTemplate[] = [];

    for (const file of yamlFiles) {
      try {
        const template = await this.loadTemplate(file);
        templates.push(template);
      } catch (error) {
        console.warn(`Failed to load template '${file}':`, error);
      }
    }

    return templates;
  }

  // ========================================================================
  // Template Retrieval
  // ========================================================================

  /**
   * Get a template by ID (from cache or filesystem).
   */
  async getTemplate(templateId: string): Promise<PromptTemplate | undefined> {
    // Check cache first
    if (this.cacheEnabled && this.cache.has(templateId)) {
      return this.cache.get(templateId);
    }

    // Try to load from filesystem
    const filePath = `${templateId}.yaml`;
    try {
      return await this.loadTemplate(filePath);
    } catch {
      return undefined;
    }
  }

  /**
   * List all cached template IDs.
   */
  listTemplates(): string[] {
    return Array.from(this.cache.keys());
  }

  // ========================================================================
  // Variable Interpolation
  // ========================================================================

  /**
   * Interpolate variables into a template string.
   * Variables use {{variableName}} syntax.
   */
  interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in variables) {
        return String(variables[varName]);
      }
      return match; // Leave unmatched variables as-is
    });
  }

  /**
   * Resolve a full prompt by loading a template and interpolating variables.
   */
  async resolve(
    templateId: string,
    variables: Record<string, unknown>,
  ): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Prompt template '${templateId}' not found`);
    }

    // Validate required variables
    const missing = template.variables.filter(
      (v) => !(v in variables) || variables[v] === undefined,
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing required variables for template '${templateId}': ${missing.join(", ")}`,
      );
    }

    return this.interpolate(template.template, variables);
  }

  // ========================================================================
  // Cache Control
  // ========================================================================

  /** Enable template caching. */
  enableCache(): void {
    this.cacheEnabled = true;
  }

  /** Disable template caching (useful in development). */
  disableCache(): void {
    this.cacheEnabled = false;
  }

  /** Clear the template cache. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Reload a specific template in the cache. */
  async reloadTemplate(templateId: string): Promise<PromptTemplate | undefined> {
    this.cache.delete(templateId);
    try {
      return await this.getTemplate(templateId);
    } catch {
      return undefined;
    }
  }
}
