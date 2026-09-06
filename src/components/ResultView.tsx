import { useCallback, useMemo, useRef, useState } from "react";
import type { SegmentDto, TranscriptionResponseDto, TranscriptSource, VideoDto } from "../types/api";
import TranscriptViewer from "./TranscriptViewer";
import TranslationViewer from "./TranslationViewer";
import DualViewer from "./DualViewer";
import VideoPlayer, { type VideoPlayerHandle } from "./VideoPlayer";
import { SUPPORTED_TARGET_LANGUAGES } from "./LanguageSelect";
import {
  toPlainText,
  toSrt,
  toVtt,
  toMarkdown,
  downloadTextFile,
  downloadBlob,
  formatTimestamp,
  type SegmentField,
} from "../lib/segments";
import { buildShareUrl } from "../lib/share";
import { renderQuoteCard, type QuoteCardMode } from "../lib/quoteCard";
import { useNotice } from "../hooks/useNotice";
import { useTranscriptShortcuts } from "../hooks/useTranscriptShortcuts";
import { useTranslations, type Translate } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./ResultView.module.css";

interface ResultViewProps {
  lang: Lang;
  result: TranscriptionResponseDto;
  onReset: () => void;
  initialSeekMs?: number;
  /** Reports playback position so it can be remembered; called at most once every few seconds. */
  onPositionChange?: (positionMs: number) => void;
}

type Tab = "transcript" | "translation" | "dual";

const POSITION_REPORT_INTERVAL_MS = 5000;

// Whisper can detect languages the translation dropdown doesn't offer, so an unknown code falls
// back to showing the code itself rather than nothing.
function languageLabel(code: string): string {
  return SUPPORTED_TARGET_LANGUAGES.find((lang) => lang.code === code)?.label ?? code.toUpperCase();
}

// One row of chips rather than six stacked links: they only differ by extension, and stacking
// them made the sidebar a wall of near-identical text.
const DOWNLOAD_FORMATS: {
  extension: "txt" | "srt" | "vtt" | "md";
  render: (segments: SegmentDto[], field: SegmentField, video: VideoDto) => string;
}[] = [
  { extension: "txt", render: (s, f) => toPlainText(s, f) },
  { extension: "srt", render: (s, f) => toSrt(s, f) },
  { extension: "vtt", render: (s, f) => toVtt(s, f) },
  { extension: "md", render: (s, f, video) => toMarkdown(s, f, video.id, video.title) },
];

// Where the text came from, named for a reader. Falls back rather than crashing on a source the
// backend gains before this list hears about it.
function transcriptSourceLabel(source: TranscriptSource | undefined, t: Translate): string {
  const known: TranscriptSource[] = ["MANUAL_CAPTIONS", "AUTOMATIC_CAPTIONS", "SPEECH_TO_TEXT"];
  return source && known.includes(source) ? t(`result.source.${source}`) : t("result.source.unknown");
}

