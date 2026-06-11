// ============================================================================
// Nexus Agent Platform — UI Designer Adapter
// ============================================================================
// This adapter wraps the UI Designer agent with typed I/O ports,
// a system prompt, validation rules, and context key contracts.
// It produces design systems, component libraries, accessibility audits,
// design tokens, and responsive breakpoint definitions.
// ============================================================================

import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  AgentMetadata,
  PortSchema,
  ValidationRule,
  ValidationResult,
  ContextKey,
  AgentContext,
} from "@/lib/agents/registry/types";
import type {
  UiDesignerInput,
  UiDesignerOutput,
  ComponentSpec,
  AccessibilityAudit,
  ResponsiveBreakpoint,
} from "@/engine/types/adapter-interfaces";

// ============================================================================
// Metadata
// ============================================================================

const METADATA: AgentMetadata = {
  id: "ui-designer" as any,
  name: "UI Designer",
  description:
    "Expert user interface designer who creates beautiful, consistent, and accessible user interfaces. Specializes in visual design systems, component libraries, and pixel-perfect interface creation that enhances user experience while reflecting brand identity.",
  version: "1.0.0",
  status: "active",
  tags: ["design", "ui", "interface", "accessibility", "design-system"],
  capabilities: [
    "design-system-creation",
    "component-library-development",
    "design-token-generation",
    "accessibility-auditing",
    "responsive-design",
    "interactive-prototyping",
    "visual-hierarchy-design",
    "brand-consistency",
  ],
  color: "#ec4899",
  icon: "🖌️",
  model: "gpt-4",
};

// ============================================================================
// Port Schemas
// ============================================================================

const INPUT_SCHEMA: PortSchema = {
  $id: "ui-designer-input.v1",
  version: "1.0.0",
  description: "Design brief, brand guidelines, platform target, component needs, accessibility requirements, and user personas for the UI Designer agent.",
  type: "object",
  properties: {
    designBrief: {
      type: "string",
      description: "High-level creative brief describing the design scope, objectives, and constraints",
    },
    brandGuidelines: {
      type: "string",
      description: "Brand identity guidelines including color palettes, typography, logos, and tone of voice",
    },
    platform: {
      type: "string",
      enum: ["web", "mobile", "desktop"],
      description: "Target platform for the design",
    },
    componentNeeds: {
      type: "array",
      items: { type: "string" },
      description: "List of components the design system must cover (e.g. buttons, forms, cards, navigation)",
    },
    accessibilityTarget: {
      type: "string",
      enum: ["A", "AA", "AAA"],
      description: "WCAG accessibility target level",
    },
    userPersonas: {
      type: "array",
      items: { type: "string" },
      description: "User persona descriptions for human-centred design decisions",
    },
  },
  required: ["designBrief", "brandGuidelines", "accessibilityTarget"],
  example: {
    designBrief: "Build a comprehensive design system for a SaaS analytics dashboard with real-time data visualisation",
    brandGuidelines: "Primary: #2563eb (blue), Secondary: #7c3aed (purple), Font: Inter, Voice: Professional and clear",
    platform: "web",
    componentNeeds: ["Button", "Form Input", "Card", "Navigation Bar", "Data Table", "Chart Container", "Modal"],
    accessibilityTarget: "AA",
    userPersonas: ["Data analyst who needs quick insights", "Admin managing team permissions", "Executive reviewing high-level KPIs"],
  },
};

const OUTPUT_SCHEMA: PortSchema = {
  $id: "ui-designer-output.v1",
  version: "1.0.0",
  description: "Complete design system deliverables including component library, accessibility audit, design tokens, and responsive breakpoints from the UI Designer agent.",
  type: "object",
  properties: {
    designSystem: {
      type: "string",
      description: "Comprehensive design system documentation covering foundations, components, and usage guidelines",
    },
    componentLibrary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          states: { type: "array", items: { type: "string" } },
          variants: { type: "array", items: { type: "string" } },
          tokens: { type: "object" },
        },
      },
      description: "Typed component library with states, variants, and design token mappings",
    },
    accessibilityAudit: {
      type: "object",
      properties: {
        targetLevel: { type: "string", enum: ["A", "AA", "AAA"] },
        score: { type: "number" },
        issues: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      },
      description: "WCAG accessibility audit with compliance score, issues, and remediation recommendations",
    },
    designTokens: {
      type: "object",
      description: "Design token dictionary including colors, typography, spacing, shadows, and animation tokens",
    },
    responsiveBreakpoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          minWidth: { type: "number" },
          columns: { type: "number" },
        },
      },
      description: "Responsive breakpoint definitions for mobile, tablet, desktop, and large desktop views",
    },
  },
  required: [
    "designSystem",
    "componentLibrary",
    "accessibilityAudit",
    "designTokens",
    "responsiveBreakpoints",
  ],
};

