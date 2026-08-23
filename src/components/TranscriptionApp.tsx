import { useState } from "react";
import UrlForm from "./UrlForm";
import ProcessingState from "./ProcessingState";
import ErrorState from "./ErrorState";
import ResultView from "./ResultView";
import { createTranscription, ApiError } from "../services/api";
import type { ErrorCode, TranscriptionResponseDto } from "../types/api";
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

  async function handleSubmit(youtubeUrl: string, targetLanguage: string) {
    setPhase("processing");

    try {
      const response = await createTranscription({ youtubeUrl, targetLanguage });
      setResult(response);
      setPhase("success");
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
  }

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

      {phase !== "success" && <UrlForm onSubmit={handleSubmit} disabled={phase === "processing"} />}

      {phase === "processing" && <ProcessingState />}
      {phase === "error" && <ErrorState code={errorCode} onDismiss={reset} />}
      {phase === "success" && result && <ResultView result={result} onReset={reset} />}

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
