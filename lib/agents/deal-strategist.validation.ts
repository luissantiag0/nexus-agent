// ============================================================================
// Nexus Agent — @deal-strategist: Validation Rules
// ============================================================================
// MEDDPICC field completeness scoring, deal value bounds checking,
// stakeholder role validation, and input integrity checks.
// All functions return the base ValidationResult type used by the registry.
// ============================================================================

import type { ValidationResult, ValidationError, ValidationWarning } from "./types";
import type {
  DealStrategistInput,
  MeddpiccInput,
  StakeholderEntry,
} from "./deal-strategist.adapter";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum deal value in USD (below this is unlikely to be enterprise B2B). */
export const MIN_DEAL_VALUE = 10_000;

/** Maximum reasonable deal value in USD (flags potential data entry errors). */
export const MAX_DEAL_VALUE = 100_000_000;

/** Minimum number of MEDDPICC fields that must have data for qualification. */
export const MIN_MEDDPICC_FIELDS_POPULATED = 3;

/** Total core MEDDPICC fields in the framework. */
export const MEDDPICC_FIELD_COUNT = 8;

/** Valid pipeline stage names. */
export const VALID_STAGES = [
  "prospecting",
  "discovery",
  "qualification",
  "evaluation",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
] as const;

/** Valid stakeholder influence roles. */
export const VALID_STAKEHOLDER_INFLUENCES = [
  "decision-maker",
  "influencer",
  "evaluator",
  "user",
  "blocker",
] as const;

/** Valid stakeholder sentiments. */
export const VALID_STAKEHOLDER_SENTIMENTS = [
  "champion",
  "supporter",
  "neutral",
  "skeptic",
  "adversary",
] as const;

/** Valid currency codes (extensible). */
export const VALID_CURRENCIES = [
  "USD", "EUR", "GBP", "BRL", "ARS", "MXN",
  "CAD", "AUD", "CHF", "JPY", "CNY", "INR",
] as const;

// ---------------------------------------------------------------------------
// MEDDPICC Field Completeness Criteria
// ---------------------------------------------------------------------------

/**
 * MEDDPICC field completeness criteria — what constitutes a "populated" field.
 *
 * Each field has a weight (0.0-1.0) representing its contribution to the
 * overall qualification completeness score. Weights sum to 1.0 across all
 * 10 fields (8 core + 2 extended).
 */
export const MEDDPICC_COMPLETENESS_CRITERIA: Record<
  keyof MeddpiccInput,
  {
    weight: number;
    description: string;
    /** Sub-fields that must be present for the field to be considered "complete". */
    requiredSubFields: string[];
  }
> = {
  metrics: {
    weight: 0.15,
    description: "Quantifiable business outcome with baseline and target",
    requiredSubFields: ["description", "validatedByStakeholder"],
  },
  economicBuyer: {
    weight: 0.15,
    description: "Budget authority identified and accessible",
    requiredSubFields: ["name", "title", "accessLevel", "verified"],
  },
  decisionCriteria: {
    weight: 0.125,
    description: "Explicit evaluation criteria known and influenced",
    requiredSubFields: ["criteria"],
  },
  decisionProcess: {
    weight: 0.125,
    description: "Decision steps, approvals, and timeline mapped",
    requiredSubFields: ["steps", "approvalsRequired"],
  },
  paperProcess: {
    weight: 0.10,
    description: "Legal, security, and procurement requirements identified",
    requiredSubFields: ["legalReviewRequired", "securityReviewRequired"],
  },
  identifiedPain: {
    weight: 0.125,
    description: "Quantified business problem with cost of inaction",
    requiredSubFields: ["description", "validatedBy"],
  },
  champion: {
    weight: 0.125,
    description: "Internal advocate with power, access, and motivation",
    requiredSubFields: ["name", "title", "power", "access", "motivation"],
  },
  competition: {
    weight: 0.10,
    description: "Competitive landscape mapped and confirmed",
    requiredSubFields: ["competitors", "confirmedWithBuyer"],
  },
  implementation: {
    weight: 0.05,
    description: "Implementation timeline and complexity assessed",
    requiredSubFields: ["discussed"],
  },
  contract: {
    weight: 0.05,
    description: "Commercial terms and contract considerations",
    requiredSubFields: ["initiated"],
  },
};

// ---------------------------------------------------------------------------
// Stakeholder Role Validation
// ---------------------------------------------------------------------------

/**
 * Validate stakeholder roles against known B2B buying committee personas.
 */
