import { notFound } from "next/navigation";
import { IconsPreview } from "./preview";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <IconsPreview />;
}
