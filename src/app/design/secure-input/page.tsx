import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { SecureInputPreview } from "./preview";

export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <SecureInputPreview />;
}
