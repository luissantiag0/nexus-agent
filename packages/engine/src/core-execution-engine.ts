// ============================================================================
// Nexus Agent Runtime Engine — Core Execution Engine
// ============================================================================
// AgentRunner, ContextStore, and ExecutionLoop
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Core Interfaces
// ---------------------------------------------------------------------------

interface AgentResult<T> {
  runId: string;
  agentId: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  output: T | null;
  error: string | null;
  durationMs: number;
  timestamp: string;
  retryCount: number;
}

interface ContextSnapshot {
  id: string;
  runId: string;
  version: number;
  keys: Record<string, unknown>;
  createdAt: string;
  parentId: string | null;
}

interface RunState {
  runId: string;
  workflowId: string;
  mode: 'SINGLE_AGENT' | 'CHAIN' | 'DAG';
  status: 'INITIALIZED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  nodes: ExecutionNode[];
  contextId: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ExecutionNode {
  nodeId: string;
  agentId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  durationMs: number | null;
  contextSnapshotBefore: string | null;
  contextSnapshotAfter: string | null;
  dependents: string[];
  dependOn: string[];
}

// ---------------------------------------------------------------------------
// 2. IAgentAdapter<TIn, TOut>
// ---------------------------------------------------------------------------

interface IAgentAdapter<TIn, TOut> {
  readonly agentId: string;
  readonly version: string;
  readonly readsContextKeys: string[];
  readonly writesContextKeys: string[];
  validate(input: unknown): { valid: boolean; errors: string[] };
  execute(input: TIn, context: Record<string, unknown>): Promise<AgentResult<TOut>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  const pid = (typeof process !== 'undefined' && process.pid ? process.pid.toString(36) : '0');
  return `${ts}-${rand}-${pid}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowISO(): string {
  return new Date().toISOString();
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = output[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      output[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      output[key] = srcVal;
    }
  }

  return output;
}

function cloneRecord(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// 3. AgentRunner
// ---------------------------------------------------------------------------

class AgentRunner {
  public readonly runnerId: string;

  constructor(runnerId?: string) {
    this.runnerId = runnerId ?? generateId();
  }

  async run<TIn, TOut>(
    adapter: IAgentAdapter<TIn, TOut>,
    input: TIn,
    context: ContextStore,
    runId: string,
  ): Promise<AgentResult<TOut>> {
    // --- Validate input ---
    const validation = adapter.validate(input);
    if (!validation.valid) {
      return {
        runId,
        agentId: adapter.agentId,
        status: 'FAILED',
        output: null,
        error: `Validation failed: ${validation.errors.join('; ')}`,
        durationMs: 0,
        timestamp: nowISO(),
        retryCount: 0,
      };
    }

    const maxRetries = 2;
    let lastError: string | null = null;
    let output: TOut | null = null;
    let finalStatus: 'SUCCESS' | 'FAILED' | 'RETRY' = 'FAILED';
    let totalDurationMs = 0;
    let attemptsMade = 0;

    // --- Execution with retries ---
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startMs = Date.now();

      try {
        // Gather current context state
        const snapshots = await context.snapshot(runId);
        const ctxState: Record<string, unknown> =
          snapshots.length > 0
            ? cloneRecord(snapshots[snapshots.length - 1].keys)
            : {};

        const result = await adapter.execute(input, ctxState);
        const elapsed = Date.now() - startMs;
        totalDurationMs += elapsed;
        attemptsMade = attempt + 1;

        if (result.status === 'SUCCESS') {
          output = result.output;
          finalStatus = 'SUCCESS';

          // Write outputs into ContextStore on success
          if (output !== null && typeof output === 'object' && !Array.isArray(output)) {
            await context.merge(output as Record<string, unknown>, runId);
          }

          break;
        }

        // Adapter returned FAILED or RETRY
        lastError = result.error;

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt + 1) * 1000;
          await sleep(backoffMs);
        }
      } catch (err: unknown) {
        const elapsed = Date.now() - startMs;
        totalDurationMs += elapsed;
        attemptsMade = attempt + 1;
        lastError = err instanceof Error ? err.message : String(err);

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt + 1) * 1000;
          await sleep(backoffMs);
        }
      }
    }

    const retryCount = Math.max(0, attemptsMade - 1);

    return {
      runId,
      agentId: adapter.agentId,
      status: finalStatus,
      output,
      error: finalStatus === 'SUCCESS' ? null : lastError,
      durationMs: totalDurationMs,
      timestamp: nowISO(),
      retryCount,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. ContextStore
// ---------------------------------------------------------------------------

class ContextStore {
  private readonly store: Map<string, ContextSnapshot[]> = new Map();

  async get(key: string, runId: string): Promise<unknown> {
    const chain = this.store.get(runId);
    if (!chain || chain.length === 0) {
      return undefined;
    }
    // Walk from newest to oldest to find the key
    for (let i = chain.length - 1; i >= 0; i--) {
      if (key in chain[i].keys) {
        return chain[i].keys[key];
      }
    }
    return undefined;
  }

  async set(
    key: string,
    value: unknown,
    runId: string,
  ): Promise<ContextSnapshot> {
    const chain = this.store.get(runId) ?? [];
    const prevSnapshot = chain.length > 0 ? chain[chain.length - 1] : null;
    const prevKeys = prevSnapshot ? cloneRecord(prevSnapshot.keys) : {};

    prevKeys[key] = value;

    const version = prevSnapshot ? prevSnapshot.version + 1 : 1;

    const snapshot: ContextSnapshot = {
      id: generateId(),
      runId,
      version,
      keys: prevKeys,
      createdAt: nowISO(),
      parentId: prevSnapshot ? prevSnapshot.id : null,
    };

    chain.push(snapshot);
    this.store.set(runId, chain);

    return snapshot;
  }

  async merge(
    partial: Record<string, unknown>,
    runId: string,
  ): Promise<ContextSnapshot> {
    const chain = this.store.get(runId) ?? [];
    const prevSnapshot = chain.length > 0 ? chain[chain.length - 1] : null;
    const prevKeys = prevSnapshot ? cloneRecord(prevSnapshot.keys) : {};

    const merged = deepMerge(prevKeys, partial);

    const version = prevSnapshot ? prevSnapshot.version + 1 : 1;

    const snapshot: ContextSnapshot = {
      id: generateId(),
      runId,
      version,
      keys: merged,
      createdAt: nowISO(),
      parentId: prevSnapshot ? prevSnapshot.id : null,
    };

    chain.push(snapshot);
    this.store.set(runId, chain);

    return snapshot;
  }

  async snapshot(runId: string): Promise<ContextSnapshot[]> {
    return this.store.get(runId) ?? [];
  }

  async getVersion(
    runId: string,
    version: number,
  ): Promise<ContextSnapshot | null> {
    const chain = this.store.get(runId);
    if (!chain) return null;
    return chain.find((s) => s.version === version) ?? null;
  }
}

// ---------------------------------------------------------------------------
// 5. ExecutionLoop
// ---------------------------------------------------------------------------

/**
 * Kahn's algorithm for topological ordering.
 */
function topologicalSort(nodes: ExecutionNode[]): ExecutionNode[] {
  const nodeMap = new Map<string, ExecutionNode>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const node of nodes) {
    nodeMap.set(node.nodeId, node);
    inDegree.set(node.nodeId, node.dependOn.length);
    dependents.set(node.nodeId, [...node.dependents]);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);

    for (const depId of dependents.get(id) ?? []) {
      const current = inDegree.get(depId) ?? 1;
      const updated = current - 1;
      inDegree.set(depId, updated);
      if (updated === 0) {
        queue.push(depId);
      }
    }
  }

  // If cycle detected, sorted will be incomplete
  const unsorted = nodes.filter((n) => !sorted.includes(n.nodeId));
  return [...sorted.map((id) => nodeMap.get(id)!), ...unsorted];
}

/**
 * Group topologically sorted nodes into parallel-execution levels.
 */
function groupIntoLevels(sorted: ExecutionNode[]): ExecutionNode[][] {
  const nodeMap = new Map<string, ExecutionNode>();
  for (const n of sorted) nodeMap.set(n.nodeId, n);

  const depth = new Map<string, number>();
  let maxDepth = 0;

  for (const node of sorted) {
    if (node.dependOn.length === 0) {
      depth.set(node.nodeId, 0);
    } else {
      let d = 0;
      for (const depId of node.dependOn) {
        const depDepth = depth.get(depId) ?? 0;
        d = Math.max(d, depDepth + 1);
      }
      depth.set(node.nodeId, d);
      maxDepth = Math.max(maxDepth, d);
    }
  }

  const levels: ExecutionNode[][] = [];
  for (let i = 0; i <= maxDepth; i++) levels.push([]);
  for (const node of sorted) {
    const d = depth.get(node.nodeId) ?? 0;
    levels[d].push(node);
  }

  return levels;
}

class ExecutionLoop {
  async initializeRun(
    mode: RunState['mode'],
    workflowId: string,
    context: ContextStore,
  ): Promise<RunState> {
    const runId = generateId();
    const contextId = generateId();

    const runState: RunState = {
      runId,
      workflowId,
      mode,
      status: 'INITIALIZED',
      nodes: [],
      contextId,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: null,
      error: null,
    };

    return runState;
  }

  async executeNode(
    runState: RunState,
    node: ExecutionNode,
    adapters: Map<string, IAgentAdapter<any, any>>,
    context: ContextStore,
  ): Promise<RunState> {
    const adapter = adapters.get(node.agentId);
    if (!adapter) {
      node.status = 'FAILED';
      node.error = `No adapter registered for agentId "${node.agentId}"`;
      node.durationMs = 0;
      runState.status = 'FAILED';
      runState.error = node.error;
      runState.updatedAt = nowISO();
      return { ...runState, nodes: [...runState.nodes] };
    }

    // Snapshot context before execution
    const snapshotsBefore = await context.snapshot(runState.runId);
    const beforeSnapshot =
      snapshotsBefore.length > 0
        ? snapshotsBefore[snapshotsBefore.length - 1]
        : null;

    node.status = 'RUNNING';
    node.contextSnapshotBefore = beforeSnapshot ? beforeSnapshot.id : null;
    runState.status = 'RUNNING';
    runState.updatedAt = nowISO();

    const runner = new AgentRunner();
    const result = await runner.run(
      adapter,
      node.input,
      context,
      runState.runId,
    );

    // Snapshot context after execution
    const snapshotsAfter = await context.snapshot(runState.runId);
    const afterSnapshot =
      snapshotsAfter.length > 0
        ? snapshotsAfter[snapshotsAfter.length - 1]
        : null;

    node.status =
      result.status === 'SUCCESS'
        ? 'COMPLETED'
        : result.status === 'RETRY'
          ? 'FAILED'
          : 'FAILED';
    node.output = result.output as Record<string, unknown> | null;
    node.error = result.error;
    node.retryCount = result.retryCount;
    node.durationMs = result.durationMs;
    node.contextSnapshotAfter = afterSnapshot ? afterSnapshot.id : null;

    runState.updatedAt = nowISO();

    if (node.status === 'FAILED') {
      runState.error = node.error;
    }

    return { ...runState };
  }

  async executeChain(
    runState: RunState,
    chainNodes: ExecutionNode[],
    adapters: Map<string, IAgentAdapter<any, any>>,
    context: ContextStore,
  ): Promise<RunState> {
    runState.nodes = chainNodes;
    runState.status = 'RUNNING';
    runState.updatedAt = nowISO();

    for (let i = 0; i < chainNodes.length; i++) {
      const node = chainNodes[i];

      // Merge the previous node's output into context for this node's input
      if (i > 0) {
        const prevNode = chainNodes[i - 1];
        if (prevNode.status === 'COMPLETED' && prevNode.output) {
          // Write previous output into context so next node can read it
          await context.merge(prevNode.output, runState.runId);
        }
      }

      const updatedState = await this.executeNode(
        runState,
        node,
        adapters,
        context,
      );

      runState.nodes = updatedState.nodes;
      runState.updatedAt = updatedState.updatedAt;
      runState.error = updatedState.error;

      // If node failed after all retries, stop the chain
      if (node.status === 'FAILED') {
        runState.status = 'FAILED';
        // Mark remaining nodes as SKIPPED
        for (let j = i + 1; j < chainNodes.length; j++) {
          chainNodes[j].status = 'SKIPPED';
          chainNodes[j].error = 'Chain aborted due to prior node failure';
        }
        break;
      }
    }

    if (runState.status !== 'FAILED') {
      runState.status = 'COMPLETED';
    }

    runState.updatedAt = nowISO();
    if (runState.status === 'COMPLETED' || runState.status === 'FAILED') {
      runState.completedAt = nowISO();
    }

    return { ...runState };
  }

  async executeDAG(
    runState: RunState,
    dagNodes: ExecutionNode[],
    adapters: Map<string, IAgentAdapter<any, any>>,
    context: ContextStore,
  ): Promise<RunState> {
    runState.nodes = dagNodes;
    runState.status = 'RUNNING';
    runState.updatedAt = nowISO();

    // Build reverse-dependency map for SKIP propagation
    const nodeMap = new Map<string, ExecutionNode>();
    for (const n of dagNodes) nodeMap.set(n.nodeId, n);

    // Topological sort & group into levels
    const sorted = topologicalSort(dagNodes);
    const levels = groupIntoLevels(sorted);
    const failedNodes = new Set<string>();

    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      const level = levels[levelIdx];

      // Skip nodes whose dependencies have propagated failure
      const executable: ExecutionNode[] = [];
      for (const node of level) {
        // If any dependency failed, mark this node as SKIPPED
        let shouldSkip = false;
        for (const depId of node.dependOn) {
          if (failedNodes.has(depId)) {
            shouldSkip = true;
            break;
          }
        }

        if (shouldSkip) {
          node.status = 'SKIPPED';
          node.error = 'Dependency failed — node skipped';
          continue;
        }

        executable.push(node);
      }

      if (executable.length === 0) continue;

      // Execute all nodes in this level in parallel
      const promises = executable.map((node) =>
        this.executeNode(runState, node, adapters, context).then((state) => {
          runState.nodes = state.nodes;
          return node;
        }),
      );

      const completed = await Promise.all(promises);

      // Collect failures for downstream SKIP propagation
      for (const node of completed) {
        if (node.status === 'FAILED') {
          failedNodes.add(node.nodeId);
        }
      }

      runState.updatedAt = nowISO();
    }

    // Determine overall run status
    let hasFailure = false;
    let hasPending = false;
    for (const node of dagNodes) {
      if (node.status === 'FAILED') hasFailure = true;
      if (node.status === 'PENDING' || node.status === 'RUNNING') hasPending = true;
    }

    if (hasFailure) {
      runState.status = 'FAILED';
      runState.error = runState.error ?? 'One or more nodes failed';
    } else if (!hasPending) {
      runState.status = 'COMPLETED';
    }

    runState.updatedAt = nowISO();
    runState.completedAt = nowISO();

    return { ...runState };
  }

  async finalizeRun(runState: RunState): Promise<RunState> {
    runState.completedAt = nowISO();
    runState.updatedAt = nowISO();

    if (runState.status === 'RUNNING' || runState.status === 'INITIALIZED') {
      runState.status = 'COMPLETED';
    }

    return { ...runState };
  }
}

// ---------------------------------------------------------------------------
// Architecture Diagram
// ---------------------------------------------------------------------------

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                     ExecutionLoop                                    │
 * │                                                                      │
 * │  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐   │
 * │  │ initializeRun │  │ executeNode │  │ executeChain │  │executeDAG │   │
 * │  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘  └─────┬─────┘   │
 * │         │                │                │               │         │
 * │         └────────────────┴────────────────┴───────────────┘         │
 * │                                    │                                 │
 * │                            ┌───────▼───────┐                        │
 * │                            │  AgentRunner   │                        │
 * │                            │  ┌──────────┐  │                        │
 * │                            │  │ validate  │  │                        │
 * │                            │  │ execute*  │  │                        │
 * │                            │  │ retry+    │  │                        │
 * │                            │  │ backoff   │  │                        │
 * │                            │  └─────┬────┘  │                        │
 * │                            └────────┼───────┘                        │
 * │                                     │                                │
 * │                            ┌────────▼───────┐                        │
 * │                            │ IAgentAdapter   │                        │
 * │                            │  readsContext   │                        │
 * │                            │  writesContext  │                        │
 * │                            └────────┬───────┘                        │
 * │                                     │                                │
 * │                            ┌────────▼───────┐                        │
 * │                            │  ContextStore   │                        │
 * │                            │  ┌───────────┐  │                        │
 * │                            │  │ get / set  │  │                        │
 * │                            │  │ merge      │  │                        │
 * │                            │  │ snapshot   │  │                        │
 * │                            │  │ getVersion │  │                        │
 * │                            │  └───────────┘  │                        │
 * │                            └────────────────┘                       │
 * │                                                                      │
 * │  RunState ───────── flows through all phases ────────────────────>   │
 * └──────────────────────────────────────────────────────────────────────┘
 */

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  AgentResult,
  ContextSnapshot,
  RunState,
  ExecutionNode,
  IAgentAdapter,
  AgentRunner,
  ContextStore,
  ExecutionLoop,
};
