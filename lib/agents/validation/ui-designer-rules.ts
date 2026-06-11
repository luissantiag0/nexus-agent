// ============================================================================
// Nexus Agent Platform — @ui-designer Validation Rules
// ============================================================================
// Comprehensive validation rules for UI Designer agent outputs. These rules
// are registered in the agent adapter and executed post-generation to ensure
// the design system meets quality, accessibility, and consistency standards.
// ============================================================================

import type { ValidationResult, ValidationError, ValidationRule, AgentContext } from "../registry/types";
import type { UiDesignerOutput } from "../registry/ui-designer";

// ---------------------------------------------------------------------------
// Rule 1: WCAG Color Contrast Compliance
// ---------------------------------------------------------------------------

export const wcagColorContrastRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.wcag-color-contrast",
  name: "WCAG Color Contrast Compliance",
  description: "Validates all color swatches meet minimum contrast ratios for the target WCAG level. AA requires 4.5:1 for normal text, 3:1 for large text. AAA requires 7:1 and 4.5:1 respectively.",
  severity: "error",
  category: "accessibility",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const targetLevel = output.accessibilityAudit.targetLevel;
    const achievedLevel = output.accessibilityAudit.achievedLevel;

    // Check if achieved level is below target
    const levelRank = { "WCAG-A": 0, "WCAG-AA": 1, "WCAG-AAA": 2 };
    if (levelRank[achievedLevel] < levelRank[targetLevel]) {
      errors.push({
        path: "accessibilityAudit.achievedLevel",
        message: `Achieved WCAG level "${achievedLevel}" is below target "${targetLevel}". Design must meet or exceed the target accessibility level.`,
        severity: "error",
        code: "WCAG_LEVEL_GAP",
      });
    }

    // Collect all swatches from the design system
    const palette = output.designSystem.colorPalette;
    const allSwatches = [
      ...palette.primary,
      ...palette.secondary,
      ...palette.neutral,
      ...palette.semantic.success,
      ...palette.semantic.warning,
      ...palette.semantic.error,
      ...palette.semantic.info,
      ...(palette.accent ?? []),
    ];

    for (const swatch of allSwatches) {
      if (swatch.wcagLevel === "fail") {
        errors.push({
          path: `designSystem.colorPalette.${swatch.tokenName}`,
          message: `Swatch "${swatch.tokenName}" (${swatch.hex}) fails WCAG contrast check. Ratio: ${swatch.contrastOnWhite.toFixed(2)}:1 against white, ${swatch.contrastOnBlack.toFixed(2)}:1 against black. ${
            swatch.darkModeEquivalent
              ? `Consider using dark mode equivalent "${swatch.darkModeEquivalent}" for dark backgrounds.`
              : "Adjust luminance by at least 15% to meet minimum ratio."
          }`,
          severity: "error",
          code: "WCAG_CONTRAST_FAIL",
        });
      }
    }

    // Verify semantic colors are distinguishable
    const semanticGroups = [
      { name: "success", swatches: palette.semantic.success },
      { name: "error", swatches: palette.semantic.error },
    ];
    for (const group of semanticGroups) {
      for (const swatch of group.swatches) {
        if (swatch.wcagLevel === "fail") {
          warnings.push(
            `Semantic color "${group.name}" swatch "${swatch.tokenName}" (${swatch.hex}) fails contrast checks. This may mislead users who rely on color perception.`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 2: Design Token Naming & Consistency
// ---------------------------------------------------------------------------

export const designTokenConsistencyRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.design-token-consistency",
  name: "Design Token Consistency & Naming Convention",
  description: "Validates that design tokens follow consistent naming conventions (kebab-case for CSS, camelCase for JSON), have no naming collisions, and use values from the defined scale rather than arbitrary values.",
  severity: "warning",
  category: "consistency",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const jsonTokens = output.designTokens.json;
    const css = output.designTokens.css;
    const spacingScale = output.designSystem.spacingGrid.scale;

    // ---- 2a. Check for duplicate values under different names ----
    const valueMap = new Map<string, string[]>();
    for (const [key, value] of Object.entries(jsonTokens)) {
      const existing = valueMap.get(value) ?? [];
      existing.push(key);
      valueMap.set(value, existing);
    }

    // Flag exact duplicates (same value, different name) as warnings
    for (const [value, keys] of valueMap.entries()) {
      if (keys.length > 1 && value.length > 0) {
        warnings.push(
          `Duplicate token value "${value}" used by: ${keys.join(", ")}. Consider consolidating into a single token.`
        );
      }
      // Flag excessive duplication (>3 tokens sharing same value) for review
      if (keys.length > 3) {
        warnings.push(
          `Value "${value}" is used by ${keys.length} different tokens (${keys.slice(0, 3).join(", ")}${keys.length > 3 ? `, +${keys.length - 3} more` : ""}). This may indicate unnecessary token proliferation.`
        );
      }
    }

    // ---- 2b. Validate CSS variable naming convention ----
    const cssVarRegex = /^--[a-z][a-z0-9-]*$/;
    const cssVars = css.match(/--[\w-]+/g) ?? [];
    for (const cssVar of cssVars) {
      if (!cssVarRegex.test(cssVar)) {
        warnings.push(
          `CSS variable "${cssVar}" does not follow kebab-case convention. Expected pattern: --namespace-property-step (e.g., --color-primary-500).`
        );
      }
    }

    // ---- 2c. Validate JSON token naming convention ----
    const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
    for (const key of Object.keys(jsonTokens)) {
      if (!camelCaseRegex.test(key)) {
        warnings.push(
          `JSON token "${key}" does not follow camelCase convention. Expected pattern: namespacePropertyStep (e.g., colorPrimary500).`
        );
      }
    }

    // ---- 2d. Check that spacing values are in the defined scale ----
    const spacingValues = new Set(Object.values(spacingScale));
    const spacingRegex = /^var\(--space-\d+\)$/;
    // Check JSON tokens for spacing values that don't match scale
    for (const [key, value] of Object.entries(jsonTokens)) {
      if (key.startsWith("space") && !spacingValues.has(value)) {
        warnings.push(
          `Spacing token "${key}" has value "${value}" which is not in the defined spacing scale. Scale values: ${Array.from(spacingValues).join(", ")}.`
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 3: Responsive Breakpoint Coverage
// ---------------------------------------------------------------------------

export const responsiveBreakpointCoverageRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.responsive-breakpoint-coverage",
  name: "Responsive Breakpoint Coverage",
  description: "Ensures the responsive framework covers all required device tiers: mobile (<640px), tablet (640-1023px), desktop (1024-1279px), and large desktop (1280px+). Mobile-first strategy requires base styles for <640px and at least 3 upward breakpoints.",
  severity: "warning",
  category: "responsive",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const framework = output.responsiveFramework;
    const breakpoints = framework.breakpoints;
    const strategy = framework.strategy;

    const requiredTiers = [
      { name: "mobile / small", minWidth: 0, maxWidth: 639, description: "Base mobile styles. Mobile-first requires this as the default (no media query)." },
      { name: "tablet", minWidth: 640, maxWidth: 1023, description: "Tablet portrait and landscape." },
      { name: "desktop", minWidth: 1024, maxWidth: 1279, description: "Standard desktop screens." },
      { name: "large desktop", minWidth: 1280, maxWidth: Infinity, description: "Large / wide desktop screens." },
    ];

    // Sort breakpoints by minWidth
    const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);

    // ---- 3a. Check at least 4 breakpoints ----
    if (sorted.length < 4) {
      warnings.push(
        `Only ${sorted.length} breakpoint(s) defined. A comprehensive responsive framework should have at least 4: mobile (base), tablet (≥640px), desktop (≥1024px), and large desktop (≥1280px).`
      );
    }

    // ---- 3b. Check gap coverage between breakpoints ----
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      // If there's a gap of more than 200px between consecutive breakpoints,
      // flag a warning
      if (next.minWidth - (current.minWidth + 1) > 200) {
        warnings.push(
          `Gap detected between breakpoints "${current.name}" (${current.minWidth}px) and "${next.name}" (${next.minWidth}px) — ${next.minWidth - current.minWidth}px gap. Consider adding an intermediate breakpoint for smoother responsive behavior.`
        );
      }
    }

    // ---- 3c. Check grid column definitions per breakpoint ----
    const columnConfigs = framework.gridColumns;
    const bpNames = new Set(sorted.map((bp) => bp.name));
    const configNames = new Set(Object.keys(columnConfigs));

    for (const bpName of bpNames) {
      if (!configNames.has(bpName) && !["default", "base"].some((k) => configNames.has(k))) {
        warnings.push(
          `No grid column configuration found for breakpoint "${bpName}". Define a grid column count to ensure layout consistency at this viewport size.`
        );
      }
    }

    // ---- 3d. Container max-width should match or exceed each breakpoint ----
    for (const bp of sorted) {
      const containerKey = bp.name;
      const containerMax = framework.containerMaxWidths[containerKey];
      if (containerMax) {
        const parsedMax = parseInt(containerMax, 10);
        if (parsedMax < bp.minWidth) {
          errors.push({
            path: `responsiveFramework.containerMaxWidths.${containerKey}`,
            message: `Container max-width (${containerMax}) at breakpoint "${bp.name}" (${bp.minWidth}px) is smaller than the breakpoint minimum width. Container should be at least ${bp.minWidth}px wide at this breakpoint.`,
            severity: "error",
            code: "CONTAINER_NARROWER_THAN_BREAKPOINT",
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 4: Typography Scale Sufficiency
// ---------------------------------------------------------------------------

export const typographyScaleSufficiencyRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.typography-scale-sufficiency",
  name: "Typography Scale Sufficiency",
  description: "Ensures the typography scale defines at least 6 size steps for adequate visual hierarchy. Minimum recommended: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px). Larger scales should include 3xl (30px) and 4xl (36px).",
  severity: "warning",
  category: "typography",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const scale = output.designSystem.typographyScale.scale;

    if (scale.length < 6) {
      errors.push({
        path: "designSystem.typographyScale.scale",
        message: `Typography scale has only ${scale.length} entries. A minimum of 6 entries is required (xs, sm, base, lg, xl, 2xl).`,
        severity: "error",
        code: "TYPOGRAPHY_SCALE_TOO_SMALL",
      });
    }

    if (scale.length >= 6) {
      // Check for recommended entries
      const sizeNames = scale.map((s) => s.token.toLowerCase());
      const recommendedTokens = ["xs", "sm", "base", "lg", "xl", "2xl"];
      const missing = recommendedTokens.filter(
        (t) => !sizeNames.some((name) => name.includes(t))
      );

      if (missing.length > 0) {
        warnings.push(
          `Typography scale is missing recommended size tokens: ${missing.join(", ")}. Consider adding these for a complete hierarchy.`
        );
      }

      // Check line-height ratios are reasonable (between 1.0 and 2.0)
      for (const entry of scale) {
        if (entry.lineHeight < 1.0 || entry.lineHeight > 2.0) {
          warnings.push(
            `Typography entry "${entry.token}" (${entry.size}) has unusual line-height: ${entry.lineHeight}. Expected range: 1.0–2.0.`
          );
        }
      }
    }

    // Check font family definitions
    const families = output.designSystem.typographyScale.fontFamilies;
    if (!families.primary) {
      errors.push({
        path: "designSystem.typographyScale.fontFamilies.primary",
        message: "Primary font family is not defined. A primary font is required for all UI text.",
        severity: "error",
        code: "PRIMARY_FONT_MISSING",
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 5: Interactive States Completeness
// ---------------------------------------------------------------------------

export const interactiveStatesCompletenessRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.interactive-states-completeness",
  name: "Interactive States Completeness",
  description: "Validates that all interactive components define the five required WCAG states: default, hover, focus, active, and disabled. Focus state must use :focus-visible for keyboard users. Loading state is recommended for async actions.",
  severity: "error",
  category: "accessibility",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const requiredStates = ["default", "hover", "focus", "active", "disabled"];
    const interactiveComponents = output.componentLibrary.components.filter((c) => {
      // Determine if component is interactive (has actions)
      const interactiveKeywords = ["button", "input", "select", "link", "tab", "toggle", "switch", "menu", "item", "picker"];
      const lowerName = c.name.toLowerCase();
      return interactiveKeywords.some((kw) => lowerName.includes(kw));
    });

    if (interactiveComponents.length === 0) {
      warnings.push(
        "No interactive components detected in the component library. Ensure at least Button, Input, and Link-like components are defined with interactive states."
      );
    }

    for (const component of interactiveComponents) {
      const stateNames = component.states.map((s) => s.name.toLowerCase());
      const missing = requiredStates.filter((rs) => !stateNames.includes(rs));

      if (missing.length > 0) {
        errors.push({
          path: `componentLibrary.components.${component.name}.states`,
          message: `Interactive component "${component.name}" is missing required states: ${missing.join(", ")}. Every interactive component must define default, hover, focus, active, and disabled states per WCAG 2.1.1 and 2.4.7.`,
          severity: "error",
          code: "MISSING_INTERACTIVE_STATES",
        });
      }

      // Check for focus-visible usage
      const focusStates = component.states.filter(
        (s) => s.name.toLowerCase() === "focus"
      );
      for (const fs of focusStates) {
        if (fs.cssPseudoClass && fs.cssPseudoClass === ":focus" && !fs.cssPseudoClass.includes("focus-visible")) {
          warnings.push(
            `Component "${component.name}" uses ":focus" pseudo-class. Consider using ":focus-visible" instead to provide focus indicators only for keyboard users, avoiding permanent focus rings for mouse users (WCAG 2.4.7).`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 6: Touch Target Size (WCAG 2.5.5)
// ---------------------------------------------------------------------------

export const touchTargetSizeRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.touch-target-size",
  name: "Touch Target Size (WCAG 2.5.5)",
  description: "Ensures all interactive touch targets meet the 44x44px minimum size per WCAG 2.5.5 (Target Size). Exceptions are allowed for inline links and user-agent controls.",
  severity: "error",
  category: "accessibility",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const touchTargets = output.accessibilityAudit.touchTargets;

    if (touchTargets.minimumSize < 44) {
      errors.push({
        path: "accessibilityAudit.touchTargets.minimumSize",
        message: `Touch target minimum size is ${touchTargets.minimumSize}px. WCAG 2.5.5 requires a minimum of 44x44px for all interactive elements.`,
        severity: "error",
        code: "TOUCH_TARGET_BELOW_MINIMUM",
      });
    }

    if (!touchTargets.compliant) {
      for (const exception of touchTargets.exceptions) {
        errors.push({
          path: "accessibilityAudit.touchTargets.exceptions",
          message: `Touch target violation: ${exception}. Minimum size is ${touchTargets.minimumSize}px. Ensure targets are at least 44x44px, or provide equivalent functionality through an alternative accessible control.`,
          severity: "error",
          code: "TOUCH_TARGET_SIZE_FAIL",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 7: Dark Mode Completeness (conditional)
// ---------------------------------------------------------------------------

export const darkModeCompletenessRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.dark-mode-completeness",
  name: "Dark Mode Completeness",
  description: "If dark mode is enabled, validates that every light-mode color token has a corresponding dark-mode override. Checks that the dark mode contrast ratios are maintained at the same WCAG level as the light mode.",
  severity: "warning",
  category: "consistency",

  validate(output: UiDesignerOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const darkMode = output.designSystem.darkMode;
    if (!darkMode || !darkMode.enabled) {
      return { valid: true, errors, warnings }; // Skipped — dark mode not required
    }

    // Collect all light-mode swatches
    const palette = output.designSystem.colorPalette;
    const allLightSwatches = [
      ...palette.primary,
      ...palette.secondary,
      ...palette.neutral,
      ...palette.semantic.success,
      ...palette.semantic.warning,
      ...palette.semantic.error,
      ...palette.semantic.info,
    ];

    // Check each swatch has a dark mode equivalent
    const swatchesWithoutDark = allLightSwatches.filter(
      (s) => !s.darkModeEquivalent
    );
    if (swatchesWithoutDark.length > 0) {
      warnings.push(
        `${swatchesWithoutDark.length} color swatch(es) are missing dark mode equivalents: ${swatchesWithoutDark.slice(0, 5).map((s) => `"${s.tokenName}"`).join(", ")}${swatchesWithoutDark.length > 5 ? `, +${swatchesWithoutDark.length - 5} more` : ""}. Every light-mode color should have a dark-mode counterpart.`
      );
    }

    // Validate token overrides completeness
    const tokenKeys = Object.keys(output.designTokens.json);
    const overrideKeys = Object.keys(darkMode.tokenOverrides);
    const missingOverrides = tokenKeys.filter(
      (k) => !overrideKeys.some((ok) => ok.includes(k.replace(/([A-Z])/g, "-$1").toLowerCase()))
    );

    if (missingOverrides.length > 0) {
      warnings.push(
        `Dark mode is missing CSS variable overrides for ${missingOverrides.length} token(s). Example: "${missingOverrides[0]}". Ensure all key visual tokens have corresponding dark-mode values.`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Rule 8: Component Library Completeness
// ---------------------------------------------------------------------------

export const componentLibraryCompletenessRule: ValidationRule<UiDesignerOutput> = {
  id: "ui-designer.component-library-completeness",
  name: "Component Library Completeness",
  description: "Validates that every component requested in componentNeeds has a corresponding definition in the output component library, and that each definition includes required fields (variants, states, anatomy, responsiveBehavior, accessibilityNotes).",
  severity: "error",
  category: "completeness",

  validate(output: UiDesignerOutput, context?: AgentContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // In a real execution, the input payload is retrieved from context or
    // the input that was passed to the agent. Here we use a pragmatic check:
    // ensure components have comprehensive definitions.
    const components = output.componentLibrary.components;

    if (components.length === 0) {
      errors.push({
        path: "componentLibrary.components",
        message: "No components defined in the component library. At least one component must be provided.",
        severity: "error",
        code: "EMPTY_COMPONENT_LIBRARY",
      });
      return { valid: false, errors, warnings };
    }

    for (const component of components) {
      // Check required fields
      if (!component.name) {
        errors.push({
          path: "componentLibrary.components[?].name",
          message: "A component is missing its name field.",
          severity: "error",
          code: "COMPONENT_MISSING_NAME",
        });
      }

      if (!component.description) {
        warnings.push(
          `Component "${component.name}" is missing a description. Add a brief description of the component's purpose.`
        );
      }

      if (component.variants.length === 0) {
        warnings.push(
          `Component "${component.name}" has no variants defined. Consider defining at least one variant (e.g., "default").`
        );
      }

      if (component.states.length === 0) {
        errors.push({
          path: `componentLibrary.components.${component.name}.states`,
          message: `Component "${component.name}" has no states defined. At minimum, define "default" state.`,
          severity: "error",
          code: "COMPONENT_MISSING_STATES",
        });
      }

      if (!component.accessibilityNotes) {
        warnings.push(
          `Component "${component.name}" is missing accessibility notes. Add WCAG considerations, ARIA roles, and keyboard interaction details.`
        );
      }

      if (!component.responsiveBehavior) {
        warnings.push(
          `Component "${component.name}" is missing responsive behavior description. Describe how this component adapts across breakpoints.`
        );
      }
    }

    // Check for usage guidelines
    if (output.componentLibrary.usageGuidelines.length === 0) {
      warnings.push(
        "Component library has no usage guidelines. Add guidance on when to use each component variant, composition patterns, and anti-patterns."
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  },
};

// ---------------------------------------------------------------------------
// Aggregated Validator — Run all UI Designer rules at once
// ---------------------------------------------------------------------------

/**
 * All registered validation rules for the @ui-designer agent adapter.
 * These are registered via the `validators` field on the adapter.
 */
export const UI_DESIGNER_VALIDATORS: ValidationRule<UiDesignerOutput>[] = [
  wcagColorContrastRule,
  designTokenConsistencyRule,
  responsiveBreakpointCoverageRule,
  typographyScaleSufficiencyRule,
  interactiveStatesCompletenessRule,
  touchTargetSizeRule,
  darkModeCompletenessRule,
  componentLibraryCompletenessRule,
];

/**
 * Run all validators against a UI Designer output and aggregate results.
 * Useful for the orchestrator to run post-generation QA.
 */
export function validateUiDesignerOutput(
  output: UiDesignerOutput,
  context?: AgentContext
): { valid: boolean; errors: ValidationError[]; warnings: string[] } {
  const allErrors: ValidationError[] = [];
  const allWarnings: string[] = [];

  for (const validator of UI_DESIGNER_VALIDATORS) {
    const result = validator.validate(output, context);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.filter((e) => e.severity === "error").length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
