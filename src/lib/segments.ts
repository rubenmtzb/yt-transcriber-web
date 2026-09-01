import type { SegmentDto, TimedWordDto } from "../types/api";

export type SegmentField = "sourceText" | "translatedText";

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function formatSrtTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function toPlainText(segments: SegmentDto[], field: SegmentField): string {
  return segments.map((segment) => segment[field]).join("\n");
}

export function toSrt(segments: SegmentDto[], field: SegmentField): string {
  return segments
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.startMs);
      const end = formatSrtTimestamp(segment.endMs);
      return `${index + 1}\n${start} --> ${end}\n${segment[field]}\n`;
    })
    .join("\n");
}

/**
 * WebVTT: what browsers and most players actually take for a `<track>`, where SubRip often isn't
 * accepted. Same cue layout, but the header is required and the milliseconds separator is a dot.
 */
export function toVtt(segments: SegmentDto[], field: SegmentField): string {
  const cues = segments
    .map((segment) => {
      const start = formatSrtTimestamp(segment.startMs).replace(",", ".");
      const end = formatSrtTimestamp(segment.endMs).replace(",", ".");
      return `${start} --> ${end}\n${segment[field]}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${cues}`;
}

/**
 * Markdown for note-taking, with every line linking back to its moment in the video, so a quote
 * pasted into notes stays traceable to what was said.
 */
export function toMarkdown(segments: SegmentDto[], field: SegmentField, videoId: string, title: string): string {
  const lines = segments.map((segment) => {
    const seconds = Math.floor(segment.startMs / 1000);
    return `- [\`${formatTimestamp(segment.startMs)}\`](https://youtu.be/${videoId}?t=${seconds}) ${segment[field]}`;
  });
  return `# ${title}\n\nhttps://youtu.be/${videoId}\n\n${lines.join("\n")}\n`;
}

export interface TimedToken {
  text: string;
  startMs: number;
  endMs: number;
}

const WHITESPACE_ONLY = /^\s+$/;

/**
 * Splits a line into tokens with an approximate time for each, by spreading the line's own
 * duration across its words in proportion to their length.
 *
 * The API only carries per-line timings, so these word times are an estimate, not real speech
 * timing: they can drift by a few tenths of a second inside a long line, but they always resync
 * at the line boundary, which is the only point the estimate is visibly anchored to.
 *
 * Whitespace is kept as its own zero-weight token rather than dropped, so the rendered text still
 * wraps, copies and preserves newlines exactly like the original string, and so the sweep moves
 * straight from one word to the next instead of stalling on the gaps.
 */
export function toTimedWords(text: string, startMs: number, endMs: number): TimedToken[] {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  const duration = Math.max(0, endMs - startMs);
  const totalWeight = parts.reduce((sum, part) => sum + weightOf(part), 0);

  let consumed = 0;
  return parts.map((part) => {
    const tokenStart = totalWeight === 0 ? startMs : startMs + (duration * consumed) / totalWeight;
    consumed += weightOf(part);
    const tokenEnd = totalWeight === 0 ? startMs + duration : startMs + (duration * consumed) / totalWeight;
    return { text: part, startMs: tokenStart, endMs: tokenEnd };
  });
}

function weightOf(part: string): number {
  return WHITESPACE_ONLY.test(part) ? 0 : part.length;
}

// Splits after sentence and clause punctuation, keeping the delimiter and the whitespace that
// follows it with the clause they close, so the pieces re-join into the original string exactly.
function splitClauses(text: string): string[] {
  const parts = text.split(/((?<=[,;:.!?])\s+)/);
  const clauses: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const clause = parts[index] + (parts[index + 1] ?? "");
    if (clause.length > 0) {
      clauses.push(clause);
    }
  }
  return clauses;
}

/**
 * Word times for a translated line, anchored to the clause rhythm of the line that was actually
 * spoken.
 *
 * Spreading a translation's own characters across the line (what toTimedWords does) puts the sweep
 * at the right *fraction* but the wrong *words*: a translation has a different word count, lengths
 * and order, so by mid-line the highlight sits on a word whose source was spoken seconds earlier.
 * Splitting both texts into clauses and giving each translated clause the time window of the
 * matching source clause pins them back together at every punctuation mark, which is the only
 * correspondence a translation reliably preserves.
 *
 * When the two don't split into the same number of clauses there's nothing to match up, so this
 * falls back to spreading the translation across the whole line as before.
 */
export function toAlignedTimedWords(
  text: string,
  sourceText: string,
  startMs: number,
  endMs: number,
  sourceWords: TimedWordDto[] = [],
): TimedToken[] {
  const targetClauses = splitClauses(text);
  const sourceClauses = splitClauses(sourceText);
  if (targetClauses.length < 2 || targetClauses.length !== sourceClauses.length) {
    return toTimedWords(text, startMs, endMs);
  }

  const boundaries = clauseBoundaryTimes(sourceClauses, startMs, endMs, sourceWords);
  if (!boundaries) {
    return toTimedWords(text, startMs, endMs);
  }

  const tokens: TimedToken[] = [];
  let clauseStart = startMs;
  targetClauses.forEach((clause, index) => {
    tokens.push(...toTimedWords(clause, clauseStart, boundaries[index]));
    clauseStart = boundaries[index];
  });
  return tokens;
}

/**
 * When each source clause ends.
 *
 * Read off the provider's own word timings when it supplied them -- the clause boundary is then
 * the real moment the last word of that clause finished being said -- and estimated by character
 * weight only as a fallback. Anchoring the translation to real boundaries is what keeps it from
 * lagging half a line behind by the end of a long sentence.
 */
function clauseBoundaryTimes(
  sourceClauses: string[],
  startMs: number,
  endMs: number,
  sourceWords: TimedWordDto[],
): number[] | null {
  const duration = Math.max(0, endMs - startMs);

  const wordsInSource = sourceClauses.reduce(
    (count, clause) => count + clause.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  // Only trust the real times when they actually cover the line. A short list would otherwise have
  // every clause past its end collapse onto the last known word, which is worse than estimating.
  if (sourceWords.length >= wordsInSource && wordsInSource > 0) {
    const times: number[] = [];
    let consumedWords = 0;
    for (const clause of sourceClauses) {
      consumedWords += clause.trim().split(/\s+/).filter(Boolean).length;
      times.push(sourceWords[consumedWords - 1].endMs);
    }
    times[times.length - 1] = endMs;
    // Out-of-order boundaries would run a clause backwards; better to fall back than to do that.
    return times.every((time, index) => time >= (index === 0 ? startMs : times[index - 1])) ? times : null;
  }

  const totalWeight = sourceClauses.reduce((sum, clause) => sum + weightOf(clause.trim()), 0);
  if (totalWeight === 0) {
    return null;
  }
  let consumed = 0;
  return sourceClauses.map((clause) => {
    consumed += weightOf(clause.trim());
    return startMs + (duration * consumed) / totalWeight;
  });
}

/**
 * Turns the provider's own word timings into tokens, filling the gaps between them with the
 * whitespace that separates the words.
 *
 * Preferred over any estimate: these are the times the speech actually happened. The words are
 * re-derived against the rendered text so the tokens still concatenate back to it exactly -- a
 * provider's word list is not guaranteed to reproduce the line verbatim once cues have been merged
 * and trimmed, and rendering something other than the transcript would be worse than a rough sweep.
 * A mismatch therefore falls back to spreading the line, rather than showing altered text.
 */
export function toProvidedTimedWords(text: string, words: TimedWordDto[]): TimedToken[] | null {
  if (words.length === 0) {
    return null;
  }

  const tokens: TimedToken[] = [];
  let cursor = 0;

  for (const word of words) {
    const trimmed = word.text.trim();
    if (!trimmed) {
      continue;
    }
    const found = text.indexOf(trimmed, cursor);
    if (found === -1) {
      return null;
    }
    if (found > cursor) {
      // Whatever sits between two words (a space, a newline) belongs to neither, so it is given
      // no duration and the sweep steps straight across it.
      tokens.push({ text: text.slice(cursor, found), startMs: word.startMs, endMs: word.startMs });
    }
    tokens.push({ text: trimmed, startMs: word.startMs, endMs: Math.max(word.startMs, word.endMs) });
    cursor = found + trimmed.length;
  }

  if (tokens.length === 0) {
    return null;
  }
  if (cursor < text.length) {
    const tail = tokens[tokens.length - 1];
    tokens.push({ text: text.slice(cursor), startMs: tail.endMs, endMs: tail.endMs });
  }
  return tokens;
}

/** How much of a token has been spoken at `currentMs`, as a 0..1 fraction. */
export function fillOf(token: TimedToken, currentMs: number): number {
  if (currentMs >= token.endMs) {
    return 1;
  }
  if (currentMs <= token.startMs) {
    return 0;
  }
  return (currentMs - token.startMs) / (token.endMs - token.startMs);
}

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function foldForSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

/**
 * Splits text around every occurrence of `query`, alternating non-match / match / non-match.
 *
 * Matching runs on the folded form (case- and accent-insensitive, same as the filter) but the
 * offsets are applied to the original string, so the text keeps its real accents and casing.
 * Folding is one character in, one character out for everything this app renders -- "á" decomposes
 * to "a" plus a combining mark that then gets stripped -- but that is a property of the input, not
 * a guarantee of Unicode, so a length mismatch falls back to no highlighting rather than slicing
 * the original at offsets that no longer line up.
 */
export function splitOnMatches(text: string, query: string): { text: string; match: boolean }[] {
  const needle = foldForSearch(query.trim());
  if (!needle) {
    return [{ text, match: false }];
  }

  const haystack = foldForSearch(text);
  if (haystack.length !== text.length) {
    return [{ text, match: false }];
  }
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  for (let found = haystack.indexOf(needle); found !== -1; found = haystack.indexOf(needle, cursor)) {
    if (found > cursor) {
      parts.push({ text: text.slice(cursor, found), match: false });
    }
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }
  return parts;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string): void {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}
