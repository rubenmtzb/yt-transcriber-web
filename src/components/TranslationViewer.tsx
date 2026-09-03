import SegmentList, { type SegmentViewerProps } from "./SegmentList";

export default function TranslationViewer(props: SegmentViewerProps) {
  return <SegmentList {...props} mode="translated" searchPlaceholder="Buscar en la traducción..." />;
}
