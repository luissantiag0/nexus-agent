import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type SubscriptionTable = "runs" | "run_nodes" | "run_events" | "context_snapshots";

export type SubscriptionEvent =
  | { table: "runs"; eventType: "INSERT" | "UPDATE" | "DELETE"; runId: string; id: string; data: Record<string, unknown> }
  | { table: "run_nodes"; eventType: "INSERT" | "UPDATE"; runId: string; nodeId: string; id: string; data: Record<string, unknown> }
  | { table: "run_events"; eventType: "INSERT"; runId: string; eventId: string; id: string; data: Record<string, unknown> }
  | { table: "context_snapshots"; eventType: "INSERT"; runId: string; version: number; id: string; data: Record<string, unknown> };

export type SubscriptionCallback = (event: SubscriptionEvent) => void;

export interface SupabaseRealtimeOptions {
  tenantId?: string;
  runId?: string;
  onEvent: SubscriptionCallback;
  onError?: (error: Error) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

const TABLE_FILTERS: SubscriptionTable[] = ["runs", "run_nodes", "run_events", "context_snapshots"];

function buildFilter(tenantId?: string, runId?: string): string[] {
  const filters: string[] = [];
  if (runId) filters.push(`run_id=eq.${runId}`);
  if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
  return filters;
}

export class SupabaseRealtimeClient {
  private channels: RealtimeChannel[] = [];
  private options: SupabaseRealtimeOptions;
  private supabase = createClient();

  constructor(options: SupabaseRealtimeOptions) {
    this.options = options;
  }

  subscribe(): void {
    this.disconnect();

    const filters = buildFilter(this.options.tenantId, this.options.runId);

    for (const table of TABLE_FILTERS) {
      const suffix = crypto.randomUUID().slice(0, 8);
      const channelName = `nexus:${table}:${this.options.runId ?? "all"}:${this.options.tenantId ?? "all"}:${suffix}`;
      const channelConfig: Record<string, unknown> = {
        schema: "public",
        table,
        filter: filters.length > 0 ? filters.join(",") : undefined,
      };

      const channel = this.supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          channelConfig,
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            this.handlePayload(table, payload);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") this.options.onStatusChange?.("connected");
          else if (status === "CHANNEL_ERROR") this.options.onStatusChange?.("error");
        });

      this.channels.push(channel);
    }
  }

  disconnect(): void {
    for (const ch of this.channels) {
      this.supabase.removeChannel(ch);
    }
    this.channels = [];
    this.options.onStatusChange?.("disconnected");
  }

  updateRunId(runId: string): void {
    this.options = { ...this.options, runId };
    this.subscribe();
  }

  private handlePayload(
    table: SubscriptionTable,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ): void {
    try {
      const ev = this.normalizePayload(table, payload);
      if (ev) this.options.onEvent(ev);
    } catch (err) {
      this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private normalizePayload(
    table: SubscriptionTable,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ): SubscriptionEvent | null {
    const eventType = payload.eventType;
    const newData = payload.new ?? {};
    const runId = newData.run_id as string;
    const id = newData.id as string ?? crypto.randomUUID();

    switch (table) {
      case "runs":
        return { table, eventType: eventType as "INSERT" | "UPDATE" | "DELETE", runId, id, data: newData };
      case "run_nodes":
        if (eventType === "DELETE") return null;
        return { table, eventType: eventType as "INSERT" | "UPDATE", runId, nodeId: newData.node_id as string, id, data: newData };
      case "run_events":
        if (eventType !== "INSERT") return null;
        return { table, eventType: "INSERT", runId, eventId: id, id, data: newData };
      case "context_snapshots":
        if (eventType !== "INSERT") return null;
        return { table, eventType: "INSERT", runId, version: (newData.version as number) ?? 0, id, data: newData };
      default:
        return null;
    }
  }
}

/**
 * Creates a realtime subscription. Caller must call `disconnect()` in
 * cleanup (e.g. useEffect return). For "use client" components only.
 */
export function useSupabaseRealtime(options: SupabaseRealtimeOptions): { disconnect: () => void } {
  const client = new SupabaseRealtimeClient(options);
  client.subscribe();
  return { disconnect: () => client.disconnect() };
}
