"use client";
import { useSyncExternalStore } from "react";
import { useUiText } from "@/i18n/provider";
import type { TaskCenterItem } from "@/task-center/contracts";
export function NeskaHomeHeader({ userName, tasks, onOpenInbox }: { userName: string; tasks: readonly TaskCenterItem[]; onOpenInbox?: () => void }) {
  const t = useUiText();
  const hour = useSyncExternalStore(subscribeClock, () => new Date().getHours(), () => -1);
  const greeting = hour < 0 ? "Hola, {name}" : hour < 12 ? "Bon dia, {name}" : hour < 19 ? "Bona tarda, {name}" : "Bon vespre, {name}";
  const running = tasks.filter(task => task.status === "running" && task.queue?.state !== "waiting").length;
  const pending = tasks.filter(task => task.status === "needs_attention").length;
  const name = userName.trim().split(/\s+/)[0];
  return <div className="neska-home-header mb-8 text-left"><h1 className="text-[30px] font-medium leading-tight tracking-[-.01em] max-sm:text-[26px]">{t(greeting, { name })}</h1>
    {running || pending ? <p className="mt-4 text-[15px] text-[var(--text-secondary)]">{t(running === 1 ? "1 tasca en curs" : "{running} tasques en curs", { running })}{pending ? <> · <button type="button" className="min-h-9 underline underline-offset-4" onClick={onOpenInbox}>{t(pending === 1 ? "1 t’espera" : "{pending} t’esperen", { pending })}</button></> : null}</p> : null}
  </div>;
}
export function NeskaCurrentTasks({ tasks, onOpenTask }: { tasks: readonly TaskCenterItem[]; onOpenTask?: (task: TaskCenterItem) => void }) {
  const t = useUiText();
  const visible = tasks.filter(task => task.status === "running" || task.status === "needs_attention" || task.planProposal?.status === "proposed");
  if (!visible.length) return null;
  return <section className="mt-10 pb-4" aria-label={t("Ara mateix")}><h2 className="neska-px mb-4 text-[11px] text-[var(--text-muted)]">{t("Ara mateix")}</h2>
    <ul>{visible.map(task => <li key={task.id} className="border-b border-[var(--border-subtle)]"><button type="button" className="flex min-h-14 w-full items-center gap-3 py-3 text-left disabled:cursor-default" disabled={!onOpenTask} onClick={() => onOpenTask?.(task)}>
      <span aria-hidden="true" className={`size-2 shrink-0 ${task.status === "running" && task.queue?.state !== "waiting" ? "neska-live bg-[var(--neska-accent)]" : "border border-[var(--text-secondary)]"}`} />
      <span className="min-w-0 flex-1 truncate text-[15px]">{task.threadTitle}</span>
      <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">{t(task.planProposal?.status === "proposed" ? "Pla proposat" : task.queue?.state === "waiting" ? "A la cua" : task.status === "needs_attention" ? "T’espera" : "En curs")}</span>
    </button></li>)}</ul>
  </section>;
}

function subscribeClock(callback: () => void) {
  const timer = setInterval(callback, 60 * 60 * 1000);
  window.addEventListener("focus", callback);
  return () => { clearInterval(timer); window.removeEventListener("focus", callback); };
}
