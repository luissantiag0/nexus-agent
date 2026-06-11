# @ui-designer — Execution Flow Examples

This document demonstrates how the UI Designer agent adapter integrates into the Nexus Agent Orchestration Engine across three execution modes: **single**, **chain**, and **multi-agent**.

---

## 1. Single Agent Execution

**Scenario**: A product team needs a component library spec for a new design system, without upstream dependencies.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Orchestrator                                                    │
│                                                                  │
│  AgentInput<UiDesignerInput>                                     │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ designBrief: { projectName, overview, coreUserTasks } │        │
│  │ brandGuidelines: { brandPrimaryColor, brandFont }     │        │
│  │ uxRequirements: { screens, userFlows }               │        │
│  │ userPersonas: [{ name, role, goals, painPoints }]    │        │
│  │ platform: ["web", "mobile"]                          │        │
│  │ componentNeeds: [{ name, variants, states }]         │        │
│  │ accessibilityTarget: "WCAG-AA"                       │        │
│  └──────────────────────────────────────────────────────┘        │
│                           │                                       │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────┐        │
│  │         Agent Registry — @ui-designer                 │        │
│  │                                                       │        │
│  │  1. resolvePrompt({ design_brief, brand_guidelines,   │        │
│  │     platform, component_needs, accessibility_target,  │        │
│  │     user_personas })                                  │        │
│  │                                                       │        │
│  │  2. Execute LLM call with system prompt               │        │
│  │     (lib/agents/prompts/ui-designer.v1.prompt.yaml)   │        │
│  │                                                       │        │
│  │  3. Parse structured output into UiDesignerOutput     │        │
│  │                                                       │        │
│  │  4. Run validators:                                   │        │
│  │     ├─ wcagColorContrastRule                          │        │
│  │     ├─ touchTargetSizeRule                            │        │
│  │     ├─ responsiveBreakpointCoverageRule               │        │
│  │     ├─ designTokenConsistencyRule                     │        │
│  │     ├─ typographyScaleSufficiencyRule                 │        │
│  │     └─ interactiveStatesCompletenessRule              │        │
│  │                                                       │        │
│  │  5. Write context keys:                               │        │
│  │     ├─ designSystem                                   │        │
│  │     ├─ componentLibrary                               │        │
│  │     ├─ accessibilityAudit                             │        │
│  │     ├─ designTokens                                   │        │
│  │     └─ brandGuidelines                                │        │
│  └──────────────────────────────────────────────────────┘        │
│                           │                                       │
│                           ▼                                       │
│  AgentOutput<UiDesignerOutput>                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ designSystem: {     // Full design system spec        │        │
│  │   colorPalette, typographyScale, spacingGrid,         │        │
│  │   shadows, borderRadius, opacity, transitions,        │        │
│  │   zIndex, darkMode?                                   │        │
│  │ }                                                     │        │
│  │ componentLibrary: {   // Component definitions        │        │
│  │   components: [{ name, variants, states, anatomy,     │        │
│  │     responsiveBehavior, accessibilityNotes }]         │        │
│  │ }                                                     │        │
│  │ designTokens: { css, scss, json, tailwind?, figma? }  │        │
│  │ accessibilityAudit: { colorContrast, touchTargets,    │        │
│  │   keyboardNavigation, screenReader, motion, zoom }    │        │
│  │ responsiveFramework: { strategy, breakpoints,         │        │
│  │   containerMaxWidths, gridColumns }                   │        │
│  │ brandGuidelineCompliance: { compliant, exceptions }   │        │
│  └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Orchestrator Invocation (JSON)

