import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import styles from "./VideoPlayer.module.css";

export interface VideoPlayerHandle {
  seekTo: (startMs: number) => void;
}

interface VideoPlayerProps {
  videoId: string;
}

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

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

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({ videoId }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadIframeApi(() => {
      if (cancelled || !containerRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0 },
      });
    });

    return () => {
      cancelled = true;
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
    },
  }));

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.player} />
    </div>
  );
});

export default VideoPlayer;
