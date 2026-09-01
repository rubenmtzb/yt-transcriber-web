import { useCallback, useEffect, useRef, useState } from "react";
import UrlForm from "./UrlForm";
import ProcessingState from "./ProcessingState";
import ErrorState from "./ErrorState";
import ResultView from "./ResultView";
import RecentHistory from "./RecentHistory";
import UsagePanel from "./UsagePanel";
import { createTranscriptionStream, fetchUsage, ApiError } from "../services/api";
import {
  getHistory,
  saveToHistory,
  clearHistory,
  findInHistory,
  rememberPosition,
  type HistoryEntry,
} from "../lib/history";
import { decodeResultFromHash } from "../lib/share";
import type { ErrorCode, ProcessingStage, TranscriptionResponseDto, UsageSnapshotDto } from "../types/api";
import styles from "./TranscriptionApp.module.css";

type Phase = "idle" | "processing" | "success" | "error";

// "Sin historial" used to be one of these, which stopped being true once RecentHistory started
// keeping results in localStorage. Where that history lives is now a claim of its own instead.
const TRUST_BADGES = [
  { title: "Sin registro", description: "No hace falta cuenta" },
  { title: "Sin base de datos", description: "El servidor no guarda nada" },
  { title: "Historial local", description: "Solo en este navegador" },
  { title: "Gratis", description: "Con límites de uso" },
];

export default function TranscriptionApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<TranscriptionResponseDto | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode>("INTERNAL_ERROR");
  const [stage, setStage] = useState<ProcessingStage | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prefill, setPrefill] = useState<{ url: string; lang: string } | null>(null);
  const [initialSeekMs, setInitialSeekMs] = useState<number | undefined>(undefined);
  const [usage, setUsage] = useState<UsageSnapshotDto | null>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  // Mirrors `result` for callbacks that fire outside render: a state updater must stay pure, so
  // it is not the place to reach for the current value and write to storage from.
  const resultRef = useRef<TranscriptionResponseDto | null>(null);
  resultRef.current = result;

  const refreshUsage = useCallback(() => {
    fetchUsage().then(setUsage);
  }, []);

  function handleSubmit(youtubeUrl: string, targetLanguage: string) {
    closeStreamRef.current?.();
    setPhase("processing");
    setStage("VALIDATING_URL");

    closeStreamRef.current = createTranscriptionStream(
      { youtubeUrl, targetLanguage },
      {
        onStage: setStage,
        onResult: (response) => {
          setResult(response);
          setPhase("success");
          saveToHistory(response);
          setHistory(getHistory());
          refreshUsage();
        },
        onError: (err) => {
          setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
          setPhase("error");
          refreshUsage();
        },
      },
    );
  }

  function reset() {
    closeStreamRef.current?.();
    setPhase("idle");
    setResult(null);
    setStage(null);
    setInitialSeekMs(undefined);
    // Re-read rather than reuse the state: playback has been writing resume positions to storage
    // since this list was last loaded, and the cards are where those show up.
    setHistory(getHistory());
  }

  // Closing the stream only stops us listening: the request the server already started keeps
  // running to completion (a subprocess mid-flight can't be cancelled cheaply), so the attempt
  // stays spent. Refreshing the budget afterwards is what keeps the counter honest about that.
  function cancelProcessing() {
    reset();
    refreshUsage();
  }

  function loadFromHistory(entry: HistoryEntry) {
    closeStreamRef.current?.();
    setInitialSeekMs(entry.positionMs);
    setResult(entry.result);
    setPhase("success");
  }

  const handlePositionChange = useCallback((positionMs: number) => {
    const current = resultRef.current;
    if (current) {
      rememberPosition(current.video.id, positionMs, current.video.durationSeconds);
    }
  }, []);

  function clearHistoryEntries() {
    clearHistory();
    setHistory([]);
  }

  // Opening a shared link, cheapest source first. The transcript can come from three places and
  // only the last one costs anything: the link's own payload (see lib/share), this browser's
  // history, or -- failing both -- a fresh run that spends one of the few hourly attempts.
  useEffect(() => {
    setHistory(getHistory());
    refreshUsage();

    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v");
    if (!videoId) {
      return;
    }
    const lang = params.get("lang") ?? "es";
    const seekSeconds = Number(params.get("t"));
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    setPrefill({ url, lang });
    if (Number.isFinite(seekSeconds) && seekSeconds > 0) {
      setInitialSeekMs(seekSeconds * 1000);
    }

    let cancelled = false;
    decodeResultFromHash(window.location.hash).then((shared) => {
      if (cancelled) {
        return;
      }
      const cached = shared ?? findInHistory(videoId, lang);
      if (cached) {
        setResult(cached);
        setPhase("success");
        return;
      }
      handleSubmit(url, lang);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.container} data-phase={phase}>
      {phase === "idle" && (
        <>
          <h1 className={styles.headline}>
            Transcribe y traduce <span className={styles.accent}>vídeos de YouTube</span>
          </h1>
          <p className={styles.subtext}>Texto limpio, traducción y resultado inmediato.</p>
        </>
      )}

      {phase !== "success" && (
        <UrlForm
          onSubmit={handleSubmit}
          disabled={phase === "processing"}
          initialUrl={prefill?.url}
          initialTargetLanguage={prefill?.lang}
        />
      )}

      {phase !== "success" && usage && <UsagePanel usage={usage} onExpired={refreshUsage} />}

      {phase === "idle" && <RecentHistory entries={history} onSelect={loadFromHistory} onClear={clearHistoryEntries} />}

      {phase === "processing" && <ProcessingState stage={stage} onCancel={cancelProcessing} />}
      {phase === "error" && <ErrorState code={errorCode} onDismiss={reset} />}
      {phase === "success" && result && (
        <ResultView
          result={result}
          onReset={reset}
          initialSeekMs={initialSeekMs}
          onPositionChange={handlePositionChange}
        />
      )}

      {phase === "idle" && (
        <ul className={styles.badges}>
          {TRUST_BADGES.map((badge) => (
            <li key={badge.title}>
              <strong>{badge.title}</strong>
              <span>{badge.description}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
