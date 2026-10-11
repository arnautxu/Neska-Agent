"use client";
import { useState } from "react";
import { PreviewTheme } from "../preview-theme";
import { exampleTask } from "../tasca/preview";
import { AgentStatusPanel, TaskStatusChip } from "@/components/agent-status-panel";
import { taskProgress } from "@/ui/task-progress";
const message = { ...exampleTask, activity: [
  { id: "read", kind: "file" as const, label: "Llegir factures", object: "factures-octubre", detail: "38 documents", status: "complete" as const, timestamp: "2026-10-11T09:00:41.000Z" },
  { id: "normalize", kind: "tool" as const, label: "Normalitzar", object: "extracte-octubre.csv", detail: "Imports normalitzats", status: "complete" as const, timestamp: "2026-10-11T09:00:53.000Z" },
  { id: "decision", kind: "decision" as const, label: "Comparar imports", criterion: "Coincidència d’import i NIF", object: "F-2026-0932.pdf", status: "complete" as const, timestamp: "2026-10-11T09:01:14.000Z" },
  { id: "private", kind: "reasoning" as const, label: "Raonament intern de prova", status: "complete" as const },
] };
export function ActivityPreview() {
  const [open, setOpen] = useState(false);
  return <PreviewTheme><main data-section="chat" className={`workbench-main relative min-h-screen ${open ? "xl:pr-[300px]" : ""}`}>
    <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4"><TaskStatusChip progress={taskProgress(message)} /><button type="button" aria-expanded={open} aria-controls="neska-activity-panel" className="min-h-11 px-3 text-sm" onClick={() => setOpen(!open)}>Activitat</button></header>
    <div className="mx-auto max-w-[720px] px-6 py-16"><p className="mb-6 text-xs text-[var(--text-secondary)]">Maqueta · dades fictícies</p><h1 className="text-3xl font-medium">Conciliació de factures octubre</h1><p className="mt-6 text-[var(--text-secondary)]">L’activitat s’obre només quan la demanes.</p></div>
    {open ? <AgentStatusPanel progress={taskProgress(message)} message={message} request={undefined} onClose={() => setOpen(false)} /> : null}
  </main></PreviewTheme>;
}
