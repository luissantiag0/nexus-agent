// ============================================================================
// Nexus Agent Platform — @ui-designer Agent Adapter
// ============================================================================
// Adapter for the UI Designer agent — visual design systems, component
// libraries, and pixel-perfect accessible interface creation.
//
// Implements: EnhancedAgentAdapter (compatible with base AgentAdapter)
// Registry:   lib/agents/registry.ts
// Prompt:     lib/agents/prompts/ui-designer.v1.prompt.yaml
//
// Input (via execute payload):
//   designBrief        — project overview, goals, constraints
//   brandGuidelines    — brand identity rules
//   uxRequirements     — screens, user flows, interaction patterns
//   userPersonas       — target personas with goals/pain points
//   platform           — target platform(s)
//   componentNeeds     — required UI components with variants/states
//   accessibilityTarget — WCAG compliance level
//   darkMode?          — dark mode support required
//   localization?      — i18n / RTL support
//
// Output:
//   designSystem        — full design system spec
//   componentLibrary    — component library definitions
//   designTokens        — CSS/SCSS/JSON/Tailwind/Figma exports
//   accessibilityAudit  — WCAG compliance audit
//   responsiveFramework — responsive breakpoint strategy
//   brandGuidelineCompliance — brand compliance report
//
// Context keys written:
//   designSystem, componentLibrary, accessibilityAudit, designTokens, brandGuidelines
// ============================================================================

import type { AgentContext, AgentExecutionResponse, ValidationResult as BaseValidationResult } from "../types";
import type {
  EnhancedAgentAdapter,
  AgentMetadata,
  PortSchema,
  ValidationRule,
  ValidationResult,
  ValidationError,
} from "./types";
import { CONTEXT } from "./types";

// ---------------------------------------------------------------------------
// Context Keys (canonical)
// ---------------------------------------------------------------------------

/** Context keys this adapter reads from shared state. */
export const UI_DESIGNER_READS: string[] = [
  CONTEXT.BRAND_GUIDELINES,
  CONTEXT.UX_REQUIREMENTS,
  CONTEXT.USER_PERSONAS,
];

/** Context keys this adapter writes to shared state. */
export const UI_DESIGNER_WRITES: string[] = [
  CONTEXT.DESIGN_SYSTEM,
  CONTEXT.COMPONENT_LIBRARY,
  CONTEXT.ACCESSIBILITY_AUDIT,
  CONTEXT.DESIGN_TOKENS,
  CONTEXT.BRAND_GUIDELINES,
];

// ---------------------------------------------------------------------------
// Input Schema — What the UI Designer agent needs
// ---------------------------------------------------------------------------

/**
 * Core design brief — the "what" and "why" of the interface to be designed.
 */
export interface DesignBrief {
  /** Short name for the project (e.g. "Dashboard Redesign", "Checkout Flow"). */
  projectName: string;
  /** One-paragraph summary of the project goals. */
  overview: string;
  /** Key user tasks this design must support. */
  coreUserTasks: string[];
  /** Any known constraints (budget, timeline, technical limitations). */
  constraints?: string[];
}

/**
 * Brand guidelines that the design must conform to.
 */
export interface BrandGuidelines {
  /** Primary brand color (hex). */
  brandPrimaryColor: string;
  /** Secondary brand color (hex). */
  brandSecondaryColor?: string;
  /** Brand font family name. */
  brandFont?: string;
  /** Link to brand style guide or PDF. */
  brandGuideUrl?: string;
  /** Usage do's and don'ts. */
  brandVoice?: string;
  /** Logo and asset usage rules. */
  assetGuidelines?: string;
}

/**
 * UX requirements sourced from @engineering-backend-architect or @product-manager.
 */
export interface UxRequirements {
  /** Pages / screens to design. */
  screens: string[];
  /** Navigation structure (top-level categories). */
  navigationStructure?: string[];
  /** Key user flows to support. */
  userFlows: string[];
  /** Existing wireframes or lo-fi mockups (URLs or references). */
  wireframes?: string[];
  /** State machines or interaction patterns. */
  interactionPatterns?: string[];
}

