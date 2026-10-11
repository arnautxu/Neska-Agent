"use client";
import { PreviewTheme } from "../preview-theme";
import { exampleTask } from "../tasca/preview";
import { TaskCycle } from "@/components/task-cycle";
import { useState } from "react";
export function MobilePreview() {
  const [pending, setPending] = useState(true);
  const message = { ...exampleTask, approvals: pending ? [{ id: "permission", kind: "connector" as const, threadId: "preview", turnId: "turn", itemId: "item", title: "Enviar un correu a Ferreteria Puig", detail: "Revisa el resum abans de permetre l’enviament.", status: "pending" as const }] : [] };
  return <PreviewTheme><main className="mx-auto flex min-h-[100dvh] max-w-[768px] flex-col px-6 pb-5"><header className="flex min-h-16 items-center justify-between text-sm"><span>← Comptabilitat 2026</span><span>···</span></header><p className="mb-8 text-xs text-[var(--text-secondary)]">Maqueta · dades fictícies</p><h1 className="mb-6 text-[22px] font-medium">Conciliació de factures octubre</h1><TaskCycle message={message} threadId="preview" onResolveApproval={() => setPending(false)} /><div className="mt-auto border border-[var(--border)] p-4 text-[var(--text-secondary)]">Afegeix context…</div></main></PreviewTheme>;
}
