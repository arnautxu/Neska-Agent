"use client";

import { useUiText } from "@/i18n/provider";
import { useEffect, useRef, useState } from "react";
import { SecureInput } from "@/components/aicss/secure-input";
import type { PrivateInputStatus, PrivateInputValues } from "@/runtime/browser/secure-input-contract";

type Status = PrivateInputStatus & { browserSessionId: string | null };

/** Deliberately outside chat messages, attachments, composer and localStorage. */
export function PrivateBrowserInput({ threadId, onOpenBrowser }: { threadId: string; onOpenBrowser: () => void }) {
  const t = useUiText();
  const cardRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch(`/api/runtime/browser/secure-input?threadId=${encodeURIComponent(threadId)}`, { cache: "no-store", signal: controller.signal });
        if (response.ok) {
          const next = await response.json() as Status;
          if (!stopped) setStatus(next);
        } else if (!stopped) setStatus(null);
      } catch { /* No input values or raw errors are reported. */ }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [threadId]);

  useEffect(() => {
    if (status?.protected) cardRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [status?.protected, status?.request?.id]);

  const action = async (kind: "fill" | "dismiss" | "finish", values?: PrivateInputValues) => {
    if (!status?.browserSessionId) return false;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/runtime/browser/secure-input", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: kind, threadId, browserSessionId: status.browserSessionId,
          requestId: status.request?.id ?? status.browserSessionId, ...(kind === "fill" ? { values } : {}) }),
      });
      if (!response.ok) { setNotice(t("No s’ha pogut verificar l’acció. Revisa la pantalla abans de continuar.")); return false; }
      if (kind === "fill") onOpenBrowser();
      if (kind === "dismiss" || kind === "finish") setStatus(null);
      return true;
    } catch { setNotice(t("No s’ha rebut confirmació. Revisa la pantalla; les dades no es tornaran a enviar.")); return false; }
    finally { setBusy(false); }
  };

  if (!status?.protected) return null;
  const request = status.request;
  return <section ref={cardRef} aria-label={t("Dades protegides")} className="my-5 space-y-3">
    {request?.phase === "form" ? <SecureInput key={request.id} preset={request.preset}
      description={t("Destí: {p0}. Les dades van directament al navegador privat; no s’envien al model ni al xat.", { p0: request.origin })}
      onContinue={values => action("fill", values)} onDismiss={() => { void action("dismiss"); }} onOpenScreen={onOpenBrowser} />
      : <p className="text-sm text-[var(--text-secondary)]">{request?.phase === "filled" ? t("Camps omplerts. Completa l’accés a la pantalla.") : t("El navegador està en mode privat. Revisa la pantalla per continuar.")}</p>}
    <div className="flex flex-wrap gap-3 text-sm">
      <button type="button" className="min-h-11 underline underline-offset-4" onClick={onOpenBrowser}>{t("Obre la pantalla")}</button>
      <button type="button" disabled={busy} className="min-h-11 underline underline-offset-4 disabled:opacity-50" onClick={() => { void action("finish"); }}>{t("Torna el control a Neska")}</button>
    </div>
    <p className="max-w-lg text-xs text-[var(--text-muted)]">{t("Mentre aquest mode estigui actiu, el model no pot veure el navegador. En tornar el control es tanquen les pàgines privades i es conserva la sessió iniciada. Després pots demanar a Neska que continuï.")}</p>
    {notice ? <p role="alert" className="text-sm">{notice}</p> : null}
  </section>;
}
