// ============================================================================
// Nexus Agent Engine — @product-manager AgentAdapter
// ============================================================================
// Adapter contract between the AgentRunner runtime and the Product Manager
// agent. Defines typed I/O ports, context key contracts, input validation,
// and an execution stub for roadmap generation, feature prioritization,
// PRD authoring, GTM planning, and outcome measurement.
// ============================================================================

import { v4 as uuid } from "uuid";

// ============================================================================
// IAgentAdapter — Core Adapter Contract
// ============================================================================

/**
 * Generic adapter interface for the AgentRunner system.
 *
 * @typeParam TIn  - Shape of the adapter-specific input payload.
 * @typeParam TOut - Shape of the adapter-specific output payload.
 */
export interface IAgentAdapter<TIn, TOut> {
  /** Canonical agent identifier used for registry routing and context keys. */
  readonly agentId: string;

  /** Semantic version of this adapter implementation. */
  readonly version: string;

  /** Filename or identifier of the externalised prompt template. */
  readonly promptVersion: string;

  /** Context keys this agent reads from the shared execution context. */
  readonly readsContextKeys: readonly string[];

  /** Context keys this agent writes to the shared execution context. */
  readonly writesContextKeys: readonly string[];

  /**
   * Validate raw input against the adapter's schema and business rules.
   * Called by the AgentRunner before `execute`. If validation fails the
   * runner MUST reject execution with status `"rejected_validation"`.
   */
  validate(input: Record<string, unknown>): ValidationResult;

  /**
   * Execute the agent's core logic.
   *
   * @param input   - The validated typed input payload.
   * @param context - The shared execution context (AgentContext key-value map).
   * @returns       - An AgentResult wrapping the typed output with metadata.
   */
  execute(input: TIn, context: Record<string, unknown>): Promise<AgentResult<TOut>>;
}

// ============================================================================
// AgentResult — Execution Envelope
// ============================================================================

/**
 * Execution result wrapper produced by every agent adapter.
 * Carries the typed output along with runtime diagnostics.
 */
export interface AgentResult<TOut = unknown> {
  /** Unique execution run identifier. */
  runId: string;

  /** ISO-8601 timestamp of when execution completed. */
  timestamp: string;

  /** Wall-clock execution time in milliseconds. */
  durationMs: number;

  /** The typed output payload on success. */
  output: TOut | null;

  /** Execution status. */
  status: AgentStatus;
}

export type AgentStatus =
  | "completed"
  | "failed"
  | "rejected_validation"
  | "running"
  | "timed_out";

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning";
}

// ============================================================================
// ProductManagerInput — Typed Input Schema
// ============================================================================

/**
 * Input contract for the @product-manager agent adapter.
 *
 * The Product Manager synthesises business context, market intelligence,
 * user feedback, and resource constraints to produce actionable product
 * strategy deliverables.
 */
export interface ProductManagerInput {
  /** High-level business objectives and OKRs from leadership. */
  businessObjectives: BusinessObjective[];

  /** Market research data including TAM/SAM, competitive intel, trends. */
  marketResearch?: MarketResearchData;

  /** Synthesised user feedback from interviews, surveys, and support. */
  userFeedback?: UserFeedbackEntry[];

  /** Resource constraints (engineering capacity, budget, timeline). */
  resourceConstraints: ResourceConstraint;

  /** Current feature backlog items to prioritise. */
  featureBacklog: FeatureBacklogItem[];

  /** Inputs and requests from stakeholders (sales, execs, CS). */
  stakeholderInputs?: StakeholderRequest[];
}

// ---------------------------------------------------------------------------
// Input Sub-Types
// ---------------------------------------------------------------------------

export interface BusinessObjective {
  /** The objective label (e.g. "Increase activation rate"). */
  objective: string;
  /** Key results that define success for this objective. */
  keyResults: KeyResult[];
  /** Quarter or timeframe this objective targets. */
  quarter: string;
  /** Executive sponsor or owner. */
  owner: string;
}

export interface KeyResult {
  label: string;
  currentValue?: number;
  targetValue: number;
  measurementUnit: string;
}

