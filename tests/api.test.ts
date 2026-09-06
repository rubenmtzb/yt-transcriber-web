import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createTranscriptionStream, fetchUsage } from "../src/services/api";
import type { ErrorResponseDto } from "../src/types/api";

type Listener = (event: unknown) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  closed = false;
  private readonly listeners: Record<string, Listener[]> = {};

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data?: string) {
    const event = data === undefined ? new Event(type) : { type, data };
    this.listeners[type]?.forEach((listener) => listener(event));
  }
}

function latestSource(): FakeEventSource {
  return FakeEventSource.instances[FakeEventSource.instances.length - 1];
}

describe("createTranscriptionStream", () => {
  beforeEach(() => {
    sessionStorage.clear();
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the stream with the request as query params and no sessionId when none is stored", () => {
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    const url = new URL(latestSource().url);
    expect(url.pathname).toBe("/api/v1/transcriptions/stream");
    expect(url.searchParams.get("youtubeUrl")).toBe("https://youtu.be/x");
    expect(url.searchParams.get("targetLanguage")).toBe("es");
    expect(url.searchParams.has("sessionId")).toBe(false);
  });

  it("includes the stored session id as a query param when one exists", () => {
    sessionStorage.setItem("yt-transcriber-session-id", "existing-session");

    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    const url = new URL(latestSource().url);
    expect(url.searchParams.get("sessionId")).toBe("existing-session");
  });

  it("stores the session id sent by the session event", () => {
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    latestSource().emit("session", "new-session-id");

    expect(sessionStorage.getItem("yt-transcriber-session-id")).toBe("new-session-id");
  });

  it("calls onStage for each stage event", () => {
    const onStage = vi.fn();
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage,
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    latestSource().emit("stage", "RESOLVING_VIDEO");
    latestSource().emit("stage", "TRANSLATING");

    expect(onStage).toHaveBeenNthCalledWith(1, "RESOLVING_VIDEO");
    expect(onStage).toHaveBeenNthCalledWith(2, "TRANSLATING");
  });

  it("calls onResult and closes the connection when the result event arrives", () => {
    const onResult = vi.fn();
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult,
      onError: vi.fn(),
    });

    const source = latestSource();
    const result = { video: { id: "x", title: "T", durationSeconds: 10 }, sourceLanguage: "en", targetLanguage: "es", segments: [] };
    source.emit("result", JSON.stringify(result));

    expect(onResult).toHaveBeenCalledExactlyOnceWith(result);
    expect(source.closed).toBe(true);
  });

  it("calls onError with the parsed error envelope when a real error event carries data", () => {
    const onError = vi.fn();
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError,
    });

    const errorBody: ErrorResponseDto = { code: "RATE_LIMITED", message: "Too many requests", retryable: true, requestId: "req-1" };
    latestSource().emit("error", JSON.stringify(errorBody));

    expect(onError).toHaveBeenCalledExactlyOnceWith(new ApiError(errorBody));
  });

  it("calls onError with a generic retryable error when the connection fails with no data", () => {
    // The browser's own connection-failure event and our server's named "error" event share the
    // same listener -- this is what tells apart a real network/connection failure (no `.data`).
    const onError = vi.fn();
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError,
    });

    latestSource().emit("error");

    expect(onError).toHaveBeenCalledOnce();
    const error: ApiError = onError.mock.calls[0][0];
    expect(error.retryable).toBe(true);
  });

  it.each([
    ["result", "onResult"],
    ["error", "onError"],
  ])("reports a malformed %s payload instead of throwing inside the listener", (eventName) => {
    // An exception thrown in an EventSource listener goes to the console and nowhere else: the
    // callbacks never fire, so the app sits on the progress screen for good with no error and no
    // way out. Whatever arrives has to leave through onError.
    const onError = vi.fn();
    const onResult = vi.fn();
    createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult,
      onError,
    });

    expect(() => latestSource().emit(eventName, "{ not json")).not.toThrow();

    expect(onResult).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    const error: ApiError = onError.mock.calls[0][0];
    expect(error.retryable).toBe(true);
  });

  it("returns a function that closes the underlying connection", () => {
    const close = createTranscriptionStream({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }, {
      onStage: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    close();

    expect(latestSource().closed).toBe(true);
  });
});

describe("fetchUsage", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function respondWith(body: unknown) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => body,
    }) as unknown as typeof fetch;
  }

  it("passes a complete snapshot straight through", async () => {
    respondWith({
      requestsRemaining: 1,
      maxRequestsPerHour: 3,
      requestsResetInSeconds: 900,
      audioMinutesRemaining: 20,
      maxAudioMinutesPerHour: 60,
      audioMinutesResetInSeconds: 900,
      maxVideoDurationSeconds: 1200,
    });

    await expect(fetchUsage()).resolves.toMatchObject({ requestsRemaining: 1, requestsResetInSeconds: 900 });
  });

  it("reports missing fields as absent rather than letting them reach the UI as NaN", async () => {
    // The shape a backend running an older build still answers with.
    respondWith({ requestsRemaining: 3, maxRequestsPerHour: 3, audioMinutesRemaining: 60, maxAudioMinutesPerHour: 60 });

    const usage = await fetchUsage();

    expect(usage).toMatchObject({
      requestsRemaining: 3,
      requestsResetInSeconds: null,
      audioMinutesResetInSeconds: null,
      maxVideoDurationSeconds: 0,
    });
  });

  it("gives up rather than guessing when the body is not a usage snapshot at all", async () => {
    respondWith({ unexpected: true });

    await expect(fetchUsage()).resolves.toBeNull();
  });

  it("returns null when the backend is unreachable, so the form still works", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;

    await expect(fetchUsage()).resolves.toBeNull();
  });
});