// ============================================================================
// Context Keys
// ============================================================================

const CONTEXT_READS: ContextKey[] = [
  "productRoadmap",
  "userFeedback",
  "brandGuidelines",
];

const CONTEXT_WRITES: ContextKey[] = [
  "designSystem",
  "componentLibrary",
  "accessibilityAudit",
  "designTokens",
];

// ============================================================================
// Validation Rules
// ============================================================================

const INPUT_VALIDATORS: Array<{
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning";
  validate(input: UiDesignerInput): ValidationResult;
}> = [
  {
    id: "design-brief-not-empty",
    name: "Design brief is present",
    description: "Ensures the design brief is not empty",
    severity: "error",
    validate: (input: UiDesignerInput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      if (!input.designBrief || input.designBrief.trim().length === 0) {
        errors.push({
          path: "designBrief",
          message: "Design brief is required and must not be empty",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "brand-guidelines-present",
    name: "Brand guidelines are present",
    description: "Ensures brand guidelines have been provided",
    severity: "error",
    validate: (input: UiDesignerInput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      if (!input.brandGuidelines || input.brandGuidelines.trim().length === 0) {
        errors.push({
          path: "brandGuidelines",
          message: "Brand guidelines are required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "accessibility-target-valid",
    name: "Accessibility target is valid",
    description: "Ensures the accessibility target is one of A, AA, or AAA",
    severity: "error",
    validate: (input: UiDesignerInput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      const validTargets = ["A", "AA", "AAA"];
      if (!input.accessibilityTarget || !validTargets.includes(input.accessibilityTarget)) {
        errors.push({
          path: "accessibilityTarget",
          message: `Accessibility target must be one of: ${validTargets.join(", ")}`,
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "platform-valid",
    name: "Platform is valid",
    description: "Ensures the platform is one of web, mobile, or desktop",
    severity: "error",
    validate: (input: UiDesignerInput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      const validPlatforms = ["web", "mobile", "desktop"];
      if (input.platform && !validPlatforms.includes(input.platform)) {
        errors.push({
          path: "platform",
          message: `Platform must be one of: ${validPlatforms.join(", ")}`,
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "component-needs-warning",
    name: "Component needs are specified",
    description: "Warns if no component needs are listed",
    severity: "warning",
    validate: (input: UiDesignerInput): ValidationResult => {
      const warnings: string[] = [];
      if (!input.componentNeeds || input.componentNeeds.length === 0) {
        warnings.push("No component needs specified — a default component library will be generated");
      }
      return { valid: true, errors: [], warnings };
    },
  },
  {
    id: "user-personas-warning",
    name: "User personas are specified",
    description: "Warns if no user personas are provided",
    severity: "warning",
    validate: (input: UiDesignerInput): ValidationResult => {
      const warnings: string[] = [];
      if (!input.userPersonas || input.userPersonas.length === 0) {
        warnings.push("No user personas provided — design decisions will use generic heuristics");
      }
      return { valid: true, errors: [], warnings };
    },
  },
];

const OUTPUT_VALIDATORS: ValidationRule<UiDesignerOutput>[] = [
  {
    id: "design-system-not-empty",
    name: "Design system is present",
    description: "Ensures the design system documentation is not empty",
    severity: "error",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      if (!output.designSystem || output.designSystem.trim().length === 0) {
        errors.push({
          path: "designSystem",
          message: "Design system documentation is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "component-library-not-empty",
    name: "Component library has entries",
    description: "Ensures at least one component is defined in the library",
    severity: "error",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      if (!output.componentLibrary || output.componentLibrary.length === 0) {
        errors.push({
          path: "componentLibrary",
          message: "Component library must contain at least one component definition",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "accessibility-audit-present",
    name: "Accessibility audit is included",
    description: "Ensures the accessibility audit report is present",
    severity: "error",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const errors: ValidationResult["errors"] = [];
      if (!output.accessibilityAudit) {
        errors.push({
          path: "accessibilityAudit",
          message: "Accessibility audit is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "accessibility-score-warning",
    name: "Accessibility score meets target",
    description: "Warns if the accessibility score is below the WCAG threshold (78 for AA, 90 for AAA)",
    severity: "warning",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const warnings: string[] = [];
      if (output.accessibilityAudit) {
        const { targetLevel, score } = output.accessibilityAudit;
        const threshold = targetLevel === "AAA" ? 90 : targetLevel === "AA" ? 78 : 60;
        if (score < threshold) {
          warnings.push(
            `Accessibility score (${score}) is below the recommended threshold (${threshold}) for WCAG ${targetLevel}`,
          );
        }
      }
      return { valid: true, errors: [], warnings };
    },
  },
  {
    id: "design-tokens-present",
    name: "Design tokens are defined",
    description: "Ensures design tokens dictionary is not empty",
    severity: "warning",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const warnings: string[] = [];
      if (!output.designTokens || Object.keys(output.designTokens).length === 0) {
        warnings.push("Design tokens dictionary is empty — components may lack consistent styling");
      }
      return { valid: true, errors: [], warnings };
    },
  },
  {
    id: "responsive-breakpoints-present",
    name: "Responsive breakpoints are defined",
    description: "Warns if no responsive breakpoints are configured",
    severity: "warning",
    validate: (output: UiDesignerOutput): ValidationResult => {
      const warnings: string[] = [];
      if (!output.responsiveBreakpoints || output.responsiveBreakpoints.length === 0) {
        warnings.push("No responsive breakpoints defined — design will not be optimised for different screen sizes");
      }
      return { valid: true, errors: [], warnings };
    },
  },
];

// ============================================================================
// Prompt Template Path
// ============================================================================

const PROMPT_TEMPLATE = "engine/prompts/templates/ui-designer-v1.yaml";

// ============================================================================
// UI Designer Adapter Implementation
// ============================================================================

export class UiDesignerAdapter
  implements AgentAdapter<UiDesignerInput, UiDesignerOutput>
{
  readonly metadata: AgentMetadata = METADATA;
  readonly inputSchema: PortSchema = INPUT_SCHEMA;
  readonly outputSchema: PortSchema = OUTPUT_SCHEMA;
  readonly reads: ContextKey[] = CONTEXT_READS;
  readonly writes: ContextKey[] = CONTEXT_WRITES;
  readonly validators: ValidationRule<UiDesignerOutput>[] = OUTPUT_VALIDATORS;
  readonly promptTemplate: string = PROMPT_TEMPLATE;

  /**
   * Validate input against the UI Designer schema and business rules.
   * Checks:
   *  - designBrief is non-empty
   *  - brandGuidelines are present
   *  - accessibilityTarget is a valid WCAG level
   *  - platform, componentNeeds, and userPersonas have valid shapes
   */
  validate(input: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult["errors"] = [];
    const warnings: string[] = [];

    // Coerce into the typed input for validators
    const typed = input as unknown as UiDesignerInput;

    for (const validator of INPUT_VALIDATORS) {
      try {
        const result = validator.validate(typed);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (err) {
        errors.push({
          path: "_validator",
          message: `Validator '${validator.name}' threw: ${err instanceof Error ? err.message : String(err)}`,
          severity: "error",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the system prompt by interpolating runtime variables
   * into the YAML prompt template.
   */
  async resolvePrompt(variables: Record<string, unknown>): Promise<string> {
    // In production, this loads the template from the prompt manager,
    // interpolates variables, and returns the resolved string.
    const basePrompt = `
You are UI Designer, an expert user interface designer who creates beautiful, consistent, and accessible user interfaces. You specialize in visual design systems, component libraries, and pixel-perfect interface creation.

## Design Brief
${variables.designBrief ?? "(not provided)"}

## Brand Guidelines
${variables.brandGuidelines ?? "(not provided)"}

## Target Platform
${variables.platform ?? "web"}

## Component Needs
${Array.isArray(variables.componentNeeds) ? variables.componentNeeds.join("\n") : "(not provided)"}

## Accessibility Target
WCAG Level ${variables.accessibilityTarget ?? "AA"}

## User Personas
${Array.isArray(variables.userPersonas) ? variables.userPersonas.join("\n") : "(not provided)"}

## Your Task
Design a complete UI design system including:
1. **Design System** — Comprehensive documentation covering foundations, visual hierarchy, and usage guidelines
2. **Component Library** — Typed components with states (default, hover, active, disabled, focus), variants (primary, secondary, outline, ghost), and design token mappings
3. **Accessibility Audit** — WCAG compliance score, issues found, and remediation recommendations
4. **Design Tokens** — Complete token dictionary (colours, typography, spacing, shadows, animations)
5. **Responsive Breakpoints** — Mobile, tablet, desktop, and large desktop breakpoints with grid configurations

Respond with a structured JSON output conforming to the UiDesignerOutput schema.
`;

    return basePrompt;
  }

  // ========================================================================
  // Lifecycle Hooks
  // ========================================================================

  async onBefore(
    input: AgentInput<UiDesignerInput>,
    context: AgentContext,
  ): Promise<void> {
    // Validate minimum required context
    if (!input.payload.designBrief) {
      throw new Error("UiDesigner requires designBrief in input payload");
    }
    if (!input.payload.brandGuidelines) {
      throw new Error("UiDesigner requires brandGuidelines in input payload");
    }
    if (!input.payload.accessibilityTarget) {
      throw new Error("UiDesigner requires accessibilityTarget in input payload");
    }

    // Validate accessibility target value
    const validTargets = ["A", "AA", "AAA"];
    if (!validTargets.includes(input.payload.accessibilityTarget)) {
      throw new Error(
        `Invalid accessibilityTarget '${input.payload.accessibilityTarget}'. Must be one of: ${validTargets.join(", ")}`,
      );
    }
  }

  async onAfter(
    output: AgentOutput<UiDesignerOutput>,
    context: AgentContext,
  ): Promise<void> {
    // Post-processing: enrich context with design system outputs
    context.set("designSystem" as any, output.payload.designSystem);
    context.set("componentLibrary" as any, output.payload.componentLibrary);
    context.set("accessibilityAudit" as any, output.payload.accessibilityAudit);
    context.set("designTokens" as any, output.payload.designTokens);
  }

  // ========================================================================
  // Primary Execution
  // ========================================================================

  async execute(
    input: AgentInput<UiDesignerInput>,
    context: AgentContext,
  ): Promise<AgentOutput<UiDesignerOutput>> {
    // In production, this assembles the full prompt and calls the LLM.
    // For the stub, we return a template response with realistic design system output.

    const {
      designBrief,
      brandGuidelines,
      platform,
      componentNeeds,
      accessibilityTarget,
      userPersonas,
    } = input.payload;

    // Derive design token shape from brand guidelines (stub logic)
    const primaryColor = extractHexColor(brandGuidelines, "#3b82f6");
    const secondaryColor = extractSecondaryColor(brandGuidelines, "#8b5cf6");
    const fontFamily = extractFontFamily(brandGuidelines, "Inter");

    // Pre-compute list-formatted strings for design system doc to avoid nested template literals
    const personasList = (userPersonas ?? [])
      .map((p: string) => "- " + p)
      .join("\n");
    const coverageList = (componentNeeds ?? [])
      .map((c: string) => "- " + c + ": Designed with " + accessibilityTarget + " compliance")
      .join("\n");

    const payload: UiDesignerOutput = {
      designSystem: [
        "# " + capitalize(platform) + " Design System",
        "",
        "## Overview",
        designBrief.substring(0, 200) + "...",
        "",
        "## Design Foundations",
        "- **Primary Color**: " + primaryColor,
        "- **Secondary Color**: " + secondaryColor,
        "- **Font Family**: " + fontFamily,
        "- **Accessibility Target**: WCAG " + accessibilityTarget,
        "- **Platform**: " + capitalize(platform),
        "",
        "## Visual Hierarchy",
        "- **H1**: 2.25rem / 36px — Extra Bold, " + fontFamily,
        "- **H2**: 1.875rem / 30px — Bold, " + fontFamily,
        "- **H3**: 1.5rem / 24px — Semi-Bold, " + fontFamily,
        "- **Body**: 1rem / 16px — Regular, " + fontFamily,
        "- **Caption**: 0.875rem / 14px — Regular, " + fontFamily,
        "",
        "## Spacing System",
        "Base unit: 4px",
        "Scale: 4px → 8px → 12px → 16px → 24px → 32px → 48px → 64px",
        "",
        "## Shadow Elevation",
        "- **sm**: 0 1px 2px rgba(0,0,0,0.05)",
        "- **md**: 0 4px 6px rgba(0,0,0,0.1)",
        "- **lg**: 0 10px 15px rgba(0,0,0,0.1)",
        "- **xl**: 0 20px 25px rgba(0,0,0,0.15)",
        "",
        "## User Personas Considered",
        personasList,
        "",
        "## Component Coverage",
        coverageList,
      ].join("\n"),

      componentLibrary: buildComponentLibrary(componentNeeds ?? [], primaryColor, secondaryColor, fontFamily),

      accessibilityAudit: {
        targetLevel: accessibilityTarget,
        score: accessibilityTarget === "AAA" ? 92 : accessibilityTarget === "AA" ? 85 : 72,
        issues: [
          "Interactive elements must have visible focus indicators",
          "Colour contrast for placeholder text should be checked",
          "Touch targets must be at least 44x44px",
        ],
        recommendations: [
          `Implement focus-visible outlines with 3px offset using ${primaryColor}`,
          "Ensure all non-text elements have sufficient contrast against backgrounds",
          "Provide descriptive ARIA labels for icon-only buttons",
          "Test with screen readers (NVDA, VoiceOver) across target browsers",
        ],
      },

      designTokens: {
        color: {
          primary: {
            50: lightenColor(primaryColor, 0.95),
            100: lightenColor(primaryColor, 0.85),
            200: lightenColor(primaryColor, 0.7),
            300: lightenColor(primaryColor, 0.5),
            400: lightenColor(primaryColor, 0.3),
            500: primaryColor,
            600: darkenColor(primaryColor, 0.15),
            700: darkenColor(primaryColor, 0.3),
            800: darkenColor(primaryColor, 0.45),
            900: darkenColor(primaryColor, 0.6),
          },
          secondary: {
            500: secondaryColor,
          },
          neutral: {
            50: "#f9fafb",
            100: "#f3f4f6",
            200: "#e5e7eb",
            300: "#d1d5db",
            400: "#9ca3af",
            500: "#6b7280",
            600: "#4b5563",
            700: "#374151",
            800: "#1f2937",
            900: "#111827",
          },
          semantic: {
            success: "#10b981",
            warning: "#f59e0b",
            error: "#ef4444",
            info: "#3b82f6",
          },
        },
        typography: {
          fontFamily: {
            primary: "'" + fontFamily + "', system-ui, sans-serif",
            mono: "'JetBrains Mono', 'Fira Code', monospace",
          },
          fontWeight: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          },
          fontSize: {
            xs: "0.75rem",
            sm: "0.875rem",
            base: "1rem",
            lg: "1.125rem",
            xl: "1.25rem",
            "2xl": "1.5rem",
            "3xl": "1.875rem",
            "4xl": "2.25rem",
          },
          lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
          },
        },
        spacing: {
          0: "0px",
          1: "0.25rem",
          2: "0.5rem",
          3: "0.75rem",
          4: "1rem",
          6: "1.5rem",
          8: "2rem",
          12: "3rem",
          16: "4rem",
        },
        shadow: {
          sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
          xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
        },
        transition: {
          fast: "150ms ease",
          normal: "300ms ease",
          slow: "500ms ease",
        },
        breakpoint: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
        },
      },

      responsiveBreakpoints: [
        { name: "mobile", minWidth: 0, columns: 4 },
        { name: "tablet", minWidth: 640, columns: 8 },
        { name: "desktop", minWidth: 1024, columns: 12 },
        { name: "large-desktop", minWidth: 1280, columns: 12 },
      ],
    };

    return {
      schema: this.outputSchema.$id,
      schemaVersion: this.outputSchema.version,
      payload,
      correlationId: input.correlationId,
      performance: {
        startedAt: new Date(Date.now() - 1200).toISOString(),
        completedAt: new Date().toISOString(),
        tokensUsed: 2400,
        steps: 5,
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const uiDesignerAdapter = new UiDesignerAdapter();
export default uiDesignerAdapter;

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Naive hex colour extraction from brand guidelines text.
 * In production, this would parse structured brand guidelines JSON/YAML.
 */
function extractHexColor(guidelines: string, fallback: string): string {
  const match = guidelines.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : fallback;
}

/**
 * Extract a secondary colour from brand guidelines text.
 */
function extractSecondaryColor(guidelines: string, fallback: string): string {
  const hexes = guidelines.match(/#[0-9a-fA-F]{6}/g);
  return hexes && hexes.length > 1 ? hexes[1] : fallback;
}

/**
 * Extract a font family name from brand guidelines text.
 */
function extractFontFamily(guidelines: string, fallback: string): string {
  const fontMatch = guidelines.match(/[Ff]ont[:\s]+([A-Za-z0-9\s-]+)/);
  return fontMatch ? fontMatch[1].trim() : fallback;
}

/**
 * Build a stub component library based on the requested component needs.
 */
function buildComponentLibrary(
  needs: string[],
  primaryColor: string,
  _secondaryColor: string,
  _fontFamily: string,
): ComponentSpec[] {
  const defaultComponents: ComponentSpec[] = [
    {
      name: "Button",
      description: "Primary action trigger with multiple style variants",
      states: ["default", "hover", "active", "disabled", "focus-visible"],
      variants: ["primary", "secondary", "outline", "ghost", "danger"],
      tokens: {
        "bg-primary": primaryColor,
        "border-radius": "0.375rem",
        "font-weight": "500",
        "padding-x": "1rem",
        "padding-y": "0.5rem",
      },
    },
    {
      name: "Form Input",
      description: "Text input field for form data entry",
      states: ["default", "focus", "error", "disabled", "read-only"],
      variants: ["default", "with-icon", "with-label", "textarea"],
      tokens: {
        "border-color": "#d1d5db",
        "border-radius": "0.375rem",
        "padding-x": "0.75rem",
        "padding-y": "0.5rem",
        "font-size": "1rem",
      },
    },
    {
      name: "Card",
      description: "Content container with optional header, body, and footer sections",
      states: ["default", "hover", "selected"],
      variants: ["default", "bordered", "elevated", "interactive"],
      tokens: {
        "bg": "#ffffff",
        "border-radius": "0.5rem",
        "shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "padding": "1.5rem",
      },
    },
    {
      name: "Navigation Bar",
      description: "Top-level site navigation with responsive hamburger menu",
      states: ["default", "scrolled", "mobile-open"],
      variants: ["default", "sticky", "transparent", "with-search"],
      tokens: {
        "bg": "#ffffff",
        "height": "4rem",
        "border-bottom": "1px solid #e5e7eb",
        "item-gap": "1.5rem",
      },
    },
  ];

  // If specific component needs are provided, add custom ones
  if (needs.length > 0) {
    const customComponents: ComponentSpec[] = needs
      .filter((need) => !defaultComponents.some((dc) => dc.name.toLowerCase() === need.toLowerCase()))
      .map((need) => ({
        name: need,
        description: `Custom ${need.toLowerCase()} component designed for ${capitalize(need)} use cases`,
        states: ["default", "hover", "active", "disabled", "focus-visible"],
        variants: ["default", "compact", "extended"],
        tokens: {
          "bg": "#ffffff",
          "border-radius": "0.375rem",
          "padding": "1rem",
        },
      }));
    return [...defaultComponents, ...customComponents];
  }

  return defaultComponents;
}

/**
 * Lighten a hex colour by a blending factor (0–1).
 */
function lightenColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * factor));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * factor));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Darken a hex colour by a reduction factor (0–1).
 */
function darkenColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - factor)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - factor)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - factor)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Capitalize the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
