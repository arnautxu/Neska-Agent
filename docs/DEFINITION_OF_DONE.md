# Neska definition of done

Current scope and evidence are recorded in [OPERATING_TRUTH.md](OPERATING_TRUTH.md). Evidence from an upstream product or another company is not acceptance of Neska.

## Candidate checks

- Fetch the remote revision, preserve unrelated work and record the exact candidate SHA.
- Run typecheck, lint, protocol contracts, infrastructure checks and the affected test suites. Build the application and required workers.
- Exercise authentication, server permissions, two-user isolation, streaming, persistence after restart and recovery with synthetic data.
- Verify the generic interface still works and no customer context, account exception, host or credential is bundled.
- Inspect dependency and image findings and resolve release-blocking security issues.

## Independent release gates

1. Local implementation and checks, with exact commands and limitations.
2. Backend CI for the same candidate, with the run URL and required jobs.
3. GHCR publication with immutable app and gateway digests and matching source revision.
4. Deployment to an explicitly configured Neska installation, with host/runtime revision and readiness readback.
5. Authenticated live acceptance: two real users remain isolated, authorized company operations succeed, unauthorized operations fail, state survives restart and rollback is demonstrated.

A passing earlier gate does not prove a later gate. Local fixtures never count as live acceptance. A deployment is not complete until the exact revision and authenticated behavior are read back from its destination.
