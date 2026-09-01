import SegmentList, { type SegmentViewerProps } from "./SegmentList";

export default function TranscriptViewer(props: SegmentViewerProps) {
  return <SegmentList {...props} mode="source" searchPlaceholder="Buscar en el texto..." />;
}
