// ============================================================================
// Nexus Agent Platform — Runtime Configuration
// ============================================================================
// Centralized configuration with environment variable overrides.
// All config modules merge defaults with env overrides and file-based config.
// ============================================================================

import type { RuntimeConfig } from "@/engine/types/config-types";

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: RuntimeConfig = {
  env: "development",
  logLevel: "debug",
  engine: {
    defaultAgentTimeoutMs: 30_000,
    defaultMaxRetries: 3,
    defaultRetryDelayMs: 1_000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60_000,
    rateLimitDefaultMax: 100,
    rateLimitDefaultWindowMs: 60_000,
    workerPoolSize: 4,
    persistWorkflows: false,
    logExecutions: true,
  },
  database: {
    provider: "supabase",
    maxConnections: 20,
    connectionTimeoutMs: 5_000,
    autoMigrate: process.env.NODE_ENV === "development",
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      poolSize: 10,
      realtimeEnabled: false,
    },
  },
  api: {
    rest: {
      enabled: true,
      port: Number(process.env.NEXUS_API_PORT) || 3001,
      host: "0.0.0.0",
      corsOrigins: ["http://localhost:3000"],
      bodyLimit: "10mb",
      rateLimit: {
        enabled: true,
        maxPerMinute: 1000,
      },
    },
    grpc: {
      enabled: false,
      port: 50051,
      host: "0.0.0.0",
      maxMessageSize: 4 * 1024 * 1024, // 4MB
    },
    auth: {
      enabled: true,
      provider: "supabase",
      jwtExpiresIn: "1h",
    },
  },
  n8n: {
    enabled: false,
    baseUrl: process.env.N8N_BASE_URL ?? "http://localhost:5678",
    apiKey: process.env.N8N_API_KEY ?? "",
    webhookBasePath: "/api/n8n/webhooks",
    maxPayloadBytes: 5 * 1024 * 1024, // 5MB
    retry: {
      maxAttempts: 3,
      backoffMs: 2_000,
    },
  },
  voice: {
    enabled: false, // MASTER SWITCH — disabled by default
    stt: {
      enabled: false,
      provider: "whisper",
      model: "whisper-1",
      language: "en",
      sampleRate: 16000,
    },
    tts: {
      enabled: false,
      provider: "elevenlabs",
      model: "eleven_monolingual_v1",
      voice: "default",
      speed: 1.0,
    },
    livekit: {
      enabled: false,
      url: process.env.LIVEKIT_URL ?? "",
      apiKey: process.env.LIVEKIT_API_KEY ?? "",
      apiSecret: process.env.LIVEKIT_API_SECRET ?? "",
      defaultRoomTimeout: 300,
    },
  },
  observability: {
    tracing: false,
    metrics: false,
    logging: {
      level: "info",
      format: "json",
    },
  },
  cache: {
    provider: "memory",
    memory: {
      maxSize: 1000,
      ttlSeconds: 300,
    },
  },
  queue: {
    provider: "in-memory",
    concurrency: 4,
    defaultJobOptions: {
      attempts: 3,
      backoffMs: 1_000,
      timeoutMs: 30_000,
      removeOnComplete: true,
    },
  },
};

// ============================================================================
// Config Loader
// ============================================================================

class RuntimeConfigLoader {
  private config: RuntimeConfig;

  constructor() {
    this.config = this.mergeEnvOverrides(DEFAULT_CONFIG);
  }

  /**
   * Get the current runtime configuration.
   */
  get(): Readonly<RuntimeConfig> {
    return this.config;
  }

  /**
   * Update a specific config path using dot notation.
   * e.g., set("engine.workerPoolSize", 8)
   */
  set(path: string, value: unknown): void {
    const keys = path.split(".");
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        throw new Error(`Config path '${path}' not found`);
      }
      current = current[keys[i]] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Merge environment variable overrides into the config.
   */
  private mergeEnvOverrides(config: RuntimeConfig): RuntimeConfig {
    const env = process.env.NODE_ENV as RuntimeConfig["env"] ?? "development";
    return {
      ...config,
      env,
      logLevel: (process.env.NEXUS_LOG_LEVEL as RuntimeConfig["logLevel"]) ?? config.logLevel,
    };
  }

  /**
   * Reload configuration from environment variables.
   */
  reload(): void {
    this.config = this.mergeEnvOverrides(DEFAULT_CONFIG);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const runtimeConfig = new RuntimeConfigLoader();
export default runtimeConfig;
