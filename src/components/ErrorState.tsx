import type { ErrorCode } from "../types/api";
import styles from "./ErrorState.module.css";

interface ErrorInfo {
  title: string;
  description: string;
  action: string;
  tone: "danger" | "warning" | "accent";
}

const ERROR_INFO: Record<ErrorCode, ErrorInfo> = {
  INVALID_REQUEST: {
    title: "URL no válida",
    description: "Revisa que sea un enlace de un vídeo de YouTube.",
    action: "Corregir URL",
    tone: "danger",
  },
  UNSUPPORTED_SOURCE: {
    title: "Este vídeo no se puede procesar",
    description: "Puede ser privado, estar en directo, durar muy poco, o no contener voz detectable.",
    action: "Probar con otro vídeo",
    tone: "warning",
  },
  VIDEO_TOO_LONG: {
    title: "Vídeo demasiado largo",
    description: "Este vídeo supera la duración máxima permitida.",
    action: "Elegir otro vídeo",
    tone: "warning",
  },
  RATE_LIMITED: {
    title: "Límite alcanzado",
    description: "Has alcanzado el uso disponible para esta sesión.",
    action: "Intentar más tarde",
    tone: "accent",
  },
  PROVIDER_UNAVAILABLE: {
    title: "Servicio no disponible",
    description: "Uno de los proveedores externos no está respondiendo ahora mismo.",
    action: "Reintentar",
    tone: "danger",
  },
  TRANSLATION_QUOTA_EXCEEDED: {
    title: "Cuota de traducción agotada",
    description:
      "Este demo usa un plan de traducción gratuito y compartido. Se ha agotado por este mes — vuelve a intentarlo más adelante.",
    action: "Entendido",
    tone: "warning",
  },
  INTERNAL_ERROR: {
    title: "Algo ha ido mal",
    description: "Ha ocurrido un error inesperado en el servidor.",
    action: "Reintentar",
    tone: "danger",
  },
};

interface ErrorStateProps {
  code: ErrorCode;
  onDismiss: () => void;
}

export default function ErrorState({ code, onDismiss }: ErrorStateProps) {
  const info = ERROR_INFO[code];

  return (
    <div className={styles.container} role="alert">
      <span className={styles.dot} data-tone={info.tone} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.title}>{info.title}</p>
        <p className={styles.description}>{info.description}</p>
      </div>
      <button type="button" className={styles.action} onClick={onDismiss}>
        {info.action}
      </button>
    </div>
  );
}
