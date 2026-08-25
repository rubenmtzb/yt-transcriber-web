import type { TranscriptionResponseDto } from "../types/api";
import type { HistoryEntry } from "../lib/history";
import { formatRelativeTime } from "../lib/history";
import { SUPPORTED_TARGET_LANGUAGES } from "./LanguageSelect";
import styles from "./RecentHistory.module.css";

interface RecentHistoryProps {
  entries: HistoryEntry[];
  onSelect: (result: TranscriptionResponseDto) => void;
  onClear: () => void;
}

function languageLabel(code: string): string {
  return SUPPORTED_TARGET_LANGUAGES.find((lang) => lang.code === code)?.label ?? code.toUpperCase();
}

export default function RecentHistory({ entries, onSelect, onClear }: RecentHistoryProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.label}>Recientes</p>
        <button type="button" className={styles.clear} onClick={onClear}>
          Borrar historial
        </button>
      </div>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.result.video.id}>
            <button type="button" className={styles.card} onClick={() => onSelect(entry.result)}>
              <img
                src={`https://i.ytimg.com/vi/${entry.result.video.id}/mqdefault.jpg`}
                alt=""
                className={styles.thumb}
                loading="lazy"
              />
              <span className={styles.cardBody}>
                <span className={styles.cardTitle}>{entry.result.video.title}</span>
                <span className={styles.cardMeta}>
                  {languageLabel(entry.result.targetLanguage)} · {formatRelativeTime(entry.savedAt)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
