// ============================================================================
// Nexus Agent Platform — Database Configuration
// ============================================================================

/**
 * Supabase connection configuration.
 * Reads from environment variables with sensible defaults for development.
 */
export interface DbConfig {
  /** Supabase project URL (e.g. https://xyz.supabase.co) */
  supabaseUrl: string;
  /** Supabase anon/public key */
  supabaseAnonKey: string;
  /** Optional service role key for admin operations */
  supabaseServiceRoleKey?: string;
  /** Database schema (default: "public") */
  schema?: string;
  /** Connection timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}

/**
 * Load DbConfig from environment variables.
 * Throws if required variables are missing.
 */
export function loadDbConfig(): DbConfig {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in environment.",
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase anon key. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    schema: process.env.SUPABASE_SCHEMA ?? "public",
    timeoutMs: parseInt(process.env.SUPABASE_TIMEOUT_MS ?? "10000", 10),
  };
}
