// ============================================================================
// Nexus Agent Platform — Voice Layer Types (STT / TTS / LiveKit)
// ============================================================================
// All voice layer modules are decoupled and disabled by default at config level.
// These interfaces define the contract for when voice is enabled.
// ============================================================================

// ============================================================================
// Shared Voice Types
// ============================================================================

export type VoiceStatus = "disabled" | "ready" | "streaming" | "error";

export interface VoiceConfig {
  enabled: boolean;
  provider: string;
  model: string;
  language: string;
  sampleRate: number;
}

// ============================================================================
// Speech-to-Text (STT)
// ============================================================================

/**
 * STT module interface. All implementations must conform to this contract.
 * Currently only stubs exist (WhisperStub, etc.).
 */
export interface STTModule {
  readonly name: string;
  readonly status: VoiceStatus;

  /** Transcribe an audio buffer to text. */
  transcribe(audio: AudioInput): Promise<TranscriptionResult>;

  /** Start a real-time transcription stream. */
  streamTranscribe(): Promise<TranscriptionStream>;

  /** Get module configuration. */
  getConfig(): VoiceConfig;

  /** Check if module is healthy. */
  health(): Promise<{ ok: boolean; latencyMs: number }>;
}

export interface AudioInput {
  /** Raw audio data (PCM 16-bit). */
  buffer: ArrayBuffer;
  /** Sample rate in Hz. */
  sampleRate: number;
  /** Number of channels. */
  channels: number;
  /** Audio format. */
  format: "pcm16" | "pcm24" | "mp3" | "ogg" | "wav" | "webm";
  /** Duration in seconds. */
  durationSec: number;
}

export interface TranscriptionResult {
  /** Transcribed text. */
  text: string;
  /** Confidence score (0-1). */
  confidence: number;
  /** Language detected. */
  language: string;
  /** Word-level timestamps (if available). */
  words?: Array<{
    word: string;
    startSec: number;
    endSec: number;
    confidence: number;
  }>;
  /** Processing duration. */
  processingMs: number;
}

export interface TranscriptionStream {
  /** Unique stream ID. */
  streamId: string;
  /** Register a callback for interim results. */
  onInterim(callback: (chunk: TranscriptionResult) => void): void;
  /** Register a callback for final results. */
  onFinal(callback: (result: TranscriptionResult) => void): void;
  /** Register an error handler. */
  onError(callback: (error: Error) => void): void;
  /** Push audio chunk to the stream. */
  pushAudio(chunk: AudioInput): Promise<void>;
  /** End the stream and get final result. */
  close(): Promise<TranscriptionResult>;
}

// ============================================================================
// Text-to-Speech (TTS)
// ============================================================================

/**
 * TTS module interface. All implementations must conform to this contract.
 * Currently only stubs exist (ElevenLabsStub, etc.).
 */
export interface TTSModule {
  readonly name: string;
  readonly status: VoiceStatus;

  /** Synthesize text to audio. */
  synthesize(text: string, options?: TTSOptions): Promise<AudioOutput>;

  /** Start a streaming synthesis session. */
  streamSynthesize(): Promise<TTSStream>;

  /** Get available voices. */
  getVoices(): Promise<Voice[]>;

  /** Get module configuration. */
  getConfig(): VoiceConfig;

  /** Check if module is healthy. */
  health(): Promise<{ ok: boolean; latencyMs: number }>;
}

export interface TTSOptions {
  /** Voice ID or name. */
  voice?: string;
  /** Speech speed (0.5 - 2.0). */
  speed?: number;
  /** Pitch adjustment. */
  pitch?: number;
  /** Emotion/style preset. */
  style?: string;
  /** Output format. */
  format?: "mp3" | "ogg" | "wav" | "pcm16";
}

