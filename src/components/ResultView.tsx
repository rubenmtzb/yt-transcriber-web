import { useState } from "react";
import type { TranscriptionResponseDto } from "../types/api";
import TranscriptViewer from "./TranscriptViewer";
import TranslationViewer from "./TranslationViewer";
import { toPlainText, toSrt, downloadTextFile } from "../lib/segments";
import styles from "./ResultView.module.css";

interface ResultViewProps {
  result: TranscriptionResponseDto;
  onReset: () => void;
}

type Tab = "transcript" | "translation";

export default function ResultView({ result, onReset }: ResultViewProps) {
  const [tab, setTab] = useState<Tab>("transcript");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div>
          <p className={styles.eyebrow}>Vídeo</p>
          <h2 className={styles.title}>{result.video.title}</h2>
        </div>

        <div className={styles.actions}>
          <p className={styles.actionsLabel}>Acciones</p>
          <button type="button" onClick={() => copy(toPlainText(result.segments, "sourceText"), "Transcripción copiada")}>
            Copiar transcripción
          </button>
          <button type="button" onClick={() => copy(toPlainText(result.segments, "translatedText"), "Traducción copiada")}>
            Copiar traducción
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(toPlainText(result.segments, "translatedText"), "traduccion.txt")}
          >
            Descargar .txt
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(toSrt(result.segments, "translatedText"), "traduccion.srt")}
          >
            Descargar .srt
          </button>
        </div>

        <p className={styles.feedback} role="status" data-visible={feedback !== null}>
          {feedback ?? " "}
        </p>

        <button type="button" className={styles.reset} onClick={onReset}>
          Nueva transcripción
        </button>
      </aside>

      <section className={styles.panel}>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "transcript"}
            className={styles.tab}
            data-active={tab === "transcript"}
            onClick={() => setTab("transcript")}
          >
            Transcripción
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "translation"}
            className={styles.tab}
            data-active={tab === "translation"}
            onClick={() => setTab("translation")}
          >
            Traducción ({result.targetLanguage.toUpperCase()})
          </button>
        </div>

        {tab === "transcript" ? (
          <TranscriptViewer segments={result.segments} />
        ) : (
          <TranslationViewer segments={result.segments} />
        )}
      </section>
    </div>
  );
}
