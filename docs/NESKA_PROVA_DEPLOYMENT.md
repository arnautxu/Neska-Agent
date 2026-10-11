# Neska trial deployment

## Authorized scope and current evidence

On 2026-10-11 the operator authorized a new Hetzner server with 4 vCPU,
8 GB RAM and approximately 80 GB disk for `https://prova.neska.cat`.
The operator subsequently authorized CAX21 (4 ARM vCPU, 8 GB, 80 GB) up to
EUR 16/month including VAT, primary IPv4 and provider backups, **only after ARM
validation passes**. The observed Helsinki quote was EUR 15.84/month; recheck
price and capacity at purchase. Ubuntu 24.04 arm64 matches native Backend CI.
Keep the existing product UI. The server was subsequently purchased after the
complete ARM/x86 PR gates passed; see the first-host evidence below.

The independent Hetzner project and Supabase Auth/SMTP configuration have been
verified. The independent server is reachable by SSH; TLS, application deployment
and ChatGPT sign-in are still pending verification.
The preceding main revision and its separate CI/publication evidence are recorded
below; they do not accept a newer revision or its ARM runtime.

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

## Native architecture gates (2026-10-11)

Backend CI runs the same build, unit/integration, browser/recovery, document and
sandboxed container gates on Ubuntu 24.04 x86 and native ARM runners. There is
no emulation fallback and failures on either architecture block publication.
Publication also builds natively on both architectures, with separate caches,
full-SHA architecture-suffixed tags and release artifacts named
`aibrain-ghcr-release-<sha>-<amd64|arm64>`. For CAX, consume **only** the arm64
artifact. Its `architecture` must be `arm64`; verify the loaded images are
`linux/arm64` and OCI revision matches before promotion. Existing amd64 digests
cannot be reused on CAX. Neither a green ARM build nor a purchase accepts the
live host sandbox, login, model turn, persistent data or recovery.

Verified preceding release: main `00f67c27b8475860139b9a807ba95f043a9c2870`,
Backend CI `38128126117`, Publish `38128616014` (amd64 only). Supabase project
`wtycdacqvnporsxajuvs` and SMTP2GO sender domain `neska.cat` are configured;
email delivery has not been exercised. Hetzner project `16355705` is independent
and empty. Host, HTTPS, authenticated acceptance, real alert delivery and encrypted
off-host backup/restore remain unverified. Detailed operator-only configuration
and secrets stay outside Git.

The first native ARM container run exposed an x86-only `/lib64` bind in the
passive XLS sandbox. The passive reader and generic document extractors now mount
that optional loader directory read-only when present; `/usr` and `/lib` remain
mandatory. Namespace, capability, network and filesystem isolation are unchanged.
The existing real container acceptance must pass on both architectures.

## Off-host trial copies

Supabase Free Storage provides a bounded 1 GB trial destination, not an unlimited
backup service. A private bucket and dedicated server-only S3 key are required.
The endpoint has a path prefix, so use Restic's rclone transport with the fixed
`backup` S3 remote from `replica.env.example`. Native Restic S3 URL parsing cannot
represent that endpoint. The image includes rclone from the same pinned Debian
snapshot. Preflight rejects local/alias remotes, non-HTTPS endpoints and extra
rclone overrides; the replica process forwards only the explicit S3 fields and
ignores configuration files. Secrets remain exclusive to the replica service.

A synthetic encrypted upload, complete data check and byte-identical restore to
a separate local directory succeeded against the trial bucket. This is provider
compatibility evidence only. Host application snapshot/replication/restore is
still required. Monitor the free quota and Supabase's inactivity pause policy;
do not promise production availability from the free trial configuration.

## First host and restricted deployment (2026-10-11)

Native PR CI `38129982068` passed all 22 jobs on ARM and x86. PR #4 merged as
`5e2d563072c173ea4883db71fba8fd1a437ab7c2`. This fulfilled the purchase condition:
Hetzner CAX21 `neska-prova` was created in Helsinki with IPv4 and provider backups
at EUR 15.84/month including VAT. SSH confirms Ubuntu 24.04 and aarch64. Provider
backups are enabled; an actual provider snapshot and application recovery still
need verification. Operator state is independent and outside Git.

`Deploy Neska` is a manual, opt-in first-installation workflow. It verifies
successful main Backend CI and publication run IDs against the dispatched full
SHA and downloads only the corresponding ARM digest manifest. The operator must
stage that exact checkout on the host, install its locked dependencies, and
write a root-owned `deployment-approved.json` with the matching manifest before
execution. Staged source contains a `.prepared-revision` marker. The operator
also provisions installation configuration, fresh credentials and ownership
markers before enabling `NESKA_DEPLOY_ENABLED`.

Install `infra/hetzner/deploy-prova-restricted.sh` as the root-owned mode-0700
`/usr/local/sbin/neska-prova-deploy`. Give the workflow a separate SSH key with
`restrict,command="/usr/local/sbin/neska-prova-deploy"`; never give it the operator
key. The `neska-prova` GitHub environment holds `NESKA_DEPLOY_SSH_KEY` and a pinned
`NESKA_DEPLOY_KNOWN_HOSTS`; `NESKA_DEPLOY_HOST` is the independently verified IPv4.
The forced command accepts only the approved SHA/digests, verifies ARM and OCI
identity, scans both images with Trivy 0.75.0 (critical findings block startup),
and retains SBOMs and reports on the host. It uses the job's short-lived package-read token only to pull private
images. Temporary registry credentials are removed on exit. No GHCR package is
made public, and no registry token reaches application containers.

The command runs the complete first-host preflight and production AppArmor
profile, starts the isolated Compose services and invokes `manage-release.mjs
bootstrap`. Bootstrap checks running identities and health, then records a V3
state with `previous: null`; it refuses existing history and never invents a
rollback predecessor. Future upgrades use transactional `promote` with a verified
backup. The first-install workflow refuses to replace an existing deployment.
A green deployment is still separate from authenticated acceptance and recovery.

Nginx uses the HTTP/2 listen option supported by Ubuntu 24.04's Nginx 1.24.
No application UI is changed by these deployment adjustments.
