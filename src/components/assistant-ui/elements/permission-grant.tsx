"use client";
import { useUiText } from "@/i18n/provider";
import type { ApprovalItem, ApprovalDecision } from "@/lib/chat-contract";
import { publicActivityText, publicCommandTitle } from "@/ui/public-activity";
export function PermissionGrant({ approval, onResolve, connectorApproval = false, readOnly = false, onOpenReview }: {
  approval: ApprovalItem; onResolve: (decision: ApprovalDecision) => void;
  connectorApproval?: boolean; readOnly?: boolean; onOpenReview?: () => void;
}) {
  const t = useUiText();
  const pending = approval.status === "pending";
  const title = publicActivityText(approval.title, 240) ?? t("Acció pendent");
  const detail = publicActivityText(approval.detail, 1000);
  const result = { accepted: "Permès una vegada", accepted_session: "Permès durant aquesta tasca", declined: "Acció rebutjada", pending: "Necessito el teu permís" }[approval.status];
  if (!pending) return <p className="py-2 text-sm text-[var(--text-secondary)]" role="status">{title} · {t(result)}</p>;
  const button = "min-h-11 rounded-[2px] px-4 py-2 text-sm max-sm:w-full";
  return <section data-slot="permission-grant" data-pending="true" className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-label={t("Permís: {title}", { title })}>
    <p className="neska-px text-[11px] text-[var(--text-secondary)]">{t("Necessito el teu permís")}</p>
    <h2 className="mt-2 text-[22px] font-medium leading-7">{title}</h2>
    {detail ? <p className="mt-2 text-[15px] leading-6 text-[var(--text-secondary)]">{detail}</p> : null}
    {approval.command ? <details className="mt-4"><summary className="cursor-pointer text-sm text-[var(--text-secondary)]">{t("Revisa els detalls")}</summary><p className="mt-2 break-all font-mono text-xs">{publicCommandTitle(approval.command)}</p>{approval.kind === "command" && !connectorApproval && !readOnly ? <button type="button" className={`${button} mt-3 border border-[var(--border)]`} onClick={() => onResolve("acceptForSession")}>{t("Permet durant aquesta tasca")}</button> : null}</details> : null}
    {readOnly ? <p className="mt-5 text-sm">{t("Esperant la decisió d’un editor del projecte")}</p> : <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" className={`${button} bg-[var(--neska-accent,var(--brain-accent))] text-white`} onClick={() => onResolve("accept")}>{t("Permet")}</button>
      {approval.reviewUrl ? <a href={approval.reviewUrl} target="_blank" rel="noreferrer" className={`${button} inline-flex items-center justify-center border border-[var(--border)]`}>{t("Revisa")}</a> : onOpenReview ? <button type="button" className={`${button} border border-[var(--border)]`} onClick={onOpenReview}>{t("Revisa")}</button> : null}
      <button type="button" className={`${button} text-[var(--text-secondary)] sm:ml-auto`} onClick={() => onResolve("decline")}>{t("Ara no")}</button>
    </div>}
  </section>;
}
