# Installation weekly token budget



The week starts Monday 00:00 in `Europe/Madrid` and ends at the next Monday,
including daylight-saving transitions. In-app notices occur at 25%, 50%, and 75% of the configured allowance; exhaustion remains visible with the reset
time. Notices are scoped to the signed-in user, installation and week. The
counter is shared, not a separate allowance for each employee.
Employees see only the remaining percentage and reset time. Raw token totals,
the numerical allowance and the connected account's subscription usage are
private operator data and are omitted from employee API responses and settings.
An independent owner-only dashboard may read the current weekly totals through
the dedicated `AIBRAIN_USAGE_DASHBOARD_SECRET` operator endpoint. That endpoint
uses a separate bearer secret and remains
unavailable when the secret is missing or invalid. It must never reuse the
general maintenance/operator credential or appear in employee configuration.

The privacy boundary also applies to model tools. The outer worker sandbox
hides the operator installation configuration and transport audit journals.
Quota-enabled turns use named filesystem profiles that hide Codex runtime
usage metadata while retaining access to managed skills and the existing project
write scope. Read-only turns remain read-only. Native sandbox/permission
escalation is unavailable under the quota policy, so an employee approval
cannot expose the private counters. Separate application browser/connector
approvals are unchanged. Worker restart is required when enabling the policy
to discard any previous process/session permission grants.
The profiles are supplied at worker startup, because the pinned App Server
reloads named profiles from its base configuration when changing turn modes.
Tool commands retain only the current project's existing write root and the
same temporary-directory grants. The private paths are non-overlapping session,
log, history and SQLite-family rules: broad parent-directory denies break the
pinned Linux helper, and overlapping directory/glob denies can prevent startup.
Keep this physical Linux compatibility check when upgrading the pinned runtime.

## Configuration and accounting

The root-owned installation configuration accepts:

```json
"usageLimits": {
  "weeklyTokens": 10000000,
  "timeZone": "Europe/Madrid"
}
```



State lives in `dataRoot/usage/weekly-token-budget.json`, under an installation
lock shared across application and automation processes. Atomic writes preserve
daily totals, thread cursors and deduplication evidence across restarts. Missing,
corrupt or uncertain state blocks inference, rather than creating free allowance.
If a tracked turn completes successfully without any usage evidence, new
inference pauses for a two-second grace period. If usage still does not arrive,
the ledger requires operator reconciliation.
The accounting source is `thread/tokenUsage/updated` cumulative totals, not the
legacy chat journal's last response count. Admission covers chat, scheduled
tasks and steering in the shared runtime client. Reading conversations,
stopping tasks and recovering an already-started turn stay available.

A stopped or failed turn may end before the provider reports any token usage.
That absence does not disable the installation; a delayed cumulative report is
still counted. A successfully completed turn without usage evidence remains
blocked after a short grace period, as do malformed reports or persistence
failures. The budget accounts for provider-reported consumption, including late
reports, rather than guessing charges for interrupted requests.

New starts and steering are denied once the measured total reaches the budget.
Active turns are interrupted when accounting or periodic shared-state checks
observe exhaustion. **This is not a mathematically exact provider-side ceiling:**
the provider reports tokens after consumption, concurrent requests can already
be in flight, and interruption takes time. A small or larger final request can
exceed the remaining amount; all reported excess is retained in the counter.
The pinned protocol has no per-request maximum-token reservation mechanism.

The separate host knowledge-generation adapter does not expose a durable meter
to this ledger. Its execution entry point now reads the canonical installation
configuration and refuses execution whenever `usageLimits` is present, before
credentials or model dispatch, and rechecks before every step. Preview remains
available. Install that host script during the same authorized rollout and keep
its service stopped until the guard is verified. Do not claim installation-wide
enforcement if an old host adapter or an unaccounted standalone process runs.

## First activation and history seed


The initializer still imports the latest verified cumulative cursor for every
logged user/thread, so resuming an existing conversation charges only its later
increments. It persists the real capture timestamp as `initializedAt`; earlier
usage replay is excluded and must not produce a new lifecycle-accounting error.
Historical ephemeral usage does not reduce this expressly fresh allowance.
All old ephemeral workers must be stopped, and a later report from an unknown
existing thread without a trustworthy baseline remains blocked for reconciliation.

