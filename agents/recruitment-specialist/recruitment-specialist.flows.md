# Recruitment Specialist Agent — Execution Flow Examples

This document defines three execution flow patterns for the `@recruitment-specialist` agent within the Nexus Agent Orchestration Runtime:

1. **Single Agent** — Standalone candidate screening
2. **Chain** — `@recruitment-specialist` → `@product-manager` (hire request triggers team planning)
3. **Multi-Agent** — `@recruitment-specialist` + `@engineering-backend-architect` (tech hire co-designs technical screen)

---

## Flow 1: Single Agent — Candidate Screening

### Trigger
A new candidate enters the pipeline after applying via Boss Zhipin. The orchestrator routes the candidate profile to `@recruitment-specialist` for automated screening.

### Context Input

```json
{
  "jobRequisition": {
    "id": "REQ-2026-0042",
    "title": "Senior Backend Engineer",
    "department": "Platform Engineering",
    "level": "senior",
    "headcount": 2,
    "salaryBand": { "min": 35000, "max": 55000, "currency": "CNY" }
  },
  "roleRequirements": {
    "mustHaveSkills": ["Go", "PostgreSQL", "Kubernetes", "gRPC", "distributed-systems"],
    "niceToHaveSkills": ["Rust", "Temporal", "ClickHouse"],
    "minimumYearsExperience": 5,
    "softSkillRequirements": [
      { "skill": "cross-team collaboration", "importance": "critical" },
      { "skill": "mentoring junior engineers", "importance": "important" }
    ]
  },
  "candidatePipeline": {
    "candidates": [
      {
        "id": "CAND-0231",
        "name": "Zhang Wei",
        "currentStage": "applied",
        "source": "boss-zhipin",
        "parsedSkills": ["Go", "PostgreSQL", "Kubernetes", "gRPC", "Redis", "Kafka"],
        "yearsOfExperience": 7,
        "currentCompany": "ByteDance",
        "currentTitle": "Senior Software Engineer",
        "education": [
          { "institution": "Harbin Institute of Technology", "degree": "Bachelor", "major": "Computer Science", "graduationYear": 2019 }
        ]
      }
    ],
    "metrics": {
      "totalCandidates": 1,
      "activeCandidates": 1,
      "offerAcceptanceRate": 0
    }
  },
  "assessmentCriteria": {
    "dimensions": [
      { "dimension": "technical-skill", "weight": 0.35 },
      { "dimension": "system-design", "weight": 0.25 },
      { "dimension": "problem-solving", "weight": 0.20 },
      { "dimension": "cultural-fit", "weight": 0.10 },
      { "dimension": "communication", "weight": 0.10 }
    ],
    "passingThreshold": 70,
    "interviewRounds": 3,
    "questionTypes": ["behavioral-star", "technical", "system-design"],
    "phoneScreenRequired": true,
    "backgroundCheckRequired": true
  },
  "complianceRequirements": {
    "jurisdiction": "china-mainland",
    "city": "Beijing",
    "nonCompeteScreening": true,
    "socialInsuranceHandling": true,
    "contractType": "fixed-term",
    "probationMaxMonths": 6,
    "foreignerWorkPermitRequired": false,
    "runComplianceChecklist": true
  }
}
```

### Execution

```
1. @recruitment-specialist receives CAND-0231 profile
2. Runs mustHaveSkill matching: 5/5 matched → 100% skill match
3. Experience check: 7 years ≥ 5 required → PASS
4. Education check: CS Bachelor → meets minimum
5. Computes preliminary composite score: 82/100
6. Generates screening recommendation: "strong-proceed" 
7. Produces phone screen questions tailored to Go + K8s + distributed systems
8. Checks non-compete: ByteDance is a competitor → flags for manual review
9. Writes pipeline health note: "Bottleneck risk if phone screen not scheduled within 48 hours"
10. Returns structured output
```

### Agent Output

