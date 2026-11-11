# Neska fork of LibreChat

Upstream: https://github.com/LibreChat-AI/LibreChat, commit `f4154b6` (v0.8.9-rc1, 2026-10-31),
MIT licence (`LICENSE`, kept unchanged). Imported as plain files (no upstream history).

## Neska changes (keep this list short; prefer config and themes over edits)

| File | Change |
|---|---|
| `packages/client/src/theme/themes/neska.ts` | New bundled theme `neska` (ink #161616, brown #6B3A1E accent, 2px corners, no shadows, Rubik). |
| `packages/client/src/theme/themes/index.ts`, `packages/data-provider/src/theme.ts`, `client/src/Providers/bootVersion.ts` | Register `neska` next to `clickhouse`. |
| `client/src/neska.css`, `client/src/style.css` | Self-hosted Young Serif (product name, headings) / Borna (reading text, `.neska-label` labels) / Geist Mono (code) faces, only under the `neska` theme. Logo: `public/assets/logo.svg` (app/favicon icon, off-white tile), `neska-dog.svg` (dog without tile: model icon, rail mark, landing mark, 3.5% backdrop via `body::after`) and `logo-lockup.svg` (dog + "Neska Agent", sign-in page). Brand hooks `.neska-rail-mark` (`UnifiedSidebar/ExpandedPanel.tsx`) and `.neska-landing-row/.neska-landing-mark` (`Chat/Landing.tsx`) are inert outside the `neska` theme. |
| `client/public/assets/fonts/neska/` | Font files (SIL OFL, see `OFL.md`). |
| `client/src/components/Conversations/{Conversations,ProjectsSection}.tsx` | `neska-label` class on sidebar section labels. |
| `client/src/locales/i18n.ts`, `client/src/store/language.ts`, `client/src/vite-env.d.ts` | Catalan is the default language (`VITE_DEFAULT_LANG` overrides); a saved choice still wins. |
| `client/index.html`, `client/vite.config.ts` | Title, description, `lang="ca"`, PWA name and colours. |
| `client/public/assets/logo.svg`, favicons, PWA icons | Neska pixel mascot. |
| `client/src/components/NeskaIcons/` | Neska's animated icons (lucide-animated + own), `NeskaIcon` maps lucide glyphs to them. |
| `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` | Sidebar rail draws icons through `NeskaIcon`. |
| `neska/` | Per-client config, Docker Compose for Hetzner ARM, env template. |

## Pulling a new upstream version

1. Download the new upstream tree into a scratch folder.
2. Diff it against the previous upstream commit and apply that diff here (`git apply --3way`).
3. Re-check every file in the table above, rebuild, re-render the PNG screens and compare.

## Memory with Claude 5 (2026-11-10)

- `packages/api/src/agents/memory.ts`: the memory agent drops its default temperature (0.4)
  for Anthropic `adaptive` thinking and for every model where `omitsSamplingParameters` is
  true. Claude 5 rejects it either way: locally with adaptive thinking ("temperature is not
  supported when thinking is enabled") and with a 400 when thinking is off ("`temperature`
  is deprecated for this model"). Test in `__tests__/memory.test.ts`.

## Mode picker in the input box (2026-11-10)

Users never pick a raw Anthropic model. `librechat.yaml` defines two model specs with `enforce: true`:
"Ràpid" (Sonnet, default) and "Intel·ligent" (Opus), both signed "Neska". The picker moved from the
chat header into the composer bar (`ModelSelector variant="composer"`, menu opens upward). Because
the specs-only menu has no key-entry row, the Claude key is one company key on the server
(`ANTHROPIC_API_KEY` in `/etc/neska/<client>/neska.env`), not a per-user key.

## Minimal Neska for Restanova (2026-11-11)

Most of the trim is config (`neska/librechat.yaml` `interface:` flags, no
`artifacts` in the specs). Five small client edits hide what config cannot:

- `client/src/components/Chat/Messages/HoverButtons.tsx`: `NESKA_COPY_ONLY` hides edit, branch
  and regenerate under messages; copy and read-aloud stay.
- `client/src/hooks/Nav/useSideNavLinks.ts`: the Memories panel is not shown. Memory itself keeps
  working (it is gated by `MEMORIES.USE`, which stays on).
- `client/src/components/Nav/AccountSettings.tsx`: "Els meus fitxers" removed from the account menu.
- `client/src/hooks/Sharing/useExportShare.tsx`: "Exporta" hidden in the chat menu; "Comparteix" stays.
- `client/src/components/Nav/Settings/registry.tsx`: conversation import hidden in Settings.