1. Complete the normal Backend CI, GHCR and deployment gates for the candidate.
   Promote the private configuration containing `usageLimits` through the
   versioned release manager, using the same tested images and revision. Do not
   edit the active configuration behind the release-state fingerprint. Missing
   budget state blocks inference while this activation is being completed.
   Stop/drain the app, automation and knowledge model workers before the
   initial seed. No old, unmetered runtime may continue during activation.
2. With the configured workers stopped, run
   the candidate's packaged initializer with the same config/data/users mounts,
   as the application UID. First inspect its **read-only** summary:

   ```sh
   node /usr/local/share/aibrain/initialize-weekly-token-budget.mjs --offline --start-now
   ```

3. Verify `initializationPolicy: "start-now"`, zero `recordedTokens` and the real
   `countingStartsAt` capture time in the private preview. Initialize once:

   ```sh
   node /usr/local/share/aibrain/initialize-weekly-token-budget.mjs --offline --start-now --apply
   ```

   Local source equivalent: `npm run usage:initialize-budget -- --offline --start-now [--apply]`.
   The initializer reads only this installation's private workers' session and
   archived-session metadata/token events. It preserves the latest counters and
   deduplicates active/archive copies. Start-now does not require reconstruction
   of excluded legacy consumption, but rejects symlinks, malformed counters,
   future events and files modified during inspection. Keep workers quiesced
   throughout capture and initialization. It prints a private operator summary
   with counts and policy metadata, without conversation text or credentials.
   It refuses to replace an existing budget ledger, including with `--start-now`.

4. Start the candidate workers. Verify authenticated `/api/usage/budget` returns
   `{ "budget": null }` so employees cannot infer the allowance, percentage or
   reset time. Verify a foreign/missing session cannot read it. Check
   the exact private allowance, zero charged history and preserved cursors only
   through operator readback. The first post-activation increment must reduce the
   shared balance; pre-activation replay must leave it unchanged. Use fixtures
   exhausted-admission behavior through the private operator path.
5. Record host-script checksum, configuration/ledger readback, exact release SHA,
   and authenticated browser acceptance independently of CI/publish/deploy.

Without `--start-now`, the default remains a conservative legacy-history import.
Legacy session logs may omit ephemeral legacy/knowledge consumption, so that
mode permits application only when the measured lower bound already exhausts
the week. A lower total requires complete reconciliation; it must not silently
grant allowance. A fresh start is an explicit operator decision and must preserve the prior ledger evidence.

A weekly reset changes the displayed period; it must not delete thread cursors
or replay evidence. Never delete/reseed the ledger as a routine reset or recovery.
Investigate an unavailable/reconciliation state with all model workers stopped.
An App Server resume may reset cumulative usage to its latest response even when
that response exceeds the previous process's cumulative total. A strictly later
report with `totalTokens === lastTokens` and a changed counter is an explicit
reset; charge the complete latest response, not the difference. Identical
snapshots remain replay, and ambiguous increases/resets remain blocked.

### Offline recovery during the configured unlimited period

When a verified provider counter reset blocks the ledger, preserve the configured metering policy during recovery.

To reconcile measured cursors using the packaged initializer's
`--offline --reconcile-unlimited [--apply]` mode. This is an operator attestation
that the entire unrecorded interval is covered by the configured unlimited
period; never use it to forgive missing metered consumption. First drain model
activity, stop application, automation and any other model workers, and preserve
a private, checksum-verified copy of the original ledger. Keep writers stopped
through history inspection and application. The default is a read-only preview.
The reader validates all session files, rejects changing files and invalid
counter evidence, and captures measured user/thread cursors. Apply requires an
active configured unlimited period, the existing `usage_evidence_invalid`
ledger, and at least one newer measured cursor. It preserves `initializedAt`,
all charged daily totals, existing replay evidence and newer retained cursors;
it rejects conflicting same-time counters. It never deletes or reseeds state,
imports historical charges, or grants a fresh allowance. Validate preservation
against the backup before restarting workers, then separately read the
authenticated operator endpoint and rendered Site.

Disabling the installation policy removes the budget and requires an explicit
operator decision; rolling back to code without quota enforcement also removes
its protection and must not be described as retaining the limit.