```json
{
  "candidateShortlist": [
    {
      "candidateId": "CAND-0231",
      "candidateName": "Zhang Wei",
      "rank": 1,
      "compositeScore": 82,
      "matchBreakdown": {
        "skillMatch": 100,
        "experienceMatch": 100,
        "cultureFit": 75,
        "overallFit": 82
      },
      "strengths": [
        "All must-have skills verified",
        "Experience at ByteDance indicates high-scale systems exposure",
        "7 years experience exceeds minimum of 5",
        "Skill set aligns with Go + K8s stack"
      ],
      "risks": [
        "Non-compete screening required — ByteDance is a direct competitor",
        "No evidence of mentoring experience in parsed resume"
      ],
      "recommendation": "strong-proceed",
      "rationale": "Perfect skill match with strong experience. ByteDance background is highly relevant for platform engineering. Non-compete must be validated before advancing to technical interview."
    }
  ],
  "assessmentScores": [
    {
      "candidateId": "CAND-0231",
      "candidateName": "Zhang Wei",
      "dimensionScores": [
        { "dimension": "technical-skill", "score": 88, "weight": 0.35 },
        { "dimension": "system-design", "score": 80, "weight": 0.25 },
        { "dimension": "problem-solving", "score": 82, "weight": 0.20 },
        { "dimension": "cultural-fit", "score": 72, "weight": 0.10 },
        { "dimension": "communication", "score": 75, "weight": 0.10 }
      ],
      "compositeScore": 82,
      "passed": true,
      "assessorNotes": "Strong technical profile consistent with senior backend engineer requirements. Phone screen should probe mentorship experience to address the gap."
    }
  ],
  "interviewQuestions": [
    {
      "round": 1,
      "roundName": "Phone Screen",
      "questions": [
        {
          "id": "PS-001",
          "type": "behavioral-star",
          "question": "Walk me through a time you designed or contributed to a distributed system that needed to handle high throughput. What was the situation, your role, the actions you took, and the result?",
          "dimension": "system-design",
          "difficulty": "intermediate",
          "expectedDurationMinutes": 15,
          "scoringCriteria": [
            { "level": 1, "label": "Weak", "description": "Cannot articulate system architecture or trade-offs", "behavioralAnchor": "Describes only their narrow contribution without system context" },
            { "level": 3, "label": "Adequate", "description": "Describes system at high level, identifies some trade-offs", "behavioralAnchor": "Explains architecture choices but lacks depth on failure modes" },
            { "level": 5, "label": "Strong", "description": "Articulates architecture, trade-offs, failure modes, and scaling decisions", "behavioralAnchor": "Provides specific metrics (QPS, latency p99), design rationale, and lessons learned" }
          ],
          "followUpPrompts": [
            "What was the throughput you were handling?",
            "How did you handle consistency vs availability trade-offs?",
            "If you were to redesign it today, what would you do differently?"
          ]
        },
        {
          "id": "PS-002",
          "type": "behavioral-star",
          "question": "Describe a situation where you had to collaborate with multiple teams (e.g., product, infrastructure, data) to deliver a complex project. How did you handle conflicting priorities?",
          "dimension": "communication",
          "difficulty": "basic",
          "expectedDurationMinutes": 10,
          "scoringCriteria": [
            { "level": 1, "label": "Weak", "description": "Blames others or describes no structured collaboration", "behavioralAnchor": "\"I just built what they asked for\"" },
            { "level": 3, "label": "Adequate", "description": "Describes collaboration but lacks specifics on conflict resolution", "behavioralAnchor": "Attended cross-team meetings but didn't drive resolution" },
            { "level": 5, "label": "Strong", "description": "Demonstrates structured alignment and conflict resolution", "behavioralAnchor": "Facilitated trade-off discussions with data, documented decisions, drove alignment" }
          ]
        }
      ],
      "totalDurationMinutes": 30,
      "focusAreas": ["Distributed systems experience", "Cross-team collaboration"]
    }
  ],
  "complianceChecklist": {
    "overallStatus": "conditional-pass",
    "items": [
      {
        "id": "COMP-001",
        "category": "Non-Compete",
        "description": "Candidate's current employer (ByteDance) may have active non-compete clauses. Must verify before proceeding.",
        "status": "at-risk",
        "severity": "critical",
        "regulation": "劳动合同法 — 竞业限制",
        "actionRequired": "Request candidate to disclose any active non-compete agreements. Verify with legal team."
      },
      {
        "id": "COMP-002",
        "category": "Contract",
        "description": "Fixed-term contract will be offered. Probation period of 6 months is within legal limit for 3+ year contract term.",
        "status": "compliant",
        "severity": "info",
        "regulation": "劳动合同法 — 试用期规定",
        "actionRequired": null
      },
      {
        "id": "COMP-003",
        "category": "Social Insurance",
        "description": "Beijing social insurance registration must be completed within 30 days of start date.",
        "status": "compliant",
        "severity": "info",
        "regulation": "社会保险法 — 北京",
        "actionRequired": "Prepare social insurance registration materials upon offer acceptance."
      },
      {
        "id": "COMP-004",
        "category": "Background Check",
        "description": "Background check is required for this position level.",
        "status": "compliant",
        "severity": "warning",
        "regulation": "个人信息保护法 (PIPL)",
        "actionRequired": "Obtain written authorization from candidate before initiating background check."
      }
    ],
    "summary": "Candidate passes screening but requires non-compete verification before advancing to interview stage. ByteDance is a known competitor with aggressive non-compete enforcement."
  },
  "metadata": {
    "agentVersion": "recruitment-specialist@1.0.0",
    "promptVersion": "recruitment-specialist.v1.prompt.yaml",
    "executionTimestamp": "2026-06-11T10:30:00Z",
    "processingTimeMs": 1423,
    "validationPassed": true,
    "validationErrors": []
  }
}
```

