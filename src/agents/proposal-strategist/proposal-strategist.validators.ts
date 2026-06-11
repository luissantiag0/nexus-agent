// ============================================================================
// Nexus Agent Platform — Validation Rules
// Agent: @proposal-strategist
// Description: Input, output, and consistency validation rules for the
//              proposal-strategist agent adapter.
// ============================================================================

import type {
  ProposalStrategistInput,
  ProposalStrategistOutput,
  WinThemeFinal,
  CompetitorProfile,
  RfpRequirement,
  EvaluationCriterion,
  DealQualificationContext,
} from "./proposal-strategist.adapter";

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: "warning";
}

export type ValidationSeverity = "error" | "warning";

// ============================================================================
// RFP Requirement Coverage Check
// ============================================================================

/**
 * Validates that every mandatory RFP requirement has a corresponding response
 * section in the output outline, and that the response type matches.
 *
 * Rule: RFP_REQUIREMENT_COVERAGE
 * Severity: ERROR (missing mandatory requirements are disqualifying)
 */
export function validateRfpRequirementCoverage(
  requirements: RfpRequirement[],
  outputSections: { sectionId: string; rfpReference: string; title: string }[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const req of requirements) {
    const match = outputSections.find(
      (s) => s.rfpReference === req.id || s.rfpReference === req.section,
    );

    if (!match && req.mandatory) {
      errors.push({
        code: "RFP_REQ_MISSING_MANDATORY",
        field: `requirements[${req.id}]`,
        message: `Mandatory RFP requirement "${req.id}" (${req.description}) has no matching response section in the proposal outline. This is a disqualifying gap.`,
        severity: "error",
      });
    } else if (!match) {
      warnings.push({
        code: "RFP_REQ_MISSING_OPTIONAL",
        field: `requirements[${req.id}]`,
        message: `Optional RFP requirement "${req.id}" is not mapped to a response section. Consider whether it should be addressed for competitive completeness.`,
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

/**
 * Validates that mandatory certification and pricing requirements have
 * explicit compliance responses (not just narrative coverage).
 *
 * Rule: RFP_RESPONSE_TYPE_COMPLIANCE
 * Severity: ERROR
 */
export function validateResponseTypeCompliance(
  requirements: RfpRequirement[],
  complianceChecklist: { requirementId: string; compliant: boolean; responseType?: string }[],
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const req of requirements.filter((r) => r.responseType === "certification" || r.responseType === "pricing")) {
    const checklistItem = complianceChecklist.find((c) => c.requirementId === req.id);

    if (!checklistItem) {
      errors.push({
        code: "RFP_RESPONSE_TYPE_MISSING",
        field: `requirements[${req.id}]`,
        message: `Requirement "${req.id}" expects a "${req.responseType}" response, but no compliance checklist entry was found. Must provide explicit ${req.responseType} documentation.`,
        severity: "error",
      });
    } else if (!checklistItem.compliant) {
      errors.push({
        code: "RFP_RESPONSE_TYPE_NOT_COMPLIANT",
        field: `requirements[${req.id}]`,
        message: `Requirement "${req.id}" (${req.responseType}) is marked as not compliant. This must be resolved before submission.`,
        severity: "error",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

// ============================================================================
// Win Theme Consistency with Deal-Strategist Output
// ============================================================================

/**
 * Validates that win themes are consistent with the @deal-strategist's MEDDPICC
 * output. Specifically:
 * - The win theme's client need must align with the identified pain from
 *   deal qualification
 * - Win themes must address the decision criteria surfaced during qualification
 * - Win themes should not contradict the deal verdict assessment
 *
 * Rule: WIN_THEME_DEAL_ALIGNMENT
 * Severity: WARNING (misalignment may reduce effectiveness but is not fatal)
 */
export function validateWinThemeDealAlignment(
  winThemes: WinThemeFinal[],
  dealQualification: DealQualificationContext | undefined,
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  if (!dealQualification) {
    return {
      valid: true,
      errors: [],
      warnings: [
        {
          code: "DEAL_QUAL_MISSING",
          field: "dealQualification",
          message: "No @deal-strategist qualification data provided. Win themes cannot be validated against MEDDPICC insights. Consider running @deal-strategist first for stronger alignment.",
          severity: "warning",
        },
      ],
    };
  }

  // Check 1: At least one win theme references the identified pain
  const identifiedPain = dealQualification.identifiedPain.toLowerCase();
  const painReferenced = winThemes.some(
    (wt) =>
      wt.clientNeed.toLowerCase().includes(identifiedPain.slice(0, 30)) ||
      wt.proofPoint.toLowerCase().includes(identifiedPain.slice(0, 30)),
  );

  if (!painReferenced) {
    warnings.push({
      code: "WIN_THEME_PAIN_MISALIGN",
      field: "winThemes",
      message: `None of the win themes explicitly reference the identified pain from deal qualification: "${dealQualification.identifiedPain}". At least one theme should directly address this pain point.`,
      severity: "warning",
    });
  }

  // Check 2: Win themes collectively cover the decision criteria
  const criteriaCovered = dealQualification.decisionCriteria.filter((criteria) => {
    const criteriaLower = criteria.toLowerCase();
    return winThemes.some(
      (wt) =>
        wt.clientNeed.toLowerCase().includes(criteriaLower) ||
        wt.title.toLowerCase().includes(criteriaLower) ||
        wt.ourDifferentiator.toLowerCase().includes(criteriaLower),
    );
  });

  const uncoveredCriteria = dealQualification.decisionCriteria.filter(
    (c) => !criteriaCovered.includes(c),
  );

  if (uncoveredCriteria.length > 0) {
    warnings.push({
      code: "WIN_THEME_CRITERIA_GAP",
      field: "winThemes",
      message: `Win themes do not explicitly address the following decision criteria from deal qualification: "${uncoveredCriteria.join('", "')}". Consider strengthening theme coverage or adding a theme aligned to these criteria.`,
      severity: "warning",
    });
  }

  // Check 3: Deal verdict consistency
  if (dealQualification.dealVerdict === "Losing" && winThemes.length > 2) {
    warnings.push({
      code: "WIN_THEME_VERDICT_MISMATCH",
      field: "winThemes",
      message: `Deal qualification verdict is "Losing" but ${winThemes.length} win themes are proposed. Consider either (a) reducing scope to 1-2 highly defensible themes, or (b) re-evaluating the deal qualification — a losing deal with 5 themes suggests the strategy is not focused on the critical path to win.`,
      severity: "warning",
    });
  }

  return {
    valid: warnings.filter((w) => w.code === "WIN_THEME_CRITERIA_GAP").length <
      dealQualification.decisionCriteria.length, // valid if not ALL criteria are uncovered
    errors: [],
    warnings,
  };
}

/**
 * Validates that win themes pass the specificity and provability stress tests.
 *
 * Rule: WIN_THEME_QUALITY
 * Severity: ERROR for unprovable claims; WARNING for weak specificity
 */
export function validateWinThemeQuality(winThemes: WinThemeFinal[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const emptyAdjectives = ["robust", "cutting-edge", "best-in-class", "world-class", "innovative", "state-of-the-art", "leading"];

  for (const theme of winThemes) {
    // Check for empty adjectives in title and differentiator
    for (const adj of emptyAdjectives) {
      const regex = new RegExp(`\\b${adj}\\b`, "i");
      if (regex.test(theme.title) || regex.test(theme.ourDifferentiator)) {
        warnings.push({
          code: "WIN_THEME_EMPTY_ADJECTIVE",
          field: `winThemes[${theme.id}]`,
          message: `Win theme "${theme.title}" uses the empty adjective "${adj}". Replace with a specific, measurable claim.`,
          severity: "warning",
        });
      }
    }

    // Check that proof point contains specific evidence (metrics or named reference)
    const hasMetric = /\d+%|\$\d+|\d+x|\d+ pipelines|\d+ days|\d+ months/i.test(theme.proofPoint);
    const hasReference = /[A-Z][a-z]+ (Bank|Corp|Inc|LLC|Limited|Insurance|Financial|Health|University)/.test(theme.proofPoint);

    if (!hasMetric && !hasReference) {
      errors.push({
        code: "WIN_THEME_UNPROVABLE",
        field: `winThemes[${theme.id}]`,
        message: `Win theme "${theme.title}" has no specific evidence in its proof point. Every theme must reference a metric, a named client engagement, or a verified methodology outcome. Current proof point: "${theme.proofPoint}"`,
        severity: "error",
      });
    }

    // Check that integration points include the three key sections
    const requiredSections = ["executive summary", "technical approach", "pricing"];
    const hasExecutiveSummary = theme.integrationPoints.some((p) =>
      p.toLowerCase().includes("executive summary"),
    );
    const hasTechnical = theme.integrationPoints.some((p) =>
      p.toLowerCase().includes("technical") || p.toLowerCase().includes("solution"),
    );
    const hasPricing = theme.integrationPoints.some((p) =>
      p.toLowerCase().includes("pricing"),
    );

    if (!hasExecutiveSummary) {
      warnings.push({
        code: "WIN_THEME_MISSING_EXEC_SUMMARY",
        field: `winThemes[${theme.id}]`,
        message: `Win theme "${theme.title}" does not appear in the Executive Summary. All win themes must surface there.`,
        severity: "warning",
      });
    }

    if (!hasTechnical) {
      warnings.push({
        code: "WIN_THEME_MISSING_TECHNICAL",
        field: `winThemes[${theme.id}]`,
        message: `Win theme "${theme.title}" does not appear in the Technical Approach or Solution sections. Consider adding an integration point.`,
        severity: "warning",
      });
    }

    if (!hasPricing) {
      warnings.push({
        code: "WIN_THEME_MISSING_PRICING",
        field: `winThemes[${theme.id}]`,
        message: `Win theme "${theme.title}" does not appear in the Pricing Rationale. Pricing must reinforce win themes.`,
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

// ============================================================================
// Competitive Positioning Factual Accuracy
// ============================================================================

/**
 * Validates that competitive positioning entries are factually grounded and
 * avoid direct criticism of named competitors.
 *
 * Rules:
 * - CP_ACCURACY: Expected competitor positions must be labeled as such and
 *   grounded in known intelligence, not assumptions
 * - CP_NO_NEGATIVE_SELLING: No entry should directly criticize a competitor
 *   by name
 * - CP_DIMENSION_ALIGNMENT: Each dimension should map to an evaluation
 *   criterion if criteria are known
 *
 * Severity: ERROR for factual inaccuracies; WARNING for positioning concerns
 */
export function validateCompetitivePositioning(
  positions: { dimension: string; ourPosition: string; expectedCompetitorPosition: string; ourAdvantage: string }[],
  knownCompetitors: CompetitorProfile[],
  evaluationCriteria?: EvaluationCriterion[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const competitorNames = knownCompetitors.map((c) => c.name.toLowerCase());

  // Check for direct competitor criticism
  for (const entry of positions) {
    // Look for patterns that directly criticize a named competitor
    const directCriticismPattern = new RegExp(
      `\\b(${competitorNames.join("|")})\\b.*\\b(weak|poor|bad|terrible|inferior|overpriced|overrated|slow|unreliable|worse)\\b`,
      "i",
    );

    if (directCriticismPattern.test(entry.ourAdvantage + " " + entry.expectedCompetitorPosition)) {
      warnings.push({
        code: "CP_NEGATIVE_SELLING",
        field: `competitiveMatrix.entries[${entry.dimension}]`,
        message: `Positioning for "${entry.dimension}" appears to directly criticize a named competitor. Reframe to focus on our strength as a benefit to the buyer, not as a contrast to competitor weakness.`,
        severity: "warning",
      });
    }

    // Check that "expected competitor position" is labeled as expected
    if (
      entry.expectedCompetitorPosition &&
      !entry.expectedCompetitorPosition.toLowerCase().includes("likely") &&
      !entry.expectedCompetitorPosition.toLowerCase().includes("expected") &&
      !entry.expectedCompetitorPosition.toLowerCase().includes("may") &&
      !entry.expectedCompetitorPosition.toLowerCase().includes("probably")
    ) {
      warnings.push({
        code: "CP_SPECULATION_NOT_LABELED",
        field: `competitiveMatrix.entries[${entry.dimension}]`,
        message: `Expected competitor position for "${entry.dimension}" is stated as fact, not labeled as expected or likely. If this is based on actual intelligence, cite the source. Otherwise, add qualifying language.`,
        severity: "warning",
      });
    }
  }

  // Check dimension-criteria alignment
  if (evaluationCriteria && evaluationCriteria.length > 0) {
    const criteriaNames = evaluationCriteria.map((c) => c.name.toLowerCase());
    const uncoveredCriteria = criteriaNames.filter((cn) => {
      const dimensionMatch = positions.some((p) => p.dimension.toLowerCase().includes(cn));
      return !dimensionMatch;
    });

    if (uncoveredCriteria.length > 0) {
      warnings.push({
        code: "CP_CRITERIA_DIMENSION_GAP",
        field: "competitiveMatrix.entries",
        message: `The following evaluation criteria do not have corresponding competitive positioning dimensions: "${uncoveredCriteria.join('", "')}". Consider adding entries for these to ensure full coverage.`,
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

// ============================================================================
// Comprehensive Input Validation
// ============================================================================

/**
 * Runs all input-level validation checks before the agent executes.
 * This is called by the Agent Registry during the validateInput lifecycle hook.
 */
export function validateInput(input: ProposalStrategistInput): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Check required top-level fields
  if (!input.rfpDocument) {
    allErrors.push({
      code: "INPUT_MISSING_RFP",
      field: "rfpDocument",
      message: "RFP document is required. The agent cannot generate a proposal strategy without an RFP or opportunity brief.",
      severity: "error",
    });
  }

  if (!input.competitiveLandscape || input.competitiveLandscape.knownCompetitors.length === 0) {
    allWarnings.push({
      code: "INPUT_MISSING_COMPETITORS",
      field: "competitiveLandscape",
      message: "No competitors provided in competitive landscape. The agent will generate positioning with assumed competitive context, which may be less accurate.",
      severity: "warning",
    });
  }

  if (!input.stakeholderPersonas || input.stakeholderPersonas.length === 0) {
    allWarnings.push({
      code: "INPUT_MISSING_PERSONAS",
      field: "stakeholderPersonas",
      message: "No stakeholder personas provided. The agent will assume generic buyer roles, which may reduce executive summary precision.",
      severity: "warning",
    });
  }

  if (!input.bidderContext) {
    allErrors.push({
      code: "INPUT_MISSING_BIDDER",
      field: "bidderContext",
      message: "Bidder context is required. The agent needs organizational context to develop credible win themes.",
      severity: "error",
    });
  }

  // Validate RFP document structure
  if (input.rfpDocument) {
    if (!input.rfpDocument.requirements || input.rfpDocument.requirements.length === 0) {
      allWarnings.push({
        code: "RFP_NO_REQUIREMENTS",
        field: "rfpDocument.requirements",
        message: "RFP document has no structured requirements extracted. The agent will infer requirements from the body text, which may miss compliance nuances.",
        severity: "warning",
      });
    }

    if (!input.rfpDocument.dueDate) {
      allWarnings.push({
        code: "RFP_NO_DUE_DATE",
        field: "rfpDocument.dueDate",
        message: "RFP has no due date. Timeline-dependent strategy elements (e.g., proposal development schedule) cannot be generated.",
        severity: "warning",
      });
    }
  }

  // Validate win theme candidates if provided
  if (input.candidateWinThemes && input.candidateWinThemes.length > 0) {
    if (input.candidateWinThemes.length < 3) {
      allWarnings.push({
        code: "CANDIDATE_THEMES_TOO_FEW",
        field: "candidateWinThemes",
        message: `Only ${input.candidateWinThemes.length} candidate win themes provided. The agent will generate additional themes to reach the recommended 3-5 range.`,
        severity: "warning",
      });
    }

    if (input.candidateWinThemes.length > 7) {
      allWarnings.push({
        code: "CANDIDATE_THEMES_TOO_MANY",
        field: "candidateWinThemes",
        message: `${input.candidateWinThemes.length} candidate win themes provided. The agent will prioritize and consolidate to 3-5 themes. More than 7 themes typically indicates lack of strategic focus.`,
        severity: "warning",
      });
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ============================================================================
// Comprehensive Output Validation
// ============================================================================

/**
 * Runs all output-level validation checks after the agent completes.
 * This is called by the Agent Registry during the validateOutput lifecycle hook.
 */
export function validateOutput(output: ProposalStrategistOutput): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // Strategy validation
  if (!output.proposalStrategy) {
    allErrors.push({
      code: "OUTPUT_MISSING_STRATEGY",
      field: "proposalStrategy",
      message: "Proposal strategy is required but was not generated.",
      severity: "error",
    });
  } else {
    if (!output.proposalStrategy.thesis) {
      allErrors.push({
        code: "OUTPUT_MISSING_THESIS",
        field: "proposalStrategy.thesis",
        message: "Strategic thesis is missing from the proposal strategy.",
        severity: "error",
      });
    }
    if (!output.proposalStrategy.narrativeArc.actI || !output.proposalStrategy.narrativeArc.actII || !output.proposalStrategy.narrativeArc.actIII) {
      allErrors.push({
        code: "OUTPUT_INCOMPLETE_NARRATIVE",
        field: "proposalStrategy.narrativeArc",
        message: "Three-act narrative arc is incomplete. All three acts (I, II, III) must be defined.",
        severity: "error",
      });
    }
  }

  // Win theme validation
  if (!output.winThemes || output.winThemes.length === 0) {
    allErrors.push({
      code: "OUTPUT_MISSING_WIN_THEMES",
      field: "winThemes",
      message: "No win themes were generated. At least 3 win themes are required for a competitive proposal.",
      severity: "error",
    });
  } else {
    if (output.winThemes.length < 3) {
      allWarnings.push({
        code: "OUTPUT_TOO_FEW_THEMES",
        field: "winThemes",
        message: `Only ${output.winThemes.length} win themes were generated. The recommended minimum is 3. Consider adding more themes to ensure competitive coverage.`,
        severity: "warning",
      });
    }

    if (output.winThemes.length > 5) {
      allWarnings.push({
        code: "OUTPUT_TOO_MANY_THEMES",
        field: "winThemes",
        message: `${output.winThemes.length} win themes generated. More than 5 themes dilute narrative focus. Consider consolidating.`,
        severity: "warning",
      });
    }

    // Run win theme quality checks
    const themeQuality = validateWinThemeQuality(output.winThemes);
    allErrors.push(...themeQuality.errors);
    allWarnings.push(...themeQuality.warnings);
  }

  // Executive summary validation
  if (!output.executiveSummary) {
    allErrors.push({
      code: "OUTPUT_MISSING_EXEC_SUMMARY",
      field: "executiveSummary",
      message: "Executive summary is required but was not generated.",
      severity: "error",
    });
  } else {
    if (!output.executiveSummary.assembledText) {
      allErrors.push({
        code: "OUTPUT_MISSING_EXEC_TEXT",
        field: "executiveSummary.assembledText",
        message: "Executive summary assembled text is empty. It must contain the full one-page summary.",
        severity: "error",
      });
    }
    const wordCount = output.executiveSummary.assembledText?.split(/\s+/).length ?? 0;
    if (wordCount > 600) {
      allWarnings.push({
        code: "OUTPUT_EXEC_TOO_LONG",
        field: "executiveSummary.assembledText",
        message: `Executive summary is ${wordCount} words. Recommended maximum is 500 words (one page).`,
        severity: "warning",
      });
    }
    if (wordCount < 200) {
      allWarnings.push({
        code: "OUTPUT_EXEC_TOO_SHORT",
        field: "executiveSummary.assembledText",
        message: `Executive summary is only ${wordCount} words. It may lack sufficient substance to persuade senior evaluators who read only this section.`,
        severity: "warning",
      });
    }
  }

  // Competitive matrix validation
  if (!output.competitiveMatrix || output.competitiveMatrix.entries.length === 0) {
    allWarnings.push({
      code: "OUTPUT_MISSING_COMPETITIVE_MATRIX",
      field: "competitiveMatrix",
      message: "Competitive positioning matrix is empty or missing. This reduces the proposal's ability to differentiate effectively.",
      severity: "warning",
    });
  }

  // Response outline validation
  if (!output.responseOutline || output.responseOutline.sections.length === 0) {
    allErrors.push({
      code: "OUTPUT_MISSING_OUTLINE",
      field: "responseOutline",
      message: "Response outline is required but was not generated.",
      severity: "error",
    });
  }

  // Risk/reward validation
  if (!output.riskReward) {
    allWarnings.push({
      code: "OUTPUT_MISSING_RISK_REWARD",
      field: "riskReward",
      message: "Risk/reward assessment is missing. This is recommended for go/no-go decision-making but not strictly required for proposal generation.",
      severity: "warning",
    });
  }

  // Confidence score validation
  if (output.confidenceScore === undefined || output.confidenceScore === null) {
    allWarnings.push({
      code: "OUTPUT_MISSING_CONFIDENCE",
      field: "confidenceScore",
      message: "Confidence score is required for the agent registry to assess output reliability.",
      severity: "warning",
    });
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ============================================================================
// Composite Validator
// ============================================================================

/**
 * Runs all validators in a composite pass. Used by the Agent Registry for
 * end-to-end input/output validation.
 */
export function validateProposalStrategist(
  input: ProposalStrategistInput,
  output: ProposalStrategistOutput,
): {
  inputValidation: ValidationResult;
  outputValidation: ValidationResult;
  consistencyValidation: ValidationResult;
} {
  return {
    inputValidation: validateInput(input),
    outputValidation: validateOutput(output),
    consistencyValidation: validateConsistency(input, output),
  };
}

/**
 * Cross-validates consistency between input and output.
 */
export function validateConsistency(
  input: ProposalStrategistInput,
  output: ProposalStrategistOutput,
): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Check that deal qualification context was used if provided
  if (input.dealQualification) {
    const alignment = validateWinThemeDealAlignment(output.winThemes, input.dealQualification);
    warnings.push(...alignment.warnings);
  }

  // Check that competitive positioning references known competitors
  if (input.competitiveLandscape?.knownCompetitors && output.competitiveMatrix) {
    const competitorNames = input.competitiveLandscape.knownCompetitors.map((c) => c.name.toLowerCase());
    const allPositioningText = output.competitiveMatrix.entries
      .map((e) => `${e.dimension} ${e.ourPosition} ${e.expectedCompetitorPosition} ${e.ourAdvantage}`)
      .join(" ")
      .toLowerCase();

    const unreferencedCompetitors = competitorNames.filter(
      (name) => !allPositioningText.includes(name),
    );

    if (unreferencedCompetitors.length > 0) {
      warnings.push({
        code: "CONSISTENCY_UNREFERENCED_COMPETITORS",
        field: "competitiveMatrix",
        message: `Known competitors "${unreferencedCompetitors.join('", "')}" are not explicitly addressed in the competitive positioning matrix. Either add positioning entries for these competitors or note in the assessment why they are not a focus.`,
        severity: "warning",
      });
    }
  }

  // Check that executive summary references at least one win theme
  if (output.executiveSummary?.assembledText && output.winThemes?.length > 0) {
    const execText = output.executiveSummary.assembledText.toLowerCase();
    const themeReferenced = output.winThemes.some((wt) => {
      const keywords = wt.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      return keywords.some((kw) => execText.includes(kw));
    });

    if (!themeReferenced) {
      warnings.push({
        code: "CONSISTENCY_EXEC_NO_THEME_REFERENCE",
        field: "executiveSummary",
        message: "The executive summary does not appear to reference any win theme. The executive summary must surface at least one win theme to connect the opening argument to the narrative backbone.",
        severity: "warning",
      });
    }
  }

  return {
    valid: true, // consistency warnings are advisory, not blocking
    errors: [],
    warnings,
  };
}
