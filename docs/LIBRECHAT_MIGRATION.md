# Neska on LibreChat

Decided by Arnau on 2026-11-09: Neska's harness and UI move to a fork of LibreChat (MIT),
with Neska's design on top, running one stack per client on Hetzner ARM.

- Code: `librechat/` (fork, see `librechat/NESKA_FORK.md`). Deploy: `librechat/neska/`.
- Model access changes from the operator's ChatGPT sign-in (Codex app-server) to Claude through
  the Anthropic API (Arnau, 2026-11-09). Default Sonnet 5.5; Opus 5.5 and Haiku 5.5 selectable.
  Each user enters their own Anthropic key in the model menu (`user_provided`). OpenAI is hidden.
- Memory across conversations is on (LibreChat memory agent on Haiku 5.5, user's own key).
  Upstream's memory agent sent a temperature Claude 5 rejects; fixed in the fork (NESKA_FORK.md).
- The existing Next.js app and Codex runtime stay in the repo, unchanged, until the LibreChat
  stack passes authenticated live acceptance; then they are archived. `deploy-neska.yml` targets
  the old stack, which no longer exists on prova; do not run it.
- Still to port: risk labels on approvals, verify-before-Fet, automatic retries, the rest of
  the Catalan strings (about 2,000 missing upstream), backups/restore for MongoDB.

Status 2026-11-09 (separate gates):
- Build: ARM image `neska-librechat:fd5db56` built by `build-librechat.yml` and published to GHCR.
- Deploy: live on prova.neska.cat (Hetzner CAX21) since 2026-11-09, compose project `neska-prova`
  from `/opt/neska/librechat-fd5db56`, config in `/etc/neska/prova/`, data in `/srv/neska/prova`.
  Deployed by hand over SSH; there is no automated deploy for this stack yet.
- Old stack: removed from the server on Arnau's request (containers, data, units, nginx). Only its
  last off-site restic backup and the two files that decrypt it remain, pending Arnau's call.
- Live acceptance: Arnau chatted with Neska on Claude through the web UI. Memory failed on image
  fd5db56 (temperature rejected); the fix ships with the next image and still needs a live check.
- Backups for the new stack: none yet (Arnau: not for now). Required before real customer data.

Files and presentations (2026-11-10, Arnau: "que funcioni com a Codex o com a Claude"):
- Both modes (Ràpid, Intel·ligent) get `executeCode`, `skills` and `artifacts`, always on with
  the tool chips hidden (`hideBadgeRow`). Neska skills live in `librechat/skill/`
  (`neska-presentacions` with `neska_deck.py`, `neska-excel` with `neska_xlsx.py`, `neska-word`)
  and ship inside the app image.
- Code runs in LibreChat's open-source Code Interpreter, installed per server from
  `librechat/neska/code/` (direct NsJail mode, no KVM on Hetzner cloud). ARM images and the
  runtime package tree come from `build-codeapi.yml`; upstream publishes amd64 only.
- Gates: tested end to end only in a local x86 container so far (sandbox runs Python, files
  upload and come back to LibreChat).
- 2026-11-11: PR #33 merged (a067901); ARM app image and sandbox images built. First switch on
  prova failed: Docker's default AppArmor profile blocks NsJail's mounts on Ubuntu, so the
  sandbox runner crash-looped; rolled back to f0698d5. Fix: dedicated AppArmor profile
  `librechat/neska/code/apparmor-neska-codeapi-sandbox` (only for sandbox-runner), verified
  healthy on prova in a throwaway container. Not yet deployed or live-accepted.