```jsonc
// POST /api/nexus/agents/execute
{
  "agentId": "design-ui-designer",
  "input": {
    "schema": "ui-designer-input.v1",
    "schemaVersion": "1.0.0",
    "payload": {
      "designBrief": {
        "projectName": "Analytics Dashboard",
        "overview": "Redesign the main analytics dashboard for SaaS platform",
        "coreUserTasks": [
          "View daily/weekly KPI trends",
          "Filter data by date range and segment",
          "Export reports as PDF/CSV"
        ],
        "constraints": ["Must work with existing React codebase"]
      },
      "brandGuidelines": {
        "brandPrimaryColor": "#7c3aed",
        "brandFont": "Inter"
      },
      "uxRequirements": {
        "screens": ["Dashboard Home", "Analytics Detail", "Report Builder"],
        "userFlows": ["Login → Dashboard → Filter → Export"],
        "interactionPatterns": ["Filter bar", "Date range picker", "Data table with pagination"]
      },
      "userPersonas": [
        {
          "name": "Alex",
          "role": "Operations Manager",
          "goals": ["Monitor key metrics daily", "Identify trends quickly"],
          "painPoints": ["Too many clicks to find data", "Charts not interactive"],
          "devicePreference": "desktop-first",
          "techComfortLevel": "medium"
        }
      ],
      "platform": ["web", "tablet"],
      "componentNeeds": [
        {
          "name": "Button",
          "variants": ["primary", "secondary", "ghost"],
          "states": ["default", "hover", "active", "disabled", "focus", "loading"]
        },
        {
          "name": "DataTable",
          "variants": ["default", "compact", "expandable"],
          "states": ["default", "loading", "empty", "error"]
        },
        {
          "name": "DateRangePicker",
          "variants": ["single", "range", "preset"],
          "states": ["default", "focus", "disabled", "error"]
        },
        {
          "name": "FilterBar",
          "variants": ["inline", "dropdown", "sidebar"],
          "states": ["default", "active", "collapsed"]
        }
      ],
      "accessibilityTarget": "WCAG-AA",
      "darkMode": true
    },
    "correlationId": "ctx-20260611-a1b2c3d4"
  }
}
```

### Output Summary

