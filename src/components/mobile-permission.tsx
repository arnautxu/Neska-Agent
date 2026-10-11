"use client";
import { useSyncExternalStore, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUiText } from "@/i18n/provider";
import { useModalFocus } from "@/ui/use-modal-focus";
import { PermissionGrant } from "./assistant-ui/elements/permission-grant";
import type { ComponentProps } from "react";
export function MobilePermission(props: ComponentProps<typeof PermissionGrant> & { sheetAllowed: boolean }) {
  const t = useUiText();
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);
  const [dismissed, setDismissed] = useState(false);
  const open = props.sheetAllowed && !dismissed;
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useModalFocus<HTMLElement>(mobile && open, () => setDismissed(true), undefined, opener);
  if (!mobile || !props.sheetAllowed) return <PermissionGrant {...props} />;
  return <><button ref={opener} type="button" aria-haspopup="dialog" aria-expanded={open} className="min-h-11 text-left text-sm underline underline-offset-4" onClick={() => setDismissed(false)}>{t("Revisa el permís pendent")}</button>
    {open ? createPortal(<div className="fixed inset-0 z-[70] flex items-end"><button type="button" aria-label={t("Tanca el permís")} className="absolute inset-0 bg-black/30" onClick={() => setDismissed(true)} />
      <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("Necessito el teu permís")} className="mobile-permission-sheet relative max-h-[90dvh] w-full overflow-y-auto rounded-t-[16px] bg-[var(--surface)] pb-[max(16px,env(safe-area-inset-bottom))]">
        <div aria-hidden="true" className="mx-auto my-3 h-1 w-10 rounded-full bg-[var(--border)]" />
        <PermissionGrant {...props} />
        <button type="button" className="mx-5 min-h-11 px-3 text-sm text-[var(--text-secondary)]" onClick={() => setDismissed(true)}>{t("Tanca")}</button>
      </section>
    </div>, document.body) : null}
  </>;
}

function mobileSnapshot() { return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches; }
function subscribeMobile(callback: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
