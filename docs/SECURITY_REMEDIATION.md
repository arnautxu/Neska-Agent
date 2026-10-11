# Security remediation — 2026-10-10

Scope: the five remaining findings from the local Neska audit. These changes retain the generic company-brain architecture and do not alter components, styles or visual design. No customer server, credentials, data or deployment is involved.

## Fixed behavior

| Finding | Enforcement | Regression evidence |
| --- | --- | --- |
| S1: password recovery left old local sessions valid | Successful password replacement revokes every local session for that installation/user before creating the new one. Login, initial password change and recovery serialize through the same per-installation/email filesystem lock, including password verification. Stale initial-password challenges are rejected; provider credentials are signed out in `finally`. | Integration tests cover both login/recovery orderings using separate service/store instances, unrelated users/installations, stale challenges and provider failure. Standalone HTTP verifies old cookie 401, replacement cookie 200 and other user 200. |
| S2: native privacy depended on quotas | Every worker starts with named private profiles. Every thread/turn selects one, has approval policy `never`, and receives only its project as a writable workspace root. Start/resume readback must attest cwd, profile and approval policy; reuse requires prior attestation. Escalation is declined. | Startup tests cover absent/false/true legacy flags. Real Codex 0.153.4 executes canary commands against default/read-only/write profiles before and after restart, with no `usageLimits` configuration. Authorized workspace/skill reads succeed; private auth/session/database/audit reads fail; only the write profile permits workspace writes. |
| S3: native tools could bypass approval-based permission checks | Before any worker/context/model dispatch, require explicit canonical document consultation and tool execution allows; reject effective consultation/execution/response denies. | Five negative native-turn tests verify rejection before memory read or worker acquisition. Existing allowed-turn, browser, document, cancellation/recovery and profile tests remain. |
| S4: task-center mutation lacked an origin check | PATCH requires the configured same origin before session lookup and parsing/mutation. | Unit regressions cover missing, malformed and foreign origins; standalone HTTP verifies a rejected update is not persisted and a same-origin update succeeds. |
| S5: vulnerable production dependencies | Lockfile upgrades sharp 0.35.4 → 0.35.5 (including platform packages/libvips) and source-map-js 1.2.1 → 1.2.2. Backend CI now fails on high/critical production npm advisories. | `npm ci`, production audit, production build and browser regressions. |

References: [sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Deliberate limits and remaining work

- A restricted consultation-only or execution-denied user cannot start the current native AI turn. The server returns `PERMISSION_POLICY_DENIED`. A future partial-access mode needs machine-enforced capability isolation; prompt text is insufficient. Default provisioned users with the canonical allows retain the normal flow.
- Provider password updates and local filesystem revocation are not one distributed transaction. If the process crashes or storage fails between them, an operator must revoke that user's sessions before reopening access. Never interpret a failed recovery response as successful revocation. Provider sign-out remains best effort under the existing provider implementation.
- The development dependency `braces <=3.0.3` has [an upstream advisory with no patched version](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) at verification time. Full `npm audit` reports five affected package nodes along one ESLint dependency chain; production `npm audit --omit=dev` reports zero. Do not run lint/build against untrusted attacker-supplied glob configuration. The suggested automatic Next ESLint downgrade is not an acceptable patch.
- Tests use synthetic users and a fake identity provider. Actual Supabase recovery, actual model responses and authenticated customer-server integration remain separate live acceptance gates.
- The native subprocess probe passed on macOS using the pinned Codex version. The extended probe is also built into the existing Linux container startup/Backend CI gate, but Linux/AppArmor/bubblewrap acceptance was not run here because no Docker daemon is available. macOS success is not evidence of Linux acceptance.

## Reproduction and release

1. Install the committed lockfile with `npm ci`; run lint, typecheck, Vitest, contract and infrastructure validation.
2. Run `npm run build -- --webpack`, then `node --import ./scripts/register-server-only-stub.mjs --import tsx scripts/verify-security-http.ts /absolute/path/to/results.json`. This starts an isolated loopback standalone server, creates only synthetic temporary data, probes it and removes its fixture.
3. Run `npm run build:container-app-server-acceptance` and the existing production container gate. It now includes actual native file-access canaries across two engine generations, requires Codex 0.153.4, and fails closed on a mismatch. It uses no model request or provider account.
4. Restart all worker processes when deploying this change so startup profiles are loaded. Complete Backend CI, GHCR publication, deployment and authenticated live acceptance independently, recording SHA and evidence for each. None of the latter gates is implied by local checks.

Local evidence: `/Users/arnau/Documents/Codex/2026-10-10/neska-security-fixes/`. Final validation results are recorded there with the code commit.

## Local validation result

- General Vitest run: 2,032 passed, 27 skipped and three outdated-fixture failures (workspace roots, the new audit gate, mandatory worker CODEX_HOME). After updating those fixtures, their complete suites passed: 58 + 7 + 4 tests. All 2,035 distinct non-skipped tests are covered by passing results; no full-suite rerun is implied.
- Real HTTP backend E2E: 8 passed, including process/backend restart and one/twenty edited XLSX workbooks without duplicate model submission. The simulated engine now returns the mandatory profile readback.
- Standalone security HTTP: 18 probes passed, plus the unauthenticated control. Browser smoke: 11 passed.
- Real pinned native engine privacy/restart probe, SVG rasterization with sharp 0.35.5, production webpack build, automation worker bundle, lint, typecheck, contract and infrastructure validation: passed locally.
- Local runtime was Node 26.8.1/macOS; production Node 24.18.1/Linux remains the separate CI/container gate. No remote release gate was executed.
