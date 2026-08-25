import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface DualViewerProps {
  segments: SegmentDto[];
  onSegmentClick?: (segment: SegmentDto) => void;
  activeSequence?: number | null;
  loopSequence?: number | null;
  onToggleLoop?: (segment: SegmentDto) => void;
  onCopyLink?: (segment: SegmentDto) => void;
  onShareQuote?: (segment: SegmentDto) => void;
}

export default function DualViewer(props: DualViewerProps) {
  return <SegmentList {...props} mode="dual" searchPlaceholder="Buscar en el texto o la traducción..." />;
}
