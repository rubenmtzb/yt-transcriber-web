import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentDto } from "../types/api";
import { foldForSearch, formatTimestamp } from "../lib/segments";
import styles from "./SegmentList.module.css";

export type SegmentListMode = "source" | "translated" | "dual";

interface SegmentListProps {
  segments: SegmentDto[];
  mode: SegmentListMode;
  searchPlaceholder: string;
  onSegmentClick?: (segment: SegmentDto) => void;
  activeSequence?: number | null;
  loopSequence?: number | null;
  onToggleLoop?: (segment: SegmentDto) => void;
  onCopyLink?: (segment: SegmentDto) => void;
  onShareQuote?: (segment: SegmentDto) => void;
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

function segmentText(segment: SegmentDto, mode: SegmentListMode): string {
  if (mode === "dual") {
    return `${segment.sourceText} ${segment.translatedText}`;
  }
  return mode === "translated" ? segment.translatedText : segment.sourceText;
}

export default function SegmentList({
  segments,
  mode,
  searchPlaceholder,
  onSegmentClick,
  activeSequence = null,
  loopSequence = null,
  onToggleLoop,
  onCopyLink,
  onShareQuote,
}: SegmentListProps) {
  const [query, setQuery] = useState("");
  const rowRefs = useRef(new Map<number, HTMLLIElement>());

  const filtered = useMemo(() => {
    const normalized = foldForSearch(query.trim());
    if (!normalized) {
      return segments;
    }
    return segments.filter((segment) => foldForSearch(segmentText(segment, mode)).includes(normalized));
  }, [segments, mode, query]);

  useEffect(() => {
    if (activeSequence === null) {
      return;
    }
    rowRefs.current.get(activeSequence)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeSequence]);

  return (
    <div className={styles.container}>
      <input
        type="search"
        className={styles.search}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={searchPlaceholder}
      />
      <ul className={styles.list}>
        {filtered.map((segment) => (
          <li
            key={segment.sequence}
            className={styles.row}
            data-active={segment.sequence === activeSequence}
            ref={(node) => {
              if (node) {
                rowRefs.current.set(segment.sequence, node);
              } else {
                rowRefs.current.delete(segment.sequence);
              }
            }}
          >
            <button
              type="button"
              className={styles.rowButton}
              onClick={() => onSegmentClick?.(segment)}
              disabled={!onSegmentClick}
            >
              <span className={styles.timestamp}>{formatTimestamp(segment.startMs)}</span>
              {mode === "dual" ? (
                <span className={styles.dualText}>
                  <span className={styles.text}>{segment.sourceText}</span>
                  <span className={styles.textTranslated}>{segment.translatedText}</span>
                </span>
              ) : (
                <span className={styles.text}>{mode === "translated" ? segment.translatedText : segment.sourceText}</span>
              )}
            </button>

            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.actionButton}
                data-active={segment.sequence === loopSequence}
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
        ))}
        {filtered.length === 0 && <li className={styles.empty}>Sin resultados para "{query}".</li>}
      </ul>
    </div>
  );
}
