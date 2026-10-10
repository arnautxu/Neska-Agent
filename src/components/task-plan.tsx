"use client";
import { useUiText } from "@/i18n/provider";

import { Check } from "@phosphor-icons/react";
import type { TaskProgress } from "@/ui/task-progress";

/** The live plan: every step stays visible and the current one is inverted,
 * so the employee can see where Neska is without opening the activity log. */
export function TaskPlan({ progress }: { progress: TaskProgress }) {
  const t = useUiText();
  if (progress.total === 0) return null;
  return (
    <section
      data-testid="task-plan"
      aria-label={t("Plan de la tarea")}
      className="border-2 border-[var(--neska-line)] bg-[var(--surface)]"
    >
      <header className="flex items-center justify-between border-b-2 border-[var(--neska-line)] px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
        <span className="neska-px">{t("Plan")}</span>
        <span className="neska-px" aria-label={t("{done} de {total} pasos completados", { done: progress.done, total: progress.total })}>{progress.done} / {progress.total}</span>
      </header>
      <ol className="py-1">
        {progress.steps.map((step, index) => {
          const current = index === progress.current;
          const complete = step.status === "completed" || (!current && progress.state === "done" && step.status === "in_progress");
          return (
            <li
              key={`${step.step}-${index}`}
              aria-current={current ? "step" : undefined}
              data-step-status={complete ? "completed" : current ? "current" : "pending"}
              className={`flex min-h-11 items-center gap-3 px-4 py-2 text-[15px] leading-6 ${current ? "bg-[var(--neska-ink)] text-[var(--neska-paper)]" : complete ? "text-[var(--text-secondary)]" : "text-[var(--text)]"}`}
            >
              <span aria-hidden="true" className={`grid size-[18px] shrink-0 place-items-center border-2 ${current ? "border-[var(--neska-paper)]" : "border-[var(--neska-ink)]"}`}>
                {complete ? <Check size={12} weight="bold" /> : null}
              </span>
              <span className="min-w-0 flex-1">{step.step}</span>
              {current ? <span aria-hidden="true" className="neska-cursor inline-block h-4 w-2 bg-[var(--neska-paper)]" /> : null}
              <span className="sr-only">{complete ? t("Completado") : current ? t("En curso") : t("Pendiente")}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
