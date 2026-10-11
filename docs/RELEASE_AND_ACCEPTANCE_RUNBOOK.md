# Neska release and acceptance

The product has no verified live deployment in this revision. The old customer deployment workflow is removed. Generic image build, release-state, rollback and evidence tools remain. Publication requires explicit operator opt-in using `NESKA_PUBLISH_ENABLED=true`, explicit image repositories, and a successful same-repository Backend CI push run on main. An unset or false opt-in keeps publication disabled. See [the Neska trial deployment runbook](NESKA_PROVA_DEPLOYMENT.md).

## Gates

1. Review an immutable full SHA and run Backend CI on it.
2. Build/publish immutable app and egress images for the same SHA; record both digests and the publication run ID separately from CI.
3. Provision independent installation configuration, identity, secrets, data, source/publish roots, private networks and backups. Never copy another customer's runtime state.
4. Deploy only the verified digests through the transactional release manager. Preserve current/previous state and verify health/readiness. Do not perform broad image, volume or filesystem cleanup.
5. Collect runtime, OCI and durable release readbacks, two-user negative access evidence, real turns, authorized effects and backup/rollback proof.
6. Validate the acceptance packet with an independently provided expected origin:

```sh
npm run acceptance:verify -- --manifest /private/acceptance.json --evidence-root /private/evidence --checkout-root /verified/candidate --target https://brain.example.invalid
```

The placeholder origin must be replaced with the explicitly provisioned installation origin. The manifest cannot select its own authoritative acceptance target. Local and CI evidence remain prefilters, never live acceptance.

The manual first-installation workflow is `Deploy Neska`; it requires explicit opt-in, independently verified CI/publication and an operator-staged approved ARM release. See `NESKA_PROVA_DEPLOYMENT.md`. CI, publication and deployment run IDs must be distinct and refer to the same SHA. Credentials, raw customer content and user cookies must not enter the public acceptance packet.

## Linux CI validation without deployment

Backend CI runs only on native Ubuntu 24.04 ARM64 with Node 24.21.0. All existing
ARM build, test shards, browser/recovery, document, sandbox and image-scan gates
remain required. GHCR publishes only `linux/arm64` app and egress images for the
same successful main SHA; AMD64 execution and publication are excluded.

Its quality build now runs the standalone security HTTP probe after compilation: synthetic local users, pre/post-recovery cookies, cross-user boundaries and task-center origin enforcement. The container job separately executes native Codex privacy canaries through the production AppArmor/seccomp/bubblewrap configuration, followed by document conversion and passive XLS acceptance. These jobs create only disposable runner resources and do not publish images or deploy an installation.

Run the candidate through a pull request branch and record the head SHA, PR merge SHA/tree and final Backend CI run URL. If the default branch is an ancestor of the candidate, verify that the tested merge tree equals the candidate tree. A green subset of jobs is not a green workflow. Validation does not deploy. GHCR publication and the manual first-installation workflow require their independent opt-ins and exact successful main revision gates.

A domain purchase is not required to validate or test Neska. A future isolated staging server can use a subdomain of an existing operator-owned domain, or an IP-based temporary hostname such as sslip.io with an independently configured HTTPS certificate. Set installation `publicUrl` to the final HTTPS origin before testing browser authentication. A hostname is not hosting: the current backend needs a persistent Linux runtime and its own durable storage. No hostname, server or certificate is provisioned by this CI procedure.

The container runtime uses a pinned Ubuntu 24.04 LTS snapshot and official stable Chrome packages.
The current release path validates and publishes ARM64 only; package support for AMD64 does not establish AMD64 acceptance. Backend CI additionally exercises the actual packaged browser through the production bubblewrap wrapper: private CDP, independent employee state, Unicode input, PNG capture, takeover authorization and local-file/metadata denial. The image vulnerability scan remains a separate deployment gate without suppressions. See `CONTAINER_SECURITY_REVIEW.md`.

## Container CI cache (2026-10-11)

Backend CI uses native ARM64 BuildKit and GitHub Actions cache v2. Runtime and
Egress images have distinct cache scopes. The Dockerfile inputs, pinned base
image digests, dated Ubuntu snapshot, lockfile and copied source determine layer
reuse. Every candidate is loaded locally with its full Git SHA tag and its OCI
revision label is checked before acceptance. Both images are still scanned on
every run, and every existing sandbox, browser, document and XLS check remains
mandatory. CI does not push either image or reuse GHCR publication credentials.

Cache export is best effort, bounded to two minutes per image; only cache upload
errors may be ignored. Build, load, label verification, acceptance and scan
failures still fail the job. The first cache fill and any invalidated layer can
remain slow. Warm-run timing must be measured in GitHub Actions, not inferred
from local contract tests.

For a diagnostic clean build, manually run Backend CI with `clean_build=true`.
This disables layer reuse without changing acceptance or publication gates.
A workflow-dispatch run cannot satisfy the GHCR workflow's required main-push CI
condition. The required quality and E2E check names are unchanged; the container
job now reports `Immutable container builds (ubuntu-24.04-arm)`.
