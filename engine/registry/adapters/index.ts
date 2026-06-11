// ============================================================================
// Nexus Agent Platform — All Agent Adapter Exports
// ============================================================================
// Barrel file that exports all 18 agent adapter instances and their classes.
// Use AdapterLoader.loadFromMap() to register all adapters at once.
// ============================================================================

export { BackendArchitectAdapter, backendArchitectAdapter } from "./backend-architect.adapter";

// The following adapter stubs follow the same pattern as BackendArchitectAdapter.
// Each is a placeholder that will be implemented with full domain-specific logic.
// They are registered here to establish the complete adapter interface surface.

// ---------------------------------------------------------------------------
// Engineering Adapters
// ---------------------------------------------------------------------------

export class FrontendDeveloperAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "frontend-developer" as any,
    name: "Frontend Developer",
    description: "Modern web technologies, React/Vue/Angular, UI implementation",
    version: "1.0.0",
    status: "active",
    tags: ["engineering", "frontend"],
    capabilities: ["component-development", "ui-implementation", "responsive-design"],
    color: "#06b6d4",
    icon: "🎨",
    model: "gpt-4",
  };
  inputSchema = { $id: "frontend-developer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["designSpec"] };
  outputSchema = { $id: "frontend-developer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["componentCode"] };
  reads = [] as any;
  writes = [] as any;
  validators = [] as any;
  promptTemplate = "engine/prompts/templates/frontend-developer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Frontend Developer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { componentCode: "// stub", stylesCode: "/* stub */", testSpec: "// stub", accessibilityReport: "AA compliant" }, correlationId: input.correlationId };
  }
}

export class SeniorDeveloperAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "senior-developer" as any, name: "Senior Developer", description: "Premium implementations with clean architecture",
    version: "1.0.0", status: "active", tags: ["engineering", "senior"], capabilities: ["full-stack-development", "code-review", "architecture"],
    color: "#7c3aed", icon: "👨‍💻", model: "gpt-4",
  };
  inputSchema = { $id: "senior-developer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["featureSpec"] };
  outputSchema = { $id: "senior-developer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["implementation"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/senior-developer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Senior Developer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { implementation: "// stub", testSuite: "// stub", documentation: "# stub", migrationNotes: "N/A", performanceConsiderations: [] }, correlationId: input.correlationId };
  }
}

export class AIEngineerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "ai-engineer" as any, name: "AI Engineer", description: "ML model development, AI integration, data pipelines",
    version: "1.0.0", status: "beta", tags: ["engineering", "ai", "ml"], capabilities: ["model-development", "training-pipelines", "mlops"],
    color: "#f59e0b", icon: "🤖", model: "gpt-4",
  };
  inputSchema = { $id: "ai-engineer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["modelArchitecture"] };
  outputSchema = { $id: "ai-engineer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["modelCode"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/ai-engineer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "AI Engineer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { modelCode: "# stub", trainingPipeline: "# stub", inferenceEndpoint: "# stub", evaluationReport: "# stub", modelCard: "# stub" }, correlationId: input.correlationId };
  }
}

export class DevOpsAutomatorAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "devops-automator" as any, name: "DevOps Automator", description: "Infrastructure automation, CI/CD, cloud operations",
    version: "1.0.0", status: "active", tags: ["engineering", "devops", "infrastructure"], capabilities: ["infrastructure-as-code", "ci-cd", "monitoring"],
    color: "#10b981", icon: "⚙️", model: "gpt-4",
  };
  inputSchema = { $id: "devops-automator-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["infrastructureSpec"] };
  outputSchema = { $id: "devops-automator-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["infrastructureCode"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/devops-automator-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "DevOps Automator prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { infrastructureCode: "# stub", ciCdPipeline: "# stub", monitoringConfig: "# stub", backupStrategy: "# stub", drPlan: "# stub" }, correlationId: input.correlationId };
  }
}

