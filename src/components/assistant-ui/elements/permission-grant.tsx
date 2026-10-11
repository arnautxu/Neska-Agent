"use client";
import { useUiText } from "@/i18n/provider";

import { LockSimple } from "@phosphor-icons/react";
import type { ApprovalItem, ApprovalDecision } from "@/lib/chat-contract";
import { publicActivityText, publicCommandTitle } from "@/ui/public-activity";

// AiBrain authorizes exact decisions; the registry's permanent grant is unsupported.
export function PermissionGrant({
  approval,
  onResolve,
  connectorApproval = false,
  readOnly = false,
}: {
  approval: ApprovalItem;
  onResolve: (decision: ApprovalDecision) => void;
  connectorApproval?: boolean;
  readOnly?: boolean;
}) {
  const t = useUiText();
  const pending = approval.status === "pending";
  const result = {
    accepted: t("Permitido una vez"),
    accepted_session: t("Permitido durante esta tarea"),
    declined: t("Acción rechazada"),
    pending: t("Esperando tu decisión"),
  }[approval.status];
  const title = publicActivityText(approval.title, 240) ?? t("Acción pendiente");
  const explanation = approval.kind === "file"
    ? t("El asistente ha preparado cambios en el proyecto. Solo se aplicarán si los autorizas.")
    : approval.kind === "browser"
      ? t("La siguiente acción del navegador necesita tu permiso antes de continuar.")
      : t("Este comando necesita tu permiso. Puedes permitirlo una vez, durante esta tarea o rechazarlo.");

  const button = "neska-px min-h-11 max-sm:w-full border-2 border-[var(--neska-ink)] px-4 py-2 text-[12px] transition active:translate-x-[2px] active:translate-y-[2px]";

  return (
    <div data-slot="permission-grant" data-pending={pending ? "true" : "false"} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]" role="group" aria-label={t("Aprobación: {p0}", { p0: title })}>
      <div className="px-4 pb-3 pt-3.5">
        <p className={`neska-px flex items-center gap-2 text-[11px] ${pending ? "text-[var(--neska-accent)]" : "text-[var(--text-secondary)]"}`}>
          <LockSimple size={14} weight="bold" aria-hidden="true" />{pending ? t("Aprobación pendiente") : t("Aprobación")}
        </p>
        <p className="mt-2 text-[16px] font-medium leading-6 text-[var(--text)]">{title}</p>
        <p className="mt-1 text-[14px] leading-[22px] text-[var(--text-secondary)]">{explanation}</p>
        <details className="mt-2">
          <summary className="w-fit cursor-pointer text-[13px] font-medium text-[var(--text)] underline decoration-[var(--neska-line)] underline-offset-4">{t("Ver por qué necesita permiso")}</summary>
          <div className="mt-2 border-l-2 border-[var(--neska-accent)] py-1 pl-3 text-[14px] leading-[22px] text-[var(--text)]">
            <p>{publicActivityText(approval.detail, 1_000) ?? t("Esta acción necesita confirmación.")}</p>
            {approval.command ? <p className="mt-2 font-mono text-[12px] text-[var(--text-secondary)]">{publicCommandTitle(approval.command)}</p> : null}
          </div>
        </details>
      </div>

      {pending && readOnly ? (
        <div className="border-t-2 border-[var(--neska-line)] px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)]">
          {" "}{t("Esperando la decisión de un editor del proyecto")}{" "}</div>
      ) : pending ? (
        <div className="flex flex-wrap items-center gap-2.5 border-t-2 border-[var(--neska-line)] px-4 py-3">
          <button type="button" className={`${button} bg-[var(--neska-accent)] text-[var(--neska-accent-text)] shadow-[var(--neska-offset-sm)] hover:bg-[color-mix(in_srgb,var(--neska-accent)_88%,black)]`} onClick={() => onResolve("accept")}>{t("Permitir")}</button>
          {approval.kind === "command" && !connectorApproval ? (
            <button type="button" className={`${button} bg-[var(--surface)] text-[var(--text)] shadow-[var(--neska-offset-sm)] hover:bg-[var(--surface-hover)]`} onClick={() => onResolve("acceptForSession")}>{t("Durante esta tarea")}</button>
          ) : null}
          <button type="button" className={`${button} sm:ml-auto border-transparent bg-transparent text-[var(--text)] hover:border-[var(--neska-ink)]`} onClick={() => onResolve("decline")}>{t("Rechazar")}</button>
        </div>
      ) : (
        <div className="border-t-2 border-[var(--neska-line)] px-4 py-2.5 text-[13px] font-medium text-[var(--text)]" role="status">{result}</div>
      )}
    </div>
  );
}
