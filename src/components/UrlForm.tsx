import { useState, type SubmitEvent } from "react";
import LanguageSelect from "./LanguageSelect";
import { useTranslations } from "../i18n/ui";
import type { Lang } from "../i18n/config";
import styles from "./UrlForm.module.css";

interface UrlFormProps {
  lang: Lang;
  onSubmit: (youtubeUrl: string, targetLanguage: string) => void;
  disabled?: boolean;
  initialUrl?: string;
  initialTargetLanguage?: string;
}

// Keep this in sync with TranscriptionRequestDto's @Pattern in the backend — deliberately
// permissive (scheme + host + non-empty path) since yt-dlp is the real authority on whether
// a URL actually resolves to a usable video.
const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com\/|youtu\.be\/).+$/;

export default function UrlForm({ lang, onSubmit, disabled = false, initialUrl = "", initialTargetLanguage = "es" }: UrlFormProps) {
  const t = useTranslations(lang);
  const [youtubeUrl, setYoutubeUrl] = useState(initialUrl);
  const [targetLanguage, setTargetLanguage] = useState(initialTargetLanguage);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    if (!YOUTUBE_URL_PATTERN.test(youtubeUrl.trim())) {
      setValidationError(t("form.invalidUrl"));
      return;
    }

    setValidationError(null);
    onSubmit(youtubeUrl.trim(), targetLanguage);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.inputRow}>
        <input
          type="url"
          name="youtubeUrl"
          className={styles.input}
          placeholder={t("form.placeholder")}
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          disabled={disabled}
          required
        />
        <button type="submit" className={styles.submit} disabled={disabled}>
          {disabled ? t("form.submitting") : t("form.submit")}
        </button>
      </div>

      <div className={styles.options}>
        <label className={styles.optionsLabel} id="targetLanguageLabel" htmlFor="targetLanguage">
          {t("form.translateTo")}
        </label>
        <LanguageSelect
          lang={lang}
          id="targetLanguage"
          labelId="targetLanguageLabel"
          value={targetLanguage}
          onChange={setTargetLanguage}
          disabled={disabled}
        />
      </div>

      {validationError && (
        <p className={styles.error} role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}
