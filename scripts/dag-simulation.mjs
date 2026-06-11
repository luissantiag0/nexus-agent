// ============================================================================
// Nexus Agent Platform — DAG Execution Simulation
// ============================================================================
// Self-contained simulation demonstrating parallel DAG execution with:
//   - Parallel branches (independent nodes execute concurrently)
//   - Context propagation across levels
//   - Retry logic with exponential backoff
//   - SKIP propagation on downstream node failure
//   - Conditional edges
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** @typedef {'pending'|'running'|'completed'|'failed'|'skipped'|'retrying'} NodeStatus */

/**
 * @typedef {Object} MockAgent
 * @property {string} id
 * @property {string} name
 * @property {(input: Object, ctx: Object) => Promise<{data: Object, confidence: number}>} execute
 * @property {(input: Object) => string[]} validate
 * @property {number} simulateDurationMs
 * @property {boolean} [shouldFail]
 * @property {number} [failRate] - 0-1 probability of failure
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {MockAgent} agent
 * @property {string[]} reads - context keys this node reads
 * @property {string[]} writes - context keys this node writes
 * @property {Object} [inputMap] - maps context keys to agent input fields
 * @property {number} [timeoutMs]
 * @property {number} [maxRetries]
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} from
 * @property {string} to
 * @property {'sequential'|'conditional_true'|'conditional_false'|'data_dependency'} [type]
 * @property {Function} [condition] - (ctx) => boolean
 */

/**
 * @typedef {Object} NodeResult
 * @property {string} nodeId
 * @property {string} agentId
 * @property {NodeStatus} status
 * @property {Object|null} data
 * @property {string|null} error
 * @property {number} durationMs
 * @property {number} retryCount
 * @property {number} level
 */

// ---------------------------------------------------------------------------
// Context Store
// ---------------------------------------------------------------------------

class ContextStore {
  constructor() {
    /** @type {Map<string, Object>} */
    this._data = new Map();
    this._history = [];
    this._version = 0;
  }

  get(key) {
    return this._data.get(key);
  }

  set(key, value) {
    const prev = this._data.get(key);
    this._data.set(key, JSON.parse(JSON.stringify(value)));
    this._history.push({ key, version: ++this._version, prev, value });
  }

  snapshot() {
    const obj = {};
    for (const [key, value] of this._data) {
      obj[key] = JSON.parse(JSON.stringify(value));
    }
    return obj;
  }

  getHistory() {
    return this._history;
  }
}

// ---------------------------------------------------------------------------
// Helper: Sleep
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Mock Agent Factory
// ---------------------------------------------------------------------------

