// ============================================================================
// Nexus Agent Platform — Supabase Client Factory
// ============================================================================
// Singleton-managed Supabase client. Provides a single shared client for
// the application lifecycle. Future versions may support per-tenant schema
// isolation by returning role-based clients for different tenant IDs.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbConfig } from "./db-config";
import { loadDbConfig } from "./db-config";

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let clientInstance: SupabaseClient | null = null;
let currentConfig: DbConfig | null = null;

// ---------------------------------------------------------------------------
// SupabaseClientFactory
// ---------------------------------------------------------------------------

export class SupabaseClientFactory {
  /**
   * Get or create the singleton Supabase client.
   * Uses environment variables for configuration by default.
   */
  static getClient(config?: DbConfig): SupabaseClient {
    if (clientInstance && !config) {
      return clientInstance;
    }

    const resolved = config ?? loadDbConfig();

    // Recreate if config changed
    if (clientInstance && currentConfig && config && !isConfigEqual(currentConfig, resolved)) {
      clientInstance = null;
    }

    if (!clientInstance) {
      clientInstance = createClient(resolved.supabaseUrl, resolved.supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: resolved.schema ?? "public",
        },
        global: {
          fetch: (url: RequestInfo | URL, init?: RequestInit) => {
            return fetch(url, {
              ...init,
              signal: AbortSignal.timeout(resolved.timeoutMs ?? 10000),
            });
          },
        },
      });
      currentConfig = resolved;
    }

    return clientInstance;
  }

  /**
   * Create a fresh client with a specific configuration, bypassing the
   * singleton cache. Useful for admin operations or testing.
   */
  static createFreshClient(config: DbConfig): SupabaseClient {
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: config.schema ?? "public",
      },
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          return fetch(url, {
            ...init,
            signal: AbortSignal.timeout(config.timeoutMs ?? 10000),
          });
        },
      },
    });
  }

  /**
   * Reset the singleton (useful for testing).
   */
  static reset(): void {
    clientInstance = null;
    currentConfig = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isConfigEqual(a: DbConfig, b: DbConfig): boolean {
  return a.supabaseUrl === b.supabaseUrl && a.supabaseAnonKey === b.supabaseAnonKey;
}

// ---------------------------------------------------------------------------
// Convenience export
// ---------------------------------------------------------------------------

/** The application-wide Supabase client instance. */
export const supabase = SupabaseClientFactory.getClient;