export function validateStakeholderRoles(
  stakeholders: StakeholderEntry[],
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const seenDepartments = new Set<string>();

  for (let i = 0; i < stakeholders.length; i++) {
    const s = stakeholders[i];

    // Validate influence
    if (!VALID_STAKEHOLDER_INFLUENCES.includes(s.influence as any)) {
      errors.push({
        field: `stakeholders[${i}].influence`,
        message: `Invalid stakeholder influence: "${s.influence}". Must be one of: ${VALID_STAKEHOLDER_INFLUENCES.join(", ")}`,
        severity: "error",
      });
    }

    // Validate sentiment
    if (!VALID_STAKEHOLDER_SENTIMENTS.includes(s.sentiment as any)) {
      errors.push({
        field: `stakeholders[${i}].sentiment`,
        message: `Invalid stakeholder sentiment: "${s.sentiment}". Must be one of: ${VALID_STAKEHOLDER_SENTIMENTS.join(", ")}`,
        severity: "error",
      });
    }

    // Warn about missing department
    if (!s.department) {
      warnings.push({
        field: `stakeholders[${i}].department`,
        message: `Stakeholder "${s.name}" has no department specified. Department context helps assess influence patterns.`,
        severity: "warning",
      });
    }

    // Track departments for coverage analysis
    if (s.department) {
      seenDepartments.add(s.department.toLowerCase());
    }
  }

  // Advisory: single-department stakeholder coverage
  if (stakeholders.length > 0 && seenDepartments.size < 2) {
    warnings.push({
      field: "stakeholders",
      message: `All ${stakeholders.length} stakeholder(s) are from the same department. Multi-department engagement is critical for complex B2B deals.`,
      severity: "warning",
    });
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Deal Value Bounds Checking
// ---------------------------------------------------------------------------

/**
 * Validate that deal value is within reasonable bounds.
 */
export function validateDealValue(
  value: number,
  currency: string,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (value <= 0) {
    errors.push({
      field: "opportunity.displayValue",
      message: `Deal value must be positive. Received: ${value}`,
      severity: "error",
    });
  }

  if (value < MIN_DEAL_VALUE && value > 0) {
    warnings.push({
      field: "opportunity.displayValue",
      message: `Deal value ${formatValue(value, currency)} is below minimum threshold of ${formatValue(MIN_DEAL_VALUE, currency)}. Very small deals may not qualify for full MEDDPICC assessment.`,
      severity: "warning",
    });
  }

  if (value > MAX_DEAL_VALUE) {
    warnings.push({
      field: "opportunity.displayValue",
      message: `Deal value ${formatValue(value, currency)} exceeds maximum threshold of ${formatValue(MAX_DEAL_VALUE, currency)}. Verify accuracy.`,
      severity: "warning",
    });
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// MEDDPICC Field Completeness Scoring
// ---------------------------------------------------------------------------

/**
 * Score MEDDPICC input completeness (0.0 - 1.0).
 *
 * Evaluates each of the 10 fields (8 core + 2 extended) against their
 * required sub-fields. Returns aggregate score, populated count, and a
 * per-field breakdown.
 */
export function scoreMeddpiccCompleteness(
  meddpicc: MeddpiccInput,
): {
  overallScore: number;
  populatedFieldCount: number;
  totalFieldCount: number;
  perField: Record<
    string,
    { populated: boolean; completeness: number; missingSubFields: string[] }
  >;
} {
  const fields = Object.entries(MEDDPICC_COMPLETENESS_CRITERIA);
  let totalWeightedScore = 0;
  let populatedCount = 0;
  const perField: Record<string, any> = {};

  for (const [fieldName, criteria] of fields) {
    const fieldValue = (meddpicc as any)[fieldName];
    const missingSubFields: string[] = [];

    if (!fieldValue || typeof fieldValue !== "object") {
      perField[fieldName] = {
        populated: false,
        completeness: 0,
        missingSubFields: criteria.requiredSubFields,
      };
      continue;
    }

    for (const subField of criteria.requiredSubFields) {
      const value = fieldValue[subField];
      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        missingSubFields.push(subField);
      }
    }

    const subFieldCount = criteria.requiredSubFields.length;
    const presentCount = subFieldCount - missingSubFields.length;
    const completeness = subFieldCount > 0 ? presentCount / subFieldCount : 0;

    perField[fieldName] = {
      populated: completeness >= 0.5,
      completeness,
      missingSubFields,
    };

    if (completeness >= 0.5) {
      populatedCount++;
    }

    totalWeightedScore += completeness * criteria.weight;
  }

  return {
    overallScore: Math.min(totalWeightedScore, 1.0),
    populatedFieldCount: populatedCount,
    totalFieldCount: fields.length,
    perField,
  };
}

// ---------------------------------------------------------------------------
// Stage Validation
// ---------------------------------------------------------------------------

/**
 * Validate that the pipeline stage is recognized.
 */
export function validateStage(
  stage: string,
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const normalized = stage?.toLowerCase().trim() ?? "";

  if (!normalized) {
    errors.push({
      field: "opportunity.stage",
      message: "Pipeline stage is required.",
      severity: "error",
    });
    return { errors, warnings };
  }

  if (!(VALID_STAGES as readonly string[]).includes(normalized)) {
    warnings.push({
      field: "opportunity.stage",
      message: `Unrecognized pipeline stage: "${stage}". Expected one of: ${VALID_STAGES.join(", ")}`,
      severity: "warning",
    });
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Comprehensive Input Validation
// ---------------------------------------------------------------------------

/**
 * Full input validation for the @deal-strategist agent.
 * Returns a ValidationResult compatible with the AgentRegistry.
 *
 * Checks performed:
 *  1. Opportunity metadata completeness
 *  2. Deal value bounds
 *  3. Pipeline stage recognition
 *  4. MEDDPICC field completeness (minimum populated fields)
 *  5. Per-field MEDDPICC gaps (warnings)
 *  6. Stakeholder role validity
 *  7. Multi-department coverage
 *  8. Competitive landscape presence
 */
export function validateDealStrategistInput(
  raw: Record<string, unknown>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ---- Opportunity validation ----
  const opp = raw.opportunity as Record<string, unknown> | undefined;

  if (!opp || typeof opp !== "object") {
    errors.push({
      field: "opportunity",
      message: "opportunity is required and must be an object with name, displayValue, currency, stage, and closeDate.",
      severity: "error",
    });
  } else {
    if (!opp.name || typeof opp.name !== "string") {
      errors.push({
        field: "opportunity.name",
        message: "opportunity.name is required and must be a non-empty string.",
        severity: "error",
      });
    }

    if (opp.displayValue !== undefined && typeof opp.displayValue === "number") {
      const currency = (opp.currency as string) ?? "USD";
      const { errors: valErrors, warnings: valWarnings } = validateDealValue(
        opp.displayValue as number,
        currency,
      );
      errors.push(...valErrors);
      warnings.push(...valWarnings);
    }

    if (opp.stage && typeof opp.stage === "string") {
      const { errors: stageErrors, warnings: stageWarnings } = validateStage(opp.stage);
      errors.push(...stageErrors);
      warnings.push(...stageWarnings);
    }
  }

  // ---- MEDDPICC validation ----
  const meddpicc = raw.meddpicc as MeddpiccInput | undefined;

  if (!meddpicc || typeof meddpicc !== "object") {
    errors.push({
      field: "meddpicc",
      message: "MEDDPICC data is required. At least 3 fields must be populated for a meaningful assessment.",
      severity: "error",
    });
  } else {
    const completeness = scoreMeddpiccCompleteness(meddpicc);

    if (completeness.populatedFieldCount < MIN_MEDDPICC_FIELDS_POPULATED) {
      errors.push({
        field: "meddpicc",
        message: `Insufficient MEDDPICC data: only ${completeness.populatedFieldCount}/${completeness.totalFieldCount} fields populated (minimum ${MIN_MEDDPICC_FIELDS_POPULATED} required).`,
        severity: "error",
      });
    }

    // Surface field-level gaps as warnings
    for (const [fieldName, result] of Object.entries(completeness.perField)) {
      if (!result.populated && result.missingSubFields.length > 0) {
        warnings.push({
          field: `meddpicc.${fieldName}`,
          message: `MEDDPICC field "${fieldName}" is incomplete. Missing: ${result.missingSubFields.join(", ")}`,
          severity: "warning",
        });
      }
    }
  }

  // ---- Stakeholder validation ----
  const stakeholders = raw.stakeholders as StakeholderEntry[] | undefined;

  if (!stakeholders || !Array.isArray(stakeholders) || stakeholders.length === 0) {
    warnings.push({
      field: "stakeholders",
      message: "No stakeholders provided. At minimum, map the primary contact and champion.",
      severity: "warning",
    });
  } else {
    const { errors: shErrors, warnings: shWarnings } = validateStakeholderRoles(stakeholders);
    errors.push(...shErrors);
    warnings.push(...shWarnings);
  }

  // ---- Competitive landscape validation ----
  const compLandscape = raw.competitiveLandscape as Record<string, unknown> | undefined;

  if (!compLandscape || typeof compLandscape !== "object") {
    warnings.push({
      field: "competitiveLandscape",
      message: "No competitive landscape provided. Every deal has competition — even if it's 'do nothing'. Defaulting to 'do nothing' as competitor.",
      severity: "warning",
    });
  } else {
    const competitors = compLandscape.competitors as Array<unknown> | undefined;
    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      warnings.push({
        field: "competitiveLandscape.competitors",
        message: "No competitors identified. Every deal has competition — add known competitors or 'do nothing'.",
        severity: "warning",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a currency value for display in error/warning messages.
 */
function formatValue(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", BRL: "R$", ARS: "$",
    MXN: "$", CAD: "$", AUD: "$", CHF: "Fr", JPY: "¥",
  };
  const symbol = symbols[currency] ?? currency + " ";
  return `${symbol}${value.toLocaleString()}`;
}
