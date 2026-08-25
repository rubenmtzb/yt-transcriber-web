import type { TranscriptionResponseDto } from "../types/api";

const STORAGE_KEY = "yt-transcriber-history";
const MAX_ENTRIES = 5;

export interface HistoryEntry {
  savedAt: number;
  result: TranscriptionResponseDto;
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

// Keeps the full result (not just the URL) so reopening a recent video is instant instead of
// re-spending the anonymous session's rate-limit budget and re-hitting yt-dlp/DeepL.
export function saveToHistory(result: TranscriptionResponseDto): void {
  try {
    const withoutDuplicate = getHistory().filter((entry) => entry.result.video.id !== result.video.id);
    const next = [{ savedAt: Date.now(), result }, ...withoutDuplicate].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable (private browsing, quota exceeded, disabled storage) --
    // history is a convenience, not a requirement, so failing silently is fine.
  }
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
