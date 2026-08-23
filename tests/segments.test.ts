import { describe, expect, it } from "vitest";
import { foldForSearch, formatTimestamp, toPlainText, toSrt } from "../src/lib/segments";
import type { SegmentDto } from "../src/types/api";

const SEGMENTS: SegmentDto[] = [
  { sequence: 0, startMs: 1360, endMs: 3040, sourceText: "Hello", translatedText: "Hola" },
  { sequence: 1, startMs: 65_000, endMs: 68_500, sourceText: "How are you", translatedText: "Cómo estás" },
];

describe("formatTimestamp", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(formatTimestamp(1360)).toBe("00:01");
    expect(formatTimestamp(65_000)).toBe("01:05");
  });

  it("formats hour-or-longer durations as hh:mm:ss", () => {
    expect(formatTimestamp(3_661_000)).toBe("01:01:01");
  });
});

describe("toPlainText", () => {
  it("joins the requested field with newlines, in order", () => {
    expect(toPlainText(SEGMENTS, "sourceText")).toBe("Hello\nHow are you");
    expect(toPlainText(SEGMENTS, "translatedText")).toBe("Hola\nCómo estás");
  });
});

describe("toSrt", () => {
  it("produces valid SRT blocks with 1-based indices and comma-separated milliseconds", () => {
    const srt = toSrt(SEGMENTS, "translatedText");

    expect(srt).toContain("1\n00:00:01,360 --> 00:00:03,040\nHola\n");
    expect(srt).toContain("2\n00:01:05,000 --> 00:01:08,500\nCómo estás\n");
  });
});

describe("foldForSearch", () => {
  it("strips accents and lowercases, so accent-free queries still match", () => {
    expect(foldForSearch("Cómo estás")).toBe("como estas");
    expect(foldForSearch("NIÑO")).toBe("nino");
  });
});
