import type { SegmentDto } from "../types/api";
import { formatTimestamp } from "./segments";

export type QuoteCardMode = "source" | "translated" | "dual";

export interface QuoteCardOptions {
  segment: SegmentDto;
  videoTitle: string;
  mode: QuoteCardMode;
}

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 90;
const MAX_WIDTH = WIDTH - MARGIN * 2;

async function ensureFontsLoaded(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load("700 96px Inter"),
      document.fonts.load("600 46px Inter"),
      document.fonts.load("italic 500 34px Inter"),
      document.fonts.load("600 26px Inter"),
      document.fonts.load("700 30px Inter"),
    ]);
    await document.fonts.ready;
  } catch {
    // Web fonts can fail to load (offline, blocked request) -- the canvas still renders fine
    // with the system-ui fallback baked into every font string below.
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

// Shrinks the font until the quote fits within maxLines, so a long lyric line doesn't
// overflow the card instead of producing an unreadably tiny wall of text.
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  weight: string,
): { lines: string[]; fontSize: number } {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { lines, fontSize: size };
    }
  }
  ctx.font = `${weight} ${minSize}px Inter, system-ui, sans-serif`;
  return { lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines), fontSize: minSize };
}

export async function renderQuoteCard({ segment, videoTitle, mode }: QuoteCardOptions): Promise<Blob> {
  await ensureFontsLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  const backgroundGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  backgroundGradient.addColorStop(0, "#05060e");
  backgroundGradient.addColorStop(1, "#170a35");
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH - 120, 90, 0, WIDTH - 120, 90, 420);
  glow.addColorStop(0, "rgba(177, 74, 237, 0.35)");
  glow.addColorStop(1, "rgba(177, 74, 237, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#b14aed";
  ctx.font = "700 110px Georgia, 'Times New Roman', serif";
  ctx.fillText("“", MARGIN - 8, 200);

  const primaryText = mode === "translated" ? segment.translatedText : segment.sourceText;
  const secondaryText = mode === "dual" ? segment.translatedText : null;

  const primaryFit = fitLines(ctx, primaryText, MAX_WIDTH, secondaryText ? 4 : 6, 48, 28, "600");
  const primaryLineHeight = primaryFit.fontSize * 1.32;

  let cursorY = 230;
  ctx.fillStyle = "#f4f2fa";
  ctx.font = `600 ${primaryFit.fontSize}px Inter, system-ui, sans-serif`;
  for (const line of primaryFit.lines) {
    ctx.fillText(line, MARGIN, cursorY);
    cursorY += primaryLineHeight;
  }

  if (secondaryText) {
    cursorY += 14;
    const secondaryFit = fitLines(ctx, secondaryText, MAX_WIDTH, 4, 32, 22, "italic 500");
    ctx.fillStyle = "#c9baf0";
    ctx.font = `italic 500 ${secondaryFit.fontSize}px Inter, system-ui, sans-serif`;
    for (const line of secondaryFit.lines) {
      ctx.fillText(line, MARGIN, cursorY);
      cursorY += secondaryFit.fontSize * 1.3;
    }
  }

  ctx.fillStyle = "#9a94b8";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  const footerText = `${videoTitle} · ${formatTimestamp(segment.startMs)}`;
  const footerLines = wrapLines(ctx, footerText, MAX_WIDTH);
  const footerLine = footerLines.length > 1 ? `${footerLines[0].replace(/\s+\S*$/, "")}…` : footerLines[0];
  ctx.fillText(footerLine, MARGIN, HEIGHT - 96);

  ctx.fillStyle = "#b14aed";
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillText("YT Transcriber", MARGIN, HEIGHT - 54);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas toBlob failed"));
      }
    }, "image/png");
  });
}
