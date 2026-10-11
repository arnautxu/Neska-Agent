# Neska operating status

Updated: 2026-10-11.

## Current scope

Neska is a reusable company brain. The current cleanup removes the legacy scheduling engine, customer-specific context, branding rules, personal account overrides, host deployment procedures and historical customer acceptance reports. Generic documents, connectors, employee isolation, memory, automations, backup and recovery remain.

See [NESKA_BASE_ARCHITECTURE.md](NESKA_BASE_ARCHITECTURE.md). Internal `aibrain_*` protocol names are retained for compatibility; they do not identify a customer or grant access.

## Connections

No real company server, credential or customer data is provisioned by this code change. Optional Windows/document and mailbox adapters remain available as reusable mechanisms. Their installation, destination and operator credentials must be explicitly configured; defaults and examples use synthetic identities. Customer content never enables a capability or grants permission.

The document sync broker now requires operator-provided `--installation-id`, `--connection-id` and `--service-unit`, and rejects a manifest with a different binding. Acceptance validation requires a separately supplied `--target` for live acceptance. There is no built-in production domain.

## Release status

The operator selected ARM64-only Backend CI and GHCR publication on 2026-10-11.
All existing ARM checks remain mandatory, including browser/recovery, document,
container isolation and vulnerability scans. No AMD64 image is produced by this
release path. CI, publication, deployment and live acceptance remain separate gates.

The operator has authorized a new isolated 8 GB trial server at `https://prova.neska.cat`, with a recurring ceiling of EUR 16/month including VAT, primary IPv4 and provider backups, conditional on successful native ARM validation for CAX21. Native ARM/x86 PR CI passed and the independent Helsinki CAX21 was purchased at EUR 15.84/month including VAT, IPv4 and provider backups. Host SSH and Ubuntu 24.04 ARM are verified. Application deployment and authenticated live acceptance remain pending. Publication now has an explicit repository-variable opt-in in addition to the existing successful-main-CI gate; this does not enable or prove deployment. See [NESKA_PROVA_DEPLOYMENT.md](NESKA_PROVA_DEPLOYMENT.md).

This is local work on the fetched source revision in an isolated worktree. Validation results are recorded in the base architecture before completion. No publication, deployment, migration or authenticated production acceptance is performed by this cleanup. The customer deployment workflow and customer systemd units are removed; generic infrastructure templates and transactional release/backup tools remain.

## Security remediation (2026-10-10)

The five core findings now have local remediations: password recovery revokes existing local sessions under a per-identity cross-process lock; task-center mutations require the configured same origin; private native filesystem profiles apply regardless of usage quotas; unsupported restricted native turns are rejected before context/model dispatch; production sharp/source-map-js dependencies are updated.

See [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md) for behavior, evidence and release requirements. The development-only braces advisory has no upstream patched version at this date and remains tracked. Local validation does not establish Backend CI, GHCR publication, Linux container acceptance, deployment or authenticated live acceptance. No real customer connection has been configured.
