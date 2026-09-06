import type { ErrorCode } from "../types/api";
import { useTranslations } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./ErrorState.module.css";

/**
 * How loudly each failure reads. The words live in the dictionary, keyed by the same code, so the
 * only thing that has to be stated per error here is the one part that isn't language: whether it
 * is the caller's mistake, a limit, or something broken.
 */
const ERROR_TONES: Record<ErrorCode, "danger" | "warning" | "accent"> = {
  INVALID_REQUEST: "danger",
  UNSUPPORTED_SOURCE: "warning",
  VIDEO_TOO_LONG: "warning",
  RATE_LIMITED: "accent",
  PROVIDER_UNAVAILABLE: "danger",
  TRANSLATION_QUOTA_EXCEEDED: "warning",
  INTERNAL_ERROR: "danger",
};

interface ErrorStateProps {
  lang: Lang;
  code: ErrorCode;
  onDismiss: () => void;
}

export default function ErrorState({ lang, code, onDismiss }: ErrorStateProps) {
  const t = useTranslations(lang);

  return (
    <div className={styles.container} role="alert">
      <span className={styles.dot} data-tone={ERROR_TONES[code]} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.title}>{t(`error.${code}.title`)}</p>
        <p className={styles.description}>{t(`error.${code}.body`)}</p>
      </div>
      <button type="button" className={styles.action} onClick={onDismiss}>
        {t(`error.${code}.action`)}
      </button>
    </div>
  );
}
