import SegmentList, { type SegmentViewerProps } from "./SegmentList";

export default function DualViewer(props: SegmentViewerProps) {
  return <SegmentList {...props} mode="dual" searchPlaceholder="Buscar en el texto o la traducción..." />;
}