export interface AudioOutput {
  /** Generated audio data. */
  buffer: ArrayBuffer;
  /** Sample rate. */
  sampleRate: number;
  /** Audio format. */
  format: AudioInput["format"];
  /** Duration in seconds. */
  durationSec: number;
  /** Synthesis processing time. */
  processingMs: number;
}

export interface Voice {
  id: string;
  name: string;
  gender?: "male" | "female" | "neutral";
  language: string;
  accent?: string;
  previewUrl?: string;
  styleCount?: number;
}

export interface TTSStream {
  streamId: string;
  /** Push text chunk to the stream. */
  pushText(chunk: string): Promise<void>;
  /** Register a callback for audio chunks. */
  onAudio(callback: (chunk: AudioOutput) => void): void;
  /** Register stream end callback. */
  onEnd(callback: () => void): void;
  /** Register an error handler. */
  onError(callback: (error: Error) => void): void;
  /** End the stream. */
  close(): Promise<void>;
}

// ============================================================================
// LiveKit Client Stub
// ============================================================================

/**
 * LiveKit room participant types.
 */
export type ParticipantType = "agent" | "human" | "sip";

export interface LiveKitParticipant {
  identity: string;
  name: string;
  type: ParticipantType;
  joinedAt: string;
  metadata?: Record<string, unknown>;
  tracks: LiveKitTrack[];
}

export interface LiveKitTrack {
  sid: string;
  type: "audio" | "video" | "data";
  source: "microphone" | "camera" | "screen" | "custom";
  muted: boolean;
}

/**
 * LiveKit room configuration.
 */
export interface LiveKitRoomConfig {
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  metadata?: Record<string, unknown>;
}

/**
 * LiveKit client interface.
 * Stubbed by default — only activated when voice.enabled = true in config.
 */
export interface LiveKitClient {
  readonly isConnected: boolean;

  /** Connect to the LiveKit server. */
  connect(url: string, token: string): Promise<void>;

  /** Disconnect from LiveKit. */
  disconnect(): Promise<void>;

  /** Create a new room. */
  createRoom(config: LiveKitRoomConfig): Promise<string>; // returns room SID

  /** Join an existing room as an agent participant. */
  joinRoom(roomName: string, identity: string): Promise<void>;

  /** Leave a room. */
  leaveRoom(roomName: string): Promise<void>;

  /** List participants in a room. */
  listParticipants(roomName: string): Promise<LiveKitParticipant[]>;

  /** Publish an audio track to the room. */
  publishAudio(roomName: string, audio: AudioOutput): Promise<string>;

  /** Subscribe to a participant's audio track. */
  subscribeAudio(roomName: string, participantIdentity: string): Promise<TranscriptionStream>;

  /** Get current rooms. */
  listRooms(): Promise<LiveKitRoomConfig[]>;

  /** Health check. */
  health(): Promise<{ ok: boolean; latencyMs: number }>;
}

// ============================================================================
// Voice Session — Combines STT + TTS + LiveKit into a single session
// ============================================================================

export interface VoiceSessionConfig {
  stt: VoiceConfig;
  tts: VoiceConfig;
  livekit: VoiceConfig & {
    roomName?: string;
    identity?: string;
  };
}

export interface VoiceSession {
  sessionId: string;
  status: VoiceStatus;
  stt: STTModule;
  tts: TTSModule;
  livekit: LiveKitClient | null;

  /** Start the voice session. */
  start(): Promise<void>;

  /** End the voice session and clean up resources. */
  stop(): Promise<void>;

  /** Process incoming audio (STT → agent → TTS pipeline). */
  processAudio(audio: AudioInput): Promise<AudioOutput | null>;

  /** Get session metrics. */
  getMetrics(): VoiceSessionMetrics;
}

export interface VoiceSessionMetrics {
  totalAudioProcessedSec: number;
  totalTextTranscribed: number;
  totalAudioSynthesizedSec: number;
  avgSttLatencyMs: number;
  avgTtsLatencyMs: number;
  totalSessions: number;
  activeSessions: number;
  errorCount: number;
}
