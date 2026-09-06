import type { HistoryEntry } from "../lib/history";
import { formatRelativeTime } from "../lib/history";
import { formatTimestamp } from "../lib/segments";
import { SUPPORTED_TARGET_LANGUAGES } from "./LanguageSelect";
import { useTranslations } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./RecentHistory.module.css";

interface RecentHistoryProps {
  lang: Lang;
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function languageLabel(code: string): string {
  return SUPPORTED_TARGET_LANGUAGES.find((lang) => lang.code === code)?.label ?? code.toUpperCase();
}

export default function RecentHistory({ lang, entries, onSelect, onClear }: RecentHistoryProps) {
  const t = useTranslations(lang);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.label}>{t("history.recent")}</p>
        <button type="button" className={styles.clear} onClick={onClear}>
          {t("history.clear")}
        </button>
      </div>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.result.video.id}>
            <button type="button" className={styles.card} onClick={() => onSelect(entry)}>
              <img
                src={`https://i.ytimg.com/vi/${entry.result.video.id}/mqdefault.jpg`}
                alt=""
                className={styles.thumb}
                loading="lazy"
              />
              <span className={styles.cardBody}>
                <span className={styles.cardTitle}>{entry.result.video.title}</span>
                <span className={styles.cardMeta}>
                  {languageLabel(entry.result.targetLanguage)} · {formatRelativeTime(entry.savedAt, t)}
                  {entry.positionMs !== undefined && (
                    <span className={styles.resume}> · {t("history.resume", { time: formatTimestamp(entry.positionMs) })}</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
