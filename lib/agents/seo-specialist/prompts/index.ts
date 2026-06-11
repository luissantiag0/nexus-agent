// ============================================================================
// Nexus Agent — SEO Specialist Prompt Registry
// ============================================================================
// Maps prompt version IDs to their YAML file paths. The adapter loads the
// prompt at runtime by reading the version from its metadata.
// ============================================================================

/**
 * Registered prompt versions for the @seo-specialist agent.
 * Key is the prompt version string; value is the path relative to this file.
 */
export const PROMPT_REGISTRY: Record<string, string> = {
  "seo-specialist.v1.prompt.yaml": "./seo-specialist.v1.prompt.yaml",
};

/**
 * Return the file path for a given prompt version.
 */
export function resolvePromptPath(versionId: string): string {
  const path = PROMPT_REGISTRY[versionId];
  if (!path) {
    throw new Error(`Unknown prompt version: ${versionId}`);
  }
  return path;
}
