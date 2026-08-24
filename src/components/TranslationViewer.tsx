import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranslationViewerProps {
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
}

export default function TranslationViewer({ segments, onSegmentClick }: TranslationViewerProps) {
  return (
    <SegmentList
      segments={segments}
      field="translatedText"
      searchPlaceholder="Buscar en la traducción..."
      onSegmentClick={onSegmentClick}
    />
  );
}
