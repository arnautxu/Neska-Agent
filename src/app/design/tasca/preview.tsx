"use client";
import { useState } from "react";
import type { ChatMessage } from "@/lib/chat-contract";
import { TaskCycle } from "@/components/task-cycle";
import { PreviewTheme } from "../preview-theme";
export const exampleTask: ChatMessage = {
  id: "10000000-0000-4000-8000-000000000001", role: "assistant", content: "", status: "streaming",
  createdAt: "2026-10-11T09:00:00.000Z", activity: [], artifacts: [], attachments: [], diff: "", approvals: [],
  plan: [
    { step: "Llegir les factures", status: "completed", tool: "Drive", startedAt: "2026-10-11T09:00:00.000Z", completedAt: "2026-10-11T09:00:41.000Z" },
    { step: "Normalitzar l’extracte", status: "completed", tool: "Banc" },
    { step: "Creuar imports i NIF", status: "in_progress", tool: "Excel", progress: { done: 29, total: 38 }, current: "F-2026-0932.pdf" },
    { step: "Generar l’informe", status: "pending" },
    { step: "Enviar correus", status: "pending", requiresApproval: true },
  ],
};
export function TaskPreview() {
  const [phase, setPhase] = useState("curs");
  const message: ChatMessage = phase === "permís" ? { ...exampleTask, approvals: [{ id: "permission", threadId: "preview", turnId: "turn", itemId: "item", kind: "connector", title: "Enviar un correu a Ferreteria Puig", detail: "La factura i el banc mostren imports diferents. Envia el resum revisat.", status: "pending", stepIndex: 4 }] }
    : phase === "incidència" ? { ...exampleTask, incidents: [{ id: "incident", stepIndex: 2, message: "No he pogut llegir una factura", detail: "El document està protegit.", status: "open", actions: ["retry", "skip"], timestamp: "2026-10-11T09:01:00.000Z" }] }
    : phase === "pla" ? { ...exampleTask, status: "complete", plan: exampleTask.plan.map(step => ({ step: step.step, status: "pending" })), planProposal: { status: "proposed", revision: 1 } }
    : phase === "resultat" ? { ...exampleTask, status: "complete", plan: exampleTask.plan.map(step => ({ step: step.step, status: "completed" })) } : exampleTask;
  return <PreviewTheme><main className="mx-auto max-w-[768px] px-6 py-12">
    <p className="mb-6 text-xs text-[var(--text-secondary)]">Maqueta · dades fictícies</p>
    <nav className="mb-12 flex flex-wrap gap-4" aria-label="Fase de la maqueta">{["curs", "permís", "incidència", "pla", "resultat"].map(value => <button key={value} type="button" aria-pressed={phase === value} onClick={() => setPhase(value)} className="min-h-11 text-sm underline underline-offset-4">{value}</button>)}</nav>
    <h1 className="mb-8 text-[30px] font-medium">Conciliació de factures octubre</h1>
    <TaskCycle message={message} threadId="preview" onResolveApproval={() => setPhase("curs")} onMessageChange={() => {}} onExecutePlan={() => setPhase("curs")} onMutate={async () => message} />
    {phase === "resultat" ? <><p className="mt-8 text-lg">He conciliat les factures i he preparat l’informe.</p><div className="mt-6 border-b border-[var(--border-subtle)] py-4 font-mono text-sm">conciliacio-octubre.xlsx</div></> : null}
  </main></PreviewTheme>;
}
