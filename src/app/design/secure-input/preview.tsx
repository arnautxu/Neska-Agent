"use client";

import { SecureInput, type SecureInputPreset, type SecureInputState } from "@/components/aicss/secure-input";

const presets: SecureInputPreset[] = ["login", "otp", "secret", "pin", "card"];

const states: SecureInputState[] = ["sending", "filled", "failed", "dismissed"];

export function SecureInputPreview() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-20 text-[var(--text)]">
    <p className="neska-px mb-3 text-[11px] text-[var(--text-secondary)]">Neska · demostració visual</p>
    <h1 className="mb-3 text-3xl font-semibold tracking-tight">Dades protegides</h1>
    <p className="mb-14 max-w-xl text-sm text-[var(--text-secondary)]">{"Quan una pàgina demana una contrasenya, un codi o una targeta, Neska ho demana així i ho omple sense veure-ho. Contingut fictici: prova els camps, no s'envia res."}</p>

    <section className="grid items-start gap-x-10 gap-y-10 md:grid-cols-2">
      {presets.map((preset) => (
        <SecureInput key={preset} preset={preset} onContinue={() => new Promise((resolve) => window.setTimeout(resolve, 900))} />
      ))}
    </section>

    <section className="mt-16 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-10">
      <span className="font-mono text-[11.5px] text-[var(--text-muted)]">Estats després d&apos;enviar</span>
      {states.map((state) => <SecureInput key={state} preset="login" state={state} />)}
    </section>
  </main>;
}
