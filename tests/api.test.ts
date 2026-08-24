import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createTranscription } from "../src/services/api";

function jsonResponse(body: unknown, init: { ok?: boolean; sessionId?: string } = {}) {
  const headers = new Headers();
  if (init.sessionId) {
    headers.set("X-Session-Id", init.sessionId);
  }
  return {
    ok: init.ok ?? true,
    headers,
    json: async () => body,
  } as Response;
}

describe("createTranscription", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not send a session header when none is stored yet", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ video: {}, targetLanguage: "es", segments: [] }, { sessionId: "abc-123" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createTranscription({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-Session-Id"]).toBeUndefined();
  });

  it("stores the session id returned by the backend and reuses it on the next call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ video: {}, targetLanguage: "es", segments: [] }, { sessionId: "abc-123" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createTranscription({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" });
    await createTranscription({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" });

    const [, secondCallOptions] = fetchMock.mock.calls[1];
    expect(secondCallOptions.headers["X-Session-Id"]).toBe("abc-123");
  });

  it("throws an ApiError carrying the error envelope fields on a non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { code: "RATE_LIMITED", message: "Too many requests", retryable: true, requestId: "req-1" },
        { ok: false },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createTranscription({ youtubeUrl: "https://youtu.be/x", targetLanguage: "es" }),
    ).rejects.toMatchObject(
      new ApiError({ code: "RATE_LIMITED", message: "Too many requests", retryable: true, requestId: "req-1" }),
    );
  });
});
