import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { TaskPreview } from "./preview";
export default function Page() {
  if (!designPreviewsEnabled()) notFound();
  return <TaskPreview />;
}
