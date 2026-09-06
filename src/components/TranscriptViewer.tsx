import SegmentList, { type SegmentViewerProps } from "./SegmentList";
import { useTranslations } from "../i18n/ui";

export default function TranscriptViewer(props: SegmentViewerProps) {
  const t = useTranslations(props.lang);
  return <SegmentList {...props} mode="source" searchPlaceholder={t("search.transcript")} />;
}
