"use client";
import { useUiText } from "@/i18n/provider";

import { FileText, X } from "@phosphor-icons/react";
import type { ChatMessage } from "@/lib/chat-contract";
import { activityPresentation, isRelevantProcessActivity } from "@/components/turn-activity";
import { publicActivityText } from "@/ui/public-activity";
import { isStepDone, type TaskProgress, type TaskState } from "@/ui/task-progress";

const STATE_LABEL: Record<TaskState, string> = {
  working: "Trabajando",
  waiting: "Esperando tu aprobación",
  done: "Lista",
  stopped: "Detenida",
};

export function taskStateLabel(state: TaskState) {
  return STATE_LABEL[state];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="neska-px mb-2.5 text-[11px] text-[var(--text-secondary)]">{title}</h3>
      {children}
    </section>
  );
}

/** "Estat de l'agent": what Neska has in hand for the current task. Every
 * value comes from the persisted turn; nothing here is decorative state. */
export function AgentStatusPanel({
  progress,
  message,
  request,
  closeButtonRef,
  onClose,
}: {
  progress: TaskProgress;
  message: ChatMessage;
  request: ChatMessage | undefined;
  closeButtonRef?: React.Ref<HTMLButtonElement>;
  onClose: () => void;
}) {
  const t = useUiText();
  const files = [
    ...(request?.attachments ?? []).map((attachment) => ({ id: attachment.id, name: attachment.name, note: t("Adjunto") })),
    // Only produced files: a browser session is not a file.
    ...message.artifacts.flatMap((artifact) => artifact.type !== "browser" && typeof artifact.name === "string"
      ? [{ id: artifact.id, name: artifact.name, note: t("Nuevo") }]
      : []),
  ];
  const activity = message.activity
    .filter((item) => item.status !== "pending" && isRelevantProcessActivity(item))
    .slice(-5)
    .map((item) => ({ id: item.id, label: activityPresentation(item, t).title, failed: item.status === "failed" }));
  const pendingApproval = message.approvals.find((approval) => approval.status === "pending");
  const stepLabel = progress.current >= 0
    ? t("Paso {current}/{total}", { current: progress.current + 1, total: progress.total })
    : `${progress.done}/${progress.total}`;

  return (
    <aside
      data-testid="agent-status-panel"
      aria-label={t("Estado del agente")}
      className="agent-status-panel scrollbar-thin inset-y-0 right-0 hidden w-[300px] overflow-y-auto border-l-2 border-[var(--neska-ink)] bg-[var(--surface)] px-5 py-5 xl:block"
    >
      <div className="flex items-center justify-between">
        <h2 className="neska-px text-[11px] text-[var(--text)]">{t("Estado del agente")}</h2>
        <button ref={closeButtonRef} type="button" aria-label={t("Ocultar estado del agente")} className="touch-target grid size-8 place-items-center text-[var(--text-secondary)] hover:text-[var(--text)]" onClick={onClose}><X size={14} /></button>
      </div>

      <figure className="mt-3 border-2 border-[var(--neska-ink)] shadow-[4px_4px_0_var(--neska-ink)]">
        {/* Duotone halftone: a decorative state image, never content. The
            Neska artwork is attached in neska.css only for that theme. */}
        <div aria-hidden="true" className="neska-state-art aspect-[16/10] bg-[var(--neska-accent)] bg-cover bg-center [image-rendering:pixelated]" />
        <figcaption className="flex items-center justify-between bg-[var(--neska-ink)] px-3 py-2 text-[11px] text-[var(--neska-paper)]">
          <span className="neska-px">{t(taskStateLabel(progress.state))}</span>
          <span className="neska-px">{stepLabel}</span>
        </figcaption>
      </figure>

      <Section title={t("Progreso")}>
        <div className="flex gap-1" role="img" aria-label={t("{done} de {total} pasos completados", { done: progress.done, total: progress.total })}>
          {progress.steps.map((step, index) => (
            <span key={`${step.step}-${index}`} className={`h-3 flex-1 border-2 border-[var(--neska-ink)] ${isStepDone(step, progress.state) ? "bg-[var(--neska-accent)]" : index === progress.current ? "neska-dots" : ""}`} />
          ))}
        </div>
      </Section>

      {pendingApproval ? (
        <Section title={t("Aprobación pendiente")}>
          <p className="border-l-2 border-[var(--neska-accent)] pl-3 text-[14px] leading-[21px] text-[var(--text)]">{publicActivityText(pendingApproval.title, 240) ?? t("Acción pendiente")}</p>
        </Section>
      ) : null}

      {files.length ? (
        <Section title={t("Archivos")}>
          <ul>
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-2.5 border-b-2 border-dotted border-[var(--neska-line)] py-2 text-[14px] text-[var(--text)]">
                <FileText size={16} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="neska-px text-[10px] text-[var(--text-secondary)]">{file.note}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activity.length ? (
        <Section title={t("Actividad")}>
          <ol className="space-y-1.5 font-mono text-[12px] leading-5">
            {activity.map((item) => (
              <li key={item.id} className={item.failed ? "text-[var(--danger)]" : "text-[var(--text)]"}>
                <span aria-hidden="true" className="text-[var(--neska-accent)]">› </span>{item.label}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
    </aside>
  );
}

/** Compact status for the task header: a pixel battery and a short label. */
export function TaskStatusChip({ progress }: { progress: TaskProgress }) {
  const t = useUiText();
  const label = progress.current >= 0
    ? `${t(taskStateLabel(progress.state))} · ${t("Paso {current}/{total}", { current: progress.current + 1, total: progress.total })}`
    : `${t(taskStateLabel(progress.state))} · ${progress.done}/${progress.total}`;
  return (
    <span data-testid="task-status-chip" role="status" className="neska-status-chip neska-px">
      <span aria-hidden="true" className="neska-status-chip-bar">
        {progress.steps.map((step, index) => <span key={`${step.step}-${index}`} data-done={isStepDone(step, progress.state) ? "true" : "false"} />)}
      </span>
      {label}
    </span>
  );
}
