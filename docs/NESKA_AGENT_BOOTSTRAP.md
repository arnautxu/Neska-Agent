# Neska Agent bootstrap

Created: 2026-10-09 (Europe/Madrid).

## Provenance

- Source repository: https://github.com/arnautxu/AiBrain
- Source branch: fetched `origin/main`.
- Source commit: `3e3e9c6e7b735115f4ad6d03572baea9590ba441`.
- Preparation: dedicated managed worktree; the original dirty checkout was not edited.
- Destination: `/Users/arnau/automations/Neska-Agent`.
- New private repository: https://github.com/arnautxu/Neska-Agent
- Repository strategy: independent Git history; no source remote configured for pushing.

## Changes from source

- Package identity and local product name: Neska Agent / `neska-agent`.
- Dedicated development installation: `neska-agent-dev`, port 3102, `/tmp/neska-agent-dev`. `npm run dev` only selects it when `AIBRAIN_INSTALLATION_CONFIG` is unset, so the Playwright web servers keep their synthetic installation and origin.
- Existing product implementation and tests retained.
- GHCR publication and Arnall deployment jobs disabled with a literal false condition.
- Documentation distinguishes inherited AiBrain evidence from Neska status.

Only versioned source is copied. No ignored `.env`, `.vercel` link, Codex login,
customer runtime directory, browser session, backup or local generated output is
imported. The versioned test fixtures, customer-specific adapters, templates,
branding examples and historical documents remain for compatibility/reference;
they are not activated by the Neska development configuration. The repository
must remain private. The generic company context is seeded for `neska-agent`.

The original AiBrain remote, working files and live services are not changed.
Neska has no production infrastructure or inherited acceptance evidence.

## Validation and release gates

Completed local validation (Node 26.7.0, npm 11.19.0):

- `npm ci --no-audit --no-fund`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Installation and CI workflow contracts: 2 files / 19 tests passed.
- `npm run infra:validate`: passed, including Docker Compose configuration.
- `npm run build`: passed; 7 upstream dynamic-filesystem tracing warnings remain.
- Parsed the Neska configuration with the production schema: valid, unique paths.
- Parsed both release workflows: their top-level jobs begin with `false &&`.
- Compared 4,449 tracked source files by Git blob hash: product source is identical;
  only the 8 documented bootstrap files changed, plus 2 new configuration/docs files.
- Opened `http://localhost:3102`, signed in as the synthetic Alex Example user and
  verified the workspace and composer display Neska Agent. This is demo acceptance,
  not a real model turn or production identity check.
- Local screenshot: ignored `test-results/neska-agent-local.jpg`.
- GitHub private visibility and repository Actions disabled state read back.

Backend CI: not run (Actions disabled). GHCR: not published. Deployment: not
performed. Authenticated production acceptance: not performed. Real AI credentials
are deliberately not imported from AiBrain.

 Backend CI, GHCR publication,
deployment and authenticated live acceptance are separate gates. Initial GitHub
Actions are disabled at repository level until the new release setup is reviewed.

## Remaining product setup

- Define the new visual identity and v2 product scope.
- Configure independent runtime authentication for real model turns.
- Provision independent production Auth, domain, durable storage, backup and secrets.
- Replace archived release workflows and host examples with a Neska-specific pipeline.
- Run authenticated multi-user, real-turn and document acceptance on the deployment.
