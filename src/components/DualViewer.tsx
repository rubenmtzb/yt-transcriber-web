import SegmentList, { type SegmentViewerProps } from "./SegmentList";
import { useTranslations } from "../i18n/ui";

export default function DualViewer(props: SegmentViewerProps) {
  const t = useTranslations(props.lang);
  return <SegmentList {...props} mode="dual" searchPlaceholder={t("search.dual")} />;
}
