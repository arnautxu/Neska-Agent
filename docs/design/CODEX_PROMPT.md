Treballes al repo arnautxu/Neska-Agent (Next.js + runtime al mateix repo). Abans de res llegeix AGENTS.md, docs/NESKA_AGENT_BOOTSTRAP.md, docs/OPERATING_TRUTH.md, docs/UI_BACKEND_CONTRACT.md i, sobretot, docs/design/NESKA_DESIGN_HANDOFF.md.

Objectiu: que la interfície real de Neska segueixi el disseny aprovat de docs/design/neska-minimal/ (els PNG són la referència visual; sistema/ds.css són els tokens) i que totes les dades vinguin del backend real, no de fixtures.

Fes-ho en PRs petits, en aquest ordre:

1. Tokens. Porta els tokens de docs/design/neska-minimal/sistema/ds.css a src/styles/neska.css (tema "neska"): grisos AA, línies d'1px, sense ombres ni --neska-offset, marró #6B3A1E només per a "viu" i "acció principal". No trenquis els altres temes.
2. Contracte. Amplia src/lib/chat-contract.ts i el backend amb el que la secció 3 del handoff marca com a "Falta", de forma additiva i retrocompatible: estats de pas failed/skipped, step.tool, step.requiresApproval, temps per pas, step.progress i step.current, approval.stepIndex, incidències no fatals per pas amb accions (retry, skip), timestamp i tipus decision a l'activitat, estat de pla proposat editable abans d'executar, i estat a la cua. Actualitza docs/UI_BACKEND_CONTRACT.md al mateix commit i afegeix tests del validador.
3. Pantalla de tasca. Refés task-plan, l'aprovació, el resultat i la incidència segons docs/design/neska-minimal/sistema/03-cicle.png: una pantalla, un focus; el permís és l'únic bloc amb vora i puja a dalt quan espera; errors amb creu, mai vermell.
4. Panell d'activitat. Amagat fins que l'usuari l'obre. Hora, verb en català, objecte en mono, detall curt. Mai raonament intern del model.
5. Inici, barra lateral (Safata amb comptador de pendents) i mòbil (sistema/04-mobil.png).

Regles:
- El backend és l'autoritat. Si una dada no existeix al contracte, l'element no es mostra; no inventis estats.
- Mantén l'aïllament de tenant i usuari i els permisos server-side.
- Tot text visible en català (base); castellà com a traducció al catàleg.
- Per cada canvi visual, afegeix o actualitza una pàgina de maqueta a src/app/design/<nom>/page.tsx protegida amb designPreviewsEnabled() perquè es pugui revisar a la preview de Vercel abans de tocar la interfície real.
- Respecta prefers-reduced-motion.
- Fes fetch d'origin/main abans de començar i abans de cada commit. Mai force-push.
