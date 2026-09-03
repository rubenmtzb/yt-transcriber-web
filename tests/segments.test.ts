import { describe, expect, it } from "vitest";
import {
  fillOf,
  foldForSearch,
  formatTimestamp,
  toAlignedTimedWords,
  toPlainText,
  toSrt,
  toTimedWords,
  toVtt,
  toMarkdown,
  toProvidedTimedWords,
} from "../src/lib/segments";
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

describe("toTimedWords", () => {
  it("spreads the line's duration across its words in proportion to their length", () => {
    // "ab" + "cdef" = 6 weighted characters over 6000ms, so 1000ms per character.
    const tokens = toTimedWords("ab cdef", 0, 6000);

    expect(tokens.map((token) => token.text)).toEqual(["ab", " ", "cdef"]);
    expect(tokens[0]).toMatchObject({ startMs: 0, endMs: 2000 });
    expect(tokens[2]).toMatchObject({ startMs: 2000, endMs: 6000 });
  });

  it("gives whitespace no duration so the sweep moves straight to the next word", () => {
    const [, space] = toTimedWords("ab cdef", 0, 6000);

    expect(space.startMs).toBe(space.endMs);
  });

  it("preserves newlines as their own tokens so the text still renders verbatim", () => {
    expect(toTimedWords("uno\ndos", 0, 1000).map((token) => token.text)).toEqual(["uno", "\n", "dos"]);
  });

  it("starts every word at the line start when the line has no duration", () => {
    const tokens = toTimedWords("uno dos", 4000, 4000);

    expect(tokens.every((token) => token.startMs === 4000 && token.endMs === 4000)).toBe(true);
  });

  it("falls back to the whole line span when there is no word to weight", () => {
    expect(toTimedWords("   ", 0, 1000)).toEqual([{ text: "   ", startMs: 0, endMs: 1000 }]);
  });
});

describe("fillOf", () => {
  const token = { text: "hola", startMs: 1000, endMs: 3000 };

  it("reports nothing filled before the word starts", () => {
    expect(fillOf(token, 0)).toBe(0);
    expect(fillOf(token, 1000)).toBe(0);
  });

  it("reports the fraction elapsed while the word is being spoken", () => {
    expect(fillOf(token, 2000)).toBe(0.5);
  });

  it("reports fully filled once the word is past", () => {
    expect(fillOf(token, 3000)).toBe(1);
    expect(fillOf(token, 9999)).toBe(1);
  });

  it("treats a zero-length token as already filled", () => {
    expect(fillOf({ text: " ", startMs: 500, endMs: 500 }, 500)).toBe(1);
  });
});

describe("toAlignedTimedWords", () => {
  // Same sentence, split the same way, but the translation is shorter and reordered.
  const SOURCE = "Serás como una luz que alumbre mi camino, me voy pero volveré";
  const TARGET = "You will be the light on my path, I return";

  it("hands each translated clause the time window of the matching source clause", () => {
    const tokens = toAlignedTimedWords(TARGET, SOURCE, 0, 30_000);

    // The source's first clause is 41 of 60 weighted characters, so it owns the first 20.5s -- and
    // the translated clause that ends in "path," must end there too, not wherever its own
    // character count would have put it (its own share would be 33 of 41, i.e. 24.1s).
    const comma = tokens.find((token) => token.text === "path,")!;
    expect(comma.endMs).toBe(20_500);
    expect(tokens.at(-1)!.endMs).toBe(30_000);
  });

  it("keeps the translated text verbatim, clause separators included", () => {
    expect(toAlignedTimedWords(TARGET, SOURCE, 0, 30_000).map((token) => token.text).join("")).toBe(TARGET);
  });

  it("puts the sweep on the right side of the comma once the source has passed it", () => {
    const aligned = toAlignedTimedWords(TARGET, SOURCE, 0, 30_000);
    const unaligned = toTimedWords(TARGET, 0, 30_000);
    const wordAt = (tokens: typeof aligned, ms: number) =>
      tokens.find((token) => token.text.trim() && ms >= token.startMs && ms < token.endMs)?.text;

    // At 21s the audio is already past "camino," and into the closing clause.
    expect(wordAt(aligned, 21_000)).toBe("I");
    // Spreading by the translation's own characters still had it stuck on the first clause.
    expect(wordAt(unaligned, 21_000)).toBe("path,");
  });

  it("falls back to plain spreading when the two don't split the same way", () => {
    const target = "One clause only";
    const source = "Primera parte, segunda parte, tercera parte";

    expect(toAlignedTimedWords(target, source, 0, 1000)).toEqual(toTimedWords(target, 0, 1000));
  });

  it("falls back for a line with no clause punctuation at all", () => {
    expect(toAlignedTimedWords("hello there", "hola que tal", 0, 1000)).toEqual(toTimedWords("hello there", 0, 1000));
  });
});

