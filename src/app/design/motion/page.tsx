import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { MotionPreview } from "./preview";

export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <MotionPreview />;
}
