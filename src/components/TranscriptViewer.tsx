import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranscriptViewerProps {
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
  activeSequence?: number | null;
}

export default function TranscriptViewer({ segments, onSegmentClick, activeSequence }: TranscriptViewerProps) {
  return (
    <SegmentList
      segments={segments}
      field="sourceText"
      searchPlaceholder="Buscar en el texto..."
      onSegmentClick={onSegmentClick}
      activeSequence={activeSequence}
    />
  );
}
