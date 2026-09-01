import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearHistory, findInHistory, getHistory, rememberPosition, saveToHistory } from "../src/lib/history";
import type { TranscriptionResponseDto } from "../src/types/api";

function result(id: string, targetLanguage = "es", durationSeconds = 600): TranscriptionResponseDto {
  return {
    video: { id, title: `Vídeo ${id}`, durationSeconds },
    sourceLanguage: "en",
    targetLanguage,
    segments: [],
  };
}

beforeEach(() => clearHistory());

describe("history", () => {
  it("keeps the newest first and drops a repeat of the same video", () => {
    saveToHistory(result("a"));
    saveToHistory(result("b"));
    saveToHistory(result("a"));

    expect(getHistory().map((entry) => entry.result.video.id)).toEqual(["a", "b"]);
  });

  it("keeps only the five most recent", () => {
    for (const id of ["a", "b", "c", "d", "e", "f"]) {
      saveToHistory(result(id));
    }

    expect(getHistory()).toHaveLength(5);
    expect(getHistory().some((entry) => entry.result.video.id === "a")).toBe(false);
  });

  it("matches a cached result only when the target language matches too", () => {
    saveToHistory(result("a", "es"));

    expect(findInHistory("a", "es")).not.toBeNull();
    expect(findInHistory("a", "en")).toBeNull();
  });

  it("survives a corrupted store rather than taking the page down with it", () => {
    localStorage.setItem("yt-transcriber-history", "{not json");

    expect(getHistory()).toEqual([]);
  });
});

describe("rememberPosition", () => {
  it("records where playback got to", () => {
    saveToHistory(result("a"));

    rememberPosition("a", 90_000, 600);

    expect(getHistory()[0].positionMs).toBe(90_000);
  });

  it("ignores the opening seconds, which are not worth resuming into", () => {
    saveToHistory(result("a"));

    rememberPosition("a", 5_000, 600);

    expect(getHistory()[0].positionMs).toBeUndefined();
  });

  it("clears the mark near the end, so a finished video starts over", () => {
    saveToHistory(result("a"));
    rememberPosition("a", 90_000, 600);

    rememberPosition("a", 599_000, 600);

    expect(getHistory()[0].positionMs).toBeUndefined();
  });

  it("does nothing for a video that is not in the history", () => {
    saveToHistory(result("a"));

    rememberPosition("unknown", 90_000, 600);

    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0].positionMs).toBeUndefined();
  });
});

describe("saveToHistory under storage pressure", () => {
  it("retries without the per-word timings rather than recording nothing", () => {
    const heavy: TranscriptionResponseDto = {
      ...result("a"),
      segments: [
        {
          sequence: 0,
          startMs: 0,
          endMs: 1000,
          sourceText: "hola",
          translatedText: "hello",
          words: [{ text: "hola", startMs: 0, endMs: 1000 }],
        },
      ],
    };
    const setItem = vi.spyOn(localStorage, "setItem");
    // The first write is over quota; the lighter retry fits.
    setItem.mockImplementationOnce(() => {
      throw new DOMException("QuotaExceededError");
    });

    saveToHistory(heavy);

    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0].result.segments[0].words).toBeUndefined();
    expect(getHistory()[0].result.segments[0].sourceText).toBe("hola");
    setItem.mockRestore();
  });

  it("gives up quietly when storage is unavailable altogether", () => {
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    expect(() => saveToHistory(result("a"))).not.toThrow();
    setItem.mockRestore();
  });
});
