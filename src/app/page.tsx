import { redirect } from "next/navigation";
import { getSession } from "@/auth/session";
import { BrainApp } from "@/components/brain-app";
import { baseBrainManifest } from "@/config/brain";
import { loadInstallationConfig } from "@/config/installation";
import {
  applyInstallationBranding,
  publicInstallationBranding,
} from "@/config/installation-branding";
import { getSeedManifest } from "@/config/tenants";
import { installationUiLocale } from "@/i18n/server";
import { loadWorkbench } from "@/workbench/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const installation = await loadInstallationConfig();
  const storedManifest = session.provider === "local"
    ? { ...baseBrainManifest, id: `aibrain-${installation.installationId}` }
    : getSeedManifest(session.tenant.id);
  if (!storedManifest) redirect("/login");

  const branded = applyInstallationBranding(storedManifest, installation);
  const manifest = { ...branded, identity: { ...branded.identity, language: await installationUiLocale() } };
  const branding = publicInstallationBranding(installation);
  const workbench = await loadWorkbench(session);

  return (
    <BrainApp
      branding={branding}
      manifest={manifest}
      session={session}
      initialWorkbench={workbench}
    />
  );
}
