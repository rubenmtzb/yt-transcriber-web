import { useEffect, useState } from "react";
import type { ProcessingStage } from "../types/api";
import { useTranslations } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./ProcessingState.module.css";

// The order the backend reports them in. The label for each is looked up at render time, so the
// list stays a description of the pipeline rather than a second place strings have to be kept.
const STEPS: ProcessingStage[] = [
  "VALIDATING_URL",
  "RESOLVING_VIDEO",
  "TRANSCRIBING",
  "TRANSLATING",
  "PREPARING_RESULT",
];

// Reached only when the video has no captions at all and the audio has to go through Whisper,
// which is minutes of work rather than seconds -- worth saying so instead of letting a silent
// list look stuck.
const SLOW_STAGE: ProcessingStage = "TRANSCRIBING";

interface ProcessingStateProps {
  lang: Lang;
  stage: ProcessingStage | null;
  onCancel?: () => void;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function ProcessingState({ lang, stage, onCancel }: ProcessingStateProps) {
  const t = useTranslations(lang);
  const activeIndex = stage ? STEPS.indexOf(stage) : -1;
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
            key={step}
            className={styles.step}
            data-state={index < activeIndex ? "done" : index === activeIndex ? "active" : "pending"}
          >
            <span className={styles.dot} />
            <span className={styles.label}>{t(`stage.${step}`)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <span className={styles.elapsed}>{formatElapsed(elapsedSeconds)}</span>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {t("processing.cancel")}
          </button>
        )}
      </div>

      <p className={styles.note}>
        {stage === SLOW_STAGE ? t("processing.noteSlow") : t("processing.note")}
      </p>
    </div>
  );
}
