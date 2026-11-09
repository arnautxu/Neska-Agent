# Neska on LibreChat

Decided by Arnau on 2026-11-09: Neska's harness and UI move to a fork of LibreChat (MIT),
with Neska's design on top, running one stack per client on Hetzner ARM.

- Code: `librechat/` (fork, see `librechat/NESKA_FORK.md`). Deploy: `librechat/neska/`.
- Model access changes from the operator's ChatGPT sign-in (Codex app-server) to a per-client
  API key, paid per use.
- The existing Next.js app and Codex runtime stay in the repo, unchanged, until the LibreChat
  stack passes authenticated live acceptance; then they are archived.
- Still to port: risk labels on approvals, verify-before-Fet, automatic retries, the rest of
  the Catalan strings (about 2,000 missing upstream), backups/restore for MongoDB.

Status 2026-11-09: themed fork runs locally with synthetic data. No image built for ARM,
no deploy, no live acceptance. These remain separate gates.
