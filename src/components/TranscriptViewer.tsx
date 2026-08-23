import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranscriptViewerProps {
  segments: SegmentDto[];
}

export default function TranscriptViewer({ segments }: TranscriptViewerProps) {
  return <SegmentList segments={segments} field="sourceText" searchPlaceholder="Buscar en el texto..." />;
}
