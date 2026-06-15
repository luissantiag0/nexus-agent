// ============================================================================
// GET /api/diagnostics — Registry diagnostics endpoint
// ============================================================================
// Returns comprehensive diagnostics about the agent registry state:
//   - Total expected agents vs. registered adapters
//   - Prompt template registration status
//   - Adapter metadata (IDs, versions, domains, capabilities)
//   - Cross-reference validation (agents referenced by engine vs. registered)
//
// The diagnostics system can validate that all agents expected by the
// workflow engine's built-in pipeline definitions are actually registered.
//
// Response: { success, totalExpected, registeredAgents, missingAdapters,
//             promptCount, adapters, ... }
// 503      — if registry is not initialized (no adapters registered)
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { agentRegistry } from "@/lib/agent-registry/registry";

export const dynamic = "force-dynamic";

/**
 * The canonical list of agent IDs expected by the engine's built-in
 * pipeline definitions. Any agent referenced in pipeline definitions
 * but NOT found in the registry will be reported as missing.
 *
 * Extend this list as new pipelines/agents are added.
 */
const EXPECTED_AGENTS: string[] = [
  "support-infrastructure-maintainer",
  "pipeline-analyst",
  "sales-outreach",
];

export async function GET(_request: NextRequest) {
  try {
    // --- Check initialization ---
    const registryStats = agentRegistry.stats();

    if (registryStats.adapterCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent registry not initialized",
          detail:
            "No adapters are registered. Ensure adapters are imported and registered before accessing diagnostics.",
          timestamp: Date.now(),
        },
        { status: 503 },
      );
    }

    // --- Collect registered adapter metadata ---
    const adapters = agentRegistry.listAdapters();
    const registeredIds = new Set(adapters.map((a) => a.id));

    // --- Cross-reference expected vs. registered ---
    const missingAdapters = EXPECTED_AGENTS.filter(
      (id) => !registeredIds.has(id),
    );

    // --- Domain breakdown ---
    const domainCounts: Record<string, number> = {};
    for (const adapter of adapters) {
      domainCounts[adapter.domain] = (domainCounts[adapter.domain] || 0) + 1;
    }

    // --- Capability index ---
    const allCapabilities = new Set<string>();
    for (const adapter of adapters) {
      for (const cap of adapter.capabilities) {
        allCapabilities.add(cap);
      }
    }

    // --- Build response ---
    const diagnostics = {
      success: missingAdapters.length === 0,
      timestamp: Date.now(),

      // Registry stats
      totalExpected: EXPECTED_AGENTS.length,
      registeredAgents: registryStats.adapterCount,
      missingAdapters,
      promptCount: registryStats.promptCount,

      // Adapter details
      adapters: adapters.map((a) => ({
        id: a.id,
        name: a.name,
        domain: a.domain,
        version: a.version,
        promptVersion: a.promptVersion,
        capabilities: a.capabilities,
      })),

      // Aggregate views
      domainBreakdown: domainCounts,
      totalCapabilities: allCapabilities.size,
      capabilities: Array.from(allCapabilities).sort(),

      // Store stats
      expectedAgentList: EXPECTED_AGENTS,
    };

    const status = diagnostics.success ? 200 : 200; // 200 even with warnings
    return NextResponse.json(diagnostics, { status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/diagnostics]", message);
    return NextResponse.json(
      {
        success: false,
        error: "Diagnostics check failed",
        detail: message,
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