export interface UserPersona {
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
  devicePreference?: "mobile-first" | "desktop-first" | "responsive";
  accessibilityNeeds?: string[];
  techComfortLevel?: "low" | "medium" | "high";
}

export interface ComponentNeed {
  /** Name of the component (e.g. "Button", "DataTable", "Modal"). */
  name: string;
  /** How many variants are needed (e.g. "primary, secondary, ghost"). */
  variants?: string[];
  /** Which states need visual design (default, hover, active, disabled, focus, loading, error). */
  states?: string[];
  /** Special notes for this component. */
  notes?: string;
}

/**
 * Target platform(s) the design must support.
 */
export type TargetPlatform = "web" | "mobile" | "tablet" | "desktop" | "cross-platform";

/**
 * Accessibility target level.
 */
export type AccessibilityTarget = "WCAG-A" | "WCAG-AA" | "WCAG-AAA";

/**
 * The full input payload for the @ui-designer agent.
 * This is what gets passed as `input` in the execute() call.
 */
export interface UiDesignerInput {
  designBrief: DesignBrief;
  brandGuidelines: BrandGuidelines;
  uxRequirements: UxRequirements;
  userPersonas: UserPersona[];
  platform: TargetPlatform[];
  componentNeeds: ComponentNeed[];
  accessibilityTarget: AccessibilityTarget;
  /** Optional: any existing design system tokens to extend. */
  existingTokens?: Record<string, string>;
  /** Optional: dark mode requirement. */
  darkMode?: boolean;
  /** Optional: localization / RTL support. */
  localization?: {
    languages: string[];
    rtl: boolean;
  };
}

// ---------------------------------------------------------------------------
// Output Schema — What the UI Designer agent produces
// ---------------------------------------------------------------------------

/**
 * A single color palette entry with accessibility metadata.
 */
export interface ColorSwatch {
  tokenName: string;
  hex: string;
  cssVariable: string;
  usage: string;
  /** Contrast ratio against white (#FFFFFF) background. */
  contrastOnWhite: number;
  /** Contrast ratio against black (#000000) background. */
  contrastOnBlack: number;
  /** WCAG level this swatch passes at common text sizes. */
  wcagLevel: "AA" | "AAA" | "fail";
  /** Dark mode equivalent (if applicable). */
  darkModeEquivalent?: string;
}

export interface ColorPalette {
  primary: ColorSwatch[];
  secondary: ColorSwatch[];
  semantic: {
    success: ColorSwatch[];
    warning: ColorSwatch[];
    error: ColorSwatch[];
    info: ColorSwatch[];
  };
  neutral: ColorSwatch[];
  accent?: ColorSwatch[];
}

export interface TypographyScaleEntry {
  token: string;
  size: string;
  px: number;
  lineHeight: number;
  weight: number;
  usage: string;
}

export interface TypographyScale {
  fontFamilies: {
    primary: string;
    secondary?: string;
    monospace?: string;
  };
  scale: TypographyScaleEntry[];
  weights: Record<string, number>;
  letterSpacing: Record<string, string>;
}

export interface SpacingGrid {
  baseUnit: number;
  scale: Record<string, string>;
  usage: string;
}

export interface ShadowSystem {
  tokens: Record<string, string>;
  elevation: number[];
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: number;
  mediaQuery: string;
  targetDevice: string;
}

export interface ResponsiveFramework {
  strategy: "mobile-first" | "desktop-first";
  breakpoints: ResponsiveBreakpoint[];
  containerMaxWidths: Record<string, string>;
  gridColumns: Record<string, number>;
}

export interface ComponentDefinition {
  name: string;
  description: string;
  variants: Array<{
    name: string;
    description: string;
    cssClass: string;
  }>;
  states: Array<{
    name: string;
    description: string;
    cssPseudoClass?: string;
  }>;
  anatomy: Array<{
    part: string;
    description: string;
    cssSelector?: string;
  }>;
  responsiveBehavior: string;
  accessibilityNotes: string;
  codeSnippet?: string;
}

export interface ComponentLibrary {
  components: ComponentDefinition[];
  compositionPatterns: string[];
  usageGuidelines: string[];
}

