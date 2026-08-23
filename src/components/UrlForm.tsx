import { useState, type SubmitEvent } from "react";
import LanguageSelect from "./LanguageSelect";
import styles from "./UrlForm.module.css";

interface UrlFormProps {
  onSubmit: (youtubeUrl: string, targetLanguage: string) => void;
  disabled?: boolean;
}

// Keep this in sync with TranscriptionRequestDto's @Pattern in the backend — deliberately
// permissive (scheme + host + non-empty path) since yt-dlp is the real authority on whether
// a URL actually resolves to a usable video.
const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com\/|youtu\.be\/).+$/;

export default function UrlForm({ onSubmit, disabled = false }: UrlFormProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    if (!YOUTUBE_URL_PATTERN.test(youtubeUrl.trim())) {
      setValidationError("Pega una URL válida de un vídeo de YouTube.");
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
          placeholder="Pega aquí la URL de YouTube"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          disabled={disabled}
          required
        />
        <button type="submit" className={styles.submit} disabled={disabled}>
          {disabled ? "Procesando…" : "Transcribir"}
        </button>
      </div>

      <div className={styles.options}>
        <label className={styles.optionsLabel} htmlFor="targetLanguage">
          Traducir a
        </label>
        <LanguageSelect id="targetLanguage" value={targetLanguage} onChange={setTargetLanguage} disabled={disabled} />
      </div>

      {validationError && (
        <p className={styles.error} role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}