export default function ResultView({ lang, result, onReset, initialSeekMs, onPositionChange }: ResultViewProps) {
  const t = useTranslations(lang);
  const [tab, setTab] = useState<Tab>("transcript");
  const [currentMs, setCurrentMs] = useState(initialSeekMs ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopSequence, setLoopSequence] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, notify] = useNotice();
  const playerRef = useRef<VideoPlayerHandle>(null);
  const lastReportedMsRef = useRef(0);
  // Read at click time rather than captured: the quote card renders whichever view is on screen,
  // and depending on the tab would give this handler a new identity every time it changed.
  const activeTabRef = useRef<Tab>("transcript");

  // These reach the transcript rows, which are memoised: a handler that changed identity on every
  // position tick would defeat that and re-render every line five times a second.
  const copy = useCallback(
    async (text: string, message: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify(message);
      } catch {
        // The Clipboard API rejects outside a secure context or when the user denies permission.
        // Downloading still works, so say so instead of failing silently.
        notify(t("result.copyFailed"));
      }
    },
    [notify, t],
  );

  const jumpToSegment = useCallback((segment: SegmentDto) => {
    playerRef.current?.seekTo(segment.startMs);
    setLoopSequence((prev) => (prev !== null && prev !== segment.sequence ? null : prev));
  }, []);

  const toggleLoop = useCallback((segment: SegmentDto) => {
    setLoopSequence((prev) => (prev === segment.sequence ? null : segment.sequence));
  }, []);

  // The transcript travels inside the link, so opening it costs the recipient nothing -- see
  // lib/share. Falls back to a plain by-id link when the result is too big to carry.
  const copyMomentLink = useCallback(
    async (segment: SegmentDto) => {
      const url = await buildShareUrl(window.location.href, result, Math.floor(segment.startMs / 1000));
      copy(url, t(url.includes("#") ? "result.linkCopiedFree" : "result.linkCopied"));
    },
    [result, copy, t],
  );

  const shareQuote = useCallback(
    async (segment: SegmentDto) => {
      const mode: QuoteCardMode =
        activeTabRef.current === "translation" ? "translated" : activeTabRef.current === "dual" ? "dual" : "source";
      try {
        const blob = await renderQuoteCard({ segment, videoTitle: result.video.title, mode });
        downloadBlob(blob, `${t("file.quote")}-${result.video.id}-${segment.sequence}.png`);
        notify(t("result.imageSaved"));
      } catch {
        notify(t("result.imageFailed"));
      }
    },
    [result, notify, t],
  );

  // Position is reported on a much coarser beat than it is polled: writing to localStorage five
  // times a second would be pointless churn for something only read when a video is reopened.
  const handleTimeUpdate = useCallback(
    (ms: number) => {
      setCurrentMs(ms);
      if (Math.abs(ms - lastReportedMsRef.current) >= POSITION_REPORT_INTERVAL_MS) {
        lastReportedMsRef.current = ms;
        onPositionChange?.(ms);
      }
    },
    [onPositionChange],
  );
  const getCurrentMs = useCallback(() => playerRef.current?.getCurrentMs() ?? 0, []);

  // The backend skips the DeepL call when the video is already in the requested target language
  // (see TranslationService) -- translatedText just echoes sourceText. Showing a "Traducción" tab
  // over that echo would claim a translation that never happened, so the whole translation side of
  // the UI is dropped instead of rendering a duplicate of the transcript.
  const isSameLanguage = result.sourceLanguage.toLowerCase() === result.targetLanguage.toLowerCase();
  const activeTab: Tab = isSameLanguage ? "transcript" : tab;
  activeTabRef.current = activeTab;
  const downloadField = isSameLanguage ? "sourceText" : "translatedText";
  const downloadName = t(isSameLanguage ? "file.transcript" : "file.translation");
  const targetLanguageLabel = languageLabel(result.targetLanguage);
  const sourceLanguageLabel = languageLabel(result.sourceLanguage);

  const activeSegment = useMemo<SegmentDto | null>(() => {
    let active: SegmentDto | null = null;
    for (const segment of result.segments) {
      if (segment.startMs > currentMs) {
        break;
      }
      active = segment;
    }
    return active;
  }, [result.segments, currentMs]);

  const loopSegment = useMemo(() => {
    if (loopSequence === null) {
      return null;
    }
    const segment = result.segments.find((candidate) => candidate.sequence === loopSequence);
    return segment ? { startMs: segment.startMs, endMs: segment.endMs } : null;
  }, [loopSequence, result.segments]);

  useTranscriptShortcuts({
    player: playerRef,
    segments: result.segments,
    activeSegment,
    onJumpToSegment: jumpToSegment,
    onToggleLoop: toggleLoop,
  });

  const sharedListProps = {
    lang,
    segments: result.segments,
    onSegmentClick: jumpToSegment,
    activeSequence: activeSegment?.sequence ?? null,
    loopSequence,
    onToggleLoop: toggleLoop,
    onCopyLink: copyMomentLink,
    onShareQuote: shareQuote,
    reading,
    currentMs,
    isPlaying,
    getCurrentMs,
  };

  return (
    /* Reading mode hides the sidebar with CSS rather than unmounting it: taking the player out of
       the tree would stop the audio, and following along by ear is the whole point of the mode. */
    <div className={styles.container} data-reading={reading}>
      <aside className={styles.sidebar}>
        <VideoPlayer
          lang={lang}
          videoId={result.video.id}
          ref={playerRef}
          onTimeUpdate={handleTimeUpdate}
          onPlayingChange={setIsPlaying}
          loopSegment={loopSegment}
          initialSeekMs={initialSeekMs}
        />

        <div>
          <p className={styles.eyebrow}>{t("result.videoEyebrow")}</p>
          <h2 className={styles.title}>{result.video.title}</h2>
          {/* Where the text came from isn't cosmetic: speech-to-text is our reading of the audio
              and gets names wrong in ways the uploader's own captions don't. */}
          <p className={styles.meta}>
            {t("result.lines", { count: result.segments.length })} · {sourceLanguageLabel}
            {result.source && ` · ${transcriptSourceLabel(result.source, t)}`}
          </p>
        </div>

        <div className={styles.actions}>
          <p className={styles.actionsLabel}>{t("result.copy")}</p>
          <div className={styles.actionRow}>
            <button type="button" className={styles.actionButton} onClick={() => copy(toPlainText(result.segments, "sourceText"), t("result.transcriptCopied"))}>
              {t("result.transcript")}
            </button>
            {!isSameLanguage && (
              <button type="button" className={styles.actionButton} onClick={() => copy(toPlainText(result.segments, "translatedText"), t("result.translationCopied"))}>
                {t("result.translation")}
              </button>
            )}
          </div>

          <p className={styles.actionsLabel}>{t("result.download")}</p>
          <div className={styles.actionRow}>
            {DOWNLOAD_FORMATS.map((format) => (
              <button
                key={format.extension}
                type="button"
                className={styles.formatButton}
                title={t(`result.format.${format.extension}`)}
                onClick={() =>
                  downloadTextFile(
                    format.render(result.segments, downloadField, result.video),
                    `${downloadName}.${format.extension}`,
                  )
                }
              >
                {format.extension}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.shortcuts}>
          {t("result.shortcuts")}
        </p>

        <p className={styles.feedback} role="status" data-visible={notice !== null}>
          {notice ?? " "}
        </p>

        <button type="button" className={styles.reset} onClick={onReset}>
          {t("result.newRun")}
        </button>
      </aside>

      <section className={styles.panel}>
        <button
          type="button"
          className={styles.readingToggle}
          onClick={() => setReading((value) => !value)}
          aria-pressed={reading}
        >
          {t(reading ? "result.exitReadingMode" : "result.readingMode")}
        </button>

        {reading && (
          /* The sidebar carries the transport, and reading mode hides it -- without this there is
             no way to pause but to leave the mode. */
          <div className={styles.readingTransport}>
            <button
              type="button"
              className={styles.readingPlay}
              onClick={() => playerRef.current?.togglePlay()}
              aria-label={t(isPlaying ? "result.pause" : "result.play")}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <span className={styles.readingTime}>{formatTimestamp(currentMs)}</span>
          </div>
        )}

        {isSameLanguage ? (
          <p className={styles.sameLanguageNotice} role="status">
            {t("result.sameLanguage", { language: targetLanguageLabel })}
          </p>
        ) : (
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "transcript"}
              className={styles.tab}
              data-active={activeTab === "transcript"}
              onClick={() => setTab("transcript")}
            >
              {t("result.tab.transcript")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "translation"}
              className={styles.tab}
              data-active={activeTab === "translation"}
              onClick={() => setTab("translation")}
            >
              {t("result.tab.translation", { code: result.targetLanguage.toUpperCase() })}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "dual"}
              className={styles.tab}
              data-active={activeTab === "dual"}
              onClick={() => setTab("dual")}
            >
              {t("result.tab.dual")}
            </button>
          </div>
        )}

        {activeTab === "transcript" && <TranscriptViewer {...sharedListProps} />}
        {activeTab === "translation" && <TranslationViewer {...sharedListProps} />}
        {activeTab === "dual" && <DualViewer {...sharedListProps} />}
      </section>
    </div>
  );
}
