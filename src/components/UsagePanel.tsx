import { useEffect, useState } from "react";
import type { UsageSnapshotDto } from "../types/api";
import { useTranslations, type Translate } from "../i18n/ui";
import { defaultLang, type Lang } from "../i18n/config";
import styles from "./UsagePanel.module.css";

interface UsagePanelProps {
  lang: Lang;
  usage: UsageSnapshotDto;
  /** Called when a countdown reaches zero, so the panel can replace its estimate with real data. */
  onExpired: () => void;
}

export function formatCountdown(seconds: number, t: Translate = useTranslations(defaultLang)): string {
  if (seconds <= 0) {
    return t("usage.when.now");
  }
  if (seconds < 60) {
    return t("usage.when.seconds", { n: seconds });
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60
    ? t("usage.when.minutes", { n: minutes })
    : t("usage.when.hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
}

function Meter({ t, label, used, total, unit, resetsIn }: {
  t: Translate;
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
          {remaining} <span className={styles.meterTotal}>{t("usage.remainingOf", { total, unit })}</span>
        </span>
      </div>
      <div className={styles.track} role="img" aria-label={t("usage.meterLabel", { remaining, total, unit })}>
        <span className={styles.fill} style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }} />
      </div>
      <p className={styles.reset}>
        {resetsIn === null ? t("usage.idle") : t("usage.resets", { when: formatCountdown(resetsIn, t) })}
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
export default function UsagePanel({ lang, usage, onExpired }: UsagePanelProps) {
  const t = useTranslations(lang);
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
    <section className={styles.panel} data-exhausted={exhausted} aria-label={t("usage.panel")}>
      <div className={styles.meters}>
        <Meter
          t={t}
          label={t("usage.requests")}
          used={usage.maxRequestsPerHour - usage.requestsRemaining}
          total={usage.maxRequestsPerHour}
          unit={t("usage.requestsUnit")}
          resetsIn={requestsResetIn}
        />
        <Meter
          t={t}
          label={t("usage.audio")}
          used={usage.maxAudioMinutesPerHour - usage.audioMinutesRemaining}
          total={usage.maxAudioMinutesPerHour}
          unit={t("usage.audioUnit")}
          resetsIn={audioResetIn}
        />
      </div>

      <p className={styles.note}>
        {exhausted
          ? t("usage.exhausted")
          : [
              usage.maxVideoDurationSeconds > 0 &&
                t("usage.perVideo", { minutes: Math.round(usage.maxVideoDurationSeconds / 60) }),
              t("usage.rolling"),
            ]
              .filter(Boolean)
              .join(" ")}
      </p>
    </section>
  );
}
