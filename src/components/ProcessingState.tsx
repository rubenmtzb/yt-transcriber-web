import { useEffect, useState } from "react";
import styles from "./ProcessingState.module.css";

const STEPS = [
  "Validando URL",
  "Obteniendo información",
  "Transcribiendo audio",
  "Traduciendo contenido",
  "Preparando resultado",
];

const STEP_INTERVAL_MS = 1800;

export default function ProcessingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <ul className={styles.steps}>
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={styles.step}
            data-state={index < activeStep ? "done" : index === activeStep ? "active" : "pending"}
          >
            <span className={styles.dot} />
            {step}
          </li>
        ))}
      </ul>
      <p className={styles.note}>Puedes dejar la pestaña abierta. No guardamos el resultado de forma permanente.</p>
    </div>
  );
}
