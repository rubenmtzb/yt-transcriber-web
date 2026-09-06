import { defaultLang, type Lang } from "./config";

/**
 * Every string a reader sees, in both languages.
 *
 * English is the source of truth: `es` is typed against its key set, so a key added on one side
 * and forgotten on the other is a type error rather than a word that silently shows up in the
 * wrong language halfway down a page.
 *
 * Placeholders are `{name}` and are filled by the second argument to `t`. They exist so a sentence
 * stays one sentence per language -- English and Spanish do not put a number, a unit and a noun in
 * the same order, and stitching fragments together in JSX produces the kind of sentence that reads
 * as though nobody ever said it aloud.
 */
const en = {
  "site.title": "YT Transcriber",
  "site.description":
    "Read any YouTube video as text. Transcript and translation, timed to the player. No account, nothing stored.",

  "nav.home": "YT Transcriber — home",
  "nav.howItWorks": "How it works",
  "nav.privacy": "Privacy",
  "nav.language": "Language",

  "hero.lead": "Read any",
  "hero.accent": "YouTube video",
  "hero.subtext": "Transcript, translation, and every line timed to the player.",

  "badge.noSignup.title": "No signup",
  "badge.noSignup.body": "No account needed",
  "badge.noDatabase.title": "No database",
  "badge.noDatabase.body": "The server keeps nothing",
  "badge.localHistory.title": "Local history",
  "badge.localHistory.body": "This browser only",
  "badge.free.title": "Free",
  "badge.free.body": "With usage limits",

  "form.placeholder": "Paste a YouTube URL here",
  "form.submit": "Transcribe",
  "form.submitting": "Working…",
  "form.translateTo": "Translate to",
  "form.invalidUrl": "Paste a link to a YouTube video.",
  "form.languageList": "Translation language",

  "stage.VALIDATING_URL": "Checking the URL",
  "stage.RESOLVING_VIDEO": "Fetching video details",
  "stage.TRANSCRIBING": "Transcribing the audio",
  "stage.TRANSLATING": "Translating",
  "stage.PREPARING_RESULT": "Preparing the result",
  "processing.cancel": "Cancel",
  "processing.noteSlow":
    "This video has no captions, so we are listening to the whole audio. It can take several minutes.",
  "processing.note": "You can leave this tab open. Nothing is stored on the server.",

  "error.INVALID_REQUEST.title": "That URL will not work",
  "error.INVALID_REQUEST.body": "Check that it points to a YouTube video.",
  "error.INVALID_REQUEST.action": "Fix the URL",
  "error.UNSUPPORTED_SOURCE.title": "This video cannot be processed",
  "error.UNSUPPORTED_SOURCE.body": "It may be private, live, too short, or carry no detectable speech.",
  "error.UNSUPPORTED_SOURCE.action": "Try another video",
  "error.VIDEO_TOO_LONG.title": "Video too long",
  "error.VIDEO_TOO_LONG.body": "This video is longer than the maximum allowed.",
  "error.VIDEO_TOO_LONG.action": "Pick another video",
  "error.RATE_LIMITED.title": "Limit reached",
  "error.RATE_LIMITED.body": "You have used up what is available for this session.",
  "error.RATE_LIMITED.action": "Try later",
  "error.PROVIDER_UNAVAILABLE.title": "Service unavailable",
  "error.PROVIDER_UNAVAILABLE.body": "One of the external providers is not responding right now.",
  "error.PROVIDER_UNAVAILABLE.action": "Retry",
  "error.PROCESSING_TIMEOUT.title": "This took too long",
  "error.PROCESSING_TIMEOUT.body":
    "Processing hit its time limit. Try a shorter video, or come back in a little while.",
  "error.PROCESSING_TIMEOUT.action": "Back to the form",
  "error.TRANSLATION_QUOTA_EXCEEDED.title": "Translation quota used up",
  "error.TRANSLATION_QUOTA_EXCEEDED.body":
    "This demo runs on a free translation plan shared by everyone using it. It is spent for this month — try again later on.",
  "error.TRANSLATION_QUOTA_EXCEEDED.action": "Got it",
  "error.INTERNAL_ERROR.title": "Something went wrong",
  "error.INTERNAL_ERROR.body": "An unexpected error happened on the server.",
  "error.INTERNAL_ERROR.action": "Retry",

  "usage.panel": "Remaining usage",
  "usage.requests": "Transcriptions",
  "usage.requestsUnit": "this hour",
  "usage.audio": "Audio minutes",
  "usage.audioUnit": "min",
  "usage.remainingOf": "of {total} {unit}",
  "usage.meterLabel": "{remaining} of {total} {unit} left",
  "usage.idle": "Nothing used in the last hour",
  "usage.resets": "Back {when}",
  "usage.when.now": "now",
  "usage.when.seconds": "in {n} s",
  "usage.when.minutes": "in {n} min",
  "usage.when.hours": "in {h} h {m} min",
  "usage.exhausted": "You have used up this hour's allowance. Videos under Recent still open without spending any.",
  "usage.perVideo": "Up to {minutes} min per video.",
  "usage.rolling":
    "The limits cover the last hour, not the clock hour: each use frees itself exactly an hour after it was spent.",

  "history.recent": "Recent",
  "history.clear": "Clear history",
  "history.resume": "resume at {time}",
  "history.when.now": "just now",
  "history.when.minutes": "{n} min ago",
  "history.when.hours": "{n} h ago",
  "history.when.days": "{n} d ago",

  "result.videoEyebrow": "Video",
  "result.lines": "{count} lines",
  "result.source.MANUAL_CAPTIONS": "uploader's captions",
  "result.source.AUTOMATIC_CAPTIONS": "automatic captions",
  "result.source.SPEECH_TO_TEXT": "transcribed from audio",
  "result.source.unknown": "unknown source",
  "result.copy": "Copy",
  "result.transcript": "Transcript",
  "result.translation": "Translation",
  "result.transcriptCopied": "Transcript copied",
  "result.translationCopied": "Translation copied",
  "result.copyFailed": "Could not copy. Use the download instead.",
  "result.download": "Download",
  "result.format.txt": "Plain text, no timestamps",
  "result.format.srt": "SubRip subtitles",
  "result.format.vtt": "WebVTT subtitles, for web players",
  "result.format.md": "Markdown, every line linked to its moment",
  "result.shortcuts": "Shortcuts: space play · ← → skip 5s · ↑ ↓ line · M mute · L loop line",
  "result.newRun": "New transcription",
  "result.readingMode": "Reading mode",
  "result.exitReadingMode": "Leave reading mode",
  "result.play": "Play",
  "result.pause": "Pause",
  "result.linkCopied": "Link copied",
  "result.linkCopiedFree": "Link copied (opens without spending a run)",
  "result.imageSaved": "Image downloaded",
  "result.imageFailed": "Could not build the image",
  "result.sameLanguage":
    "This video is already in {language}, so nothing was translated. Pick a different target language to get one.",
  "result.tab.transcript": "Transcript",
  "result.tab.translation": "Translation ({code})",
  "result.tab.dual": "Dual view",
  "file.transcript": "transcript",
  "file.translation": "translation",
  "file.quote": "quote",

  "search.transcript": "Search the text…",
  "search.translation": "Search the translation…",
  "search.dual": "Search text or translation…",
  "search.empty": "No results for “{query}”.",
  "search.backToLine": "Back to the current line",

  "row.jumpTo": "Jump to {time}",
  "row.loop": "Loop this line",
  "row.copyLink": "Copy a link to this moment",
  "row.saveImage": "Download this line as an image",

  "player.progress": "Video progress",
  "player.speed": "Playback speed",
  "player.mute": "Mute",
  "player.unmute": "Unmute",

  "footer.notice":
    "A personal project with no funding behind it — hence the usage limits. Built to show how it works, not to run as a service at scale.",

  "howItWorks.title.lead": "How it",
  "howItWorks.title.accent": "works",
  "howItWorks.step1.title": "You paste the URL",
  "howItWorks.step1.body": "A public YouTube video, up to 20 minutes. You also pick the language to translate it into.",
  "howItWorks.step2.title": "We look for captions",
  "howItWorks.step2.body":
    "If the video already has captions we use those — the uploader's own, or YouTube's automatic ones, in the original language.",
  "howItWorks.step3.title": "If there are none, we listen",
  "howItWorks.step3.body":
    "When a video has no captions at all, we pull the audio and transcribe it with Whisper, which runs on the server's own machine.",
  "howItWorks.step4.title": "We translate, only if needed",
  "howItWorks.step4.body":
    "If the video is already in the language you asked for, nothing is translated and no quota is spent. Otherwise DeepL translates it.",
  "howItWorks.step5.title": "You read along with the video",
  "howItWorks.step5.body":
    "The result comes back timed: click any line to jump there, and the line being spoken lights up as it goes.",
  "howItWorks.storage.title": "Where it is kept",
  "howItWorks.storage.body":
    "On the server, nowhere: there is no database, and once the request is answered no copy of the text remains. What is kept is a history of the last 5 videos in <em>this</em> browser's local storage, with the full result inside, so you can reopen them without running anything again. It never leaves your machine, and the “Clear history” button on the home page removes it for good.",
  "howItWorks.limits.title": "Limits",
  "howItWorks.limits.1": "Videos up to 20 minutes.",
  "howItWorks.limits.2": "A limited number of transcriptions and audio minutes per session.",
  "howItWorks.limits.3":
    "Transcribing from audio takes longer than reading captions that already exist: it is a whole video going through Whisper.",
  "howItWorks.limits.4":
    "Translation uses DeepL's free plan, shared by everyone using this demo. If the monthly quota runs out, translation pauses until it renews.",

  "privacy.title": "Privacy",
  "privacy.p1":
    "YT Transcriber needs no signup and no account. We do not keep the video, the audio, the transcript or the translation once the response has reached your browser.",
  "privacy.p2":
    "There are no tracking cookies, or cookies of any other kind. To keep per-session usage in check and stop the service being abused, the backend issues an anonymous session identifier that your browser sends back with each request — it does not identify who you are, it only stops one session from taking more than its share.",
  "privacy.p3":
    "As with any web service, minimal technical records remain (the request's IP address, for one), used only to prevent abuse and never to build a profile.",

  "notFound.title": "This page does not exist",
  "notFound.description": "The page you are looking for is not here.",
  "notFound.lead": "The link may be mistyped, or the page may have moved.",
  "notFound.action": "Back to the home page",
} as const;