### Validation Rules Applied

| Rule | Input | Result |
|------|-------|--------|
| Must-have skill threshold ≥ 70% | 5/5 (100%) | ✅ Pass |
| Experience tolerance (≤1yr below req) | 7yr vs 5yr req | ✅ Pass |
| Education requirement (flexible) | CS Bachelor ≥ minimum | ✅ Pass |
| Minimum fit score ≥ 60 | 82/100 | ✅ Pass |
| Non-compete screening mandatory | Flagged ByteDance | ✅ At-risk, manual escalation |
| Social insurance check required | Beijing rules applied | ✅ Compliant |
| Score normalization (min-max, winsorize) | Applied to dimension scores | ✅ Normalized |

---

## Flow 2: Chain — @recruitment-specialist → @product-manager

### Scenario
A product team has been waiting 3 months to fill a Senior Product Manager role. A strong candidate has accepted the offer. The orchestrator chains:

1. `@recruitment-specialist` processes the offer acceptance and onboarding handoff
2. Passes context to `@product-manager` for team capacity and roadmap planning

### Chain Execution

```
Orchestrator Flow: 
  Step 1: @recruitment-specialist (hire completion → team context)
  Step 2: @product-manager (onboarded PM capacity → roadmap adjustment)
```

### Step 1: @recruitment-specialist Output (passed as context to step 2)

```json
{
  "jobRequisition": {
    "id": "REQ-2026-0037",
    "title": "Senior Product Manager — Platform",
    "department": "Product",
    "level": "senior",
    "status": "filled"
  },
  "offerRecommendations": [
    {
      "candidateId": "CAND-0189",
      "candidateName": "Li Na",
      "recommendedSalary": {
        "baseMonthly": 45000,
        "annualBonusTarget": 20,
        "totalAnnualCompensation": 648000,
        "marketP50": 42000,
        "marketP75": 52000,
        "positioning": "at-market",
        "rationale": "Candidate has 6 years PM experience at Meituan with strong platform product background. Offer at market median to ensure competitiveness while staying within band."
      },
      "startDate": "2026-07-01",
      "probationPeriodMonths": 6,
      "contractType": "fixed-term",
      "approvalWorkflow": [
        "Hiring Manager → HR Director → VP Product → Finance → CEO (if above ¥40k base)"
      ]
    }
  ],
  "onboardingContext": {
    "newHireName": "Li Na",
    "role": "Senior Product Manager — Platform",
    "startDate": "2026-07-01",
    "hiringManager": "Chen Yue (VP Product)",
    "reportingTeam": "Platform Product Team (current size: 4 PMs, 2 designers, 8 engineers)",
    "keyPriorities": [
      "Platform API marketplace v2 launch (Q3)",
      "Developer experience improvement initiative",
      "Partner integration SDK"
    ]
  }
}
```

### Step 2: @product-manager Receives Context

The `@product-manager` agent receives the onboarding context and uses it to update team capacity planning and roadmap:

```json
{
  "orchestratorInput": {
    "triggerAgent": "recruitment-specialist",
    "eventType": "hire-completed",
    "passedContext": {
      "newHire": {
        "name": "Li Na",
        "role": "Senior Product Manager — Platform",
        "startDate": "2026-07-01",
        "hiringManager": "Chen Yue"
      },
      "teamState": {
        "teamName": "Platform Product Team",
        "currentPMs": 4,
        "currentDesigners": 2,
        "currentEngineers": 8,
        "pendingDelivery": ["Platform API marketplace v2", "DX initiative", "Partner SDK"]
      },
      "probationPeriod": "6 months (ends 2027-01-01)"
    },
    "task": "Update team capacity plan and roadmap based on new hire onboarding timeline"
  }
}
```

