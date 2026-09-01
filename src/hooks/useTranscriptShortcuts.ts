import { useEffect, type RefObject } from "react";
import type { SegmentDto } from "../types/api";
import type { VideoPlayerHandle } from "../components/VideoPlayer";

const SEEK_STEP_MS = 5000;

interface Options {
  player: RefObject<VideoPlayerHandle | null>;
  segments: SegmentDto[];
  activeSegment: SegmentDto | null;
  onJumpToSegment: (segment: SegmentDto) => void;
  onToggleLoop: (segment: SegmentDto) => void;
}

/** Typing in the search box or the URL field must not also drive the player. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Keyboard control of the transcript: play/pause, seek, move between lines, mute, loop a line.
 * Listens on the window rather than a container so the shortcuts work wherever focus happens to
 * be, which is the point of having them.
 */
export function useTranscriptShortcuts({
  player,
  segments,
  activeSegment,
  onJumpToSegment,
  onToggleLoop,
}: Options): void {
  useEffect(() => {
    function jumpBy(direction: 1 | -1) {
      if (segments.length === 0) {
        return;
      }
      const current = activeSegment
        ? segments.findIndex((segment) => segment.sequence === activeSegment.sequence)
        : -1;
      const next = Math.min(segments.length - 1, Math.max(0, current + direction));
      onJumpToSegment(segments[next]);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const controls = player.current;
      if (!controls || isTypingTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          controls.togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          controls.seekBy(-SEEK_STEP_MS);
          break;
        case "ArrowRight":
          event.preventDefault();
          controls.seekBy(SEEK_STEP_MS);
          break;
        case "ArrowUp":
          event.preventDefault();
          jumpBy(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          jumpBy(1);
          break;
        case "m":
        case "M":
          controls.toggleMute();
          break;
        case "l":
        case "L":
          if (activeSegment) {
            onToggleLoop(activeSegment);
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, segments, activeSegment, onJumpToSegment, onToggleLoop]);
}
