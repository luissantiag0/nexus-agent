// ============================================================================
// Nexus Agent Platform — Backend Architect Adapter
// ============================================================================
// This adapter wraps the Backend Architect agent with typed I/O ports,
// a system prompt, and validation rules. It is the canonical example
// of how to implement AgentAdapter for any agent domain.
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
  BackendArchitectInput,
  BackendArchitectOutput,
} from "@/engine/types/adapter-interfaces";

// ============================================================================
// Metadata
// ============================================================================

const METADATA: AgentMetadata = {
  id: "backend-architect" as any,
  name: "Backend Architect",
  description:
    "Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant server-side applications and microservices.",
  version: "1.0.0",
  status: "active",
  tags: ["engineering", "architecture", "backend", "infrastructure"],
  capabilities: [
    "system-architecture-design",
    "database-schema-design",
    "api-contract-development",
    "deployment-topology-planning",
    "security-review",
    "migration-planning",
    "performance-optimization",
    "microservices-decomposition",
  ],
  color: "#2563eb",
  icon: "🏗️",
  model: "gpt-4",
};

// ============================================================================
// Port Schemas
// ============================================================================

const INPUT_SCHEMA: PortSchema = {
  $id: "backend-architect-input.v1",
  version: "1.0.0",
  description: "System requirements, architecture context, and constraints for the Backend Architect agent.",
  type: "object",
  properties: {
    systemRequirements: { type: "string", description: "Functional and non-functional requirements" },
    architectureContext: { type: "string", description: "Existing architecture context and constraints" },
    integrationSpecs: { type: "array", items: { type: "string" }, description: "Integration specifications" },
    performanceRequirements: {
      type: "object",
      properties: {
        maxResponseTimeMs: { type: "number" },
        expectedThroughput: { type: "number" },
        concurrency: { type: "number" },
      },
    },
    securityConstraints: { type: "array", items: { type: "string" } },
    existingSystemLandscape: { type: "string" },
    constraints: { type: "array", items: { type: "string" } },
  },
  required: ["systemRequirements", "architectureContext"],
  example: {
    systemRequirements: "Build a real-time order processing system handling 10k req/s",
    architectureContext: "Current monolith on AWS EC2, need to migrate to microservices",
    integrationSpecs: ["Payment gateway Stripe", "Inventory management via REST"],
    performanceRequirements: {
      maxResponseTimeMs: 200,
      expectedThroughput: 10000,
      concurrency: 500,
    },
    securityConstraints: ["PCI-DSS compliance required", "Data encryption at rest"],
    existingSystemLandscape: "Legacy PHP monolith, MySQL database, Redis cache",
  },
};

const OUTPUT_SCHEMA: PortSchema = {
  $id: "backend-architect-output.v1",
  version: "1.0.0",
  description: "Architecture design deliverables from the Backend Architect agent.",
  type: "object",
  properties: {
    architectureDesignDoc: { type: "string", description: "Complete architecture design document" },
    apiContracts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          service: { type: "string" },
          contract: { type: "string" },
          version: { type: "string" },
        },
      },
    },
    dataModels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entity: { type: "string" },
          schema: { type: "string" },
          indexes: { type: "array", items: { type: "string" } },
        },
      },
    },
    deploymentTopology: { type: "string" },
    integrationPatterns: { type: "array", items: { type: "string" } },
    migrationPlan: { type: "string" },
    securityReview: { type: "string" },
  },
  required: [
    "architectureDesignDoc",
    "apiContracts",
    "dataModels",
    "deploymentTopology",
  ],
};

// ============================================================================
// Context Keys
// ============================================================================

const READS: ContextKey[] = [
  "systemRequirements" as any,
  "architectureContext" as any,
  "existingSystemLandscape" as any,
  "performanceRequirements" as any,
];

const WRITES: ContextKey[] = [
  "architecturePlan" as any,
  "apiSpecs" as any,
  "dataModels" as any,
  "deploymentTopology" as any,
  "integrationMap" as any,
  "securityAssessment" as any,
];

// ============================================================================
// Validation Rules
// ============================================================================

