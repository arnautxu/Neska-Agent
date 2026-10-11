import { notFound } from "next/navigation";
import { designPreviewsEnabled } from "../previews";
import { HomePreview } from "./preview";
export default function Page() { if (!designPreviewsEnabled()) notFound(); return <HomePreview />; }
