"use client";
import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useUiText } from "@/i18n/provider";
import type { ApprovalDecision, ApprovalItem, ChatMessage, TaskIncident } from "@/lib/chat-contract";
import { isChatMessage } from "@/lib/chat-contract";
import { publicActivityText } from "@/ui/public-activity";
import { taskProgress } from "@/ui/task-progress";
import { TaskPlan } from "./task-plan";
import { PermissionGrant } from "./assistant-ui/elements/permission-grant";

const button = "min-h-11 rounded-[2px] px-4 py-2 text-sm disabled:opacity-40";
export function TaskCycle({ message, threadId, readOnly = false, onResolveApproval, onMessageChange, onExecutePlan, onOpenReview, onMutate }: {
  message: ChatMessage; threadId: string; readOnly?: boolean;
  onResolveApproval: (approval: ApprovalItem, decision: ApprovalDecision) => void;
  onMessageChange?: (message: ChatMessage) => void;
  onExecutePlan?: (message: ChatMessage) => void;
  onOpenReview?: () => void;
  onMutate?: (url: string, body: object) => Promise<ChatMessage>;
}) {
  const t = useUiText();
  const progress = taskProgress(message);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = message.approvals.filter(approval => approval.status === "pending");
  const proposed = message.planProposal?.status === "proposed" && message.status === "complete";
  const mutate = async (url: string, body: object) => {
    setBusy(true); setError(null);
    try {
      if (onMutate) { const saved = await onMutate(url, body); onMessageChange?.(saved); setEditing(false); return; }
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !("message" in result) || !isChatMessage(result.message)) throw new Error(t("No s’ha pogut guardar el canvi. Torna a carregar la tasca."));
      onMessageChange?.(result.message); setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("No s’ha pogut guardar el canvi. Torna a carregar la tasca.")); }
    finally { setBusy(false); }
  };
  const act = (incident: TaskIncident, action: "retry" | "skip") => void mutate("/api/runtime/incidents", {
    threadId, assistantMessageId: message.id, incidentId: incident.id, action,
    clientRequestId: crypto.randomUUID(), userMessageId: crypto.randomUUID(),
  });
  return <div className="task-cycle space-y-6">
    {pending.map(approval => <PermissionGrant key={approval.id} approval={approval} readOnly={readOnly} connectorApproval={approval.kind === "connector"} onResolve={decision => onResolveApproval(approval, decision)} onOpenReview={message.diff ? onOpenReview : undefined} />)}
    {message.incidents?.filter(incident => incident.status !== "resolved").map(incident => {
      const label = publicActivityText(incident.message, 1000);
      const detail = incident.detail ? publicActivityText(incident.detail, 1000) : null;
      if (!label) return null;
      return <div key={incident.id} role="status" className="flex gap-3 py-3 text-[var(--text)]"><X size={16} className="mt-1 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="font-medium">{label}</p>{detail ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</p> : null}
        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{t("Pas {step}", { step: incident.stepIndex + 1 })}</p>
        {incident.status === "open" && !readOnly && onMessageChange ? <div className="mt-3 flex flex-wrap gap-2">{incident.actions.map(action => <button key={action} type="button" disabled={busy} className={`${button} border border-[var(--border)]`} onClick={() => act(incident, action)}>{t(action === "retry" ? "Torna-ho a provar" : "Omet aquest pas")}</button>)}</div> : incident.status !== "open" ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{t(incident.status === "retry_requested" ? "Reintent sol·licitat" : "Omissió sol·licitada")}</p> : null}
      </div></div>;
    })}
    {proposed ? <div><p className="neska-px mb-2 text-xs text-[var(--text-secondary)]">{t("Pla proposat")}</p><p className="text-sm text-[var(--text-secondary)]">{t("Revisa els passos abans d’executar-los.")}</p></div> : null}
    {editing ? <form onSubmit={event => { event.preventDefault(); void mutate("/api/runtime/plans", { action: "edit", threadId, assistantMessageId: message.id, revision: message.planProposal?.revision, steps: draft.split("\n").map(step => step.trim()).filter(Boolean) }); }}>
      <label className="block text-sm" htmlFor={`plan-${message.id}`}>{t("Un pas per línia")}</label>
      <textarea id={`plan-${message.id}`} rows={Math.max(3, message.plan.length)} value={draft} onChange={event => setDraft(event.target.value)} className="mt-2 w-full border border-[var(--border)] bg-[var(--surface)] p-3 text-[15px]" maxLength={100000} />
      <div className="mt-3 flex gap-2"><button type="submit" disabled={busy || !draft.trim()} className={`${button} bg-[var(--neska-accent)] text-white`}>{t("Desa el pla")}</button><button type="button" className={button} onClick={() => setEditing(false)}>{t("Cancel·la")}</button></div>
    </form> : progress.total ? pending.length || message.incidents?.some(incident => incident.status !== "resolved") || (message.status !== "streaming" && !proposed) ? <details><summary className="cursor-pointer py-2 text-sm text-[var(--text-secondary)]">{t("Veure els {total} passos", { total: progress.total })} · {progress.done}/{progress.total}</summary><TaskPlan progress={progress} /></details> : <TaskPlan progress={progress} /> : null}
    {proposed && !editing && !readOnly ? <div className="flex flex-wrap gap-2">
      {onExecutePlan ? <button type="button" disabled={busy} className={`${button} bg-[var(--neska-accent)] text-white`} onClick={() => onExecutePlan(message)}>{t("Executa el pla")}</button> : null}
      {onMessageChange ? <button type="button" className={`${button} border border-[var(--border)]`} onClick={() => { setDraft(message.plan.map(step => step.step).join("\n")); setEditing(true); }}>{t("Edita el pla")}</button> : null}
    </div> : null}
    {error ? <p role="alert" className="flex gap-2 text-sm"><X aria-hidden="true" size={16} />{error}</p> : null}
  </div>;
}
