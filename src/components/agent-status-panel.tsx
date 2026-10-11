"use client";
import { useEffect, useState } from "react";
import { useUiLocale, useUiText } from "@/i18n/provider";
import { X } from "@phosphor-icons/react";
import type { ChatMessage } from "@/lib/chat-contract";
import type { TaskProgress, TaskState } from "@/ui/task-progress";
import { publicActivityRow } from "@/ui/public-activity-row";
import { useModalFocus } from "@/ui/use-modal-focus";
const STATE_LABEL: Record<TaskState, string> = { working: "En curs", waiting: "T’espera", done: "Feta", stopped: "Aturada", failed: "Ha fallat", proposed: "Pla proposat", queued: "A la cua" };
export function taskStateLabel(state: TaskState) { return STATE_LABEL[state]; }
export function AgentStatusPanel({ message, closeButtonRef, onClose }: {
  progress: TaskProgress; message: ChatMessage; request: ChatMessage | undefined;
  closeButtonRef?: React.Ref<HTMLButtonElement>; onClose: () => void;
}) {
  const t = useUiText(); const locale = useUiLocale();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1279px)");
    const update = () => setCompact(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const panelRef = useModalFocus<HTMLElement>(compact, onClose);
  useEffect(() => {
    if (compact) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [compact, onClose]);
  const rows = message.activity.flatMap(item => { const row = publicActivityRow(item); return row ? [row] : []; });
  return <>
    {compact ? <button type="button" aria-label={t("Tanca l’activitat")} className="activity-backdrop fixed inset-0 z-40 bg-black/30" onClick={onClose} /> : null}
    <aside ref={panelRef} tabIndex={-1} id="neska-activity-panel" data-testid="agent-status-panel" role={compact ? "dialog" : "complementary"} aria-modal={compact || undefined} aria-label={t("Activitat")} className="agent-status-panel scrollbar-thin fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-[12px] border-t border-[var(--border)] bg-[var(--surface)] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 xl:absolute xl:inset-x-auto xl:inset-y-0 xl:right-0 xl:z-10 xl:max-h-none xl:w-[300px] xl:rounded-none xl:border-l xl:border-t-0 xl:px-5">
      <header className="mb-6 flex items-center justify-between"><h2 className="neska-px text-xs text-[var(--text-secondary)]">{t("Activitat")}</h2><button ref={closeButtonRef} type="button" aria-label={t("Tanca l’activitat")} className="grid size-11 place-items-center" onClick={onClose}><X size={16} /></button></header>
      {rows.length ? <ol className="space-y-5">{rows.map(row => <li key={row.id} className="text-[13px] leading-5">
        <div className="flex items-baseline gap-3">{row.timestamp ? <time dateTime={row.timestamp} className="shrink-0 font-mono text-[11px] text-[var(--text-muted)]">{new Date(row.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</time> : null}<span className="font-medium">{row.failed ? <X size={12} className="mr-1 inline" aria-label={t("Ha fallat")} /> : null}{t(row.verb)}</span></div>
        {row.object ? <p className="mt-1 break-all font-mono text-[12px]">{row.object}</p> : null}
        {row.detail ? <p className="mt-1 text-[var(--text-secondary)]">{row.translateDetail ? t(row.detail) : row.detail}</p> : null}
      </li>)}</ol> : <p className="text-sm text-[var(--text-secondary)]">{t("Encara no hi ha activitat publicada.")}</p>}
    </aside>
  </>;
}
export function TaskStatusChip({ progress }: { progress: TaskProgress }) {
  const t = useUiText();
  const count = progress.total ? progress.current >= 0 ? ` · ${t("Pas {current} de {total}", { current: progress.steps[progress.current].originalIndex + 1, total: progress.total })}` : ` · ${progress.done}/${progress.total}` : "";
  return <span data-testid="task-status-chip" role="status" className="inline-flex min-h-9 items-center gap-2 text-[11px] text-[var(--text-secondary)]">
    {progress.state === "failed" ? <X aria-hidden="true" size={12} /> : <span aria-hidden="true" className={`size-2 shrink-0 ${progress.state === "working" ? "neska-live bg-[var(--neska-accent)]" : progress.state === "done" ? "bg-[var(--text)]" : "border border-[var(--text-secondary)]"}`} />}
    <span className="neska-px">{t(taskStateLabel(progress.state))}{count}</span>
  </span>;
}
