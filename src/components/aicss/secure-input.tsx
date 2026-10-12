"use client";
// Adapted from AICSS Secure Input (https://www.aicss.dev, MIT): restyled to
// the Neska tokens and translated to Catalan. Values stay in this component
// until the caller's onContinue receives them; nothing is rendered back.

import { useUiText } from "@/i18n/provider";
import { Fragment, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import styles from "./secure-input.module.css";

export const SECURE_INPUT_PRESETS = ["secret", "login", "otp", "card", "pin"] as const;

export type SecureInputPreset = (typeof SECURE_INPUT_PRESETS)[number];
export type SecureInputValues = Record<string, string>;
export type SecureInputState = "form" | "sending" | "filled" | "failed" | "dismissed";

const COPY: Record<SecureInputPreset, { kicker: string; title: string; description: string }> = {
  secret: { kicker: "Codi", title: "Codi per SMS", description: "S'acaba d'enviar un codi al" },
  login: { kicker: "Inici de sessió", title: "Entra al compte", description: "La pàgina demana iniciar sessió. Neska omplirà els camps sense veure'ls." },
  otp: { kicker: "Verificació", title: "Codi de l'app d'autenticació", description: "Escriu els 6 dígits que mostra l'app." },
  card: { kicker: "Pagament", title: "Dades de la targeta", description: "La pàgina de pagament espera la targeta. Les dades s'omplen directament allà." },
  pin: { kicker: "PIN", title: "Pantalla de bloqueig", description: "Escriu el PIN de 4 dígits per desbloquejar la pantalla." },
};

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatCard(value: string) {
  return digits(value, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const raw = digits(value, 4);
  return raw.length <= 2 ? raw : `${raw.slice(0, 2)}/${raw.slice(2)}`;
}

function expiryOk(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  const month = Number(match?.[1]);
  return Boolean(match) && month >= 1 && month <= 12;
}

function ready(preset: SecureInputPreset, values: SecureInputValues) {
  if (preset === "secret") return (values.code ?? "").trim().length > 0;
  if (preset === "login") return (values.email ?? "").trim().length > 0 && (values.password ?? "").length > 0;
  if (preset === "otp") return (values.code ?? "").length === 6;
  if (preset === "pin") return (values.pin ?? "").length === 4;
  return digits(values.number ?? "", 16).length === 16 && expiryOk(values.expiry ?? "") && digits(values.cvc ?? "", 4).length >= 3;
}

function payload(preset: SecureInputPreset, values: SecureInputValues): SecureInputValues {
  if (preset !== "card") return values;
  return { number: digits(values.number ?? "", 16), expiry: values.expiry ?? "", cvc: digits(values.cvc ?? "", 4) };
}

function Eye({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {off ? (
        <>
          <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c5.5 0 9.3 4.2 10.4 6.1a1 1 0 0 1 0 .8 16 16 0 0 1-3.2 3.8" />
          <path d="M6.6 6.6A16 16 0 0 0 1.6 11.1a1 1 0 0 0 0 .8C2.7 14.8 6.5 19 12 19a10 10 0 0 0 4.2-.9" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="m3 3 18 18" />
        </>
      ) : (
        <>
          <path d="M2.1 12.3a1 1 0 0 1 0-.6C3.2 9.2 7 5 12 5s8.8 4.2 9.9 6.7a1 1 0 0 1 0 .6C20.8 14.8 17 19 12 19s-8.8-4.2-9.9-6.7" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function Screen() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="14" x="2" y="3" rx="1" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

function Cells({ length, value, label, onChange }: { length: number; value: string; label: string; onChange: (next: string) => void }) {
  const labelId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, index) => value[index] ?? "");

  const write = (next: string, focus: number) => {
    onChange(next.slice(0, length));
    refs.current[Math.max(0, Math.min(focus, length - 1))]?.focus();
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (chars[index]) write(value.slice(0, index) + value.slice(index + 1), index);
      else if (index > 0) write(value.slice(0, index - 1) + value.slice(index), index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className={styles.field}>
      <span className={styles.label} id={labelId}>{label}</span>
      <div
        className={styles.cells}
        role="group"
        aria-labelledby={labelId}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text").replace(/\D/g, "");
          if (!text) return;
          event.preventDefault();
          write(text, Math.min(text.length, length) - 1);
        }}
      >
        {chars.map((char, index) => (
          <Fragment key={index}>
            {length === 6 && index === 3 ? <span className={styles.sep} aria-hidden /> : null}
            <input
              ref={(node) => {
                refs.current[index] = node;
              }}
              className={styles.cell}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={char}
              aria-label={`${label}, dígit ${index + 1} de ${length}`}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, "").slice(-1);
                if (!digit) return;
                write((value.slice(0, index) + digit + value.slice(index + 1)).slice(0, length), index + 1);
              }}
              onKeyDown={(event) => onKeyDown(index, event)}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  inputMode?: "text" | "email" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  const t = useUiText();
  const [revealed, setRevealed] = useState(false);
  const secret = type === "password";
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        <input
          id={id}
          className={styles.input}
          data-secret={secret ? "" : undefined}
          data-mono={mono ? "" : undefined}
          type={secret ? (revealed ? "text" : "password") : type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {secret ? (
          <button type="button" className={styles.eye} aria-label={t(revealed ? "Amaga la contrasenya" : "Mostra la contrasenya")} aria-pressed={revealed} onClick={() => setRevealed((current) => !current)}>
            <Eye off={revealed} />
          </button>
        ) : null}
      </span>
    </label>
  );
}

export function SecureInput({
  preset = "login",
  title,
  description,
  phone = "+34 600 000 000",
  continueLabel = "Continua",
  dismissLabel = "Ara no",
  openLabel = "Obre a la pantalla",
  state,
  onContinue,
  onOpenScreen,
  onDismiss,
}: {
  preset?: SecureInputPreset;
  title?: string;
  description?: string;
  /** Number shown in the "secret" (SMS) preset. */
  phone?: string;
  continueLabel?: string;
  dismissLabel?: string;
  openLabel?: string;
  /** Pins a state. Omit it and the card moves through the states itself. */
  state?: SecureInputState;
  onContinue?: (values: SecureInputValues) => void | boolean | Promise<void | boolean>;
  onOpenScreen?: () => void;
  onDismiss?: () => void;
}) {
  const t = useUiText();
  const uid = useId();
  const copy = COPY[preset];
  const [values, setValues] = useState<SecureInputValues>({});
  const [phase, setPhase] = useState<SecureInputState>(state ?? "form");
  const shownPhase = state ?? phase;
  const canContinue = ready(preset, values);
  const heading = title ?? t(copy.title);

  const set = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue || shownPhase === "sending") return;
    setPhase("sending");
    try {
      if (!onContinue) throw new Error("Private input transport is unavailable.");
      const result = await onContinue(payload(preset, values));
      setPhase(result === false ? "failed" : "filled");
    } catch {
      setPhase("failed");
    }
    setValues({});
  };

  if (shownPhase !== "form") {
    const note = {
      sending: "Omplint la pàgina…",
      filled: "Omplert a la pàgina.",
      failed: "No s'ha pogut omplir: la pàgina ha canviat. Neska no ha vist cap dada.",
      dismissed: "Descartat sense enviar res.",
    }[shownPhase];
    return (
      <div className={styles.resolved} data-preset={preset} data-state={shownPhase} role="status">
        <span className={styles.mark} data-state={shownPhase} aria-hidden />
        <span className={styles.resolvedTitle}>{heading}</span>
        <span className={styles.resolvedNote}>{t(note)}</span>
      </div>
    );
  }

  return (
    <form className={styles.card} data-preset={preset} onSubmit={submit}>
      <div className={styles.copy}>
        <span className={styles.kicker}>{t(copy.kicker)}</span>
        <p className={styles.title}>{heading}</p>
        <p className={styles.description}>
          {description ?? (preset === "secret" ? <>{t(copy.description)} <span className={styles.mono}>{phone}</span>.</> : t(copy.description))}
        </p>
      </div>

      <div className={styles.fields}>
        {preset === "secret" ? (
          <Field id={`${uid}-code`} label={t("Codi")} autoComplete="one-time-code" inputMode="numeric" mono value={values.code ?? ""} onChange={(value) => set("code", value)} />
        ) : null}

        {preset === "login" ? (
          <>
            <Field id={`${uid}-email`} label={t("Correu o usuari")} type="text" inputMode="email" autoComplete="username" value={values.email ?? ""} onChange={(value) => set("email", value)} />
            <Field id={`${uid}-password`} label={t("Contrasenya")} type="password" autoComplete="current-password" value={values.password ?? ""} onChange={(value) => set("password", value)} />
          </>
        ) : null}

        {preset === "otp" ? <Cells length={6} label={t("Codi")} value={values.code ?? ""} onChange={(value) => set("code", value)} /> : null}
        {preset === "pin" ? <Cells length={4} label={t("PIN")} value={values.pin ?? ""} onChange={(value) => set("pin", value)} /> : null}

        {preset === "card" ? (
          <>
            <Field id={`${uid}-number`} label={t("Número de targeta")} inputMode="numeric" autoComplete="cc-number" mono value={values.number ?? ""} onChange={(value) => set("number", formatCard(value))} />
            <div className={styles.split}>
              <Field id={`${uid}-expiry`} label={t("Caducitat")} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" mono value={values.expiry ?? ""} onChange={(value) => set("expiry", formatExpiry(value))} />
              <Field id={`${uid}-cvc`} label={t("CVC")} inputMode="numeric" autoComplete="cc-csc" mono value={values.cvc ?? ""} onChange={(value) => set("cvc", digits(value, 4))} />
            </div>
          </>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={!canContinue}>{t(continueLabel)}</button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            onDismiss?.();
            setValues({});
            setPhase("dismissed");
          }}
        >
          {t(dismissLabel)}
        </button>
        <button type="button" className={styles.screen} aria-label={t(openLabel)} title={t(openLabel)} onClick={() => onOpenScreen?.()}>
          <Screen />
        </button>
      </div>
    </form>
  );
}
