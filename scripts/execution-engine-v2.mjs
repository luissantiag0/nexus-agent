// ============================================================================
// Nexus Agent Platform — Execution Engine v2 Simulation
// ============================================================================
//
// Self-contained simulation demonstrating Execution Engine v2 primitives:
//
//   Primitive 1: ConditionalRouter
//     — Evaluates a condition on the execution context
//     — Routes to one path while leaving the alternate path SKIPPED
//     — Logs the routing decision with rationale
//
//   Primitive 2: Synchronizer
//     — Declares a set of source nodes it synchronizes
//     — Waits for ALL sources to complete before proceeding
//     — Merges their output data into a single combined context
//     — Passes merged context to downstream node
//
//   Primitive 3: ExecutionStateMachine (per-node lifecycle)
//     — INITIALIZED → READY → RUNNING → COMPLETED (normal flow)
//     — INITIALIZED → READY → RUNNING → RETRYING → RUNNING → COMPLETED (retry flow)
//     — INITIALIZED → READY → SKIPPED (skip flow)
//
//   Primitive 4: SKIP Propagation
//     — When a node exhausts its retries and FAILED
//     — All downstream dependents are automatically SKIPPED
//     — Context from earlier (successful) nodes remains intact
//
//   Primitive 5: Complete Workflow DAG
//     — All primitives combined in a realistic marketing campaign DAG
//     — Full execution history printed at the end
//
// Usage:  node scripts/execution-engine-v2.mjs
//
// ============================================================================

// ============================================================================
// 1. UTILITY HELPERS
// ============================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Format ms as a human-readable string */
function fmtMs(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Get a high-resolution timestamp for logging */
function hrt() {
  const now = Date.now();
  return {
    iso: new Date(now).toISOString(),
    epoch: now,
    rel: performance.now(),
  };
}

/** Pad string to fixed width */
function pad(s, len) {
  return String(s).padEnd(len);
}

/** Color helpers using ANSI codes (only if stdout supports it) */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function color(c, text) {
  return `${COLORS[c]}${text}${COLORS.reset}`;
}

function statusColor(status, text) {
  const map = {
    INITIALIZED: 'blue',
    READY: 'cyan',
    RUNNING: 'yellow',
    COMPLETED: 'green',
    FAILED: 'red',
    RETRYING: 'yellow',
    SKIPPED: 'gray',
    WAITING: 'magenta',
  };
  return color(map[status] || 'reset', text);
}

// ============================================================================
// 2. CONTEXT STORE (V2 Enhanced)
// ============================================================================

class ContextStoreV2 {
  constructor() {
    this._data = new Map();
    this._history = [];
    this._version = 0;
    this._observers = new Set();
  }

  get(key) {
    return this._data.get(key);
  }

  set(key, value) {
    const prev = this._data.get(key);
    const cloned = JSON.parse(JSON.stringify(value));
    this._data.set(key, cloned);
    const entry = { key, version: ++this._version, prev, value: cloned, timestamp: hrt().iso };
    this._history.push(entry);
    for (const obs of this._observers) {
      try { obs(entry); } catch { /* ignore observer errors */ }
    }
  }

  has(key) {
    return this._data.has(key);
  }

  keys() {
    return Array.from(this._data.keys());
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

  /** Merge multiple context values by key prefix */
  mergeFrom(results, keyPrefix) {
    for (const [nodeId, data] of Object.entries(results)) {
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          this.set(`${keyPrefix || ''}${nodeId}.${k}`, v);
        }
        this.set(`${keyPrefix || ''}${nodeId}`, data);
      }
    }
  }

  onChange(fn) {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }
}

// ============================================================================
// 3. V2 PRIMITIVES
// ============================================================================

// ----------------------------------------------------------------------------
// Primitive 1: NodeStateMachine — per-node lifecycle tracking
// ----------------------------------------------------------------------------

