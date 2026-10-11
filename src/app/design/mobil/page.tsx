import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { MobilePreview } from "./preview";
export default function Page() { if (!designPreviewsEnabled()) notFound(); return <MobilePreview />; }
