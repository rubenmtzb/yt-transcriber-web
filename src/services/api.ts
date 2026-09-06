import type {
  ErrorCode,
  ErrorResponseDto,
  ProcessingStage,
  TranscriptionRequestDto,
  TranscriptionResponseDto,
  UsageSnapshotDto,
} from "../types/api";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const SESSION_QUERY_PARAM = "sessionId";
const SESSION_STORAGE_KEY = "yt-transcriber-session-id";

export class ApiError extends Error {
  readonly code: ErrorCode;
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
// a query param, not a cookie: the frontend (:4321) and backend (:8080) are different ports on
// localhost, which browsers treat as different *sites* for cookie purposes, so neither
// SameSite=Lax nor SameSite=None survive that hop in local dev -- and EventSource (used below)
// can't set custom request headers at all, ruling out the header this app used before streaming.
// sessionStorage (not an in-memory variable) so a page reload doesn't hand the user a fresh
// budget for free.
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

/**
 * The caller's remaining hourly budget. Returns null instead of throwing when the backend is down
 * or unreachable: this only drives an advisory line under the form, and failing to fetch it must
 * not stop someone from trying a transcription.
 */
export async function fetchUsage(): Promise<UsageSnapshotDto | null> {
  const params = new URLSearchParams();
  const storedSessionId = getStoredSessionId();
  if (storedSessionId) {
    params.set(SESSION_QUERY_PARAM, storedSessionId);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions/usage?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    const issuedSessionId = response.headers.get("X-Session-Id");
    if (issuedSessionId) {
      storeSessionId(issuedSessionId);
    }
    return normalizeUsage(await response.json());
  } catch {
    return null;
  }
}

/**
 * Coerces the response into a complete snapshot before it reaches the UI.
 *
 * A backend running an older build answers this endpoint without the newer fields, and an absent
 * number would otherwise flow into the panel's arithmetic and render as "en NaN min" rather than
 * as missing. Anything unusable is reported as absent, which the panel already knows how to show.
 */
function normalizeUsage(body: Partial<UsageSnapshotDto> | null): UsageSnapshotDto | null {
  if (!body || typeof body.requestsRemaining !== "number") {
    return null;
  }
  const seconds = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  const count = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return {
    requestsRemaining: body.requestsRemaining,
    maxRequestsPerHour: count(body.maxRequestsPerHour, body.requestsRemaining),
    requestsResetInSeconds: seconds(body.requestsResetInSeconds),
    audioMinutesRemaining: count(body.audioMinutesRemaining, 0),
    maxAudioMinutesPerHour: count(body.maxAudioMinutesPerHour, count(body.audioMinutesRemaining, 0)),
    audioMinutesResetInSeconds: seconds(body.audioMinutesResetInSeconds),
    maxVideoDurationSeconds: count(body.maxVideoDurationSeconds, 0),
  };
}

/** The envelope for a failure the backend never got to describe itself. */
function connectionLost(message: string): ApiError {
  return new ApiError({ code: "PROVIDER_UNAVAILABLE", message, retryable: true, requestId: "" });
}

interface StreamCallbacks {
  onStage: (stage: ProcessingStage) => void;
  onResult: (result: TranscriptionResponseDto) => void;
  onError: (error: ApiError) => void;
}

/**
 * Opens the real-time transcription stream. GET only (EventSource can't issue a POST), so the
 * request becomes query params. Returns a function that closes the connection early.
 */
export function createTranscriptionStream(request: TranscriptionRequestDto, callbacks: StreamCallbacks): () => void {
  const params = new URLSearchParams({
    youtubeUrl: request.youtubeUrl,
    targetLanguage: request.targetLanguage,
  });
  const storedSessionId = getStoredSessionId();
  if (storedSessionId) {
    params.set(SESSION_QUERY_PARAM, storedSessionId);
  }

  const source = new EventSource(`${API_BASE_URL}/api/v1/transcriptions/stream?${params.toString()}`);

  source.addEventListener("session", (event) => {
    storeSessionId((event as MessageEvent<string>).data);
  });

  source.addEventListener("stage", (event) => {
    callbacks.onStage((event as MessageEvent<string>).data as ProcessingStage);
  });

  source.addEventListener("result", (event) => {
    source.close();
    // An exception thrown inside an EventSource listener has nowhere to go: the browser reports it
    // to the console and the app keeps waiting on a stream that is already closed, leaving the
    // reader on the progress screen with no error and no way forward. Whatever arrives here that
    // isn't the result has to come back as one.
    let result: TranscriptionResponseDto;
    try {
      result = JSON.parse((event as MessageEvent<string>).data);
    } catch {
      callbacks.onError(connectionLost("Received a malformed response from the server."));
      return;
    }
    callbacks.onResult(result);
  });

  // "error" is overloaded by the EventSource spec: our server sends a real named "error" event
  // carrying an ErrorResponse as JSON data, but the browser *also* dispatches its own connection
  // failure as an event of the same type on this same listener -- a plain Event with no `data`
  // at all. The presence of `.data` is what tells the two apart.
  source.addEventListener("error", (event) => {
    source.close();
    const data = (event as MessageEvent<string>).data;
    if (typeof data !== "string") {
      callbacks.onError(connectionLost("Lost connection to the server."));
      return;
    }
    try {
      callbacks.onError(new ApiError(JSON.parse(data)));
    } catch {
      callbacks.onError(connectionLost("Lost connection to the server."));
    }
  });

  return () => source.close();
}