### Chained Output

```json
{
  "roadmapImpact": {
    "capacityDelta": "+1 Senior PM (effective Q3, reduced throughput during ramp-up first 60 days)",
    "reallocation": {
      "incomingPM_ownership": "Platform API marketplace v2 (primary), DX initiative (secondary)", 
      "existingPM_shuffle": "PM-3 shifts from API marketplace to developer portal rearchitecture"
    },
    "risk": {
      "onboardingDependency": "Li Na's ramp-up means reduced throughput in July-August. Plan for 50% capacity in Month 1, 75% in Month 2, full by Month 3.",
      "probationRisk": "If Li Na does not pass probation, backfill recruiting lead time is 60-90 days. Maintain candidate pipeline warm."
    },
    "recommendation": "Shift Partner SDK delivery from Q3 to Q4. Scope API marketplace v2 to must-have features only for September launch."
  }
}
```

---

## Flow 3: Multi-Agent — @recruitment-specialist + @engineering-backend-architect

### Scenario
The company needs to hire a Staff Backend Engineer for a new infrastructure platform initiative. The `@recruitment-specialist` agent requires technical screening expertise to design assessment criteria and interview questions that accurately evaluate advanced candidates.

### Multi-Agent Orchestration

```
                    ┌──────────────────────────────────────────────────┐
                    │            Orchestrator Runtime                  │
                    │  ┌─────────────────────┐  ┌───────────────────┐  │
                    │  │ @recruitment-       │  │ @engineering-     │  │
                    │  │ specialist           │  │ backend-architect │  │
                    │  │                      │  │                   │  │
                    │  │ • JD requirements    │  │ • Tech stack      │  │
                    │  │ • Compliance rules   │◄─► │ • System design   │  │
                    │  │ • Sourcing strategy  │  │ • Architecture    │  │
                    │  │ • Offer positioning  │  │ • Coding patterns │  │
                    │  └──────────┬───────────┘  └───────────────────┘  │
                    │             │                                      │
                    │             ▼                                      │
                    │  ┌──────────────────────────────────────────────┐  │
                    │  │           Co-designed Artifacts              │  │
                    │  │ • Technical screening scorecard              │  │
                    │  │ • System design interview rubric             │  │
                    │  │ • Coding challenge specifications            │  │
                    │  │ • Target company map (infra orgs)            │  │
                    │  └──────────────────────────────────────────────┘  │
                    └──────────────────────────────────────────────────┘
```

### Collaboration Protocol

```
Step 1: @recruitment-specialist initiates with job requisition
  → Shares with @engineering-backend-architect: role requirements, 
     must-have skills, experience level

Step 2: @engineering-backend-architect returns technical framework
  → Technical competency dimensions with weightings
  → System design problem set appropriate for Staff level
  → Coding challenge specifications (Niuke platform)
  → Ideal candidate profile (which companies have relevant talent)

Step 3: @recruitment-specialist incorporates technical framework
  → Updates assessment_criteria with architect's input
  → Generates combined interview scorecard
  → Builds sourcing strategy targeting identified companies
  → Produces compliance-aligned offer benchmarks for Staff-level comp

Step 4: Both agents converge on final artifacts
  → @recruitment-specialist: full recruitment plan + compliance
  → @engineering-backend-architect: technical assessment pack
```

### Artifact: Co-Designed Technical Assessment Pack

