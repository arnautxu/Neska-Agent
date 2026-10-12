import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { ComposerAppPreview } from "./preview";
export default async function Page({ searchParams }: { searchParams: Promise<{ estat?: string }> }) {
  if (!designPreviewsEnabled()) notFound();
  return <ComposerAppPreview estat={(await searchParams).estat ?? "tasca"} />;
}
