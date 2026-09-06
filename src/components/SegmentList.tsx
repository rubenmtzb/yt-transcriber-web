import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SegmentDto } from "../types/api";
import { foldForSearch } from "../lib/segments";
import SegmentRow, { type SegmentListMode } from "./SegmentRow";
// Shared with SegmentRow: the active-line and reading-mode rules select across both,
// which a per-component stylesheet could not express once the class names are hashed.
import { useTranslations } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./transcript.module.css";

export type { SegmentListMode };

/** Everything the three viewers pass straight through, minus what each of them fixes itself. */
export interface SegmentViewerProps {
  lang: Lang;
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
  activeSequence?: number | null;
  loopSequence?: number | null;
  onToggleLoop?: (segment: SegmentDto) => void;
  onCopyLink?: (segment: SegmentDto) => void;
  onShareQuote?: (segment: SegmentDto) => void;
  /** Drops the height cap and enlarges the text for distraction-free reading. */
  reading?: boolean;
  /** Player wiring for the read-along sweep. Omit it and lines render as plain text. */
  currentMs?: number;
  isPlaying?: boolean;
  getCurrentMs?: () => number;
}

interface SegmentListProps extends SegmentViewerProps {
  mode: SegmentListMode;
  searchPlaceholder: string;
}

function segmentText(segment: SegmentDto, mode: SegmentListMode): string {
  if (mode === "dual") {
    return `${segment.sourceText} ${segment.translatedText}`;
  }
  return mode === "translated" ? segment.translatedText : segment.sourceText;
}

export default function SegmentList({
  lang,
  segments,
  mode,
  searchPlaceholder,
  onSegmentClick,
  activeSequence = null,
  loopSequence = null,
  onToggleLoop,
  onCopyLink,
  onShareQuote,
  reading = false,
  currentMs = 0,
  isPlaying = false,
  getCurrentMs,
}: SegmentListProps) {
  const t = useTranslations(lang);
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState(true);
  const rowRefs = useRef(new Map<number, HTMLLIElement>());

  // A drag that ended up selecting text is someone copying a quote, not asking to jump there.
  const handleRowClick = useCallback(
    (segment: SegmentDto) => {
      if (window.getSelection()?.toString()) {
        return;
      }
      onSegmentClick?.(segment);
    },
    [onSegmentClick],
  );

  const registerRow = useCallback((sequence: number, node: HTMLLIElement | null) => {
    if (node) {
      rowRefs.current.set(sequence, node);
    } else {
      rowRefs.current.delete(sequence);
    }
  }, []);

  const filtered = useMemo(() => {
    const normalized = foldForSearch(query.trim());
    if (!normalized) {
      return segments;
    }
    return segments.filter((segment) => foldForSearch(segmentText(segment, mode)).includes(normalized));
  }, [segments, mode, query]);

  // Following the video is the default, but it has to yield: scrolling up to re-read something
  // only to be dragged back on the next line is worse than losing the follow.
  //
  // What counts as "the reader scrolled" is taken from input events, not from scroll events. A
  // scroll event says nothing about who caused it, and the obvious workaround -- ignore scrolls
  // for a moment after scrolling ourselves -- cannot work: a smooth scroll across a long list runs
  // for ~800ms and fires ~50 events, so any fixed window leaves most of our own animation looking
  // like the reader, and the follow switched itself off exactly when the list first had to move.
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const stopFollowing = () => setFollowing(false);
    // A scrollbar drag produces no wheel event; it lands on the list itself, past its content box.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target === list && event.offsetX > list.clientWidth) {
        stopFollowing();
      }
    };

    list.addEventListener("wheel", stopFollowing, { passive: true });
    list.addEventListener("touchmove", stopFollowing, { passive: true });
    list.addEventListener("pointerdown", handlePointerDown);
    return () => {
      list.removeEventListener("wheel", stopFollowing);
      list.removeEventListener("touchmove", stopFollowing);
      list.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const row = activeSequence === null ? null : rowRefs.current.get(activeSequence);
    if (!list || !row || !following) {
      return;
    }

    // Only move once the line has drifted past the comfortable band, and then place it a third of
    // the way down rather than at whichever edge is nearest. Pinning it to the bottom edge -- what
    // scrollIntoView({ block: "nearest" }) does once the list starts scrolling -- means the lines
    // about to be spoken are always off-screen, which is the opposite of reading along.
    const offsetTop = row.offsetTop - list.offsetTop;
    const relative = offsetTop - list.scrollTop;
    const withinComfortBand = relative >= 0 && relative + row.offsetHeight <= list.clientHeight * 0.65;
    if (withinComfortBand) {
      return;
    }
    list.scrollTo({ top: Math.max(0, offsetTop - list.clientHeight / 3), behavior: "smooth" });
  }, [activeSequence, following]);

  function resumeFollowing() {
    setFollowing(true);
  }

  return (
    <div className={styles.container} data-reading={reading}>
      <input
        type="search"
        className={styles.search}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={searchPlaceholder}
      />
      {!following && activeSequence !== null && (
        <button type="button" className={styles.resume} onClick={resumeFollowing}>
          {t("search.backToLine")}
        </button>
      )}

      <ul className={styles.list} ref={listRef}>
        {filtered.map((segment) => {
          const isActive = segment.sequence === activeSequence;
          return (
            <SegmentRow
              key={segment.sequence}
              lang={lang}
              segment={segment}
              mode={mode}
              isActive={isActive}
              isLooping={segment.sequence === loopSequence}
              query={query}
              // Only the active line is given the moving position; every other row keeps a
              // constant 0 so its props stay equal and the memo can skip it.
              currentMs={isActive ? currentMs : 0}
              isPlaying={isActive ? isPlaying : false}
              getCurrentMs={getCurrentMs}
              onSelect={handleRowClick}
              onToggleLoop={onToggleLoop}
              onCopyLink={onCopyLink}
              onShareQuote={onShareQuote}
              registerRow={registerRow}
              clickable={Boolean(onSegmentClick)}
            />
          );
        })}
        {filtered.length === 0 && <li className={styles.empty}>{t("search.empty", { query })}</li>}
      </ul>
    </div>
  );
}
