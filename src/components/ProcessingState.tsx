import type { ProcessingStage } from "../types/api";
import styles from "./ProcessingState.module.css";

const STEPS: { stage: ProcessingStage; label: string }[] = [
  { stage: "VALIDATING_URL", label: "Validando URL" },
  { stage: "RESOLVING_VIDEO", label: "Obteniendo información" },
  { stage: "TRANSCRIBING", label: "Transcribiendo audio" },
  { stage: "TRANSLATING", label: "Traduciendo contenido" },
  { stage: "PREPARING_RESULT", label: "Preparando resultado" },
];

interface ProcessingStateProps {
  stage: ProcessingStage | null;
}

export default function ProcessingState({ stage }: ProcessingStateProps) {
  const activeIndex = stage ? STEPS.findIndex((step) => step.stage === stage) : -1;

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
            {step.label}
          </li>
        ))}
      </ul>
      <p className={styles.note}>Puedes dejar la pestaña abierta. No guardamos el resultado de forma permanente.</p>
    </div>
  );
}
