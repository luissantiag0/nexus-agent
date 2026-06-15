"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cx } from "@/lib/utils";
import type { DagDisplayNode, DagDisplayEdge } from "@/components/dashboard/runs/dag-helpers";

// ============================================================================
// Props
// ============================================================================

export interface DAGViewerProps {
  /** Display-ready nodes with computed statuses and layout */
  nodes: DagDisplayNode[];
  /** Display-ready edges */
  edges: DagDisplayEdge[];
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Node IDs to highlight (e.g. running, completed during replay) */
  highlightedNodeIds?: Set<string>;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Width of the SVG canvas */
  width?: number;
  /** Height of the SVG canvas */
  height?: number;
  /** Optional className for the container */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const NODE_WIDTH = 160;
const NODE_HEIGHT = 44;
const GAP_X = 80;
const GAP_Y = 24;

// ============================================================================
// Layout — simple layered (Sugiyama-style) layout
// ============================================================================

interface LayoutNode extends DagDisplayNode {
  x: number;
  y: number;
}

interface LayoutEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  data: DagDisplayEdge;
}

function computeLayout(
  nodes: DagDisplayNode[],
  edges: DagDisplayEdge[],
): { layoutNodes: LayoutNode[]; layoutEdges: LayoutEdge[] } {
  if (nodes.length === 0) return { layoutNodes: [], layoutEdges: [] };

  const maxLevel = Math.max(...nodes.map((n) => n.level), 0);
  const levels: DagDisplayNode[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const node of nodes) {
    levels[node.level]?.push(node);
  }

  const nodeMap = new Map<string, LayoutNode>();
  const totalHeight = levels.length * (NODE_HEIGHT + GAP_Y) - GAP_Y;

  for (let lvl = 0; lvl < levels.length; lvl++) {
    const levelNodes = levels[lvl];
    const totalWidth = levelNodes.length * (NODE_WIDTH + GAP_X) - GAP_X;
    const startX = -totalWidth / 2;

    for (let i = 0; i < levelNodes.length; i++) {
      const node = levelNodes[i];
      const x = startX + i * (NODE_WIDTH + GAP_X);
      const y = lvl * (NODE_HEIGHT + GAP_Y) - totalHeight / 2;
      nodeMap.set(node.nodeId, { ...node, x, y });
    }
  }

  const layoutEdges: LayoutEdge[] = [];
  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (fromNode && toNode) {
      layoutEdges.push({
        from: { x: fromNode.x + NODE_WIDTH / 2, y: fromNode.y + NODE_HEIGHT / 2 },
        to: { x: toNode.x - NODE_WIDTH / 2, y: toNode.y + NODE_HEIGHT / 2 },
        data: edge,
      });
    }
  }

  return { layoutNodes: [...nodeMap.values()], layoutEdges };
}

// ============================================================================
// Status colors
// ============================================================================

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  pending: {
    fill: "fill-zinc-100 dark:fill-zinc-800",
    stroke: "stroke-zinc-300 dark:stroke-zinc-600",
    text: "text-zinc-500 dark:text-zinc-400",
  },
  running: {
    fill: "fill-blue-50 dark:fill-blue-950/30",
    stroke: "stroke-blue-500 dark:stroke-blue-400",
    text: "text-blue-700 dark:text-blue-400",
  },
  completed: {
    fill: "fill-green-50 dark:fill-green-950/30",
    stroke: "stroke-green-500 dark:stroke-green-400",
    text: "text-green-700 dark:text-green-400",
  },
  succeeded: {
    fill: "fill-green-50 dark:fill-green-950/30",
    stroke: "stroke-green-500 dark:stroke-green-400",
    text: "text-green-700 dark:text-green-400",
  },
  failed: {
    fill: "fill-red-50 dark:fill-red-950/30",
    stroke: "stroke-red-500 dark:stroke-red-400",
    text: "text-red-700 dark:text-red-400",
  },
  skipped: {
    fill: "fill-gray-50 dark:fill-gray-900/30",
    stroke: "stroke-gray-400 dark:stroke-gray-500",
    text: "text-gray-500 dark:text-gray-400",
  },
  timed_out: {
    fill: "fill-orange-50 dark:fill-orange-950/30",
    stroke: "stroke-orange-500 dark:stroke-orange-400",
    text: "text-orange-700 dark:text-orange-400",
  },
  retrying: {
    fill: "fill-amber-50 dark:fill-amber-950/30",
    stroke: "stroke-amber-500 dark:stroke-amber-400",
    text: "text-amber-700 dark:text-amber-400",
  },
};

