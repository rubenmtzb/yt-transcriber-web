import { useEffect, useState } from "react";
import type { ProcessingStage } from "../types/api";
import styles from "./ProcessingState.module.css";

const STEPS: { stage: ProcessingStage; label: string }[] = [
  { stage: "VALIDATING_URL", label: "Validando URL" },
  { stage: "RESOLVING_VIDEO", label: "Obteniendo información" },
  { stage: "TRANSCRIBING", label: "Transcribiendo audio" },
  { stage: "TRANSLATING", label: "Traduciendo contenido" },
  { stage: "PREPARING_RESULT", label: "Preparando resultado" },
];

// Reached only when the video has no captions at all and the audio has to go through Whisper,
// which is minutes of work rather than seconds -- worth saying so instead of letting a silent
// list look stuck.
const SLOW_STAGE: ProcessingStage = "TRANSCRIBING";

interface ProcessingStateProps {
  stage: ProcessingStage | null;
  onCancel?: () => void;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function ProcessingState({ stage, onCancel }: ProcessingStateProps) {
  const activeIndex = stage ? STEPS.findIndex((step) => step.stage === stage) : -1;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <ul className={styles.steps}>
        {STEPS.map((step, index) => (
          <li
            key={step.stage}
            className={styles.step}
            data-state={index < activeIndex ? "done" : index === activeIndex ? "active" : "pending"}
          >
            <span className={styles.dot} />
            <span className={styles.label}>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <span className={styles.elapsed}>{formatElapsed(elapsedSeconds)}</span>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>

      <p className={styles.note}>
        {stage === SLOW_STAGE
          ? "Este vídeo no trae subtítulos, así que estamos escuchando el audio entero. Puede tardar varios minutos."
          : "Puedes dejar la pestaña abierta. No guardamos el resultado de forma permanente."}
      </p>
    </div>
  );
}
