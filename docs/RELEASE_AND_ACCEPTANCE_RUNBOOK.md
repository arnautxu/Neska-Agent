# Neska release and acceptance

The product has no configured production deployment in this revision. The old customer deployment workflow is removed. Generic image build, release-state, rollback and evidence tools remain; publication stays disabled until a new installation's release path is reviewed.

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

The readback pipeline contract names its future deployment workflow `Deploy Neska`; that workflow is not installed or enabled here. CI, publication and deployment run IDs must be distinct and refer to the same SHA. Credentials, raw customer content and user cookies must not enter the public acceptance packet.
