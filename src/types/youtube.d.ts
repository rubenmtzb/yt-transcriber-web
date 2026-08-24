declare namespace YT {
  class Player {
    constructor(element: string | HTMLElement, options: PlayerOptions);
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    destroy(): void;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: Player }) => void;
    };
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