```jsonc
{
  "schema": "ui-designer-output.v1",
  "schemaVersion": "1.0.0",
  "payload": {
    "designSystem": {
      "projectName": "Analytics Dashboard",
      "version": "1.0.0",
      "colorPalette": {
        "primary": [
          { "tokenName": "primary-50", "hex": "#f5f3ff", "cssVariable": "--color-primary-50", "usage": "Light backgrounds, hover states", "contrastOnWhite": 1.1, "contrastOnBlack": 15.3, "wcagLevel": "AA", "darkModeEquivalent": "#1e1b4b" },
          { "tokenName": "primary-500", "hex": "#7c3aed", "cssVariable": "--color-primary-500", "usage": "Primary buttons, links, active states", "contrastOnWhite": 6.8, "contrastOnBlack": 3.1, "wcagLevel": "AA", "darkModeEquivalent": "#a78bfa" },
          { "tokenName": "primary-900", "hex": "#2e1065", "cssVariable": "--color-primary-900", "usage": "High-contrast text on light backgrounds", "contrastOnWhite": 12.5, "contrastOnBlack": 1.7, "wcagLevel": "AAA" }
        ],
        "semantic": { /* success, warning, error, info with contrast checks */ },
        "neutral": [ /* 10-step grayscale from 50 to 950 */ ]
      },
      "typographyScale": {
        "fontFamilies": { "primary": "'Inter', system-ui, sans-serif", "monospace": "'JetBrains Mono', monospace" },
        "scale": [
          { "token": "--font-size-xs", "size": "0.75rem", "px": 12, "lineHeight": 1.5, "weight": 400, "usage": "Captions, labels, metadata" },
          { "token": "--font-size-sm", "size": "0.875rem", "px": 14, "lineHeight": 1.5, "weight": 400, "usage": "Body text secondary" },
          { "token": "--font-size-base", "size": "1rem", "px": 16, "lineHeight": 1.5, "weight": 400, "usage": "Body text primary" },
          { "token": "--font-size-lg", "size": "1.125rem", "px": 18, "lineHeight": 1.4, "weight": 500, "usage": "Section headings" },
          { "token": "--font-size-xl", "size": "1.25rem", "px": 20, "lineHeight": 1.4, "weight": 600, "usage": "Card titles" },
          { "token": "--font-size-2xl", "size": "1.5rem", "px": 24, "lineHeight": 1.3, "weight": 600, "usage": "Page headings" },
          { "token": "--font-size-3xl", "size": "1.875rem", "px": 30, "lineHeight": 1.2, "weight": 700, "usage": "Section hero headings" }
        ]
      },
      "spacingGrid": { "baseUnit": 4, "scale": { "space-1": "4px", "space-2": "8px", "space-3": "12px", "space-4": "16px", "space-6": "24px", "space-8": "32px", "space-12": "48px", "space-16": "64px" } },
      "darkMode": { "enabled": true, "strategy": "class", "tokenOverrides": { "--color-primary-500": "#a78bfa", /* ... */ } }
    },
    "componentLibrary": {
      "components": [
        {
          "name": "Button",
          "description": "Triggers an action or navigates to a destination.",
          "variants": [
            { "name": "primary", "description": "Highest emphasis action", "cssClass": "btn btn--primary" },
            { "name": "secondary", "description": "Medium emphasis alternate action", "cssClass": "btn btn--secondary" },
            { "name": "ghost", "description": "Low emphasis, minimal visual weight", "cssClass": "btn btn--ghost" }
          ],
          "states": [
            { "name": "default", "description": "Resting state" },
            { "name": "hover", "description": "Cursor is over the button", "cssPseudoClass": ":hover" },
            { "name": "active", "description": "Button is pressed", "cssPseudoClass": ":active" },
            { "name": "disabled", "description": "Action is unavailable", "cssPseudoClass": ":disabled" },
            { "name": "focus", "description": "Keyboard focus indicator", "cssPseudoClass": ":focus-visible" },
            { "name": "loading", "description": "Action is processing" }
          ],
          "anatomy": [
            { "part": "container", "description": "Outer bounding box with padding and border", "cssSelector": ".btn" },
            { "part": "label", "description": "Text or icon conveying the action" },
            { "part": "spinner", "description": "Loading indicator (visible in loading state)" }
          ],
          "responsiveBehavior": "Full-width on mobile (<640px), auto-width on tablet and desktop.",
          "accessibilityNotes": "44px minimum height. Focus-visible ring: 2px solid var(--color-primary-500) with 2px offset. ARIA: aria-busy when loading, aria-disabled when disabled.",
          "codeSnippet": "<button class=\"btn btn--primary\" aria-busy=\"false\">\n  <span class=\"btn__label\">Save Changes</span>\n</button>"
        }
        // DataTable, DateRangePicker, FilterBar...
      ],
      "usageGuidelines": [
        "Use Button--primary once per view for the primary action",
        "Use DataTable--compact for dense data views on desktop",
        "Always include empty state illustration for DataTable"
      ]
    },
    "accessibilityAudit": {
      "targetLevel": "WCAG-AA",
      "achievedLevel": "WCAG-AA",
      "colorContrast": { "passesAA": true, "passesAAA": false, "failures": [] },
      "touchTargets": { "minimumSize": 44, "compliant": true, "exceptions": [] },
      "keyboardNavigation": { "focusIndicators": true, "logicalTabOrder": true, "skipLinks": true },
      "screenReader": { "semanticStructure": true, "ariaLabels": true, "altText": true },
      "motion": { "respectsPrefersReducedMotion": true, "animationsDefined": true },
      "zoom": { "supports200PercentZoom": true }
    },
    "responsiveFramework": {
      "strategy": "mobile-first",
      "breakpoints": [
        { "name": "sm", "minWidth": 640, "mediaQuery": "@media (min-width: 640px)", "targetDevice": "Mobile landscape / Small tablet" },
        { "name": "md", "minWidth": 768, "mediaQuery": "@media (min-width: 768px)", "targetDevice": "Tablet portrait" },
        { "name": "lg", "minWidth": 1024, "mediaQuery": "@media (min-width: 1024px)", "targetDevice": "Desktop" },
        { "name": "xl", "minWidth": 1280, "mediaQuery": "@media (min-width: 1280px)", "targetDevice": "Large desktop" }
      ],
      "containerMaxWidths": { "sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px" },
      "gridColumns": { "default": 4, "sm": 4, "md": 8, "lg": 12, "xl": 12 }
    },
    "brandGuidelineCompliance": {
      "compliant": true,
      "exceptions": [],
      "recommendations": [
        "Consider adding a brand secondary color for expanded palette options"
      ]
    }
  },
  "performance": {
    "startedAt": "2026-06-11T10:00:00.000Z",
    "completedAt": "2026-06-11T10:00:12.345Z",
    "tokensUsed": 8450,
    "steps": 7
  }
}
```

---

## 2. Chain Execution

**Scenario**: @engineering-backend-architect produces UX requirements → @ui-designer generates the design system from those requirements.

### Flow Diagram

```
┌──────────────────────┐     ┌──────────────────────────┐
│ @engineering-backend │     │      @ui-designer         │
│     -architect       │     │                           │
│                      │     │  Reads from context:      │
│  Writes to context:  │────►│  ├─ brandGuidelines        │
│  ├─ uxRequirements   │     │  ├─ uxRequirements (new)  │
│  ├─ dataModels       │     │  └─ userPersonas (new)    │
│  └─ systemConstraints│     │                           │
│                      │     │  Writes to context:       │
│                      │     │  ├─ designSystem          │
│                      │     │  ├─ componentLibrary      │
│                      │     │  ├─ accessibilityAudit    │
│                      │     │  └─ designTokens          │
└──────────────────────┘     └──────────────────────────┘
```