export class SecurityEngineerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "security-engineer" as any, name: "Security Engineer", description: "Security auditing, threat modeling, compliance",
    version: "1.0.0", status: "active", tags: ["engineering", "security"], capabilities: ["security-audit", "threat-modeling", "compliance"],
    color: "#ef4444", icon: "🔒", model: "gpt-4",
  };
  inputSchema = { $id: "security-engineer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["systemArchitecture"] };
  outputSchema = { $id: "security-engineer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["securityAudit"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/security-engineer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Security Engineer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { securityAudit: "# stub", vulnerabilityReport: "# stub", remediationPlan: "# stub", securityControls: [], complianceReport: "# stub" }, correlationId: input.correlationId };
  }
}

export class DataEngineerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "data-engineer" as any, name: "Data Engineer", description: "Data pipelines, ETL, data modeling, analytics infrastructure",
    version: "1.0.0", status: "active", tags: ["engineering", "data"], capabilities: ["etl-development", "data-modeling", "pipeline-orchestration"],
    color: "#6366f1", icon: "📊", model: "gpt-4",
  };
  inputSchema = { $id: "data-engineer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["dataSources"] };
  outputSchema = { $id: "data-engineer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["etlPipeline"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/data-engineer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Data Engineer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { etlPipeline: "# stub", dataModel: "# stub", storageSchema: "# stub", dataQualityRules: [], lineageDocumentation: "# stub" }, correlationId: input.correlationId };
  }
}

export class SREAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "sre" as any, name: "Site Reliability Engineer", description: "SLOs, incident response, capacity planning, observability",
    version: "1.0.0", status: "active", tags: ["engineering", "sre", "reliability"], capabilities: ["slo-definition", "incident-response", "capacity-planning"],
    color: "#0891b2", icon: "📈", model: "gpt-4",
  };
  inputSchema = { $id: "sre-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["serviceSpec"] };
  outputSchema = { $id: "sre-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["sliDefinitions"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/sre-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "SRE prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { sliDefinitions: [], dashboardConfigs: [], alertingRules: [], runbook: "# stub", capacityModel: "# stub" }, correlationId: input.correlationId };
  }
}

export class CodeReviewerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "code-reviewer" as any, name: "Code Reviewer", description: "Code quality analysis, security scanning, best practice enforcement",
    version: "1.0.0", status: "active", tags: ["engineering", "quality"], capabilities: ["code-review", "static-analysis", "quality-gating"],
    color: "#84cc16", icon: "🔍", model: "gpt-4",
  };
  inputSchema = { $id: "code-reviewer-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["codeDiff"] };
  outputSchema = { $id: "code-reviewer-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["reviewSummary"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/code-reviewer-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Code Reviewer prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { reviewSummary: "# stub", issues: [], securityFindings: [], qualityScore: 85, approvalRecommendation: "approve" }, correlationId: input.correlationId };
  }
}

// ---------------------------------------------------------------------------
// Design Adapters
// ---------------------------------------------------------------------------

export { UiDesignerAdapter, uiDesignerAdapter } from "./ui-designer.adapter";

export class UXArchitectAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "ux-architect" as any, name: "UX Architect", description: "User experience architecture, information architecture, interaction design",
    version: "1.0.0", status: "active", tags: ["design", "ux"], capabilities: ["ux-research", "information-architecture", "interaction-design"],
    color: "#8b5cf6", icon: "🧩", model: "gpt-4",
  };
  inputSchema = { $id: "ux-architect-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["userResearchData"] };
  outputSchema = { $id: "ux-architect-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["userJourneyMaps"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/ux-architect-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "UX Architect prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { userJourneyMaps: "# stub", informationArchitecture: "# stub", wireframes: "# stub", interactionDesign: "# stub", usabilityReport: "# stub" }, correlationId: input.correlationId };
  }
}

