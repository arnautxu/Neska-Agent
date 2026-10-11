# Neska · Traspàs de disseny a backend

Estat: 2026-10-11. Aquest document explica com connectar el disseny aprovat de Neska amb el backend real. És la referència per a qualsevol agent (Codex inclòs) que implementi la interfície.

## 1. On és cada cosa

| Peça | On és | Estat |
| --- | --- | --- |
| Fases 0 i 1 del redisseny (tokens, tipografia, català, tasca amb pla i panell) | `main` (PR #1, `649913c`) | Codi real, connectat al backend |
| Cursor de streaming + previews `/design/*` a Vercel | PR #12 | Obert, pendent de merge |
| Icones animades (lucide-animated) | PR #13 | Obert, pendent de merge |
| Rama combinada per veure-ho tot | `neska-preview` (#12 + #13) | Només per a Vercel, no es fa merge |
| Direcció visual aprovada (pantalles) | `docs/design/neska-minimal/pantalles/` | Maqueta HTML + PNG, **encara no és codi** |
| Sistema de disseny v0.1 | `docs/design/neska-minimal/sistema/` | Maqueta HTML + PNG + `ds.css` (tokens) |
| Contracte UI ↔ backend | `docs/UI_BACKEND_CONTRACT.md`, `src/lib/chat-contract.ts` | Font de veritat del backend |

Els PNG són la referència canònica. Els HTML es poden obrir al navegador; sense les fonts locals es veuen amb tipografia de substitució.

### Ordre de merge recomanat

1. PR #12 a `main` (cursor + configuració de previews a Vercel).
2. PR #13 a `main` (icones). Toca molts components; millor abans que Codex comenci a canviar-los.
3. Aquest PR (documentació de disseny).
4. Després, Codex treballa sempre des de `main`. La rama `neska-preview` queda obsoleta un cop #12 i #13 són a `main`.

### Real vs maqueta

- `src/app/design/*` són pàgines amb dades falses, protegides per `designPreviewsEnabled()` (`src/app/design/previews.ts`). Donen 404 a producció. No s'han de connectar al backend; serveixen per revisar visualment.
- La interfície real és `src/components/*` (sobretot `brain-app.tsx`, `chat-workspace.tsx`, `task-plan.tsx`, `agent-status-panel.tsx`, `turn-activity.tsx`, `task-center-panel.tsx`).
- El tema s'activa per instal·lació amb `"visualTheme": "neska"` a `branding` de la configuració server-side. Els tokens actuals viuen a `src/styles/neska.css`.

## 2. Diferència entre el codi actual i el disseny aprovat

El codi de `main` és de la fase 1. El disseny aprovat (minimal) va més enllà:

- **Sense ombres ni caixes.** `neska.css` encara té `--neska-offset` (ombra desplaçada). El sistema aprovat només fa servir línies d'1px; l'únic bloc amb vora és el permís.
- **Grisos més foscos per a AA:** `ink-2 #555`, `ink-3 #767676` (vegeu `sistema/ds.css`).
- **Marró només vol dir "viu" o "acció principal".** Res més és marró.
- **L'estat és forma + color.** Els errors porten una creu, mai vermell.
- **Una pantalla, un focus.** La tasca és la mateixa pantalla de principi a fi; només canvia què té el focus (pla, pas viu, permís, resultat).
- **Activitat amagada** fins que l'usuari obre "Activitat" al panell dret, en català planer.
- Detalls retro-tech: quadrat de píxel que respira (viu), cursor de bloc. Font píxel només en etiquetes petites, mono només per a números i noms de fitxer.

## 3. Què necessita cada pantalla del backend

Els esdeveniments existents (`ChatStreamEvent` a `src/lib/chat-contract.ts`) ja cobreixen bona part. La columna "Falta" és el que el disseny demana i el contracte no publica avui.

### 3.1 Estats d'una tasca

El disseny té 6 estats amb forma pròpia: **Pla proposat, A la cua, En curs, T'espera, Feta, Ha fallat** (+ **Programada** per a repeticions).

| Estat disseny | Font actual | Falta |
| --- | --- | --- |
| En curs | `message.status = "streaming"`; Task Center `running` | — |
| T'espera | approval `pending`; Task Center `needs_attention` | — |
| Feta | `done`; `completed` | — |
| Ha fallat | `error`; `failed` | — |
| Aturada | `stopped` | Decidir si es mostra com a Feta parcial o estat propi |
| Pla proposat | Mode `plan` del composer | Un estat persistent "esperant que l'usuari aprovi el pla" abans d'executar |
| A la cua | — | Estat quan el worker encara no ha agafat la tasca |
| Programada | Automatitzacions (`docs/AUTOMATIONS.md`) | Enllaçar una tasca feta amb "Repeteix" i mostrar la propera execució |

### 3.2 Pla i passos (pantalla de tasca)

Disseny: llista numerada de passos, cada un amb títol, eina o font ("Drive", "Banc"), etiqueta "Amb permís" si caldrà aprovació, durada quan acaba, i progrés intern del pas viu ("29/38 · Llegint F-2026-0932.pdf").

| Dada | Font actual | Falta |
| --- | --- | --- |
| Títol del pas, estat | `plan.steps[].step`, `status` (`pending`/`in_progress`/`completed`) | — |
| Explicació del pla | `plan.explanation` | — |
| Pas fallat o saltat | — | `status: "failed" \| "skipped"` per pas |
| Eina o font del pas | — | `step.tool?` (nom visible, no intern) |
| "Amb permís" | — | `step.requiresApproval?: boolean` |
| Durada per pas | — | `step.startedAt` / `completedAt` |
| Progrés intern (29/38) i què fa ara | Inferible d'`activity` | `step.progress?: { done, total }` i `step.current?: string` |
| Estimació ("Uns 4 minuts") | — | Opcional; si no hi ha dada fiable, no es mostra |
| Editar el pla abans de començar | — | Endpoint per acceptar/editar passos d'un pla proposat i llavors executar |

Rellotge de la tasca (02:41): es calcula al client des de l'inici del turn; `done.durationMs` dona el total.

### 3.3 Permís (aprovació)

Disseny: bloc amb vora, a dalt de tot quan espera. Títol en llenguatge planer ("Enviar un correu a Ferreteria Puig"), una frase de per què, i accions **Permet ⏎ / Revisa / Ara no**. Text: "Continuo amb la resta mentrestant".

| Dada | Font actual | Falta |
| --- | --- | --- |
| Acció i decisió | `ApprovalItem` + `POST /api/runtime/approvals` (`accept`, `acceptForSession`, `decline`) | — |
| Títol i motiu en català planer | `ApprovalItem.title`, `detail` (kind `command`/`file`/`browser`) | Garantir que `title` i `detail` són frases per a humans, no l'ordre tècnic; afegir kind per a accions de connector (correu, etc.) |
| "Revisa" (veure el correu o canvi) | `diff` / artefacte | Enllaç de l'approval al contingut a revisar |
| Pas al qual pertany | — | `approval.stepIndex?` |
| Safata (totes les aprovacions pendents) | Task Center `needs_attention` | Llista d'aprovacions pendents de totes les tasques |
| Notificació al mòbil si no hi ets | Preferència `desktop` del Task Center | Push mòbil (no existeix) |

### 3.4 Incidència dins d'un pas

Disseny: un error no atura la tasca. Dins del pas: creu, una frase ("No he pogut llegir F-2026-0940.pdf · Està protegit amb contrasenya. He seguit amb la resta.") i dues sortides ("Puja'l de nou", "Salta-la").

Falta: un esdeveniment d'incidència no fatal per pas, amb `message`, `detail` i accions possibles (`retry_with_upload`, `skip`), i un endpoint per executar-les. Avui només hi ha `error` (fatal) o `activity.status = "failed"`.

### 3.5 Resultat (tasca feta)

Disseny: frase de resum ("37 factures quadren…"), fitxer principal amb metadades ("38 files · 1 diferència", "Obre ↗"), línia replegada "5 passos · 142 accions · Mostra ▾", i "Fes-ho cada…".

| Dada | Font actual | Falta |
| --- | --- | --- |
| Resum | Contingut final del missatge | — |
| Fitxers produïts | `artifact` (document, imatge) i `toolResult` | Metadades curtes per a la fila (`summary`, p. ex. "38 files") |
| Fitxer en curs ("Esborrany · s'actualitza mentre treballo", "Generant 29 de 38") | `DocumentArtifact.status = "processing"` | Progrés de generació |
| Comptadors (passos, accions, eines, records usats) | Comptables des d'`activity` | Records de memòria usats: no publicat |
| Repeteix | Automatitzacions | Crear automatització des d'una tasca feta |

### 3.6 Panell d'activitat

Disseny: hora, verb en català ("Llegeix", "Extreu", "Creua", "Decideix", "Escriu"), objecte en mono i una línia de detall. "Decideix" explica el criteri ("Supera el llindar de 5 € que tens a la memòria").

Font actual: `activity` (`ActivityItem`: `kind`, `label`, `detail`, `status`, `sequence`). Falta: `timestamp`, un verb visible en català per kind, i un tipus `decision` amb la raó. Mai s'ha de mostrar raonament intern del model; només la decisió i el criteri.

### 3.7 Inici, barra lateral, composer, mòbil

- **Inici:** salutació, composer, tasques recents i el que t'espera. Fonts: projects/threads (`/api/projects`, `/api/threads`) i Task Center.
- **Barra lateral:** Nova tasca, Inici, Safata (comptador de pendents), Automatitzacions, llista de Tasques amb el seu estat. "Tasca" = thread a nivell de dades.
- **Composer:** adjunts (`/api/threads/{id}/documents`), @ eines/connectors, esforç (de `/api/runtime/status`), stop/steer (`/api/runtime/turns/control`). Dins d'una tasca en curs, el text del composer és un `steer`.
- **Mòbil:** `sistema/04-mobil`. Mateixes dades; el panell d'activitat esdevé full inferior.
- **Streaming:** `delta`/`content` com ara; el cursor de bloc marró (PR #12) apareix mentre arriba text.

## 4. Regles que no es poden trencar

- El backend és l'autoritat de seguretat, permisos, IDs i estat. La UI no inventa estats que el backend no publica; si una dada no existeix, l'element no es mostra.
- Aïllament de tenant i usuari, i permisos server-side, com diu `AGENTS.md`.
- Tot text visible en català com a base (castellà és traducció).
- Cada canvi visual es pot revisar a Vercel amb una pàgina `/design/<nom>` amb dades falses abans de tocar la interfície real.
