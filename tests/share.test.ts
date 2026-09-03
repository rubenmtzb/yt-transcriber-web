import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeResultFromHash, encodeResult } from "../src/lib/share";
import type { TranscriptionResponseDto } from "../src/types/api";

const RESULT: TranscriptionResponseDto = {
  video: { id: "dQw4w9WgXcQ", title: "Un vídeo con acentos: ñ", durationSeconds: 213 },
  sourceLanguage: "es",
  targetLanguage: "en",
  source: "MANUAL_CAPTIONS",
  segments: [
    { sequence: 0, startMs: 0, endMs: 4200, sourceText: "Hola a todos", translatedText: "Hello everybody" },
    { sequence: 1, startMs: 4200, endMs: 9000, sourceText: "¿Cómo estás?", translatedText: "How are you?" },
  ],
};

describe("share links", () => {
  it("round-trips a result through the URL fragment, accents and all", async () => {
    const encoded = await encodeResult(RESULT);

    await expect(decodeResultFromHash(`#d=${encoded}`)).resolves.toEqual(RESULT);
  });

  it("encodes to something URL-safe, with no characters needing escaping", async () => {
    expect(await encodeResult(RESULT)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("compresses rather than just encoding, so long transcripts still fit", async () => {
    const long: TranscriptionResponseDto = {
      ...RESULT,
      segments: Array.from({ length: 400 }, (_, index) => ({
        sequence: index,
        startMs: index * 5000,
        endMs: (index + 1) * 5000,
        sourceText: "Una línea de transcripción de longitud realista para medir el tamaño",
        translatedText: "A transcript line of realistic length to measure the size",
      })),
    };

    const encoded = (await encodeResult(long))!;

    expect(encoded.length).toBeLessThan(JSON.stringify(long).length / 4);
  });

  it("carries the by-id parameters alongside the payload, as a fallback route", async () => {
    const url = new URL(await buildShareUrl("http://localhost:4321/?stale=1", RESULT, 42));

    expect(url.searchParams.get("v")).toBe("dQw4w9WgXcQ");
    expect(url.searchParams.get("t")).toBe("42");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("stale")).toBeNull();
    expect(url.hash.startsWith("#d=")).toBe(true);
  });

  it("reports no result for a fragment that carries none", async () => {
    await expect(decodeResultFromHash("")).resolves.toBeNull();
    await expect(decodeResultFromHash("#t=12")).resolves.toBeNull();
  });

  it("rejects a payload that is not decodable, instead of throwing at the caller", async () => {
    await expect(decodeResultFromHash("#d=not-really-gzip")).resolves.toBeNull();
  });

  it("rejects a well-formed payload whose shape is wrong", async () => {
    // A link is written by whoever shares it, so its contents are never assumed to be a result.
    const encoded = await encodeResult({ video: { id: "x" } } as unknown as TranscriptionResponseDto);

    await expect(decodeResultFromHash(`#d=${encoded}`)).resolves.toBeNull();
  });

  it("rejects a payload whose segments are the wrong shape", async () => {
    const encoded = await encodeResult({
      ...RESULT,
      segments: [{ sequence: 0, startMs: 0 }],
    } as unknown as TranscriptionResponseDto);

    await expect(decodeResultFromHash(`#d=${encoded}`)).resolves.toBeNull();
  });
});
