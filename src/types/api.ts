export interface VideoDto {
  id: string;
  title: string;
  durationSeconds: number;
}

export interface TimedWordDto {
  text: string;
  startMs: number;
  endMs: number;
}

export interface SegmentDto {
  sequence: number;
  startMs: number;
  endMs: number;
  sourceText: string;
  translatedText: string;
  /**
   * Real per-word timings for the source text, when the provider supplied them. Absent for
   * uploader-written captions, which are timed per line, and for results saved before this
   * existed. Never present for the translation: it reorders what was said.
   */
  words?: TimedWordDto[];
}

export type TranscriptSource = "MANUAL_CAPTIONS" | "AUTOMATIC_CAPTIONS" | "SPEECH_TO_TEXT";

export interface TranscriptionResponseDto {
  video: VideoDto;
  sourceLanguage: string;
  targetLanguage: string;
  /** Optional: results saved to local history before this field existed don't carry it. */
  source?: TranscriptSource;
  segments: SegmentDto[];
}

export interface TranscriptionRequestDto {
  youtubeUrl: string;
  targetLanguage: string;
}

export interface UsageSnapshotDto {
  requestsRemaining: number;
  maxRequestsPerHour: number;
  /** Seconds until the oldest recorded request frees its slot. Null when none is recorded. */
  requestsResetInSeconds: number | null;
  audioMinutesRemaining: number;
  maxAudioMinutesPerHour: number;
  audioMinutesResetInSeconds: number | null;
  maxVideoDurationSeconds: number;
}

export type ProcessingStage =
  | "VALIDATING_URL"
  | "RESOLVING_VIDEO"
  | "TRANSCRIBING"
  | "TRANSLATING"
  | "PREPARING_RESULT";

export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_SOURCE"
  | "VIDEO_TOO_LONG"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROCESSING_TIMEOUT"
  | "TRANSLATION_QUOTA_EXCEEDED"
  | "INTERNAL_ERROR";

export interface ErrorResponseDto {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
}