```json
{
  "collaborationId": "MULTI-2026-0051",
  "agents": ["recruitment-specialist", "engineering-backend-architect"],
  "outputs": {
    "technicalScorecard": {
      "dimensions": [
        { "dimension": "system-design", "weight": 0.35, "minimumScore": 65 },
        { "dimension": "distributed-systems-knowledge", "weight": 0.25, "minimumScore": 70 },
        { "dimension": "coding-quality", "weight": 0.20, "minimumScore": 60 },
        { "dimension": "operational-excellence", "weight": 0.10, "minimumScore": 50 },
        { "dimension": "technical-communication", "weight": 0.10, "minimumScore": 50 }
      ],
      "passingThreshold": 75,
      "interviewRounds": [
        {
          "round": 1,
          "type": "phone-screen",
          "focus": "Technical fundamentals + system design overview",
          "durationMinutes": 45,
          "designedBy": "engineering-backend-architect"
        },
        {
          "round": 2,
          "type": "coding-challenge",
          "platform": "niuke",
          "durationMinutes": 90,
          "challengeDescription": "Design and implement a consistent hash ring with virtual nodes supporting dynamic node addition/removal. Must handle data rebalancing.",
          "designedBy": "engineering-backend-architect"
        },
        {
          "round": 3,
          "type": "system-design",
          "focus": "Design a multi-tenant event ingestion pipeline processing 1M+ events/sec",
          "durationMinutes": 90,
          "topics": ["Data partitioning", "Exactly-once semantics", "Back-pressure handling", "Cost optimization"],
          "designedBy": "engineering-backend-architect"
        },
        {
          "round": 4,
          "type": "onsite-behavioral",
          "focus": "Leadership, conflict resolution, technical decision-making",
          "durationMinutes": 60,
          "designedBy": "recruitment-specialist"
        }
      ]
    },
    "sourcingStrategy": {
      "targetCompanies": [
        "ByteDance (Infra team)", "Alibaba (Middleware team)", 
        "Tencent (Cloud team)", "Meituan (Infra team)", "PingCAP"
      ],
      "targetRoles": ["Staff Engineer", "Senior Infrastructure Engineer", "Tech Lead — Platform"],
      "recommendedChannels": [
        { "channel": "liepin", "rationale": "Best for mid-to-senior passive candidates" },
        { "channel": "maimai", "rationale": "Employee referrals via professional network, content marketing to infra community" },
        { "channel": "headhunter", "rationale": "Retained search for Staff-level, budget ¥30K-50K fee" }
      ]
    },
    "compensationBenchmarks": {
      "staffBackendEngineer": {
        "beijing": { "p50": 60000, "p75": 75000, "p90": 90000 },
        "shanghai": { "p50": 58000, "p75": 72000, "p90": 85000 },
        "shenzhen": { "p50": 62000, "p75": 78000, "p90": 95000 }
      },
      "targetCompanyPremium": {
        "ByteDance": "10-15% above market",
        "Alibaba": "5-10% above market",
        "startup": "15-25% below market but equity-heavy"
      }
    }
  }
}
```

---

## Validation Rules — Formal Specification

### Rule 1: Candidate Qualification Matching

```typescript
/**
 * Evaluates whether a candidate meets the minimum qualifications for a role.
 * 
 * Algorithm:
 * 1. Must-Have Skill Match = (matched skills / total must-have skills) × 100
 *    → Must be ≥ mustHaveSkillThreshold (default 70%)
 * 2. Experience Match = candidate years / required years
 *    → Pass if ≥ 1.0 or within experienceToleranceYears below requirement
 * 3. Education Match = compare candidate degree level against minimumEducation
 *    → If 'strict': must meet exactly; if 'flexible': allow related field + experience proxy
 *    → If 'waived': always pass
 * 4. Language Match = check each required language against candidate proficiency
 *    → If 'strict': candidate proficiency ≥ required proficiency
 *    → If 'flexible': one level below is acceptable
 * 5. Composite Fit Score = weighted combination of above
 *    → Must be ≥ minimumFitScore (default 60)
 * 
 * Returns: { qualified: boolean, score: number, breakdown: object, blockers: string[] }
 */
```

### Rule 2: Compliance Checklist Completeness

```typescript
/**
 * Validates that all mandatory compliance checks have been performed and passed.
 * 
 * Algorithm:
 * 1. Enumerate all compliance items based on jurisdiction and city
 * 2. For each item, check status is not 'non-compliant'
 * 3. Count 'at-risk' items — must be ≤ maxAtRiskItems (default 2)
 * 4. Non-compete screening: if nonCompeteScreeningMandatory is true:
 *    → Must have a completed check or an active escalation if competitor
 * 5. Background check: if backgroundCheckBeforeOffer is true:
 *    → Must be initiated before offer can be extended
 * 6. Social insurance: if socialInsuranceCheckRequired is true:
 *    → Must confirm city-specific registration timeline
 * 7. Overall status calculation:
 *    → 'pass': zero non-compliant items, at-risk ≤ maxAtRiskItems
 *    → 'conditional-pass': zero non-compliant items, at-risk ≤ maxAtRiskItems + 2
 *    → 'fail': any non-compliant items or at-risk > maxAtRiskItems + 2
 * 
 * Returns: { status: 'pass' | 'conditional-pass' | 'fail', items: [], summary: string }
 */
```

### Rule 3: Assessment Score Normalization

