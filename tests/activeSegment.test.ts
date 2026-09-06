import { describe, expect, it } from "vitest";
import { findActiveSegment } from "../src/lib/segments";
import type { SegmentDto } from "../src/types/api";

const segment = (sequence: number, startMs: number): SegmentDto => ({
  sequence, startMs, endMs: startMs + 50, sourceText: "Text", translatedText: "Texto",
});

describe("findActiveSegment", () => {
  it("preserves boundaries, gaps, duplicate timestamps and the last line after the end", () => {
    const segments = [segment(0, 100), segment(1, 200), segment(2, 200), segment(3, 400)];
    expect(findActiveSegment([], 100)).toBeNull();
    expect(findActiveSegment(segments, 99)).toBeNull();
    expect(findActiveSegment(segments, 100)).toBe(segments[0]);
    expect(findActiveSegment(segments, 199)).toBe(segments[0]);
    expect(findActiveSegment(segments, 200)).toBe(segments[2]);
    expect(findActiveSegment(segments, 399)).toBe(segments[2]);
    expect(findActiveSegment(segments, 400)).toBe(segments[3]);
    expect(findActiveSegment(segments, 999)).toBe(segments[3]);
  });

  it("matches the previous sequential lookup across a long transcript and arbitrary seeks", () => {
    const segments = Array.from({ length: 1000 }, (_, i) => segment(i, Math.floor(i / 2) * 100));
    for (let ms = -100; ms <= 51000; ms += 37) {
      let previous: SegmentDto | null = null;
      for (const entry of segments) {
        if (entry.startMs > ms) break;
        previous = entry;
      }
      expect(findActiveSegment(segments, ms)).toBe(previous);
    }
  });

  it("reads at most 14 timestamps in a 10,000-line transcript", () => {
    let reads = 0;
    const segments = Array.from({ length: 10000 }, (_, i) => ({
      ...segment(i, i * 100),
      get startMs() { reads += 1; return i * 100; },
    }));
    expect(findActiveSegment(segments, 999900)).toBe(segments[9999]);
    expect(reads).toBeLessThanOrEqual(14);
  });
});
