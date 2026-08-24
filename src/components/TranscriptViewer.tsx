import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranscriptViewerProps {
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
}

export default function TranscriptViewer({ segments, onSegmentClick }: TranscriptViewerProps) {
  return (
    <SegmentList
      segments={segments}
      field="sourceText"
      searchPlaceholder="Buscar en el texto..."
      onSegmentClick={onSegmentClick}
    />
  );
}