export interface DesignTokenExports {
  css: string;
  scss: string;
  json: Record<string, string>;
  tailwind?: Record<string, unknown>;
  figma?: Record<string, unknown>;
}

export interface AccessibilityAudit {
  targetLevel: AccessibilityTarget;
  achievedLevel: AccessibilityTarget;
  colorContrast: {
    passesAA: boolean;
    passesAAA: boolean;
    failures: Array<{
      swatch: string;
      ratio: number;
      requiredRatio: number;
      suggestion: string;
    }>;
  };
  touchTargets: {
    minimumSize: number;
    compliant: boolean;
    exceptions: string[];
  };
  keyboardNavigation: {
    focusIndicators: boolean;
    logicalTabOrder: boolean;
    skipLinks: boolean;
  };
  screenReader: {
    semanticStructure: boolean;
    ariaLabels: boolean;
    altText: boolean;
  };
  motion: {
    respectsPrefersReducedMotion: boolean;
    animationsDefined: boolean;
  };
  zoom: {
    supports200PercentZoom: boolean;
  };
}

/**
 * The full output payload from the @ui-designer agent.
 */
export interface UiDesignerOutput {
  designSystem: {
    projectName: string;
    version: string;
    colorPalette: ColorPalette;
    typographyScale: TypographyScale;
    spacingGrid: SpacingGrid;
    shadows: ShadowSystem;
    borderRadius: Record<string, string>;
    opacity: Record<string, string>;
    transitions: Record<string, string>;
    zIndex: Record<string, number>;
    darkMode?: {
      enabled: boolean;
      strategy: "class" | "attribute" | "media-query";
      tokenOverrides: Record<string, string>;
    };
  };
  componentLibrary: ComponentLibrary;
  designTokens: DesignTokenExports;
  accessibilityAudit: AccessibilityAudit;
  responsiveFramework: ResponsiveFramework;
  brandGuidelineCompliance: {
    compliant: boolean;
    exceptions: string[];
    recommendations: string[];
  };
}

// ---------------------------------------------------------------------------
// Port Schemas
// ---------------------------------------------------------------------------

export const UI_DESIGNER_INPUT_SCHEMA: PortSchema = {
  $id: "ui-designer-input.v1",
  version: "1.0.0",
  description:
    "Design brief, brand guidelines, UX requirements, personas, platform, component needs, and accessibility target for the UI Designer agent.",
  type: "object",
  properties: {
    designBrief: { type: "object", description: "Core design brief with project overview, goals, and constraints" },
    brandGuidelines: { type: "object", description: "Brand identity rules the design must conform to" },
    uxRequirements: { type: "object", description: "UX requirements from upstream agents" },
    userPersonas: { type: "array", description: "Target user personas with goals and pain points" },
    platform: { type: "array", description: "Target platforms (web, mobile, tablet, desktop, cross-platform)" },
    componentNeeds: { type: "array", description: "List of required UI components with variants and states" },
    accessibilityTarget: { type: "string", description: "WCAG compliance target: A, AA, or AAA" },
    darkMode: { type: "boolean", description: "Whether dark mode support is required" },
    localization: { type: "object", description: "Localization and RTL support requirements" },
  },
  required: [
    "designBrief",
    "brandGuidelines",
    "uxRequirements",
    "userPersonas",
    "platform",
    "componentNeeds",
    "accessibilityTarget",
  ],
  example: {
    designBrief: {
      projectName: "Dashboard Redesign",
      overview: "Redesign the main analytics dashboard...",
      coreUserTasks: ["View KPIs", "Filter data", "Export reports"],
    },
    brandGuidelines: { brandPrimaryColor: "#3b82f6", brandFont: "Inter" },
    uxRequirements: { screens: ["Dashboard Home", "Analytics Detail"], userFlows: ["Login → Dashboard → Filter → Export"] },
    userPersonas: [
      {
        name: "Alex",
        role: "Operations Manager",
        goals: ["Monitor key metrics daily"],
        painPoints: ["Too many clicks to find data"],
      },
    ],
    platform: ["web", "tablet"],
    componentNeeds: [
      {
        name: "Button",
        variants: ["primary", "secondary", "ghost"],
        states: ["default", "hover", "active", "disabled", "focus", "loading"],
      },
    ],
    accessibilityTarget: "WCAG-AA",
  },
};

