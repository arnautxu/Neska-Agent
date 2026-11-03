"use client";
import { Check, Minus, X } from "@phosphor-icons/react";
import { useUiText } from "@/i18n/provider";
import type { ChatMessage } from "@/lib/chat-contract";
import { verifyTask, type TaskCheck } from "@/lib/task-verification";

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
export function TaskChecks({ message }: { message: ChatMessage }) {
  const t = useUiText();
  const verification = verifyTask(message);
  if (!verification || verification.total === 0) return null;
  const attention = verification.status === "attention";
  const summary = <span className="neska-px text-[11px]">{attention ? t("Revisa-ho") : t("Comprovat")} · {verification.passed}/{verification.total}</span>;
  // All checks passed: one quiet line, details on demand. Anything failed: open.
  return <section data-slot="task-checks" data-status={verification.status} aria-label={t("Comprovacions")} className="border-t border-[var(--border)] pt-4">
    {attention ? <>
      <p className="text-[var(--text)]">{summary}</p>
      <ul className="mt-2">{verification.checks.map(check => <Row key={check.id} check={check} />)}</ul>
    </> : <details>
      <summary className="cursor-pointer list-none text-[var(--text-secondary)]">{summary}</summary>
      <ul className="mt-2">{verification.checks.map(check => <Row key={check.id} check={check} />)}</ul>
    </details>}
  </section>;
}