export interface MarketResearchData {
  /** Total addressable market size. */
  tam?: number;
  /** Serviceable addressable market. */
  sam?: number;
  /** Serviceable obtainable market. */
  som?: number;
  /** Competitor intelligence entries. */
  competitiveLandscape?: CompetitiveEntry[];
  /** Emerging trends with confidence and impact. */
  trends?: TrendSignal[];
  /** ISO-8601 date of last data refresh. */
  lastUpdated: string;
}

export interface CompetitiveEntry {
  competitorName: string;
  strengths: string[];
  weaknesses: string[];
  recentMoves: string[];
}

export interface TrendSignal {
  trend: string;
  confidence: "high" | "medium" | "low";
  impactPotential: number; // 1-10
  timeToMainstream: string;
}

export interface UserFeedbackEntry {
  /** Theme or category name. */
  theme: string;
  /** Severity classification. */
  severity: "pain" | "friction" | "delight" | "opportunity";
  /** Frequency out of total feedback items. */
  frequency: number;
  /** Representative verbatim quote. */
  representativeQuote: string;
  /** Source of the feedback (interview, survey, support ticket). */
  source: string;
}

export interface ResourceConstraint {
  /** Available engineering capacity in person-weeks per quarter. */
  totalCapacityPersonWeeks: number;
  /** Allocations already committed to other initiatives. */
  currentAllocations: ResourceAllocation[];
  /** Available budget in base currency. */
  availableBudget?: number;
  /** Key timeline constraints or freezes. */
  timelineConstraints?: TimelineEvent[];
}

export interface ResourceAllocation {
  initiative: string;
  personWeeks: number;
  teams: string[];
  startDate: string;
  endDate: string;
}

export interface TimelineEvent {
  event: string;
  date: string;
  impact: "blocking" | "warning" | "informational";
}

export interface FeatureBacklogItem {
  id: string;
  title: string;
  description: string;
  category: "new_feature" | "enhancement" | "tech_debt" | "platform" | "experiment" | "research";
  lifecyclePhase: "discovery" | "framing" | "definition" | "delivery" | "launched" | "measuring";
  effortEstimate: "xs" | "s" | "m" | "l" | "xl" | "unknown";
  dependencies: string[];
  objectiveAlignment?: string;
  requester?: string;
}

export interface StakeholderRequest {
  source: string;          // e.g. "sales", "ceo", "customer-success"
  request: string;
  rationale: string;
  urgency: "critical" | "high" | "medium" | "low";
  businessValueClaim: string;
}

// ============================================================================
// ProductManagerOutput — Typed Output Schema
// ============================================================================

/**
 * Output contract from the @product-manager agent adapter.
 */
export interface ProductManagerOutput {
  /** Prioritised product roadmap with horizon breakdown. */
  productRoadmap: RoadmapItem[];

  /** Feature backlog items scored and ranked by priority framework. */
  prioritizedFeatures: PrioritizedFeature[];

  /** Product Requirements Document for the selected initiative. */
  prd: ProductRequirementDocument;

  /** Go-to-market plan for the launch. */
  goToMarketPlan: GoToMarketPlan;

  /** Success metrics and OKR-tracking definitions. */
  successMetrics: SuccessMetricDefinition[];
}

// ---------------------------------------------------------------------------
// Output Sub-Types
// ---------------------------------------------------------------------------

export interface RoadmapItem {
  id: string;
  title: string;
  userProblem: string;
  successMetric: string;
  owner: string;
  horizon: "now" | "next" | "later";
  status: "committed" | "scoping" | "exploring" | "shipped" | "deferred";
  eta?: string;
  confidence: "high" | "medium" | "low";
}

export interface PrioritizedFeature {
  id: string;
  title: string;
  riceScore?: RiceScoreBreakdown;
  riceTotal: number;
  framework: "rice" | "ice" | "moscow" | "value_effort";
  rank: number;
  priority: "critical" | "high" | "medium" | "low";
  rationale: string;
  recommendedAction: "build" | "explore" | "defer" | "kill";
}