export type UiKey = keyof typeof en;

const es: Record<UiKey, string> = {
  "site.title": "YT Transcriber",
  "site.description":
    "Lee cualquier vídeo de YouTube como texto. Transcripción y traducción, sincronizadas con el reproductor. Sin registro y sin almacenamiento.",

  "nav.home": "YT Transcriber — inicio",
  "nav.howItWorks": "Cómo funciona",
  "nav.privacy": "Privacidad",
  "nav.language": "Idioma",

  "hero.lead": "Lee cualquier",
  "hero.accent": "vídeo de YouTube",
  "hero.subtext": "Transcripción, traducción y cada línea sincronizada con el reproductor.",

  "badge.noSignup.title": "Sin registro",
  "badge.noSignup.body": "No hace falta cuenta",
  "badge.noDatabase.title": "Sin base de datos",
  "badge.noDatabase.body": "El servidor no guarda nada",
  "badge.localHistory.title": "Historial local",
  "badge.localHistory.body": "Solo en este navegador",
  "badge.free.title": "Gratis",
  "badge.free.body": "Con límites de uso",

  "form.placeholder": "Pega aquí la URL de YouTube",
  "form.submit": "Transcribir",
  "form.submitting": "Procesando…",
  "form.translateTo": "Traducir a",
  "form.invalidUrl": "Pega un enlace a un vídeo de YouTube.",
  "form.languageList": "Idioma de traducción",

  "stage.VALIDATING_URL": "Validando URL",
  "stage.RESOLVING_VIDEO": "Obteniendo información",
  "stage.TRANSCRIBING": "Transcribiendo audio",
  "stage.TRANSLATING": "Traduciendo",
  "stage.PREPARING_RESULT": "Preparando resultado",
  "processing.cancel": "Cancelar",
  "processing.noteSlow":
    "Este vídeo no trae subtítulos, así que estamos escuchando el audio entero. Puede tardar varios minutos.",
  "processing.note": "Puedes dejar la pestaña abierta. No guardamos nada en el servidor.",

  "error.INVALID_REQUEST.title": "Esa URL no vale",
  "error.INVALID_REQUEST.body": "Revisa que apunte a un vídeo de YouTube.",
  "error.INVALID_REQUEST.action": "Corregir URL",
  "error.UNSUPPORTED_SOURCE.title": "Este vídeo no se puede procesar",
  "error.UNSUPPORTED_SOURCE.body": "Puede ser privado, estar en directo, durar muy poco, o no contener voz detectable.",
  "error.UNSUPPORTED_SOURCE.action": "Probar con otro vídeo",
  "error.VIDEO_TOO_LONG.title": "Vídeo demasiado largo",
  "error.VIDEO_TOO_LONG.body": "Este vídeo supera la duración máxima permitida.",
  "error.VIDEO_TOO_LONG.action": "Elegir otro vídeo",
  "error.RATE_LIMITED.title": "Límite alcanzado",
  "error.RATE_LIMITED.body": "Has agotado el uso disponible para esta sesión.",
  "error.RATE_LIMITED.action": "Intentar más tarde",
  "error.PROVIDER_UNAVAILABLE.title": "Servicio no disponible",
  "error.PROVIDER_UNAVAILABLE.body": "Uno de los proveedores externos no está respondiendo ahora mismo.",
  "error.PROVIDER_UNAVAILABLE.action": "Reintentar",
  "error.PROCESSING_TIMEOUT.title": "Ha tardado demasiado",
  "error.PROCESSING_TIMEOUT.body":
    "Se ha alcanzado el tiempo máximo de procesamiento. Prueba con un vídeo más corto, o vuelve dentro de un rato.",
  "error.PROCESSING_TIMEOUT.action": "Volver al formulario",
  "error.TRANSLATION_QUOTA_EXCEEDED.title": "Cuota de traducción agotada",
  "error.TRANSLATION_QUOTA_EXCEEDED.body":
    "Este demo usa un plan de traducción gratuito y compartido por todo el mundo que lo usa. Se ha agotado por este mes — vuelve a intentarlo más adelante.",
  "error.TRANSLATION_QUOTA_EXCEEDED.action": "Entendido",
  "error.INTERNAL_ERROR.title": "Algo ha ido mal",
  "error.INTERNAL_ERROR.body": "Ha ocurrido un error inesperado en el servidor.",
  "error.INTERNAL_ERROR.action": "Reintentar",

  "usage.panel": "Uso disponible",
  "usage.requests": "Transcripciones",
  "usage.requestsUnit": "esta hora",
  "usage.audio": "Minutos de audio",
  "usage.audioUnit": "min",
  "usage.remainingOf": "de {total} {unit}",
  "usage.meterLabel": "{remaining} de {total} {unit} disponibles",
  "usage.idle": "Sin consumo en la última hora",
  "usage.resets": "Se recupera {when}",
  "usage.when.now": "ya",
  "usage.when.seconds": "en {n} s",
  "usage.when.minutes": "en {n} min",
  "usage.when.hours": "en {h} h {m} min",
  "usage.exhausted": "Has agotado el cupo de esta hora. Los vídeos de Recientes siguen abriéndose sin gastar nada.",
  "usage.perVideo": "Máximo {minutes} min por vídeo.",
  "usage.rolling":
    "Los límites son de esta última hora, no del reloj: cada uso se libera solo a la hora exacta de haberse gastado.",

  "history.recent": "Recientes",
  "history.clear": "Borrar historial",
  "history.resume": "continúa en {time}",
  "history.when.now": "hace un momento",
  "history.when.minutes": "hace {n} min",
  "history.when.hours": "hace {n} h",
  "history.when.days": "hace {n} d",

  "result.videoEyebrow": "Vídeo",
  "result.lines": "{count} líneas",
  "result.source.MANUAL_CAPTIONS": "subtítulos del autor",
  "result.source.AUTOMATIC_CAPTIONS": "subtítulos automáticos",
  "result.source.SPEECH_TO_TEXT": "transcrito del audio",
  "result.source.unknown": "origen desconocido",
  "result.copy": "Copiar",
  "result.transcript": "Transcripción",
  "result.translation": "Traducción",
  "result.transcriptCopied": "Transcripción copiada",
  "result.translationCopied": "Traducción copiada",
  "result.copyFailed": "No se pudo copiar. Usa la descarga.",
  "result.download": "Descargar",
  "result.format.txt": "Texto plano, sin marcas de tiempo",
  "result.format.srt": "Subtítulos SubRip",
  "result.format.vtt": "Subtítulos WebVTT, para reproductores web",
  "result.format.md": "Markdown con cada línea enlazada a su momento",
  "result.shortcuts": "Atajos: espacio reproducir · ← → saltar 5s · ↑ ↓ línea · M silenciar · L repetir línea",
  "result.newRun": "Nueva transcripción",
  "result.readingMode": "Modo lectura",
  "result.exitReadingMode": "Salir del modo lectura",
  "result.play": "Reproducir",
  "result.pause": "Pausar",
  "result.linkCopied": "Enlace copiado",
  "result.linkCopiedFree": "Enlace copiado (abre sin gastar cupo)",
  "result.imageSaved": "Imagen descargada",
  "result.imageFailed": "No se pudo generar la imagen",
  "result.sameLanguage":
    "Este vídeo ya está en {language}, así que no se ha traducido nada. Elige otro idioma de destino si quieres una traducción.",
  "result.tab.transcript": "Transcripción",
  "result.tab.translation": "Traducción ({code})",
  "result.tab.dual": "Vista dual",
  "file.transcript": "transcripcion",
  "file.translation": "traduccion",
  "file.quote": "cita",

  "search.transcript": "Buscar en el texto…",
  "search.translation": "Buscar en la traducción…",
  "search.dual": "Buscar en el texto o la traducción…",
  "search.empty": "Sin resultados para «{query}».",
  "search.backToLine": "Volver a la línea actual",

  "row.jumpTo": "Saltar a {time}",
  "row.loop": "Repetir esta línea en bucle",
  "row.copyLink": "Copiar enlace a este momento",
  "row.saveImage": "Descargar esta línea como imagen",

  "player.progress": "Progreso del vídeo",
  "player.speed": "Velocidad de reproducción",
  "player.mute": "Silenciar",
  "player.unmute": "Activar sonido",

  "footer.notice":
    "Proyecto personal, sin financiación detrás — de ahí los límites de uso. Pensado para que veas cómo está construido, no como servicio de producción a gran escala.",

  "howItWorks.title.lead": "Cómo",
  "howItWorks.title.accent": "funciona",
  "howItWorks.step1.title": "Pegas la URL",
  "howItWorks.step1.body":
    "Un vídeo público de YouTube, de hasta 20 minutos. Eliges también a qué idioma quieres traducirlo.",
  "howItWorks.step2.title": "Buscamos subtítulos",
  "howItWorks.step2.body":
    "Si el vídeo ya trae subtítulos, usamos esos: son los del propio autor o los automáticos de YouTube, en su idioma original.",
  "howItWorks.step3.title": "Si no hay, lo escuchamos",
  "howItWorks.step3.body":
    "Cuando el vídeo no tiene ningún subtítulo, extraemos el audio y lo transcribimos con Whisper, que corre en la propia máquina del servidor.",
  "howItWorks.step4.title": "Traducimos, solo si hace falta",
  "howItWorks.step4.body":
    "Si el vídeo ya está en el idioma que has pedido, no se traduce nada ni se gasta cuota. Si no, lo traduce DeepL.",
  "howItWorks.step5.title": "Lo lees siguiendo el vídeo",
  "howItWorks.step5.body":
    "El resultado llega con marcas de tiempo: pulsa una línea para saltar ahí, y la que suena se va iluminando mientras avanza.",
  "howItWorks.storage.title": "Dónde se guarda",
  "howItWorks.storage.body":
    "En el servidor, en ningún sitio: no hay base de datos, y una vez respondida la petición no queda copia del texto. Lo que sí se guarda es un historial de los últimos 5 vídeos en el almacenamiento local de <em>este</em> navegador, con el resultado completo dentro, para que puedas volver a abrirlos sin repetir el proceso. Nunca sale de tu equipo, y el botón «Borrar historial» de la portada lo elimina del todo.",
  "howItWorks.limits.title": "Límites",
  "howItWorks.limits.1": "Vídeos de hasta 20 minutos.",
  "howItWorks.limits.2": "Un número limitado de transcripciones y de minutos de audio por sesión.",
  "howItWorks.limits.3":
    "La transcripción desde audio tarda más que leer unos subtítulos ya hechos: es un vídeo entero pasando por Whisper.",
  "howItWorks.limits.4":
    "La traducción usa el plan gratuito de DeepL, compartido por todas las personas que usan este demo. Si se agota la cuota mensual, la traducción se pausa hasta que se renueve.",

  "privacy.title": "Privacidad",
  "privacy.p1":
    "YT Transcriber no requiere registro ni cuenta. No guardamos el vídeo, el audio, la transcripción ni la traducción una vez que la respuesta llega a tu navegador.",
  "privacy.p2":
    "No usamos cookies de seguimiento ni de ningún otro tipo. Para controlar el uso por sesión y evitar abuso del servicio, el backend asigna un identificador de sesión anónimo que tu navegador reenvía en cada petición — no identifica quién eres, solo evita que una misma sesión abuse del servicio.",
  "privacy.p3":
    "Como en cualquier servicio web, quedan registros técnicos mínimos (por ejemplo, la IP de la petición) usados solo para prevenir abuso, nunca para construir un perfil.",

  "notFound.title": "Esta página no existe",
  "notFound.description": "La página que buscas no existe.",
  "notFound.lead": "Puede que el enlace esté mal escrito o que la página se haya movido.",
  "notFound.action": "Volver al inicio",
};

export const ui = { en, es } as const;

export type Translate = (key: UiKey, values?: Record<string, string | number>) => string;

/**
 * The translator for one language.
 *
 * Falls back to English for a key the other dictionary somehow lacks: a missing string should
 * degrade to a word in the wrong language, never to the key itself showing through in the UI.
 */
export function useTranslations(lang: Lang): Translate {
  return (key, values) => {
    const template = ui[lang][key] ?? ui[defaultLang][key];
    if (!values) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  };
}
