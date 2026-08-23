import { useMemo, useState } from "react";
import type { SegmentDto } from "../types/api";
import { foldForSearch, formatTimestamp } from "../lib/segments";
import styles from "./SegmentList.module.css";

interface SegmentListProps {
  segments: SegmentDto[];
  field: "sourceText" | "translatedText";
  searchPlaceholder: string;
}

export default function SegmentList({ segments, field, searchPlaceholder }: SegmentListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = foldForSearch(query.trim());
    if (!normalized) {
      return segments;
    }
    return segments.filter((segment) => foldForSearch(segment[field]).includes(normalized));
  }, [segments, field, query]);

  return (
    <div className={styles.container}>
      <input
        type="search"
        className={styles.search}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={searchPlaceholder}
      />
      <ul className={styles.list}>
        {filtered.map((segment) => (
          <li key={segment.sequence} className={styles.row}>
            <span className={styles.timestamp}>{formatTimestamp(segment.startMs)}</span>
            <span className={styles.text}>{segment[field]}</span>
          </li>
        ))}
        {filtered.length === 0 && <li className={styles.empty}>Sin resultados para "{query}".</li>}
      </ul>
    </div>
  );
}