### Orchestrator Plan (JSON)

```jsonc
{
  "planId": "chain-20260611-b2c3d4e5",
  "executionMode": "chain",
  "chain": ["engineering-backend-architect", "design-ui-designer"],
  "contextSeeds": {
    "brandGuidelines": {
      "brandPrimaryColor": "#3b82f6",
      "brandFont": "Inter"
    }
  },
  "steps": [
    {
      "agentId": "engineering-backend-architect",
      "input:payload": {
        "systemRequirements": {
          "projectName": "SaaS Dashboard v2",
          "dataVolume": "100k+ daily events",
          "techStack": "Next.js 16 + PostgreSQL + Redis"
        },
        "outputRequirements": ["API architecture", "data schema", "UX constraints"]
      }
    },
    {
      "agentId": "design-ui-designer",
      "input:payload": {
        "designBrief": {
          "projectName": "SaaS Dashboard v2",
          "overview": "Analytics dashboard for enterprise customers",
          "coreUserTasks": ["View real-time metrics", "Create custom reports"]
        },
        // brandGuidelines, uxRequirements, userPersonas populated from context
        "platform": ["web", "tablet"],
        "componentNeeds": [
          { "name": "MetricCard", "variants": ["default", "trend", "comparison"], "states": ["default", "loading", "error"] },
          { "name": "ChartContainer", "variants": ["line", "bar", "pie"], "states": ["default", "loading", "empty", "error"] },
          { "name": "ReportBuilder", "variants": ["simple", "advanced"], "states": ["default", "dragging", "saving", "error"] }
        ],
        "accessibilityTarget": "WCAG-AA"
      }
    }
  ]
}
```

### Context State Flow

| Step | Agent | Context Writes |
|------|-------|---------------|
| 0 | _(seed)_ | `brandGuidelines` |
| 1 | @engineering-backend-architect | `uxRequirements`, `dataModels`, `systemConstraints`, `userPersonas` |
| 2 | @ui-designer | `designSystem`, `componentLibrary`, `accessibilityAudit`, `designTokens` |

### Key Integration Points

1. **@engineering-backend-architect** defines the `uxRequirements` including screen layouts, navigation structure, user flows, and interaction patterns based on data models and system constraints.

2. **@ui-designer** reads those requirements and supplements them with visual design expertise:
   - Translates `navigationStructure` into a navigation component system
   - Maps `userFlows` to component interaction patterns
   - Aligns `dataModels` to data display components (DataTable, MetricCard, ChartContainer)
   - Adjusts `systemConstraints` (e.g., SSR requirements) into CSS strategies (progressive enhancement)

3. **Output consistency**: The `componentLibrary` references the `dataModels` from the backend architect, ensuring component props align with data shapes.

---

## 3. Multi-Agent Execution (DAG)

**Scenario**: Full product lifecycle — @product-manager defines the feature specification → @ui-designer creates the design system → @engineering-backend-architect builds the implementation architecture.

### Flow Diagram

```
┌─────────────────┐
│ @product-manager │
│                  │
│  Writes:         │
│  ├─ featureSpec  │
│  ├─ userStories  │
│  ├─ successMetrics
│  └─ userPersonas │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────┐
│ @ui-designer    │     │ @engineering-backend         │
│                  │     │   -architect                 │
│  Reads:          │     │                              │
│  ├─ featureSpec  │     │  Reads:                      │
│  ├─ userStories  │     │  ├─ featureSpec              │
│  ├─ userPersonas │     │  ├─ designSystem (for tokens)│
│  └─ brandGuidelines    │  └─ componentLibrary         │
│                  │     │                              │
│  Writes:         │     │  Writes:                     │
│  ├─ designSystem │     │  ├─ apiArchitecture          │
│  ├─ componentLib │     │  ├─ dataSchema               │
│  ├─ accessAudit  │     │  ├─ systemArchitecture       │
│  └─ designTokens │     │  └─ deploymentPlan           │
└────────┬─────────┘     └──────────────┬───────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
              ┌─────────────────┐
              │ Orchestrator    │
              │ Merge & QA      │
              │                 │
              │ Validates:      │
              │ ├─ Schema match │
              │ ├─ Token align  │
              │ └─ No conflicts │
              └─────────────────┘
```

### Orchestrator Plan (JSON)