const VALID_TRANSITIONS = {
  INITIALIZED: ['READY'],
  READY: ['RUNNING', 'SKIPPED'],
  RUNNING: ['COMPLETED', 'FAILED', 'RETRYING', 'WAITING'],
  WAITING: ['RUNNING'],
  RETRYING: ['RUNNING', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  SKIPPED: [],
};

class NodeStateMachine {
  constructor(nodeId, label) {
    this.nodeId = nodeId;
    this.label = label;
    this._state = 'INITIALIZED';
    this._enteredAt = performance.now();
    this._startedAt = this._enteredAt;
    this._transitions = [];
    this._error = null;

    // Record initial state entry
    this._transitions.push({
      from: null,
      to: 'INITIALIZED',
      timestamp: this._enteredAt,
      iso: new Date().toISOString(),
      reason: 'Node created',
    });
  }

  get state() { return this._state; }
  get isTerminal() { return ['COMPLETED', 'FAILED', 'SKIPPED'].includes(this._state); }
  get error() { return this._error; }
  get transitions() { return [...this._transitions]; }
  get transitionCount() { return this._transitions.length - 1; }

  transition(to, { reason, error } = {}) {
    const allowed = VALID_TRANSITIONS[this._state] || [];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid state transition: ${this._state} -> ${to} for node '${this.label}'. ` +
        `Allowed from ${this._state}: [${allowed.join(', ')}]`
      );
    }

    const now = performance.now();
    const entry = {
      from: this._state,
      to,
      timestamp: now,
      iso: new Date().toISOString(),
      reason: reason || '',
    };

    this._transitions.push(entry);

    if (to === 'FAILED' && error) {
      this._error = error;
    }

    this._state = to;
    this._enteredAt = now;
    return this;
  }

  markReady(r) { return this.transition('READY', { reason: r }); }
  markRunning(r) { return this.transition('RUNNING', { reason: r }); }
  markCompleted(r) { return this.transition('COMPLETED', { reason: r }); }
  markFailed(err, r) { return this.transition('FAILED', { reason: r, error: err }); }
  markRetrying(r) { return this.transition('RETRYING', { reason: r }); }
  markSkipped(r) { return this.transition('SKIPPED', { reason: r }); }
  markWaiting(r) { return this.transition('WAITING', { reason: r }); }

  durationInState() {
    return performance.now() - this._enteredAt;
  }

  totalDuration() {
    return performance.now() - this._startedAt;
  }

  printTransitionHistory() {
    console.log(`  ${color('bold', 'State History')} for ${color('cyan', this.label)}:`);
    for (const t of this._transitions) {
      const arrow = t.from
        ? `${statusColor(t.from, t.from.padEnd(12))} ${color('gray', '→')} ${statusColor(t.to, t.to.padEnd(12))}`
        : `  ${color('gray', '→')} ${statusColor(t.to, t.to.padEnd(12))}`;
      const reason = t.reason ? color('gray', `  (${t.reason})`) : '';
      console.log(`    ${arrow}  ${reason}`);
    }
    console.log(`    ${color('dim', `Total: ${fmtMs(this.totalDuration())}  |  ${this.transitionCount} transition(s)`)}`);
  }
}

// ----------------------------------------------------------------------------
// Primitive 2: ConditionalRouter
// ----------------------------------------------------------------------------

class ConditionalRouter {
  /**
   * @param {string} id
   * @param {string} name
   * @param {(ctx: ContextStoreV2) => string} conditionFn
   *        Evaluates context and returns the chosen route ID.
   * @param {Object<string, {target: string, label: string}>} routes
   *        Map of routeId -> { target: nodeId, label: description }
   */
  constructor(id, name, conditionFn, routes) {
    this.id = id;
    this.name = name;
    this.type = 'router';
    this.conditionFn = conditionFn;
    this.routes = routes;        // { routeId: { target, label } }
    this.chosenRoute = null;
    this.stateMachine = new NodeStateMachine(id, name);
  }

  /**
   * Evaluate the condition and return the chosen route.
   * Returns { routeId, target, label }
   */
  evaluate(ctx) {
    const chosen = this.conditionFn(ctx);
    const route = this.routes[chosen];
    if (!route) {
      throw new Error(`Router '${this.name}': unknown route '${chosen}'. Valid: [${Object.keys(this.routes).join(', ')}]`);
    }
    this.chosenRoute = { routeId: chosen, ...route };
    return this.chosenRoute;
  }

  /** Check if a given downstream node is on the active path */
  isActivePath(nodeId) {
    return this.chosenRoute && this.chosenRoute.target === nodeId;
  }

  printRoutingDecision(ctx) {
    const decision = this.chosenRoute;
    console.log(`\n  ${color('bold', '🔀 ConditionalRouter')} — ${color('cyan', this.name)}`);
    console.log(`    ${color('dim', 'Evaluating condition...')}`);
    console.log(`    ${color('bold', 'Decision:')} route = ${color('green', decision.routeId)} → ${color('cyan', decision.label)}`);
    console.log(`    ${color('bold', 'Active target:')} ${color('green', decision.target)}`);
    const inactiveRoutes = Object.entries(this.routes)
      .filter(([id]) => id !== decision.routeId)
      .map(([id, r]) => `'${id}' → ${r.target} (${r.label})`);
    if (inactiveRoutes.length > 0) {
      console.log(`    ${color('bold', 'Inactive (SKIPPED):')} ${color('gray', inactiveRoutes.join(', '))}`);
    }
  }
}

// ----------------------------------------------------------------------------
// Primitive 3: Synchronizer
// ----------------------------------------------------------------------------

class Synchronizer {
  /**
   * @param {string} id
   * @param {string} name
   * @param {string[]} sources - Array of node IDs to synchronize
   * @param {Function} mergeFn - (sourceResults: Object, ctx: ContextStoreV2) => mergedData
   */
  constructor(id, name, sources, mergeFn) {
    this.id = id;
    this.name = name;
    this.type = 'synchronizer';
    this.sources = sources;
    this.mergeFn = mergeFn;
    this.stateMachine = new NodeStateMachine(id, name);
    this.collectedInputs = null;
  }

  /**
   * Collect results from all source nodes and merge them.
   * Called by the executor when all source nodes are completed.
   */
  async collectAndMerge(sourceResults, ctx) {
    this.collectedInputs = { ...sourceResults };
    const merged = this.mergeFn(sourceResults, ctx);
    return merged;
  }

  printSyncEvent() {
    console.log(`\n  ${color('bold', '🔗 Synchronizer')} — ${color('cyan', this.name)}`);
    console.log(`    ${color('dim', `Waiting for: [${this.sources.join(', ')}]`)}`);
    if (this.collectedInputs) {
      const keys = Object.keys(this.collectedInputs);
      console.log(`    ${color('green', '✓')} All ${keys.length} source(s) collected`);
      console.log(`    ${color('dim', 'Merged context keys:')} ${color('cyan', keys.join(', '))}`);
    }
  }
}

// ============================================================================
// 4. MOCK AGENT FACTORY
// ============================================================================

let agentCounter = 0;

function createMockAgent(id, name, opts = {}) {
  const {
    simulateDurationMs = 400 + Math.floor(Math.random() * 800),
    failRate = 0,
    alwaysFail = false,
    failAfterAttempts = Infinity,
    outputData = null,
  } = opts;

  agentCounter++;

  return {
    id,
    name,
    simulateDurationMs,
    failRate,
    alwaysFail,
    failAfterAttempts,
    outputData,

    validate(input) {
      const errors = [];
      if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
      }
      return errors;
    },

    async execute(input, ctx) {
      const startMs = Date.now();
      const actualDuration = simulateDurationMs + Math.floor(Math.random() * 150);
      await sleep(actualDuration);
      const elapsed = Date.now() - startMs;

      if (alwaysFail) {
        throw new Error(`[${id}] Simulated permanent failure`);
      }

      if (failRate > 0 && Math.random() < failRate) {
        throw new Error(`[${id}] Simulated transient failure (rate: ${failRate})`);
      }

      // Provide default output or custom
      const data = outputData || {
        nodeId: id,
        agentName: name,
        processedAt: new Date().toISOString(),
        durationMs: elapsed,
        summary: `${name} completed successfully`,
        ...input,
      };

      return {
        data,
        confidence: 0.80 + Math.random() * 0.20,
      };
    },
  };
}

// ============================================================================
// 5. AGENT REGISTRY
// ============================================================================

class AgentRegistry {
  constructor() {
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

// ============================================================================
// 6. TOPOLOGICAL SORT (V2 — handles conditional awareness)
// ============================================================================

/**
 * Standard topological sort using Kahn's algorithm.
 * Returns nodes grouped into levels (each level = parallel-executable set).
 * CondRouter and Synchronizer are treated as regular nodes for ordering.
 */
function topologicalSortV2(nodes, edges) {
  const nodeIds = new Set(nodes.map(n => n.id));
  const adj = new Map();
  const inDegree = new Map();

  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      console.warn(`  ${color('yellow', '⚠')} Edge references unknown node: ${edge.from} -> ${edge.to}`);
      continue;
    }
    adj.get(edge.from).push(edge.to);
    inDegree.set(edge.to, inDegree.get(edge.to) + 1);
  }

  // Cycle detection via DFS
  const visited = new Set();
  const recStack = new Set();
  function hasCycle(node) {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }
  for (const id of nodeIds) {
    if (!visited.has(id) && hasCycle(id)) {
      throw new Error(`Cycle detected in graph involving node '${id}'`);
    }
  }

  // Kahn's algorithm
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
      currentLevel.push(nodeId);
      for (const neighbor of adj.get(nodeId) || []) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    levels.push(currentLevel);
  }

  if (processed !== nodes.length) {
    throw new Error(
      `Graph contains a cycle: ${processed}/${nodes.length} nodes processed. ` +
      `Unprocessed: [${[...nodeIds].filter(id => !visited.has(id)).join(', ')}]`
    );
  }

  return levels;
}

// ============================================================================
// 7. V2 EXECUTION ENGINE
// ============================================================================

class ExecutionEngineV2 {
  constructor() {
    this.context = new ContextStoreV2();
    this.results = new Map();        // nodeId -> NodeResult
    this.stateMachines = new Map();  // nodeId -> NodeStateMachine
    this.routers = new Map();        // nodeId -> ConditionalRouter
    this.synchronizers = new Map();  // nodeId -> Synchronizer
    this.executionHistory = [];      // log of all events
    this.registry = null;
    this.nodes = [];
    this.edges = [];
    this.levels = [];
  }

  /**
   * Configure a graph from nodes, edges, and primitives.
   *
   * @param {Object[]} nodes — array of node configs
   * @param {Object[]} edges — array of edge configs
   * @param {AgentRegistry} registry
   * @param {Object} [primitives] - { routers: [...], synchronizers: [...] }
   */
  configure(nodes, edges, registry, primitives = {}) {
    this.nodes = nodes;
    this.edges = edges;
    this.registry = registry;

    // Register routers
    if (primitives.routers) {
      for (const router of primitives.routers) {
        this.routers.set(router.id, router);
      }
    }

    // Register synchronizers
    if (primitives.synchronizers) {
      for (const sync of primitives.synchronizers) {
        this.synchronizers.set(sync.id, sync);
      }
    }

    // Create state machines for every node
    for (const node of nodes) {
      const label = node.agent ? node.agent.name : (node.id);
      this.stateMachines.set(node.id, new NodeStateMachine(node.id, label));
    }

    // Create state machines for routers
    for (const [id, router] of this.routers) {
      this.stateMachines.set(id, router.stateMachine);
    }

    // Create state machines for synchronizers
    for (const [id, sync] of this.synchronizers) {
      this.stateMachines.set(id, sync.stateMachine);
    }

    // Topological sort — include routers and synchronizers as graph nodes
    const allIds = new Set(nodes.map(n => n.id));
    for (const [id] of this.routers) allIds.add(id);
    for (const [id] of this.synchronizers) allIds.add(id);
    const allGraphNodes = Array.from(allIds).map(id => ({ id }));
    this.levels = topologicalSortV2(allGraphNodes, edges);

    // Build dependency maps for ALL known node IDs
    this._deps = new Map();
    this._dependents = new Map();
    for (const id of allIds) {
      this._deps.set(id, []);
      this._dependents.set(id, []);
    }
    for (const edge of edges) {
      if (this._deps.has(edge.to)) {
        this._deps.get(edge.to).push(edge.from);
      }
      if (this._dependents.has(edge.from)) {
        this._dependents.get(edge.from).push(edge.to);
      }
    }
  }

  /**
   * Run the full DAG execution.
   */
  async run() {
    const totalStart = Date.now();
    const completed = new Set();
    const failed = new Set();
    const skipped = new Set();

    // Set initial context
    this.context.set('runId', `nexus-v2-${Date.now()}`);
    this.context.set('startedAt', new Date().toISOString());
    this.context.set('project', 'Nexus Agent Platform v2');
    this.context.set('v2Primitives', ['ConditionalRouter', 'Synchronizer', 'StateMachine', 'SKIPPropagation']);

    // Execute level by level
    for (let levelIdx = 0; levelIdx < this.levels.length; levelIdx++) {
      const levelNodeIds = this.levels[levelIdx];
      const levelHasAgent = (id) => this.nodes.find(n => n.id === id) || this.routers.has(id) || this.synchronizers.has(id);
      const levelNodes = levelNodeIds.filter(levelHasAgent);

      if (levelNodes.length === 0) continue;

      console.log(`\n  ${color('bold', `📋 Level ${levelIdx}`)} — ${levelNodes.length} node(s)${levelNodes.length > 1 ? color('yellow', ' (PARALLEL)') : ''}`);

      const levelStart = Date.now();
      const nodePromises = levelNodeIds.map(nodeId =>
        this._executeNode(nodeId, levelIdx, completed, failed, skipped)
      );

      const levelNodeResults = await Promise.all(nodePromises);

      // Process results
      for (const result of levelNodeResults) {
        if (!result) continue;
        this.results.set(result.nodeId, result);
        if (result.status === 'completed') completed.add(result.nodeId);
        else if (result.status === 'failed') failed.add(result.nodeId);
        else if (result.status === 'skipped') skipped.add(result.nodeId);
      }

      // Propagate SKIP for failed nodes
      for (const result of levelNodeResults) {
        if (!result || result.status !== 'failed') continue;
        const downstream = this._dependents.get(result.nodeId) || [];
        for (const depId of downstream) {
          if (!completed.has(depId) && !failed.has(depId) && !skipped.has(depId)) {
            skipped.add(depId);
            const sm = this.stateMachines.get(depId);
            if (sm && sm.state === 'INITIALIZED') {
              sm.markReady('Dependency eligible but upstream failed');
            }
            if (sm && sm.state === 'READY') {
              sm.markSkipped(`Upstream '${result.nodeId}' failed — cascading SKIP`);
            }
            this._log('skip', depId, `Cascaded from failed node '${result.nodeId}'`);
          }
        }
      }

      const levelDuration = Date.now() - levelStart;
      console.log(`  ${color('green', '✅')} Level ${levelIdx} done — ${color('bold', fmtMs(levelDuration))}`);
    }

    const totalDuration = Date.now() - totalStart;
    return { totalDuration, completed, failed, skipped };
  }

  /**
   * Execute a single node (agent, router, or synchronizer).
   */
  async _executeNode(nodeId, levelIdx, completed, failed, skipped) {
    const node = this.nodes.find(n => n.id === nodeId);
    const sm = this.stateMachines.get(nodeId);

    if (!sm) return null;

    // Build base result
    const result = {
      nodeId,
      agentId: node?.agent?.id || nodeId,
      agentName: node?.agent?.name || nodeId,
      status: 'pending',
      data: null,
      error: null,
      durationMs: 0,
      retryCount: 0,
      level: levelIdx,
      stateTransitions: [],
    };

    // === TERMINAL STATE GUARD ===
    // If the state machine is already in a terminal state (e.g. SKIPPED due to
    // upstream failure propagation or inactive router path), return immediately.
    if (sm.isTerminal) {
      result.status = sm.state.toLowerCase();
      result.error = `Node already in terminal state: ${sm.state}`;
      result.stateTransitions = sm.transitions;
      return result;
    }

    // --- Check if this is a ConditionalRouter ---
    if (this.routers.has(nodeId)) {
      return this._executeRouter(nodeId, result, sm, completed, failed, skipped);
    }

    // --- Check if this is a Synchronizer ---
    if (this.synchronizers.has(nodeId)) {
      return this._executeSynchronizer(nodeId, result, sm, completed, failed, skipped);
    }

    // --- Regular Agent Node ---

    // INITIALIZED → READY (check dependencies)
    sm.markReady('Dependencies resolved');

    const nodeDeps = this._deps.get(nodeId) || [];

    // Check if any dependency failed → SKIP
    for (const depId of nodeDeps) {
      if (failed.has(depId) || skipped.has(depId)) {
        sm.markSkipped(`Dependency '${depId}' ${failed.has(depId) ? 'failed' : 'skipped'}`);
        result.status = 'skipped';
        result.error = `Dependency '${depId}' failed/skipped — node skipped`;
        this._log('skip', nodeId, result.error);
        console.log(`    ${color('gray', '⏭️')} ${color('cyan', node.agent.name)} — ${color('gray', 'SKIPPED')} (dependency ${depId} failed)`);
        result.stateTransitions = sm.transitions;
        return result;
      }
    }

    // Check conditional incoming edges
    const incomingEdges = this.edges.filter(e => e.to === nodeId && e.condition);
    for (const edge of incomingEdges) {
      if (!edge.condition(this.context)) {
        sm.markSkipped(`Conditional edge from '${edge.from}' evaluated to false`);
        result.status = 'skipped';
        result.error = `Edge condition from '${edge.from}' not met`;
        this._log('skip', nodeId, result.error);
        console.log(`    ${color('gray', '⏭️')} ${color('cyan', node.agent?.name || nodeId)} — ${color('gray', 'SKIPPED')} (condition ${edge.from} → ${nodeId} = false)`);
        result.stateTransitions = sm.transitions;
        return result;
      }
    }

    // Build input from context
    const input = { taskId: `task-${nodeId}-${Date.now()}` };
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
      sm.markFailed({ message: validationErrors.join('; ') }, 'Validation failed');
      result.status = 'failed';
      result.error = `Validation failed: ${validationErrors.join('; ')}`;
      console.log(`    ${color('red', '❌')} ${color('cyan', node.agent.name)} — ${color('red', 'FAILED')} (validation)`);
      result.stateTransitions = sm.transitions;
      return result;
    }

    // READY → RUNNING
    sm.markRunning('Starting execution');

    // Execute with retries
    const maxRetries = node.maxRetries ?? 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        sm.markRetrying(`Attempt ${attempt}/${maxRetries}`);
        console.log(`    ${color('yellow', '🔄')} ${color('cyan', node.agent.name)} — RETRYING (attempt ${attempt}/${maxRetries}, backoff ${fmtMs(backoffMs)})`);
        await sleep(backoffMs);
        sm.markRunning(`Resumed after retry ${attempt}`);
      }

      try {
        const execResult = await node.agent.execute(input, this.context);

        // RUNNING → COMPLETED
        sm.markCompleted('Execution successful');
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
        if (execResult.data) {
          this.context.set(node.id, execResult.data);
        }

        const confidence = execResult.confidence
          ? ` (confidence: ${(execResult.confidence * 100).toFixed(0)}%)`
          : '';
        const retryNote = attempt > 0 ? ` (${attempt} retr${attempt > 1 ? 'ies' : 'y'})` : '';
        console.log(`    ${color('green', '✅')} ${color('cyan', node.agent.name)} — ${color('bold', fmtMs(result.durationMs))}${confidence}${retryNote}`);

        result.stateTransitions = sm.transitions;
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          // Will retry (don't log failure yet)
        }
      }
    }

    // All retries exhausted
    sm.markFailed({ message: lastError?.message || 'Unknown error' }, `Failed after ${maxRetries} retries`);
    result.status = 'failed';
    result.error = lastError?.message || 'Unknown error';
    result.retryCount = maxRetries;
    console.log(`    ${color('red', '❌')} ${color('cyan', node.agent.name)} — ${color('red', 'FAILED')} after ${maxRetries} retries: ${result.error}`);
    result.stateTransitions = sm.transitions;
    return result;
  }

  /**
   * Execute a ConditionalRouter node.
   */
  async _executeRouter(nodeId, result, sm, completed, failed, skipped) {
    const router = this.routers.get(nodeId);
    result.agentName = router.name;

    // INITIALIZED → READY
    sm.markReady('Dependencies resolved for router');

    // Check if upstream dependency failed
    const routerDeps = this._deps.get(nodeId) || [];
    for (const depId of routerDeps) {
      if (failed.has(depId) || skipped.has(depId)) {
        sm.markSkipped(`Router dependency '${depId}' ${failed.has(depId) ? 'failed' : 'skipped'}`);
        result.status = 'skipped';
        result.error = `Router dependency '${depId}' failed — cannot evaluate`;
        result.stateTransitions = sm.transitions;
        return result;
      }
    }

    // READY → RUNNING
    sm.markRunning('Evaluating routing condition');

    // Simulate quick evaluation
    await sleep(50 + Math.floor(Math.random() * 50));

    // Evaluate condition
    const decision = router.evaluate(this.context);
    router.printRoutingDecision(this.context);
    this._log('router', nodeId, `Routed to: ${decision.routeId} → ${decision.target} (${decision.label})`);

    // RUNNING → COMPLETED
    sm.markCompleted(`Routed to: ${decision.routeId}`);
    result.status = 'completed';
    result.data = {
      routerId: router.id,
      chosenRoute: decision.routeId,
      chosenTarget: decision.target,
    };
    result.durationMs = Date.now() - new Date(sm.transitions[sm.transitions.length - 1].iso).getTime();

    // Write routing decision to context
    this.context.set(`${nodeId}.routingDecision`, {
      routeId: decision.routeId,
      target: decision.target,
      label: decision.label,
    });
    this.context.set(nodeId, result.data);

    console.log(`    ${color('green', '✅')} ${color('cyan', router.name)} — routed via '${color('green', decision.routeId)}'`);

    // Propagate SKIP to inactive routes
    // We need to find all edges from this router and skip nodes not on the active path
    const routerEdges = this.edges.filter(e => e.from === nodeId);
    for (const edge of routerEdges) {
      if (edge.to !== decision.target) {
        // This path should be skipped
        if (!completed.has(edge.to) && !failed.has(edge.to)) {
          skipped.add(edge.to);
          const downstreamSm = this.stateMachines.get(edge.to);
          if (downstreamSm && downstreamSm.state === 'INITIALIZED') {
            downstreamSm.markReady('Router evaluated');
          }
          if (downstreamSm && downstreamSm.state === 'READY') {
            downstreamSm.markSkipped(`Router '${router.name}' chose '${decision.routeId}' instead of this path`);
          }
          this._log('skip', edge.to, `Inactive route from router '${router.name}' (chose: ${decision.routeId})`);
        }
      }
    }

    result.stateTransitions = sm.transitions;
    return result;
  }

  /**
   * Execute a Synchronizer node.
   */
  async _executeSynchronizer(nodeId, result, sm, completed, failed, skipped) {
    const sync = this.synchronizers.get(nodeId);
    result.agentName = sync.name;

    // INITIALIZED → READY
    sm.markReady('Checking source nodes for synchronizer');

    const syncDeps = this._deps.get(nodeId) || [];

    // Check if any source failed → we can still merge what we have, but mark as conditional
    let anyFailed = false;
    for (const srcId of sync.sources) {
      if (failed.has(srcId) || skipped.has(srcId)) {
        anyFailed = true;
        sm.markSkipped(`Source '${srcId}' ${failed.has(srcId) ? 'failed' : 'skipped'} — cannot synchronize`);
        result.status = 'skipped';
        result.error = `Synchronizer source '${srcId}' failed — synchronization aborted`;
        this._log('skip', nodeId, `Source '${srcId}' failed`);
        console.log(`    ${color('gray', '⏭️')} ${color('cyan', sync.name)} — ${color('gray', 'SKIPPED')} (source ${srcId} failed)`);
        result.stateTransitions = sm.transitions;
        return result;
      }
    }

    // All sources completed — READY → RUNNING
    sm.markRunning('Collecting source outputs');
    await sleep(30 + Math.floor(Math.random() * 40));

    // Collect source data from context
    const sourceResults = {};
    for (const srcId of sync.sources) {
      const srcData = this.context.get(srcId);
      sourceResults[srcId] = srcData || {};
    }

    // Print sync event
    sync.collectedInputs = sourceResults;
    sync.printSyncEvent();

    // Merge
    const mergedData = await sync.collectAndMerge(sourceResults, this.context);

    // Write merged data to context
    this.context.set(nodeId, mergedData);
    this.context.set(`${nodeId}.merged`, true);
    this.context.set(`${nodeId}.mergedAt`, new Date().toISOString());
    this.context.set(`${nodeId}.sources`, sync.sources);

    // Write individual keys from merged data
    if (mergedData && typeof mergedData === 'object') {
      for (const [k, v] of Object.entries(mergedData)) {
        if (!k.startsWith('_')) {
          this.context.set(`merged.${k}`, v);
        }
      }
    }

    // RUNNING → COMPLETED
    sm.markCompleted(`Merged ${sync.sources.length} source(s)`);
    result.status = 'completed';
    result.data = mergedData;
    result.durationMs = Date.now() - new Date(sm.transitions[sm.transitions.length - 1].iso).getTime();

    const mergedKeys = Object.keys(mergedData).length;
    console.log(`    ${color('green', '✅')} ${color('cyan', sync.name)} — merged ${mergedKeys} data fields from ${sync.sources.length} source(s)`);

    result.stateTransitions = sm.transitions;
    return result;
  }

  /** Log an execution event */
  _log(type, nodeId, message) {
    this.executionHistory.push({
      timestamp: new Date().toISOString(),
      type,
      nodeId,
      message,
    });
  }

  /** Print final execution report */
  printReport(totalDuration, completed, failed, skipped, scenarioName) {
    console.log(`\n  ${color('bold', '═'.repeat(68))}`);
    console.log(`  ${color('bold', `📊 EXECUTION REPORT — ${scenarioName}`)}`);
    console.log(`  ${color('bold', '═'.repeat(68))}`);

    const allCompleted = [];
    const allFailed = [];
    const allSkipped = [];

    for (const result of this.results.values()) {
      if (result.status === 'completed') allCompleted.push(result);
      else if (result.status === 'failed') allFailed.push(result);
      else if (result.status === 'skipped') allSkipped.push(result);
    }

    console.log(`\n  ${color('bold', 'Duration:')} ${color('green', fmtMs(totalDuration))}`);
    console.log(`  ${color('bold', 'Nodes:')} ${this.nodes.length + this.routers.size + this.synchronizers.size} total ` +
      `| ${color('green', `${allCompleted.length} completed`)} ` +
      `| ${color('red', `${allFailed.length} failed`)} ` +
      `| ${color('gray', `${allSkipped.length} skipped`)}`);

    console.log(`\n  ${color('bold', 'Node-by-Node Results:')}`);
    console.log(`  ${color('dim', '┌─────────────────────────────────────────────────────────────────────────┐')}`);

    // Print regular nodes
    for (const result of this.results.values()) {
      const node = this.nodes.find(n => n.id === result.nodeId);
      const sm = this.stateMachines.get(result.nodeId);

      let icon = result.status === 'completed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      if (this.routers.has(result.nodeId)) icon = '🔀';
      if (this.synchronizers.has(result.nodeId)) icon = '🔗';

      const name = result.agentName || result.nodeId;
      const statusStr = result.status.padEnd(12);
      const durStr = result.durationMs ? `${fmtMs(result.durationMs)}`.padStart(8) : '    -   ';
      const retryStr = result.retryCount > 0 ? ` (${result.retryCount} retr${result.retryCount > 1 ? 'ies' : 'y'})` : '';
      const errorStr = result.error ? `  ${color('red', result.error)}` : '';
      const stateStr = sm ? `${statusColor(sm.state, sm.state)}` : '';
      console.log(`  │ ${icon} L${result.level} ${pad(name, 22)} ${statusStr} ${durStr}${retryStr}  ${stateStr}${errorStr}`);
    }

    // Print routers
    for (const [id, router] of this.routers) {
      const sm = this.stateMachines.get(id);
      const routeStr = router.chosenRoute ? ` → ${color('green', router.chosenRoute.routeId)}` : '';
      console.log(`  │ ${color('magenta', '🔀')} ${pad(router.name, 22)} ${statusColor(sm.state, sm.state.padEnd(12))}        ${routeStr}`);
    }

    // Print synchronizers
    for (const [id, sync] of this.synchronizers) {
      const sm = this.stateMachines.get(id);
      const srcStr = sync.collectedInputs ? ` merged ${Object.keys(sync.collectedInputs).length} sources` : '';
      console.log(`  │ ${color('magenta', '🔗')} ${pad(sync.name, 22)} ${statusColor(sm.state, sm.state.padEnd(12))}       ${srcStr}`);
    }

    console.log(`  ${color('dim', '└─────────────────────────────────────────────────────────────────────────┘')}`);

    // Print execution history
    if (this.executionHistory.length > 0) {
      console.log(`\n  ${color('bold', 'Execution History:')}`);
      console.log(`  ${color('dim', '┌─────────────────────────────────────────────────────────────────────────┐')}`);
      for (const entry of this.executionHistory) {
        const typeIcon = entry.type === 'router' ? '🔀' : entry.type === 'sync' ? '🔗' : entry.type === 'skip' ? '⏭️' : '•';
        console.log(`  │ ${color('dim', entry.timestamp.slice(11, 19))} ${typeIcon} ${pad(entry.nodeId, 20)} ${entry.message}`);
      }
      console.log(`  ${color('dim', '└─────────────────────────────────────────────────────────────────────────┘')}`);
    }

    console.log(`\n  ${color('bold', '═'.repeat(68))}\n`);
  }
}

// ============================================================================
// 8. SCENARIO BUILDERS
// ============================================================================

// ----------------------------------------------------------------------------
// SCENARIO 1: Conditional Routing
// ----------------------------------------------------------------------------

function scenario1_ConditionalRouting(registry) {
  const TREND_AGENT = createMockAgent('trend-researcher', 'Trend Researcher', {
    simulateDurationMs: 600,
    outputData: {
      trendReport: { topic: 'AI Content Marketing', velocity: 'high', volume: 45000 },
      trendingTopics: ['AI Writing Assistants', 'Personalized Content', 'Video SEO'],
      competitiveLandscape: { competitors: 12, gap: 'Interactive Content' },
      contentScore: 0, // Will be set randomly
    },
  });

  const SEO_AGENT = createMockAgent('seo-specialist', 'SEO Specialist', {
    simulateDurationMs: 500,
    outputData: {
      keywordMap: { primary: 'AI content strategy', secondary: ['NLP writing', 'content automation'] },
      seoBrief: { title: 'Future of AI Content', metaDesc: 'How AI is transforming content creation' },
      topicClusters: ['AI Writing', 'Content Strategy', 'Marketing Automation'],
    },
  });

  const CC_AGENT = createMockAgent('content-creator', 'Content Creator', {
    simulateDurationMs: 700,
    outputData: {
      contentDraft: { title: 'The Rise of AI-Powered Content', wordCount: 2500, sections: 5 },
      contentMetadata: { readability: 65, tone: 'professional', seoScore: 82 },
    },
  });

  // Override Trend Researcher to produce a deterministic score
  // The score determines routing path
  const SCORE_THRESHOLD = 70;
  let willScoreHigh = true; // toggle per run

  const customTrend = {
    ...TREND_AGENT,
    async execute(input, ctx) {
      await sleep(600 + Math.floor(Math.random() * 100));
      // Determine score: alternate between runs for demonstration
      willScoreHigh = !willScoreHigh; // toggle each call
      const score = willScoreHigh
        ? 75 + Math.floor(Math.random() * 20)  // 75-94
        : 30 + Math.floor(Math.random() * 35); // 30-64
      const scoreLabel = score >= SCORE_THRESHOLD ? 'PASS' : 'NEEDS_OPTIMIZATION';
      console.log(`    ${color('bold', '📊')} Trend Researcher — contentScore = ${color('bold', score)} ${color(score >= SCORE_THRESHOLD ? 'green' : 'yellow', `(${scoreLabel})`)}`);
      return {
        data: {
          nodeId: 'trend-researcher',
          agentName: 'Trend Researcher',
          trendReport: { topic: 'AI Content Marketing', velocity: 'high', volume: 45000 },
          trendingTopics: ['AI Writing Assistants', 'Personalized Content', 'Video SEO'],
          competitiveLandscape: { competitors: 12, gap: 'Interactive Content' },
          contentScore: score,
          summary: `Trend analysis complete — score: ${score}`,
        },
        confidence: 0.92,
      };
    },
  };

  registry.register(customTrend, true);

  // Conditional Router: if contentScore >= 70 → Content Creator, else → SEO Specialist
  const conditionalRouter = new ConditionalRouter(
    'quality-gate',
    'Quality Gate Router',
    (ctx) => {
      const score = ctx.get('trend-researcher.contentScore') ?? ctx.get('contentScore') ?? 0;
      return score >= SCORE_THRESHOLD ? 'high-score' : 'low-score';
    },
    {
      'high-score': { target: 'content-creator', label: 'Content Creator (score >= 70)' },
      'low-score': { target: 'seo-specialist', label: 'SEO Specialist (score < 70)' },
    }
  );

  // Re-register agents
  registry.register(SEO_AGENT, true);
  registry.register(CC_AGENT, true);

  const nodes = [
    { id: 'trend-researcher', agent: registry.get('trend-researcher'), reads: ['project'], writes: ['trendReport', 'trendingTopics', 'contentScore'] },
    { id: 'seo-specialist', agent: registry.get('seo-specialist'), reads: ['trendReport', 'contentScore'], writes: ['keywordMap', 'seoBrief'] },
    { id: 'content-creator', agent: registry.get('content-creator'), reads: ['trendReport', 'contentScore'], writes: ['contentDraft', 'contentMetadata'] },
  ];

  const edges = [
    { from: 'trend-researcher', to: 'quality-gate', type: 'sequential' },
    { from: 'quality-gate', to: 'seo-specialist', type: 'route:low-score' },
    { from: 'quality-gate', to: 'content-creator', type: 'route:high-score' },
  ];

  return { nodes, edges, routers: [conditionalRouter] };
}

// ----------------------------------------------------------------------------
// SCENARIO 2: Synchronization
// ----------------------------------------------------------------------------

function scenario2_Synchronization(registry) {
  const SEO_AGENT = createMockAgent('seo-specialist', 'SEO Specialist', {
    simulateDurationMs: 600,
    outputData: {
      keywordMap: { primary: 'AI content', secondary: ['NLP', 'automation'] },
      seoBrief: { title: 'SEO Report', metaDesc: 'Keyword opportunities found' },
    },
  });

  const GH_AGENT = createMockAgent('growth-hacker', 'Growth Hacker', {
    simulateDurationMs: 500,
    outputData: {
      growthExperiments: [{ name: 'Referral Program', projected: '+25%' }],
      channelPriorities: ['Organic Social', 'Email', 'Paid Search'],
    },
  });

  const CC_AGENT = createMockAgent('content-creator', 'Content Creator', {
    simulateDurationMs: 700,
    outputData: {
      contentDraft: { title: 'Growth-Driven Content', wordCount: 3000 },
    },
  });

  registry.register(SEO_AGENT);
  registry.register(GH_AGENT);
  registry.register(CC_AGENT);

  const synchronizer = new Synchronizer(
    'seo-growth-sync',
    'SEO + Growth Synchronizer',
    ['seo-specialist', 'growth-hacker'],
    (sourceResults, ctx) => {
      // Merge SEO and Growth data into a combined output
      const seoData = sourceResults['seo-specialist'] || {};
      const growthData = sourceResults['growth-hacker'] || {};
      const merged = {
        _sources: ['seo-specialist', 'growth-hacker'],
        combinedKeywords: seoData.keywordMap,
        combinedGrowth: growthData.growthExperiments,
        combinedChannels: growthData.channelPriorities,
        strategyBrief: {
          primaryKeyword: seoData.keywordMap?.primary || 'N/A',
          topChannel: (growthData.channelPriorities || [])[0] || 'N/A',
        },
        synchronizedAt: new Date().toISOString(),
        syncDuration: `SEO: ${seoData.durationMs || '?'}ms, Growth: ${growthData.durationMs || '?'}ms`,
      };
      return merged;
    }
  );

  const nodes = [
    { id: 'seo-specialist', agent: registry.get('seo-specialist'), reads: ['project'], writes: ['keywordMap', 'seoBrief'] },
    { id: 'growth-hacker', agent: registry.get('growth-hacker'), reads: ['project'], writes: ['growthExperiments', 'channelPriorities'] },
    { id: 'content-creator', agent: registry.get('content-creator'), reads: ['merged.combinedKeywords', 'seoBrief'], writes: ['contentDraft', 'contentMetadata'] },
  ];

  const edges = [
    { from: 'seo-specialist', to: 'seo-growth-sync', type: 'sequential' },
    { from: 'growth-hacker', to: 'seo-growth-sync', type: 'sequential' },
    { from: 'seo-growth-sync', to: 'content-creator', type: 'sequential' },
  ];

  return { nodes, edges, synchronizers: [synchronizer] };
}

// ----------------------------------------------------------------------------
// SCENARIO 3: Full Execution State Machine
// ----------------------------------------------------------------------------

function scenario3_StateMachine(registry) {
  // Normal flow agent (always succeeds)
  const NORMAL_AGENT = createMockAgent('normal-node', 'Normal Node', {
    simulateDurationMs: 500,
  });

  // Retry flow agent (fails once then succeeds)
  let retryAttempts = 0;
  const RETRY_AGENT = {
    ...createMockAgent('retry-node', 'Retry Node', { simulateDurationMs: 300 }),
    async execute(input, ctx) {
      retryAttempts++;
      await sleep(300 + Math.floor(Math.random() * 50));
      if (retryAttempts <= 1) {
        throw new Error('[retry-node] Simulated transient failure (first attempt)');
      }
      return {
        data: {
          nodeId: 'retry-node',
          agentName: 'Retry Node',
          summary: 'Retry node succeeded on second attempt',
          retryInfo: { attempts: retryAttempts, recovered: true },
        },
        confidence: 0.95,
      };
    },
  };

  // Skip flow agent (condition prevents execution)
  const SKIP_AGENT = createMockAgent('skip-node', 'Skip Node', {
    simulateDurationMs: 400,
  });

  // A condition-checking "gate" node
  const GATE_AGENT = createMockAgent('condition-gate', 'Condition Gate', {
    simulateDurationMs: 100,
    outputData: {
      gateResult: 'denied',
      reason: 'Precondition not satisfied',
    },
  });

  registry.register(NORMAL_AGENT);
  registry.register(RETRY_AGENT);
  registry.register(SKIP_AGENT);
  registry.register(GATE_AGENT);

  const nodes = [
    { id: 'normal-node', agent: registry.get('normal-node'), reads: [], writes: ['normalResult'] },
    { id: 'retry-node', agent: registry.get('retry-node'), reads: [], writes: ['retryResult'], maxRetries: 2 },
    { id: 'condition-gate', agent: registry.get('condition-gate'), reads: [], writes: ['gateResult'] },
    { id: 'skip-node', agent: registry.get('skip-node'), reads: ['gateResult'], writes: ['skipResult'] },
  ];

  // The skip-node has a conditional edge that will evaluate to false
  const edges = [
    { from: 'normal-node', to: 'retry-node', type: 'sequential' },
    { from: 'retry-node', to: 'condition-gate', type: 'sequential' },
    { from: 'condition-gate', to: 'skip-node', type: 'conditional', condition: (ctx) => false },
  ];

  return { nodes, edges };
}

// ----------------------------------------------------------------------------
// SCENARIO 4: Failure with SKIP Propagation
// ----------------------------------------------------------------------------

function scenario4_FailureWithSkip(registry) {
  const TREND_AGENT = createMockAgent('trend-researcher', 'Trend Researcher', {
    simulateDurationMs: 400,
    outputData: {
      trendReport: { topic: 'Market Analysis', insights: ['Growing demand', 'New entrants'] },
      confidence: 'high',
    },
  });

  const SEO_AGENT = createMockAgent('seo-specialist', 'SEO Specialist', {
    simulateDurationMs: 500,
    outputData: {
      keywordMap: { primary: 'market trend analysis' },
      opportunities: ['Long-tail keywords', 'Question-based queries'],
    },
  });

  const PM_AGENT = createMockAgent('product-manager', 'Product Manager', {
    simulateDurationMs: 300,
    alwaysFail: true,  // Will fail every time
  });

  const PS_AGENT = createMockAgent('proposal-strategist', 'Proposal Strategist', {
    simulateDurationMs: 500,
    outputData: {
      proposal: { title: 'Strategic Proposal', budget: 50000 },
      executiveSummary: 'Expand into new market segments',
    },
  });

  registry.register(TREND_AGENT);
  registry.register(SEO_AGENT);
  registry.register(PM_AGENT);
  registry.register(PS_AGENT);

  const nodes = [
    { id: 'trend-researcher', agent: registry.get('trend-researcher'), reads: ['project'], writes: ['trendReport'] },
    { id: 'seo-specialist', agent: registry.get('seo-specialist'), reads: ['trendReport'], writes: ['keywordMap'] },
    { id: 'product-manager', agent: registry.get('product-manager'), reads: ['trendReport', 'keywordMap'], writes: ['productRoadmap'], maxRetries: 2 },
    { id: 'proposal-strategist', agent: registry.get('proposal-strategist'), reads: ['productRoadmap'], writes: ['proposal', 'executiveSummary'] },
  ];

  const edges = [
    { from: 'trend-researcher', to: 'seo-specialist', type: 'sequential' },
    { from: 'seo-specialist', to: 'product-manager', type: 'sequential' },
    { from: 'product-manager', to: 'proposal-strategist', type: 'sequential' },
  ];

  return { nodes, edges };
}

// ----------------------------------------------------------------------------
// SCENARIO 5: Complete Workflow (All Primitives)
// ----------------------------------------------------------------------------

function scenario5_CompleteWorkflow(registry) {
  // ──────────────────────────────────────────────────────────────────────────
  // Agent definitions
  // ──────────────────────────────────────────────────────────────────────────

  const TREND = createMockAgent('trend-researcher', 'Trend Researcher', {
    simulateDurationMs: 700,
    outputData: {
      trendReport: { topic: 'AI in 2026', velocity: 'very high' },
      trendingTopics: ['Agentic AI', 'Multimodal Search', 'Content Personalization'],
      engagementScore: 82,
    },
  });

  const SEO = createMockAgent('seo-specialist', 'SEO Specialist', {
    simulateDurationMs: 550,
    outputData: {
      keywordMap: { primary: 'AI agents 2026', secondary: ['multimodal SEO', 'personalized search'] },
      seoBrief: { title: 'SEO Strategy 2026', metaDesc: 'Optimize for AI-driven search' },
      technicalAudit: { coreWebVitals: 'pass', structuredData: 'needs work' },
    },
  });

  const GROWTH = createMockAgent('growth-hacker', 'Growth Hacker', {
    simulateDurationMs: 480,
    outputData: {
      growthExperiments: [
        { name: 'AI Content Hub', projectedLift: '+35%' },
        { name: 'Personalized Email Series', projectedLift: '+20%' },
      ],
      channelPriorities: ['Organic Search', 'AI Discovery Platforms', 'Newsletter'],
      viralCoefficient: 0.12,
    },
  });

  const CC = createMockAgent('content-creator', 'Content Creator', {
    simulateDurationMs: 800,
    outputData: {
      contentDraft: {
        title: 'The 2026 AI Content Revolution',
        sections: ['Introduction', 'Agentic Content', 'Multimodal Strategy', 'Timeline'],
        wordCount: 3500,
      },
      contentMetadata: { readability: 70, tone: 'authoritative', seoScore: 88 },
    },
  });

  const SMS = createMockAgent('social-media-strategist', 'Social Media Strategist', {
    simulateDurationMs: 450,
    outputData: {
      socialStrategy: {
        platforms: ['LinkedIn', 'X', 'YouTube'],
        contentMix: { educational: 0.5, thoughtLeadership: 0.3, promotional: 0.2 },
      },
      postingSchedule: { frequency: '3x/week', bestTimes: ['Tue 10am', 'Thu 2pm'] },
    },
  });

  const EMAIL = createMockAgent('email-campaign', 'Email Campaign', {
    simulateDurationMs: 400,
    outputData: {
      emailSequence: [
        { subject: 'The Future of AI Content', day: 1, type: 'educational' },
        { subject: 'Your AI Content Playbook', day: 3, type: 'value' },
        { subject: 'Exclusive: AI Toolkit', day: 7, type: 'conversion' },
      ],
      segments: ['Early Adopters', 'Enterprise', 'SMB'],
    },
  });

  const ANALYTICS = createMockAgent('analytics-dashboard', 'Analytics Dashboard', {
    simulateDurationMs: 350,
    outputData: {
      dashboard: { kpis: ['Traffic', 'Engagement', 'Conversion'], forecast: 'positive' },
      report: 'All channels performing above target',
    },
  });

  registry.register(TREND);
  registry.register(SEO);
  registry.register(GROWTH);
  registry.register(CC);
  registry.register(SMS);
  registry.register(EMAIL);
  registry.register(ANALYTICS);

  // ──────────────────────────────────────────────────────────────────────────
  // Router: Route based on engagementScore
  // ──────────────────────────────────────────────────────────────────────────

  const campaignRouter = new ConditionalRouter(
    'campaign-router',
    'Campaign Router',
    (ctx) => {
      const score = ctx.get('trend-researcher.engagementScore') ?? ctx.get('engagementScore') ?? 0;
      return score >= 75 ? 'social-media' : 'email-campaign';
    },
    {
      'social-media': { target: 'social-media-strategist', label: 'Social Media Campaign (score >= 75)' },
      'email-campaign': { target: 'email-campaign', label: 'Email Campaign (score < 75)' },
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Synchronizer: Merge SEO + Growth data
  // ──────────────────────────────────────────────────────────────────────────

  const seoGrowthSync = new Synchronizer(
    'seo-growth-sync',
    'SEO + Growth Sync',
    ['seo-specialist', 'growth-hacker'],
    (sourceResults, ctx) => {
      const seoData = sourceResults['seo-specialist'] || {};
      const growthData = sourceResults['growth-hacker'] || {};
      return {
        combinedKeywords: seoData.keywordMap?.primary || 'N/A',
        combinedExperiments: growthData.growthExperiments || [],
        combinedChannels: growthData.channelPriorities || [],
        strategyAlignment: {
          primaryKeyword: seoData.keywordMap?.primary || 'N/A',
          topChannel: (growthData.channelPriorities || [])[0] || 'N/A',
          seoScore: seoData.technicalAudit?.coreWebVitals || 'unknown',
          virality: growthData.viralCoefficient || 0,
        },
        syncTimestamp: new Date().toISOString(),
      };
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Nodes
  // ──────────────────────────────────────────────────────────────────────────

  const nodes = [
    { id: 'trend-researcher', agent: registry.get('trend-researcher'), reads: ['project'], writes: ['trendReport', 'trendingTopics', 'engagementScore'] },
    { id: 'seo-specialist', agent: registry.get('seo-specialist'), reads: ['trendReport', 'trendingTopics'], writes: ['keywordMap', 'seoBrief', 'technicalAudit'] },
    { id: 'growth-hacker', agent: registry.get('growth-hacker'), reads: ['trendReport', 'trendingTopics'], writes: ['growthExperiments', 'channelPriorities', 'viralCoefficient'] },
    { id: 'content-creator', agent: registry.get('content-creator'), reads: ['merged.strategyAlignment', 'seoBrief'], writes: ['contentDraft', 'contentMetadata'] },
    { id: 'social-media-strategist', agent: registry.get('social-media-strategist'), reads: ['contentDraft', 'contentMetadata', 'merged.combinedChannels'], writes: ['socialStrategy', 'postingSchedule'] },
    { id: 'email-campaign', agent: registry.get('email-campaign'), reads: ['contentDraft', 'contentMetadata', 'merged.combinedKeywords'], writes: ['emailSequence', 'segments'] },
    { id: 'analytics-dashboard', agent: registry.get('analytics-dashboard'), reads: ['socialStrategy', 'emailSequence'], writes: ['dashboard', 'report'] },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Edges
  // ──────────────────────────────────────────────────────────────────────────

  const edges = [
    // Trend Researcher fans out to SEO and Growth in parallel
    { from: 'trend-researcher', to: 'seo-specialist', type: 'sequential' },
    { from: 'trend-researcher', to: 'growth-hacker', type: 'sequential' },

    // SEO and Growth both feed into the Synchronizer
    { from: 'seo-specialist', to: 'seo-growth-sync', type: 'sequential' },
    { from: 'growth-hacker', to: 'seo-growth-sync', type: 'sequential' },

    // Synchronizer feeds Content Creator
    { from: 'seo-growth-sync', to: 'content-creator', type: 'sequential' },

    // Content Creator feeds the Campaign Router
    { from: 'content-creator', to: 'campaign-router', type: 'sequential' },

    // Router splits to Social Media or Email based on score
    { from: 'campaign-router', to: 'social-media-strategist', type: 'route:social-media' },
    { from: 'campaign-router', to: 'email-campaign', type: 'route:email-campaign' },

    // Both paths converge into Analytics Dashboard
    { from: 'social-media-strategist', to: 'analytics-dashboard', type: 'sequential' },
    { from: 'email-campaign', to: 'analytics-dashboard', type: 'sequential' },
  ];

  return {
    nodes,
    edges,
    routers: [campaignRouter],
    synchronizers: [seoGrowthSync],
  };
}

// ============================================================================
// 9. SIMULATION RUNNER
// ============================================================================

async function runScenario(number, title, buildFn) {
  console.log(`\n${'█'.repeat(72)}`);
  console.log(`  ${color('bold', `SCENARIO ${number}: ${title}`)}`);
  console.log(`${'█'.repeat(72)}\n`);

  const registry = new AgentRegistry();
  const config = buildFn(registry);
  const engine = new ExecutionEngineV2();

  engine.configure(config.nodes, config.edges, registry, {
    routers: config.routers || [],
    synchronizers: config.synchronizers || [],
  });

  console.log(`  ${color('bold', 'Graph Topology:')}`);
  engine.levels.forEach((level, i) => {
    const labels = level.map(id => {
      const node = config.nodes.find(n => n.id === id);
      return node?.agent?.name || id;
    });
    console.log(`    ${color('dim', `Level ${i}:`)} [${labels.join(', ')}]`);
  });

  console.log(`\n  ${color('bold', 'Executing...')}`);
  const result = await engine.run();
  engine.printReport(result.totalDuration, result.completed, result.failed, result.skipped, title);

  // Print state transition histories for key nodes
  const hasStateMachines = engine.stateMachines.size > 0;
  if (hasStateMachines) {
    console.log(`  ${color('bold', 'State Transition Details:')}`);
    for (const [nodeId, sm] of engine.stateMachines) {
      if (sm.transitions.length > 1) {
        // Only print nodes that actually transitioned
        const node = config.nodes.find(n => n.id === nodeId);
        const label = node?.agent?.name || nodeId;
        console.log(`\n  ${color('bold', `[${label}]`)} ${color('dim', `(${nodeId})`)}`);
        sm.printTransitionHistory();
      }
    }
  }

  return engine;
}

// ============================================================================
// 10. MAIN
// ============================================================================

async function main() {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  ${color('bold', '🏗️  NEXUS AGENT PLATFORM — EXECUTION ENGINE v2')}`);
  console.log(`  ${color('bold', 'Self-Contained Simulation of V2 Primitives')}`);
  console.log(`  ${color('dim', `Started: ${new Date().toISOString()}`)}`);
  console.log(`  ${color('dim', `Run ID: ee-v2-${Date.now()}`)}`);
  console.log(`${'='.repeat(72)}`);

  console.log(`\n  ${color('bold', 'V2 Primitives Demonstrated:')}`);
  console.log(`  ${color('green', '✓')} ${color('bold', 'ConditionalRouter')} — condition-based path selection`);
  console.log(`  ${color('green', '✓')} ${color('bold', 'Synchronizer')} — parallel branch merging`);
  console.log(`  ${color('green', '✓')} ${color('bold', 'ExecutionStateMachine')} — full state lifecycle`);
  console.log(`  ${color('green', '✓')} ${color('bold', 'SKIP Propagation')} — automatic downstream skipping on failure`);
  console.log(`  ${color('green', '✓')} ${color('bold', 'Complete Workflow DAG')} — all primitives combined`);

  // ── Scenario 1: Conditional Routing ────────────────────────────────────
  await runScenario(1, 'Conditional Routing', () => {
    const registry = new AgentRegistry();
    return scenario1_ConditionalRouting(registry);
  });

  // ── Scenario 2: Synchronization ────────────────────────────────────────
  await runScenario(2, 'Synchronization — Parallel Branch Merging', (registry) => {
    return scenario2_Synchronization(registry);
  });

  // ── Scenario 3: Full Execution State Machine ───────────────────────────
  await runScenario(3, 'Full Execution State Machine', (registry) => {
    return scenario3_StateMachine(registry);
  });

  // ── Scenario 4: Failure + SKIP Propagation ─────────────────────────────
  await runScenario(4, 'Failure with SKIP Propagation', (registry) => {
    return scenario4_FailureWithSkip(registry);
  });

  // ── Scenario 5: Complete Workflow ──────────────────────────────────────
  await runScenario(5, 'Complete Workflow — All Primitives', (registry) => {
    return scenario5_CompleteWorkflow(registry);
  });

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  ${color('bold', '✅ ALL SCENARIOS COMPLETE')}`);
  console.log(`  ${color('dim', 'Execution Engine v2 primitives demonstrated successfully:')}`);
  console.log(`  ${color('green', '  ✓')} ConditionalRouter — ${color('bold', 'Scenario 1')} (Quality Gate)`);
  console.log(`  ${color('green', '  ✓')} Synchronizer    — ${color('bold', 'Scenario 2')} (SEO + Growth merge)`);
  console.log(`  ${color('green', '  ✓')} StateMachine    — ${color('bold', 'Scenario 3')} (Normal / Retry / Skip flows)`);
  console.log(`  ${color('green', '  ✓')} SKIP Propagation — ${color('bold', 'Scenario 4')} (PM failure → Proposal skipped)`);
  console.log(`  ${color('green', '  ✓')} Complete Workflow — ${color('bold', 'Scenario 5')} (Marketing campaign DAG)`);
  console.log(`${'='.repeat(72)}\n`);
}

main().catch(err => {
  console.error(`\n  ${color('red', '❌ Simulation failed:')}`, err);
  process.exit(1);
});