export interface RiceScoreBreakdown {
  reach: number;
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  confidence: number;
  effort: number;
}

export interface ProductRequirementDocument {
  title: string;
  version: string;
  status: "draft" | "in_review" | "approved" | "in_development" | "shipped";
  problemStatement: string;
  goals: GoalDefinition[];
  nonGoals: string[];
  userStories: UserStory[];
  solutionOverview: string;
  risks: RiskEntry[];
  launchPlan: LaunchPhase[];
}

export interface GoalDefinition {
  label: string;
  metric: string;
  currentBaseline: number;
  target: number;
  measurementWindow: string;
}

export interface UserStory {
  persona: string;
  action: string;
  outcome: string;
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

export interface RiskEntry {
  risk: string;
  likelihood: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  mitigation: string;
}

export interface LaunchPhase {
  phase: string;
  date: string;
  audience: string;
  successGate: string;
}

export interface GoToMarketPlan {
  productName: string;
  launchDate: string;
  launchTier: "major" | "standard" | "silent";
  dri: { product: string; marketing: string; engineering: string };
  valueProposition: string;
  targetAudience: Array<{ segment: string; channel: string }>;
  launchChecklist: LaunchChecklist;
  rollbackPlan: string;
}

export interface LaunchChecklist {
  engineering: string[];
  product: string[];
  marketing: string[];
  sales: string[];
}

export interface SuccessMetricDefinition {
  metric: string;
  target: number;
  currentBaseline: number;
  measurementWindow: string;
  owner: string;
}

// ============================================================================
// Context Key Contracts
// ============================================================================

/**
 * Context keys the @product-manager agent reads from the shared execution
 * context (produced by upstream agents like @trend-researcher,
 * @growth-hacker, etc.).
 */
export const PRODUCT_MANAGER_READ_KEYS = [
  "trendReport",
  "competitiveLandscape",
  "growthExperiments",
  "funnelOptimizations",
] as const;

/**
 * Context keys the @product-manager agent writes to the shared execution
 * context for consumption by downstream agents (engineering, design,
 * marketing, etc.).
 */
export const PRODUCT_MANAGER_WRITE_KEYS = [
  "productRoadmap",
  "prioritizedFeatures",
  "prd",
  "goToMarketPlan",
  "successMetrics",
] as const;

export type PmReadKey = (typeof PRODUCT_MANAGER_READ_KEYS)[number];
export type PmWriteKey = (typeof PRODUCT_MANAGER_WRITE_KEYS)[number];

// ============================================================================
// Metadata
// ============================================================================

export const PRODUCT_MANAGER_META = {
  agentId: "@product-manager" as const,
  name: "Product Manager",
  version: "1.0.0" as const,
  promptVersion: "product-manager.v1" as const,
  description:
    "Product strategist that turns business objectives, market intelligence, " +
    "user feedback, and resource constraints into prioritised roadmaps, " +
    "PRDs, go-to-market plans, and measurable success criteria.",
} as const;

// ============================================================================
// ProductManagerAdapter — IAgentAdapter Implementation
// ============================================================================

export class ProductManagerAdapter
  implements IAgentAdapter<ProductManagerInput, ProductManagerOutput>
{
  readonly agentId = PRODUCT_MANAGER_META.agentId;
  readonly version = PRODUCT_MANAGER_META.version;
  readonly promptVersion = PRODUCT_MANAGER_META.promptVersion;
  readonly readsContextKeys: readonly string[] = PRODUCT_MANAGER_READ_KEYS;
  readonly writesContextKeys: readonly string[] = PRODUCT_MANAGER_WRITE_KEYS;

  // ========================================================================
  // validate
  // ========================================================================

  /**
   * Validates the raw input payload against the @product-manager schema and
   * business rules.
   *
   * Rules enforced:
   *   1. `businessObjectives` must be a non-empty array.
   *   2. `featureBacklog` must be a non-empty array.
   *   3. `resourceConstraints` must be present and have a valid
   *      `totalCapacityPersonWeeks` > 0.
   */
  validate(input: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ── businessObjectives ────────────────────────────────────────────────

    const objectives = input["businessObjectives"];
    if (objectives === undefined || objectives === null) {
      errors.push({
        field: "businessObjectives",
        message: "businessObjectives is required",
        severity: "error",
      });
    } else if (!Array.isArray(objectives)) {
      errors.push({
        field: "businessObjectives",
        message: "businessObjectives must be an array",
        severity: "error",
      });
    } else if (objectives.length === 0) {
      errors.push({
        field: "businessObjectives",
        message: "businessObjectives must contain at least one objective",
        severity: "error",
      });
    }

    // ── featureBacklog ────────────────────────────────────────────────────

    const backlog = input["featureBacklog"];
    if (backlog === undefined || backlog === null) {
      errors.push({
        field: "featureBacklog",
        message: "featureBacklog is required",
        severity: "error",
      });
    } else if (!Array.isArray(backlog)) {
      errors.push({
        field: "featureBacklog",
        message: "featureBacklog must be an array",
        severity: "error",
      });
    } else if (backlog.length === 0) {
      errors.push({
        field: "featureBacklog",
        message: "featureBacklog must contain at least one item",
        severity: "error",
      });
    }

    // ── resourceConstraints ───────────────────────────────────────────────

    const constraints = input["resourceConstraints"];
    if (constraints === undefined || constraints === null) {
      errors.push({
        field: "resourceConstraints",
        message: "resourceConstraints is required",
        severity: "error",
      });
    } else if (typeof constraints !== "object" || Array.isArray(constraints)) {
      errors.push({
        field: "resourceConstraints",
        message: "resourceConstraints must be an object",
        severity: "error",
      });
    } else {
      const rc = constraints as Record<string, unknown>;
      if (typeof rc["totalCapacityPersonWeeks"] !== "number" || (rc["totalCapacityPersonWeeks"] as number) <= 0) {
        errors.push({
          field: "resourceConstraints.totalCapacityPersonWeeks",
          message: "resourceConstraints.totalCapacityPersonWeeks must be a positive number",
          severity: "error",
        });
      }
    }

    // ── Optional warnings ─────────────────────────────────────────────────

    if (input["stakeholderInputs"] !== undefined && input["stakeholderInputs"] !== null) {
      if (!Array.isArray(input["stakeholderInputs"])) {
        warnings.push({
          field: "stakeholderInputs",
          message: "stakeholderInputs should be an array if provided",
          severity: "warning",
        });
      }
    }

    if (input["userFeedback"] !== undefined && input["userFeedback"] !== null) {
      if (!Array.isArray(input["userFeedback"])) {
        warnings.push({
          field: "userFeedback",
          message: "userFeedback should be an array if provided",
          severity: "warning",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ========================================================================
  // execute
  // ========================================================================

  /**
   * Executes the Product Manager agent's core logic.
   *
   * In production this method would:
   *   1. Assemble a system prompt from the typed input and context.
   *   2. Invoke the LLM with the prompt.
   *   3. Parse and validate the LLM response against the output schema.
   *   4. Write output deliverables into the shared context.
   *
   * This stub returns a template response with the correct shape.
   */
  async execute(
    input: ProductManagerInput,
    _context: Record<string, unknown>,
  ): Promise<AgentResult<ProductManagerOutput>> {
    const startTime = Date.now();

    try {
      // ── Build output from input data ──────────────────────────────────
      const output = this.composeOutput(input);

      const durationMs = Date.now() - startTime;

      return {
        runId: uuid(),
        timestamp: new Date().toISOString(),
        durationMs,
        output,
        status: "completed",
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        runId: uuid(),
        timestamp: new Date().toISOString(),
        durationMs,
        output: null,
        status: "failed",
      };
    }
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Stub composition — produces a template ProductManagerOutput from the
   * input data. Replace this with LLM invocation in production.
   */
  private composeOutput(input: ProductManagerInput): ProductManagerOutput {
    const now = new Date().toISOString();

    return {
      productRoadmap: [
        {
          id: "roadmap-001",
          title: input.featureBacklog[0]?.title ?? "Q3 Strategic Initiatives",
          userProblem: input.businessObjectives[0]?.objective ?? "Drive measurable business outcomes",
          successMetric: input.businessObjectives[0]?.keyResults[0]?.label ?? "Key metric improvement",
          owner: input.businessObjectives[0]?.owner ?? "Product Team",
          horizon: "now",
          status: "committed",
          eta: "Q3 2026",
          confidence: "high",
        },
      ],

      prioritizedFeatures: input.featureBacklog.map((item, index) => ({
        id: item.id,
        title: item.title,
        riceTotal: Math.max(1, 100 - index * 10),
        framework: "rice" as const,
        rank: index + 1,
        priority: index === 0 ? ("critical" as const) : index < 3 ? ("high" as const) : ("medium" as const),
        rationale: `Aligned with objective: ${item.objectiveAlignment ?? "strategic growth"}. Effort: ${item.effortEstimate}.`,
        recommendedAction: "build" as const,
      })),

      prd: {
        title: input.featureBacklog[0]?.title ?? "Product Requirements Document",
        version: "1.0.0",
        status: "draft",
        problemStatement: input.businessObjectives[0]?.objective ?? "Undefined problem — see business objectives",
        goals: (input.businessObjectives[0]?.keyResults ?? []).map((kr) => ({
          label: kr.label,
          metric: kr.measurementUnit,
          currentBaseline: kr.currentValue ?? 0,
          target: kr.targetValue,
          measurementWindow: input.businessObjectives[0]?.quarter ?? "Q3 2026",
        })),
        nonGoals: [
          "Not addressing out-of-scope platform changes (separate initiative)",
          "No mobile support in v1 unless explicitly required",
        ],
        userStories: [
          {
            persona: "Primary user",
            action: "complete the core flow",
            outcome: "achieve the primary success metric",
            acceptanceCriteria: [
              { given: "the user is authenticated", when: "they navigate to the feature", then: "the core flow is available" },
            ],
          },
        ],
        solutionOverview: "See detailed PRD for the complete solution narrative.",
        risks: [
          {
            risk: "Resource contention with parallel initiatives",
            likelihood: "medium",
            impact: "high",
            mitigation: "Align with program management on capacity planning",
          },
        ],
        launchPlan: [
          { phase: "Internal alpha", date: "TBD", audience: "Team + design partners", successGate: "No P0 bugs" },
          { phase: "Closed beta", date: "TBD", audience: "Opt-in customers", successGate: "CSAT >= 4/5" },
          { phase: "GA", date: "TBD", audience: "100% rollout", successGate: "Metrics on target" },
        ],
      },

      goToMarketPlan: {
        productName: input.featureBacklog[0]?.title ?? "Feature Launch",
        launchDate: "2026-Q3",
        launchTier: "standard",
        dri: { product: this.agentId, marketing: "@marketing", engineering: "@engineering" },
        valueProposition: `Helps users achieve ${input.businessObjectives[0]?.keyResults[0]?.label ?? "better outcomes"} faster.`,
        targetAudience: [
          { segment: "Existing users in core segment", channel: "In-app announcement" },
          { segment: "Power users", channel: "Email + blog" },
        ],
        launchChecklist: {
          engineering: ["Feature flag deployed", "Monitoring dashboards live", "Rollback runbook written"],
          product: ["In-app copy approved", "Release notes published", "Help article live"],
          marketing: ["Blog post drafted", "Email sequence ready", "Social copy approved"],
          sales: ["Deck updated", "CS team trained", "FAQ published"],
        },
        rollbackPlan: "If error rate exceeds 0.5% or primary metric drops 5% below baseline, revert feature flag and page on-call.",
      },

      successMetrics: input.businessObjectives.flatMap((obj) =>
        obj.keyResults.map((kr) => ({
          metric: kr.label,
          target: kr.targetValue,
          currentBaseline: kr.currentValue ?? 0,
          measurementWindow: obj.quarter,
          owner: obj.owner,
        }))
      ),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const productManagerAdapter = new ProductManagerAdapter();
export default productManagerAdapter;
