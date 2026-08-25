import { useEffect, useRef, useState } from "react";
import UrlForm from "./UrlForm";
import ProcessingState from "./ProcessingState";
import ErrorState from "./ErrorState";
import ResultView from "./ResultView";
import RecentHistory from "./RecentHistory";
import { createTranscriptionStream, ApiError } from "../services/api";
import { getHistory, saveToHistory, clearHistory, type HistoryEntry } from "../lib/history";
import type { ErrorCode, ProcessingStage, TranscriptionResponseDto } from "../types/api";
import styles from "./TranscriptionApp.module.css";

type Phase = "idle" | "processing" | "success" | "error";

const TRUST_BADGES = [
  { title: "Sin registro", description: "No cuentas ni historial" },
  { title: "Sin almacenamiento", description: "Resultado directo" },
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
  const closeStreamRef = useRef<(() => void) | null>(null);

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
        },
        onError: (err) => {
          setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
          setPhase("error");
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
  }

  function loadFromHistory(cached: TranscriptionResponseDto) {
    closeStreamRef.current?.();
    setInitialSeekMs(undefined);
    setResult(cached);
    setPhase("success");
  }

  function clearHistoryEntries() {
    clearHistory();
    setHistory([]);
  }

  // Deep link support: a shared "?v=<videoId>&t=<seconds>&lang=<code>" URL (see the segment row's
  // "copiar enlace" action) re-runs the transcription automatically and seeks once it's ready --
  // there's no server-side result storage to link to directly.
  useEffect(() => {
    setHistory(getHistory());

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
    handleSubmit(url, lang);
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

      {phase === "idle" && <RecentHistory entries={history} onSelect={loadFromHistory} onClear={clearHistoryEntries} />}

      {phase === "processing" && <ProcessingState stage={stage} />}
      {phase === "error" && <ErrorState code={errorCode} onDismiss={reset} />}
      {phase === "success" && result && <ResultView result={result} onReset={reset} initialSeekMs={initialSeekMs} />}

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
