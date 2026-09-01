import type { TranscriptionResponseDto } from "../types/api";

const STORAGE_KEY = "yt-transcriber-history";
const MAX_ENTRIES = 5;

export interface HistoryEntry {
  savedAt: number;
  result: TranscriptionResponseDto;
  /** Where playback had got to, so reopening picks up where it was left. */
  positionMs?: number;
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Keeps the full result (not just the URL) so reopening a recent video is instant instead of
 * re-spending the anonymous session's rate-limit budget and re-hitting yt-dlp/DeepL.
 *
 * Per-word timings roughly quintuple a result's size -- around 180KB for a 20-minute video -- and
 * five of those would crowd a browser's ~5MB store. So a save that fails on quota is retried
 * without them: losing word-exact karaoke on a reopened video is a far smaller loss than the
 * history quietly ceasing to record anything.
 */
export function saveToHistory(result: TranscriptionResponseDto): void {
  const withoutDuplicate = getHistory().filter((entry) => entry.result.video.id !== result.video.id);
  const write = (saved: TranscriptionResponseDto) =>
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ savedAt: Date.now(), result: saved }, ...withoutDuplicate].slice(0, MAX_ENTRIES)),
    );

  try {
    write(result);
  } catch {
    try {
      write({ ...result, segments: result.segments.map(({ words, ...segment }) => segment) });
    } catch {
      // localStorage can be unavailable outright (private browsing, disabled storage). History is
      // a convenience, not a requirement, so failing silently is fine.
    }
  }
}

// Below this, "resume" would just replay the opening seconds, which is more annoying than helpful.
const MIN_RESUME_MS = 15_000;

/**
 * Records how far playback got, so reopening the video from Recientes starts there.
 *
 * Positions near the very start or the very end are dropped rather than stored: neither is
 * somewhere anyone wants to be dropped back into.
 */
export function rememberPosition(videoId: string, positionMs: number, durationSeconds: number): void {
  const nearTheEnd = positionMs >= durationSeconds * 1000 - MIN_RESUME_MS;
  const keep = positionMs >= MIN_RESUME_MS && !nearTheEnd;
  try {
    const entries = getHistory();
    const entry = entries.find((candidate) => candidate.result.video.id === videoId);
    if (!entry || entry.positionMs === (keep ? positionMs : undefined)) {
      return;
    }
    entry.positionMs = keep ? positionMs : undefined;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // see saveToHistory -- the history is a convenience, never a requirement
  }
}

/**
 * A previously saved result for the same video *and* target language. The language has to match:
 * a cached Spanish run says nothing about what the English one would look like.
 */
export function findInHistory(videoId: string, targetLanguage: string): TranscriptionResponseDto | null {
  const match = getHistory().find(
    (entry) => entry.result.video.id === videoId && entry.result.targetLanguage === targetLanguage,
  );
  return match ? match.result : null;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see saveToHistory
  }
}

export function formatRelativeTime(fromMs: number): string {
  const diffSeconds = Math.max(0, Math.round((Date.now() - fromMs) / 1000));
  if (diffSeconds < 60) {
    return "hace un momento";
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `hace ${diffDays} d`;
}
