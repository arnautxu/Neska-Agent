import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { ActivityPreview } from "./preview";
export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <ActivityPreview />;
}
