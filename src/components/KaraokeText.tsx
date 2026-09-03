import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fillOf, toAlignedTimedWords, toProvidedTimedWords, toTimedWords } from "../lib/segments";
import type { TimedWordDto } from "../types/api";
import styles from "./KaraokeText.module.css";

interface KaraokeTextProps {
  text: string;
  /**
   * The spoken line this text is a translation of, when it is one. Word times are then taken from
   * its clause rhythm instead of from the translation's own characters -- see toAlignedTimedWords.
   */
  alignTo?: string;
  /** The provider's real per-word timings for the source line, when it supplied any. */
  sourceWords?: TimedWordDto[];
  startMs: number;
  endMs: number;
  className?: string;
  /** Player position from React state: coarse (polled), but covers seeking while paused. */
  currentMs: number;
  isPlaying: boolean;
  /** Reads the player's live position, for the per-frame sweep during playback. */
  getCurrentMs: () => number;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The line currently being spoken, swept left to right as it goes.
 *
 * Word times come from the provider when it supplies them (YouTube's auto-captions and Whisper
 * both do) and are estimated from the line's duration otherwise, which is the case for
 * uploader-written captions and for every translation.
 */
export default function KaraokeText({
  text,
  alignTo,
  sourceWords,
  startMs,
  endMs,
  className,
  currentMs,
  isPlaying,
  getCurrentMs,
}: KaraokeTextProps) {
  // Real timings first, an estimate only when there are none: see toProvidedTimedWords.
  const tokens = useMemo(() => {
    if (alignTo) {
      return toAlignedTimedWords(text, alignTo, startMs, endMs, sourceWords ?? []);
    }
    return toProvidedTimedWords(text, sourceWords ?? []) ?? toTimedWords(text, startMs, endMs);
  }, [text, alignTo, sourceWords, startMs, endMs]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Last value written per word, so a frame only touches the one word whose fill actually moved.
  // Writing all of them every frame meant ~1000 style writes a second to say nothing new.
  const paintedRef = useRef<string[]>([]);
  // Resolved on the client only: this island is rendered on the server too, where matchMedia
  // doesn't exist. Reduced motion drops the continuous sweep for a plain word-by-word step.
  const [stepped, setStepped] = useState(false);

  useEffect(() => setStepped(prefersReducedMotion()), []);

  // Written straight to the DOM rather than through React state: a re-render per frame would
  // repaint the whole transcript list, which can run to hundreds of rows.
  const paint = useCallback(
    (ms: number) => {
      tokens.forEach((token, index) => {
        const node = wordRefs.current[index];
        if (!node) {
          return;
        }
        const fill = fillOf(token, ms);
        const value = stepped ? (fill > 0 ? "1" : "0") : fill.toFixed(3);
        if (paintedRef.current[index] === value) {
          return;
        }
        paintedRef.current[index] = value;
        node.style.setProperty("--fill", value);
      });
    },
    [tokens, stepped],
  );

  // A new token set means the cached values describe words that no longer exist.
  useEffect(() => {
    paintedRef.current = [];
  }, [tokens]);

  useEffect(() => paint(currentMs), [paint, currentMs]);

  useEffect(() => {
    if (!isPlaying || stepped) {
      return;
    }
    let frame = requestAnimationFrame(function tick() {
      paint(getCurrentMs());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, stepped, paint, getCurrentMs]);

  return (
    <span className={className}>
      {tokens.map((token, index) => (
        <span
          key={index}
          className={styles.word}
          ref={(node) => {
            wordRefs.current[index] = node;
          }}
        >
          {token.text}
        </span>
      ))}
    </span>
  );
}
