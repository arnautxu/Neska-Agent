import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { IntuitivePreview } from "./preview";
export default async function Page({ searchParams }: { searchParams: Promise<{ estat?: string; risc?: string }> }) {
  if (!designPreviewsEnabled()) notFound();
  const params = await searchParams;
  return <IntuitivePreview estat={params.estat ?? "inici"} risc={params.risc} />;
}
