// ============================================================================
// GET /api/runs/stream — Global SSE stream for all execution runs
// ============================================================================
// Server-Sent Events endpoint that streams execution events for ALL runs
// in real time. Designed for the dashboard overview page so operators can
// monitor all workflow activity in a single view.
//
// SSE wire format:
//   event: NODE_STARTED
//   data: {"runId":"...","nodeId":"...","timestamp":...,"type":"NODE_STARTED"}
//
// Keepalive: a comment line (`: keepalive`) is sent every 30 seconds to
// maintain the connection through proxies and load balancers.
//
// Client disconnect is detected via the request's AbortSignal, ensuring
// clean cleanup of stream resources.
//
// CORS headers are set to allow cross-origin SSE consumption.
//
// Response: text/event-stream (SSE)
// ============================================================================

import type { NextRequest } from "next/server";
import { executionEventStream } from "@/lib/execution-events/stream";
import { ExecutionEventType } from "@/lib/execution-events/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Keepalive interval in milliseconds (30 seconds).
 */
const KEEPALIVE_MS = 30_000;

/**
 * SSE comment line used to keep the connection alive.
 */
const KEEPALIVE_FRAME = ": keepalive\n\n";

/**
 * Encodes a single SSE message frame.
 */
function encodeSSE(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_request: NextRequest) {
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to ALL events across all runs
      unsubscribe = executionEventStream.subscribeAll((event) => {
        try {
          const frame = encodeSSE(event.type, event as unknown as Record<string, unknown>);
          controller.enqueue(new TextEncoder().encode(frame));
        } catch (err) {
          if (err instanceof TypeError) {
            // Stream already closed — unsubscribe will clean up
          }
        }
      });

      // Send an initial "connected" event so the client knows the stream
      // is established
      const connectedFrame = encodeSSE("STREAM_CONNECTED" as ExecutionEventType, {
        status: "connected",
        timestamp: Date.now(),
        message: "Global SSE stream established. All run events will be broadcast.",
      });
      controller.enqueue(new TextEncoder().encode(connectedFrame));

      // Keepalive ping every 30s to prevent proxy timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(KEEPALIVE_FRAME));
        } catch {
          clearInterval(keepalive);
        }
      }, KEEPALIVE_MS);

      // Detect client disconnect via AbortSignal
      _request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        if (unsubscribe) unsubscribe();
      });
    },

    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Expose-Headers": "Content-Type",
    },
  });
}

/**
 * Handle OPTIONS preflight requests for CORS.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
