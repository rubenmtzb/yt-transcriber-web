import type { ErrorResponseDto, TranscriptionRequestDto, TranscriptionResponseDto } from "../types/api";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const SESSION_HEADER = "X-Session-Id";
const SESSION_STORAGE_KEY = "yt-transcriber-session-id";

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

// The backend hands out an anonymous session id used for its own rate limiting. It's carried as
// a plain header, not a cookie: the frontend (:4321) and backend (:8080) are different ports on
// localhost, which browsers treat as different *sites* for cookie purposes, so neither
// SameSite=Lax nor SameSite=None survive that hop in local dev. sessionStorage (not an in-memory
// variable) so a page reload doesn't hand the user a fresh budget for free.
function getStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // sessionStorage can be unavailable (private browsing, disabled storage); the app still
    // works, it just gets a fresh session id from the backend on every request.
  }
}

export async function createTranscription(
  request: TranscriptionRequestDto,
): Promise<TranscriptionResponseDto> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const storedSessionId = getStoredSessionId();
  if (storedSessionId) {
    headers[SESSION_HEADER] = storedSessionId;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  const sessionId = response.headers.get(SESSION_HEADER);
  if (sessionId) {
    storeSessionId(sessionId);
  }

  if (!response.ok) {
    const body: ErrorResponseDto = await response.json();
    throw new ApiError(body);
  }

  return response.json();
}
