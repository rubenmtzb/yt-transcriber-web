import SegmentList, { type SegmentViewerProps } from "./SegmentList";
import { useTranslations } from "../i18n/ui";

export default function TranslationViewer(props: SegmentViewerProps) {
  const t = useTranslations(props.lang);
  return <SegmentList {...props} mode="translated" searchPlaceholder={t("search.translation")} />;
}
