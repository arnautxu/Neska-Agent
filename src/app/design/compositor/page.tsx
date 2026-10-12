import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { ComposerPreview } from "./preview";
export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <ComposerPreview />;
}
