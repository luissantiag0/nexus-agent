// ============================================================================
// DAG Visualization Engine — Barrel Exports
// ============================================================================
// Re-exports all DAG visualization components for the execution dashboard.
// Import from '@/components/dashboard/dag' for convenience.
// ============================================================================

// --- Main Viewer ---
export { DAGViewer } from "./DAGViewer";
export type { DAGViewerProps } from "./DAGViewer";

// --- Node Component ---
export { DAGNode } from "./DAGNode";
export type { DAGNodeProps } from "./DAGNode";

// --- Edge Component ---
export { DAGEdge, AllArrowMarkers, ArrowMarkerDef } from "./DAGEdge";
export type { DAGEdgeProps } from "./DAGEdge";

// --- Legend ---
export { DAGLegend } from "./DAGLegend";
export type { DAGLegendProps } from "./DAGLegend";

// --- Default Exports ---
export { default as DAGViewerDefault } from "./DAGViewer";
export { default as DAGNodeDefault } from "./DAGNode";
export { default as DAGEdgeDefault } from "./DAGEdge";
export { default as DAGLegendDefault } from "./DAGLegend";
