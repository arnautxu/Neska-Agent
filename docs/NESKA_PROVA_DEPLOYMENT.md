# Neska trial deployment

## Authorized scope and current evidence

On 2026-10-11 the operator authorized a new Hetzner server with 4 vCPU,
8 GB RAM and approximately 80 GB disk for `https://prova.neska.cat`.
The recurring ceiling is EUR 14/month including VAT, primary IPv4 and provider
backups. Verify the checkout quote and availability before creating resources.
Use Ubuntu 24.04 x86-64, matching Backend CI. Keep the existing product UI.

The provider session, destination IP, dedicated Auth project, image digests,
live server, certificate and ChatGPT sign-in have not yet been verified.
The previously tested source candidate is
`be300a5fc714b5a1432b43a0ac0e93ce1f8bfa87`; its successful PR CI run is
`38058320743`. That evidence does not accept later release-path changes or
authorize publication without a successful main push CI for the new revision.

## Independent installation

- Installation ID: `neska-prova`; public origin: `https://prova.neska.cat`.
- Operator configuration: `/etc/neska/prova`; host root: `/srv/neska-prova`.
- Compose project: `aibrain-neska-prova`. Networks and volumes retain the
  corresponding `aibrain-neska-prova-*` prefix required by the host preflight.
  These are internal protocol names, not links to another installation.
- Keep the six internal container paths specified by the generic installation
  template. Create installation ownership markers in both operator roots.
- Use fresh secrets and a separate Supabase Auth project. Never reuse another
  installation's identity project, model tokens, data, backups or host state.
- Start with model concurrency, browser starts, document conversions and
  active uploads set to 1. Preserve the app's 4 GB memory cap, worker's 2 GB
  cap and auxiliary limits; measure actual peak usage and queue waits on host.
- Sign in to Codex with the operator's ChatGPT account for their trial user.
  Verify `account/read` reports the intended ChatGPT mode before a real turn.
  Do not add an API key or enable paid API fallback. Plan limits still apply.

## Image publication

Set explicit repository variables only for this product:

```text
NESKA_APP_IMAGE_REPOSITORY=ghcr.io/arnautxu/neska-agent
NESKA_EGRESS_IMAGE_REPOSITORY=ghcr.io/arnautxu/neska-agent-egress
NESKA_PUBLISH_ENABLED=true
```

The opt-in is effective only together with a successful Backend CI push run on
main from this repository. Pull-request CI and another repository's run cannot
publish. Images retain the full tested source revision tag and OCI label;
deploy using the immutable app and gateway digests from the release artifact.
Re-read GHCR package visibility and keep private source/images private.

## Host, DNS and acceptance

Follow `HETZNER_MIGRATION.md` for ownership, preflight, sandboxing, secrets and
transactional release management. Open only required HTTPS/HTTP ports and
operator SSH. Keep app, gateway, worker and browser ports private.

Create only the `prova` A record in the existing Nominalia zone once the new
server's IPv4 is verified. Do not change nameservers, apex records, mail or
other subdomains. Add no AAAA record until IPv6 is configured and tested.
Issue a valid certificate before activating the HTTPS proxy.

Provider disk backups are part of the authorized server quote. They do not
replace a consistent application backup. Verify an application snapshot and
restore into separate QA roots before recording recovery acceptance. An
additional paid backup destination requires a separate cost decision.

Record Backend CI, GHCR publication, deployment and authenticated acceptance
separately. A health endpoint does not prove login, ChatGPT connectivity or a
durable conversation. Complete the acceptance packet in
`RELEASE_AND_ACCEPTANCE_RUNBOOK.md`, including isolation and recovery, and
report any missing gate explicitly. Do not expose demo-mode authentication.
