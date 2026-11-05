"use client";
import { Check, Minus, X } from "@phosphor-icons/react";
import { useUiText } from "@/i18n/provider";
import type { ChatMessage } from "@/lib/chat-contract";
import { MAX_TASK_RETRIES } from "@/lib/task-retry";
import { verifyTask, type TaskCheck } from "@/lib/task-verification";

/** Where this task sits in an automatic retry chain. */
export type TaskRetryContext = { retried: boolean; attempt: number | null };

const ICON = { passed: Check, failed: X, info: Minus } as const;

function Row({ check }: { check: TaskCheck }) {
  const t = useUiText();
  const Icon = ICON[check.status];
  return <li data-check={check.id} data-status={check.status} className={`flex items-baseline gap-2 py-1 text-sm leading-5 ${check.status === "failed" ? "font-medium text-[var(--text)]" : "text-[var(--text-secondary)]"}`}>
    <Icon aria-hidden="true" size={13} weight="bold" className="shrink-0 translate-y-[2px]" />
    <span>{t(check.label, check.values)}</span>
  </li>;
}

/** What the server-persisted result shows after a finished task. Facts only:
 *  every line comes from a deterministic check that could have failed. */
export function TaskChecks({ message, retry }: { message: ChatMessage; retry?: TaskRetryContext }) {
  const t = useUiText();
  const verification = verifyTask(message);
  if (!verification || verification.total === 0) return null;
  const attention = verification.status === "attention";
  const rows = <ul className="mt-2">{verification.checks.map(check => <Row key={check.id} check={check} />)}</ul>;
  // A failed task that was already retried below is history, not a call to act.
  if (attention && retry?.retried) {
    return <section data-slot="task-checks" data-status="retried" aria-label={t("Comprovacions")} className="border-t border-[var(--border)] pt-4">
      <details>
        <summary className="cursor-pointer list-none text-[var(--text-secondary)]"><span className="neska-px text-[11px]">{t("Incomplet")} · {verification.passed}/{verification.total} · {t("ho he tornat a provar")}</span></summary>
        {rows}
      </details>
    </section>;
  }
  const exhausted = attention && retry?.attempt === MAX_TASK_RETRIES;
  const summary = <span className="neska-px text-[11px]">{attention ? t("Revisa-ho") : t("Comprovat")} · {verification.passed}/{verification.total}</span>;
  // All checks passed: one quiet line, details on demand. Anything failed: open.
  return <section data-slot="task-checks" data-status={verification.status} aria-label={t("Comprovacions")} className="border-t border-[var(--border)] pt-4">
    {attention ? <>
      <p className="text-[var(--text)]">{summary}</p>
      {rows}
      {exhausted ? <p className="mt-2 text-sm text-[var(--text)]">{t("Ho he provat {n} vegades i no ho he pogut acabar. Cal que ho miris tu.", { n: MAX_TASK_RETRIES })}</p> : null}
    </> : <details>
      <summary className="cursor-pointer list-none text-[var(--text-secondary)]">{summary}</summary>
      {rows}
    </details>}
  </section>;
}
