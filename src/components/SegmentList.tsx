import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentDto } from "../types/api";
import { foldForSearch, formatTimestamp } from "../lib/segments";
import styles from "./SegmentList.module.css";

interface SegmentListProps {
  segments: SegmentDto[];
  field: "sourceText" | "translatedText";
  searchPlaceholder: string;
  onSegmentClick?: (segment: SegmentDto) => void;
  /** `sequence` of the segment currently being spoken, highlighted and scrolled into view. */
  activeSequence?: number | null;
}

export default function SegmentList({
  segments,
  field,
  searchPlaceholder,
  onSegmentClick,
  activeSequence = null,
}: SegmentListProps) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const activeRowRef = useRef<HTMLLIElement>(null);

  const filtered = useMemo(() => {
    const normalized = foldForSearch(query.trim());
    if (!normalized) {
      return segments;
    }
    return segments.filter((segment) => foldForSearch(segment[field]).includes(normalized));
  }, [segments, field, query]);

  // Follow playback by scrolling the list itself -- never `scrollIntoView`, which would also
  // scroll the page and yank the video out of sight. Only moves when the active row has actually
  // drifted outside the viewport, so a row already on screen doesn't jitter on every change.
  useEffect(() => {
    const list = listRef.current;
    const row = activeRowRef.current;
    if (!list || !row) {
      return;
    }

    const offsetTop = row.offsetTop - list.offsetTop;
    const isAbove = offsetTop < list.scrollTop;
    const isBelow = offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight;
    if (!isAbove && !isBelow) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      top: offsetTop - (list.clientHeight - row.offsetHeight) / 2,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
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
      <ul className={styles.list} ref={listRef}>
        {filtered.map((segment) => {
          const isActive = segment.sequence === activeSequence;
          return (
            <li
              key={segment.sequence}
              ref={isActive ? activeRowRef : undefined}
              className={styles.row}
              data-active={isActive}
              aria-current={isActive ? "true" : undefined}
            >
              <button
                type="button"
                className={styles.rowButton}
                onClick={() => onSegmentClick?.(segment)}
                disabled={!onSegmentClick}
              >
                <span className={styles.timestamp}>{formatTimestamp(segment.startMs)}</span>
                <span className={styles.text}>{segment[field]}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className={styles.empty}>Sin resultados para "{query}".</li>}
      </ul>
    </div>
  );
}
