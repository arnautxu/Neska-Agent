# Neska operating status

Updated: 2026-10-10.

## Current scope

Neska is a reusable company brain. The current cleanup removes the legacy scheduling engine, customer-specific context, branding rules, personal account overrides, host deployment procedures and historical customer acceptance reports. Generic documents, connectors, employee isolation, memory, automations, backup and recovery remain.

See [NESKA_BASE_ARCHITECTURE.md](NESKA_BASE_ARCHITECTURE.md). Internal `aibrain_*` protocol names are retained for compatibility; they do not identify a customer or grant access.

## Connections

No real company server, credential or customer data is provisioned by this code change. Optional Windows/document and mailbox adapters remain available as reusable mechanisms. Their installation, destination and operator credentials must be explicitly configured; defaults and examples use synthetic identities. Customer content never enables a capability or grants permission.

The document sync broker now requires operator-provided `--installation-id`, `--connection-id` and `--service-unit`, and rejects a manifest with a different binding. Acceptance validation requires a separately supplied `--target` for live acceptance. There is no built-in production domain.

## Release status

This is local work on the fetched source revision in an isolated worktree. Validation results are recorded in the base architecture before completion. No publication, deployment, migration or authenticated production acceptance is performed by this cleanup. The customer deployment workflow and customer systemd units are removed; generic infrastructure templates and transactional release/backup tools remain.

## Open security work

The prior local audit identified independent core issues: password recovery session revocation, the task-center origin guard, runtime privacy coupled to quotas, native-tool permission enforcement and root-package advisories. Removing a business integration does not close those findings. They require separate fixes and negative acceptance before real customer onboarding.
