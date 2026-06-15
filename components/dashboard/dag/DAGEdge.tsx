"use client";

import React, { useMemo } from "react";
import type { ExecutionRunEdge, EdgePoint } from "@/lib/execution-events/event-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DAGEdgeProps {
  /** The edge data */
  edge: ExecutionRunEdge;
  /** Source connection point (right-center of source node) */
  fromPos: EdgePoint;
  /** Target connection point (left-center of target node) */
  toPos: EdgePoint;
  /** Whether this edge is currently being traversed (live mode) */
  isActive?: boolean;
  /** Whether to animate the dash offset (live mode) */
  isAnimated?: boolean;
}

// ---------------------------------------------------------------------------
// Edge style configuration
// ---------------------------------------------------------------------------

const EDGE_STYLES = {
  SEQUENTIAL: {
    stroke: "#6b7280",
    strokeWidth: 2,
    strokeDasharray: undefined as string | undefined,
    labelColor: "#6b7280",
    animate: true,
  },
  CONDITIONAL_TRUE: {
    stroke: "#3b82f6",
    strokeWidth: 2.5,
    strokeDasharray: undefined as string | undefined,
    labelColor: "#3b82f6",
    animate: true,
  },
  CONDITIONAL_FALSE: {
    stroke: "#f97316",
    strokeWidth: 2.5,
    strokeDasharray: "6 4",
    labelColor: "#f97316",
    animate: true,
  },
  DATA_DEPENDENCY: {
    stroke: "#8b5cf6",
    strokeWidth: 1.5,
    strokeDasharray: "4 4",
    labelColor: "#8b5cf6",
    animate: false,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DAGEdge({
  edge,
  fromPos,
  toPos,
  isActive = false,
  isAnimated = false,
}: DAGEdgeProps) {
  const style = EDGE_STYLES[edge.type] ?? EDGE_STYLES.SEQUENTIAL;

  // Compute a cubic bezier path between the two points
  const pathData = useMemo(() => {
    return computeCurvePath(fromPos, toPos);
  }, [fromPos, toPos]);

  // Build the label position (midpoint of the curve, offset upward)
  const labelPos = useMemo(() => {
    const mx = (fromPos.x + toPos.x) / 2;
    const my = (fromPos.y + toPos.y) / 2 - 12;
    return { x: mx, y: my };
  }, [fromPos, toPos]);

  const activeWidth = isActive ? style.strokeWidth + 1.5 : style.strokeWidth;
  const animateClass =
    isAnimated && style.animate
      ? "animate-dag-edge-flow"
      : "";

  // Map the type to dark mode colors using CSS variables
  const edgeStrokeVar = useMemo(() => {
    switch (edge.type) {
      case "SEQUENTIAL":
        return "var(--dag-edge-sequential, #6b7280)";
      case "CONDITIONAL_TRUE":
        return "var(--dag-edge-conditional-true, #3b82f6)";
      case "CONDITIONAL_FALSE":
        return "var(--dag-edge-conditional-false, #f97316)";
      case "DATA_DEPENDENCY":
        return "var(--dag-edge-data, #8b5cf6)";
      default:
        return "#6b7280";
    }
  }, [edge.type]);

  const label =
    edge.label ??
    (edge.condition
      ? `${edge.condition.field} ${edge.condition.operator}`
      : undefined);

  return (
    <g
      aria-label={`Edge: ${edge.from} → ${edge.to} (${edge.type})`}
      className="dag-edge"
    >
      {/* Shadow / glow for active edges */}
      {isActive && (
        <path
          d={pathData}
          fill="none"
          stroke={edgeStrokeVar}
          strokeWidth={activeWidth + 6}
          strokeLinecap="round"
          opacity={0.15}
          className="transition-opacity duration-300"
        />
      )}

      {/* Main path */}
      <path
        d={pathData}
        fill="none"
        stroke={edgeStrokeVar}
        strokeWidth={activeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={style.strokeDasharray}
        className={[
          "transition-all duration-300",
          animateClass,
        ].join(" ")}
        markerEnd={`url(#arrow-${edge.type.toLowerCase()})`}
      />

      {/* Active traversal animation overlay */}
      {isAnimated && style.animate && (
        <path
          d={pathData}
          fill="none"
          stroke={edgeStrokeVar}
          strokeWidth={activeWidth + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 12"
          opacity={0.6}
          className="animate-dag-edge-dash"
        />
      )}

      {/* Label */}
      {label && (
        <foreignObject
          x={labelPos.x - 60}
          y={labelPos.y - 8}
          width={120}
          height={20}
          className="pointer-events-none overflow-visible"
        >
          <div
            className={[
              "mx-auto w-fit max-w-[110px] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
              "bg-white/90 dark:bg-zinc-800/90",
              "shadow-sm backdrop-blur-sm",
              "text-center",
            ].join(" ")}
            style={{
              color: style.labelColor,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: `${style.labelColor}33`,
            }}
            title={label}
          >
            {label}
          </div>
        </foreignObject>
      )}

      {/* Tooltip on hover (invisible rect to capture events on the thin path) */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        strokeLinecap="round"
        className="cursor-pointer"
      >
        <title>{`${edge.from} → ${edge.to}\nType: ${edge.type}${label ? `\nCondition: ${label}` : ""}`}</title>
      </path>
    </g>
  );
}

// ---------------------------------------------------------------------------
// SVG curve computation
// ---------------------------------------------------------------------------

function computeCurvePath(from: EdgePoint, to: EdgePoint): string {
  const dx = Math.abs(to.x - from.x);
  // Control point offset: use relative distance to shape the curve
  // A larger distance = more pronounced curve
  const cpOffset = Math.max(dx * 0.4, 40);

  // For edges going rightward (most common in DAG layout)
  if (to.x >= from.x) {
    return [
      `M ${from.x} ${from.y}`,
      `C ${from.x + cpOffset} ${from.y}`,
      `  ${to.x - cpOffset} ${to.y}`,
      `  ${to.x} ${to.y}`,
    ].join(" ");
  }

  // Edge going leftward (unusual but handle it)
  const midY = (from.y + to.y) / 2;
  return [
    `M ${from.x} ${from.y}`,
    `C ${from.x + cpOffset} ${from.y}`,
    `  ${(from.x + to.x) / 2} ${midY}`,
    `  ${to.x - cpOffset} ${to.y}`,
    `  ${to.x} ${to.y}`,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Arrow Marker SVG Def — to be rendered once in the parent SVG
// ---------------------------------------------------------------------------

interface ArrowMarkerDefProps {
  id: string;
  color: string;
}

export function ArrowMarkerDef({ id, color }: ArrowMarkerDefProps) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto"
    >
      <path
        d="M 0 0 L 10 5 L 0 10 z"
        fill={color}
      />
    </marker>
  );
}

export function AllArrowMarkers() {
  return (
    <defs>
      <ArrowMarkerDef id="arrow-sequential" color="#6b7280" />
      <ArrowMarkerDef id="arrow-conditional_true" color="#3b82f6" />
      <ArrowMarkerDef id="arrow-conditional_false" color="#f97316" />
      <ArrowMarkerDef id="arrow-data_dependency" color="#8b5cf6" />
    </defs>
  );
}

// Default export for dynamic imports
export default DAGEdge;
