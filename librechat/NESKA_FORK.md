# Neska fork of LibreChat

Upstream: https://github.com/LibreChat-AI/LibreChat, commit `f4154b6` (v0.8.9-rc1, 2026-10-31),
MIT licence (`LICENSE`, kept unchanged). Imported as plain files (no upstream history).

## Neska changes (keep this list short; prefer config and themes over edits)

| File | Change |
|---|---|
| `packages/client/src/theme/themes/neska.ts` | New bundled theme `neska` (ink #161616, brown #6B3A1E accent, 2px corners, no shadows, Rubik). |
| `packages/client/src/theme/themes/index.ts`, `packages/data-provider/src/theme.ts`, `client/src/Providers/bootVersion.ts` | Register `neska` next to `clickhouse`. |
| `client/src/neska.css`, `client/src/style.css` | Self-hosted Rubik / Geist Pixel / Geist Mono faces; `.neska-label` pixel labels (only under the `neska` theme). |
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

- `packages/api/src/agents/memory.ts`: the memory agent drops its default temperature for
  Anthropic `adaptive` thinking as well as `enabled` (Claude 5 defaults to adaptive, which
  rejects a temperature locally: "temperature is not supported when thinking is enabled").
  Test in `__tests__/memory.test.ts`. Prova also sets `thinking: false` for the memory agent.
