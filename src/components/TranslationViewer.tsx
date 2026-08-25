import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranslationViewerProps {
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
  activeSequence?: number | null;
  loopSequence?: number | null;
  onToggleLoop?: (segment: SegmentDto) => void;
  onCopyLink?: (segment: SegmentDto) => void;
  onShareQuote?: (segment: SegmentDto) => void;
}

export default function TranslationViewer(props: TranslationViewerProps) {
  return <SegmentList {...props} mode="translated" searchPlaceholder="Buscar en la traducción..." />;
}
