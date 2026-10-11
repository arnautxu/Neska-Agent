import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { TokenPreview } from "./preview";
export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <TokenPreview />;
}
