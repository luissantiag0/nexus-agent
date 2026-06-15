// ============================================================================
// GET /api/runs/:runId/stream — SSE stream for a single execution run
// ============================================================================
// Server-Sent Events endpoint that streams execution events for a specific
// run in real time. Subscribes to the global ExecutionEventStream and
// filters events by the requested runId server-side.
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
// Route params:
//   runId  — the execution run identifier to subscribe to
//
// Response: text/event-stream (SSE)
// 400      — if runId is empty
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { executionEventStream } from "@/lib/execution-events/stream";
import { executionStore } from "@/lib/execution-events/store";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  if (!runId || runId.trim().length === 0) {
    return NextResponse.json(
      { error: "runId is required" },
      { status: 400 },
    );
  }

  // If the run doesn't exist yet, that's OK — it may be created soon.
  // We still set up the stream; events will flow once the run starts.
  // Optionally check and return 404 only if the run has already terminated
  // and has no future events.
  const existingRun = executionStore.getRun(runId);
  if (existingRun && isTerminalStatus(existingRun.status)) {
    return NextResponse.json(
      {
        error: "Run has already terminated",
        code: "RUN_TERMINATED",
        detail: `Run "${runId}" completed at ${new Date(existingRun.completedAt! ?? existingRun.startedAt).toISOString()}. No further events will be emitted.`,
      },
      { status: 410 },
    );
  }

  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to events for this specific run
      unsubscribe = executionEventStream.subscribe(runId, (event) => {
        try {
          const frame = encodeSSE(event.type, event as unknown as Record<string, unknown>);
          controller.enqueue(new TextEncoder().encode(frame));
        } catch (err) {
          // If the controller is already closed, ignore
          if (err instanceof TypeError) {
            // Stream already closed — unsubscribe will clean up
          }
        }
      });

      // Send an initial "connected" event so the client knows the stream
      // is established
      const connectedFrame = encodeSSE(ExecutionEventType.RUN_INITIALIZED, {
        runId,
        status: "connected",
        timestamp: Date.now(),
        message: `SSE stream established for run "${runId}"`,
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

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}