```jsonc
{
  "planId": "dag-20260611-c3d4e5f6",
  "executionMode": "dag",
  "steps": [
    // ---- Phase 1: Product Definition ----
    {
      "id": "step-1",
      "agentId": "product-manager",
      "dependsOn": [],
      "input:payload": {
        "initiative": "Customer Health Score Feature",
        "businessGoal": "Reduce churn by 15% by identifying at-risk customers early",
        "stakeholders": ["Customer Success", "Sales", "Engineering"],
        "constraints": ["Must integrate with existing customer data pipeline"]
      }
    },

    // ---- Phase 2: Design + Architecture (parallel) ----
    {
      "id": "step-2a",
      "agentId": "design-ui-designer",
      "dependsOn": ["step-1"],
      "input:payload": {
        "designBrief": {
          "projectName": "Customer Health Score",
          "overview": "A dashboard feature that displays customer health scores, risk indicators, and recommended actions for the Customer Success team.",
          "coreUserTasks": [
            "View all customer health scores in a sortable list",
            "Drill into individual customer health details",
            "See trend lines for key health metrics over time"
          ]
        },
        "brandGuidelines": { "brandPrimaryColor": "#059669", "brandFont": "Inter" },
        "platform": ["web"],
        "componentNeeds": [
          { "name": "HealthScoreGauge", "variants": ["circular", "linear", "mini"], "states": ["default", "loading", "error"] },
          { "name": "RiskBadge", "variants": ["healthy", "warning", "critical"], "states": ["default"] },
          { "name": "CustomerHealthTable", "variants": ["default"], "states": ["default", "loading", "empty", "error", "sorting", "filtering"] },
          { "name": "MetricTrendSparkline", "variants": ["up", "down", "flat"], "states": ["default", "loading"] }
        ],
        "accessibilityTarget": "WCAG-AA"
      }
    },
    {
      "id": "step-2b",
      "agentId": "engineering-backend-architect",
      "dependsOn": ["step-1"],
      "input:payload": {
        "systemRequirements": {
          "projectName": "Customer Health Score Backend",
          "dataVolume": "50k customers, 500k health events/day",
          "techStack": "Next.js 16, PostgreSQL, Redis"
        }
      }
    },

    // ---- Phase 3: Integration (merge outputs) ----
    {
      "id": "step-3",
      "agentId": "agents-orchestrator",
      "dependsOn": ["step-2a", "step-2b"],
      "description": "Resolve cross-references between design tokens and component props defined in the design system, and the API/data schemas defined by the backend architect. Verify all design tokens used in components have corresponding CSS custom properties. Check that backend data shapes match component prop types."
    }
  ]
}
```

### Context State Flow

| Step | Agent | Reads | Writes |
|------|-------|-------|--------|
| 1 | @product-manager | _(none)_ | `featureSpec`, `userStories`, `successMetrics`, `userPersonas` |
| 2a | @ui-designer | `featureSpec`, `userStories`, `userPersonas` | `designSystem`, `componentLibrary`, `accessibilityAudit`, `designTokens` |
| 2b | @engineering-backend-architect | `featureSpec`, `userStories` | `apiArchitecture`, `dataSchema`, `systemArchitecture` |
| 3 | @agents-orchestrator | `designSystem`, `componentLibrary`, `designTokens`, `dataSchema`, `apiArchitecture` | _(merged & validated output)_ |

### Cross-Agent Contract Verification

After execution, the orchestrator runs these cross-agent validations:

```typescript
// lib/agents/validation/cross-agent-validators.ts

export const designTokenApiConsistencyRule: ValidationRule<UiDesignerOutput> = {
  id: "cross-agent.token-api-consistency",
  name: "Design Token ↔ API Schema Consistency",
  description: "Ensures component props defined in the design system align with API response shapes from the backend architect.",
  severity: "error",
  validate(output: UiDesignerOutput, context?: AgentContext): ValidationResult {
    const dataSchema = context?.get("dataSchema");
    const errors: ValidationError[] = [];
    // ... validation logic comparing component prop types vs. API response types
    return { valid: errors.length === 0, errors, warnings: [] };
  }
};
```

---

## Summary

| Mode | Agents | Use Case |
|------|--------|----------|
| **Single** | @ui-designer alone | Generate a design system from a brief |
| **Chain** | @engineering-backend-architect → @ui-designer | Translate UX/system requirements into visual design |
| **Multi-agent (DAG)** | @product-manager → @ui-designer + @engineering-backend-architect → merge | Full feature lifecycle from spec through design to architecture |
