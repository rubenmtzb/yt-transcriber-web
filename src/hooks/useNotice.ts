import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_DURATION_MS = 2000;

/**
 * A short-lived status message, of the "Enlace copiado" kind.
 *
 * Each new notice replaces the previous one's timer instead of starting a second alongside it:
 * otherwise the first message's countdown would clear the one that replaced it, blanking a notice
 * the reader has barely seen. The pending timer is also dropped when the view goes away.
 */
export function useNotice(): [string | null, (message: string) => void] {
  const [notice, setNotice] = useState<string | null>(null);
  const timeoutRef = useRef(0);

  const clear = useCallback(() => window.clearTimeout(timeoutRef.current), []);
  useEffect(() => clear, [clear]);

  const show = useCallback(
    (message: string) => {
      clear();
      setNotice(message);
      timeoutRef.current = window.setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    },
    [clear],
  );

  return [notice, show];
}
