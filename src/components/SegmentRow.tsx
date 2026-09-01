import { memo } from "react";
import type { SegmentDto } from "../types/api";
import { formatTimestamp, splitOnMatches } from "../lib/segments";
import KaraokeText from "./KaraokeText";
// Shared with SegmentRow: the active-line and reading-mode rules select across both,
// which a per-component stylesheet could not express once the class names are hashed.
import styles from "./transcript.module.css";

export type SegmentListMode = "source" | "translated" | "dual";

interface SegmentRowProps {
  segment: SegmentDto;
  mode: SegmentListMode;
  isActive: boolean;
  isLooping: boolean;
  /** The live search term, so matches can be marked. Empty when not searching. */
  query: string;
  /** Player position. Only meaningful for the active row; 0 for every other one -- see the note
   *  on the memo below. */
  currentMs: number;
  isPlaying: boolean;
  getCurrentMs?: () => number;
  onSelect: (segment: SegmentDto) => void;
  onToggleLoop?: (segment: SegmentDto) => void;
  onCopyLink?: (segment: SegmentDto) => void;
  onShareQuote?: (segment: SegmentDto) => void;
  registerRow: (sequence: number, node: HTMLLIElement | null) => void;
  clickable: boolean;
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}

/**
 * One transcript line.
 *
 * Memoised, and given a `currentMs` of 0 unless it is the active line. The player's position
 * changes five times a second; without this every line in the transcript re-rendered on each tick
 * to produce identical output, and at a few hundred lines that was enough to drop frames out of
 * the read-along sweep. Now only the line being spoken re-renders.
 */
function SegmentRow({
  segment,
  mode,
  isActive,
  isLooping,
  query,
  currentMs,
  isPlaying,
  getCurrentMs,
  onSelect,
  onToggleLoop,
  onCopyLink,
  onShareQuote,
  registerRow,
  clickable,
}: SegmentRowProps) {
  function renderText(text: string, className: string, alignTo?: string) {
    // While searching, showing *where* the match is beats sweeping the line: the two would fight
    // over the same colour anyway.
    if (query.trim()) {
      return (
        <span className={className}>
          {splitOnMatches(text, query).map((part, index) =>
            part.match ? (
              <mark key={index} className={styles.mark}>
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </span>
      );
    }
    if (!isActive || !getCurrentMs) {
      return <span className={className}>{text}</span>;
    }
    return (
      <KaraokeText
        text={text}
        alignTo={alignTo}
        sourceWords={segment.words}
        startMs={segment.startMs}
        endMs={segment.endMs}
        className={className}
        currentMs={currentMs}
        isPlaying={isPlaying}
        getCurrentMs={getCurrentMs}
      />
    );
  }

  return (
    <li
      className={styles.row}
      data-active={isActive}
      ref={(node) => registerRow(segment.sequence, node)}
    >
      {/* A plain element, not a button, wrapping the text: inside a <button> the browser
          suppresses drag-selection, so a fragment of the transcript could not be selected
          and copied at all. The timestamp stays a real button, which is what carries the
          keyboard affordance -- its click bubbles up to this same handler. */}
      <div className={styles.rowMain} data-clickable={clickable} onClick={() => onSelect(segment)}>
        <button
          type="button"
          className={styles.timestamp}
          disabled={!clickable}
          aria-label={`Saltar a ${formatTimestamp(segment.startMs)}`}
        >
          {formatTimestamp(segment.startMs)}
        </button>
        {mode === "dual" ? (
          <span className={styles.dualText}>
            {renderText(segment.sourceText, styles.text)}
            {renderText(segment.translatedText, styles.textTranslated, segment.sourceText)}
          </span>
        ) : (
          renderText(
            mode === "translated" ? segment.translatedText : segment.sourceText,
            styles.text,
            mode === "translated" ? segment.sourceText : undefined,
          )
        )}
      </div>

      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.actionButton}
          data-active={isLooping}
          onClick={() => onToggleLoop?.(segment)}
          aria-label="Repetir esta línea en bucle"
          title="Repetir en bucle"
        >
          <RepeatIcon />
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onCopyLink?.(segment)}
          aria-label="Copiar enlace a este momento"
          title="Copiar enlace a este momento"
        >
          <LinkIcon />
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onShareQuote?.(segment)}
          aria-label="Descargar esta línea como imagen"
          title="Descargar como imagen"
        >
          <ImageIcon />
        </button>
      </div>
    </li>
  );
}

export default memo(SegmentRow);
