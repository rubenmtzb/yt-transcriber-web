import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SegmentDto, TranscriptionResponseDto } from "../types/api";
import TranscriptViewer from "./TranscriptViewer";
import TranslationViewer from "./TranslationViewer";
import DualViewer from "./DualViewer";
import VideoPlayer, { type VideoPlayerHandle } from "./VideoPlayer";
import { SUPPORTED_TARGET_LANGUAGES } from "./LanguageSelect";
import { toPlainText, toSrt, downloadTextFile, downloadBlob } from "../lib/segments";
import { renderQuoteCard, type QuoteCardMode } from "../lib/quoteCard";
import styles from "./ResultView.module.css";

interface ResultViewProps {
  result: TranscriptionResponseDto;
  onReset: () => void;
  initialSeekMs?: number;
}

type Tab = "transcript" | "translation" | "dual";

const SEEK_STEP_MS = 5000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export default function ResultView({ result, onReset, initialSeekMs }: ResultViewProps) {
  const [tab, setTab] = useState<Tab>("transcript");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(initialSeekMs ?? 0);
  const [loopSequence, setLoopSequence] = useState<number | null>(null);
  const playerRef = useRef<VideoPlayerHandle>(null);

  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  }

  function jumpToSegment(segment: SegmentDto) {
    playerRef.current?.seekTo(segment.startMs);
    setLoopSequence((prev) => (prev !== null && prev !== segment.sequence ? null : prev));
  }

  function toggleLoop(segment: SegmentDto) {
    setLoopSequence((prev) => (prev === segment.sequence ? null : segment.sequence));
  }

  function copyMomentLink(segment: SegmentDto) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("v", result.video.id);
    url.searchParams.set("t", String(Math.floor(segment.startMs / 1000)));
    url.searchParams.set("lang", result.targetLanguage);
    copy(url.toString(), "Enlace copiado");
  }

  async function shareQuote(segment: SegmentDto) {
    const mode: QuoteCardMode = tab === "translation" ? "translated" : tab === "dual" ? "dual" : "source";
    try {
      const blob = await renderQuoteCard({ segment, videoTitle: result.video.title, mode });
      downloadBlob(blob, `cita-${result.video.id}-${segment.sequence}.png`);
      setFeedback("Imagen descargada");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("No se pudo generar la imagen");
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  const handleTimeUpdate = useCallback((ms: number) => setCurrentMs(ms), []);

  // The backend already skips the actual translation call when the video is already in the
  // requested target language (see TranslationService) -- translatedText just echoes sourceText
  // in that case. This only tells the user why, it doesn't change what gets rendered.
  const isSameLanguage = result.sourceLanguage.toLowerCase() === result.targetLanguage.toLowerCase();
  const targetLanguageLabel =
    SUPPORTED_TARGET_LANGUAGES.find((lang) => lang.code === result.targetLanguage)?.label ??
    result.targetLanguage.toUpperCase();

  const activeSegment = useMemo<SegmentDto | null>(() => {
    let active: SegmentDto | null = null;
    for (const segment of result.segments) {
      if (segment.startMs > currentMs) {
        break;
      }
      active = segment;
    }
    return active;
  }, [result.segments, currentMs]);

  const loopSegment = useMemo(() => {
    if (loopSequence === null) {
      return null;
    }
    const segment = result.segments.find((candidate) => candidate.sequence === loopSequence);
    return segment ? { startMs: segment.startMs, endMs: segment.endMs } : null;
  }, [loopSequence, result.segments]);

  useEffect(() => {
    function jumpToAdjacentSegment(direction: 1 | -1) {
      const segments = result.segments;
      if (segments.length === 0) {
        return;
      }
      const currentIndex = activeSegment ? segments.findIndex((s) => s.sequence === activeSegment.sequence) : -1;
      const nextIndex = Math.min(segments.length - 1, Math.max(0, currentIndex + direction));
      jumpToSegment(segments[nextIndex]);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      const player = playerRef.current;
      if (!player) {
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          player.togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          player.seekBy(-SEEK_STEP_MS);
          break;
        case "ArrowRight":
          event.preventDefault();
          player.seekBy(SEEK_STEP_MS);
          break;
        case "ArrowUp":
          event.preventDefault();
          jumpToAdjacentSegment(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          jumpToAdjacentSegment(1);
          break;
        case "m":
        case "M":
          player.toggleMute();
          break;
        case "l":
        case "L":
          if (activeSegment) {
            toggleLoop(activeSegment);
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment, result.segments]);

  const sharedListProps = {
    segments: result.segments,
    onSegmentClick: jumpToSegment,
    activeSequence: activeSegment?.sequence ?? null,
    loopSequence,
    onToggleLoop: toggleLoop,
    onCopyLink: copyMomentLink,
    onShareQuote: shareQuote,
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <VideoPlayer
          videoId={result.video.id}
          ref={playerRef}
          onTimeUpdate={handleTimeUpdate}
          loopSegment={loopSegment}
          initialSeekMs={initialSeekMs}
        />

        <div>
          <p className={styles.eyebrow}>Vídeo</p>
          <h2 className={styles.title}>{result.video.title}</h2>
        </div>

        <div className={styles.actions}>
          <p className={styles.actionsLabel}>Acciones</p>
          <button type="button" onClick={() => copy(toPlainText(result.segments, "sourceText"), "Transcripción copiada")}>
            Copiar transcripción
          </button>
          <button type="button" onClick={() => copy(toPlainText(result.segments, "translatedText"), "Traducción copiada")}>
            Copiar traducción
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(toPlainText(result.segments, "translatedText"), "traduccion.txt")}
          >
            Descargar .txt
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(toSrt(result.segments, "translatedText"), "traduccion.srt")}
          >
            Descargar .srt
          </button>
        </div>

        <p className={styles.shortcuts}>
          Atajos: espacio reproducir · ← → saltar 5s · ↑ ↓ línea · M silenciar · L repetir línea
        </p>

        <p className={styles.feedback} role="status" data-visible={feedback !== null}>
          {feedback ?? " "}
        </p>

        <button type="button" className={styles.reset} onClick={onReset}>
          Nueva transcripción
        </button>
      </aside>

      <section className={styles.panel}>
        {isSameLanguage && (
          <p className={styles.sameLanguageNotice} role="status">
            Este vídeo ya está en {targetLanguageLabel} — no hay nada que traducir. Elige otro idioma de destino
            al iniciar una nueva transcripción para ver una traducción.
          </p>
        )}

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
          <button
            type="button"
            role="tab"
            aria-selected={tab === "dual"}
            className={styles.tab}
            data-active={tab === "dual"}
            onClick={() => setTab("dual")}
          >
            Vista dual
          </button>
        </div>

        {tab === "transcript" && <TranscriptViewer {...sharedListProps} />}
        {tab === "translation" && <TranslationViewer {...sharedListProps} />}
        {tab === "dual" && <DualViewer {...sharedListProps} />}
      </section>
    </div>
  );
}