export class BrandGuardianAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "brand-guardian" as any, name: "Brand Guardian", description: "Brand identity development, consistency maintenance, strategic positioning",
    version: "1.0.0", status: "active", tags: ["design", "brand"], capabilities: ["brand-consistency", "tone-analysis", "visual-compliance"],
    color: "#f43f5e", icon: "🛡️", model: "gpt-4",
  };
  inputSchema = { $id: "brand-guardian-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["brandIdentity"] };
  outputSchema = { $id: "brand-guardian-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["brandConsistencyReport"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/brand-guardian-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Brand Guardian prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { brandConsistencyReport: "# stub", recommendedChanges: [], toneAnalysis: "# stub", visualCompliance: "# stub", brandRiskAssessment: "# stub" }, correlationId: input.correlationId };
  }
}

// ---------------------------------------------------------------------------
// Marketing Adapters
// ---------------------------------------------------------------------------

export class ContentCreatorAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "content-creator" as any, name: "Content Creator", description: "Multi-platform campaigns, editorial calendars, storytelling",
    version: "1.0.0", status: "active", tags: ["marketing", "content"], capabilities: ["content-creation", "copywriting", "brand-storytelling"],
    color: "#22c55e", icon: "✍️", model: "gpt-4",
  };
  inputSchema = { $id: "content-creator-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["contentBrief"] };
  outputSchema = { $id: "content-creator-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["content"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/content-creator-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Content Creator prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { content: "# stub", headlineVariants: [], metaDescription: "# stub", contentType: "article", contentStrategy: "# stub" }, correlationId: input.correlationId };
  }
}

export class SEOSpecialistAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "seo-specialist" as any, name: "SEO Specialist", description: "Search engine optimization, keyword strategy, technical SEO",
    version: "1.0.0", status: "active", tags: ["marketing", "seo"], capabilities: ["seo-audit", "keyword-research", "technical-seo"],
    color: "#0ea5e9", icon: "🔎", model: "gpt-4",
  };
  inputSchema = { $id: "seo-specialist-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["websiteContent"] };
  outputSchema = { $id: "seo-specialist-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["seoAudit"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/seo-specialist-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "SEO Specialist prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { seoAudit: "# stub", keywordStrategy: "# stub", technicalRecommendations: [], contentOptimizationPlan: "# stub", linkBuildingStrategy: "# stub" }, correlationId: input.correlationId };
  }
}

// ---------------------------------------------------------------------------
// Product & Project Management Adapters
// ---------------------------------------------------------------------------

export class ProductManagerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "product-manager" as any, name: "Product Manager", description: "Product strategy, roadmapping, stakeholder management, feature prioritization",
    version: "1.0.0", status: "active", tags: ["product", "management"], capabilities: ["product-strategy", "roadmapping", "user-stories"],
    color: "#a855f7", icon: "📋", model: "gpt-4",
  };
  inputSchema = { $id: "product-manager-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["marketResearch"] };
  outputSchema = { $id: "product-manager-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["productSpec"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/product-manager-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Product Manager prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { productSpec: "# stub", userStories: [], roadmap: "# stub", kpiDefinitions: [], prioritizationMatrix: "# stub" }, correlationId: input.correlationId };
  }
}

export class ProjectManagerAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "project-manager" as any, name: "Project Manager", description: "Project planning, task management, resource allocation, risk tracking",
    version: "1.0.0", status: "active", tags: ["project", "management"], capabilities: ["project-planning", "task-decomposition", "resource-management"],
    color: "#f97316", icon: "📐", model: "gpt-4",
  };
  inputSchema = { $id: "project-manager-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["projectSpec"] };
  outputSchema = { $id: "project-manager-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["taskList"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/project-manager-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Project Manager prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { taskList: "# stub", milestones: [], resourcePlan: "# stub", riskMitigationPlan: "# stub", progressTrackers: [] }, correlationId: input.correlationId };
  }
}

// ---------------------------------------------------------------------------
// Testing Adapters
// ---------------------------------------------------------------------------