function getNodeColor(status: string) {
  return NODE_STATUS_COLORS[status] ?? NODE_STATUS_COLORS.pending;
}

// ============================================================================
// Component
// ============================================================================

export function DAGViewer({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds,
  onNodeClick,
  width = 600,
  height = 400,
  className,
}: DAGViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: width / 2, y: height / 2 });
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const { layoutNodes, layoutEdges } = useMemo(
    () => computeLayout(nodes, edges),
    [nodes, edges],
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick],
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.2, Math.min(3, z * factor)));
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if ((e.target as SVGElement).closest("[role='button']")) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const highlighted = highlightedNodeIds ?? new Set<string>();

  if (nodes.length === 0) {
    return (
      <div
        className={cx(
          "flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800",
          className,
        )}
        style={{ width, height }}
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No nodes to display</p>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50",
        className,
      )}
      style={{ width, height }}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md border border-zinc-200 bg-white/90 px-1.5 py-1 text-xs shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-[2.5rem] text-center tabular-nums text-zinc-600 dark:text-zinc-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z * 1.25))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => { setZoom(1); setPan({ x: width / 2, y: height / 2 }); }}
          className="ml-1 rounded px-1 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Reset view"
        >
          Reset
        </button>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        aria-label="Execution DAG visualization"
        role="img"
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="fill-zinc-400 dark:fill-zinc-500" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {layoutEdges.map((edge) => {
            const midX = (edge.from.x + edge.to.x) / 2;
            const midY = (edge.from.y + edge.to.y) / 2;
            const isHighlighted =
              highlighted.has(edge.data.from) || highlighted.has(edge.data.to);

            return (
              <g key={`${edge.data.from}->${edge.data.to}`}>
                <path
                  d={`M ${edge.from.x} ${edge.from.y} Q ${midX} ${edge.from.y} ${midX} ${midY} Q ${midX} ${edge.to.y} ${edge.to.x} ${edge.to.y}`}
                  className={cx(
                    "fill-none transition-colors",
                    isHighlighted
                      ? "stroke-blue-400 dark:stroke-blue-500"
                      : "stroke-zinc-300 dark:stroke-zinc-600",
                  )}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((node) => {
            const colors = getNodeColor(node.status);
            const isSelected = node.nodeId === selectedNodeId;
            const isHighlighted = highlighted.has(node.nodeId);

            return (
              <g
                key={node.nodeId}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.nodeId)}
                onKeyDown={(e: ReactKeyboardEvent<SVGGElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNodeClick(node.nodeId);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Node: ${node.label} (${node.status})`}
                className="cursor-pointer outline-none"
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  ry={8}
                  className={cx(
                    colors.fill,
                    colors.stroke,
                    isSelected && "!stroke-blue-600 dark:!stroke-blue-400",
                    isHighlighted && "!stroke-blue-400 dark:!stroke-blue-400",
                    "transition-[stroke] duration-150",
                  )}
                  strokeWidth={isSelected || isHighlighted ? 2.5 : 1.5}
                />
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cx(
                    "pointer-events-none select-none font-sans text-[11px] font-medium",
                    colors.text,
                  )}
                >
                  {node.label.length > 18 ? node.label.slice(0, 16) + "\u2026" : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
