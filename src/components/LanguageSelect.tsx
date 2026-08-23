import type { ChangeEvent } from "react";
import styles from "./LanguageSelect.module.css";

export interface LanguageOption {
  code: string;
  label: string;
}

export const SUPPORTED_TARGET_LANGUAGES: LanguageOption[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
];

interface LanguageSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function LanguageSelect({ id, value, onChange, disabled = false }: LanguageSelectProps) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      aria-label="Idioma de traducción"
    >
      {SUPPORTED_TARGET_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
