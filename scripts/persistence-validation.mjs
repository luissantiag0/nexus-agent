// ============================================================================
// Nexus Agent Platform — Persistence Layer Validation Script
// ============================================================================
// Validates the integrity of the persistence + multi-tenant architecture.
//
// Usage: node scripts/persistence-validation.mjs
// ============================================================================

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function toFileUrl(absPath) {
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log("  \u2713 " + name);
    passed++;
  } else {
    console.log("  \u2717 " + name + (detail ? " \u2014 " + detail : ""));
    failed++;
  }
}

async function importModule(relPath) {
  return import(toFileUrl(resolve(ROOT, relPath)));
}

async function main() {
  console.log("\n=== Persistence Layer Validation ===\n");

  // ======================================================================
  console.log("[1/8] Database Schema");
  // ======================================================================
  const schemaPath = resolve(ROOT, "database/migrations/001_schema.sql");
  check("001_schema.sql exists", existsSync(schemaPath));
  if (existsSync(schemaPath)) {
    const sql = readFileSync(schemaPath, "utf-8");
    check("File is non-empty", sql.length > 100);
    check("CREATE TABLE tenants", sql.includes("CREATE TABLE tenants"));
    check("CREATE TABLE runs", sql.includes("CREATE TABLE runs"));
    check("CREATE TABLE run_nodes", sql.includes("CREATE TABLE run_nodes"));
    check("CREATE TABLE events", sql.includes("CREATE TABLE events"));
    check("CREATE TABLE context_snapshots", sql.includes("CREATE TABLE context_snapshots"));
    check("tenant_id columns", (sql.match(/tenant_id/g) || []).length >= 5);
    check("ENABLE ROW LEVEL SECURITY", sql.includes("ENABLE ROW LEVEL SECURITY"));
    check("updated_at trigger", sql.includes("update_updated_at_column"));
    check("CREATE INDEX", sql.includes("CREATE INDEX"));
  }

  // ======================================================================
  console.log("\n[2/8] Supabase Module");
  // ======================================================================
  try {
    const m = await importModule("lib/supabase/index.ts");
    check("exports loadDbConfig", typeof m.loadDbConfig === "function");
    check("exports SupabaseClientFactory", typeof m.SupabaseClientFactory === "function");
    check("exports TenantRepository", typeof m.TenantRepository === "function");
    check("exports AgentRepository", typeof m.AgentRepository === "function");
    check("exports RunRepository", typeof m.RunRepository === "function");
    check("exports RunNodeRepository", typeof m.RunNodeRepository === "function");
    check("exports EventRepository", typeof m.EventRepository === "function");
    check("exports ContextSnapshotRepository", typeof m.ContextSnapshotRepository === "function");
  } catch (e) {
    check("lib/supabase imports", false, e.message);
  }

  // ======================================================================
  console.log("\n[3/8] Persistence Queue");
  // ======================================================================
  try {
    const p = await importModule("lib/persistence/index.ts");
    check("exports PersistenceQueue", typeof p.PersistenceQueue === "function");
    check("exports PersistenceBatchWriter", typeof p.PersistenceBatchWriter === "function");
    check("exports PersistenceEventMapper", typeof p.PersistenceEventMapper === "function");
    check("exports PersistenceInstrumentation", typeof p.PersistenceInstrumentation === "function");
    check("exports createPersistenceSystem", typeof p.createPersistenceSystem === "function");
    check("exports createWriteHandlerMap", typeof p.createWriteHandlerMap === "function");

    const q = new p.PersistenceQueue(async (items) => ({
      succeeded: items.map((i) => i.id), failed: [],
    }));
    q.start();
    q.enqueue({ id: "v1", operation: "run:create", payload: { tenant_id: "t1", run_id: "r1" } });
    q.enqueue({ id: "v2", operation: "event:create", payload: { tenant_id: "t1", run_id: "r1" } });
    const flushed = await q.flushNow();
    check("Queue enqueue+flush", flushed === 2);
    check("Queue tracks totalFlushed", q.stats().totalFlushed >= 2);
    check("Queue tracks totalEnqueued", q.stats().totalEnqueued >= 2);
    await q.shutdown();
  } catch (e) {
    check("Persistence queue tests", false, e.message);
  }

  // ======================================================================
  console.log("\n[4/8] Batch Writer");
  // ======================================================================
  try {
    const { PersistenceBatchWriter } = await importModule("lib/persistence/index.ts");
    const handled = [];
    const writer = new PersistenceBatchWriter({
      "run:create": async (items) => { handled.push("run:create"); return { succeeded: items.map((i) => i.id), failed: [] }; },
      "event:create": async (items) => { handled.push("event:create"); return { succeeded: items.map((i) => i.id), failed: [] }; },
    });
    const r = await writer.writeBatch([
      { id: "a", operation: "run:create", payload: {}, timestamp: 1, retryCount: 0 },
      { id: "b", operation: "event:create", payload: {}, timestamp: 2, retryCount: 0 },
      { id: "c", operation: "event:create", payload: {}, timestamp: 3, retryCount: 0 },
    ]);
    check("Groups by operation", handled.length === 2);
    check("Returns succeeded", r.succeeded.length === 3);
    check("Order preserved", handled[0] === "run:create" && handled[1] === "event:create");
  } catch (e) {
    check("Batch writer tests", false, e.message);
  }

  // ======================================================================
  console.log("\n[5/8] Persistence Wiring");
  // ======================================================================
  try {
    const { createWriteHandlerMap } = await importModule("lib/persistence/index.ts");
    check("createWriteHandlerMap exported", typeof createWriteHandlerMap === "function");

    const mockRepos = {
      runRepo: {
        create: async (d) => d,
        update: async (id, d) => ({ id: "rid", ...d }),
        findByRunId: async (tid, rid) => ({ id: "mid", run_id: rid, tenant_id: tid, status: "running" }),
      },
      runNodeRepo: {
        create: async (d) => d,
        batchUpsert: async () => 1,
      },
      eventRepo: {
        batchInsert: async () => 1,
        create: async (d) => d,
      },
      contextSnapshotRepo: {
        create: async (d) => d,
      },
    };

    const h = createWriteHandlerMap(mockRepos);
    check("handler map has run:create", typeof h["run:create"] === "function");
    check("handler map has run:update", typeof h["run:update"] === "function");
    check("handler map has run:complete", typeof h["run:complete"] === "function");
    check("handler map has event:create", typeof h["event:create"] === "function");
    check("handler map has snapshot:create", typeof h["snapshot:create"] === "function");
    check("handler map has node:create", typeof h["node:create"] === "function");
    check("handler map has node:update", typeof h["node:update"] === "function");

    const runResult = await h["run:create"]([
      { id: "wr1", operation: "run:create", payload: { tenant_id: "t1", run_id: "r1" }, timestamp: 1, retryCount: 0 },
    ]);
    check("run:create handler", runResult.succeeded.length === 1);

    const evtResult = await h["event:create"]([
      { id: "we1", operation: "event:create", payload: { tenant_id: "t1", run_id: "r1", eventId: "e1", type: "TEST" }, timestamp: 1, retryCount: 0 },
    ]);
    check("event:create handler", evtResult.succeeded.length === 1);
  } catch (e) {
    check("Persistence wiring tests", false, e.message);
  }

  // ======================================================================
  console.log("\n[6/8] Persistence System Factory");
  // ======================================================================
  try {
    const { createPersistenceSystem } = await importModule("lib/persistence/index.ts");

    const system = createPersistenceSystem({
      handlers: {
        "run:create": async (items) => ({ succeeded: items.map((i) => i.id), failed: [] }),
        "event:create": async (items) => ({ succeeded: items.map((i) => i.id), failed: [] }),
        "run:complete": async (items) => ({ succeeded: items.map((i) => i.id), failed: [] }),
      },
    });

    check("factory returns mapper", typeof system.mapper !== "undefined");
    check("factory returns queue", typeof system.queue !== "undefined");
    check("factory returns batchWriter", typeof system.batchWriter !== "undefined");
    check("factory returns instrumentation", typeof system.instrumentation !== "undefined");
    check("factory has start()", typeof system.start === "function");
    check("factory has stop()", typeof system.stop === "function");
    check("factory has shutdown()", typeof system.shutdown === "function");

    system.start();
    system.queue.enqueue({ id: "f1", operation: "run:create", payload: { tenant_id: "t1" } });
    system.queue.enqueue({ id: "f2", operation: "event:create", payload: { tenant_id: "t1", run_id: "r1" } });
    await system.shutdown();

    check("Factory pipeline processes items", system.queue.stats().totalFlushed >= 2);
  } catch (e) {
    check("Persistence system factory tests", false, e.message);
  }

  // ======================================================================
  console.log("\n[7/8] Tenant Middleware");
  // ======================================================================
  try {
    const mw = await importModule("middleware/tenant-middleware.ts");
    check("exports TenantResolver", typeof mw.TenantResolver === "function");
    check("exports TenantMiddlewareError", typeof mw.TenantMiddlewareError === "function");
    check("TenantResolver.resolve", typeof mw.TenantResolver.prototype.resolve === "function");

    const tu = await importModule("lib/supabase/tenant-utils.ts");
    check("exports getTenantIdFromHeaders", typeof tu.getTenantIdFromHeaders === "function");
    check("exports getTenantContext", typeof tu.getTenantContext === "function");
    check("exports requireTenantId", typeof tu.requireTenantId === "function");
  } catch (e) {
    check("Tenant middleware tests", false, e.message);
  }

  // ======================================================================
  console.log("\n[8/8] Tenant API Routes");
  // ======================================================================
  const apiRoutes = [
    "app/api/tenants/[tenantId]/runs/route.ts",
    "app/api/tenants/[tenantId]/events/route.ts",
    "app/api/tenants/[tenantId]/metrics/route.ts",
  ];
  for (const r of apiRoutes) {
    check(r + " exists", existsSync(resolve(ROOT, r)));
  }

  try {
    const at = await importModule("lib/api/tenant-api-types.ts");
    check("exports toRunDTO", typeof at.toRunDTO === "function");
    check("exports toEventDTO", typeof at.toEventDTO === "function");
  } catch (e) {
    check("API types", false, e.message);
  }

  // ======================================================================
  const total = passed + failed;
  console.log("\n" + "=".repeat(50));
  console.log("Results: " + passed + "/" + total + " passed, " + failed + "/" + total + " failed");
  console.log("=".repeat(50) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\nValidation script failed:", e);
  process.exit(1);
});