describe("toVtt", () => {
  it("writes the header and a dot before the milliseconds, as WebVTT requires", () => {
    expect(toVtt(SEGMENTS, "sourceText")).toBe(
      "WEBVTT\n\n" +
        "00:00:01.360 --> 00:00:03.040\nHello\n\n" +
        "00:01:05.000 --> 00:01:08.500\nHow are you\n",
    );
  });

  it("numbers nothing, unlike SubRip", () => {
    expect(toVtt(SEGMENTS, "sourceText")).not.toMatch(/^\d+$/m);
  });
});

describe("toMarkdown", () => {
  it("links every line back to its moment in the video", () => {
    const markdown = toMarkdown(SEGMENTS, "translatedText", "dQw4w9WgXcQ", "Un vídeo");

    expect(markdown).toContain("# Un vídeo");
    expect(markdown).toContain("- [`00:01`](https://youtu.be/dQw4w9WgXcQ?t=1) Hola");
    expect(markdown).toContain("- [`01:05`](https://youtu.be/dQw4w9WgXcQ?t=65) Cómo estás");
  });
});

describe("toProvidedTimedWords", () => {
  // Real whisper.cpp offsets for "♪ Dejaré mi tierra por ti" (video maEVfX9zRIE).
  const REAL = [
    { text: " ♪", startMs: 12_030, endMs: 12_150 },
    { text: " Dejaré", startMs: 12_450, endMs: 13_030 },
    { text: " mi", startMs: 13_030, endMs: 13_330 },
    { text: " tierra", startMs: 13_330, endMs: 14_220 },
    { text: " por", startMs: 14_220, endMs: 14_670 },
    { text: " ti,", startMs: 14_670, endMs: 15_230 },
  ];
  const TEXT = "♪ Dejaré mi tierra por ti,";

  it("uses the provider's own times instead of estimating", () => {
    const tokens = toProvidedTimedWords(TEXT, REAL)!;
    const dejare = tokens.find((token) => token.text === "Dejaré")!;

    expect(dejare.startMs).toBe(12_450);
    // The estimate would have put it a long way off: it spreads by characters from the line start.
    expect(toTimedWords(TEXT, 12_000, 22_000)[2].startMs).not.toBe(12_450);
  });

  it("reproduces the rendered line exactly, separators included", () => {
    expect(toProvidedTimedWords(TEXT, REAL)!.map((token) => token.text).join("")).toBe(TEXT);
  });

  it("gives the gaps between words no duration, so the sweep steps across them", () => {
    const gaps = toProvidedTimedWords(TEXT, REAL)!.filter((token) => !token.text.trim());

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((gap) => gap.startMs === gap.endMs)).toBe(true);
  });

  it("declines when the words don't match the text, rather than rendering something else", () => {
    // Merging and trimming cues can leave a word list that no longer spells the line.
    expect(toProvidedTimedWords("una línea distinta", REAL)).toBeNull();
  });

  it("declines when there are no words at all", () => {
    expect(toProvidedTimedWords(TEXT, [])).toBeNull();
  });
});

describe("toAlignedTimedWords with real source timings", () => {
  it("ends each translated clause where the source clause was actually finished", () => {
    const sourceWords = [
      { text: "Serás", startMs: 0, endMs: 900 },
      { text: "luz,", startMs: 900, endMs: 4000 },
      { text: "volveré", startMs: 4000, endMs: 9000 },
    ];

    const tokens = toAlignedTimedWords(
      "You are light, I return",
      "Serás luz, volveré",
      0,
      10_000,
      sourceWords,
    );

    // "light," closes the first clause, and the source's own "luz," ended at 4000 -- not at the
    // 5000-ish a character-weighted split would have guessed.
    expect(tokens.find((token) => token.text === "light,")!.endMs).toBe(4000);
  });

  it("falls back to estimating when the word list cannot cover the clauses", () => {
    const tokens = toAlignedTimedWords("One, two", "Uno, dos", 0, 1000, [
      { text: "Uno,", startMs: 0, endMs: 400 },
    ]);

    expect(tokens).toEqual(toTimedWords("One, two", 0, 1000));
  });
});
