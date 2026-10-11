"use client";
import { Check, X } from "@phosphor-icons/react";
import { useUiText } from "@/i18n/provider";
import type { TaskProgress } from "@/ui/task-progress";
import { publicActivityText } from "@/ui/public-activity";
export function stepDuration(start?: string, end?: string) {
  if (!start || !end) return null;
  const seconds = Math.floor((Date.parse(end) - Date.parse(start)) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : null;
}
export function TaskPlan({ progress }: { progress: TaskProgress }) {
  const t = useUiText();
  if (!progress.total) return null;
  return <section data-testid="task-plan" aria-label={t("Pla de la tasca")}>
    <ol className="border-t border-[var(--border-subtle)]">
      {progress.steps.map((step, index) => {
        const current = index === progress.current;
        const duration = stepDuration(step.startedAt, step.completedAt);
        const object = step.current ? publicActivityText(step.current, 240) : null;
        const tool = step.tool ? publicActivityText(step.tool, 100) : null;
        return <li key={index} aria-current={current ? "step" : undefined} data-step-status={step.status} className="flex gap-4 border-b border-[var(--border-subtle)] py-4 text-[15px]">
          <span className={`pt-0.5 font-mono text-xs ${current ? "text-[var(--neska-accent)]" : "text-[var(--text-muted)]"}`}>{String(step.originalIndex + 1).padStart(2, "0")}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3"><span className={`min-w-0 flex-1 ${step.status === "completed" || step.status === "skipped" ? "text-[var(--text-secondary)]" : "text-[var(--text)]"}`}>{step.step}</span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">{duration}{step.status === "completed" ? <Check aria-label={t("Completat")} size={13} /> : step.status === "failed" ? <X aria-label={t("Ha fallat")} size={13} /> : step.status === "skipped" ? t("Omès") : step.progress ? `${step.progress.done}/${step.progress.total}` : step.requiresApproval ? t("Permís") : null}</span>
            </div>
            {tool ? <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{tool}</p> : null}
            {current && object ? <p className="mt-1 break-all font-mono text-[13px] text-[var(--text-secondary)]">{object}<span aria-hidden="true" className="neska-cursor ml-1 inline-block h-3 w-1.5 bg-[var(--neska-accent)]" /></p> : null}
            {current && step.progress ? <div role="progressbar" aria-label={step.step} aria-valuenow={step.progress.done} aria-valuemax={step.progress.total} aria-valuemin={0} className="mt-3 h-0.5 bg-[var(--border-subtle)]"><div className="h-full bg-[var(--neska-accent)]" style={{ width: `${100 * step.progress.done / step.progress.total}%` }} /></div> : null}
          </div>
        </li>;
      })}
    </ol>
  </section>;
}