const OUTPUT_VALIDATORS: ValidationRule<BackendArchitectOutput>[] = [
  {
    id: "arch-doc-not-empty",
    name: "Architecture document is present",
    description: "Ensures the architecture design document is not empty",
    severity: "error",
    validate: (output: BackendArchitectOutput): ValidationResult => {
      const errors = [];
      if (!output.architectureDesignDoc || output.architectureDesignDoc.trim().length === 0) {
        errors.push({
          path: "architectureDesignDoc",
          message: "Architecture design document is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "api-contracts-present",
    name: "API contracts are defined",
    description: "Ensures at least one API contract is specified",
    severity: "error",
    validate: (output: BackendArchitectOutput): ValidationResult => {
      const errors = [];
      if (!output.apiContracts || output.apiContracts.length === 0) {
        errors.push({
          path: "apiContracts",
          message: "At least one API contract must be defined",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "data-models-present",
    name: "Data models are defined",
    description: "Ensures at least one data model is specified",
    severity: "error",
    validate: (output: BackendArchitectOutput): ValidationResult => {
      const errors = [];
      if (!output.dataModels || output.dataModels.length === 0) {
        errors.push({
          path: "dataModels",
          message: "At least one data model must be defined",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "deployment-topology-present",
    name: "Deployment topology is defined",
    description: "Ensures deployment topology is specified",
    severity: "error",
    validate: (output: BackendArchitectOutput): ValidationResult => {
      const errors = [];
      if (!output.deploymentTopology || output.deploymentTopology.trim().length === 0) {
        errors.push({
          path: "deploymentTopology",
          message: "Deployment topology is required",
          severity: "error",
        });
      }
      return { valid: errors.length === 0, errors, warnings: [] };
    },
  },
  {
    id: "security-review-present",
    name: "Security review is included",
    description: "Warns if no security review is present",
    severity: "warning",
    validate: (output: BackendArchitectOutput): ValidationResult => {
      const warnings = [];
      if (!output.securityReview || output.securityReview.trim().length === 0) {
        warnings.push({
          path: "securityReview",
          message: "Security review is recommended for production systems",
          severity: "warning",
        });
      }
      return { valid: warnings.length === 0, errors: [], warnings };
    },
  },
];

// ============================================================================
// Prompt Template Path
// ============================================================================

const PROMPT_TEMPLATE = "engine/prompts/templates/backend-architect-v1.yaml";

// ============================================================================
// Backend Architect Adapter Implementation
// ============================================================================

export class BackendArchitectAdapter
  implements AgentAdapter<BackendArchitectInput, BackendArchitectOutput>
{
  readonly metadata: AgentMetadata = METADATA;
  readonly inputSchema: PortSchema = INPUT_SCHEMA;
  readonly outputSchema: PortSchema = OUTPUT_SCHEMA;
  readonly reads: ContextKey[] = READS;
  readonly writes: ContextKey[] = WRITES;
  readonly validators: ValidationRule<BackendArchitectOutput>[] = OUTPUT_VALIDATORS;
  readonly promptTemplate: string = PROMPT_TEMPLATE;

  /**
   * Resolve the system prompt by interpolating runtime variables
   * into the YAML prompt template.
   */
  async resolvePrompt(variables: Record<string, unknown>): Promise<string> {
    // In production, this loads the template from the prompt manager,
    // interpolates variables, and returns the resolved string.
    const basePrompt = `
You are Backend Architect, a senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure.

## System Requirements
${variables.systemRequirements ?? "(not provided)"}

## Architecture Context
${variables.architectureContext ?? "(not provided)"}

## Security Constraints
${Array.isArray(variables.securityConstraints) ? variables.securityConstraints.join("\n") : "(not provided)"}

## Performance Requirements
${variables.performanceRequirements ? JSON.stringify(variables.performanceRequirements, null, 2) : "(not provided)"}

## Your Task
Design a complete backend architecture including:
1. Architecture design document
2. API contracts for all services
3. Data models with indexes
4. Deployment topology
5. Integration patterns
6. Migration plan
7. Security review

Respond with a structured JSON output conforming to the BackendArchitectOutput schema.
`;

    return basePrompt;
  }

  // ========================================================================
  // Lifecycle Hooks
  // ========================================================================

  async onBefore(
    input: AgentInput<BackendArchitectInput>,
    context: AgentContext,
  ): Promise<void> {
    // Validate that we have minimum required context
    if (!input.payload.systemRequirements) {
      throw new Error("BackendArchitect requires systemRequirements in input payload");
    }
    if (!input.payload.architectureContext) {
      throw new Error("BackendArchitect requires architectureContext in input payload");
    }
  }

  async onAfter(
    output: AgentOutput<BackendArchitectOutput>,
    context: AgentContext,
  ): Promise<void> {
    // Post-processing: enrich context with architecture outputs
    context.set("architecturePlan" as any, output.payload.architectureDesignDoc);
    context.set("apiSpecs" as any, output.payload.apiContracts);
    context.set("dataModels" as any, output.payload.dataModels);
    context.set("deploymentTopology" as any, output.payload.deploymentTopology);
    context.set("integrationMap" as any, output.payload.integrationPatterns);
    context.set("securityAssessment" as any, output.payload.securityReview);
  }

  // ========================================================================
  // Primary Execution
  // ========================================================================

  async execute(
    input: AgentInput<BackendArchitectInput>,
    context: AgentContext,
  ): Promise<AgentOutput<BackendArchitectOutput>> {
    // In production, this assembles the full prompt and calls the LLM.
    // For the stub, we return a template response.

    const { systemRequirements, architectureContext, integrationSpecs } = input.payload;

    const payload: BackendArchitectOutput = {
      architectureDesignDoc: `
# Architecture Design Document

## Overview
System: ${systemRequirements.substring(0, 100)}...
Context: ${architectureContext.substring(0, 100)}...

## Architecture Pattern
**Pattern**: Microservices with Event-Driven Communication
**Rationale**: Loose coupling, independent deployability, scalability

## Service Decomposition
- **API Gateway**: Entry point for all clients
- **Auth Service**: JWT-based authentication
- **Core Service**: Business logic orchestration
- **Integration Service**: ${integrationSpecs?.join(", ") || "External system integration"}
- **Data Service**: Data persistence and caching

## Data Flow
Client → API Gateway → Auth → Core → Data/Integration
      `.trim(),
      apiContracts: [
        {
          service: "api-gateway",
          contract: "REST + WebSocket endpoints for client communication",
          version: "1.0.0",
        },
        {
          service: "core-service",
          contract: "gRPC internal service mesh communication",
          version: "1.0.0",
        },
      ],
      dataModels: [
        {
          entity: "User",
          schema: "UUID id, VARCHAR email, VARCHAR password_hash, TIMESTAMP created_at",
          indexes: ["idx_users_email", "idx_users_created_at"],
        },
        {
          entity: "Workflow",
          schema: "UUID id, VARCHAR name, JSONB definition, BOOLEAN is_enabled",
          indexes: ["idx_workflows_name", "idx_workflows_enabled"],
        },
      ],
      deploymentTopology: `
## Deployment Topology

- **Kubernetes Cluster**: EKS with node auto-scaling
- **Service Mesh**: Istio for traffic management and security
- **Database**: Amazon RDS PostgreSQL with read replicas
- **Cache**: ElastiCache Redis cluster
- **CDN**: CloudFront for static assets
- **CI/CD**: GitHub Actions → ECR → ArgoCD
      `.trim(),
      integrationPatterns: [
        "Event-driven with Apache Kafka for async communication",
        "REST/GraphQL for synchronous request-response",
        "WebSocket for real-time bidirectional streaming",
        "gRPC for internal service-to-service communication",
      ],
      migrationPlan: `
## Migration Plan

1. Phase 1: Strangler Fig pattern — route new traffic to microservices
2. Phase 2: Database per service with event-driven consistency
3. Phase 3: Blue-green deployment for zero-downtime cutover
4. Phase 4: Decommission legacy monolith
      `.trim(),
      securityReview: `
## Security Review

- **Authentication**: OAuth 2.0 with JWT tokens
- **Authorization**: RBAC with fine-grained permissions
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
- **API Security**: Rate limiting, WAF, request validation
- **Compliance**: PCI-DSS, SOC 2, GDPR readiness
      `.trim(),
    };

    return {
      schema: this.outputSchema.$id,
      schemaVersion: this.outputSchema.version,
      payload,
      correlationId: input.correlationId,
      performance: {
        startedAt: new Date(Date.now() - 500).toISOString(),
        completedAt: new Date().toISOString(),
        tokensUsed: 1500,
        steps: 4,
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const backendArchitectAdapter = new BackendArchitectAdapter();
export default backendArchitectAdapter;