```typescript
/**
 * Normalizes assessment scores to ensure fair comparison across candidates,
 * evaluators, and assessment rounds.
 * 
 * Algorithm:
 * 1. Collect all raw scores per dimension across evaluated candidates
 * 2. Apply normalization method:
 *    - 'min-max': score' = (score - min) / (max - min) × 100
 *    - 'z-score': score' = (score - mean) / std × 10 + 50
 *    - 'percentile': score' = percentile rank × 100
 *    - 'none': score' = raw score
 * 3. Handle outliers per strategy:
 *    - 'clip': clamp to [5th percentile, 95th percentile]
 *    - 'remove': exclude outlier candidates from normalization
 *    - 'winsorize': replace extreme values with nearest non-extreme
 *    - 'keep': include as-is
 * 4. Apply dimension weights to compute composite score
 * 5. Enforce dimension minimums if configured:
 *    - If any dimension score < minimumScore → candidate does not pass
 *    - Even if composite score is above passing threshold
 * 6. Round final scores per roundToNearest setting
 * 
 * Returns: {
 *   dimensionScores: { dimension, rawScore, normalizedScore, weight, passed },
 *   compositeScore: number,
 *   passed: boolean,
 *   normalizationMetadata: { method, outlierCount, mean, std }
 * }
 */
```

### Validation Rule Enforcement Matrix

| Rule | When Enforced | Failure Consequence | Escalation Path |
|------|---------------|---------------------|-----------------|
| Candidate Qualification | On resume arrival & phone screen completion | Candidate moved to "rejected" | Hiring manager override available |
| Compliance Checklist | Before offer extension | Offer blocked until resolved | Legal team + HR Director escalation |
| Score Normalization | After each assessment round | Scores flagged for review, not auto-rejected | Calibration session with interview panel |

### Default Configuration

```typescript
export const RECRUITMENT_SPECIALIST_VALIDATION_DEFAULTS = {
  candidateQualificationMatching: {
    mustHaveSkillThreshold: 0.7,        // 70% must-have skills
    experienceToleranceYears: 1,        // allow 1yr below requirement
    educationRequirementEnforced: 'flexible',
    languageRequirementEnforced: 'strict',
    minimumFitScore: 60,                // out of 100
  },
  complianceChecklistCompleteness: {
    requireAllMandatoryItems: true,
    maxAtRiskItems: 2,
    nonCompeteScreeningMandatory: true,
    backgroundCheckBeforeOffer: true,
    socialInsuranceCheckRequired: true,
  },
  assessmentScoreNormalization: {
    method: 'min-max',                  // normalize to 0-100
    weightAdjustmentEnabled: true,
    outlierHandling: 'winsorize',
    roundToNearest: 1,                  // round to integer
    enforceDimensionMinimums: true,
  },
};
```

---

## Agent Communication Protocol

### Context Keys Shared Between Agents

| Context Key | Type | Set By | Consumed By | Description |
|-------------|------|--------|-------------|-------------|
| `jobRequisition` | `JobRequisition` | Orchestrator | Recruitment Specialist, Product Manager | The open position being filled |
| `candidatePipeline` | `CandidatePipeline` | Recruitment Specialist | Recruitment Specialist (self) | All candidates in the hiring pipeline |
| `assessmentScores` | `Map<string, CandidateAssessmentResult>` | Recruitment Specialist | Engineering (via orchestrator) | Normalized scores per candidate |
| `sourcingStrategy` | `SourcingStrategyOutput` | Recruitment Specialist | Recruiting Ops (external) | Channel allocation and budget plan |
| `complianceStatus` | `ComplianceChecklistResult` | Recruitment Specialist | Legal, HR Director | Compliance checklist results |
| `offerRecommendations` | `OfferRecommendation[]` | Recruitment Specialist | Product Manager (chain), Finance | Comp proposals and approvals |
| `teamCapacity` | `TeamCapacityPlan` | Product Manager (chain response) | Orchestrator | Updated team planning post-hire |
| `technicalAssessment` | `TechnicalAssessmentPack` | Engineering Backend Architect | Recruitment Specialist (co-design) | Technical screen artifacts |

### Error Handling

```typescript
export interface RecruitmentAgentError {
  code: 'VALIDATION_FAILED' | 'COMPLIANCE_BLOCKER' | 'CANDIDATE_NOT_FOUND' | 
        'CHANNEL_UNAVAILABLE' | 'SCORING_INCONSISTENCY' | 'ORCHESTRATION_TIMEOUT';
  message: string;
  severity: 'warning' | 'error' | 'critical';
  context: {
    agentId: string;
    candidateId?: string;
    ruleId?: string;
    failingValue?: unknown;
  };
  recoveryAction?: string;
}
```
