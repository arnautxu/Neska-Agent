import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { IconsPreview } from "./preview";

export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <IconsPreview />;
}
