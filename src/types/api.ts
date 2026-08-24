export interface VideoDto {
  id: string;
  title: string;
  durationSeconds: number;
}

export interface SegmentDto {
  sequence: number;
  startMs: number;
  endMs: number;
  sourceText: string;
  translatedText: string;
}

export interface TranscriptionResponseDto {
  video: VideoDto;
  sourceLanguage: string;
  targetLanguage: string;
  segments: SegmentDto[];
}

export interface TranscriptionRequestDto {
  youtubeUrl: string;
  targetLanguage: string;
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
  | "TRANSLATION_QUOTA_EXCEEDED"
  | "INTERNAL_ERROR";

export interface ErrorResponseDto {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
}
