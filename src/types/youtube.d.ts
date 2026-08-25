// Minimal typings for the parts of the YouTube IFrame Player API this app actually uses.
// The full API is much larger; declaring only what we call keeps the contract honest and makes
// an accidental dependency on an untyped method a compile error rather than a runtime one.
declare namespace YT {
  /**
   * Playback state as reported by the player: -1 unstarted, 0 ended, 1 playing, 2 paused,
   * 3 buffering, 5 cued. Modelled as a union rather than a `const enum`, which `isolatedModules`
   * (Astro/esbuild) cannot inline.
   */
  type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

  class Player {
    constructor(element: string | HTMLElement, options: PlayerOptions);
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    /** Playback position in seconds, fractional. */
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    destroy(): void;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { target: Player; data: PlayerState }) => void;
    };
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
