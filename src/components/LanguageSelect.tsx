import { useEffect, useId, useRef, useState } from "react";
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
  /**
   * Id of the visible field label. A <label for> doesn't name a button the way it names an input,
   * so the pairing has to be spelled out here, or the control announces itself as just "Español".
   */
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5.5 5.5L20 7" />
    </svg>
  );
}

/**
 * A listbox rather than a native <select>: the browser draws a native dropdown with the operating
 * system's own colours, which can't be styled at all and landed as a bright grey panel in the
 * middle of this dark page.
 *
 * Follows the ARIA select-only combobox pattern -- focus stays on the trigger and the highlighted
 * option is pointed at with aria-activedescendant -- so keyboard and screen-reader behaviour
 * survives dropping the native control.
 */
export default function LanguageSelect({ id, labelId, value, onChange, disabled = false }: LanguageSelectProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listboxId = `${baseId}-listbox`;
  const valueId = `${baseId}-value`;
  const optionId = (code: string) => `${baseId}-option-${code}`;

  const selectedIndex = Math.max(
    0,
    SUPPORTED_TARGET_LANGUAGES.findIndex((lang) => lang.code === value),
  );
  const selected = SUPPORTED_TARGET_LANGUAGES[selectedIndex];

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openList(startIndex = selectedIndex) {
    if (disabled) {
      return;
    }
    setActiveIndex(startIndex);
    setOpen(true);
  }

  function closeList({ refocus = true } = {}) {
    setOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  }

  function pick(index: number) {
    onChange(SUPPORTED_TARGET_LANGUAGES[index].code);
    closeList();
  }

  // pointerdown, not click: closing on the press means a click that lands outside doesn't also
  // activate whatever was underneath after the list has already gone.
  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent) {
    const last = SUPPORTED_TARGET_LANGUAGES.length - 1;

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(last, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        pick(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "Tab":
        // Let focus leave normally, but don't leave the list hanging open behind it.
        setOpen(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        id={baseId}
        ref={triggerRef}
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? optionId(SUPPORTED_TARGET_LANGUAGES[activeIndex].code) : undefined}
        aria-labelledby={labelId ? `${labelId} ${valueId}` : valueId}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span id={valueId}>{selected.label}</span>
        <span className={styles.chevron} data-open={open}>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <ul className={styles.list} id={listboxId} role="listbox" aria-label="Idioma de traducción">
          {SUPPORTED_TARGET_LANGUAGES.map((lang, index) => (
            <li
              key={lang.code}
              id={optionId(lang.code)}
              className={styles.option}
              role="option"
              aria-selected={lang.code === value}
              data-active={index === activeIndex}
              style={{ "--index": index } as React.CSSProperties}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => pick(index)}
            >
              <span className={styles.check}>{lang.code === value && <CheckIcon />}</span>
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
