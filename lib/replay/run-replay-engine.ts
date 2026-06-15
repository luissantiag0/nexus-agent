import type { ExecutionRun, ExecutionEvent, ContextSnapshot } from "@/lib/execution-events/types";
import { ExecutionEventType } from "@/lib/execution-events/types";

export interface ReplayFrame {
  /** Batch timestamp (shared by all events in this batch) */
  timestamp: number;
  /** Node IDs actively running at this point */
  activeNodes: string[];
  /** Node IDs that completed successfully */
  completedNodes: string[];
  /** Node IDs that failed */
  failedNodes: string[];
  /** Node IDs that were skipped */
  skippedNodes: string[];
  /** Full context state at this point (all keys+values resolved) */
  contextSnapshot: Record<string, { value: unknown; sourceAgent: string }>;
  /** All events that fired at this timestamp */
  eventBatch: ExecutionEvent[];
}

export interface ReplayState {
  isPlaying: boolean;
  speed: number; // 0.5-4x
  currentFrameIndex: number;
  currentTime: number;
}

export interface ReplayTimeline {
  frames: ReplayFrame[];
  totalDuration: number;
  frameCount: number;
  nodeIds: string[];
}

export class RunReplayEngine {
  private run: ExecutionRun;
  private state: ReplayState;
  private timeline: ReplayTimeline;

  constructor(run: ExecutionRun) {
    this.run = run;
    this.state = {
      isPlaying: false,
      speed: 1,
      currentFrameIndex: 0,
      currentTime: run.startedAt,
    };
    this.timeline = this.buildTimeline(run);
  }

  private buildTimeline(run: ExecutionRun): ReplayTimeline {
    const sorted = [...run.events].sort((a, b) => a.timestamp - b.timestamp);
    const totalDuration = sorted.length > 1
      ? sorted[sorted.length - 1].timestamp - sorted[0].timestamp
      : 0;
    const nodeIds = [...new Set(sorted.map((e) => e.nodeId).filter(Boolean) as string[])];

    // Batch events by timestamp
    const timestampGroups = new Map<number, ExecutionEvent[]>();
    for (const ev of sorted) {
      const group = timestampGroups.get(ev.timestamp) ?? [];
      group.push(ev);
      timestampGroups.set(ev.timestamp, group);
    }

    const sortedTimestamps = [...timestampGroups.keys()].sort((a, b) => a - b);

    let activeNodes = new Set<string>();
    let completedNodes = new Set<string>();
    let failedNodes = new Set<string>();
    let skippedNodes = new Set<string>();
    let contextState = new Map<string, { value: unknown; sourceAgent: string }>();

    const frames: ReplayFrame[] = sortedTimestamps.map((timestamp) => {
      const batch = timestampGroups.get(timestamp)!;

      for (const event of batch) {
        const nodeId = event.nodeId;
        switch (event.type) {
          case ExecutionEventType.NODE_STARTED:
            if (nodeId) activeNodes.add(nodeId);
            break;
          case ExecutionEventType.NODE_COMPLETED:
            if (nodeId) {
              activeNodes.delete(nodeId);
              completedNodes.add(nodeId);
            }
            break;
          case ExecutionEventType.NODE_FAILED:
            if (nodeId) {
              activeNodes.delete(nodeId);
              failedNodes.add(nodeId);
            }
            break;
          case ExecutionEventType.NODE_SKIPPED:
            if (nodeId) skippedNodes.add(nodeId);
            break;
          case ExecutionEventType.CONTEXT_UPDATED: {
            if (event.agentId && event.data?.writeKeys) {
              const keys = event.data.writeKeys as string[];
              for (const key of keys) {
                contextState.set(key, {
                  value: event.data[`write_${key}`] ?? null,
                  sourceAgent: event.agentId,
                });
              }
            }
            break;
          }
        }
      }

      const resolvedContext: Record<string, { value: unknown; sourceAgent: string }> = {};
      for (const [key, val] of contextState) {
        resolvedContext[key] = val;
      }

      return {
        timestamp,
        activeNodes: [...activeNodes],
        completedNodes: [...completedNodes],
        failedNodes: [...failedNodes],
        skippedNodes: [...skippedNodes],
        contextSnapshot: resolvedContext,
        eventBatch: batch,
      };
    });

    return { frames, totalDuration, frameCount: frames.length, nodeIds };
  }

  getTimeline(): ReplayTimeline { return this.timeline; }
  getState(): ReplayState { return { ...this.state }; }

  getCurrentFrame(): ReplayFrame | null {
    if (this.state.currentFrameIndex < 0 || this.state.currentFrameIndex >= this.timeline.frames.length) return null;
    return this.timeline.frames[this.state.currentFrameIndex];
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.5, Math.min(4, speed));
  }

  play(): void { this.state.isPlaying = true; }
  pause(): void { this.state.isPlaying = false; }

  stepForward(): ReplayFrame | null {
    if (this.state.currentFrameIndex >= this.timeline.frames.length - 1) return null;
    this.state.currentFrameIndex++;
    this.state.currentTime = this.timeline.frames[this.state.currentFrameIndex].timestamp;
    return this.getCurrentFrame();
  }

  stepBackward(): ReplayFrame | null {
    if (this.state.currentFrameIndex <= 0) return null;
    this.state.currentFrameIndex--;
    this.state.currentTime = this.timeline.frames[this.state.currentFrameIndex].timestamp;
    return this.getCurrentFrame();
  }

  seekToTimestamp(timestamp: number): ReplayFrame | null {
    let bestIdx = 0;
    for (let i = 0; i < this.timeline.frames.length; i++) {
      if (this.timeline.frames[i].timestamp <= timestamp) bestIdx = i;
      else break;
    }
    this.state.currentFrameIndex = bestIdx;
    this.state.currentTime = this.timeline.frames[bestIdx].timestamp;
    return this.getCurrentFrame();
  }

  seekToFrameIndex(index: number): ReplayFrame | null {
    const idx = Math.max(0, Math.min(index, this.timeline.frames.length - 1));
    this.state.currentFrameIndex = idx;
    this.state.currentTime = this.timeline.frames[idx].timestamp;
    return this.getCurrentFrame();
  }

  getProgress(): number {
    if (this.timeline.frames.length === 0) return 0;
    return (this.state.currentFrameIndex + 1) / this.timeline.frames.length;
  }

  getHighlightedNodeIds(): Set<string> {
    const frame = this.getCurrentFrame();
    if (!frame) return new Set();
    const highlighted = new Set(frame.activeNodes);
    for (const batch of [frame.eventBatch]) {
      for (const ev of batch) {
        if (ev.nodeId) highlighted.add(ev.nodeId);
      }
    }
    return highlighted;
  }

  getNodeStatus(nodeId: string): "pending" | "running" | "completed" | "failed" | "skipped" {
    const frame = this.getCurrentFrame();
    if (!frame) return "pending";
    if (frame.activeNodes.includes(nodeId)) return "running";
    if (frame.completedNodes.includes(nodeId)) return "completed";
    if (frame.failedNodes.includes(nodeId)) return "failed";
    if (frame.skippedNodes.includes(nodeId)) return "skipped";
    return "pending";
  }

  computeDelayBetweenFrames(frameIndex: number): number {
    if (frameIndex <= 0) return 0;
    const prev = this.timeline.frames[frameIndex - 1];
    const curr = this.timeline.frames[frameIndex];
    if (!prev || !curr) return 0;
    const raw = curr.timestamp - prev.timestamp;
    return Math.max(16, Math.min(5000, raw / this.state.speed));
  }
}
