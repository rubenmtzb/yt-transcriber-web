import type { ErrorResponseDto, TranscriptionRequestDto, TranscriptionResponseDto } from "../types/api";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  readonly code: ErrorResponseDto["code"];
  readonly retryable: boolean;
  readonly requestId: string;

  constructor(body: ErrorResponseDto) {
    super(body.message);
    this.code = body.code;
    this.retryable = body.retryable;
    this.requestId = body.requestId;
  }
}

export async function createTranscription(
  request: TranscriptionRequestDto,
): Promise<TranscriptionResponseDto> {
  const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body: ErrorResponseDto = await response.json();
    throw new ApiError(body);
  }

  return response.json();
}
