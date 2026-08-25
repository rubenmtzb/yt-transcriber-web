import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { formatTimestamp } from "../lib/segments";
import styles from "./VideoPlayer.module.css";

export interface VideoPlayerHandle {
  seekTo: (startMs: number) => void;
  seekBy: (deltaMs: number) => void;
  togglePlay: () => void;
  toggleMute: () => void;
}

interface LoopSegment {
  startMs: number;
  endMs: number;
}

interface VideoPlayerProps {
  videoId: string;
  onTimeUpdate?: (currentMs: number) => void;
  loopSegment?: LoopSegment | null;
  initialSeekMs?: number;
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const POLL_INTERVAL_MS = 200;
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

// The official YouTube IFrame Player API -- a public script, no key, no login, unrelated to the
// Data API v3 that needed OAuth for caption downloads. Loaded lazily and once: multiple videos
// across the app's lifetime would otherwise each try to inject the script again.
function loadIframeApi(onReady: () => void) {
  if (window.YT?.Player) {
    onReady();
    return;
  }

  const previousCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previousCallback?.();
    onReady();
  };

  if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    document.head.appendChild(script);
  }
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M4 9v6h4l5 5V4L8 9H4Zm12.7-.7 1.4 1.4L16.4 12l1.7 1.7-1.4 1.4L15 13.4l-1.7 1.7-1.4-1.4L13.6 12l-1.7-1.7 1.4-1.4L15 10.6l1.7-1.7Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 5V4L8 9H4Zm11.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 15.5 12Zm-2.5-8.77v2.06a6.5 6.5 0 0 1 0 12.42v2.06a8.5 8.5 0 0 0 0-16.54Z" />
    </svg>
  );
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { videoId, onTimeUpdate, loopSegment, initialSeekMs },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const loopSegmentRef = useRef(loopSegment);
  loopSegmentRef.current = loopSegment;
  const initialSeekMsRef = useRef(initialSeekMs);
  initialSeekMsRef.current = initialSeekMs;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewMs, setSeekPreviewMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    let cancelled = false;

    loadIframeApi(() => {
      if (cancelled || !containerRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, controls: 0 },
        events: {
          onReady(event) {
            if (cancelled) {
              return;
            }
            setDurationMs(event.target.getDuration() * 1000);
            setIsMuted(event.target.isMuted());
            setIsReady(true);

            const seekMs = initialSeekMsRef.current;
            if (seekMs) {
              event.target.seekTo(seekMs / 1000, true);
              setCurrentMs(seekMs);
              onTimeUpdateRef.current?.(seekMs);
            }
          },
          onStateChange(event) {
            if (cancelled) {
              return;
            }
            setIsPlaying(event.data === window.YT!.PlayerState.PLAYING);
            if (event.data === window.YT!.PlayerState.ENDED) {
              setCurrentMs(event.target.getDuration() * 1000);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      let ms = player.getCurrentTime() * 1000;
      const loop = loopSegmentRef.current;
      if (loop && ms >= loop.endMs) {
        player.seekTo(loop.startMs / 1000, true);
        ms = loop.startMs;
      }
      setCurrentMs(ms);
      onTimeUpdateRef.current?.(ms);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  }

  useImperativeHandle(ref, () => ({
    seekTo(startMs: number) {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      player.seekTo(startMs / 1000, true);
      player.playVideo();
      setCurrentMs(startMs);
      onTimeUpdateRef.current?.(startMs);
    },
    seekBy(deltaMs: number) {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      const current = player.getCurrentTime() * 1000;
      const next = Math.max(0, Math.min(durationMs, current + deltaMs));
      player.seekTo(next / 1000, true);
      setCurrentMs(next);
      onTimeUpdateRef.current?.(next);
    },
    togglePlay,
    toggleMute,
  }));

  function handleSeekInput(event: React.InputEvent<HTMLInputElement>) {
    setIsSeeking(true);
    setSeekPreviewMs(Number(event.currentTarget.value));
  }

  function commitSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const player = playerRef.current;
    const ms = Number(event.target.value);
    player?.seekTo(ms / 1000, true);
    setCurrentMs(ms);
    onTimeUpdateRef.current?.(ms);
    setIsSeeking(false);
  }

  function cyclePlaybackRate() {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    const nextRate = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length];
    player.setPlaybackRate(nextRate);
    setPlaybackRate(nextRate);
  }

  const displayMs = isSeeking ? seekPreviewMs : currentMs;

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <div ref={containerRef} className={styles.player} />
      </div>

      <div className={styles.controls} data-disabled={!isReady}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={togglePlay}
          disabled={!isReady}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <input
          type="range"
          className={styles.progress}
          min={0}
          max={durationMs || 0}
          step={100}
          value={displayMs}
          onChange={commitSeek}
          onInput={handleSeekInput}
          disabled={!isReady}
          aria-label="Progreso del vídeo"
        />

        <span className={styles.time}>
          {formatTimestamp(displayMs)} / {formatTimestamp(durationMs)}
        </span>

        <button
          type="button"
          className={styles.speedButton}
          onClick={cyclePlaybackRate}
          disabled={!isReady}
          aria-label="Velocidad de reproducción"
          title="Velocidad de reproducción"
        >
          {playbackRate}x
        </button>

        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleMute}
          disabled={!isReady}
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        >
          <VolumeIcon muted={isMuted} />
        </button>
      </div>
    </div>
  );
});

export default VideoPlayer;
