// ============================================================================
// Nexus Agent Platform — Configuration Types
// ============================================================================

// ============================================================================
// Runtime Configuration
// ============================================================================

export interface RuntimeConfig {
  /** Environment name. */
  env: "development" | "staging" | "production";
  /** Log level. */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Enable/disable core engine features. */
  engine: EngineConfig;
  /** Database configuration. */
  database: DatabaseConfig;
  /** API layer configuration. */
  api: ApiConfig;
  /** n8n integration configuration. */
  n8n: N8nConfig;
  /** Voice layer configuration (disabled by default). */
  voice: VoiceLayerConfig;
  /** Tracing and observability. */
  observability: ObservabilityConfig;
  /** Cache configuration. */
  cache: CacheConfig;
  /** Queue configuration. */
  queue: QueueConfig;
}

// ============================================================================
// Engine Config
// ============================================================================

export interface EngineConfig {
  /** Default timeout for agent execution (ms). */
  defaultAgentTimeoutMs: number;
  /** Default max retries per agent. */
  defaultMaxRetries: number;
  /** Default retry backoff (ms). */
  defaultRetryDelayMs: number;
  /** Circuit breaker: failure threshold. */
  circuitBreakerThreshold: number;
  /** Circuit breaker: reset timeout (ms). */
  circuitBreakerResetMs: number;
  /** Rate limiter: default max per window. */
  rateLimitDefaultMax: number;
  /** Rate limiter: default window (ms). */
  rateLimitDefaultWindowMs: number;
  /** Worker pool size for parallel execution. */
  workerPoolSize: number;
  /** Enable workflow persistence. */
  persistWorkflows: boolean;
  /** Enable execution logging. */
  logExecutions: boolean;
}

// ============================================================================
// Database Config
// ============================================================================

export interface DatabaseConfig {
  /** Database provider. */
  provider: "supabase" | "postgres" | "sqlite";
  /** Connection URL (for direct connection). */
  url?: string;
  /** Supabase-specific config. */
  supabase?: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    /** Connection pool size. */
    poolSize: number;
    /** Enable real-time subscriptions. */
    realtimeEnabled: boolean;
  };
  /** Maximum connection pool size. */
  maxConnections: number;
  /** Connection timeout (ms). */
  connectionTimeoutMs: number;
  /** Enable automatic migrations. */
  autoMigrate: boolean;
}

// ============================================================================
// API Config
// ============================================================================

export interface ApiConfig {
  /** REST API configuration. */
  rest: {
    enabled: boolean;
    port: number;
    host: string;
    corsOrigins: string[];
    bodyLimit: string;
    rateLimit: {
      enabled: boolean;
      maxPerMinute: number;
    };
  };
  /** gRPC API configuration. */
  grpc: {
    enabled: boolean;
    port: number;
    host: string;
    maxMessageSize: number;
  };
  /** Authentication configuration. */
  auth: {
    enabled: boolean;
    provider: "jwt" | "supabase" | "none";
    jwtSecret?: string;
    jwtExpiresIn: string;
  };
}

// ============================================================================
// n8n Config
// ============================================================================

export interface N8nConfig {
  /** Enable n8n integration. */
  enabled: boolean;
  /** n8n instance base URL. */
  baseUrl: string;
  /** n8n API key for authentication. */
  apiKey: string;
  /** Webhook base path. */
  webhookBasePath: string;
  /** Maximum payload size from n8n (bytes). */
  maxPayloadBytes: number;
  /** Retry configuration for n8n calls. */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}

// ============================================================================
// Voice Layer Config
// ============================================================================

export interface VoiceLayerConfig {
  /** Master switch — all voice modules disabled by default. */
  enabled: boolean;
  /** STT configuration. */
  stt: {
    enabled: boolean;
    provider: "whisper" | "deepgram" | "azure" | "custom";
    model: string;
    language: string;
    sampleRate: number;
  };
  /** TTS configuration. */
  tts: {
    enabled: boolean;
    provider: "elevenlabs" | "azure" | "openai" | "custom";
    model: string;
    voice: string;
    speed: number;
  };
  /** LiveKit configuration. */
  livekit: {
    enabled: boolean;
    url: string;
    apiKey: string;
    apiSecret: string;
    defaultRoomTimeout: number;
  };
}

// ============================================================================
// Observability Config
// ============================================================================

export interface ObservabilityConfig {
  /** Enable OpenTelemetry tracing. */
  tracing: boolean;
  /** Tracing endpoint (e.g., Jaeger, Tempo). */
  tracingEndpoint?: string;
  /** Enable metrics collection. */
  metrics: boolean;
  /** Metrics endpoint (e.g., Prometheus). */
  metricsEndpoint?: string;
  /** Logging configuration. */
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
    outputPath?: string;
  };
}

// ============================================================================
// Cache Config
// ============================================================================

export interface CacheConfig {
  /** Cache provider. */
  provider: "redis" | "memory" | "none";
  /** Redis-specific config. */
  redis?: {
    url: string;
    keyPrefix: string;
    ttlSeconds: number;
  };
  /** In-memory cache config. */
  memory?: {
    maxSize: number;
    ttlSeconds: number;
  };
}

// ============================================================================
// Queue Config
// ============================================================================

export interface QueueConfig {
  /** Queue provider. */
  provider: "bull" | "rabbitmq" | "in-memory" | "none";
  /** Bull/RabbitMQ connection config. */
  connection?: {
    host: string;
    port: number;
    password?: string;
    vhost?: string;
  };
  /** Default job options. */
  defaultJobOptions: {
    attempts: number;
    backoffMs: number;
    timeoutMs: number;
    removeOnComplete: boolean;
  };
  /** Concurrency per queue. */
  concurrency: number;
}
