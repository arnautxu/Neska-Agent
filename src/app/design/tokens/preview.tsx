"use client";
import { useEffect } from "react";
export function TokenPreview() {
  useEffect(() => {
    const root = document.documentElement;
    const visual = root.dataset.visualTheme;
    const theme = root.dataset.theme;
    root.dataset.visualTheme = "neska";
    root.dataset.theme = "light";
    return () => {
      if (visual) root.dataset.visualTheme = visual; else delete root.dataset.visualTheme;
      if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
    };
  }, []);
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <p className="neska-px text-[11px] text-[var(--neska-ink-3)]">Neska · Maqueta de tokens</p>
    <h1 className="mt-4 text-3xl font-medium">Una superfície, un focus.</h1>
    <p className="mt-4 text-[var(--neska-ink-2)]">Contingut fictici per revisar el sistema minimal.</p>
    <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
      {["ink", "ink-2", "ink-3", "accent"].map(name => <div key={name}>
        <div className="h-16" style={{ background: `var(--neska-${name})` }} />
        <p className="mt-2 font-mono text-xs">{name}</p>
      </div>)}
    </div>
    <div className="mt-10 border-y border-[var(--neska-line-soft)] py-4 text-[var(--neska-ink-2)]">01 · Llegir els documents <span className="float-right font-mono">0:41 ✓</span></div>
    <section data-slot="permission-grant" className="mt-8 p-5">
      <p className="neska-px text-[11px]">Necessito el teu permís</p>
      <h2 className="mt-2 text-lg">Enviar el resum revisat</h2>
      <p className="mt-1 text-[var(--neska-ink-2)]">Revisa el contingut abans de permetre l’enviament.</p>
      <button className="mt-4 rounded-[var(--neska-radius)] bg-[var(--neska-accent)] px-4 py-2 text-white">Permet</button>
    </section>
  </main>;
}