function createMockAgent(id, name, opts = {}) {
  const {
    simulateDurationMs = 500 + Math.floor(Math.random() * 1000),
    failRate = 0,
    alwaysFail = false,
  } = opts;

  return {
    id,
    name,
    simulateDurationMs,
    failRate,
    alwaysFail,

    validate(input) {
      const errors = [];
      if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
      }
      return errors;
    },

    async execute(input, ctx) {
      const startMs = Date.now();
      const actualDuration = simulateDurationMs + Math.floor(Math.random() * 200);

      // Simulate work
      await sleep(actualDuration);

      // Check for forced failure
      if (alwaysFail) {
        throw new Error(`[${id}] Simulated permanent failure`);
      }

      // Check for probabilistic failure
      if (failRate > 0 && Math.random() < failRate) {
        throw new Error(`[${id}] Simulated transient failure`);
      }

      const elapsed = Date.now() - startMs;

      return {
        data: {
          nodeId: id,
          agentName: name,
          processedAt: new Date().toISOString(),
          durationMs: elapsed,
          summary: `${name} completed successfully`,
          ...input,
        },
        confidence: 0.85 + Math.random() * 0.15,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Agent Registry
// ---------------------------------------------------------------------------

class AgentRegistry {
  constructor() {
    /** @type {Map<string, MockAgent>} */
    this._agents = new Map();
  }

  register(agent, overwrite = false) {
    if (this._agents.has(agent.id) && !overwrite) {
      throw new Error(`Agent '${agent.id}' already registered`);
    }
    this._agents.set(agent.id, agent);
  }

  get(id) {
    const agent = this._agents.get(id);
    if (!agent) throw new Error(`Agent '${id}' not found`);
    return agent;
  }

  list() {
    return Array.from(this._agents.values());
  }
}

// ---------------------------------------------------------------------------
// Topological Sort — Kahn's Algorithm
// ---------------------------------------------------------------------------

/**
 * @param {GraphNode[]} nodes
 * @param {GraphEdge[]} edges
 * @returns {GraphNode[][]} levels (each level = parallel-executable nodes)
 */
function topologicalSort(nodes, edges) {
  const nodeIds = new Set(nodes.map(n => n.id));
  const adj = new Map();
  const inDegree = new Map();

  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
    adj.get(edge.from).push(edge.to);
    inDegree.set(edge.to, inDegree.get(edge.to) + 1);
  }

  // Detect cycles via DFS
  const visited = new Set();
  const recursionStack = new Set();
  function hasCycle(node) {
    visited.add(node);
    recursionStack.add(node);
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    recursionStack.delete(node);
    return false;
  }
  for (const id of nodeIds) {
    if (!visited.has(id) && hasCycle(id)) {
      throw new Error(`Cycle detected in graph involving node '${id}'`);
    }
  }

  // Kahn's algorithm for levels
  const levels = [];
  const queue = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  let processed = 0;
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel = [];

    for (let i = 0; i < levelSize; i++) {
      const nodeId = queue.shift();
      processed++;
      const node = nodes.find(n => n.id === nodeId);
      if (node) currentLevel.push(node);

      for (const neighbor of adj.get(nodeId) || []) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    levels.push(currentLevel);
  }

  if (processed !== nodes.length) {
    throw new Error(`Graph contains a cycle: ${processed}/${nodes.length} nodes processed`);
  }

  return levels;
}

// ---------------------------------------------------------------------------
// DAG Executor
// ---------------------------------------------------------------------------

class DagExecutor {
  constructor(nodes, edges, registry) {
    this.nodes = nodes;
    this.edges = edges;
    this.registry = registry;
    this.levels = [];
    this.context = new ContextStore();
    this.results = new Map();
    this.levelResults = [];
  }

  /**
   * Run the full DAG execution.
   */
  async run() {
    console.log('\n' + '='.repeat(72));
    console.log('  NEXUS DAG EXECUTION SIMULATION');
    console.log('='.repeat(72));

    // Phase 1: Analyze
    console.log('\n📐 PHASE 1: Graph Analysis');
    console.log('-'.repeat(40));

    const pending = new Map();
    const completed = new Set();
    const failed = new Set();
    const skipped = new Set();

    this.levels = topologicalSort(this.nodes, this.edges);

    console.log(`  Nodes: ${this.nodes.length}`);
    console.log(`  Edges: ${this.edges.length}`);
    console.log(`  Levels: ${this.levels.length}`);
    this.levels.forEach((level, i) => {
      const names = level.map(n => n.agent.name).join(', ');
      console.log(`    Level ${i}: [${names}]`);
    });

    // Build dependency map
    const deps = new Map();
    const dependents = new Map();
    for (const id of this.nodes.map(n => n.id)) {
      deps.set(id, []);
      dependents.set(id, []);
    }
    for (const edge of this.edges) {
      deps.get(edge.to).push(edge.from);
      dependents.get(edge.from).push(edge.to);
    }

    // Set initial context
    this.context.set('runId', `nexus-dag-sim-${Date.now()}`);
    this.context.set('startedAt', new Date().toISOString());
    this.context.set('project', 'Nexus Agent Platform');
    this.context.set('industry', 'ai-agent-orchestration');

    // Phase 2: Execute
    console.log('\n⚡ PHASE 2: Execution');
    console.log('-'.repeat(40));

    const totalStart = Date.now();

    for (let levelIdx = 0; levelIdx < this.levels.length; levelIdx++) {
      const level = this.levels[levelIdx];
      console.log(`\n  📋 Level ${levelIdx} — ${level.length} node(s) ${level.length > 1 ? '(PARALLEL)' : ''}`);

      const levelStart = Date.now();
      const nodePromises = level.map(node =>
        this.executeNode(node, levelIdx, deps, completed, failed, skipped, dependents)
      );

      const levelNodeResults = await Promise.all(nodePromises);
      const levelDuration = Date.now() - levelStart;

      // Process results
      for (const result of levelNodeResults) {
        this.results.set(result.nodeId, result);
        if (result.status === 'completed') completed.add(result.nodeId);
        else if (result.status === 'failed') failed.add(result.nodeId);
        else if (result.status === 'skipped') skipped.add(result.nodeId);
      }

      // Check for failures and propagate SKIP to dependents
      for (const result of levelNodeResults) {
        if (result.status === 'failed') {
          const downstream = dependents.get(result.nodeId) || [];
          for (const depId of downstream) {
            if (!completed.has(depId) && !failed.has(depId)) {
              skipped.add(depId);
            }
          }
        }
      }

      this.levelResults.push({
        level: levelIdx,
        nodeCount: level.length,
        durationMs: levelDuration,
        results: levelNodeResults,
      });

      console.log(`  ✅ Level ${levelIdx} done — ${levelDuration}ms`);
      console.log(`     Context keys: ${Array.from(this.context._data.keys()).join(', ')}`);
    }

    const totalDuration = Date.now() - totalStart;

    // Phase 3: Report
    this.printReport(totalDuration);
  }

  /**
   * Execute a single graph node with retry logic.
   */
  async executeNode(node, levelIdx, deps, completed, failed, skipped, dependents) {
    const result = {
      nodeId: node.id,
      agentId: node.agent.id,
      status: 'pending',
      data: null,
      error: null,
      durationMs: 0,
      retryCount: 0,
      level: levelIdx,
    };

    const nodeDeps = deps.get(node.id) || [];

    // Check if any dependency failed — if so, skip this node
    for (const depId of nodeDeps) {
      if (failed.has(depId)) {
        result.status = 'skipped';
        result.error = `Dependency '${depId}' failed — node skipped`;
        console.log(`    ⏭️  ${node.agent.name} — SKIPPED (dependency ${depId} failed)`);
        return result;
      }
      if (skipped.has(depId)) {
        result.status = 'skipped';
        result.error = `Dependency '${depId}' was skipped — node skipped`;
        console.log(`    ⏭️  ${node.agent.name} — SKIPPED (dependency ${depId} skipped)`);
        return result;
      }
    }

    // Check conditional edges
    const incomingEdges = this.edges.filter(e => e.to === node.id && e.condition);
    for (const edge of incomingEdges) {
      if (edge.condition && !edge.condition(this.context)) {
        result.status = 'skipped';
        result.error = `Edge condition from '${edge.from}' not met — node skipped`;
        console.log(`    ⏭️  ${node.agent.name} — SKIPPED (condition ${edge.from} -> ${node.id} not met)`);
        return result;
      }
    }

    // Build input from context
    const input = { taskId: `task-${node.id}-${Date.now()}` };
    if (node.reads) {
      for (const key of node.reads) {
        const val = this.context.get(key);
        if (val !== undefined) input[key] = val;
      }
    }
    if (node.inputMap) {
      for (const [ctxKey, inputKey] of Object.entries(node.inputMap)) {
        const val = this.context.get(ctxKey);
        if (val !== undefined) input[inputKey] = val;
      }
    }

    // Validate
    const validationErrors = node.agent.validate(input);
    if (validationErrors.length > 0) {
      result.status = 'failed';
      result.error = `Validation failed: ${validationErrors.join('; ')}`;
      console.log(`    ❌ ${node.agent.name} — FAILED (validation)`);
      return result;
    }

    // Execute with retries
    const maxRetries = node.maxRetries ?? 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        console.log(`    🔄 ${node.agent.name} — retry ${attempt}/${maxRetries} (backoff ${backoffMs}ms)`);
        await sleep(backoffMs);
      }

      try {
        const execResult = await node.agent.execute(input, this.context);
        result.status = 'completed';
        result.data = execResult.data;
        result.durationMs = execResult.data?.durationMs || 0;
        result.retryCount = attempt;

        // Write to context
        if (node.writes) {
          for (const key of node.writes) {
            if (execResult.data && execResult.data[key] !== undefined) {
              this.context.set(key, execResult.data[key]);
            }
          }
        }
        // If there's a direct output mapping
        if (execResult.data) {
          this.context.set(node.id, execResult.data);
        }

        const confidence = execResult.confidence
          ? ` (confidence: ${(execResult.confidence * 100).toFixed(0)}%)`
          : '';
        console.log(`    ✅ ${node.agent.name} — ${result.durationMs}ms${confidence}`);
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          result.status = 'retrying';
        }
      }
    }

    // All retries exhausted
    result.status = 'failed';
    result.error = lastError?.message || 'Unknown error';
    result.retryCount = maxRetries;
    console.log(`    ❌ ${node.agent.name} — FAILED after ${maxRetries} retries: ${result.error}`);
    return result;
  }

  /**
   * Print the final report.
   */
  printReport(totalDurationMs) {
    console.log('\n' + '='.repeat(72));
    console.log('  📊 EXECUTION REPORT');
    console.log('='.repeat(72));

    const completed = [];
    const failed = [];
    const skipped = [];

    for (const result of this.results.values()) {
      if (result.status === 'completed') completed.push(result);
      else if (result.status === 'failed') failed.push(result);
      else if (result.status === 'skipped') skipped.push(result);
    }

    console.log(`\n  Total Duration: ${totalDurationMs}ms`);
    console.log(`  Nodes: ${this.nodes.length} total | ${completed.length} completed | ${failed.length} failed | ${skipped.length} skipped`);

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │ Node-by-Node Results                                         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    for (const result of this.results.values()) {
      const icon = result.status === 'completed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      const name = this.nodes.find(n => n.id === result.nodeId)?.agent?.name || result.nodeId;
      const statusStr = result.status.padEnd(10);
      const durStr = result.durationMs ? `${result.durationMs}ms`.padStart(8) : '    -   ';
      const retryStr = result.retryCount > 0 ? ` (${result.retryCount} retries)` : '';
      const errorStr = result.error ? `  ${result.error}` : '';
      console.log(`  │ ${icon} L${result.level} ${name.padEnd(20)} ${statusStr} ${durStr}${retryStr}${errorStr}`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n  Context State (final snapshot):');
    console.log('  ' + '-'.repeat(55));
    const snapshot = this.context.snapshot();
    for (const [key, value] of Object.entries(snapshot)) {
      const valStr = typeof value === 'object' ? `[${Array.isArray(value) ? 'Array' : 'Object'}]` : String(value).slice(0, 60);
      console.log(`    ${key.padEnd(22)} = ${valStr}`);
    }

    console.log('\n  Context History:');
    console.log('  ' + '-'.repeat(55));
    for (const entry of this.context.getHistory()) {
      console.log(`    v${entry.version}  ${entry.key.padEnd(22)}  SET`);
    }

    // Summary
    if (failed.length > 0) {
      console.log(`\n  ⚠️  ${failed.length} node(s) failed — downstream dependents were SKIPPED`);
    }
    if (skipped.length > 0) {
      console.log(`  ℹ️  ${skipped.length} node(s) skipped`);
    }

    console.log('\n' + '='.repeat(72) + '\n');
  }
}

// ---------------------------------------------------------------------------
// BUILD THE DAG
// ---------------------------------------------------------------------------

function buildSimulationDag(registry) {
  // Register mock agents
  registry.register(createMockAgent('trend-researcher', 'Trend Researcher', {
    simulateDurationMs: 800,
  }));

  registry.register(createMockAgent('seo-specialist', 'SEO Specialist', {
    simulateDurationMs: 600,
  }));

  registry.register(createMockAgent('content-creator', 'Content Creator', {
    simulateDurationMs: 1200,
  }));

  registry.register(createMockAgent('growth-hacker', 'Growth Hacker', {
    simulateDurationMs: 900,
  }));

  registry.register(createMockAgent('social-media-strategist', 'Social Media Strategist', {
    simulateDurationMs: 700,
  }));

  registry.register(createMockAgent('product-manager', 'Product Manager', {
    simulateDurationMs: 1000,
  }));

  registry.register(createMockAgent('proposal-strategist', 'Proposal Strategist', {
    simulateDurationMs: 1100,
  }));

  // Define nodes
  const nodes = [
    {
      id: 'trend-researcher',
      agent: registry.get('trend-researcher'),
      reads: ['project', 'industry'],
      writes: ['trendReport', 'trendingTopics', 'competitiveLandscape'],
      inputMap: { industry: 'targetIndustry' },
    },
    {
      id: 'seo-specialist',
      agent: registry.get('seo-specialist'),
      reads: ['trendReport', 'trendingTopics'],
      writes: ['keywordMap', 'seoBrief', 'topicClusters'],
    },
    {
      id: 'content-creator',
      agent: registry.get('content-creator'),
      reads: ['keywordMap', 'seoBrief'],
      writes: ['contentDraft', 'contentMetadata'],
    },
    {
      id: 'growth-hacker',
      agent: registry.get('growth-hacker'),
      reads: ['trendReport', 'competitiveLandscape'],
      writes: ['growthExperiments', 'channelPriorities'],
    },
    {
      id: 'social-media-strategist',
      agent: registry.get('social-media-strategist'),
      reads: ['contentDraft', 'keywordMap'],
      writes: ['socialStrategy', 'postingSchedule'],
    },
    {
      id: 'product-manager',
      agent: registry.get('product-manager'),
      reads: ['contentDraft', 'growthExperiments', 'socialStrategy'],
      writes: ['productRoadmap', 'goToMarketPlan'],
    },
    {
      id: 'proposal-strategist',
      agent: registry.get('proposal-strategist'),
      reads: ['productRoadmap', 'goToMarketPlan'],
      writes: ['proposal', 'executiveSummary'],
    },
  ];

  // Define edges — this creates a DAG with parallel branches
  // Level 0: trend-researcher
  // Level 1: seo-specialist + growth-hacker (PARALLEL)
  // Level 2: content-creator (depends on seo-specialist)
  // Level 3: social-media-strategist (depends on content-creator)
  //          product-manager (depends on content-creator + growth-hacker)
  // Level 4: proposal-strategist (depends on product-manager)
  const edges = [
    // Level 0 -> Level 1
    { from: 'trend-researcher', to: 'seo-specialist', type: 'sequential' },
    { from: 'trend-researcher', to: 'growth-hacker', type: 'sequential' },

    // Level 1 -> Level 2
    { from: 'seo-specialist', to: 'content-creator', type: 'sequential' },

    // Level 2 -> Level 3
    { from: 'content-creator', to: 'social-media-strategist', type: 'sequential' },

    // Level 1 + Level 2 -> Level 3
    { from: 'growth-hacker', to: 'product-manager', type: 'sequential' },
    { from: 'content-creator', to: 'product-manager', type: 'sequential' },

    // Level 3 -> Level 4
    { from: 'product-manager', to: 'proposal-strategist', type: 'sequential' },
  ];

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// BUILD A DAG WITH CONDITIONAL ROUTING
// ---------------------------------------------------------------------------

function buildConditionalDag(registry) {
  // Register a qc-checker agent that produces a quality score
  const qcAgent = {
    ...createMockAgent('qc-checker', 'Quality Check', { simulateDurationMs: 200 }),
    async execute(input, ctx) {
      await sleep(200 + Math.floor(Math.random() * 100));
      // Produce a random quality score that determines routing
      const qualityScore = Math.random();
      return {
        data: {
          nodeId: 'qc-checker',
          agentName: 'Quality Check',
          qualityScore,
          passed: qualityScore >= 0.7,
          summary: qualityScore >= 0.7 ? 'Quality check passed' : 'Quality check failed — revision needed',
        },
        confidence: 0.95,
      };
    },
  };
  registry.register(qcAgent);

  const baseNodes = buildSimulationDag(registry).nodes.filter(n => n.id !== 'social-media-strategist');

  // Add a quality check node that routes conditionally
  const nodes = [
    ...baseNodes,
    {
      id: 'qc-checker',
      agent: registry.get('qc-checker'),
      reads: ['contentDraft'],
      writes: ['qualityScore'],
    },
    {
      id: 'social-media-strategist',
      agent: registry.get('social-media-strategist'),
      reads: ['contentDraft', 'keywordMap'],
      writes: ['socialStrategy', 'postingSchedule'],
    },
    {
      id: 'content-revision',
      agent: registry.get('content-creator'), // reuse content-creator
      reads: ['contentDraft', 'qualityScore'],
      writes: ['contentDraft'], // overwrites with revision
    },
  ];

  const edges = [
    { from: 'trend-researcher', to: 'seo-specialist', type: 'sequential' },
    { from: 'trend-researcher', to: 'growth-hacker', type: 'sequential' },
    { from: 'seo-specialist', to: 'content-creator', type: 'sequential' },
    { from: 'growth-hacker', to: 'product-manager', type: 'sequential' },
    { from: 'content-creator', to: 'qc-checker', type: 'sequential' },
    // Conditional: if quality >= 0.7, route directly to social-media-strategist
    {
      from: 'qc-checker',
      to: 'social-media-strategist',
      type: 'conditional_true',
      condition: (ctx) => {
        const score = ctx.get('qualityScore');
        return score !== undefined && score >= 0.7;
      },
    },
    // Conditional: if quality < 0.7, route to content-revision
    {
      from: 'qc-checker',
      to: 'content-revision',
      type: 'conditional_false',
      condition: (ctx) => {
        const score = ctx.get('qualityScore');
        return score === undefined || score < 0.7;
      },
    },
    { from: 'content-revision', to: 'social-media-strategist', type: 'sequential' },
    { from: 'social-media-strategist', to: 'product-manager', type: 'sequential' },
    { from: 'product-manager', to: 'proposal-strategist', type: 'sequential' },
  ];

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// BUILD A DAG WITH FAILURE + SKIP PROPAGATION
// ---------------------------------------------------------------------------

function buildFailureDag(registry) {
  // Build the base DAG
  const baseNodes = buildSimulationDag(registry);

  // Override product-manager to always fail (use overwrite=true since it's already registered)
  registry.register(createMockAgent('product-manager', 'Product Manager', {
    simulateDurationMs: 500,
    alwaysFail: true,
  }), true);

  // Rebuild node list with the overridden agent
  const nodes = baseNodes.nodes.map(n =>
    n.id === 'product-manager'
      ? { ...n, agent: registry.get('product-manager') }
      : n
  );

  const edges = [
    ...baseNodes.edges,
    { from: 'proposal-strategist', to: 'deployment-planner', type: 'sequential' },
  ];

  // Add deployment-planner agent
  registry.register(createMockAgent('deployment-planner', 'Deployment Planner', {
    simulateDurationMs: 600,
  }));

  nodes.push({
    id: 'deployment-planner',
    agent: registry.get('deployment-planner'),
    reads: ['proposal', 'executiveSummary'],
    writes: ['deploymentPlan'],
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log('🧪 Nexus Agent Platform — DAG Execution Simulation');
  console.log(`   Started: ${new Date().toISOString()}`);
  console.log(`   Run ID: dag-sim-${Date.now()}`);

  // --- Simulation 1: Normal DAG with Parallel Branches ---
  console.log('\n' + '#'.repeat(72));
  console.log('#  SIMULATION 1: Standard DAG — Parallel Branches');
  console.log('#'.repeat(72));

  const registry1 = new AgentRegistry();
  const { nodes: nodes1, edges: edges1 } = buildSimulationDag(registry1);
  const executor1 = new DagExecutor(nodes1, edges1, registry1);
  await executor1.run();

  // --- Simulation 2: DAG with Conditional Routing ---
  console.log('\n' + '#'.repeat(72));
  console.log('#  SIMULATION 2: Conditional Routing — Quality Gate');
  console.log('#'.repeat(72));

  const registry2 = new AgentRegistry();
  let { nodes: nodes2, edges: edges2 } = buildConditionalDag(registry2);
  const executor2 = new DagExecutor(nodes2, edges2, registry2);
  await executor2.run();

  // --- Simulation 3: DAG with Failure + SKIP Propagation ---
  console.log('\n' + '#'.repeat(72));
  console.log('#  SIMULATION 3: Node Failure — SKIP Propagation');
  console.log('#'.repeat(72));

  const registry3 = new AgentRegistry();
  const { nodes: nodes3, edges: edges3 } = buildFailureDag(registry3);
  const executor3 = new DagExecutor(nodes3, edges3, registry3);
  await executor3.run();

  console.log('\n✅ All simulations complete.\n');
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
