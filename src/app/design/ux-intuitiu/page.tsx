import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { IntuitivePreview } from "./preview";
export default async function Page({ searchParams }: { searchParams: Promise<{ estat?: string }> }) {
  if (!designPreviewsEnabled()) notFound();
  return <IntuitivePreview estat={(await searchParams).estat ?? "inici"} />;
}
