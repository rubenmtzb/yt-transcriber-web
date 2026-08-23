import type { SegmentDto } from "../types/api";
import SegmentList from "./SegmentList";

interface TranslationViewerProps {
  segments: SegmentDto[];
}

export default function TranslationViewer({ segments }: TranslationViewerProps) {
  return <SegmentList segments={segments} field="translatedText" searchPlaceholder="Buscar en la traducción..." />;
}
