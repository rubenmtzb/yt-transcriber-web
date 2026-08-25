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

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function foldForSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
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