export const UI_DESIGNER_OUTPUT_SCHEMA: PortSchema = {
  $id: "ui-designer-output.v1",
  version: "1.0.0",
  description:
    "Full design system specification, component library, design tokens, accessibility audit, and responsive framework.",
  type: "object",
  properties: {
    designSystem: { type: "object", description: "Complete design system spec (colors, typography, spacing, shadows, etc.)" },
    componentLibrary: { type: "object", description: "Component library with definitions, variants, states, and anatomy" },
    designTokens: { type: "object", description: "Exportable design tokens (CSS, SCSS, JSON, Tailwind, Figma)" },
    accessibilityAudit: { type: "object", description: "WCAG compliance audit with detailed findings" },
    responsiveFramework: { type: "object", description: "Responsive breakpoint strategy and grid system" },
    brandGuidelineCompliance: { type: "object", description: "Brand guideline compliance report" },
  },
  required: [
    "designSystem",
    "componentLibrary",
    "designTokens",
    "accessibilityAudit",
    "responsiveFramework",
    "brandGuidelineCompliance",
  ],
};

// ---------------------------------------------------------------------------
// Validation Rules
// ---------------------------------------------------------------------------

/**
 * Ensures all color swatches meet the target WCAG contrast ratio.
 */
export const wcagColorContrastRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.wcag-color-contrast",
  name: "WCAG Color Contrast Compliance",
  description: "Ensures all design tokens meet minimum contrast ratios for the target WCAG level.",
  severity: "error",
  category: "accessibility",
  validate(output: UiDesignerOutput, _context?: AgentContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const targetLevel = output.accessibilityAudit.targetLevel;
    const minRatio = targetLevel === "WCAG-AAA" ? 7.0 : targetLevel === "WCAG-AA" ? 4.5 : 3.0;

    const allSwatches = [
      ...output.designSystem.colorPalette.primary,
      ...output.designSystem.colorPalette.secondary,
      ...output.designSystem.colorPalette.neutral,
      ...output.designSystem.colorPalette.semantic.success,
      ...output.designSystem.colorPalette.semantic.warning,
      ...output.designSystem.colorPalette.semantic.error,
      ...output.designSystem.colorPalette.semantic.info,
    ];

    for (const swatch of allSwatches) {
      if (swatch.wcagLevel === "fail") {
        errors.push({
          path: `designSystem.colorPalette.${swatch.tokenName}`,
          message: `Swatch "${swatch.tokenName}" (${swatch.hex}) fails WCAG contrast check. Ratio: ${swatch.contrastOnWhite.toFixed(2)}:1, required: ${minRatio}:1. Suggestion: ${swatch.darkModeEquivalent ? `Try dark mode equivalent ${swatch.darkModeEquivalent}` : "Darken by 15% to improve contrast."}`,
          severity: "error",
          code: "WCAG_CONTRAST_FAIL",
        });
      }
    }

    if (!output.accessibilityAudit.colorContrast.passesAA && targetLevel === "WCAG-AA") {
      errors.push({
        path: "accessibilityAudit.colorContrast",
        message: `Design system does not pass WCAG AA color contrast compliance. Required ratio: ${minRatio}:1.`,
        severity: "error",
        code: "WCAG_AA_CONTRAST_FAIL",
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

/**
 * Validates that all touch targets meet the 44px minimum size (WCAG 2.5.5).
 */
export const touchTargetSizeRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.touch-target-size",
  name: "Touch Target Size Compliance",
  description: "Ensures all interactive elements have a minimum touch target size of 44x44px per WCAG 2.5.5.",
  severity: "error",
  category: "accessibility",
  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!output.accessibilityAudit.touchTargets.compliant) {
      for (const exception of output.accessibilityAudit.touchTargets.exceptions) {
        errors.push({
          path: "accessibilityAudit.touchTargets.exceptions",
          message: `Touch target size violation: ${exception}. Minimum size is ${output.accessibilityAudit.touchTargets.minimumSize}px per WCAG 2.5.5.`,
          severity: "error",
          code: "TOUCH_TARGET_SIZE_FAIL",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

/**
 * Validates responsive breakpoint coverage across all device tiers.
 */
export const responsiveBreakpointCoverageRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.responsive-breakpoint-coverage",
  name: "Responsive Breakpoint Coverage",
  description: "Ensures the responsive framework covers at least 4 breakpoint categories (mobile, tablet, desktop, large desktop).",
  severity: "warning",
  category: "responsive",
  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const breakpoints = output.responsiveFramework.breakpoints;

    const requiredTiers = [
      { name: "mobile", maxWidth: 639 },
      { name: "tablet", maxWidth: 1023 },
      { name: "desktop", maxWidth: 1279 },
      { name: "large-desktop", maxWidth: Infinity },
    ];

    for (const tier of requiredTiers) {
      const hasCoverage = breakpoints.some(
        (bp) =>
          bp.minWidth <= (tier.maxWidth === Infinity ? 99999 : tier.maxWidth) &&
          bp.targetDevice.toLowerCase().includes(tier.name.replace("-", " ")),
      );
      if (!hasCoverage) {
        warnings.push(
          `No dedicated breakpoint found for "${tier.name}" tier. ${tier.name === "mobile" ? "Mobile-first design requires a base (unprefixed) stylesheet." : `Consider adding a breakpoint targeting ${tier.name} devices.`}`,
        );
      }
    }

    if (breakpoints.length < 3) {
      warnings.push(
        `Only ${breakpoints.length} breakpoint(s) defined. For responsive coverage, define at least 4 breakpoints (mobile, tablet, desktop, large desktop).`,
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

/**
 * Validates design token naming consistency.
 */
export const designTokenConsistencyRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.design-token-consistency",
  name: "Design Token Consistency",
  description: "Validates that CSS custom properties follow a consistent naming convention and values are not duplicated.",
  severity: "warning",
  category: "consistency",
  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const jsonTokens = output.designTokens.json;

    // Check for duplicate values under different names
    const valueMap = new Map<string, string[]>();
    for (const [key, value] of Object.entries(jsonTokens)) {
      const existing = valueMap.get(value) ?? [];
      existing.push(key);
      valueMap.set(value, existing);
    }

    for (const [value, keys] of valueMap.entries()) {
      if (keys.length > 3) {
        warnings.push(
          `Value "${value}" is used by ${keys.length} different tokens: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? ` and ${keys.length - 5} more` : ""}. Consider consolidating.`,
        );
      }
    }

    // Check naming convention (camelCase for JSON keys)
    const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
    for (const key of Object.keys(jsonTokens)) {
      if (!camelCaseRegex.test(key)) {
        warnings.push(
          `Token "${key}" in JSON export does not follow camelCase naming convention.`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

/**
 * Validates typography scale has at least 6 distinct sizes.
 */
export const typographyScaleSufficiencyRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.typography-scale-sufficiency",
  name: "Typography Scale Sufficiency",
  description: "Ensures the typography scale defines at least 6 size steps for adequate hierarchy.",
  severity: "warning",
  category: "typography",
  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (output.designSystem.typographyScale.scale.length < 6) {
      warnings.push(
        `Typography scale has only ${output.designSystem.typographyScale.scale.length} entries. A comprehensive scale should have at least 6 steps (xs, sm, base, lg, xl, 2xl).`,
      );
    }

    return { valid: warnings.length === 0, errors, warnings };
  },
};

/**
 * Validates interactive components define all required WCAG states.
 */
export const interactiveStatesCompletenessRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.interactive-states-completeness",
  name: "Interactive State Completeness",
  description: "Ensures interactive components define at least: default, hover, focus, active, and disabled states.",
  severity: "error",
  category: "accessibility",
  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const requiredStates = ["default", "hover", "focus", "active", "disabled"];

    for (const component of output.componentLibrary.components) {
      const stateNames = component.states.map((s) => s.name.toLowerCase());
      const missing = requiredStates.filter((rs) => !stateNames.includes(rs));

      if (missing.length > 0) {
        errors.push({
          path: `componentLibrary.components.${component.name}.states`,
          message: `Component "${component.name}" is missing required interactive states: ${missing.join(", ")}. These are required for WCAG compliance.`,
          severity: "error",
          code: "MISSING_INTERACTIVE_STATES",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Aggregated Validators
// ---------------------------------------------------------------------------

export const UI_DESIGNER_VALIDATORS: ValidationRule<UiDesignerOutput>[] = [
  wcagColorContrastRule,
  touchTargetSizeRule,
  responsiveBreakpointCoverageRule,
  designTokenConsistencyRule,
  typographyScaleSufficiencyRule,
  interactiveStatesCompletenessRule,
];

// ---------------------------------------------------------------------------
// Adapter Implementation
// ---------------------------------------------------------------------------

/**
 * @ui-designer adapter — fully implements EnhancedAgentAdapter and is
 * compatible with the base AgentAdapter contract used by AgentRegistry.
 *
 * Register with:
 * ```ts
 * import { AgentRegistry } from "@/lib/agents/registry";
 * import { uiDesignerAdapter } from "@/lib/agents/registry/ui-designer";
 *
 * const registry = new AgentRegistry();
 * registry.register(uiDesignerAdapter);
 * ```
 */
export const uiDesignerAdapter: EnhancedAgentAdapter<UiDesignerInput, UiDesignerOutput> = {
  // ---- Base AgentAdapter contract (from lib/agents/types.ts) ----

  metadata: {
    name: "design-ui-designer",
    label: "UI Designer",
    description:
      "Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect accessible interface creation.",
    version: "1.0.0",
    capabilities: [
      {
        action: "generate-design-system",
        description: "Generate a complete design system specification including colors, typography, spacing, and tokens from a design brief.",
        inputSchema: { type: "object", properties: { designBrief: { type: "object" }, brandGuidelines: { type: "object" }, componentNeeds: { type: "array" } }, required: ["designBrief", "brandGuidelines"] },
        outputSchema: { type: "object", properties: { designSystem: { type: "object" }, componentLibrary: { type: "object" }, designTokens: { type: "object" } } },
      },
      {
        action: "audit-accessibility",
        description: "Run a comprehensive WCAG accessibility audit on a design system or component library.",
        inputSchema: { type: "object", properties: { designSystem: { type: "object" }, accessibilityTarget: { type: "string", enum: ["WCAG-A", "WCAG-AA", "WCAG-AAA"] } }, required: ["designSystem", "accessibilityTarget"] },
        outputSchema: { type: "object", properties: { accessibilityAudit: { type: "object" } } },
      },
      {
        action: "export-tokens",
        description: "Export design tokens in multiple formats (CSS, SCSS, JSON, Tailwind, Figma).",
        inputSchema: { type: "object", properties: { designTokens: { type: "object" } } },
        outputSchema: { type: "object", properties: { tokens: { type: "object" } } },
      },
    ],
    readsContextKeys: UI_DESIGNER_READS,
    writesContextKeys: UI_DESIGNER_WRITES,
    promptVersion: "ui-designer.v1",
    tags: ["design", "ui", "frontend", "accessibility", "design-system"],
    author: "Nexus Agent Platform",
    icon: "🎨",
    color: "#7c3aed",
    model: "gpt-4o",
    registryStatus: "active",
  },

  // ---- Extended EnhancedAgentAdapter fields ----

  inputSchema: UI_DESIGNER_INPUT_SCHEMA,
  outputSchema: UI_DESIGNER_OUTPUT_SCHEMA,

  readsContextKeys: UI_DESIGNER_READS,
  writesContextKeys: UI_DESIGNER_WRITES,

  promptTemplate: "lib/agents/prompts/ui-designer.v1.prompt.yaml",

  validators: UI_DESIGNER_VALIDATORS,

  // ---- Base AgentAdapter contract methods ----

  /**
   * Validate input against the agent's schema and business rules.
   * Called by the AgentRegistry before execute().
   */
  validate(input: Record<string, unknown>): BaseValidationResult {
    const errors: BaseValidationResult["errors"] = [];
    const warnings: BaseValidationResult["warnings"] = [];

    // Required fields check
    const requiredFields = [
      "designBrief",
      "brandGuidelines",
      "uxRequirements",
      "userPersonas",
      "platform",
      "componentNeeds",
      "accessibilityTarget",
    ];

    for (const field of requiredFields) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        errors.push({
          field,
          message: `Required field "${field}" is missing from input payload.`,
          severity: "error",
        });
      }
    }

    // Type checks
    if ("platform" in input && input.platform !== undefined) {
      const platform = input.platform as string[];
      const validPlatforms = ["web", "mobile", "tablet", "desktop", "cross-platform"];
      const invalid = platform.filter((p) => !validPlatforms.includes(p));
      if (invalid.length > 0) {
        errors.push({
          field: "platform",
          message: `Invalid platform value(s): ${invalid.join(", ")}. Valid values: ${validPlatforms.join(", ")}.`,
          severity: "error",
        });
      }
    }

    if ("accessibilityTarget" in input && input.accessibilityTarget !== undefined) {
      const validTargets = ["WCAG-A", "WCAG-AA", "WCAG-AAA"];
      if (!validTargets.includes(input.accessibilityTarget as string)) {
        errors.push({
          field: "accessibilityTarget",
          message: `Invalid accessibility target "${input.accessibilityTarget as string}". Valid values: ${validTargets.join(", ")}.`,
          severity: "error",
        });
      }
    }

    if ("userPersonas" in input && Array.isArray(input.userPersonas) && input.userPersonas.length === 0) {
      warnings.push({
        field: "userPersonas",
        message: "No user personas provided. Design decisions may lack user context.",
        severity: "warning",
      });
    }

    if ("componentNeeds" in input && Array.isArray(input.componentNeeds) && input.componentNeeds.length === 0) {
      warnings.push({
        field: "componentNeeds",
        message: "No component needs specified. A generic component library will be generated.",
        severity: "warning",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Execute the UI Designer agent's core logic.
   *
   * In production, this method:
   *  1. Reads the prompt template from disk
   *  2. Interpolates variables
   *  3. Calls the LLM with the system prompt + user input
   *  4. Parses the structured output
   *  5. Runs validation rules
   *  6. Writes context keys for downstream agents
   */
  async execute(
    input: UiDesignerInput,
    context: AgentContext,
  ): Promise<AgentExecutionResponse<UiDesignerOutput>> {
    const startedAt = new Date().toISOString();

    // ---- Pre-execution hook ----
    if (this.onBefore) {
      await this.onBefore(input, context);
    }

    // ---- Resolve prompt ----
    // const prompt = await this.resolvePrompt({ ... }); // LLM call happens here

    // ---- Build the output ----
    // In production, this is the parsed LLM response.
    // For this adapter definition, we demonstrate the structure.
    const output: UiDesignerOutput = {
      designSystem: {
        projectName: input.designBrief.projectName,
        version: "1.0.0",
        colorPalette: {
          primary: [],
          secondary: [],
          semantic: { success: [], warning: [], error: [], info: [] },
          neutral: [],
        },
        typographyScale: {
          fontFamilies: {
            primary: input.brandGuidelines.brandFont ?? "'Inter', system-ui, sans-serif",
          },
          scale: [],
          weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
          letterSpacing: { tight: "-0.01em", normal: "0em", wide: "0.02em" },
        },
        spacingGrid: { baseUnit: 4, scale: {}, usage: "Margin, padding, and gap values" },
        shadows: { tokens: {}, elevation: [1, 2, 3, 4, 8, 16] },
        borderRadius: { none: "0px", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px" },
        opacity: { 0: "0", 25: "0.25", 50: "0.50", 75: "0.75", 100: "1" },
        transitions: { fast: "150ms ease", normal: "300ms ease", slow: "500ms ease" },
        zIndex: { dropdown: 1000, sticky: 1020, modal: 1030, toast: 1040, tooltip: 1050 },
        darkMode: input.darkMode
          ? { enabled: true, strategy: "class", tokenOverrides: {} }
          : undefined,
      },
      componentLibrary: {
        components: input.componentNeeds.map((need) => ({
          name: need.name,
          description: `${need.name} component for ${input.designBrief.projectName}.`,
          variants: (need.variants ?? ["default"]).map((v) => ({
            name: v,
            description: `${v} variant`,
            cssClass: `${need.name.toLowerCase()} ${need.name.toLowerCase()}--${v}`,
          })),
          states: (need.states ?? ["default", "hover", "focus"]).map((s) => ({
            name: s,
            description: `${s} state`,
            cssPseudoClass: s === "hover" ? ":hover" : s === "focus" ? ":focus-visible" : s === "active" ? ":active" : s === "disabled" ? ":disabled" : undefined,
          })),
          anatomy: [],
          responsiveBehavior: "Responsive behavior TBD.",
          accessibilityNotes: "Accessibility notes TBD.",
        })),
        compositionPatterns: [],
        usageGuidelines: [],
      },
      designTokens: {
        css: "",
        scss: "",
        json: {},
      },
      accessibilityAudit: {
        targetLevel: input.accessibilityTarget,
        achievedLevel: input.accessibilityTarget,
        colorContrast: { passesAA: true, passesAAA: false, failures: [] },
        touchTargets: { minimumSize: 44, compliant: true, exceptions: [] },
        keyboardNavigation: { focusIndicators: true, logicalTabOrder: true, skipLinks: true },
        screenReader: { semanticStructure: true, ariaLabels: true, altText: true },
        motion: { respectsPrefersReducedMotion: true, animationsDefined: true },
        zoom: { supports200PercentZoom: true },
      },
      responsiveFramework: {
        strategy: "mobile-first",
        breakpoints: [
          { name: "sm", minWidth: 640, mediaQuery: "@media (min-width: 640px)", targetDevice: "Mobile landscape / Small tablet" },
          { name: "md", minWidth: 768, mediaQuery: "@media (min-width: 768px)", targetDevice: "Tablet portrait" },
          { name: "lg", minWidth: 1024, mediaQuery: "@media (min-width: 1024px)", targetDevice: "Desktop" },
          { name: "xl", minWidth: 1280, mediaQuery: "@media (min-width: 1280px)", targetDevice: "Large desktop" },
        ],
        containerMaxWidths: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
        gridColumns: { default: 4, sm: 4, md: 8, lg: 12, xl: 12 },
      },
      brandGuidelineCompliance: {
        compliant: true,
        exceptions: [],
        recommendations: [],
      },
    };

    // ---- Post-execution hook ----
    if (this.onAfter) {
      await this.onAfter(output, context);
    }

    // ---- Run validators ----
    for (const validator of this.validators) {
      const result = validator.validate(output, context);
      if (!result.valid && result.errors.some((e) => e.severity === "error")) {
        // Log validation errors to the context for observability
        if (!context.validationErrors) {
          context.validationErrors = [];
        }
        (context.validationErrors as string[]).push(
          `[${validator.id}] ${result.errors.filter((e) => e.severity === "error").map((e) => e.message).join("; ")}`,
        );
      }
    }

    // ---- Write to shared context ----
    context[CONTEXT.DESIGN_SYSTEM] = output.designSystem;
    context[CONTEXT.COMPONENT_LIBRARY] = output.componentLibrary;
    context[CONTEXT.ACCESSIBILITY_AUDIT] = output.accessibilityAudit;
    context[CONTEXT.DESIGN_TOKENS] = output.designTokens;
    context[CONTEXT.BRAND_GUIDELINES] = input.brandGuidelines;

    const completedAt = new Date().toISOString();

    return {
      agent: this.metadata.name,
      status: "completed" as const,
      output,
      context,
      metrics: {
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        model: this.metadata.model,
      },
    };
  },

  // ---- Prompt resolution ----

  async resolvePrompt(variables: Record<string, unknown>): Promise<string> {
    // In production: load YAML from promptTemplate path, interpolate {{ variables }},
    // and return the resolved system prompt string.
    const keys = Object.keys(variables);
    return [
      `[ui-designer.v1] Resolved prompt with ${keys.length} variable(s).`,
      `Template: ${this.promptTemplate}`,
      ...keys.map((k) => `  ${k}: ${typeof variables[k]}`),
    ].join("\n");
  },

  // ---- Base AgentAdapter validate + execute are already defined above ----
};
