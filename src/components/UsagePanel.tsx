import { useEffect, useState } from "react";
import type { UsageSnapshotDto } from "../types/api";
import styles from "./UsagePanel.module.css";

interface UsagePanelProps {
  usage: UsageSnapshotDto;
  /** Called when a countdown reaches zero, so the panel can replace its estimate with real data. */
  onExpired: () => void;
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) {
    return "ya";
  }
  if (seconds < 60) {
    return `en ${seconds} s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? `en ${minutes} min` : `en ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function Meter({ label, used, total, unit, resetsIn }: {
  label: string;
  used: number;
  total: number;
  unit: string;
  resetsIn: number | null;
}) {
  const remaining = total - used;
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue} data-empty={remaining <= 0}>
          {remaining} <span className={styles.meterTotal}>de {total} {unit}</span>
        </span>
      </div>
      <div className={styles.track} role="img" aria-label={`${remaining} de ${total} ${unit} disponibles`}>
        <span className={styles.fill} style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }} />
      </div>
      <p className={styles.reset}>
        {resetsIn === null
          ? "Sin consumo en la última hora"
          : `Se recupera ${formatCountdown(resetsIn)}`}
      </p>
    </div>
  );
}

/**
 * The session's remaining budget, with the countdown ticking locally between refreshes.
 *
 * The limits are rolling windows rather than a counter that empties on the hour, so "resets at"
 * is genuinely per-use: the seconds come from the server and are counted down here rather than
 * guessed, and hitting zero asks for fresh numbers instead of quietly assuming the slot came back.
 */
export default function UsagePanel({ usage, onExpired }: UsagePanelProps) {
  const [elapsed, setElapsed] = useState(0);

  // Restart the local clock whenever a new snapshot arrives, so the countdown is always measured
  // from the moment the server reported it.
  useEffect(() => setElapsed(0), [usage]);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = (seconds: number | null) => (seconds === null ? null : Math.max(0, seconds - elapsed));
  const requestsResetIn = countdown(usage.requestsResetInSeconds);
  const audioResetIn = countdown(usage.audioMinutesResetInSeconds);

  useEffect(() => {
    if (requestsResetIn === 0 || audioResetIn === 0) {
      onExpired();
    }
  }, [requestsResetIn, audioResetIn, onExpired]);

  const exhausted = usage.requestsRemaining <= 0 || usage.audioMinutesRemaining <= 0;

  return (
    <section className={styles.panel} data-exhausted={exhausted} aria-label="Uso disponible">
      <div className={styles.meters}>
        <Meter
          label="Transcripciones"
          used={usage.maxRequestsPerHour - usage.requestsRemaining}
          total={usage.maxRequestsPerHour}
          unit="esta hora"
          resetsIn={requestsResetIn}
        />
        <Meter
          label="Minutos de audio"
          used={usage.maxAudioMinutesPerHour - usage.audioMinutesRemaining}
          total={usage.maxAudioMinutesPerHour}
          unit="min"
          resetsIn={audioResetIn}
        />
      </div>

      <p className={styles.note}>
        {exhausted
          ? "Has agotado el cupo de esta hora. Los vídeos de Recientes siguen abriéndose sin gastar nada."
          : [
              usage.maxVideoDurationSeconds > 0 && `Máximo ${Math.round(usage.maxVideoDurationSeconds / 60)} min por vídeo.`,
              "Los límites son de esta última hora, no del reloj: cada uso se libera solo a la hora exacta de haberse gastado.",
            ]
              .filter(Boolean)
              .join(" ")}
      </p>
    </section>
  );
}
