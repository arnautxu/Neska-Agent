"use client";

import { ArchiveIcon } from "@/components/ui/archive";
import { AtSignIcon } from "@/components/ui/at-sign";
import { AttachFileIcon } from "@/components/ui/attach-file";
import { BellIcon } from "@/components/ui/bell";
import { BrainIcon } from "@/components/ui/brain";
import { ConnectIcon } from "@/components/ui/connect";
import { CopyIcon } from "@/components/ui/copy";
import { DeleteIcon } from "@/components/ui/delete";
import { DownloadIcon } from "@/components/ui/download";
import { ExpandIcon } from "@/components/ui/expand";
import { HistoryIcon } from "@/components/ui/history";
import { LogoutIcon } from "@/components/ui/logout";
import { MoonIcon } from "@/components/ui/moon";
import { PanelLeftCloseIcon } from "@/components/ui/panel-left-close";
import { PlusIcon } from "@/components/ui/plus";
import { RefreshCWIcon } from "@/components/ui/refresh-cw";
import { SearchIcon } from "@/components/ui/search";
import { SettingsIcon } from "@/components/ui/settings";
import { SquarePenIcon } from "@/components/ui/square-pen";
import { SunIcon } from "@/components/ui/sun";
import { TriggerIcon } from "@/components/ui/trigger-icon";
import { UploadIcon } from "@/components/ui/upload";

const ICONS = [
  ["Adjuntar", AttachFileIcon], ["Eines (@)", AtSignIcon], ["Esforç", BrainIcon], ["Connectors", ConnectIcon],
  ["Copiar", CopyIcon], ["Descarregar", DownloadIcon], ["Expandir", ExpandIcon], ["Cercar", SearchIcon],
  ["Nova", PlusIcon], ["Editar", SquarePenIcon], ["Configuració", SettingsIcon], ["Avisos", BellIcon],
  ["Arxivar", ArchiveIcon], ["Esborrar", DeleteIcon], ["Refrescar", RefreshCWIcon], ["Barra lateral", PanelLeftCloseIcon],
  ["Historial", HistoryIcon], ["Pujar", UploadIcon], ["Clar", SunIcon], ["Fosc", MoonIcon], ["Sortir", LogoutIcon],
] as const;

// Dev-only gallery: hover or tab through each button to see its icon animate.
export function IconsPreview() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[var(--text)]">
      <h1 className="text-2xl font-medium">Icones animades</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Passa per sobre o tabula pels botons.</p>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ICONS.map(([label, icon]) => (
          <button key={label} type="button" className="flex items-center gap-3 rounded-md border border-[var(--border)] px-3 py-2.5 text-sm hover:bg-[var(--surface-hover)]">
            <TriggerIcon icon={icon} size={17} />{label}
          </button>
        ))}
      </div>
    </main>
  );
}
