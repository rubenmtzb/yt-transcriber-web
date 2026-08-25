import { useCallback, useEffect, useRef, useState } from "react";
import type { SegmentDto, TranscriptionResponseDto } from "../types/api";
import TranscriptViewer from "./TranscriptViewer";
import TranslationViewer from "./TranslationViewer";
import VideoPlayer, { type VideoPlayerHandle } from "./VideoPlayer";
import { findActiveSegmentSequence, toPlainText, toSrt, downloadTextFile } from "../lib/segments";
import styles from "./ResultView.module.css";

interface ResultViewProps {
  result: TranscriptionResponseDto;
  onReset: () => void;
}

type Tab = "transcript" | "translation";

const FEEDBACK_TIMEOUT_MS = 2000;

export default function ResultView({ result, onReset }: ResultViewProps) {
  const [tab, setTab] = useState<Tab>("transcript");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeSequence, setActiveSequence] = useState<number | null>(null);
  const playerRef = useRef<VideoPlayerHandle>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segments = result.segments;

  function showFeedback(message: string) {
    // Restart the countdown on every message, otherwise a timer left over from a previous click
    // clears the new one early.
    if (feedbackTimeoutRef.current !== null) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback(message);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS);
  }

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(message);
    } catch {
      // The Clipboard API rejects outside a secure context or when the user denies permission.
      // Downloading still works, so say so instead of failing silently.
      showFeedback("No se pudo copiar. Usa la descarga.");
    }
  }

  function jumpToSegment(segment: SegmentDto) {
    playerRef.current?.seekTo(segment.startMs);
  }

  // Store the active segment rather than the raw playback position: the player ticks four times
  // a second, but the segment only changes every few seconds, and React bails out of a re-render
  // when the value is unchanged. So the list re-renders on segment boundaries, not on every tick.
  const handleTimeUpdate = useCallback(
    (currentMs: number) => {
      setActiveSequence(findActiveSegmentSequence(segments, currentMs));
    },
    [segments],
  );

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <VideoPlayer videoId={result.video.id} ref={playerRef} onTimeUpdate={handleTimeUpdate} />

        <div>
          <p className={styles.eyebrow}>Vídeo</p>
          <h2 className={styles.title}>{result.video.title}</h2>
        </div>

        <div className={styles.actions}>
          <p className={styles.actionsLabel}>Acciones</p>
          <button type="button" onClick={() => copy(toPlainText(segments, "sourceText"), "Transcripción copiada")}>
            Copiar transcripción
          </button>
          <button type="button" onClick={() => copy(toPlainText(segments, "translatedText"), "Traducción copiada")}>
            Copiar traducción
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(toPlainText(segments, "translatedText"), "traduccion.txt")}
          >
            Descargar .txt
          </button>
          <button type="button" onClick={() => downloadTextFile(toSrt(segments, "translatedText"), "traduccion.srt")}>
            Descargar .srt
          </button>
        </div>

        <p className={styles.feedback} role="status" data-visible={feedback !== null}>
          {feedback ?? " "}
        </p>

        <button type="button" className={styles.reset} onClick={onReset}>
          Nueva transcripción
        </button>
      </aside>

      <section className={styles.panel}>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "transcript"}
            className={styles.tab}
            data-active={tab === "transcript"}
            onClick={() => setTab("transcript")}
          >
            Transcripción
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "translation"}
            className={styles.tab}
            data-active={tab === "translation"}
            onClick={() => setTab("translation")}
          >
            Traducción ({result.targetLanguage.toUpperCase()})
          </button>
        </div>

        {tab === "transcript" ? (
          <TranscriptViewer segments={segments} onSegmentClick={jumpToSegment} activeSequence={activeSequence} />
        ) : (
          <TranslationViewer segments={segments} onSegmentClick={jumpToSegment} activeSequence={activeSequence} />
        )}
      </section>
    </div>
  );
}
