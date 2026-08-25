import type { SegmentDto } from "../types/api";

type SegmentField = "sourceText" | "translatedText";

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

// Escaped rather than written literally: these are the Unicode combining marks that NFD splits
// accents into, and as raw characters they are invisible in an editor and easily mangled by a
// tool that rewrites the file's encoding.
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

export function foldForSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Firefox only honours a click on a link that is actually in the document, and the object URL
  // has to outlive the click, so it is released on the next tick instead of immediately.
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