export class APITesterAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "api-tester" as any, name: "API Tester", description: "Comprehensive API validation, performance testing, quality assurance",
    version: "1.0.0", status: "active", tags: ["testing", "api"], capabilities: ["api-testing", "performance-benchmarking", "security-testing"],
    color: "#14b8a6", icon: "🧪", model: "gpt-4",
  };
  inputSchema = { $id: "api-tester-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["apiSpec"] };
  outputSchema = { $id: "api-tester-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["testResults"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/api-tester-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "API Tester prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { testResults: "# stub", coverageReport: "# stub", performanceBenchmarks: "# stub", securityFindings: [], regressionTestSuite: "# stub" }, correlationId: input.correlationId };
  }
}

// ---------------------------------------------------------------------------
// Orchestrator Adapter
// ---------------------------------------------------------------------------

export class AgentsOrchestratorAdapterStub implements import("@/lib/agents/registry/types").AgentAdapter {
  metadata: import("@/lib/agents/registry/types").AgentMetadata = {
    id: "agents-orchestrator" as any, name: "Agents Orchestrator", description: "Autonomous pipeline manager orchestrating the entire development workflow",
    version: "1.0.0", status: "active", tags: ["orchestration", "core"], capabilities: ["pipeline-management", "agent-coordination", "quality-gating"],
    color: "#0891b2", icon: "🎛️", model: "gpt-4",
  };
  inputSchema = { $id: "agents-orchestrator-input.v1", version: "1.0.0", description: "", type: "object" as const, required: ["pipelineSpec"] };
  outputSchema = { $id: "agents-orchestrator-output.v1", version: "1.0.0", description: "", type: "object" as const, required: ["pipelineResult"] };
  reads = [] as any; writes = [] as any; validators = [] as any;
  promptTemplate = "engine/prompts/templates/agents-orchestrator-v1.yaml";
  async resolvePrompt(_vars: Record<string, unknown>): Promise<string> { return "Agents Orchestrator prompt"; }
  async execute(input: any, _ctx: any) {
    return { schema: this.outputSchema.$id, schemaVersion: "1.0.0", payload: { pipelineResult: "# stub", phaseResults: [], qualityReport: "# stub", completionSummary: "# stub", artifacts: [] }, correlationId: input.correlationId };
  }
}

// ============================================================================
// Registry Map — All 18 Adapters
// ============================================================================

import { backendArchitectAdapter } from "./backend-architect.adapter";
import { uiDesignerAdapter } from "./ui-designer.adapter";

/**
 * Complete map of all 18 agent adapters keyed by their agent ID.
 * Use with AdapterLoader.loadFromMap() to register all at once.
 */
export const ALL_ADAPTERS: Record<string, import("@/lib/agents/registry/types").AgentAdapter> = {
  "backend-architect": backendArchitectAdapter,
  "frontend-developer": new FrontendDeveloperAdapterStub(),
  "senior-developer": new SeniorDeveloperAdapterStub(),
  "ai-engineer": new AIEngineerAdapterStub(),
  "devops-automator": new DevOpsAutomatorAdapterStub(),
  "security-engineer": new SecurityEngineerAdapterStub(),
  "data-engineer": new DataEngineerAdapterStub(),
  "sre": new SREAdapterStub(),
  "code-reviewer": new CodeReviewerAdapterStub(),
  "ui-designer": uiDesignerAdapter,
  "ux-architect": new UXArchitectAdapterStub(),
  "brand-guardian": new BrandGuardianAdapterStub(),
  "content-creator": new ContentCreatorAdapterStub(),
  "seo-specialist": new SEOSpecialistAdapterStub(),
  "product-manager": new ProductManagerAdapterStub(),
  "project-manager": new ProjectManagerAdapterStub(),
  "api-tester": new APITesterAdapterStub(),
  "agents-orchestrator": new AgentsOrchestratorAdapterStub(),
};
