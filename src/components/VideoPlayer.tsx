import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import styles from "./VideoPlayer.module.css";

export interface VideoPlayerHandle {
  seekTo: (startMs: number) => void;
}

interface VideoPlayerProps {
  videoId: string;
  /**
   * Called with the playback position while the video plays, so the caller can follow along.
   * Kept as a plain callback rather than lifted state so the player itself never re-renders on
   * a tick. Must be referentially stable (memoise it) or the polling loop restarts each render.
   */
  onTimeUpdate?: (currentMs: number) => void;
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const PLAYING: YT.PlayerState = 1;

// Four times a second: fast enough that a subtitle lights up on the beat, slow enough to stay
// far away from the main thread's budget. The API exposes no timeupdate event, so polling while
// playing is the only way to read the position.
const POLL_INTERVAL_MS = 250;

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

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { videoId, onTimeUpdate },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);

  // Read through a ref inside the polling loop so that passing a new callback never tears down
  // and rebuilds the player itself.
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    function stopPolling() {
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
    }

    function startPolling() {
      stopPolling();
      pollId = setInterval(() => {
        const player = playerRef.current;
        if (player) {
          onTimeUpdateRef.current?.(player.getCurrentTime() * 1000);
        }
      }, POLL_INTERVAL_MS);
    }

    loadIframeApi(() => {
      if (cancelled || !containerRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          // Poll only while the video is actually playing; pausing or ending stops the timer
          // rather than leaving it spinning in the background.
          onStateChange: (event) => {
            if (event.data === PLAYING) {
              startPolling();
            } else {
              stopPolling();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    seekTo(startMs: number) {
      const player = playerRef.current;
      if (!player) {
        return;
      }
      player.seekTo(startMs / 1000, true);
      player.playVideo();
      // Reflect the jump immediately: the poll only runs once playback reports as playing, so
      // without this the highlight would lag behind a click by up to a tick.
      onTimeUpdateRef.current?.(startMs);
    },
  }), []);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.player} />
    </div>
  );
});

export default VideoPlayer;
